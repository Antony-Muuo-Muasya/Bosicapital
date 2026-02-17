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

type DueInstallmentWithDetails = Installment & {
    borrowerName: string;
    borrowerPhotoUrl: string;
    loanProductName: string;
};

const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Overdue': return 'destructive';
      case 'Partial': return 'secondary';
      default: return 'outline';
    }
};

export const dueTodayColumns: ColumnDef<DueInstallmentWithDetails>[] = [
    {
      accessorKey: 'borrowerName',
      header: 'Borrower',
      cell: ({ row }) => {
        const installment = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="hidden h-9 w-9 sm:flex">
              <AvatarImage src={installment.borrowerPhotoUrl} alt={installment.borrowerName} />
              <AvatarFallback>{installment.borrowerName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="grid gap-0.5">
              <span className="font-medium">{installment.borrowerName}</span>
              <span className="text-xs text-muted-foreground">{installment.loanId}</span>
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
      accessorKey: 'expectedAmount',
      header: () => <div className="text-right">Amount Due</div>,
      cell: ({ row }) => {
        const amount = parseFloat(row.original.expectedAmount) - parseFloat(row.original.paidAmount);
        return <div className="text-right font-medium">{formatCurrency(amount)}</div>;
      },
    },
    {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
            const status = row.original.status;
            return <Badge variant={getStatusVariant(status)}>{status}</Badge>;
        }
    },
];

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    isLoading: boolean;
}
  
function DueTodayTable<TData, TValue>({
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
                    No payments due today.
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

export default function DueTodayPage() {
    const firestore = useFirestore();
    const { userProfile, isLoading: isProfileLoading } = useUserProfile();

    const isSuperAdmin = userProfile?.roleId === 'superadmin';
    const organizationId = userProfile?.organizationId;
    const branchIds = userProfile?.branchIds;

    const todayISO = startOfToday().toISOString().split('T')[0];

    const dueTodayQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        const installmentsCol = collectionGroup(firestore, 'installments');
        
        let q = query(installmentsCol, where('dueDate', '==', todayISO), where('status', '!=', 'Paid'));

        if (!isSuperAdmin && organizationId) {
            q = query(q, where('organizationId', '==', organizationId));
        }

        // NOTE: Branch-level filtering on a collection group query is not straightforward
        // without including branchId in every installment and creating complex indexes.
        // We will filter client-side for managers/officers for now.
        return q;
    }, [firestore, todayISO, organizationId, isSuperAdmin]);

    const { data: dueInstallments, isLoading: isLoadingInstallments } = useCollection<Installment>(dueTodayQuery);
    
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

    const dueTodayWithDetails = useMemo(() => {
        if (!dueInstallments || !allLoans || !allBorrowers || !allProducts) return [];

        const loansMap = new Map(allLoans.map(l => [l.id, l]));
        const borrowersMap = new Map(allBorrowers.map(b => [b.id, b]));
        const productsMap = new Map(allProducts.map(p => [p.id, p]));

        let filteredInstallments = dueInstallments;
        if (userProfile?.roleId === 'manager' || userProfile?.roleId === 'loan_officer') {
            const allowedBranches = new Set(branchIds);
            filteredInstallments = dueInstallments.filter(inst => {
                const loan = loansMap.get(inst.loanId);
                return loan && allowedBranches.has(loan.branchId);
            });
        }

        return filteredInstallments.map(inst => {
            const loan = loansMap.get(inst.loanId);
            const borrower = loan ? borrowersMap.get(loan.borrowerId) : undefined;
            const product = loan ? productsMap.get(loan.loanProductId) : undefined;
            return {
                ...inst,
                borrowerName: borrower?.fullName || 'Unknown',
                borrowerPhotoUrl: borrower?.photoUrl || `https://picsum.photos/seed/${inst.borrowerId}/400/400`,
                loanProductName: product?.name || 'Unknown Product',
            }
        });

    }, [dueInstallments, allLoans, allBorrowers, allProducts, userProfile, branchIds]);


  return (
    <>
      <PageHeader title="Due Today" description="All loan installments that are due for payment today." />
      <div className="p-4 md:p-6">
        <DueTodayTable columns={dueTodayColumns} data={dueTodayWithDetails} isLoading={isLoading} />
      </div>
    </>
  );
}
