'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { useUserProfile } from '@/providers/user-profile';
import { getLoans } from '@/actions/loans';
import { getBorrowers } from '@/actions/borrowers';
import { getLoanProducts } from '@/actions/loan-products';
import type { Loan, Borrower, LoanProduct } from '@/lib/types';
import { getBranchPerformance } from '@/actions/branches';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

// A generic data table component for the reports
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  emptyStateMessage: string;
}

function ReportDataTable<TData, TValue>({
  columns,
  data,
  emptyStateMessage,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {emptyStateMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
          Previous
        </Button>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          Next
        </Button>
      </div>
    </div>
  );
}

// Columns for Active Loans
type LoanWithDetails = Loan & { 
    borrowerName: string; 
    loanProductName: string; 
    borrowerPhotoUrl?: string; 
    nextPaymentDate?: string;
    lastPaymentDate?: string;
};

// Columns can be defined outside if they don't use hooks, 
// but here we move them inside ReportsPage or use a separate Cell component.


// Columns for Customers (Leads and Inactive)
// Placeholder for customerColumns - defined inside ReportsPage


export default function ReportsPage() {
  const router = useRouter();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const isSuperAdmin = userProfile?.roleId === 'superadmin';
  const organizationId = userProfile?.organizationId;
  const branchIds = userProfile?.branchIds;

  const [isLoading, setIsLoading] = useState(true);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [loanProducts, setLoanProducts] = useState<LoanProduct[]>([]);
  const [branchPerformance, setBranchPerformance] = useState<any[]>([]);

  // Move columns inside to utilize 'router' correctly
  const activeLoansColumns = useMemo<ColumnDef<LoanWithDetails>[]>(() => [
    {
      accessorKey: 'borrowerName',
      header: 'Borrower',
      cell: ({ row }) => {
        const loan = row.original;
        return (
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push(`/borrowers/${loan.borrowerId}`)}>
            <Avatar className="hidden h-9 w-9 sm:flex">
              <AvatarImage src={loan.borrowerPhotoUrl} alt={loan.borrowerName} />
              <AvatarFallback>{loan.borrowerName?.charAt(0) ?? '?'}</AvatarFallback>
            </Avatar>
            <div className="grid gap-0.5">
              <span className="font-medium hover:underline">{loan.borrowerName}</span>
              <span className="text-xs text-muted-foreground">{loan.borrowerId}</span>
            </div>
          </div>
        );
      },
    },
    { accessorKey: 'loanProductName', header: 'Product' },
    { 
      accessorKey: 'principal', 
      header: () => <div className="text-right">Principal</div>,
      cell: ({ row }) => <div className="text-right font-medium">{formatCurrency(row.original.principal)}</div>,
    },
    { 
      accessorKey: 'issueDate', 
      header: 'Disbursed',
      cell: ({ row }) => new Date(row.original.issueDate).toLocaleDateString(),
    },
    { 
      accessorKey: 'lastPaymentDate', 
      header: 'Last Repayment',
      cell: ({ row }) => row.original.lastPaymentDate ? new Date(row.original.lastPaymentDate).toLocaleDateString() : 'None',
    },
    { 
      accessorKey: 'nextPaymentDate', 
      header: 'Next Due',
      cell: ({ row }) => row.original.nextPaymentDate ? (
        <Badge variant={new Date(row.original.nextPaymentDate) < new Date() ? 'destructive' : 'outline'}>
            {new Date(row.original.nextPaymentDate).toLocaleDateString()}
        </Badge>
      ) : (
        <Badge variant="secondary">Completed</Badge>
      ),
    },
  ], [router]);

  const customerColumns = useMemo<ColumnDef<Borrower>[]>(() => [
    {
      accessorKey: 'fullName',
      header: 'Name',
      cell: ({ row }) => {
        const borrower = row.original;
        return (
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push(`/borrowers/${borrower.id}`)}>
            <Avatar className="hidden h-9 w-9 sm:flex">
              <AvatarImage src={borrower.photoUrl} alt={borrower.fullName} />
              <AvatarFallback>{borrower.fullName?.charAt(0) ?? '?'}</AvatarFallback>
            </Avatar>
            <div className="grid gap-0.5">
              <span className="font-medium hover:underline">{borrower.fullName}</span>
              <span className="text-xs text-muted-foreground">{borrower.email}</span>
            </div>
          </div>
        );
      },
    },
    { accessorKey: 'phone', header: 'Phone' },
    { 
      id: 'registration',
      header: 'Registration',
      cell: ({ row }) => {
        const borrower = row.original;
        return (
            <Badge variant={borrower.registrationFeePaid ? 'default' : 'secondary'}>
            {borrower.registrationFeePaid ? `Paid on ${new Date(borrower.registrationFeePaidAt!).toLocaleDateString()}` : 'Fee Due'}
          </Badge>
        )
      }
    },
  ], [router]);

  const fetchReportsData = useCallback(async () => {
      if (!userProfile) return;
      setIsLoading(true);
      try {
          const orgId = isSuperAdmin ? 'system' : organizationId!;
          
          // Loans
          const loansRes = await getLoans(orgId, undefined, !isSuperAdmin ? branchIds : undefined);
          if (loansRes.success && loansRes.loans) setLoans(loansRes.loans as any);

          // Borrowers
          const borrowersRes = await getBorrowers(orgId);
          if (borrowersRes.success && borrowersRes.borrowers) setBorrowers(borrowersRes.borrowers as any);

          // Products
          const productsRes = await getLoanProducts(orgId);
          if (productsRes.success && productsRes.products) setLoanProducts(productsRes.products as any);

          // Branch Performance
          const performanceRes = await getBranchPerformance(organizationId || 'default');
          if (performanceRes.success && performanceRes.data) setBranchPerformance(performanceRes.data);

      } catch (e) {
          console.error(e);
      } finally {
          setIsLoading(false);
      }
  }, [userProfile, isSuperAdmin, organizationId, branchIds]);

  useEffect(() => {
    if (userProfile) {
        fetchReportsData();
    }
  }, [userProfile, fetchReportsData]);

  // Process data for reports
  const { activeLoans, inactiveCustomers, leads } = useMemo(() => {
    if (!loans || !borrowers || !loanProducts) {
      return { activeLoans: [], inactiveCustomers: [], leads: [] };
    }

    const borrowersMap = new Map(borrowers.map(b => [b.id, b]));
    const loanProductsMap = new Map(loanProducts.map(p => [p.id, p]));
    const loanBorrowerIds = new Set(loans.map(l => l.borrowerId));
    const activeOrPendingBorrowerIds = new Set(
        loans.filter(l => l.status === 'Active' || l.status === 'Pending Approval').map(l => l.borrowerId)
    );

    // 1. Active Loans Report
    const activeLoansData = loans
      .filter(l => l.status === 'Active')
      .map(loan => ({
        ...loan,
        borrowerName: borrowersMap.get(loan.borrowerId)?.fullName || 'Unknown',
        loanProductName: loanProductsMap.get(loan.loanProductId)?.name || 'Unknown',
        borrowerPhotoUrl: borrowersMap.get(loan.borrowerId)?.photoUrl,
        nextPaymentDate: (loan as any).installments
            ?.filter((inst: any) => inst.status === 'Unpaid' || inst.status === 'Partial' || inst.status === 'Overdue')
            .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0]?.dueDate
      }));

    // 2. Inactive Customers Report
    const inactiveCustomersData = borrowers.filter(b => 
        loanBorrowerIds.has(b.id) && 
        !activeOrPendingBorrowerIds.has(b.id)
    );
    
    // 3. Leads Report
    const leadsData = borrowers.filter(b => b.registrationFeePaid && !loanBorrowerIds.has(b.id));

    return { activeLoans: activeLoansData, inactiveCustomers: inactiveCustomersData, leads: leadsData };

  }, [loans, borrowers, loanProducts]);

  const performanceTotal = useMemo(() => {
    if (!branchPerformance.length) return null;
    return branchPerformance.reduce((acc, p) => ({
        totalBorrowers: acc.totalBorrowers + p.totalBorrowers,
        totalLoans: acc.totalLoans + p.totalLoans,
        activeLoans: acc.activeLoans + p.activeLoans,
        totalPrincipal: acc.totalPrincipal + p.totalPrincipal,
        totalCollected: acc.totalCollected + p.totalCollected,
        overdueInstallments: acc.overdueInstallments + p.overdueInstallments,
    }), {
        totalBorrowers: 0,
        totalLoans: 0,
        activeLoans: 0,
        totalPrincipal: 0,
        totalCollected: 0,
        overdueInstallments: 0,
    });
  }, [branchPerformance]);

  return (
    <>
      <PageHeader title="Reports" description="View detailed reports on your lending activities." />
      <div className="p-4 md:p-6">
        <Tabs defaultValue="active-loans">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="active-loans">Active Loans ({activeLoans.length})</TabsTrigger>
            <TabsTrigger value="inactive-customers">Inactive Customers ({inactiveCustomers.length})</TabsTrigger>
            <TabsTrigger value="leads">Leads ({leads.length})</TabsTrigger>
            <TabsTrigger value="performance">Branch Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="active-loans">
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Active Loans</CardTitle>
                <CardDescription>All loans that are currently active and being repaid.</CardDescription>
              </CardHeader>
              <CardContent>
                <ReportDataTable columns={activeLoansColumns} data={activeLoans} emptyStateMessage="No active loans found." />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inactive-customers">
            <Card className="mt-4">
                <CardHeader>
                    <CardTitle>Inactive Customers</CardTitle>
                    <CardDescription>Customers who have had loans in the past but have no currently active loans.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ReportDataTable columns={customerColumns} data={inactiveCustomers} emptyStateMessage="No inactive customers found." />
                </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leads">
          <Card className="mt-4">
                <CardHeader>
                    <CardTitle>Leads</CardTitle>
                    <CardDescription>Registered borrowers who have not yet taken out any loans.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ReportDataTable columns={customerColumns} data={leads} emptyStateMessage="No leads found." />
                </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="performance">
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Branch Performance Summary</CardTitle>
                <CardDescription>Consolidated lending performance across all branches.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Branch</TableHead>
                        <TableHead className="text-right">Borrowers</TableHead>
                        <TableHead className="text-right">Active Loans</TableHead>
                        <TableHead className="text-right">Total Disbursed</TableHead>
                        <TableHead className="text-right">Total Collected</TableHead>
                        <TableHead className="text-right">Arrears</TableHead>
                        <TableHead className="text-right">Collection Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {branchPerformance.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="text-right">{p.totalBorrowers}</TableCell>
                          <TableCell className="text-right">{p.activeLoans}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{formatCurrency(p.totalPrincipal)}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{formatCurrency(p.totalCollected)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={p.overdueInstallments > 0 ? "destructive" : "outline"} className="text-[10px]">
                              {p.overdueInstallments}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-xs font-bold">{p.collectionRate.toFixed(1)}%</span>
                          </TableCell>
                        </TableRow>
                      ))}
                      {performanceTotal && (
                        <TableRow className="bg-muted/50 font-bold border-t-2">
                          <TableCell>Platform Total</TableCell>
                          <TableCell className="text-right">{performanceTotal.totalBorrowers}</TableCell>
                          <TableCell className="text-right">{performanceTotal.activeLoans}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{formatCurrency(performanceTotal.totalPrincipal)}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{formatCurrency(performanceTotal.totalCollected)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={performanceTotal.overdueInstallments > 0 ? "destructive" : "outline"}>
                              {performanceTotal.overdueInstallments}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {(performanceTotal.totalPrincipal > 0 ? (performanceTotal.totalCollected / performanceTotal.totalPrincipal) * 100 : 0).toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
