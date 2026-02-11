'use client';

import { AdooLogo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { doc, collection, writeBatch, getDocs, query, where } from 'firebase/firestore';
import type { User as AppUser, Role, Branch } from '@/lib/types';


const signupSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export default function SignupPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof signupSchema>) => {
    setIsSubmitting(true);
    try {
      // Check if this is the first user ever to sign up.
      const usersCol = collection(firestore, 'users');
      const allUsersSnapshot = await getDocs(query(usersCol));
      const isFirstUserEver = allUsersSnapshot.empty;

      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      await updateProfile(userCredential.user, {
        displayName: values.fullName,
      });

      const batch = writeBatch(firestore);

      if (isFirstUserEver) {
        // --- This is the first user ever: They become SUPERADMIN. ---
        const organizationId = 'adoo_super_org'; // A special, known ID for the super admin org
        
        // Seed all system roles globally. This happens only once.
        const rolesToSeed: (Omit<Role, 'organizationId' | 'id'> & { id: Role['id'] })[] = [
            { id: 'superadmin', name: 'Super Administrator', systemRole: true, permissions: ['*'] as any },
            { id: 'admin', name: 'Administrator', systemRole: true, permissions: ['user.create', 'user.edit', 'user.delete', 'user.view', 'role.manage', 'branch.manage', 'loan.create', 'loan.approve', 'loan.view', 'repayment.create', 'reports.view'] },
            { id: 'manager', name: 'Manager', systemRole: true, permissions: ['user.view', 'branch.manage', 'loan.create', 'loan.approve', 'loan.view', 'repayment.create', 'reports.view'] },
            { id: 'loan_officer', name: 'Loan Officer', systemRole: true, permissions: ['loan.create', 'loan.view', 'repayment.create'] },
            { id: 'user', name: 'User', systemRole: true, permissions: ['borrower.view.own'] },
        ];
        
        rolesToSeed.forEach(roleData => {
            const roleDocRef = doc(firestore, 'roles', roleData.id);
            batch.set(roleDocRef, { ...roleData, organizationId: 'system' }); // Roles are global
        });
        
        // Create a special branch for the superadmin org
        const mainBranchRef = doc(collection(firestore, 'branches'));
        const mainBranch: Branch = {
            id: mainBranchRef.id, name: 'Global', location: 'Cloud', isMain: true, organizationId,
        };
        batch.set(mainBranchRef, mainBranch);
        
        // Create the superadmin user profile
        const userDocRef = doc(firestore, 'users', userCredential.user.uid);
        const newUserProfile: AppUser = {
            id: userCredential.user.uid,
            organizationId,
            fullName: values.fullName,
            email: values.email,
            roleId: 'superadmin',
            branchIds: [mainBranch.id],
            status: 'active',
            createdAt: new Date().toISOString(),
        };
        batch.set(userDocRef, newUserProfile);

      } else {
         // --- A regular user is signing up: Create a new organization for them. ---
         const organizationId = doc(collection(firestore, 'organizations')).id;

         const mainBranchRef = doc(collection(firestore, 'branches'));
         const mainBranch: Branch = {
             id: mainBranchRef.id, name: 'Headquarters', location: 'Main City', isMain: true, organizationId,
         };
         batch.set(mainBranchRef, mainBranch);
         
         const userDocRef = doc(firestore, 'users', userCredential.user.uid);
         const newUserProfile: AppUser = {
             id: userCredential.user.uid,
             organizationId,
             fullName: values.fullName,
             email: values.email,
             roleId: 'admin', // First user of a new org is an Admin
             branchIds: [mainBranch.id],
             status: 'active',
             createdAt: new Date().toISOString(),
         };
         batch.set(userDocRef, newUserProfile);
      }

      await batch.commit();

      toast({
        title: 'Account Created!',
        description: "You're now being redirected to your dashboard.",
      });

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Sign Up Failed',
        description: error.message || 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <AdooLogo className="mx-auto h-8 w-8 text-primary" />
          <CardTitle className="text-2xl">Create an Account</CardTitle>
          <CardDescription>Enter your details to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="m@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} autoComplete="new-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="justify-center text-sm">
          <p className="text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Log in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
