'use client';

import { PageHeader } from '@/components/page-header';
import { useCollection, useUserProfile, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Borrower, Loan } from '@/lib/types';
import { BorrowersDataTable } from '@/components/borrowers/borrowers-data-table';
import { getBorrowerColumns } from '@/components/borrowers/columns';
import { useState, useMemo, useCallback } from 'react';
import { EditBorrowerDialog } from '@/components/borrowers/edit-borrower-dialog';
import { PayRegistrationFeeDialog } from '@/components/borrowers/pay-registration-fee-dialog';

export default function LeadsPage() {
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const firestore = useFirestore();
  const [selectedBorrower, setSelectedBorrower] = useState<Borrower | null>(null);
  const [editingBorrower, setEditingBorrower] = useState<Borrower | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const isSuperAdmin = userProfile?.roleId === 'superadmin';
  const roleId = userProfile?.roleId;
  const branchIds = userProfile?.branchIds;
  const organizationId = userProfile?.organizationId;

  // Query for all borrowers within the user's scope.
  const borrowersQuery = useMemoFirebase(() => {
    if (!firestore || !roleId) return null;
    const borrowersCol = collection(firestore, 'borrowers');
    if (isSuperAdmin) return borrowersCol;
    if (organizationId) return query(borrowersCol, where('organizationId', '==', organizationId));
    return null;
  }, [firestore, roleId, organizationId, isSuperAdmin]);
  const { data: allBorrowers, isLoading: isLoadingBorrowers } = useCollection<Borrower>(borrowersQuery);

  // Query for all loans to determine who has an active/pending loan.
  const loansQuery = useMemoFirebase(() => {
    if (!firestore || !organizationId) return null;
    const loansCol = collection(firestore, 'loans');
    if (isSuperAdmin) return loansCol;
    return query(loansCol, where('organizationId', '==', organizationId));
  }, [firestore, organizationId, isSuperAdmin]);
  const { data: allLoans, isLoading: isLoadingLoans } = useCollection<Loan>(loansQuery);

  const leads = useMemo(() => {
    if (!allBorrowers || !allLoans) return [];
    
    const activeBorrowerIds = new Set(
        allLoans.filter(loan => loan.status === 'Active' || loan.status === 'Pending Approval').map(loan => loan.borrowerId)
    );

    return allBorrowers.filter(borrower => !activeBorrowerIds.has(borrower.id));

  }, [allBorrowers, allLoans]);

  const isLoading = isProfileLoading || isLoadingBorrowers || isLoadingLoans;

  const handleRecordPayment = useCallback((borrower: Borrower) => {
    setSelectedBorrower(borrower);
    setIsPaymentDialogOpen(true);
  }, []);

  const handleEditBorrower = useCallback((borrower: Borrower) => {
    setEditingBorrower(borrower);
  }, []);

  const columns = useMemo(() => getBorrowerColumns(handleRecordPayment, handleEditBorrower), [handleRecordPayment, handleEditBorrower]);

  return (
    <>
      <PageHeader title="Leads" description="Customers who are eligible for new loans." />
      <div className="p-4 md:p-6">
        {isLoading && <div className="border shadow-sm rounded-lg p-8 text-center text-muted-foreground">Loading leads...</div>}
        {!isLoading && <BorrowersDataTable columns={columns} data={leads} />}
      </div>
      {selectedBorrower && (
        <PayRegistrationFeeDialog 
            open={isPaymentDialogOpen}
            onOpenChange={setIsPaymentDialogOpen}
            borrower={selectedBorrower}
        />
      )}
      {editingBorrower && (
        <EditBorrowerDialog
          open={!!editingBorrower}
          onOpenChange={(open) => !open && setEditingBorrower(null)}
          borrower={editingBorrower}
        />
      )}
    </>
  );
}
