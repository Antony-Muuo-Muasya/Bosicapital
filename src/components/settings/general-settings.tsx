'use client';
import { useUserProfile } from '@/providers/user-profile';
import { getOrganization, updateOrganization } from '@/actions/organizations';
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
import { useState, useMemo, useEffect, useCallback } from 'react';
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
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [organization, setOrganization] = useState<any | null>(null);
    const [isOrgLoading, setIsOrgLoading] = useState(true);

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

    const fetchOrg = useCallback(async () => {
        if (!userProfile?.organizationId) return;
        setIsOrgLoading(true);
        try {
            const res = await getOrganization(userProfile.organizationId);
            if (res.success && res.organization) {
                setOrganization(res.organization);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsOrgLoading(false);
        }
    }, [userProfile]);

    useEffect(() => {
        if (!isProfileLoading && userProfile) {
            fetchOrg();
        }
    }, [isProfileLoading, userProfile, fetchOrg]);

    useEffect(() => {
        if (organization) {
            form.reset({
                name: organization.name || 'Bosi Capital Limited',
                logoUrl: organization.logoUrl || '',
                slogan: organization.slogan || 'Capital that works',
                phone: organization.phone || '0755595565',
                address: organization.address || 'Wayi Plaza B14, 7th Floor, along Galana Road, Kilimani, Nairobi',
            });
        }
    }, [organization, form]);

    const watchedLogoUrl = form.watch('logoUrl');

    const displayLogoUrl = useMemo(() => {
        return transformImageUrl(watchedLogoUrl);
    }, [watchedLogoUrl]);

    const onSubmit = async (values: SettingsFormData) => {
        if (!userProfile?.organizationId) return;
        setIsSubmitting(true);
        
        try {
            const res = await updateOrganization(userProfile.organizationId, values);
            if (res.success) {
                toast({ title: 'Success', description: 'Organization settings updated.' });
                setOrganization({ ...organization, ...values });
            } else {
                 toast({ variant: 'destructive', title: 'Error', description: res.error || 'Failed to update settings.' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update settings.' });
        } finally {
            setIsSubmitting(false);
        }
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
                                    <FormDescription>Must be a public HTTPS link (e.g. from an image hosting service or Cloudinary).</FormDescription>
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
