'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Loan, User as AppUser } from '@/lib/types';
import { Input } from '../ui/input';

const editLoanSchema = z.object({
  status: z.enum(['Draft', 'Pending Approval', 'Approved', 'Active', 'Completed', 'Rejected']),
  principal: z.coerce.number().positive(),
  loanOfficerId: z.string().min(1, 'A loan officer must be assigned.'),
});

type EditLoanFormData = z.infer<typeof editLoanSchema>;

interface EditLoanDialogProps {
  loan: Loan;
  loanOfficers: AppUser[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditLoanDialog({ loan, loanOfficers, open, onOpenChange }: EditLoanDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditLoanFormData>({
    resolver: zodResolver(editLoanSchema),
    defaultValues: {
        status: loan.status,
        principal: loan.principal,
        loanOfficerId: loan.loanOfficerId,
    },
  });

  const onSubmit = async (values: EditLoanFormData) => {
    setIsSubmitting(true);
    const loanDocRef = doc(firestore, 'loans', loan.id);
    
    if (values.status === 'Completed' && loan.status !== 'Completed') {
        try {
            const batch = writeBatch(firestore);
            
            batch.update(loanDocRef, {
                status: 'Completed',
                principal: values.principal,
                loanOfficerId: values.loanOfficerId,
            });

            const installmentsColRef = collection(firestore, 'loans', loan.id, 'installments');
            const installmentsSnapshot = await getDocs(installmentsColRef);
            
            installmentsSnapshot.forEach(installmentDoc => {
                batch.update(installmentDoc.ref, { 
                    status: 'Paid',
                    paidAmount: installmentDoc.data().expectedAmount
                });
            });

            await batch.commit();

            toast({ title: 'Success', description: 'Loan marked as completed and all installments updated to paid.' });
            onOpenChange(false);

        } catch (err) {
            console.error('Error completing loan:', err);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not mark loan as completed. Check permissions.' });
        } finally {
            setIsSubmitting(false);
        }

    } else {
        const updates = {
            status: values.status,
            principal: values.principal,
            loanOfficerId: values.loanOfficerId,
        };

        if (values.principal !== loan.principal) {
            toast({
                title: 'Warning: Principal Changed',
                description: 'Installment amounts have not been automatically recalculated. Please do this manually if needed.',
                duration: 5000,
            });
        }

        updateDocumentNonBlocking(loanDocRef, updates)
        .then(() => {
            toast({ title: 'Success', description: 'Loan updated.' });
            onOpenChange(false);
        })
        .catch(err => {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update loan.' });
        })
        .finally(() => setIsSubmitting(false));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Loan</DialogTitle>
          <DialogDescription>
            Update details for loan #{loan.id.substring(0,8)}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="principal" render={({ field }) => (
                <FormItem>
                    <FormLabel>Principal</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
            <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select a status" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="Pending Approval">Pending Approval</SelectItem>
                        <SelectItem value="Approved">Approved</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
            </FormItem>
            )}/>
             <FormField control={form.control} name="loanOfficerId" render={({ field }) => (
              <FormItem>
                  <FormLabel>Loan Officer</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                          <SelectTrigger><SelectValue placeholder="Assign a loan officer" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                          {loanOfficers.map(officer => (
                              <SelectItem key={officer.id} value={officer.id}>{officer.fullName}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                  <FormMessage />
              </FormItem>
              )}/>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
