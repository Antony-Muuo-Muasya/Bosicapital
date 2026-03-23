'use client';
import { PageHeader } from '@/components/page-header';
import { useUserProfile } from '@/providers/user-profile';
import { getLoans } from '@/actions/loans';
import { getBorrowers } from '@/actions/borrowers';
import { getLoanProducts } from '@/actions/loan-products';
import type { Loan, Borrower, LoanProduct } from '@/lib/types';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { getDisbursementColumns } from '@/components/disbursements/columns';
import { DisbursementsDataTable } from '@/components/disbursements/disbursements-data-table';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';

export default function DisbursementsPage() {
    const { userProfile, isLoading: isProfileLoading } = useUserProfile();
    const organizationId = userProfile?.organizationId;
    const isSuperAdmin = userProfile?.roleId === 'superadmin';

    const [isLoading, setIsLoading] = useState(true);
    const [approvedLoans, setApprovedLoans] = useState<Loan[] | null>(null);
    const [borrowers, setBorrowers] = useState<Borrower[] | null>(null);
    const [loanProducts, setLoanProducts] = useState<LoanProduct[] | null>(null);

    const fetchDisbursementsData = useCallback(async () => {
        if (!userProfile) return;
        setIsLoading(true);
        try {
            // Approved loans
            const loansRes = await getLoans(
                isSuperAdmin ? undefined as any : organizationId!,
                undefined,
                undefined
            );
            if (loansRes.success && loansRes.loans) {
                setApprovedLoans(loansRes.loans.filter((l: any) => l.status === 'Approved') as any);
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
    }, [userProfile, isSuperAdmin, organizationId]);

    useEffect(() => {
        if (!isProfileLoading && userProfile) {
            fetchDisbursementsData();
        }
    }, [isProfileLoading, userProfile, fetchDisbursementsData]);

    const loansWithDetails = useMemo(() => {
        if (isLoading || !approvedLoans || !borrowers || !loanProducts) return [];
        
        const borrowersMap = new Map(borrowers.map(b => [b.id, b]));
        const loanProductsMap = new Map(loanProducts.map(p => [p.id, p]));
    
        return approvedLoans.map(loan => {
            const borrower = borrowersMap.get(loan.borrowerId);
            const product = loanProductsMap.get(loan.loanProductId);
            return {
                ...loan,
                borrowerName: borrower?.fullName || 'Unknown Borrower',
                borrowerPhone: borrower?.phone || 'N/A',
                borrowerPhotoUrl: borrower?.photoUrl,
                loanProductName: product?.name || 'Unknown Product',
                repaymentCycle: product?.repaymentCycle,
            };
        });
    
    }, [approvedLoans, borrowers, loanProducts, isLoading]);

    const columns = useMemo(() => getDisbursementColumns(), []);

    const handleExport = () => {
        if (!loansWithDetails || loansWithDetails.length === 0) return;

        const headers = ['Borrower Name', 'Phone Number', 'Principal Amount'];
        const csvRows = [
            headers.join(','),
            ...loansWithDetails.map(row => 
                [
                    `"${row.borrowerName.replace(/"/g, '""')}"`,
                    row.borrowerPhone,
                    row.principal
                ].join(',')
            )
        ];

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'disbursement_bulk_payment.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

  return (
    <>
      <PageHeader title="Disbursements" description="Disburse approved loans to activate them.">
        <Button onClick={handleExport} disabled={isLoading || !loansWithDetails.length}>
            <FileDown className="mr-2 h-4 w-4" />
            Export for Bulk Payment
        </Button>
      </PageHeader>
      <div className="p-4 md:p-6">
        {isLoading && <div className="border shadow-sm rounded-lg p-8 text-center text-muted-foreground">Loading loans pending disbursement...</div>}
        {!isLoading && <DisbursementsDataTable columns={columns} data={loansWithDetails} />}
      </div>
    </>
  );
}
    
