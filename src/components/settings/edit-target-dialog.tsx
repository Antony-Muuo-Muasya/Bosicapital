'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Branch, Target, User as AppUser } from '@/lib/types';
import { format } from 'date-fns';

const targetSchema = z.object({
  name: z.string().min(3, 'Target name is required.'),
  branchId: z.string().min(1, 'A branch must be selected.'),
  userId: z.string().optional(),
  type: z.enum(['disbursal_amount', 'new_borrowers', 'portfolio_value']),
  value: z.coerce.number().positive('Target value must be a positive number.'),
  startDate: z.string().refine((val) => new Date(val).toString() !== 'Invalid Date', { message: 'A valid start date is required.' }),
  endDate: z.string().refine((val) => new Date(val).toString() !== 'Invalid Date', { message: 'A valid end date is required.' }),
}).refine(data => new Date(data.endDate) > new Date(data.startDate), {
    message: 'End date must be after the start date.',
    path: ['endDate'],
});

type TargetFormData = z.infer<typeof targetSchema>;

interface EditTargetDialogProps {
  target: Target;
  branches: Branch[];
  users: AppUser[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTargetDialog({ target, branches, users, open, onOpenChange }: EditTargetDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TargetFormData>({
    resolver: zodResolver(targetSchema),
    defaultValues: {
        ...target,
        userId: target.userId || '',
    },
  });

  const onSubmit = (values: TargetFormData) => {
    setIsSubmitting(true);
    const targetDocRef = doc(firestore, 'targets', target.id);
    
    const updateData: Partial<TargetFormData> = { ...values };
    if (updateData.userId === '') {
      delete updateData.userId;
    }

    updateDocumentNonBlocking(targetDocRef, updateData)
      .then(() => {
        toast({ title: 'Success', description: 'Target updated.' });
        onOpenChange(false);
      })
      .catch(err => {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update target.' });
      })
      .finally(() => setIsSubmitting(false));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Performance Target</DialogTitle>
          <DialogDescription>
            Update the details for the "{target.name}" target.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Target Name</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
               <FormField control={form.control} name="branchId" render={({ field }) => (
                <FormItem>
                    <FormLabel>Branch</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                            {branches.map(branch => (
                                <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
              )}/>
               <FormField control={form.control} name="userId" render={({ field }) => (
                <FormItem>
                    <FormLabel>Assign to User (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Branch-wide target" /></SelectTrigger></FormControl>
                        <SelectContent>
                             <SelectItem value="">Branch-wide</SelectItem>
                            {users.map(user => (
                                <SelectItem key={user.id} value={user.id}>{user.fullName}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )}/>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Target Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="disbursal_amount">Disbursal Amount (KES)</SelectItem>
                                <SelectItem value="new_borrowers">New Borrowers (Count)</SelectItem>
                                <SelectItem value="portfolio_value">Portfolio Value (KES)</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="value" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Target Value</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )} />
            </div>
             <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="startDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="endDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
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
