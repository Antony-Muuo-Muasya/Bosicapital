'use client';

import { useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import type { Repayment, Borrower, LoanProduct } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export default function RepaymentsPage() {
  const firestore = useFirestore();

  const repaymentsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'repayments') : null, [firestore]);
  const borrowersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'borrowers') : null, [firestore]);
  const loansQuery = useMemoFirebase(() => firestore ? collection(firestore, 'loans') : null, [firestore]);
  const loanProductsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'loanProducts') : null, [firestore]);

  const { data: repayments, isLoading: isLoadingRepayments } = useCollection<Repayment>(repaymentsQuery);
  const { data: borrowers, isLoading: isLoadingBorrowers } = useCollection<Borrower>(borrowersQuery);
  const { data: loans, isLoading: isLoadingLoans } = useCollection<any>(loansQuery);
  const { data: loanProducts, isLoading: isLoadingProducts } = useCollection<LoanProduct>(loanProductsQuery);

  const isLoading = isLoadingRepayments || isLoadingBorrowers || isLoadingLoans || isLoadingProducts;

  const repaymentsWithDetails = useMemo(() => {
    if (isLoading || !repayments || !borrowers || !loans || !loanProducts) return [];

    const borrowersMap = new Map(borrowers.map(b => [b.id, b]));
    const loansMap = new Map(loans.map(l => [l.id, l]));
    const loanProductsMap = new Map(loanProducts.map(p => [p.id, p]));

    return repayments.map(repayment => {
      const loan = loansMap.get(repayment.loanId);
      const borrower = loan ? borrowersMap.get(loan.borrowerId) : undefined;
      const product = loan ? loanProductsMap.get(loan.loanProductId) : undefined;

      return {
        ...repayment,
        borrowerName: borrower?.fullName || 'Unknown Borrower',
        loanProductName: product?.name || 'Unknown Product',
      };
    });
  }, [repayments, borrowers, loans, loanProducts, isLoading]);

  const handleExport = () => {
    if (!repaymentsWithDetails) return;
    const headers = ['ID', 'Loan ID', 'Borrower Name', 'Loan Product', 'Amount', 'Payment Date', 'Method', 'Collected By'];
    const csvRows = [
      headers.join(','),
      ...repaymentsWithDetails.map(row =>
        [
          row.id,
          row.loanId,
          `"${row.borrowerName}"`,
          `"${row.loanProductName}"`,
          row.amount,
          row.paymentDate,
          row.method,
          row.collectedById,
        ].join(',')
      ),
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.href) {
      URL.revokeObjectURL(link.href);
    }
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', 'repayments_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <PageHeader title="Repayments" description="Record and track all incoming payments.">
        <Button variant="outline" onClick={handleExport} disabled={isLoading || !repaymentsWithDetails?.length}>
          <FileDown className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </PageHeader>
      <div className="p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Repayment History</CardTitle>
            <CardDescription>A log of all payments received from borrowers.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Loan Product</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-16" /></TableCell>
                    </TableRow>
                  ))}
                {!isLoading && repaymentsWithDetails.map((repayment) => (
                  <TableRow key={repayment.id}>
                    <TableCell>
                      <div className="font-medium">{repayment.borrowerName}</div>
                      <div className="text-sm text-muted-foreground">{repayment.loanId}</div>
                    </TableCell>
                    <TableCell>{repayment.loanProductName}</TableCell>
                    <TableCell>{new Date(repayment.paymentDate).toLocaleDateString()}</TableCell>
                    <TableCell>{repayment.method}</TableCell>
                    <TableCell className="text-right">{formatCurrency(repayment.amount)}</TableCell>
                  </TableRow>
                ))}
                 {!isLoading && repaymentsWithDetails.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            No repayments found.
                        </TableCell>
                    </TableRow>
                 )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
