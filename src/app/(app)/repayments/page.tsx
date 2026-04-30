'use client';

import { useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import type { Repayment, Borrower, Loan, LoanProduct } from '@/lib/types';
import { useUserProfile } from '@/providers/user-profile';
import { getRepayments } from '@/actions/repayments';
import { getLoans } from '@/actions/loans';
import { getBorrowers } from '@/actions/borrowers';
import { getLoanProducts } from '@/actions/loan-products';
import { useEffect, useState, useCallback } from 'react';
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
  const { user, userProfile, isLoading: isProfileLoading } = useUserProfile();
  const isSuperAdmin = userProfile?.roleId === 'superadmin';
  const organizationId = userProfile?.organizationId;
  const roleId = userProfile?.roleId;
  const branchIds = userProfile?.branchIds;
  const userId = user?.id;

  const [visibleLoans, setVisibleLoans] = useState<Loan[] | null>(null);
  const [allRepayments, setAllRepayments] = useState<Repayment[] | null>(null);
  const [allBorrowers, setAllBorrowers] = useState<Borrower[] | null>(null);
  const [loanProducts, setLoanProducts] = useState<LoanProduct[] | null>(null);

  const [isLoadingLoans, setIsLoadingLoans] = useState(true);
  const [isLoadingRepayments, setIsLoadingRepayments] = useState(true);
  const [isLoadingBorrowers, setIsLoadingBorrowers] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  const fetchLoans = useCallback(async () => {
      if (!userProfile || !organizationId) return;
      setIsLoadingLoans(true);
      try {
          const res = await getLoans(
              organizationId!, 
              undefined, 
              (roleId === 'manager' || roleId === 'loan_officer') ? branchIds : undefined,
              roleId === 'loan_officer' ? userId : undefined
          );
          if (res.success && res.loans) {
              setVisibleLoans(res.loans as any);
          }
      } catch (err) { console.error(err) } finally { setIsLoadingLoans(false) }
  }, [userProfile, organizationId, roleId, branchIds, userId]);

  const fetchRepayments = useCallback(async () => {
      if (!userProfile || !organizationId) return;
      setIsLoadingRepayments(true);
      try {
          const res = await getRepayments(organizationId!);
          if (res.success && res.repayments) {
              setAllRepayments(res.repayments as any);
          }
      } catch (err) { console.error(err) } finally { setIsLoadingRepayments(false) }
  }, [userProfile, organizationId]);

  const fetchBorrowers = useCallback(async () => {
      if (!userProfile || !organizationId) return;
      setIsLoadingBorrowers(true);
      try {
          const res = await getBorrowers(organizationId!);
          if (res.success && res.borrowers) {
              setAllBorrowers(res.borrowers as any);
          }
      } catch (err) { console.error(err) } finally { setIsLoadingBorrowers(false) }
  }, [userProfile, organizationId]);

  const fetchProducts = useCallback(async () => {
      if (!userProfile || !organizationId) return;
      setIsLoadingProducts(true);
      try {
          const res = await getLoanProducts(organizationId!);
          if (res.success && res.products) {
              setLoanProducts(res.products as any);
          }
      } catch (err) { console.error(err) } finally { setIsLoadingProducts(false) }
  }, [userProfile, organizationId]);

   useEffect(() => {
      if (!isProfileLoading && userProfile) {
          fetchLoans();
          fetchRepayments();
          fetchBorrowers();
          fetchProducts();

          // Fallback polling every 10 seconds
          const interval = setInterval(() => {
              fetchRepayments();
          }, 10000);

          return () => {
              clearInterval(interval);
          }

      }
   }, [isProfileLoading, userProfile, fetchLoans, fetchRepayments, fetchBorrowers, fetchProducts]);

  const isLoading = isProfileLoading || isLoadingLoans || isLoadingRepayments || isLoadingBorrowers || isLoadingProducts;

  const repaymentsWithDetails = useMemo(() => {
    if (isLoading || !allRepayments || !allBorrowers || !visibleLoans || !loanProducts) return [];

    const visibleLoanIds = new Set(visibleLoans.map(l => l.id));
    const borrowersMap = new Map(allBorrowers.map(b => [b.id, b]));
    const loansMap = new Map(visibleLoans.map(l => [l.id, l]));
    const loanProductsMap = new Map(loanProducts.map(p => [p.id, p]));

    // Filter: Include loan repayments if the loan is visible, OR all registration fees for the org
    const filteredRepayments = allRepayments.filter((r: any) => {
      if (r.type === 'Registration Fee') return true;
      return visibleLoanIds.has(r.loanId);
    });

    return filteredRepayments.map((repayment: any) => {
      const loan = repayment.loanId ? loansMap.get(repayment.loanId) : null;

      const borrower = (repayment as any).borrowerId ? borrowersMap.get((repayment as any).borrowerId) : (loan ? borrowersMap.get(loan.borrowerId) : undefined);
      const product = loan ? loanProductsMap.get(loan.loanProductId) : undefined;

      return {
        ...repayment,
        borrowerName: borrower?.fullName || (repayment as any).borrowerName || 'Unknown Borrower',
        loanProductName: product?.name || repayment.type || 'Loan Repayment',
        displayLoanId: repayment.loanId ? repayment.loanId.substring(0, 12) + '...' : 'Registration'
      };
    }).sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  }, [allRepayments, allBorrowers, visibleLoans, loanProducts, isLoading]);

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
        <div className="flex flex-col md:flex-row gap-2 items-end">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold px-1">Missing a payment?</span>
            <div className="flex gap-1">
              <input 
                id="mpesaCodeInput"
                placeholder="M-Pesa Code (e.g. RLK4...)" 
                className="h-9 px-3 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-primary w-48"
              />
              <Button 
                size="sm"
                variant="secondary"
                onClick={async () => {
                   const code = (document.getElementById('mpesaCodeInput') as HTMLInputElement).value;
                   if(!code) return alert('Enter M-Pesa Code');
                   const res = await fetch('/api/payments/sync', {
                     method: 'POST',
                     body: JSON.stringify({ mpesaCode: code })
                   });
                   const data = await res.json();
                   alert(data.success ? 'Payment Found & Processed!' : (data.error || 'Check again in 5 minutes'));
                }}
              >
                Sync
              </Button>
            </div>
          </div>
          <div className="h-9 w-[1px] bg-border mx-2 hidden md:block" />
          <Button variant="outline" onClick={handleExport} disabled={isLoading || !repaymentsWithDetails?.length} className="h-9">
            <FileDown className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
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
                      <div className="text-sm text-muted-foreground">{repayment.displayLoanId}</div>
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
