'use client';

import { useState } from 'react';
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
import { useAuth, useFirestore, useUserProfile } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
import type { User as AppUser, Borrower } from '@/lib/types';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';


const borrowerSchema = z.object({
    fullName: z.string().min(1, 'Full name is required.'),
    email: z.string().email('Invalid email address.'),
    password: z.string().min(6, 'Password must be at least 6 characters.'),
    phone: z.string().min(1, 'Phone number is required.'),
    address: z.string().min(1, 'Address is required.'),
    nationalId: z.string().min(1, 'National ID is required.'),
    dateOfBirth: z.string().refine((val) => new Date(val).toString() !== 'Invalid Date', { message: 'A valid date of birth is required.'}),
    gender: z.enum(['Male', 'Female', 'Other']),
    employmentStatus: z.enum(['Employed', 'Self-employed', 'Unemployed']),
    monthlyIncome: z.coerce.number().min(0, 'Monthly income must be a positive number.'),
    businessPhotoUrl: z.string().url().optional().or(z.literal('')),
    homeAssetsPhotoUrl: z.string().url().optional().or(z.literal('')),
});

type BorrowerFormData = z.infer<typeof borrowerSchema>;

interface AddBorrowerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddBorrowerDialog({ open, onOpenChange }: AddBorrowerDialogProps) {
  const firestore = useFirestore();
  const auth = useAuth();
  const { userProfile: staffProfile } = useUserProfile();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BorrowerFormData>({
    resolver: zodResolver(borrowerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      phone: '',
      address: '',
      nationalId: '',
      dateOfBirth: '',
      gender: 'Male',
      employmentStatus: 'Employed',
      monthlyIncome: 0,
      businessPhotoUrl: '',
      homeAssetsPhotoUrl: ''
    },
  });

  const onSubmit = async (values: BorrowerFormData) => {
    if (!staffProfile || !firestore || !staffProfile.branchIds?.[0]) {
        toast({ variant: 'destructive', title: 'Error', description: 'User not authenticated, not assigned to a branch, or database not available.' });
        return;
    }
    setIsSubmitting(true);

    try {
        // 1. Create Auth user
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        await updateProfile(userCredential.user, { displayName: values.fullName });

        const newUserId = userCredential.user.uid;
        const createdAt = new Date().toISOString();
        const assignedBranchId = staffProfile.branchIds[0];

        const batch = writeBatch(firestore);

        // 2. Create User document
        const userDocRef = doc(firestore, 'users', newUserId);
        const newUserProfile: AppUser = {
            id: newUserId,
            organizationId: staffProfile.organizationId,
            fullName: values.fullName,
            email: values.email,
            roleId: 'user', // Borrowers are always 'user' role
            branchIds: [assignedBranchId],
            status: 'active',
            createdAt: createdAt,
        };
        batch.set(userDocRef, newUserProfile);

        // 3. Create Borrower document
        const newBorrowerRef = doc(collection(firestore, 'borrowers'));
        const newBorrowerData: Borrower = {
            id: newBorrowerRef.id,
            userId: newUserId,
            email: values.email,
            fullName: values.fullName,
            phone: values.phone,
            address: values.address,
            nationalId: values.nationalId,
            dateOfBirth: values.dateOfBirth,
            gender: values.gender,
            employmentStatus: values.employmentStatus,
            monthlyIncome: values.monthlyIncome,
            businessPhotoUrl: values.businessPhotoUrl,
            homeAssetsPhotoUrl: values.homeAssetsPhotoUrl,
            photoUrl: `https://picsum.photos/seed/${newBorrowerRef.id}/400/400`,
            branchId: assignedBranchId,
            organizationId: staffProfile.organizationId,
            registrationFeeRequired: true,
            registrationFeeAmount: 800,
            registrationFeePaid: false,
            registrationFeePaidAt: null,
            registrationPaymentId: null,
        };
        batch.set(newBorrowerRef, newBorrowerData);

        // 4. Commit batch
        await batch.commit();

        toast({ title: 'Success', description: 'Borrower account created successfully.' });
        form.reset();
        onOpenChange(false);
    } catch (error: any) {
        let description = 'An unexpected error occurred. Please try again.';
        if (error.code === 'auth/email-already-in-use') {
            description = 'This email address is already in use by another account.';
        }
        console.error("Error creating borrower account:", error);
        toast({ variant: 'destructive', title: 'Creation Failed', description });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Borrower</DialogTitle>
          <DialogDescription>
            Create a new borrower account. This will also create a user login for them.
          </DialogDescription>
        </DialogHeader>
        {!staffProfile?.branchIds?.length && (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Branch Assignment Required</AlertTitle>
                <AlertDescription>
                You must be assigned to a branch before you can add a borrower. Please contact an administrator.
                </AlertDescription>
            </Alert>
        )}
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="fullName" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl><Input placeholder="Jane Doe" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                     <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl><Input type="email" placeholder="jane.doe@example.com" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                </div>
                 <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Temporary Password</FormLabel>
                        <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl><Input placeholder="07..." {...field} /></FormControl>
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
                 <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="businessPhotoUrl" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Business Photo URL (Optional)</FormLabel>
                            <FormControl><Input placeholder="https://example.com/photo.jpg" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="homeAssetsPhotoUrl" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Home Assets Photo URL (Optional)</FormLabel>
                            <FormControl><Input placeholder="https://example.com/photo.jpg" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                </div>


                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting || !staffProfile?.branchIds?.length}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Borrower
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
