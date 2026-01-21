'use client';
import { useState } from 'react';
import type { Loan } from '@/lib/types';
import { ColumnDef } from '@tanstack/react-table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '../ui/button';
import { CheckCircle, XCircle } from 'lucide-react';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc, writeBatch, collection } from 'firebase/firestore';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { add } from 'date-fns';

type LoanWithDetails = Loan & {
  borrowerName: string;
  borrowerPhotoUrl?: string;
  loanProductName: string;
  repaymentCycle?: 'Weekly' | 'Monthly';
};

const LoanApprovalActions = ({ loan }: { loan: LoanWithDetails }) => {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isUpdating, setIsUpdating] = useState(false);
  
    const handleUpdateStatus = async (status: 'Active' | 'Rejected') => {
      if(isUpdating) return;

      const confirmationText = status === 'Active'
      ? 'Are you sure you want to approve this loan?'
      : 'Are you sure you want to reject this loan? This action cannot be undone.';
      
      if (confirm(confirmationText)) {
        setIsUpdating(true);
        const loanDocRef = doc(firestore, 'loans', loan.id);
        
        if (status === 'Rejected') {
            updateDocumentNonBlocking(loanDocRef, { status })
              .then(() => {
                toast({ title: 'Success', description: `Loan has been rejected.` });
              })
              .catch((err: any) => {
                toast({ variant: 'destructive', title: 'Error', description: err.message });
              })
              .finally(() => setIsUpdating(false));
            return;
        }

        // Approve loan
        if (status === 'Active') {
            if (!loan.repaymentCycle) {
                toast({ variant: 'destructive', title: 'Error', description: 'Loan product details are missing.' });
                setIsUpdating(false);
                return;
            }
            try {
                const batch = writeBatch(firestore);
                const newIssueDate = new Date().toISOString().split('T')[0];

                // 1. Update loan status and issue date
                batch.update(loanDocRef, { status: 'Active', issueDate: newIssueDate });

                // 2. Create installments
                const installmentsColRef = collection(firestore, 'loans', loan.id, 'installments');
                let currentDueDate = new Date(newIssueDate);

                for (let i = 1; i <= loan.duration; i++) {
                    const installmentRef = doc(installmentsColRef);
                    if (loan.repaymentCycle === 'Monthly') {
                        currentDueDate = add(currentDueDate, { months: 1 });
                    } else { // Weekly
                        currentDueDate = add(currentDueDate, { weeks: 1 });
                    }

                    const newInstallmentData = {
                        id: installmentRef.id,
                        loanId: loan.id,
                        installmentNumber: i,
                        dueDate: currentDueDate.toISOString().split('T')[0],
                        expectedAmount: loan.installmentAmount,
                        paidAmount: 0,
                        status: 'Unpaid',
                    };
                    batch.set(installmentRef, newInstallmentData);
                }

                await batch.commit();
                toast({ title: 'Success', description: 'Loan has been approved and activated.' });

            } catch(err: any) {
                console.error("Failed to approve loan:", err);
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to approve loan. Check permissions and data.' });
            } finally {
                setIsUpdating(false);
            }
        }
      } else {
        // User cancelled the action
        setIsUpdating(false);
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
