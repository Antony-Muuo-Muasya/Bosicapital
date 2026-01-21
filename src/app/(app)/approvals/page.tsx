'use client';
import { PageHeader } from '@/components/page-header';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Loan, Borrower, LoanProduct } from '@/lib/types';
import { useMemo } from 'react';
import { getApprovalColumns } from '@/components/approvals/columns';
import { ApprovalsDataTable } from '@/components/approvals/approvals-data-table';


export default function ApprovalsPage() {
    const firestore = useFirestore();

    const pendingLoansQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'loans'), where('status', '==', 'Pending Approval'));
    }, [firestore]);

    const borrowersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'borrowers') : null, [firestore]);
    const loanProductsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'loanProducts') : null, [firestore]);

    const { data: pendingLoans, isLoading: isLoadingLoans } = useCollection<Loan>(pendingLoansQuery);
    const { data: borrowers, isLoading: isLoadingBorrowers } = useCollection<Borrower>(borrowersQuery);
    const { data: loanProducts, isLoading: isLoadingProducts } = useCollection<LoanProduct>(loanProductsQuery);
    
    const isLoading = isLoadingLoans || isLoadingBorrowers || isLoadingProducts;

    const loansWithDetails = useMemo(() => {
        if (isLoading || !pendingLoans || !borrowers || !loanProducts) return [];
        
        const borrowersMap = new Map(borrowers.map(b => [b.id, b]));
        const loanProductsMap = new Map(loanProducts.map(p => [p.id, p]));
    
        return pendingLoans.map(loan => ({
          ...loan,
          borrowerName: borrowersMap.get(loan.borrowerId)?.fullName || 'Unknown Borrower',
          borrowerPhotoUrl: borrowersMap.get(loan.borrowerId)?.photoUrl,
          loanProductName: loanProductsMap.get(loan.loanProductId)?.name || 'Unknown Product',
        }));
    
    }, [pendingLoans, borrowers, loanProducts, isLoading]);

    const columns = useMemo(() => getApprovalColumns(), []);

  return (
    <>
      <PageHeader title="Approvals" description="Review and approve or reject loan applications." />
      <div className="p-4 md:p-6">
        {isLoading && <div className="border shadow-sm rounded-lg p-8 text-center text-muted-foreground">Loading pending approvals...</div>}
        {!isLoading && <ApprovalsDataTable columns={columns} data={loansWithDetails} />}
      </div>
    </>
  );
}
