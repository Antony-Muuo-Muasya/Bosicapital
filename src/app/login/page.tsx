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
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import type { Organization } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { transformImageUrl } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [org, setOrg] = useState<{name: string, logoUrl: string, slogan?: string} | null>(null);
  const [isOrgLoading, setIsOrgLoading] = useState(true);
  const firestore = useFirestore();

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
            slogan: orgData.slogan
          });
        }
      } catch (error) {
        console.error("Could not fetch organization for login page:", error);
      } finally {
        setIsOrgLoading(false);
      }
    };
    fetchOrg();
  }, [firestore]);

  const displayLogoUrl = useMemo(() => transformImageUrl(org?.logoUrl), [org]);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      // On success, the useEffect will redirect the user.
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Invalid email or password. Please try again.',
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
          {isOrgLoading ? (
             <Skeleton className="h-48 w-48 mx-auto rounded-md" />
          ) : (
            displayLogoUrl && <Image src={displayLogoUrl} alt={org?.name || 'Logo'} width={192} height={192} className="mx-auto rounded-md object-contain" />
          )}
          <CardTitle className="text-2xl pt-2">{isOrgLoading ? <Skeleton className="h-8 w-48 mx-auto" /> : (org?.name || 'Welcome Back')}</CardTitle>
          {org?.slogan && <p className="text-sm text-muted-foreground">{org.slogan}</p>}
          <CardDescription className="!mt-4">Enter your credentials to access your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                Login
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="justify-center text-sm">
            <p className="text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="text-primary hover:underline">
                    Create one
                </Link>
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
