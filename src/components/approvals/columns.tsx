'use client';
import { useState } from 'react';
import type { Loan } from '@/lib/types';
import { ColumnDef } from '@tanstack/react-table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '../ui/button';
import { CheckCircle, XCircle, MoreHorizontal } from 'lucide-react';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
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

type LoanWithDetails = Loan & {
  borrowerName: string;
  borrowerPhotoUrl?: string;
  loanProductName: string;
};

const LoanApprovalActions = ({ loan }: { loan: LoanWithDetails }) => {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isUpdating, setIsUpdating] = useState(false);
  
    const handleUpdateStatus = (status: 'Active' | 'Rejected') => {
      if(isUpdating) return;

      const confirmationText = status === 'Active'
      ? 'Are you sure you want to approve this loan?'
      : 'Are you sure you want to reject this loan? This action cannot be undone.';
      
      if (confirm(confirmationText)) {
        setIsUpdating(true);
        const loanDocRef = doc(firestore, 'loans', loan.id);
        updateDocumentNonBlocking(loanDocRef, { status })
          .then(() => {
            toast({ title: 'Success', description: `Loan has been ${status.toLowerCase()}.` });
          })
          .catch((err: any) => {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
          })
          .finally(() => setIsUpdating(false));
      }
    };
  
    return (
        <div className='flex items-center justify-end gap-2'>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => handleUpdateStatus('Active')}
                disabled={isUpdating}
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
            >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => handleUpdateStatus('Rejected')}
                disabled={isUpdating}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
            </Button>
      </div>
    );
  };

export const getApprovalColumns = (): ColumnDef<LoanWithDetails>[] => [
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
      return <div className="text-right font-medium">{formatCurrency(amount)}</div>;
    },
  },
  {
    accessorKey: 'issueDate',
    header: 'Request Date',
    cell: ({ row }) => {
        const date = row.getValue('issueDate') as string;
        return new Date(date).toLocaleDateString();
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const loan = row.original;
      return <LoanApprovalActions loan={loan} />;
    },
  },
];
