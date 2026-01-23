'use client';
import { useState } from 'react';
import type { Loan } from '@/lib/types';
import { ColumnDef } from '@tanstack/react-table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '../ui/button';
import { CheckCircle, XCircle } from 'lucide-react';
import { useFirestore, updateDocumentNonBlocking, useUserProfile, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, writeBatch, collection } from 'firebase/firestore';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { add } from 'date-fns';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';


type LoanWithDetails = Loan & {
  borrowerName: string;
  borrowerPhotoUrl?: string;
  loanProductName: string;
  repaymentCycle?: 'Weekly' | 'Monthly';
};

const LoanApprovalActions = ({ loan }: { loan: LoanWithDetails }) => {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { userRole } = useUserProfile();

    const [isUpdating, setIsUpdating] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [actionToConfirm, setActionToConfirm] = useState<'Active' | 'Rejected' | null>(null);

    const canApprove = userRole?.id === 'admin';

    const handleActionConfirmation = (status: 'Active' | 'Rejected') => {
        setActionToConfirm(status);
        setIsAlertOpen(true);
    };
  
    const handleUpdateStatus = async () => {
      if(isUpdating || !actionToConfirm || !canApprove) return;

      setIsUpdating(true);
      const loanDocRef = doc(firestore, 'loans', loan.id);
      
      if (actionToConfirm === 'Rejected') {
          updateDocumentNonBlocking(loanDocRef, { status: 'Rejected' })
            .then(() => {
              toast({ title: 'Success', description: `Loan has been rejected.` });
            })
            .catch((err: any) => {
              // The non-blocking function already emits a detailed error.
              // We just show a simple toast here.
              toast({ variant: 'destructive', title: 'Error', description: 'Failed to reject loan.' });
            })
            .finally(() => {
                setIsUpdating(false);
                setIsAlertOpen(false);
                setActionToConfirm(null);
            });
          return;
      }

      if (actionToConfirm === 'Active') {
          if (!loan.repaymentCycle) {
              toast({ variant: 'destructive', title: 'Error', description: 'Loan product details are missing.' });
              setIsUpdating(false);
              setIsAlertOpen(false);
              setActionToConfirm(null);
              return;
          }
          try {
              const batch = writeBatch(firestore);
              const newIssueDate = new Date().toISOString().split('T')[0];

              batch.update(loanDocRef, { status: 'Active', issueDate: newIssueDate });

              const installmentsColRef = collection(firestore, 'loans', loan.id, 'installments');
              let currentDueDate = new Date(newIssueDate);

              const numberOfInstallments = loan.repaymentCycle === 'Weekly' ? loan.duration * 4 : loan.duration;

              for (let i = 1; i <= numberOfInstallments; i++) {
                  const installmentRef = doc(installmentsColRef);
                  if (loan.repaymentCycle === 'Monthly') {
                      currentDueDate = add(currentDueDate, { months: 1 });
                  } else {
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
              // Emit a contextual error for better debugging in the dev overlay
              const permissionError = new FirestorePermissionError({
                  path: loanDocRef.path,
                  operation: 'write', // 'write' covers batch operations
                  requestResourceData: { status: 'Active', issueDate: new Date().toISOString().split('T')[0] }
              });
              errorEmitter.emit('permission-error', permissionError);

              toast({ variant: 'destructive', title: 'Error', description: 'Failed to approve loan. Check permissions and data.' });
          } finally {
              setIsUpdating(false);
              setIsAlertOpen(false);
              setActionToConfirm(null);
          }
      }
    };
  
    return (
        <>
            <div className='flex items-center justify-end gap-2'>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleActionConfirmation('Active')}
                    disabled={isUpdating || !canApprove}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleActionConfirmation('Rejected')}
                    disabled={isUpdating || !canApprove}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                </Button>
            </div>
             <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {actionToConfirm === 'Active'
                                ? 'This will approve the loan and generate the repayment schedule.'
                                : 'This will reject the loan application. This action cannot be undone.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setActionToConfirm(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleUpdateStatus} disabled={isUpdating}>
                            {isUpdating ? 'Processing...' : (actionToConfirm === 'Active' ? 'Yes, approve' : 'Yes, reject')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
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
