'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { collection, doc, setDoc, query, where, getDocs } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
import type { User as AppUser, Borrower } from '@/lib/types';


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

  const [unlinkedUsers, setUnlinkedUsers] = useState<AppUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const borrowersQuery = useMemoFirebase(() => {
    if (!firestore || !staffProfile) return null;
    const { organizationId, roleId, branchIds } = staffProfile;
    const borrowersCol = collection(firestore, 'borrowers');

    if (roleId === 'admin') {
      return query(borrowersCol, where('organizationId', '==', organizationId));
    }
    
    if ((roleId === 'manager' || roleId === 'loan_officer') && branchIds?.length > 0) {
      return query(borrowersCol, where('organizationId', '==', organizationId), where('branchId', 'in', branchIds));
    }

    return null;
  }, [firestore, staffProfile]);

  const { data: borrowers, isLoading: borrowersLoading } = useCollection<Borrower>(borrowersQuery);

  useEffect(() => {
    if (!firestore || !staffProfile || borrowersLoading) {
      return;
    }
  
    const fetchUnlinkedUsers = async () => {
      setUsersLoading(true);
      try {
        let usersData: AppUser[] = [];
        const borrowerUserIds = new Set(borrowers?.map(b => b.userId) || []);
  
        if (staffProfile.roleId === 'admin') {
          const q = query(collection(firestore, 'users'), where('roleId', '==', 'user'), where('organizationId', '==', staffProfile.organizationId));
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach(doc => {
            usersData.push({ id: doc.id, ...doc.data() } as AppUser);
          });
        } else if ((staffProfile.roleId === 'manager' || staffProfile.roleId === 'loan_officer') && staffProfile.branchIds?.length > 0) {
          const userMap = new Map<string, AppUser>();
          // A non-admin user might be in multiple branches. We must query each branch and merge.
          // Firestore 'in' queries have a limit of 30, so this is safer.
          for (const branchId of staffProfile.branchIds) {
            const q = query(
              collection(firestore, 'users'), 
              where('roleId', '==', 'user'), 
              where('branchIds', 'array-contains', branchId),
              where('organizationId', '==', staffProfile.organizationId)
            );
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach(doc => {
              if (!userMap.has(doc.id)) {
                userMap.set(doc.id, { id: doc.id, ...doc.data() } as AppUser);
              }
            });
          }
          usersData = Array.from(userMap.values());
        }
  
        const filteredUsers = usersData.filter(u => !borrowerUserIds.has(u.id));
        setUnlinkedUsers(filteredUsers);
      } catch (error) {
        console.error("Error fetching unlinked users: ", error);
        toast({
          variant: "destructive",
          title: "Could not fetch users",
          description: "You may not have the required permissions. Please contact an administrator."
        });
      } finally {
        setUsersLoading(false);
      }
    };
  
    fetchUnlinkedUsers();
  }, [firestore, staffProfile, borrowers, borrowersLoading, toast]);


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
  const selectedUser = useMemo(() => unlinkedUsers.find(u => u.id === selectedUserId), [unlinkedUsers, selectedUserId]);

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
  
  // Reset form when dialog opens/closes or user list changes
  useEffect(() => {
      form.reset();
  }, [open, unlinkedUsers, form]);

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
                        <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
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
