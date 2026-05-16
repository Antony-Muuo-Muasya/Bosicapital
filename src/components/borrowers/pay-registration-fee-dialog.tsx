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
import { useUserProfile } from '@/providers/user-profile';
import { payRegistrationFee } from '@/actions/borrowers';
import { Loader2, Smartphone } from 'lucide-react';
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
  const { user, userProfile } = useUserProfile();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const registrationFeeAmount = borrower.registrationFeeAmount ?? 500;

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
        paymentMethod: 'Mobile Money',
        reference: '',
    }
  });

  const [isStkSubmitting, setIsStkSubmitting] = useState(false);

  const handleStkPush = async () => {
    if (!borrower) return;
    setIsStkSubmitting(true);
    try {
        const res = await fetch("/api/payments/stk-push", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                phone: borrower.phone, 
                amount: registrationFeeAmount, 
                loanId: `REG-${borrower.id}`, // Pseudo-loanId for matching
                nationalId: borrower.nationalId 
            })
        });
        const data = await res.json();
        if (data.success) {
            toast({ title: 'STK Push Sent', description: 'Please ask the borrower to confirm on their phone.' });
        } else {
            throw new Error(data.error);
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
        setIsStkSubmitting(false);
    }
  };

  const onSubmit = async (values: PaymentFormData) => {
    if (!user || !userProfile || !borrower) {
        toast({ variant: 'destructive', title: 'Error', description: 'Required information is missing.' });
        return;
    }
    setIsSubmitting(true);

    try {
        const res = await payRegistrationFee({
            organizationId: userProfile.organizationId,
            borrowerId: borrower.id,
            amount: registrationFeeAmount,
            paymentMethod: values.paymentMethod,
            reference: values.reference,
            collectedBy: user.id,
        });

        if (!res.success) {
            throw new Error(res.error);
        }

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
        <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 mb-4">
            <h4 className="text-sm font-bold flex items-center gap-2 mb-1">
                <Smartphone className="h-4 w-4 text-primary" />
                M-Pesa STK Push
            </h4>
            <p className="text-xs text-muted-foreground mb-3">
                Send a payment request directly to the borrower&apos;s phone ({borrower.phone}).
            </p>
            <Button 
                type="button" 
                className="w-full" 
                variant="secondary"
                disabled={isStkSubmitting}
                onClick={handleStkPush}
            >
                {isStkSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isStkSubmitting ? 'Sending Push...' : 'Send STK Push Prompt'}
            </Button>
        </div>

        <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <span className="relative bg-background px-2 text-[10px] uppercase text-muted-foreground font-bold italic">OR RECORD MANUALLY</span>
        </div>

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
                                <SelectItem value="Mobile Money">Mobile Money (M-Pesa)</SelectItem>
                                <SelectItem value="Cash">Cash</SelectItem>
                                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
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
                        Record Manually
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
