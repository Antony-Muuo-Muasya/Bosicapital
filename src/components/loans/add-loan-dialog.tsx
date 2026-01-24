'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFirestore, useUserProfile, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { Borrower, LoanProduct } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';


const loanSchema = z.object({
  borrowerId: z.string().min(1, 'Please select a borrower.'),
  loanProductId: z.string().min(1, 'Please select a loan product.'),
  principal: z.coerce.number().positive('Principal must be a positive number.').max(1000000, 'Principal cannot exceed 1,000,000.'),
});

type LoanFormData = z.infer<typeof loanSchema>;

interface AddLoanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  borrowers: Borrower[];
  loanProducts: LoanProduct[];
  isLoading: boolean;
}

export function AddLoanDialog({ open, onOpenChange, borrowers, loanProducts, isLoading }: AddLoanDialogProps) {
  const firestore = useFirestore();
  const { user, userProfile } = useUserProfile();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoanFormData>({
    resolver: zodResolver(loanSchema),
    defaultValues: {
      borrowerId: '',
      loanProductId: '',
      principal: 0,
    }
  });

  const selectedProductId = form.watch('loanProductId');
  const selectedProduct = loanProducts.find(p => p.id === selectedProductId);
  
  const eligibleBorrowers = useMemo(() => {
    return borrowers.filter(b => b.registrationFeePaid);
  }, [borrowers]);


  useEffect(() => {
    const principalValue = form.getValues('principal');
    if (selectedProduct && principalValue > 0) {
      if (principalValue > selectedProduct.maxAmount || principalValue < selectedProduct.minAmount) {
        form.setError('principal', {
          type: 'manual',
          message: `Amount must be between ${formatCurrency(selectedProduct.minAmount, 'KES')} and ${formatCurrency(selectedProduct.maxAmount, 'KES')}`,
        });
      } else {
        form.clearErrors('principal');
      }
    }
  }, [form.watch('principal'), selectedProduct, form]);


  const onSubmit = async (values: LoanFormData) => {
    if (!user || !firestore || !selectedProduct || !userProfile) {
        toast({ variant: 'destructive', title: 'Error', description: 'Missing required information.' });
        return;
    }
    setIsSubmitting(true);

    const loanRef = doc(collection(firestore, 'loans'));
    const interest = values.principal * (selectedProduct.interestRate / 100);
    const totalPayable = values.principal + interest;
    
    const numberOfInstallments = selectedProduct.repaymentCycle === 'Weekly'
        ? selectedProduct.duration * 4 // Simple assumption
        : selectedProduct.duration;
    const installmentAmount = totalPayable / numberOfInstallments;

    const newLoanData = {
      id: loanRef.id,
      organizationId: userProfile.organizationId,
      borrowerId: values.borrowerId,
      loanProductId: values.loanProductId,
      principal: values.principal,
      interestRate: selectedProduct.interestRate,
      duration: selectedProduct.duration,
      totalPayable: totalPayable,
      installmentAmount: installmentAmount,
      issueDate: new Date().toISOString().split('T')[0], // This is the request date
      status: 'Pending Approval',
      loanOfficerId: user.uid,
      branchId: userProfile.branchIds[0] || 'branch-1',
    };
    
    setDocumentNonBlocking(loanRef, newLoanData, { merge: false })
      .then(() => {
        toast({ title: 'Success', description: 'Loan submitted for approval.' });
        form.reset();
        onOpenChange(false);
      })
      .catch((err) => {
          console.error("Error creating loan:", err);
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit loan for approval.' });
      })
      .finally(() => {
          setIsSubmitting(false);
      });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Loan</DialogTitle>
          <DialogDescription>
            Select a borrower, loan product, and enter the principal amount.
          </DialogDescription>
        </DialogHeader>
        {eligibleBorrowers.length === 0 && !isLoading && (
             <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>No Eligible Borrowers</AlertTitle>
                <AlertDescription>
                There are no registered borrowers available to receive a loan. Please ensure borrowers have paid their registration fee.
                </AlertDescription>
            </Alert>
        )}
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="borrowerId" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Borrower</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading || eligibleBorrowers.length === 0}>
                            <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select a registered borrower" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {eligibleBorrowers.map(b => <SelectItem key={b.id} value={b.id}>{b.fullName}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="loanProductId" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Loan Product</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading || loanProducts.length === 0}>
                            <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select a loan product" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {loanProducts.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="principal" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Principal Amount (KES)</FormLabel>
                        <FormControl><Input type="number" placeholder="50000" {...field} disabled={!selectedProductId} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                
                {selectedProduct && form.getValues('principal') > 0 && !form.formState.errors.principal && (
                    <div className="text-sm text-muted-foreground space-y-1 rounded-md bg-muted p-3">
                       <p>Interest Rate: <strong>{selectedProduct.interestRate}%</strong></p>
                       <p>Total Payable: <strong>{formatCurrency(form.getValues('principal') * (1 + selectedProduct.interestRate / 100), 'KES')}</strong></p>
                    </div>
                )}

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting || !selectedProduct || isLoading || eligibleBorrowers.length === 0}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit for Approval
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
