
'use client';
import { PageHeader } from '@/components/page-header';
import { useCollection, useFirestore, useMemoFirebase, useUserProfile } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Loan, Borrower, LoanProduct } from '@/lib/types';
import { useMemo } from 'react';
import { getApprovalColumns } from '@/components/approvals/columns';
import { ApprovalsDataTable } from '@/components/approvals/approvals-data-table';


export default function ApprovalsPage() {
    const firestore = useFirestore();
    const { userProfile } = useUserProfile();
    const organizationId = userProfile?.organizationId;
    const branchIds = userProfile?.branchIds || [];
    const isSuperAdmin = userProfile?.roleId === 'superadmin';

    const pendingLoansQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        const loansCol = collection(firestore, 'loans');
        
        if (isSuperAdmin) {
            return query(loansCol, where('status', '==', 'Pending Approval'));
        }

        if (!userProfile || branchIds.length === 0) return null;
        return query(
            loansCol,
            where('branchId', 'in', branchIds),
            where('status', '==', 'Pending Approval')
        );
    }, [firestore, branchIds, userProfile, isSuperAdmin]);

    const borrowersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        if (isSuperAdmin) return collection(firestore, 'borrowers');
        if (!organizationId) return null;
        return query(collection(firestore, 'borrowers'), where('organizationId', '==', organizationId));
    }, [firestore, organizationId, isSuperAdmin]);
    
    const loanProductsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        if (isSuperAdmin) return collection(firestore, 'loanProducts');
        if (!organizationId) return null;
        return query(collection(firestore, 'loanProducts'), where('organizationId', '==', organizationId));
    }, [firestore, organizationId, isSuperAdmin]);

    const { data: pendingLoans, isLoading: isLoadingLoans } = useCollection<Loan>(pendingLoansQuery);
    const { data: borrowers, isLoading: isLoadingBorrowers } = useCollection<Borrower>(borrowersQuery);
    const { data: loanProducts, isLoading: isLoadingProducts } = useCollection<LoanProduct>(loanProductsQuery);
    
    const isLoading = isLoadingLoans || isLoadingBorrowers || isLoadingProducts || !userProfile;

    const loansWithDetails = useMemo(() => {
        if (isLoading || !pendingLoans || !borrowers || !loanProducts) return [];
        
        const borrowersMap = new Map(borrowers.map(b => [b.id, b]));
        const loanProductsMap = new Map(loanProducts.map(p => [p.id, p]));
    
        return pendingLoans.map(loan => {
            const product = loanProductsMap.get(loan.loanProductId);
            return {
                ...loan,
                borrowerName: borrowersMap.get(loan.borrowerId)?.fullName || 'Unknown Borrower',
                borrowerPhotoUrl: borrowersMap.get(loan.borrowerId)?.photoUrl,
                loanProductName: product?.name || 'Unknown Product',
                repaymentCycle: product?.repaymentCycle,
            };
        });
    
    }, [pendingLoans, borrowers, loanProducts, isLoading]);

    const columns = useMemo(() => getApprovalColumns(), []);

  return (
    <>
      <PageHeader title="Loan Approvals" description="Review and approve loan applications for your branches." />
      <div className="p-4 md:p-6">
        {isLoading && <div className="border shadow-sm rounded-lg p-8 text-center text-muted-foreground">Loading pending approvals...</div>}
        {!isLoading && <ApprovalsDataTable columns={columns} data={loansWithDetails} />}
      </div>
    </>
  );
}
