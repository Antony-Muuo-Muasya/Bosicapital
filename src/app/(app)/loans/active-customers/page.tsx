'use client';

import { PageHeader } from '@/components/page-header';
import { useUserProfile } from '@/firebase';
import { getLoans } from '@/actions/loans';
import { getBorrowers } from '@/actions/borrowers';
import type { Borrower, Loan } from '@/lib/types';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { BorrowersDataTable } from '@/components/borrowers/borrowers-data-table';
import { getBorrowerColumns } from '@/components/borrowers/columns';
import { EditBorrowerDialog } from '@/components/borrowers/edit-borrower-dialog';
import { PayRegistrationFeeDialog } from '@/components/borrowers/pay-registration-fee-dialog';

export default function ActiveCustomersPage() {
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const [selectedBorrower, setSelectedBorrower] = useState<Borrower | null>(null);
  const [editingBorrower, setEditingBorrower] = useState<Borrower | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [borrowers, setBorrowers] = useState<Borrower[] | null>(null);

  const isSuperAdmin = userProfile?.roleId === 'superadmin';
  const organizationId = userProfile?.organizationId;
  const branchIds = userProfile?.branchIds || [];

  const fetchActiveCustomers = useCallback(async () => {
      if (!userProfile) return;
      setIsLoading(true);
      try {
          const loansRes = await getLoans(
              isSuperAdmin ? undefined as any : organizationId!,
              undefined,
              isSuperAdmin ? undefined : branchIds
          );
          
          if (loansRes.success && loansRes.loans) {
              const activeLoanBorrowerIds = new Set(loansRes.loans.filter((l: any) => l.status === 'Active').map((l: any) => l.borrowerId));
              const borrowersRes = await getBorrowers(isSuperAdmin ? undefined as any : organizationId!);
              
              if (borrowersRes.success && borrowersRes.borrowers) {
                  setBorrowers(borrowersRes.borrowers.filter((b: any) => activeLoanBorrowerIds.has(b.id)) as any);
              }
          }
      } catch (e) {
          console.error(e);
      } finally {
          setIsLoading(false);
      }
  }, [userProfile, isSuperAdmin, organizationId, JSON.stringify(branchIds)]);

  useEffect(() => {
     if (!isProfileLoading && userProfile) {
         fetchActiveCustomers();
     }
  }, [isProfileLoading, userProfile, fetchActiveCustomers]);

  const handleRecordPayment = useCallback((borrower: Borrower) => {
    setSelectedBorrower(borrower);
    setIsPaymentDialogOpen(true);
  }, []);

  const handleEditBorrower = useCallback((borrower: Borrower) => {
    setEditingBorrower(borrower);
  }, []);

  const columns = useMemo(() => getBorrowerColumns(handleRecordPayment, handleEditBorrower, fetchActiveCustomers), [handleRecordPayment, handleEditBorrower, fetchActiveCustomers]);

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
