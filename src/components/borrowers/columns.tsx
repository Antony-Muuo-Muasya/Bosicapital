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
import { useFirestore, deleteDocumentNonBlocking, useUserProfile } from '@/firebase';
import { doc } from 'firebase/firestore';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '../ui/badge';

const BorrowerActions = ({ borrower, onRecordPayment, onEditBorrower }: { borrower: Borrower, onRecordPayment: (borrower: Borrower) => void, onEditBorrower: (borrower: Borrower) => void }) => {
  const firestore = useFirestore();
  const { userRole } = useUserProfile();
  const canDelete = userRole?.id === 'admin';
  const canEdit = userRole?.id === 'admin' || userRole?.id === 'manager' || userRole?.id === 'loan_officer';


  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this borrower?')) {
      const borrowerDocRef = doc(firestore, 'borrowers', borrower.id);
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
        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(borrower.id)}>
          Copy borrower ID
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {!borrower.registrationFeePaid && userRole?.id !== 'user' && (
          <DropdownMenuItem onClick={() => onRecordPayment(borrower)}>
            Record Payment
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => onEditBorrower(borrower)} disabled={!canEdit}>Edit Borrower</DropdownMenuItem>
        <DropdownMenuItem onClick={handleDelete} className="text-destructive" disabled={!canDelete}>
          Delete Borrower
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const getBorrowerColumns = (onRecordPayment: (borrower: Borrower) => void, onEditBorrower: (borrower: Borrower) => void): ColumnDef<Borrower>[] => [
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
    accessorKey: 'registrationFeePaid',
    header: 'Registration',
    cell: ({ row }) => {
      const isPaid = row.getValue('registrationFeePaid') as boolean;
      return (
        <Badge variant={isPaid ? 'default' : 'destructive'} className={isPaid ? 'bg-green-500/20 text-green-700 border-green-500/30 hover:bg-green-500/30' : ''}>
          {isPaid ? 'Registered' : 'Fee Due'}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
        if (value === null) return true;
        return row.getValue(id) === (value === 'true');
    }
  },
  {
    accessorKey: 'monthlyIncome',
    header: () => <div className="text-right">Monthly Income</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('monthlyIncome'));
      const formatted = formatCurrency(amount, 'KES');

      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const borrower = row.original;
      return <BorrowerActions borrower={borrower} onRecordPayment={onRecordPayment} onEditBorrower={onEditBorrower} />;
    },
  },
];
