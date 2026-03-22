'use client';
import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useUserProfile } from '@/firebase';
import { createUser } from '@/actions/users';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { User as AppUser, Role, Branch } from '@/lib/types';


const staffSchema = z.object({
  fullName: z.string().min(1, 'Full name is required.'),
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  roleId: z.string().min(1, 'A role must be selected.'),
  branchId: z.string().min(1, 'A branch must be selected.'),
});

type StaffFormData = z.infer<typeof staffSchema>;

interface AddStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: Role[];
  branches: Branch[];
}

export function AddStaffDialog({ open, onOpenChange, roles, branches }: AddStaffDialogProps) {
  const { userProfile: adminProfile } = useUserProfile();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const staffRoles = useMemo(() => {
    if (!adminProfile) return [];
    
    const currentRole = adminProfile.roleId;
    
    if (currentRole === 'admin') {
      return roles.filter(r => r.id === 'manager' || r.id === 'loan_officer');
    }
    
    if (currentRole === 'manager') {
      return roles.filter(r => r.id === 'loan_officer');
    }
    
    if (currentRole === 'superadmin') {
        return roles.filter(r => r.id !== 'borrower' && r.id !== 'superadmin');
    }

    return [];
  }, [roles, adminProfile]);

  const form = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      roleId: '',
      branchId: '',
    },
  });

  useEffect(() => {
    form.reset({
        fullName: '',
        email: '',
        password: '',
        roleId: '',
        branchId: '',
    });
  }, [staffRoles, form, open]);

  const onSubmit = async (values: StaffFormData) => {
    if (!adminProfile) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not identify administrator profile.' });
        return;
    }
    try {
        const res = await createUser({
            organizationId: adminProfile.organizationId,
            fullName: values.fullName,
            email: values.email,
            password: values.password,
            roleId: values.roleId,
            status: 'active',
            branchIds: [values.branchId],
        });
        
        if (!res.success) throw new Error(res.error);

        toast({ title: 'Success', description: `${values.fullName} has been added.` });
        form.reset();
        onOpenChange(false);

    } catch (error: any) {
        let description = 'An unexpected error occurred. Please try again.';
        if (error.message?.includes('Unique constraint failed on the fields: (`email`)')) {
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
            <FormField control={form.control} name="branchId" render={({ field }) => (
                <FormItem>
                    <FormLabel>Branch</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger><SelectValue placeholder="Assign a branch" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {branches.map(branch => (
                                <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )}/>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting || staffRoles.length === 0}>
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
