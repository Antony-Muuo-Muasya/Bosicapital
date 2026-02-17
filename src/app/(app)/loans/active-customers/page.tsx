'use client';

import { PageHeader } from '@/components/page-header';
import { useCollection, useUserProfile, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, documentId } from 'firebase/firestore';
import type { Borrower, Loan } from '@/lib/types';
import { BorrowersDataTable } from '@/components/borrowers/borrowers-data-table';
import { getBorrowerColumns } from '@/components/borrowers/columns';
import { useState, useMemo, useCallback } from 'react';
import { EditBorrowerDialog } from '@/components/borrowers/edit-borrower-dialog';
import { PayRegistrationFeeDialog } from '@/components/borrowers/pay-registration-fee-dialog';

export default function ActiveCustomersPage() {
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const firestore = useFirestore();
  const [selectedBorrower, setSelectedBorrower] = useState<Borrower | null>(null);
  const [editingBorrower, setEditingBorrower] = useState<Borrower | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  
  const isSuperAdmin = userProfile?.roleId === 'superadmin';
  const roleId = userProfile?.roleId;
  const branchIds = userProfile?.branchIds;
  const organizationId = userProfile?.organizationId;

  // Query for all loans within the user's scope.
  const loansQuery = useMemoFirebase(() => {
    if (!firestore || !roleId) return null;
    const loansCol = collection(firestore, 'loans');
    if (isSuperAdmin) return query(loansCol, where('status', '==', 'Active'));
    if (roleId === 'admin') return query(loansCol, where('organizationId', '==', organizationId), where('status', '==', 'Active'));
    if ((roleId === 'manager' || roleId === 'loan_officer') && branchIds?.length > 0) {
      return query(loansCol, where('branchId', 'in', branchIds), where('status', '==', 'Active'));
    }
    return null;
  }, [firestore, roleId, organizationId, JSON.stringify(branchIds), isSuperAdmin]);

  const { data: activeLoans, isLoading: isLoadingLoans } = useCollection<Loan>(loansQuery);

  const activeBorrowerIds = useMemo(() => {
    if (!activeLoans) return [];
    return [...new Set(activeLoans.map(loan => loan.borrowerId))];
  }, [activeLoans]);

  // Query for the borrower documents. Handle the 'in' query limit.
  const borrowersQuery = useMemoFirebase(() => {
    if (!firestore || activeBorrowerIds.length === 0) return null;
    if (activeBorrowerIds.length > 30) {
        // Fallback for large datasets: fetch all and filter client-side.
        // This is less efficient but avoids Firestore query limits.
        if (isSuperAdmin) return collection(firestore, 'borrowers');
        if (organizationId) return query(collection(firestore, 'borrowers'), where('organizationId', '==', organizationId));
        return null;
    }
    return query(collection(firestore, 'borrowers'), where(documentId(), 'in', activeBorrowerIds));
  }, [firestore, JSON.stringify(activeBorrowerIds), organizationId, isSuperAdmin]);

  const { data: borrowersData, isLoading: isLoadingBorrowers } = useCollection<Borrower>(borrowersQuery);

  const borrowers = useMemo(() => {
      if (!borrowersData) return [];
      if (activeBorrowerIds.length > 30) {
          const idSet = new Set(activeBorrowerIds);
          return borrowersData.filter(b => idSet.has(b.id));
      }
      return borrowersData;
  }, [borrowersData, activeBorrowerIds]);

  const isLoading = isProfileLoading || isLoadingLoans || isLoadingBorrowers;

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
      <PageHeader title="Active Customers" description="A list of all customers with currently active loans." />
      <div className="p-4 md:p-6">
        {isLoading && <div className="border shadow-sm rounded-lg p-8 text-center text-muted-foreground">Loading active customers...</div>}
        {!isLoading && <BorrowersDataTable columns={columns} data={borrowers || []} />}
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
