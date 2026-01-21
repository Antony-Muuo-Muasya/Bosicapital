'use client';

import { useState, useEffect } from 'react';
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
import { useFirestore, useUser, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { Borrower, LoanProduct } from '@/lib/types';
import { add } from 'date-fns';


const loanSchema = z.object({
  borrowerId: z.string().min(1, 'Please select a borrower.'),
  loanProductId: z.string().min(1, 'Please select a loan product.'),
  principal: z.coerce.number().positive('Principal must be a positive number.'),
});

type LoanFormData = z.infer<typeof loanSchema>;

interface AddLoanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  borrowers: Borrower[];
  loanProducts: LoanProduct[];
}

export function AddLoanDialog({ open, onOpenChange, borrowers, loanProducts }: AddLoanDialogProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoanFormData>({
    resolver: zodResolver(loanSchema),
  });

  const selectedProductId = form.watch('principal');
  const selectedProduct = loanProducts.find(p => p.id === form.watch('loanProductId'));
  
  useEffect(() => {
    const principal = form.watch('principal');
    if (selectedProduct && (principal < selectedProduct.minAmount || principal > selectedProduct.maxAmount)) {
      form.setError('principal', {
        type: 'manual',
        message: `Amount must be between ${selectedProduct.minAmount} and ${selectedProduct.maxAmount}`,
      });
    } else {
      form.clearErrors('principal');
    }
  }, [form, selectedProduct]);


  const onSubmit = async (values: LoanFormData) => {
    if (!user || !firestore || !selectedProduct) {
        toast({ variant: 'destructive', title: 'Error', description: 'Missing required information.' });
        return;
    }
    setIsSubmitting(true);

    try {
        const batch = writeBatch(firestore);

        // 1. Create Loan Document
        const loanRef = doc(collection(firestore, 'loans'));
        const interest = values.principal * (selectedProduct.interestRate / 100);
        const totalPayable = values.principal + interest;
        const installmentAmount = totalPayable / selectedProduct.duration;

        const newLoanData = {
          id: loanRef.id,
          borrowerId: values.borrowerId,
          loanProductId: values.loanProductId,
          principal: values.principal,
          interestRate: selectedProduct.interestRate,
          duration: selectedProduct.duration,
          totalPayable: totalPayable,
          installmentAmount: installmentAmount,
          issueDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
          status: 'Active',
          loanOfficerId: user.uid,
          branchId: 'branch-1', // Hardcoded for now
        };
        batch.set(loanRef, newLoanData);

        // 2. Create Installment Documents
        const installmentsColRef = collection(firestore, 'loans', loanRef.id, 'installments');
        let currentDueDate = new Date();

        for (let i = 1; i <= selectedProduct.duration; i++) {
            const installmentRef = doc(installmentsColRef);

            if (selectedProduct.repaymentCycle === 'Monthly') {
                currentDueDate = add(currentDueDate, { months: 1 });
            } else { // Weekly
                currentDueDate = add(currentDueDate, { weeks: 1 });
            }

            const newInstallmentData = {
                id: installmentRef.id,
                loanId: loanRef.id,
                installmentNumber: i,
                dueDate: currentDueDate.toISOString().split('T')[0],
                expectedAmount: installmentAmount,
                paidAmount: 0,
                status: 'Unpaid',
            };
            batch.set(installmentRef, newInstallmentData);
        }
        
        await batch.commit();

        toast({ title: 'Success', description: 'Loan and installments created successfully.' });
        form.reset();
        onOpenChange(false);

    } catch (error) {
        console.error("Error creating loan:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to create loan.' });
        // The permission error will be caught by the global handler
    } finally {
        setIsSubmitting(false);
    }
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
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="borrowerId" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Borrower</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select a borrower" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {borrowers.map(b => <SelectItem key={b.id} value={b.id}>{b.fullName}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="loanProductId" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Loan Product</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        <FormLabel>Principal Amount (USD)</FormLabel>
                        <FormControl><Input type="number" placeholder="1000" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                
                {selectedProduct && (
                    <div className="text-sm text-muted-foreground space-y-1 rounded-md bg-muted p-3">
                       <p>Interest Rate: <strong>{selectedProduct.interestRate}%</strong></p>
                       <p>Duration: <strong>{selectedProduct.duration} months</strong></p>
                       <p>Total Payable: <strong>{formatCurrency((form.getValues('principal') || 0) * (1 + selectedProduct.interestRate / 100))}</strong></p>
                       <p>Monthly Installment: <strong>{formatCurrency(((form.getValues('principal') || 0) * (1 + selectedProduct.interestRate / 100)) / selectedProduct.duration)}</strong></p>
                    </div>
                )}

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting || !selectedProduct}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Loan
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}
