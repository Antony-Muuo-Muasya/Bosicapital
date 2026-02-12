'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useCollection, useUserProfile, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Loan, Borrower, LoanProduct } from '@/lib/types';
import { LoansDataTable } from '@/components/loans/loans-data-table';
import { getColumns } from '@/components/loans/columns';
import { AddLoanDialog } from '@/components/loans/add-loan-dialog';
import { useState, useMemo, useCallback } from 'react';
import { EditLoanDialog } from '@/components/loans/edit-loan-dialog';

type LoanWithDetails = Loan & {
  borrowerName: string;
  borrowerPhotoUrl?: string;
  loanProductName: string;
};

export default function LoansPage() {
  const { user, userProfile, isLoading: isProfileLoading } = useUserProfile();
  const firestore = useFirestore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<LoanWithDetails | null>(null);
  
  const isSuperAdmin = userProfile?.roleId === 'superadmin';
  const roleId = userProfile?.roleId;
  const branchIds = userProfile?.branchIds;
  const organizationId = userProfile?.organizationId;
  const userId = user?.uid;

  const loansQuery = useMemoFirebase(() => {
    if (!firestore || !roleId) return null;

    const loansCol = collection(firestore, 'loans');

    if (isSuperAdmin) {
        return loansCol;
    }

    if (roleId === 'admin') {
      return query(loansCol, where('organizationId', '==', organizationId));
    }
    
    if (roleId === 'manager' && branchIds?.length > 0) {
      return query(loansCol, where('organizationId', '==', organizationId), where('branchId', 'in', branchIds));
    }

    if (roleId === 'loan_officer' && userId) {
        return query(loansCol, where('organizationId', '==', organizationId), where('loanOfficerId', '==', userId));
    }

    return null;
  }, [firestore, userId, roleId, JSON.stringify(branchIds), organizationId, isSuperAdmin]);

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
  }, [firestore, roleId, JSON.stringify(branchIds), organizationId, isSuperAdmin]);

  const loanProductsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    if (isSuperAdmin) return collection(firestore, 'loanProducts');
    if (!organizationId) return null;
    return query(collection(firestore, 'loanProducts'), where('organizationId', '==', organizationId));
  }, [firestore, organizationId, isSuperAdmin]);

  const { data: loans, isLoading: isLoadingLoans } = useCollection<Loan>(loansQuery);
  const { data: borrowers, isLoading: isLoadingBorrowers } = useCollection<Borrower>(borrowersQuery);
  const { data: loanProducts, isLoading: isLoadingProducts } = useCollection<LoanProduct>(loanProductsQuery);


  const loansWithDetails: LoanWithDetails[] = useMemo(() => {
    if (!loans || !borrowers || !loanProducts) return [];
    
    const borrowersMap = new Map(borrowers.map(b => [b.id, b]));
    const loanProductsMap = new Map(loanProducts.map(p => [p.id, p]));

    return loans.map(loan => ({
      ...loan,
      borrowerName: borrowersMap.get(loan.borrowerId)?.fullName || 'Unknown Borrower',
      borrowerPhotoUrl: borrowersMap.get(loan.borrowerId)?.photoUrl,
      loanProductName: loanProductsMap.get(loan.loanProductId)?.name || 'Unknown Product',
    }));

  }, [loans, borrowers, loanProducts]);
  
  const handleEdit = useCallback((loan: LoanWithDetails) => {
    setEditingLoan(loan);
  }, []);
  
  const columns = useMemo(() => getColumns(handleEdit), [handleEdit]);

  const isLoading = isProfileLoading || isLoadingLoans || isLoadingBorrowers || isLoadingProducts;

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
        onOpenChange={setIsAddDialogOpen}
        borrowers={borrowers || []}
        loanProducts={loanProducts || []}
        isLoading={isLoading}
       />
       {editingLoan && (
        <EditLoanDialog 
            loan={editingLoan}
            open={!!editingLoan}
            onOpenChange={(open) => !open && setEditingLoan(null)}
        />
       )}
    </>
  );
}
