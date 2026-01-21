'use client';

import type { Borrower } from '@/lib/types';
import { ColumnDef } from '@tanstack/react-table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '../ui/button';
import { MoreHorizontal } from 'lucide-react';
import { useFirestore, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { formatCurrency } from '@/lib/utils';

const BorrowerActions = ({ borrowerId }: { borrowerId: string }) => {
  const firestore = useFirestore();

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this borrower?')) {
      const borrowerDocRef = doc(firestore, 'borrowers', borrowerId);
      deleteDocumentNonBlocking(borrowerDocRef);
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
        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(borrowerId)}>
          Copy borrower ID
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Edit Borrower</DropdownMenuItem>
        <DropdownMenuItem onClick={handleDelete} className="text-destructive">
          Delete Borrower
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const columns: ColumnDef<Borrower>[] = [
  {
    accessorKey: 'fullName',
    header: 'Name',
    cell: ({ row }) => {
      const borrower = row.original;
      return (
        <div className="flex items-center gap-3">
          <Avatar className="hidden h-9 w-9 sm:flex">
            <AvatarImage src={borrower.photoUrl} alt={borrower.fullName} />
            <AvatarFallback>{borrower.fullName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="grid gap-0.5">
            <span className="font-medium">{borrower.fullName}</span>
            <span className="text-xs text-muted-foreground">{borrower.email}</span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
  },
  {
    accessorKey: 'address',
    header: 'Address',
  },
  {
    accessorKey: 'monthlyIncome',
    header: () => <div className="text-right">Monthly Income</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('monthlyIncome'));
      const formatted = formatCurrency(amount);

      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const borrower = row.original;
      return <BorrowerActions borrowerId={borrower.id} />;
    },
  },
];
