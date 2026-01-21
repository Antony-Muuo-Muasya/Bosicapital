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
import type { Branch } from '@/lib/types';

const branchSchema = z.object({
  name: z.string().min(3, 'Branch name is required.'),
  location: z.string().min(3, 'Location is required.'),
});

type BranchFormData = z.infer<typeof branchSchema>;

interface EditBranchDialogProps {
  branch: Branch;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditBranchDialog({ branch, open, onOpenChange }: EditBranchDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BranchFormData>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
        name: branch.name,
        location: branch.location,
    },
  });

  const onSubmit = (values: BranchFormData) => {
    setIsSubmitting(true);
    const branchDocRef = doc(firestore, 'branches', branch.id);
    
    updateDocumentNonBlocking(branchDocRef, values)
      .then(() => {
        toast({ title: 'Success', description: 'Branch updated.' });
        onOpenChange(false);
      })
      .catch(err => {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update branch.' });
      })
      .finally(() => setIsSubmitting(false));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Branch</DialogTitle>
          <DialogDescription>
            Update details for the "{branch.name}" branch.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                    <FormLabel>Branch Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
             <FormField control={form.control} name="location" render={({ field }) => (
                <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
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
