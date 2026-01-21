'use client';

import { useAuth, useFirestore, useUserProfile, setDocumentNonBlocking } from '@/firebase';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { updateProfile } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield } from 'lucide-react';

const profileSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, userProfile, userRole } = useUserProfile();
  const auth = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isReadOnly = userRole?.id !== 'admin';

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: {
      fullName: userProfile?.fullName || '',
      email: user?.email || '',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    if (!user || userRole?.id !== 'admin') return; // Should not happen if button is disabled
    setIsSubmitting(true);
    try {
      // Note: This only updates the Auth display name. The Firestore document update
      // is handled by a separate process for admins on the /users page.
      await updateProfile(user, {
        displayName: data.fullName,
      });

      toast({
        title: 'Success',
        description: 'Your display name has been updated.',
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update profile display name.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader title="Profile" description="Manage your account settings." />
      <div className="p-4 md:p-6">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>View your personal details here.</CardDescription>
          </CardHeader>
          <CardContent>
            {isReadOnly && (
              <Alert className="mb-6">
                <Shield className="h-4 w-4" />
                <AlertTitle>Read-Only Access</AlertTitle>
                <AlertDescription>
                  Your profile is managed by an administrator. Please contact them to make changes.
                </AlertDescription>
              </Alert>
            )}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={isReadOnly} />
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
                        <Input {...field} disabled />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isSubmitting || isReadOnly}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
