'use client';

import { useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import type { Repayment, Borrower, Loan, LoanProduct } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase, useUserProfile } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
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
  const { user, userProfile, isLoading: isProfileLoading } = useUserProfile();
  const isSuperAdmin = userProfile?.roleId === 'superadmin';

  // Query for loans visible to the current user
  const loansQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile || !user) return null;
    const { roleId, branchIds, organizationId } = userProfile;
    const loansCol = collection(firestore, 'loans');

    if (isSuperAdmin) return loansCol;
    if (roleId === 'admin') {
      return query(loansCol, where('organizationId', '==', organizationId));
    }
    if (roleId === 'manager' && branchIds?.length > 0) {
      return query(loansCol, where('organizationId', '==', organizationId), where('branchId', 'in', branchIds));
    }
    if (roleId === 'loan_officer') {
      return query(loansCol, where('organizationId', '==', organizationId), where('loanOfficerId', '==', user.uid));
    }
    return null;
  }, [firestore, user?.uid, userProfile?.organizationId, userProfile?.roleId, JSON.stringify(userProfile?.branchIds), isSuperAdmin]);
  const { data: visibleLoans, isLoading: isLoadingLoans } = useCollection<Loan>(loansQuery);

  const visibleLoanIds = useMemo(() => {
    if (!visibleLoans) return null;
    return visibleLoans.map(l => l.id);
  }, [visibleLoans]);

  // Query for repayments related to the visible loans
  const repaymentsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;

    if (isSuperAdmin) {
        return collection(firestore, 'repayments');
    }
    if (userProfile.roleId === 'admin' && userProfile.organizationId) {
        return query(collection(firestore, 'repayments'), where('organizationId', '==', userProfile.organizationId));
    }

    if (isLoadingLoans || !visibleLoanIds) return null; // Wait for loans to load
    if (visibleLoanIds.length === 0) {
        // No loans, so no repayments to fetch. Query a non-existent path to return empty.
        return query(collection(firestore, 'repayments'), where('loanId', '==', 'no-loans-found'));
    }

    // Firestore 'in' query is limited to 30 items in new SDK versions
    if (visibleLoanIds.length > 30) {
        console.warn(`Repayment query limited to 30 loans due to Firestore limitations.`);
        return query(collection(firestore, 'repayments'), where('loanId', 'in', visibleLoanIds.slice(0, 30)));
    }
    return query(collection(firestore, 'repayments'), where('loanId', 'in', visibleLoanIds));
  }, [firestore, userProfile?.organizationId, userProfile?.roleId, isSuperAdmin, isLoadingLoans, JSON.stringify(visibleLoanIds)]);
  const { data: repayments, isLoading: isLoadingRepayments } = useCollection<Repayment>(repaymentsQuery);

  // Query for borrowers visible to the current user
  const borrowersQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    const { roleId, branchIds, organizationId } = userProfile;
    const borrowersCol = collection(firestore, 'borrowers');

    if (isSuperAdmin) return borrowersCol;
    if (roleId === 'admin') {
      return query(borrowersCol, where('organizationId', '==', organizationId));
    }
    if ((roleId === 'manager' || roleId === 'loan_officer') && branchIds?.length > 0) {
      return query(borrowersCol, where('organizationId', '==', organizationId), where('branchId', 'in', branchIds));
    }
    return null;
  }, [firestore, userProfile?.organizationId, userProfile?.roleId, JSON.stringify(userProfile?.branchIds), isSuperAdmin]);
  const { data: visibleBorrowers, isLoading: isLoadingBorrowers } = useCollection<Borrower>(borrowersQuery);

  // All users can see all loan products
  const loanProductsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    if (isSuperAdmin) return collection(firestore, 'loanProducts');
    if (userProfile?.organizationId) {
        return query(collection(firestore, 'loanProducts'), where('organizationId', '==', userProfile.organizationId));
    }
    return null;
  }, [firestore, isSuperAdmin, userProfile?.organizationId]);
  const { data: loanProducts, isLoading: isLoadingProducts } = useCollection<LoanProduct>(loanProductsQuery);

  const isLoading = isProfileLoading || isLoadingLoans || isLoadingRepayments || isLoadingBorrowers || isLoadingProducts;

  const repaymentsWithDetails = useMemo(() => {
    if (isLoading || !repayments || !visibleBorrowers || !visibleLoans || !loanProducts) return [];

    const borrowersMap = new Map(visibleBorrowers.map(b => [b.id, b]));
    const loansMap = new Map(visibleLoans.map(l => [l.id, l]));
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
  }, [repayments, visibleBorrowers, visibleLoans, loanProducts, isLoading]);

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
