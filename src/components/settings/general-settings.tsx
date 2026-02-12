'use client';
import { useUserProfile, useDoc, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Organization } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Skeleton } from '../ui/skeleton';
import { useState } from 'react';

const settingsSchema = z.object({
    name: z.string().min(1, 'Organization name is required.'),
    logoUrl: z.string().url('Must be a valid URL.').or(z.literal('')),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export function GeneralSettings() {
    const { userProfile, isLoading: isProfileLoading } = useUserProfile();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const orgRef = useMemoFirebase(() => {
        if (!firestore || !userProfile) return null;
        return doc(firestore, 'organizations', userProfile.organizationId);
    }, [firestore, userProfile]);

    const { data: organization, isLoading: isOrgLoading } = useDoc<Organization>(orgRef);

    const form = useForm<SettingsFormData>({
        resolver: zodResolver(settingsSchema),
        values: {
            name: organization?.name || '',
            logoUrl: organization?.logoUrl || '',
        },
    });

    const onSubmit = (values: SettingsFormData) => {
        if (!orgRef) return;
        setIsSubmitting(true);
        updateDocumentNonBlocking(orgRef, values)
            .then(() => {
                toast({ title: 'Success', description: 'Organization settings updated.' });
            })
            .catch(() => {
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to update settings.' });
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    }
    
    const isLoading = isProfileLoading || isOrgLoading;

    return (
        <Card className="mt-4">
            <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Manage your organization's branding and details.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-64 w-full" />
                ) : (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Organization Name</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="logoUrl"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Logo URL</FormLabel>
                                    <FormControl><Input placeholder="https://example.com/logo.png" {...field} /></FormControl>
                                    <FormDescription>The application will use this image as your logo. It must be a public URL.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <div>
                            <FormLabel>Current Logo Preview</FormLabel>
                            <div className="mt-2 p-4 border rounded-md flex items-center justify-center bg-muted/50 h-32">
                                {form.watch('logoUrl') ? (
                                    <Image src={form.watch('logoUrl')!} alt="Current Logo" width={80} height={80} className="object-contain" />
                                ) : (
                                    <p className="text-sm text-muted-foreground">No logo URL provided</p>
                                )}
                            </div>
                        </div>

                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Settings
                        </Button>
                    </form>
                </Form>
                )}
            </CardContent>
        </Card>
    );
}
