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
import { doc, collection, writeBatch, getDocs, query, limit } from 'firebase/firestore';
import type { User as AppUser, Role, Branch, Organization } from '@/lib/types';


const signupSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  organizationName: z.string().min(1, 'Organization name is required'),
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
      organizationName: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof signupSchema>) => {
    setIsSubmitting(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      await updateProfile(userCredential.user, {
        displayName: values.fullName,
      });

      const batch = writeBatch(firestore);
      const createdAt = new Date().toISOString();

      // Seed roles only if they don't exist yet (one-time setup for the entire platform)
      const rolesQuery = query(collection(firestore, 'roles'), limit(1));
      const rolesSnapshot = await getDocs(rolesQuery);
      if (rolesSnapshot.empty) {
        const rolesToSeed: (Omit<Role, 'organizationId' | 'id'> & { id: Role['id'] })[] = [
            { id: 'superadmin', name: 'CEO / Business Developer', systemRole: true, permissions: ['*'] as any },
            { id: 'admin', name: 'Head of Operations', systemRole: true, permissions: ['user.create', 'user.edit', 'user.delete', 'user.view', 'role.manage', 'branch.manage', 'loan.create', 'loan.approve', 'loan.view', 'repayment.create', 'reports.view'] },
            { id: 'manager', name: 'Manager / Head of Product', systemRole: true, permissions: ['user.view', 'branch.manage', 'loan.create', 'loan.approve', 'loan.view', 'repayment.create', 'reports.view'] },
            { id: 'loan_officer', name: 'Loan Officer / Call Center', systemRole: true, permissions: ['loan.create', 'loan.view', 'repayment.create'] },
            { id: 'user', name: 'Borrower', systemRole: true, permissions: ['borrower.view.own'] },
        ];
        
        rolesToSeed.forEach(roleData => {
            const roleDocRef = doc(firestore, 'roles', roleData.id);
            batch.set(roleDocRef, { ...roleData, organizationId: 'system' });
        });
      }
      
      // Create a new independent organization for this user
      const orgRef = doc(collection(firestore, 'organizations'));
      const organizationId = orgRef.id;
      const orgData: Organization = {
          id: organizationId,
          name: values.organizationName,
          logoUrl: '',
          slogan: '',
          createdAt,
          phone: '',
          address: '',
      };
      batch.set(orgRef, orgData);
      
      // Create a main branch for this new organization
      const mainBranchRef = doc(collection(firestore, 'branches'));
      const mainBranch: Branch = {
          id: mainBranchRef.id, name: 'Headquarters', location: 'Main Office', isMain: true, organizationId,
      };
      batch.set(mainBranchRef, mainBranch);
      const branchIds = [mainBranch.id];

      // Create the user document, making them the superadmin of their new organization
      const userDocRef = doc(firestore, 'users', userCredential.user.uid);
      const newUserProfile: AppUser = {
          id: userCredential.user.uid,
          organizationId,
          fullName: values.fullName,
          email: values.email,
          roleId: 'superadmin',
          branchIds: branchIds,
          status: 'active',
          createdAt: createdAt,
      };
      batch.set(userDocRef, newUserProfile);

      await batch.commit();

      toast({
        title: 'Account & Organization Created!',
        description: "You're now being redirected to your new dashboard.",
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
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <img
            src="https://firebasestorage.googleapis.com/v0/b/studio-2397588411-6a237.appspot.com/o/WhatsApp_Image_2026-02-11_at_4.10.39_PM-removebg-preview.png?alt=media&token=70d5cc88-c5e0-4cad-ba20-75cdf4230ef2"
            alt="Bosi Capital Logo"
            width={196}
            height={196}
            className="rounded-md"
          />
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Create an Account</CardTitle>
            <CardDescription className="!mt-4">Sign up to create your own organization.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="organizationName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your Company, Inc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Full Name</FormLabel>
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
                      <FormLabel>Your Email</FormLabel>
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
    </div>
  );
}
