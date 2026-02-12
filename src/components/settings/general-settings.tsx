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
import { useState, useMemo } from 'react';
import { transformImageUrl } from '@/lib/utils';

const settingsSchema = z.object({
    name: z.string().min(1, 'Organization name is required.'),
    logoUrl: z.string().url('Must be a valid URL.').or(z.literal('')).refine(
        (url) => !url.startsWith('gs://'),
        { message: 'This is a storage path, not a public URL. Please use the HTTPS "Download URL" from Firebase Storage.' }
    ),
    slogan: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
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
            name: organization?.name || 'Bosi Capital Limited',
            logoUrl: organization?.logoUrl || '',
            slogan: organization?.slogan || 'Capital that works',
            phone: organization?.phone || '0755595565',
            address: organization?.address || 'Wayi Plaza B14, 7th Floor, along Galana Road, Kilimani, Nairobi',
        },
    });

    const watchedLogoUrl = form.watch('logoUrl');

    const displayLogoUrl = useMemo(() => {
        return transformImageUrl(watchedLogoUrl);
    }, [watchedLogoUrl]);

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
                            name="slogan"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Slogan</FormLabel>
                                    <FormControl><Input placeholder="Your company slogan" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Customer Care Number</FormLabel>
                                    <FormControl><Input placeholder="e.g., 0712345678" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Company Address</FormLabel>
                                    <FormControl><Input placeholder="e.g., Wayi Plaza, Galana Road, Nairobi" {...field} /></FormControl>
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
                                    <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                                    <FormDescription>Must be a public HTTPS link. For Firebase Storage, use the "Download URL".</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <div>
                            <FormLabel>Current Logo Preview</FormLabel>
                            <div className="mt-2 p-4 border rounded-md flex items-center justify-center bg-muted/50 h-48">
                                {displayLogoUrl ? (
                                    <Image src={displayLogoUrl} alt="Current Logo" width={160} height={160} className="object-contain" />
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
