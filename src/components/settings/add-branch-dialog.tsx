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

const branchSchema = z.object({
  name: z.string().min(3, 'Branch name is required.'),
  location: z.string().min(3, 'Location is required.'),
});

type BranchFormData = z.infer<typeof branchSchema>;

interface AddBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddBranchDialog({ open, onOpenChange }: AddBranchDialogProps) {
  const firestore = useFirestore();
  const { userProfile } = useUserProfile();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BranchFormData>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      name: '',
      location: '',
    },
  });

  const onSubmit = (values: BranchFormData) => {
    if (!userProfile || !firestore) return;
    setIsSubmitting(true);

    const newBranchRef = doc(collection(firestore, 'branches'));
    const newBranchData = {
      ...values,
      id: newBranchRef.id,
      organizationId: userProfile.organizationId,
      isMain: false,
    };

    setDocumentNonBlocking(newBranchRef, newBranchData, { merge: false })
      .then(() => {
        toast({ title: 'Success', description: 'Branch created.' });
        form.reset();
        onOpenChange(false);
      })
      .catch(err => {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not create branch.' });
      })
      .finally(() => setIsSubmitting(false));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Branch</DialogTitle>
          <DialogDescription>
            Create a new branch for your organization.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Branch Name</FormLabel>
                <FormControl><Input placeholder="e.g., Downtown Branch" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="location" render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl><Input placeholder="e.g., 123 Main Street" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Branch
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
