'use client';

import { useState, useMemo } from 'react';
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
import { useFirestore, useUserProfile, errorEmitter, FirestorePermissionError, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, query, where } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
import type { User as AppUser } from '@/lib/types';


const borrowerSchema = z.object({
  userId: z.string().min(1, 'Please select a user to link.'),
  phone: z.string().min(1, 'Phone number is required.'),
  address: z.string().min(1, 'Address is required.'),
  nationalId: z.string().min(1, 'National ID is required.'),
  dateOfBirth: z.string().min(1, 'Date of birth is required.'),
  gender: z.enum(['Male', 'Female', 'Other']),
  employmentStatus: z.enum(['Employed', 'Self-employed', 'Unemployed']),
  monthlyIncome: z.coerce.number().min(0, 'Monthly income must be a positive number.'),
});

type BorrowerFormData = z.infer<typeof borrowerSchema>;

interface AddBorrowerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddBorrowerDialog({ open, onOpenChange }: AddBorrowerDialogProps) {
  const firestore = useFirestore();
  const { userProfile: staffProfile } = useUserProfile();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    // Find users with the 'user' role who are not yet linked to a borrower profile.
    // This requires knowing which users are already borrowers. We will filter client-side.
    return query(collection(firestore, 'users'), where('roleId', '==', 'user'));
  }, [firestore]);

  const borrowersQuery = useMemoFirebase(() => {
    if(!firestore) return null;
    return collection(firestore, 'borrowers');
  },[firestore]);

  const { data: users, isLoading: usersLoading } = useCollection<AppUser>(usersQuery);
  const { data: borrowers, isLoading: borrowersLoading } = useCollection(borrowersQuery);

  const unlinkedUsers = useMemo(() => {
    if (!users || !borrowers) return [];
    const borrowerUserIds = new Set(borrowers.map(b => b.userId));
    return users.filter(u => !borrowerUserIds.has(u.id));
  }, [users, borrowers]);


  const form = useForm<BorrowerFormData>({
    resolver: zodResolver(borrowerSchema),
    defaultValues: {
      userId: '',
      phone: '',
      address: '',
      nationalId: '',
      dateOfBirth: '',
      gender: 'Male',
      employmentStatus: 'Employed',
      monthlyIncome: 0,
    },
  });

  const selectedUserId = form.watch('userId');
  const selectedUser = useMemo(() => users?.find(u => u.id === selectedUserId), [users, selectedUserId]);

  const onSubmit = (values: BorrowerFormData) => {
    if (!staffProfile || !firestore || !selectedUser) {
        toast({ variant: 'destructive', title: 'Error', description: 'User not authenticated or database not available.' });
        return;
    }
    setIsSubmitting(true);

    const borrowersColRef = collection(firestore, 'borrowers');
    const newBorrowerRef = doc(borrowersColRef);
    
    const newBorrowerData = {
      ...values,
      id: newBorrowerRef.id,
      email: selectedUser.email,
      fullName: selectedUser.fullName,
      photoUrl: `https://picsum.photos/seed/${newBorrowerRef.id}/400/400`,
      branchId: staffProfile.branchIds[0] || 'branch-1', // Default to staff's first branch
      organizationId: staffProfile.organizationId,
      registrationFeeRequired: true,
      registrationFeeAmount: 800,
      registrationFeePaid: false,
      registrationFeePaidAt: null,
      registrationPaymentId: null,
    };

    setDoc(newBorrowerRef, newBorrowerData, { merge: false })
      .then(() => {
        toast({ title: 'Success', description: 'Borrower created and linked successfully.' });
        form.reset();
        onOpenChange(false);
      })
      .catch(error => {
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: newBorrowerRef.path,
            operation: 'create',
            requestResourceData: newBorrowerData,
          })
        )
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const isLoading = usersLoading || borrowersLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Borrower</DialogTitle>
          <DialogDescription>
            Select a registered user to link to a new borrower profile.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="userId" render={({ field }) => (
                    <FormItem>
                        <FormLabel>User to Link</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                            <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select a user account..." /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {isLoading && <SelectItem value="loading" disabled>Loading users...</SelectItem>}
                                {!isLoading && unlinkedUsers.map(user => (
                                    <SelectItem key={user.id} value={user.id}>{user.fullName} ({user.email})</SelectItem>
                                ))}
                                {!isLoading && unlinkedUsers.length === 0 && <SelectItem value="none" disabled>No unlinked users found.</SelectItem>}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}/>
                <div className="grid grid-cols-2 gap-4">
                    <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <Input disabled value={selectedUser?.fullName || '...'} />
                    </FormItem>
                    <FormItem>
                        <FormLabel>Email</FormLabel>
                        <Input disabled value={selectedUser?.email || '...'} />
                    </FormItem>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl><Input placeholder="555-123-4567" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="nationalId" render={({ field }) => (
                        <FormItem>
                            <FormLabel>National ID</FormLabel>
                            <FormControl><Input placeholder="ID Number" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                </div>
                <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl><Input placeholder="123 Main St, Anytown" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <div className="grid grid-cols-2 gap-4">
                     <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Date of Birth</FormLabel>
                            <FormControl><Input type="date" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="gender" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Gender</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Male">Male</SelectItem>
                                    <SelectItem value="Female">Female</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}/>
                </div>
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

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting || isLoading || unlinkedUsers.length === 0}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Borrower
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
