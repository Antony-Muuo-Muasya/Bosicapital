'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFirestore, useUserProfile, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const productSchema = z.object({
  name: z.string().min(3, 'Product name is required.'),
  category: z.string().min(3, 'Category is required.'),
  minAmount: z.coerce.number().positive('Must be a positive number.'),
  maxAmount: z.coerce.number().positive('Must be a positive number.'),
  duration: z.coerce.number().int().positive('Duration must be a positive integer.'),
  repaymentCycle: z.enum(['Weekly', 'Monthly']),
});

type ProductFormData = z.infer<typeof productSchema>;

interface AddLoanProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddLoanProductDialog({ open, onOpenChange }: AddLoanProductDialogProps) {
  const firestore = useFirestore();
  const { userProfile } = useUserProfile();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      category: '',
      minAmount: 0,
      maxAmount: 0,
      duration: 0,
      repaymentCycle: 'Monthly',
    },
  });

  const onSubmit = (values: ProductFormData) => {
    if (!userProfile || !firestore) return;
    setIsSubmitting(true);

    const newProductRef = doc(collection(firestore, 'loanProducts'));
    const newProductData = {
      ...values,
      id: newProductRef.id,
      organizationId: userProfile.organizationId,
      interestRate: 25, // Business rule: interest is always fixed at 25%
    };

    setDocumentNonBlocking(newProductRef, newProductData, { merge: false })
      .then(() => {
        toast({ title: 'Success', description: 'Loan product created.' });
        form.reset();
        onOpenChange(false);
      })
      .catch(err => {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not create product.' });
      })
      .finally(() => setIsSubmitting(false));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Loan Product</DialogTitle>
          <DialogDescription>
            Define a new loan product that can be assigned to borrowers. The interest rate is fixed at 25%.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name</FormLabel>
                  <FormControl><Input placeholder="e.g., Small Business Loan" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl><Input placeholder="e.g., Business" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="minAmount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Min Amount (KES)</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="maxAmount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Amount (KES)</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="duration" render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (in installments)</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
               <FormField control={form.control} name="repaymentCycle" render={({ field }) => (
                <FormItem>
                    <FormLabel>Repayment Cycle</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select cycle" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="Weekly">Weekly</SelectItem>
                            <SelectItem value="Monthly">Monthly</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )}/>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Product
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
