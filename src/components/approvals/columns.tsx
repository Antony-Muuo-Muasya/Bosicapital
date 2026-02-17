'use client';
import { useState } from 'react';
import type { Loan } from '@/lib/types';
import { ColumnDef } from '@tanstack/react-table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '../ui/button';
import { CheckCircle, XCircle, Eye } from 'lucide-react';
import { useFirestore, updateDocumentNonBlocking, useUserProfile } from '@/firebase';
import { doc } from 'firebase/firestore';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import Image from 'next/image';


type LoanWithDetails = Loan & {
  borrowerName: string;
  borrowerPhotoUrl?: string;
  businessPhotoUrl?: string;
  homeAssetsPhotoUrl?: string;
  loanProductName: string;
  repaymentCycle?: 'Weekly' | 'Monthly';
};

const LoanApprovalActions = ({ loan }: { loan: LoanWithDetails }) => {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { user, userRole } = useUserProfile();

    const [isUpdating, setIsUpdating] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [actionToConfirm, setActionToConfirm] = useState<'Approved' | 'Rejected' | null>(null);

    const canApprove = userRole?.id === 'manager' || userRole?.id === 'superadmin';

    const handleActionConfirmation = (status: 'Approved' | 'Rejected') => {
        setActionToConfirm(status);
        setIsAlertOpen(true);
    };
  
    const handleUpdateStatus = async () => {
      if(isUpdating || !actionToConfirm || !canApprove || !user) return;

      setIsUpdating(true);
      const loanDocRef = doc(firestore, 'loans', loan.id);
      
      const resetState = () => {
        setIsUpdating(false);
        setIsAlertOpen(false);
        setActionToConfirm(null);
      }

      if (actionToConfirm === 'Rejected') {
          updateDocumentNonBlocking(loanDocRef, { status: 'Rejected' })
            .then(() => {
              toast({ title: 'Success', description: `Loan has been rejected.` });
            })
            .catch(() => {
              toast({ variant: 'destructive', title: 'Error', description: 'Failed to reject loan.' });
            })
            .finally(resetState);
          return;
      }

      if (actionToConfirm === 'Approved') {
          updateDocumentNonBlocking(loanDocRef, { status: 'Approved', approvedById: user.uid })
            .then(() => {
              toast({ title: 'Success', description: 'Loan approved and sent for disbursement.' });
            })
            .catch(() => {
              toast({ variant: 'destructive', title: 'Error', description: 'Failed to approve loan.' });
            })
            .finally(resetState);
          return;
      }
    };
  
    return (
        <>
            <div className='flex items-center justify-end gap-2'>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                            <Eye className="mr-2 h-4 w-4" />
                            Photos
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-4xl">
                        <DialogHeader>
                            <DialogTitle>Supporting Photos for {loan.borrowerName}</DialogTitle>
                            <DialogDescription>
                                Photos of the business and home assets provided during onboarding.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                            <div className="space-y-2">
                                <h3 className="font-semibold text-center">Business Photo</h3>
                                <div className="border rounded-md p-2 h-80 flex items-center justify-center bg-muted/50">
                                    {loan.businessPhotoUrl ? (
                                        <Image src={loan.businessPhotoUrl} alt="Business" width={500} height={500} className="max-h-full w-auto object-contain rounded-md"/>
                                    ) : <p className="text-muted-foreground">No photo provided.</p>}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-semibold text-center">Home Assets Photo</h3>
                                <div className="border rounded-md p-2 h-80 flex items-center justify-center bg-muted/50">
                                    {loan.homeAssetsPhotoUrl ? (
                                        <Image src={loan.homeAssetsPhotoUrl} alt="Home Assets" width={500} height={500} className="max-h-full w-auto object-contain rounded-md" />
                                    ) : <p className="text-muted-foreground">No photo provided.</p>}
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleActionConfirmation('Approved')}
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
                            {actionToConfirm === 'Approved'
                                ? 'This will approve the loan and forward it to an administrator for final disbursement.'
                                : 'This will reject the loan application. This action cannot be undone.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setActionToConfirm(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleUpdateStatus} disabled={isUpdating}>
                            {isUpdating ? 'Processing...' : (actionToConfirm === 'Approved' ? 'Yes, approve' : 'Yes, reject')}
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
