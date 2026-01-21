'use client';

import { useState } from 'react';
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
import { useFirestore, useUserProfile, errorEmitter, FirestorePermissionError } from '@/firebase';
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
import type { Borrower } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

const paymentSchema = z.object({
  paymentMethod: z.enum(['Cash', 'Bank Transfer', 'Mobile Money']),
  reference: z.string().min(1, 'Payment reference is required.'),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PayRegistrationFeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  borrower: Borrower;
}

export function PayRegistrationFeeDialog({ open, onOpenChange, borrower }: PayRegistrationFeeDialogProps) {
  const firestore = useFirestore();
  const { user, userProfile } = useUserProfile();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const registrationFeeAmount = borrower.registrationFeeAmount ?? 800;

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
        paymentMethod: 'Cash',
        reference: '',
    }
  });

  const onSubmit = async (values: PaymentFormData) => {
    if (!user || !firestore || !userProfile || !borrower) {
        toast({ variant: 'destructive', title: 'Error', description: 'Required information is missing.' });
        return;
    }
    setIsSubmitting(true);

    try {
        const batch = writeBatch(firestore);

        // 1. Create RegistrationPayment Document
        const paymentRef = doc(collection(firestore, 'registrationPayments'));
        const paymentData = {
            id: paymentRef.id,
            organizationId: userProfile.organizationId,
            borrowerId: borrower.id,
            amount: registrationFeeAmount,
            currency: 'KES',
            paymentMethod: values.paymentMethod,
            reference: values.reference,
            collectedBy: user.uid,
            createdAt: new Date().toISOString(),
            status: 'confirmed',
        };
        batch.set(paymentRef, paymentData);

        // 2. Update Borrower Document
        const borrowerRef = doc(firestore, 'borrowers', borrower.id);
        batch.update(borrowerRef, {
            registrationFeePaid: true,
            registrationFeePaidAt: new Date().toISOString(),
            registrationPaymentId: paymentRef.id,
        });
        
        // 3. Create Audit Log
        const auditLogRef = doc(collection(firestore, 'auditLogs'));
        const auditData = {
            id: auditLogRef.id,
            action: 'REGISTRATION_FEE_PAID',
            performedBy: user.uid,
            targetUserId: borrower.id, // Re-using targetUserId for borrower context
            organizationId: userProfile.organizationId,
            timestamp: new Date().toISOString(),
            details: { amount: registrationFeeAmount, borrowerName: borrower.fullName }
        };
        batch.set(auditLogRef, auditData);

        await batch.commit();

        toast({ title: 'Success', description: 'Registration fee paid successfully.' });
        form.reset();
        onOpenChange(false);

    } catch (error) {
        console.error("Error processing registration fee:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to process payment. Check permissions.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Registration Fee</DialogTitle>
          <DialogDescription>
            Record payment for {borrower.fullName}. Amount: {formatCurrency(registrationFeeAmount, 'KES')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Payment Method</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Cash">Cash</SelectItem>
                                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="reference" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Reference</FormLabel>
                        <FormControl><Input placeholder="Receipt or Transaction ID" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Payment
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
