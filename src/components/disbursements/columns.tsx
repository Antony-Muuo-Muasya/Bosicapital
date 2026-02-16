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
  borrowerPhone: string;
  borrowerPhotoUrl?: string;
  loanProductName: string;
  repaymentCycle?: 'Weekly' | 'Monthly';
};

const LoanDisbursementActions = ({ loan }: { loan: LoanWithDetails }) => {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { userRole } = useUserProfile();

    const [isUpdating, setIsUpdating] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    
    const canDisburse = userRole?.id === 'admin' || userRole?.id === 'superadmin';

    const handleDisburseLoan = async () => {
      if(isUpdating || !canDisburse) return;

      setIsUpdating(true);
      const loanDocRef = doc(firestore, 'loans', loan.id);
      
      if (!loan.repaymentCycle) {
          toast({ variant: 'destructive', title: 'Error', description: 'Loan product details are missing.' });
          setIsUpdating(false);
          setIsAlertOpen(false);
          return;
      }

      try {
          const batch = writeBatch(firestore);
          const newIssueDate = new Date().toISOString().split('T')[0];

          batch.update(loanDocRef, { status: 'Active', issueDate: newIssueDate });

          const installmentsColRef = collection(firestore, 'loans', loan.id, 'installments');
          let currentDueDate = new Date(newIssueDate);

          const numberOfInstallments = loan.duration;
          
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
                  borrowerId: loan.borrowerId,
                  organizationId: loan.organizationId,
                  branchId: loan.branchId,
                  loanOfficerId: loan.loanOfficerId,
                  installmentNumber: i,
                  dueDate: currentDueDate.toISOString().split('T')[0],
                  expectedAmount: loan.installmentAmount,
                  paidAmount: 0,
                  status: 'Unpaid',
              };
              batch.set(installmentRef, newInstallmentData);
          }

          await batch.commit();
          toast({ title: 'Success', description: 'Loan has been disbursed and activated.' });

      } catch(err: any) {
          console.error("Failed to disburse loan:", err);
          const permissionError = new FirestorePermissionError({
              path: loanDocRef.path,
              operation: 'write', 
              requestResourceData: { status: 'Active', issueDate: new Date().toISOString().split('T')[0] }
          });
          errorEmitter.emit('permission-error', permissionError);

          toast({ variant: 'destructive', title: 'Error', description: 'Failed to disburse loan. Check permissions and data.' });
      } finally {
          setIsUpdating(false);
          setIsAlertOpen(false);
      }
    };
  
    return (
        <>
            <div className='flex items-center justify-end gap-2'>
                <Button
                    variant="default"
                    size="sm"
                    onClick={() => setIsAlertOpen(true)}
                    disabled={isUpdating || !canDisburse}
                >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Disburse
                </Button>
            </div>
             <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Loan Disbursement</AlertDialogTitle>
                        <AlertDialogDescription>
                            Have you already sent {formatCurrency(loan.principal)} to {loan.borrowerName} via your external payment system (e.g., bank transfer, mobile money)?
                            <br/><br/>
                            Clicking 'Yes, disburse' will activate this loan in the system and generate the repayment schedule. It does **not** transfer any money.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDisburseLoan} disabled={isUpdating}>
                            {isUpdating ? 'Processing...' : 'Yes, disburse'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
  };

export const getDisbursementColumns = (): ColumnDef<LoanWithDetails>[] => [
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
    header: 'Approval Date',
    cell: ({ row }) => {
        const date = row.getValue('issueDate') as string;
        return new Date(date).toLocaleDateString();
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const loan = row.original;
      return <LoanDisbursementActions loan={loan} />;
    },
  },
];
    

    
