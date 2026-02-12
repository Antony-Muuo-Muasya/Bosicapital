'use client';

import type { Loan } from '@/lib/types';
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
import { useUserProfile } from '@/firebase';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { useRouter } from 'next/navigation';

type LoanWithDetails = Loan & {
  borrowerName: string;
  borrowerPhotoUrl?: string;
  loanProductName: string;
};


const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Pending Approval': return 'secondary';
      case 'Active': return 'default';
      case 'Completed': return 'outline';
      case 'Rejected': return 'destructive';
      default: return 'outline';
    }
  };

const LoanActions = ({ loan, onEdit }: { loan: LoanWithDetails, onEdit: (loan: LoanWithDetails) => void }) => {
  const { userRole } = useUserProfile();
  const router = useRouter();

  const handleDelete = () => {
    alert('For data integrity, loans cannot be deleted. Consider rejecting or archiving instead.');
  };

  const canManage = userRole?.id === 'admin' || userRole?.id === 'manager';

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
        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(loan.id)}>
          Copy loan ID
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push(`/loans/${loan.id}`)}>
            View Details
        </DropdownMenuItem>
        {canManage && <DropdownMenuItem onClick={() => onEdit(loan)}>Edit Loan</DropdownMenuItem>}
        {userRole?.id === 'admin' && (
             <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                Delete Loan
             </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const getColumns = (onEdit: (loan: LoanWithDetails) => void): ColumnDef<LoanWithDetails>[] => [
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
    accessorKey: 'principal',
    header: () => <div className="text-right">Principal</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('principal'));
      return <div className="text-right font-medium">{formatCurrency(amount, 'KES')}</div>;
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return (
          <Badge variant={getStatusVariant(status)} className="capitalize">
            {status}
          </Badge>
        );
      },
  },
  {
    accessorKey: 'issueDate',
    header: 'Issue Date',
    cell: ({ row }) => {
        const date = row.getValue('issueDate') as string;
        return new Date(date).toLocaleDateString();
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const loan = row.original;
      return <LoanActions loan={loan} onEdit={onEdit} />;
    },
  },
];
