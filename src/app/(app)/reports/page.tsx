'use client';

import { useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { useCollection, useFirestore, useMemoFirebase, useUserProfile } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Loan, Borrower, LoanProduct } from '@/lib/types';
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
type LoanWithDetails = Loan & { borrowerName: string; loanProductName: string; borrowerPhotoUrl?: string };

const activeLoansColumns: ColumnDef<LoanWithDetails>[] = [
  {
    accessorKey: 'borrowerName',
    header: 'Borrower',
    cell: ({ row }) => {
      const loan = row.original;
      const router = useRouter();
      return (
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push(`/borrowers/${loan.borrowerId}`)}>
          <Avatar className="hidden h-9 w-9 sm:flex">
            <AvatarImage src={loan.borrowerPhotoUrl} alt={loan.borrowerName} />
            <AvatarFallback>{loan.borrowerName.charAt(0)}</AvatarFallback>
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
    header: 'Issue Date',
    cell: ({ row }) => new Date(row.original.issueDate).toLocaleDateString(),
  },
];

// Columns for Customers (Leads and Inactive)
const customerColumns: ColumnDef<Borrower>[] = [
    {
      accessorKey: 'fullName',
      header: 'Name',
      cell: ({ row }) => {
        const borrower = row.original;
        const router = useRouter();
        return (
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push(`/borrowers/${borrower.id}`)}>
            <Avatar className="hidden h-9 w-9 sm:flex">
              <AvatarImage src={borrower.photoUrl} alt={borrower.fullName} />
              <AvatarFallback>{borrower.fullName.charAt(0)}</AvatarFallback>
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
];

export default function ReportsPage() {
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const firestore = useFirestore();
  const isSuperAdmin = userProfile?.roleId === 'superadmin';
  const organizationId = userProfile?.organizationId;
  const branchIds = userProfile?.branchIds;

  // Generic queries based on user role
  const loansQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    const loansCol = collection(firestore, 'loans');
    if (isSuperAdmin) return loansCol;
    if (!organizationId) return null; // Should not happen for non-superadmins
    if (userProfile.roleId === 'admin') return query(loansCol, where('organizationId', '==', organizationId));
    if (userProfile.roleId === 'manager' && branchIds?.length > 0) return query(loansCol, where('branchId', 'in', branchIds));
    return null;
  }, [firestore, userProfile, isSuperAdmin, organizationId, JSON.stringify(branchIds)]);
  
  const borrowersQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    const borrowersCol = collection(firestore, 'borrowers');
    if (isSuperAdmin) return borrowersCol;
    if (!organizationId) return null;
    if (userProfile.roleId === 'admin') return query(borrowersCol, where('organizationId', '==', organizationId));
    if (userProfile.roleId === 'manager' && branchIds?.length > 0) return query(borrowersCol, where('branchId', 'in', branchIds));
    return null;
  }, [firestore, userProfile, isSuperAdmin, organizationId, JSON.stringify(branchIds)]);

  const loanProductsQuery = useMemoFirebase(() => {
    if (!firestore || !organizationId) return null;
    // Superadmin needs all products, but they don't have an org id.
    // For now, scope to current org, or all if superadmin.
    if (isSuperAdmin) return collection(firestore, 'loanProducts');
    return query(collection(firestore, 'loanProducts'), where('organizationId', '==', organizationId));
  }, [firestore, organizationId, isSuperAdmin]);


  const { data: loans, isLoading: isLoadingLoans } = useCollection<Loan>(loansQuery);
  const { data: borrowers, isLoading: isLoadingBorrowers } = useCollection<Borrower>(borrowersQuery);
  const { data: loanProducts, isLoading: isLoadingProducts } = useCollection<LoanProduct>(loanProductsQuery);

  const isLoading = isProfileLoading || isLoadingLoans || isLoadingBorrowers || isLoadingProducts;

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
        borrowerPhotoUrl: borrowersMap.get(loan.borrowerId)?.photoUrl
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

  return (
    <>
      <PageHeader title="Reports" description="View detailed reports on your lending activities." />
      <div className="p-4 md:p-6">
        <Tabs defaultValue="active-loans">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="active-loans">Active Loans ({activeLoans.length})</TabsTrigger>
            <TabsTrigger value="inactive-customers">Inactive Customers ({inactiveCustomers.length})</TabsTrigger>
            <TabsTrigger value="leads">Leads ({leads.length})</TabsTrigger>
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
        </Tabs>
      </div>
    </>
  );
}
