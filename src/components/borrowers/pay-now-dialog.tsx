'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Borrower, Loan } from '@/lib/types';

const paymentSchema = z.object({
  phone: z.string().min(10, 'Enter a valid phone number (e.g. 2547XXXXXXXX or 07XXXXXXXX).'),
  amount: z.coerce.number().positive('Amount must be positive.'),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PayNowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  borrower: Borrower;
  activeLoan: Loan;
  nextInstallmentAmount: number;
}

export function PayNowDialog({ open, onOpenChange, borrower, activeLoan, nextInstallmentAmount }: PayNowDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      phone: borrower.phone || '',
      amount: nextInstallmentAmount > 0 ? nextInstallmentAmount : 1000,
    },
  });

  const onSubmit = async (values: PaymentFormData) => {
    setIsSubmitting(true);

    // Generate a unique M-Pesa Transaction ID for simulation/verification
    const transId = `MPESA_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const transTime = new Date().toISOString().replace(/[-:T.]/g, '').substring(0, 14); // Format: YYYYMMDDHHMMSS

    const payload = {
      TransactionType: 'Pay Bill',
      TransID: transId,
      TransTime: transTime,
      TransAmount: values.amount.toString(),
      BusinessShortCode: '4159879',
      BillRefNumber: activeLoan.id, // Using loanId as BillRefNumber for matching
      MSISDN: values.phone.startsWith('0') ? '254' + values.phone.substring(1) : values.phone,
      FirstName: borrower.fullName.split(' ')[0] || 'Borrower',
      LastName: borrower.fullName.split(' ').slice(1).join(' ') || 'User',
    };

    // Determine function URL
    const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    const functionUrl = isLocal
      ? 'http://127.0.0.1:5001/studio-2397588411-6a237/us-central1/mpesaPaymentCallback'
      : 'https://us-central1-studio-2397588411-6a237.cloudfunctions.net/mpesaPaymentCallback';

    try {
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('HTTP network request failed');
      }

      const result = await response.json();

      if (result.ResultCode === 0) {
        toast({
          title: 'Payment Successful',
          description: `Transaction ${transId} has been confirmed. Your dashboard will update shortly.`,
        });
        onOpenChange(false);
      } else {
        toast({
          variant: 'destructive',
          title: 'Payment Validation Failed',
          description: result.ResultDesc || 'The transaction could not be verified.',
        });
      }
    } catch (error) {
      console.error('Error validating payment:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to connect to the payment verification gateway. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Simulate M-Pesa Payment</DialogTitle>
          <DialogDescription>
            Submit your payment details. This triggers the validation and confirmation process.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>M-Pesa Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 254712345678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (KES)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md space-y-1">
              <p><strong>Account / Ref No:</strong> {activeLoan.id}</p>
              <p><strong>Business Shortcode:</strong> 4159879</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
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
