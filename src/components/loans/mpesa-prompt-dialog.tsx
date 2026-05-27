'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Phone, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';

interface MpesaPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loanId: string;
  borrowerName: string;
  phone: string;
  amount: number;
  nationalId?: string;
}

export function MpesaPromptDialog({ open, onOpenChange, loanId, borrowerName, phone, amount, nationalId }: MpesaPromptDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customPhone, setCustomPhone] = useState(phone);
  const [customAmount, setCustomAmount] = useState(amount.toString());

  const handleSendPrompt = async () => {
    if (!customPhone || !customAmount) {
        toast({ variant: 'destructive', title: 'Error', description: 'Phone and amount are required.' });
        return;
    }
    
    setIsSubmitting(true);
    try {
        const res = await fetch("/api/payments/stk-push", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                phone: customPhone, 
                amount: customAmount, 
                loanId, 
                nationalId 
            })
        });
        
        const data = await res.json();
        
        if (data.success) {
            toast({ 
                title: 'STK Push Sent', 
                description: `Sent KES ${customAmount} prompt to ${customPhone}. Please wait for borrower to confirm.` 
            });
            onOpenChange(false);
        } else {
            throw new Error(data.error || 'Failed to send prompt');
        }
    } catch (error: any) {
        toast({ 
            variant: 'destructive', 
            title: 'Error', 
            description: error.message 
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Prompt M-Pesa Payment</DialogTitle>
          <DialogDescription>
            This will send an STK Push to {borrowerName}&apos;s phone.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
            <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                    <Phone className="h-3 w-3" /> Phone Number
                </label>
                <Input 
                    placeholder="2547XXXXXXXX" 
                    value={customPhone} 
                    onChange={(e) => setCustomPhone(e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                    <Wallet className="h-3 w-3" /> Amount (KES)
                </label>
                <Input 
                    type="number"
                    value={customAmount} 
                    onChange={(e) => setCustomAmount(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground italic">
                    Default amount: {formatCurrency(amount)}
                </p>
            </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSendPrompt} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Sending...' : 'Send Prompt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
