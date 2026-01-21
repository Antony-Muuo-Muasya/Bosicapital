'use client';
import type { LoanProduct } from '@/lib/types';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '../ui/button';
import { MoreHorizontal } from 'lucide-react';
import { useFirestore, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { formatCurrency } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

const ProductActions = ({ product, onEdit }: { product: LoanProduct, onEdit: (product: LoanProduct) => void }) => {
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete the "${product.name}" loan product?`)) {
      const productDocRef = doc(firestore, 'loanProducts', product.id);
      deleteDocumentNonBlocking(productDocRef)
        .then(() => toast({ title: 'Success', description: 'Loan product deleted.' }))
        .catch(err => toast({ variant: 'destructive', title: 'Error', description: 'Could not delete product.' }));
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onEdit(product)}>
          Edit Product
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDelete} className="text-destructive">
          Delete Product
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const getLoanProductColumns = (onEdit: (product: LoanProduct) => void): ColumnDef<LoanProduct>[] => [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'minAmount',
    header: 'Min Amount',
    cell: ({ row }) => formatCurrency(row.original.minAmount, 'KES'),
  },
  {
    accessorKey: 'maxAmount',
    header: 'Max Amount',
    cell: ({ row }) => formatCurrency(row.original.maxAmount, 'KES'),
  },
  {
    accessorKey: 'interestRate',
    header: 'Interest Rate',
    cell: ({ row }) => `${row.original.interestRate}%`,
  },
  {
    accessorKey: 'duration',
    header: 'Duration (Months)',
  },
  {
    accessorKey: 'repaymentCycle',
    header: 'Repayment Cycle',
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const product = row.original;
      return <ProductActions product={product} onEdit={onEdit} />;
    },
  },
];
