'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useCollection, useUserProfile, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Borrower } from '@/lib/types';
import { BorrowersDataTable } from '@/components/borrowers/borrowers-data-table';
import { getBorrowerColumns } from '@/components/borrowers/columns';
import { AddBorrowerDialog } from '@/components/borrowers/add-borrower-dialog';
import { PayRegistrationFeeDialog } from '@/components/borrowers/pay-registration-fee-dialog';
import { useState, useMemo, useCallback } from 'react';
import { EditBorrowerDialog } from '@/components/borrowers/edit-borrower-dialog';

export default function BorrowersPage() {
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const firestore = useFirestore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedBorrower, setSelectedBorrower] = useState<Borrower | null>(null);
  const [editingBorrower, setEditingBorrower] = useState<Borrower | null>(null);

  const isSuperAdmin = userProfile?.roleId === 'superadmin';
  const roleId = userProfile?.roleId;
  const branchIds = userProfile?.branchIds;
  const organizationId = userProfile?.organizationId;

  const borrowersQuery = useMemoFirebase(() => {
    if (!firestore || !roleId) return null;

    const borrowersCol = collection(firestore, 'borrowers');

    if (isSuperAdmin) {
      return borrowersCol;
    }

    if (roleId === 'admin') {
      return query(borrowersCol, where('organizationId', '==', organizationId));
    }
    
    if ((roleId === 'manager' || roleId === 'loan_officer') && branchIds?.length > 0) {
      return query(borrowersCol, where('organizationId', '==', organizationId), where('branchId', 'in', branchIds));
    }

    return null;
  }, [firestore, roleId, organizationId, JSON.stringify(branchIds), isSuperAdmin]);

  const { data: borrowers, isLoading: isBorrowersLoading } = useCollection<Borrower>(borrowersQuery);
  const isLoading = isProfileLoading || isBorrowersLoading;


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
      <PageHeader title="Borrowers" description="Manage your list of borrowers.">
        <Button onClick={() => setIsAddDialogOpen(true)} disabled={isSuperAdmin}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Borrower
        </Button>
      </PageHeader>
      <div className="p-4 md:p-6">
        {isLoading && <div className="border shadow-sm rounded-lg p-8 text-center text-muted-foreground">Loading borrowers...</div>}
        {borrowers && <BorrowersDataTable columns={columns} data={borrowers} />}
        {!isLoading && !borrowers && <div className="border shadow-sm rounded-lg p-8 text-center text-muted-foreground">No borrowers found.</div>}
      </div>
      <AddBorrowerDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
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
