'use client';
import { PageHeader } from '@/components/page-header';
import { useUserProfile } from '@/providers/user-profile';
import { getLoans } from '@/actions/loans';
import { getBorrowers } from '@/actions/borrowers';
import { getLoanProducts } from '@/actions/loan-products';
import type { Loan, Borrower, LoanProduct } from '@/lib/types';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { getApprovalColumns } from '@/components/approvals/columns';
import { ApprovalsDataTable } from '@/components/approvals/approvals-data-table';


export default function ApprovalsPage() {
    const { userProfile, isLoading: isProfileLoading } = useUserProfile();
    const organizationId = userProfile?.organizationId;
    const branchIds = userProfile?.branchIds || [];
    const isSuperAdmin = userProfile?.roleId === 'superadmin';
    const isOrgAdmin = userProfile?.roleId === 'admin';
    const isManager = userProfile?.roleId === 'manager';

    const [isLoading, setIsLoading] = useState(true);
    const [pendingLoans, setPendingLoans] = useState<Loan[] | null>(null);
    const [borrowers, setBorrowers] = useState<Borrower[] | null>(null);
    const [loanProducts, setLoanProducts] = useState<LoanProduct[] | null>(null);

    const fetchApprovalsData = useCallback(async () => {
        if (!userProfile) return;
        setIsLoading(true);
        try {
            // Pending loans
            const loansRes = await getLoans(
                isSuperAdmin ? undefined as any : organizationId!,
                undefined,
                isSuperAdmin || isOrgAdmin ? undefined : branchIds
            );
            if (loansRes.success && loansRes.loans) {
                setPendingLoans(loansRes.loans.filter((l: any) => l.status === 'Pending Approval') as any);
            }

            // Borrowers
            const borrowersRes = await getBorrowers(isSuperAdmin ? undefined as any : organizationId!);
            if (borrowersRes.success && borrowersRes.borrowers) {
                setBorrowers(borrowersRes.borrowers as any);
            }

            // Loan Products
            const productsRes = await getLoanProducts(isSuperAdmin ? undefined as any : organizationId!);
            if (productsRes.success && productsRes.products) {
                setLoanProducts(productsRes.products as any);
            }

        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [userProfile, isSuperAdmin, isOrgAdmin, organizationId, JSON.stringify(branchIds)]);

    useEffect(() => {
        if (!isProfileLoading && userProfile) {
            fetchApprovalsData();
        }
    }, [isProfileLoading, userProfile, fetchApprovalsData]);

    const loansWithDetails = useMemo(() => {
        if (isLoading || !pendingLoans || !borrowers || !loanProducts) return [];
        
        const borrowersMap = new Map(borrowers.map(b => [b.id, b]));
        const loanProductsMap = new Map(loanProducts.map(p => [p.id, p]));
    
        return pendingLoans.map(loan => {
            const borrower = borrowersMap.get(loan.borrowerId);
            const product = loanProductsMap.get(loan.loanProductId);
            return {
                ...loan,
                borrowerName: borrower?.fullName || 'Unknown Borrower',
                borrowerPhotoUrl: borrower?.photoUrl,
                businessPhotoUrl: borrower?.businessPhotoUrl,
                homeAssetsPhotoUrl: borrower?.homeAssetsPhotoUrl,
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
