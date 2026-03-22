'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useUserProfile } from '@/firebase';
import type { Loan, Borrower, LoanProduct, User as AppUser } from '@/lib/types';
import { getLoans } from '@/actions/loans';
import { getBorrowers } from '@/actions/borrowers';
import { getLoanProducts } from '@/actions/loan-products';
import { getUsers } from '@/actions/users';
import { LoansDataTable } from '@/components/loans/loans-data-table';
import { getColumns } from '@/components/loans/columns';
import { AddLoanDialog } from '@/components/loans/add-loan-dialog';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { EditLoanDialog } from '@/components/loans/edit-loan-dialog';

type LoanWithDetails = Loan & {
  borrowerName: string;
  borrowerPhotoUrl?: string;
  loanProductName: string;
};

export default function LoansPage() {
  const { user, userProfile, isLoading: isProfileLoading } = useUserProfile();
  const [loans, setLoans] = useState<LoanWithDetails[] | null>(null);
  const [borrowers, setBorrowers] = useState<Borrower[] | null>(null);
  const [loanProducts, setLoanProducts] = useState<LoanProduct[] | null>(null);
  const [loanOfficers, setLoanOfficers] = useState<AppUser[] | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<LoanWithDetails | null>(null);

  const isSuperAdmin = userProfile?.roleId === 'superadmin';
  const roleId = userProfile?.roleId;
  const branchIds = userProfile?.branchIds;
  const organizationId = userProfile?.organizationId;
  const userId = user?.uid;

  const [isLoadingLoans, setIsLoadingLoans] = useState(true);
  const [isLoadingBorrowers, setIsLoadingBorrowers] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingLoanOfficers, setIsLoadingLoanOfficers] = useState(true);

  const fetchLoansData = useCallback(async () => {
      if (!userProfile || !organizationId) return;
      setIsLoadingLoans(true);
      try {
          if (!isSuperAdmin) {
              const res = await getLoans(
                  organizationId!, 
                  undefined, 
                  (roleId === 'manager' || roleId === 'loan_officer') ? branchIds : undefined,
                  roleId === 'loan_officer' ? userId : undefined
              );
              if (res.success && res.loans) {
                  setLoans(res.loans as any);
              }
          }
      } catch(e) { console.error(e) } finally { setIsLoadingLoans(false) }
  }, [userProfile, isSuperAdmin, organizationId, roleId, branchIds, userId]);

  const fetchBorrowersData = useCallback(async () => {
      if (!userProfile || !organizationId) return;
      setIsLoadingBorrowers(true);
      try {
          if (!isSuperAdmin) {
              const res = await getBorrowers(organizationId!);
              if (res.success && res.borrowers) {
                  let filtered = res.borrowers;
                  if (roleId === 'manager' || roleId === 'loan_officer') {
                       filtered = filtered.filter((b: any) => branchIds?.includes(b.branchId));
                  }
                  setBorrowers(filtered as any);
              }
          }
      } catch(e) { console.error(e) } finally { setIsLoadingBorrowers(false) }
  }, [userProfile, isSuperAdmin, organizationId, roleId, branchIds]);


  const fetchProductsData = useCallback(async () => {
      if (!userProfile || !organizationId) return;
      setIsLoadingProducts(true);
      try {
          if (!isSuperAdmin) {
              const res = await getLoanProducts(organizationId!);
              if (res.success && res.products) {
                  setLoanProducts(res.products as any);
              }
          }
      } catch(e) { console.error(e) } finally { setIsLoadingProducts(false) }
  }, [userProfile, isSuperAdmin, organizationId]);

  const fetchOfficersData = useCallback(async () => {
      if (!userProfile || !organizationId) return;
      setIsLoadingLoanOfficers(true);
      try {
          if (!isSuperAdmin) {
              const res = await getUsers(organizationId!);
              if (res.success && res.users) {
                  setLoanOfficers(res.users.filter((u: any) => u.roleId === 'loan_officer' || u.roleId === 'manager') as any);
              }
          }
      } catch(e) { console.error(e) } finally { setIsLoadingLoanOfficers(false) }
  }, [userProfile, isSuperAdmin, organizationId]);

  useEffect(() => {
     if (!isProfileLoading && userProfile) {
         fetchLoansData();
         fetchBorrowersData();
         fetchProductsData();
         fetchOfficersData();
     }
  }, [isProfileLoading, userProfile, fetchLoansData, fetchBorrowersData, fetchProductsData, fetchOfficersData, isAddDialogOpen]);


  const loansWithDetails: LoanWithDetails[] = useMemo(() => {
    if (!loans || !borrowers || !loanProducts) return [];
    
    const borrowersMap = new Map(borrowers.map(b => [b.id, b]));
    const loanProductsMap = new Map(loanProducts.map(p => [p.id, p]));

    return loans.map(loan => ({
      ...loan,
      borrowerName: borrowersMap.get(loan.borrowerId)?.fullName || 'Unknown Borrower',
      borrowerPhotoUrl: borrowersMap.get(loan.borrowerId)?.photoUrl,
      loanProductName: loanProductsMap.get(loan.loanProductId)?.name || 'Unknown Product',
    })) as any;

  }, [loans, borrowers, loanProducts]);
  
  const handleEdit = useCallback((loan: LoanWithDetails) => {
    setEditingLoan(loan);
  }, []);
  
  const columns = useMemo(() => getColumns(handleEdit, fetchLoansData), [handleEdit, fetchLoansData]);

  const isLoading = isProfileLoading || isLoadingLoans || isLoadingBorrowers || isLoadingProducts || isLoadingLoanOfficers;

  return (
    <>
      <PageHeader title="Loans" description="View and manage all loans across organizations.">
        <Button onClick={() => setIsAddDialogOpen(true)} disabled={isLoading || isSuperAdmin}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Loan
        </Button>
      </PageHeader>
      <div className="p-4 md:p-6">
        {isLoading && <div className="border shadow-sm rounded-lg p-8 text-center text-muted-foreground">Loading loans...</div>}
        {loansWithDetails && <LoansDataTable columns={columns} data={loansWithDetails} />}
        {!isLoading && !loansWithDetails && <div className="border shadow-sm rounded-lg p-8 text-center text-muted-foreground">No loans found.</div>}
      </div>
      <AddLoanDialog 
        open={isAddDialogOpen} 
        onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) { fetchLoansData(); }
        }}
        borrowers={borrowers || []}
        loanProducts={loanProducts || []}
        isLoading={isLoading}
       />
       {editingLoan && (
        <EditLoanDialog 
            loan={editingLoan}
            loanOfficers={loanOfficers || []}
            open={!!editingLoan}
            onOpenChange={(open) => {
                if(!open) { setEditingLoan(null); fetchLoansData(); }
            }}
        />
       )}
    </>
  );
}
