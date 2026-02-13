'use client';

import { useEffect, useState } from 'react';
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
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { Borrower, User as AppUser } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';

const editBorrowerSchema = z.object({
    fullName: z.string().min(1, 'Full name is required.'),
    phone: z.string().min(1, 'Phone number is required.'),
    address: z.string().min(1, 'Address is required.'),
    employmentStatus: z.enum(['Employed', 'Self-employed', 'Unemployed']),
    monthlyIncome: z.coerce.number().min(0, 'Monthly income must be a positive number.'),
    status: z.enum(['active', 'suspended']),
});

type BorrowerFormData = z.infer<typeof editBorrowerSchema>;

interface EditBorrowerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  borrower: Borrower;
}

export function EditBorrowerDialog({ open, onOpenChange, borrower }: EditBorrowerDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userRef = useMemoFirebase(() => borrower?.userId ? doc(firestore, 'users', borrower.userId) : null, [firestore, borrower?.userId]);
  const { data: user, isLoading: isUserLoading } = useDoc<AppUser>(userRef);

  const form = useForm<BorrowerFormData>({
    resolver: zodResolver(editBorrowerSchema),
  });
  
  useEffect(() => {
    if (borrower && user) {
        form.reset({
            fullName: borrower.fullName,
            phone: borrower.phone,
            address: borrower.address,
            employmentStatus: borrower.employmentStatus,
            monthlyIncome: borrower.monthlyIncome,
            status: user.status,
        })
    }
  }, [borrower, user, form]);

  const onSubmit = async (values: BorrowerFormData) => {
    if (!borrower?.userId || !user) {
        toast({ variant: 'destructive', title: 'Error', description: 'Borrower or user data is missing.' });
        return;
    }
    setIsSubmitting(true);

    try {
        const batch = writeBatch(firestore);

        const borrowerRef = doc(firestore, 'borrowers', borrower.id);
        const userRef = doc(firestore, 'users', borrower.userId);
        
        // Update borrower document
        batch.update(borrowerRef, {
            fullName: values.fullName,
            phone: values.phone,
            address: values.address,
            employmentStatus: values.employmentStatus,
            monthlyIncome: values.monthlyIncome,
        });

        // Update user document
        batch.update(userRef, {
            fullName: values.fullName,
            status: values.status,
        });

        await batch.commit();

        toast({ title: 'Success', description: 'Borrower details updated successfully.' });
        onOpenChange(false);
    } catch (error) {
        console.error("Error updating borrower:", error);
        toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update borrower details. Check permissions.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const isLoading = isUserLoading || form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Borrower Details</DialogTitle>
          <DialogDescription>
            Update details for {borrower.fullName}.
          </DialogDescription>
        </DialogHeader>
        {isLoading && (
            <div className="space-y-4 py-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        )}
        {!isUserLoading && (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
                <FormField control={form.control} name="fullName" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl><Input placeholder="Jane Doe" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl><Input placeholder="07..." {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl><Input placeholder="123 Main St, Anytown" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                 <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="employmentStatus" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Employment Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Employed">Employed</SelectItem>
                                    <SelectItem value="Self-employed">Self-employed</SelectItem>
                                    <SelectItem value="Unemployed">Unemployed</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="monthlyIncome" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Monthly Income (KES)</FormLabel>
                            <FormControl><Input type="number" placeholder="25000" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                </div>
                 <div className="p-4 border-l-4 border-destructive/50 bg-destructive/10 rounded-md">
                    <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Account Status</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className='bg-background'><SelectValue placeholder="Select status" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="suspended">Suspended</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            <p className="text-xs text-muted-foreground pt-1">Suspending an account will prevent the borrower from logging in.</p>
                        </FormItem>
                    )}/>
                 </div>
                <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </form>
        </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
