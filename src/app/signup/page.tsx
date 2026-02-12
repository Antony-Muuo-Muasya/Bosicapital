'use client';

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
import { doc, collection, writeBatch, getDocs, query } from 'firebase/firestore';
import type { User as AppUser, Role, Branch, Organization } from '@/lib/types';
import Image from 'next/image';


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
      const usersCol = collection(firestore, 'users');
      const allUsersSnapshot = await getDocs(query(usersCol));
      const isFirstUserEver = allUsersSnapshot.empty;

      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      await updateProfile(userCredential.user, {
        displayName: values.fullName,
      });

      const batch = writeBatch(firestore);
      let organizationId: string;
      let orgName: string;
      let roleId: AppUser['roleId'];
      let branchIds: string[] = [];
      const orgCreatedAt = new Date().toISOString();

      if (isFirstUserEver) {
        organizationId = 'default_org'; 
        orgName = 'My Organization';
        roleId = 'superadmin';
        
        const rolesToSeed: (Omit<Role, 'organizationId' | 'id'> & { id: Role['id'] })[] = [
            { id: 'superadmin', name: 'Super Administrator', systemRole: true, permissions: ['*'] as any },
            { id: 'admin', name: 'Administrator', systemRole: true, permissions: ['user.create', 'user.edit', 'user.delete', 'user.view', 'role.manage', 'branch.manage', 'loan.create', 'loan.approve', 'loan.view', 'repayment.create', 'reports.view'] },
            { id: 'manager', name: 'Manager', systemRole: true, permissions: ['user.view', 'branch.manage', 'loan.create', 'loan.approve', 'loan.view', 'repayment.create', 'reports.view'] },
            { id: 'loan_officer', name: 'Loan Officer', systemRole: true, permissions: ['loan.create', 'loan.view', 'repayment.create'] },
            { id: 'user', name: 'User', systemRole: true, permissions: ['borrower.view.own'] },
        ];
        
        rolesToSeed.forEach(roleData => {
            const roleDocRef = doc(firestore, 'roles', roleData.id);
            batch.set(roleDocRef, { ...roleData, organizationId: 'system' });
        });
        
        const mainBranchRef = doc(collection(firestore, 'branches'));
        const mainBranch: Branch = {
            id: mainBranchRef.id, name: 'Headquarters', location: 'Nairobi', isMain: true, organizationId,
        };
        batch.set(mainBranchRef, mainBranch);
        branchIds = [mainBranch.id];

      } else {
         const newOrgRef = doc(collection(firestore, 'organizations'));
         organizationId = newOrgRef.id;
         orgName = `${values.fullName}'s Organization`;
         roleId = 'admin'; 
         
         const mainBranchRef = doc(collection(firestore, 'branches'));
         const mainBranch: Branch = {
             id: mainBranchRef.id, name: 'Headquarters', location: 'Default Location', isMain: true, organizationId,
         };
         batch.set(mainBranchRef, mainBranch);
         branchIds = [mainBranch.id];
      }

      const orgDocRef = doc(firestore, 'organizations', organizationId);
      const newOrganizationData: Omit<Organization, 'id'> = {
        name: orgName,
        logoUrl: '/logo.jpg',
        createdAt: orgCreatedAt,
      };
      batch.set(orgDocRef, { ...newOrganizationData, id: orgDocRef.id });

      const userDocRef = doc(firestore, 'users', userCredential.user.uid);
      const newUserProfile: AppUser = {
          id: userCredential.user.uid,
          organizationId,
          fullName: values.fullName,
          email: values.email,
          roleId: roleId,
          branchIds: branchIds,
          status: 'active',
          createdAt: new Date().toISOString(),
      };
      batch.set(userDocRef, newUserProfile);

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
          <Image src="/logo.jpg" alt="Logo" width={40} height={40} className="mx-auto rounded-md" />
          <CardTitle className="text-2xl pt-2">Create an Account</CardTitle>
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
