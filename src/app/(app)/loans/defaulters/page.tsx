'use client';
import { PageHeader } from '@/components/page-header';
import { useCollection, useFirestore, useMemoFirebase, useUserProfile } from '@/firebase';
import { collection, query, where, collectionGroup, documentId } from 'firebase/firestore';
import type { Loan, Borrower, Installment, LoanProduct } from '@/lib/types';
import { useMemo } from 'react';
import { startOfToday } from 'date-fns';
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
import { Skeleton } from '@/components/ui/skeleton';

type DefaulterLoan = Loan & {
    borrowerName: string;
    borrowerPhotoUrl: string;
    loanProductName: string;
    overdueAmount: number;
    daysOverdue: number;
};

export const defaulterColumns: ColumnDef<DefaulterLoan>[] = [
    {
      accessorKey: 'borrowerName',
      header: 'Borrower',
      cell: ({ row }) => {
        const loan = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="hidden h-9 w-9 sm:flex">
              <AvatarImage src={loan.borrowerPhotoUrl} alt={loan.borrowerName} />
              <AvatarFallback>{loan.borrowerName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="grid gap-0.5">
              <span className="font-medium">{loan.borrowerName}</span>
              <span className="text-xs text-muted-foreground">{loan.borrowerId}</span>
            </div>
          </div>
        );
      },
    },
    {
        accessorKey: 'loanProductName',
        header: 'Loan Product',
    },
    {
      accessorKey: 'overdueAmount',
      header: () => <div className="text-right">Amount Overdue</div>,
      cell: ({ row }) => <div className="text-right font-medium text-destructive">{formatCurrency(row.original.overdueAmount)}</div>,
    },
    {
        accessorKey: 'daysOverdue',
        header: 'Days Overdue',
        cell: ({ row }) => <Badge variant="destructive">{row.original.daysOverdue} days</Badge>,
    },
];

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    isLoading: boolean;
}
  
function DefaultersTable<TData, TValue>({
    columns,
    data,
    isLoading,
}: DataTableProps<TData, TValue>) {
    const table = useReactTable({
      data: data || [],
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
                {isLoading && Array.from({length: 5}).map((_, i) => (
                    <TableRow key={i}>
                        {columns.map((col, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
                    </TableRow>
                ))}
                {!isLoading && table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                        {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                        ))}
                    </TableRow>
                    ))
                ) : (
                    !isLoading && <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                        No defaulters found.
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

export default function DefaultersPage() {
    const firestore = useFirestore();
    const { userProfile, isLoading: isProfileLoading } = useUserProfile();

    const isSuperAdmin = userProfile?.roleId === 'superadmin';
    const organizationId = userProfile?.organizationId;
    const branchIds = userProfile?.branchIds;

    const today = startOfToday();

    const unpaidInstallmentsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        const installmentsCol = collectionGroup(firestore, 'installments');
        
        // This query is simpler to avoid complex indexes. We filter for date on the client.
        let q = query(installmentsCol, where('status', 'in', ['Unpaid', 'Partial', 'Overdue']));

        if (!isSuperAdmin && organizationId) {
            q = query(q, where('organizationId', '==', organizationId));
        }
        return q;
    }, [firestore, organizationId, isSuperAdmin]);

    const { data: unpaidInstallments, isLoading: isLoadingInstallments } = useCollection<Installment>(unpaidInstallmentsQuery);
    
    // Fetch all related data for enrichment
    const allLoansQuery = useMemoFirebase(() => {
        if (!firestore || !organizationId) return null;
        return query(collection(firestore, 'loans'), where('organizationId', '==', organizationId));
    }, [firestore, organizationId]);
    const { data: allLoans } = useCollection<Loan>(allLoansQuery);

    const allBorrowersQuery = useMemoFirebase(() => {
        if (!firestore || !organizationId) return null;
        return query(collection(firestore, 'borrowers'), where('organizationId', '==', organizationId));
    }, [firestore, organizationId]);
    const { data: allBorrowers } = useCollection<Borrower>(allBorrowersQuery);

    const allProductsQuery = useMemoFirebase(() => {
        if (!firestore || !organizationId) return null;
        return query(collection(firestore, 'loanProducts'), where('organizationId', '==', organizationId));
    }, [firestore, organizationId]);
    const { data: allProducts } = useCollection<LoanProduct>(allProductsQuery);

    const isLoading = isProfileLoading || isLoadingInstallments;

    const defaulterLoans = useMemo(() => {
        if (!unpaidInstallments || !allLoans || !allBorrowers || !allProducts) return [];

        // Client-side filtering for overdue installments
        const overdueInstallments = unpaidInstallments.filter(inst => new Date(inst.dueDate) < today);

        const loansMap = new Map(allLoans.map(l => [l.id, l]));
        const borrowersMap = new Map(allBorrowers.map(b => [b.id, b]));
        const productsMap = new Map(allProducts.map(p => [p.id, p]));

        let installments = overdueInstallments;
        if (userProfile?.roleId === 'manager' || userProfile?.roleId === 'loan_officer') {
            const allowedBranches = new Set(branchIds);
            installments = overdueInstallments.filter(inst => {
                const loan = loansMap.get(inst.loanId);
                return loan && allowedBranches.has(loan.branchId);
            });
        }
        
        const overdueByLoan = installments.reduce((acc, inst) => {
            if (!acc[inst.loanId]) {
                acc[inst.loanId] = { overdueAmount: 0, oldestDueDate: new Date(inst.dueDate) };
            }
            acc[inst.loanId].overdueAmount += inst.expectedAmount - inst.paidAmount;
            if (new Date(inst.dueDate) < acc[inst.loanId].oldestDueDate) {
                acc[inst.loanId].oldestDueDate = new Date(inst.dueDate);
            }
            return acc;
        }, {} as Record<string, { overdueAmount: number, oldestDueDate: Date }>);
        
        return Object.keys(overdueByLoan).map(loanId => {
            const loan = loansMap.get(loanId);
            const borrower = loan ? borrowersMap.get(loan.borrowerId) : undefined;
            const product = loan ? productsMap.get(loan.loanProductId) : undefined;
            const overdueInfo = overdueByLoan[loanId];

            if (!loan || !borrower || !product) return null;
            
            const daysOverdue = Math.floor((today.getTime() - overdueInfo.oldestDueDate.getTime()) / (1000 * 60 * 60 * 24));

            return {
                ...loan,
                borrowerName: borrower.fullName,
                borrowerPhotoUrl: borrower.photoUrl || `https://picsum.photos/seed/${borrower.id}/400/400`,
                loanProductName: product.name,
                overdueAmount: overdueInfo.overdueAmount,
                daysOverdue: daysOverdue > 0 ? daysOverdue : 1,
            }
        }).filter(Boolean) as DefaulterLoan[];

    }, [unpaidInstallments, allLoans, allBorrowers, allProducts, userProfile, branchIds, today]);


  return (
    <>
      <PageHeader title="Defaulters" description="A list of all loans with overdue payments." />
      <div className="p-4 md:p-6">
        <DefaultersTable columns={defaulterColumns} data={defaulterLoans} isLoading={isLoading} />
      </div>
    </>
  );
}
