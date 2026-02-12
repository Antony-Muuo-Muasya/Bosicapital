'use client';

import { useUserProfile } from '@/firebase';
import { MapPin, Phone } from 'lucide-react';

export function AppFooter() {
    const { organization } = useUserProfile();

    return (
        <footer className="bg-muted/40 text-muted-foreground border-t mt-auto">
            <div className="container py-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
                <p>&copy; {new Date().getFullYear()} {organization?.name}. All rights reserved.</p>
                <div className="flex items-center flex-wrap justify-center gap-4 md:gap-6">
                    {organization?.phone && (
                        <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            <span>{organization.phone}</span>
                        </div>
                    )}
                     {organization?.address && (
                        <div className="flex items-center gap-2 text-center md:text-left">
                            <MapPin className="h-4 w-4" />
                            <span>{organization.address}</span>
                        </div>
                    )}
                </div>
            </div>
        </footer>
    );
}
