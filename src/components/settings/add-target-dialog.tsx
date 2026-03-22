'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useUserProfile } from '@/firebase';
import { createTarget, createMultipleTargets } from '@/actions/targets';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { Branch, User as AppUser } from '@/lib/types';
import { format } from 'date-fns';

const targetSchema = z.object({
  name: z.string().min(3, 'Target name is required.'),
  branchId: z.string().min(1, 'A branch must be selected.'),
  userId: z.string().optional(),
  type: z.enum(['disbursal_amount', 'new_borrowers', 'portfolio_value']),
  value: z.coerce.number().positive('Target value must be a positive number.'),
  startDate: z.string().refine((val) => new Date(val).toString() !== 'Invalid Date', { message: 'A valid start date is required.' }),
  endDate: z.string().refine((val) => new Date(val).toString() !== 'Invalid Date', { message: 'A valid end date is required.' }),
  redistribute: z.boolean().default(false),
}).refine(data => new Date(data.endDate) > new Date(data.startDate), {
    message: 'End date must be after the start date.',
    path: ['endDate'],
});

type TargetFormData = z.infer<typeof targetSchema>;

interface AddTargetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: Branch[];
  users: AppUser[];
}

export function AddTargetDialog({ open, onOpenChange, branches, users }: AddTargetDialogProps) {
  const { userProfile } = useUserProfile();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TargetFormData>({
    resolver: zodResolver(targetSchema),
    defaultValues: {
      name: '',
      branchId: '',
      userId: '',
      type: 'disbursal_amount',
      value: 0,
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      redistribute: false
    },
  });

  const onSubmit = async (values: TargetFormData) => {
    if (!userProfile) return;
    setIsSubmitting(true);

    const payload: any = {
      ...values,
      organizationId: userProfile.organizationId,
    };
    
    if (!payload.userId || payload.userId === 'none') {
      delete payload.userId;
    }

    try {
      if (values.redistribute && (!values.userId || values.userId === 'none')) {
        const branchOfficers = users.filter(u => u.branchIds.includes(values.branchId) && u.roleId === 'loan_officer');
        
        if (branchOfficers.length === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'No loan officers found in this branch to distribute targets to.' });
            setIsSubmitting(false);
            return;
        }

        const individualValue = Math.round((values.value / branchOfficers.length) * 100) / 100;
        const targetsToCreate = branchOfficers.map(officer => ({
            ...payload,
            name: `${values.name} (${officer.fullName})`,
            userId: officer.id,
            value: individualValue
        }));

        const res = await createMultipleTargets(targetsToCreate);
        if (res.success) {
            toast({ title: 'Success', description: `Target redistributed among ${branchOfficers.length} loan officers.` });
            form.reset();
            onOpenChange(false);
        } else {
            throw new Error(res.error);
        }
      } else {
        const res = await createTarget(payload);
        if (res.success) {
          toast({ title: 'Success', description: 'New target created.' });
          form.reset();
          onOpenChange(false);
        } else {
          toast({ variant: 'destructive', title: 'Error', description: res.error || 'Could not create target.' });
        }
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Could not create target.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Performance Target</DialogTitle>
          <DialogDescription>
            Set a new performance goal for a specific branch or user.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Target Name</FormLabel>
                <FormControl><Input placeholder="e.g., Q3 Disbursals" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
               <FormField control={form.control} name="branchId" render={({ field }) => (
                <FormItem>
                    <FormLabel>Branch</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a branch" /></SelectTrigger></FormControl>
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
                            <SelectItem value="none">Branch-wide</SelectItem>
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
                            <FormControl><SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger></FormControl>
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
            
            {!form.watch('userId') || form.watch('userId') === 'none' ? (
                <FormField
                    control={form.control}
                    name="redistribute"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>
                                    Redistribute Target
                                </FormLabel>
                                <p className="text-xs text-muted-foreground">
                                    Divide the total target value equally among all loan officers in the selected branch.
                                </p>
                            </div>
                        </FormItem>
                    )}
                />
            ) : null}
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Target
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
