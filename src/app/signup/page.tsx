'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { doc, collection, writeBatch, getDocs, query, limit, where } from 'firebase/firestore';
import type { User as AppUser, Role, Branch, Organization } from '@/lib/types';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { transformImageUrl } from '@/lib/utils';


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
  const [org, setOrg] = useState<{name: string, logoUrl: string, slogan?: string} | null>(null);
  const [isOrgLoading, setIsOrgLoading] = useState(true);

  useEffect(() => {
    const fetchOrg = async () => {
      if (!firestore) {
        setIsOrgLoading(false);
        return;
      };
      try {
        const orgsQuery = query(collection(firestore, 'organizations'), limit(1));
        const orgsSnapshot = await getDocs(orgsQuery);
        if (!orgsSnapshot.empty) {
          const orgData = orgsSnapshot.docs[0].data() as Organization;
          setOrg({
            name: orgData.name,
            logoUrl: orgData.logoUrl || '',
            slogan: orgData.slogan,
          });
        }
      } catch (error) {
        console.error("Could not fetch organization for signup page:", error);
      } finally {
        setIsOrgLoading(false);
      }
    };
    fetchOrg();
  }, [firestore]);

  const displayLogoUrl = useMemo(() => transformImageUrl(org?.logoUrl), [org]);

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
      // Check if an organization already exists.
      const orgsQuery = query(collection(firestore, 'organizations'), limit(1));
      const orgsSnapshot = await getDocs(orgsQuery);
      const isFirstUserEver = orgsSnapshot.empty;

      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      await updateProfile(userCredential.user, {
        displayName: values.fullName,
      });

      const batch = writeBatch(firestore);
      let organizationId: string;
      let roleId: AppUser['roleId'];
      let branchIds: string[] = [];
      const createdAt = new Date().toISOString();

      if (isFirstUserEver) {
        // First user setup: creates the organization, roles, and main branch
        const orgRef = doc(collection(firestore, 'organizations'));
        organizationId = orgRef.id;
        roleId = 'superadmin';
        
        const orgData: Organization = {
            id: organizationId,
            name: "Bosi Capital Limited",
            logoUrl: '',
            slogan: 'Capital that works',
            createdAt,
            phone: '0755595565',
            address: 'Wayi Plaza B14, 7th Floor, along Galana Road, Kilimani, Nairobi',
        };
        batch.set(orgRef, orgData);
        
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
        
        const mainBranchRef = doc(collection(firestore, 'branches'));
        const mainBranch: Branch = {
            id: mainBranchRef.id, name: 'Headquarters', location: 'Nairobi', isMain: true, organizationId,
        };
        batch.set(mainBranchRef, mainBranch);
        branchIds = [mainBranch.id];

      } else {
        // Subsequent user setup: join the existing organization
        const existingOrg = orgsSnapshot.docs[0].data() as Organization;
        organizationId = existingOrg.id;
        roleId = 'user'; // Default new users to the 'Borrower' role.
        
        // Find the main branch of the existing organization to assign the user
        const branchesQuery = query(
            collection(firestore, 'branches'), 
            where('organizationId', '==', organizationId), 
            where('isMain', '==', true),
            limit(1)
        );
        const branchSnapshot = await getDocs(branchesQuery);
        if (!branchSnapshot.empty) {
            branchIds = [branchSnapshot.docs[0].id];
        }
      }

      // Create the user document in Firestore
      const userDocRef = doc(firestore, 'users', userCredential.user.uid);
      const newUserProfile: AppUser = {
          id: userCredential.user.uid,
          organizationId,
          fullName: values.fullName,
          email: values.email,
          roleId: roleId,
          branchIds: branchIds,
          status: 'active',
          createdAt: createdAt,
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
      // The redirect should depend on the user's role, which is set during signup.
      // A fresh user might not have their profile immediately, so a simple push is okay.
      // The layout for the destination will handle role-based redirection if needed.
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
          {isOrgLoading ? (
             <Skeleton className="h-24 w-24 mx-auto rounded-md" />
          ) : (
            displayLogoUrl && <Image src={displayLogoUrl} alt={org?.name || 'Logo'} width={96} height={96} className="mx-auto rounded-md object-contain" />
          )}
          <CardTitle className="text-2xl pt-2">{isOrgLoading ? <Skeleton className="h-8 w-48 mx-auto" /> : (org?.name || 'Create an Account')}</CardTitle>
          {org?.slogan && <p className="text-sm text-muted-foreground">{org.slogan}</p>}
          <CardDescription className="!mt-4">Enter your details to get started.</CardDescription>
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
