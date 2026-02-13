'use client';
import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFirestore, useUserProfile, useAuth } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import type { User as AppUser, Role } from '@/lib/types';


const staffSchema = z.object({
  fullName: z.string().min(1, 'Full name is required.'),
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  roleId: z.string().min(1, 'A role must be selected.'),
});

type StaffFormData = z.infer<typeof staffSchema>;

interface AddStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: Role[];
}

export function AddStaffDialog({ open, onOpenChange, roles }: AddStaffDialogProps) {
  const firestore = useFirestore();
  const auth = useAuth();
  const { userProfile: adminProfile } = useUserProfile();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const staffRoles = useMemo(() => roles.filter(r => r.id !== 'user' && r.id !== 'superadmin'), [roles]);

  const form = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      roleId: '',
    },
  });

  const onSubmit = async (values: StaffFormData) => {
    if (!adminProfile) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not identify administrator profile.' });
        return;
    }
    setIsSubmitting(true);

    try {
        // We cannot create auth users and firestore documents in a single transaction.
        // So we create the auth user first. If the firestore write fails, the admin may need to delete the auth user manually.
        // This is a limitation of operating on the client.
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        await updateProfile(userCredential.user, { displayName: values.fullName });

        const userDocRef = doc(firestore, 'users', userCredential.user.uid);
        const newUserProfile: AppUser = {
            id: userCredential.user.uid,
            organizationId: adminProfile.organizationId,
            fullName: values.fullName,
            email: values.email,
            roleId: values.roleId,
            branchIds: [],
            status: 'active',
            createdAt: new Date().toISOString(),
        };
        
        await setDoc(userDocRef, newUserProfile);

        toast({ title: 'Success', description: `${values.fullName} has been added.` });
        form.reset();
        onOpenChange(false);

    } catch (error: any) {
        let description = 'An unexpected error occurred. Please try again.';
        if (error.code === 'auth/email-already-in-use') {
            description = 'This email address is already in use by another account.';
        }
        console.error("Error creating staff user:", error);
        toast({ variant: 'destructive', title: 'Creation Failed', description });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Staff User</DialogTitle>
          <DialogDescription>
            Create a new staff account and assign them a role. They will use this email and password to log in.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="fullName" render={({ field }) => (
                <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl><Input placeholder="Jane Doe" {...field} /></FormControl>
                <FormMessage />
                </FormItem>
            )} />
             <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input type="email" placeholder="jane.doe@example.com" {...field} /></FormControl>
                <FormMessage />
                </FormItem>
            )} />
             <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                <FormMessage />
                </FormItem>
            )} />
            <FormField control={form.control} name="roleId" render={({ field }) => (
                <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger><SelectValue placeholder="Assign a role" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {staffRoles.map(role => (
                                <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
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
                    Create User
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
