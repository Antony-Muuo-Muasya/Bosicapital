'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useUserProfile } from '@/firebase';
import type { Borrower } from '@/lib/types';
import { getBorrowers } from '@/actions/borrowers';
import { BorrowersDataTable } from '@/components/borrowers/borrowers-data-table';
import { getBorrowerColumns } from '@/components/borrowers/columns';
import { AddBorrowerDialog } from '@/components/borrowers/add-borrower-dialog';
import { PayRegistrationFeeDialog } from '@/components/borrowers/pay-registration-fee-dialog';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { EditBorrowerDialog } from '@/components/borrowers/edit-borrower-dialog';

export default function BorrowersPage() {
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const [borrowers, setBorrowers] = useState<any[] | null>(null);
  const [isBorrowersLoading, setIsBorrowersLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedBorrower, setSelectedBorrower] = useState<Borrower | null>(null);
  const [editingBorrower, setEditingBorrower] = useState<Borrower | null>(null);
  const isSuperAdmin = userProfile?.roleId === 'superadmin';

  const fetchBorrowersData = useCallback(async () => {
    if (!userProfile) return;
    setIsBorrowersLoading(true);
    try {
      if (userProfile.roleId === 'superadmin') {
         // Should add getAllBorrowers with org join maybe, but superadmin usually has orgId null in this app unless he's root
      } else {
         const res = await getBorrowers(userProfile.organizationId);
         if (res.success && res.borrowers) {
             let filtered = res.borrowers;
             if (userProfile.roleId === 'manager' || userProfile.roleId === 'loan_officer') {
                 filtered = filtered.filter((b: any) => userProfile.branchIds?.includes(b.branchId));
             }
             setBorrowers(filtered);
         }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsBorrowersLoading(false);
    }
  }, [userProfile]);

  useEffect(() => {
    if (!isProfileLoading && userProfile) {
        fetchBorrowersData();
    }
  }, [isProfileLoading, userProfile, fetchBorrowersData, isAddDialogOpen]);

  const isLoading = isProfileLoading || isBorrowersLoading;


  const handleRecordPayment = useCallback((borrower: Borrower) => {
    setSelectedBorrower(borrower);
    setIsPaymentDialogOpen(true);
  }, []);

  const handleEditBorrower = useCallback((borrower: Borrower) => {
    setEditingBorrower(borrower);
  }, []);

  const columns = useMemo(() => getBorrowerColumns(handleRecordPayment, handleEditBorrower, fetchBorrowersData), [handleRecordPayment, handleEditBorrower, fetchBorrowersData]);

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
      <AddBorrowerDialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if(!open) fetchBorrowersData();
      }} />
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
          onOpenChange={(open) => {
             if(!open) {
                setEditingBorrower(null);
                fetchBorrowersData();
             }
          }}
          borrower={editingBorrower}
        />
      )}
    </>
  );
}
