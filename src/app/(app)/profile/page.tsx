'use client';

import { useAuth, useFirestore, useUserProfile, updateDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Camera, Loader2, User, KeyRound, Bell, Building2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import type { Branch } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

const profileSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
});

const passwordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters.'),
}).refine(data => data.currentPassword !== data.newPassword, {
    message: "New password must be different from the current password.",
    path: ["newPassword"],
});


type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { user, userProfile, userRole, isLoading: isProfileLoading } = useUserProfile();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

  const branchesQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    return collection(firestore, 'branches');
  }, [firestore, userProfile]);
  
  const { data: allBranches, isLoading: areBranchesLoading } = useCollection<Branch>(branchesQuery);

  const assignedBranches = useMemo(() => {
    if (!userProfile?.branchIds || !allBranches) return [];
    const branchesMap = new Map(allBranches.map(b => [b.id, b]));
    return userProfile.branchIds.map(id => branchesMap.get(id)).filter(Boolean) as Branch[];
  }, [userProfile, allBranches]);


  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: {
      fullName: userProfile?.fullName || '',
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
        currentPassword: '',
        newPassword: '',
    }
  });

  const onProfileSubmit = async (data: ProfileFormData) => {
    if (!user) return;
    setIsProfileSubmitting(true);
    const userDocRef = doc(firestore, 'users', user.uid);
    updateDocumentNonBlocking(userDocRef, { fullName: data.fullName })
        .then(() => {
            toast({ title: 'Success', description: 'Your name has been updated.' });
        })
        .catch(() => {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update profile.' });
        })
        .finally(() => {
            setIsProfileSubmitting(false);
        });
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    if (!user || !user.email) return;

    setIsPasswordSubmitting(true);

    try {
      const credential = EmailAuthProvider.credential(user.email, data.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, data.newPassword);
      toast({
        title: 'Success',
        description: 'Your password has been updated successfully.',
      });
      passwordForm.reset();
    } catch (error: any) {
        console.error(error);
        let description = 'An unexpected error occurred.';
        if (error.code === 'auth/wrong-password') {
            description = 'The current password you entered is incorrect.';
            passwordForm.setError('currentPassword', { type: 'manual', message: description });
        } else if (error.code === 'auth/too-many-requests') {
            description = 'Too many attempts. Please try again later.';
        }
        toast({
            variant: 'destructive',
            title: 'Error updating password',
            description,
        });
    } finally {
        setIsPasswordSubmitting(false);
    }
  };

  const handleMarketingToggle = (checked: boolean) => {
    if (!user) return;
    const userDocRef = doc(firestore, 'users', user.uid);
    updateDocumentNonBlocking(userDocRef, { marketingOptIn: checked })
        .then(() => {
            toast({ title: 'Preferences Updated', description: `You will ${checked ? '' : 'not '}receive marketing updates.` });
        })
        .catch(() => {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update preferences.' });
        });
  }

  const isLoading = isProfileLoading || areBranchesLoading;

  if (isLoading) {
    return (
        <div className="flex h-full items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading Profile...</p>
        </div>
    );
  }

  const nameParts = userProfile?.fullName?.split(' ') || [];
  const fallback =
    nameParts.length > 1 && nameParts[0] && nameParts[1]
      ? `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}`
      : user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <>
      <div className="p-4 md:p-6 grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1 flex flex-col gap-6">
            <Card>
                <CardContent className="pt-6 flex flex-col items-center text-center">
                    <div className="relative mb-4">
                        <Avatar className="h-24 w-24 border-2 border-primary">
                            <AvatarImage src={userProfile?.avatarUrl || user?.photoURL || undefined} alt={userProfile?.fullName || ''} />
                            <AvatarFallback className="text-3xl">{fallback}</AvatarFallback>
                        </Avatar>
                        <Button variant="outline" size="icon" className="absolute -bottom-2 -right-2 rounded-full bg-background h-8 w-8">
                           <Camera className="h-4 w-4" />
                           <span className="sr-only">Upload photo</span>
                        </Button>
                    </div>
                    <h2 className="text-xl font-semibold">{userProfile?.fullName}</h2>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                    {userRole && <p className="text-sm text-muted-foreground capitalize mt-1">{userRole.name}</p>}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><User className="w-5 h-5" /> Personal Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <Form {...profileForm}>
                        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                            <FormField
                            control={profileForm.control}
                            name="fullName"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl>
                                    <Input {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <Button type="submit" disabled={isProfileSubmitting} className="w-full">
                                {isProfileSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><Building2 className="w-5 h-5" /> Assigned Branches</CardTitle>
                </CardHeader>
                <CardContent>
                    {assignedBranches.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                           {assignedBranches.map(branch => (
                               <Badge key={branch.id} variant="secondary">{branch.name}</Badge>
                           ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">Not assigned to any branches.</p>
                    )}
                </CardContent>
            </Card>
        </div>
        <div className="md:col-span-2 flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><KeyRound className="w-5 h-5" /> Change Password</CardTitle>
                    <CardDescription>For your security, we recommend using a strong password that you don&apos;t use elsewhere.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Form {...passwordForm}>
                        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                             <FormField
                            control={passwordForm.control}
                            name="currentPassword"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Current Password</FormLabel>
                                <FormControl>
                                    <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                             <FormField
                            control={passwordForm.control}
                            name="newPassword"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>New Password</FormLabel>
                                <FormControl>
                                    <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <Button type="submit" disabled={isPasswordSubmitting}>
                                {isPasswordSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Update Password
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><Bell className="w-5 h-5" /> Preferences</CardTitle>
                    <CardDescription>Manage your communication and notification settings.</CardDescription>
                </CardHeader>
                <CardContent>
                   <div className="flex items-center justify-between space-x-2 rounded-md border p-4">
                        <div className="space-y-0.5">
                            <Label htmlFor="marketing-emails">Marketing Emails</Label>
                            <p className="text-sm text-muted-foreground">
                                Receive emails about new products and features.
                            </p>
                        </div>
                        <Switch
                            id="marketing-emails"
                            checked={userProfile?.marketingOptIn}
                            onCheckedChange={handleMarketingToggle}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </>
  );
}
