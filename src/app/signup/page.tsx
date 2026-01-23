'use client';

import { AdooLogo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth, useUser, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { doc } from 'firebase/firestore';
import type { User as AppUser } from '@/lib/types';


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
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      await updateProfile(userCredential.user, {
        displayName: values.fullName,
      });

      // Create the corresponding user document in Firestore.
      // This is the correct place for this logic, as it only runs once upon successful user creation.
      const userDocRef = doc(firestore, 'users', userCredential.user.uid);
      const newUserProfile: AppUser = {
          id: userCredential.user.uid,
          organizationId: 'org_1',
          fullName: values.fullName,
          email: values.email,
          roleId: 'user', // All new signups default to the 'user' role. An admin can change this later.
          branchIds: [], // New users are unassigned from any branch by default.
          status: 'active',
          createdAt: new Date().toISOString(),
      };
      await setDocumentNonBlocking(userDocRef, newUserProfile, { merge: false });

      toast({
        title: 'Account Created!',
        description: "You're now being redirected to the dashboard.",
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
                      <Input type="password" autoComplete="new-password" />
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
