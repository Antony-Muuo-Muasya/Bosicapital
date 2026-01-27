'use client';
import { PageHeader } from '@/components/page-header';
import { useCollection, useFirestore, useMemoFirebase, useUserProfile } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Loan, Borrower, LoanProduct } from '@/lib/types';
import { useMemo } from 'react';
import { getDisbursementColumns } from '@/components/disbursements/columns';
import { DisbursementsDataTable } from '@/components/disbursements/disbursements-data-table';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';

export default function DisbursementsPage() {
    const firestore = useFirestore();
    const { userProfile } = useUserProfile();
    const organizationId = userProfile?.organizationId;

    const approvedLoansQuery = useMemoFirebase(() => {
        if (!firestore || !organizationId) return null;
        return query(
            collection(firestore, 'loans'), 
            where('organizationId', '==', organizationId),
            where('status', '==', 'Approved')
        );
    }, [firestore, organizationId]);

    const borrowersQuery = useMemoFirebase(() => {
        if (!firestore || !organizationId) return null;
        return query(collection(firestore, 'borrowers'), where('organizationId', '==', organizationId));
    }, [firestore, organizationId]);
    
    const loanProductsQuery = useMemoFirebase(() => {
        if (!firestore || !organizationId) return null;
        return query(collection(firestore, 'loanProducts'), where('organizationId', '==', organizationId));
    }, [firestore, organizationId]);

    const { data: approvedLoans, isLoading: isLoadingLoans } = useCollection<Loan>(approvedLoansQuery);
    const { data: borrowers, isLoading: isLoadingBorrowers } = useCollection<Borrower>(borrowersQuery);
    const { data: loanProducts, isLoading: isLoadingProducts } = useCollection<LoanProduct>(loanProductsQuery);
    
    const isLoading = isLoadingLoans || isLoadingBorrowers || isLoadingProducts || !userProfile;

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
    