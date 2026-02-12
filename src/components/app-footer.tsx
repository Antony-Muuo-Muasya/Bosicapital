'use client';

import { useUserProfile } from '@/firebase';
import { MapPin, Phone, Mail, Wallet } from 'lucide-react';

export function AppFooter() {
    const { organization } = useUserProfile();

    return (
        <footer className="bg-muted/40 text-muted-foreground border-t mt-auto">
            <div className="container py-6 flex flex-col md:flex-row justify-between items-center gap-6 text-sm">
                <p className="shrink-0 text-center md:text-left">&copy; {new Date().getFullYear()} {organization?.name}. All rights reserved.</p>
                <div className="flex items-center flex-wrap justify-center md:justify-end gap-x-6 gap-y-4">
                    {organization?.phone && (
                        <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            <a href={`tel:${organization.phone}`} className="hover:underline">{organization.phone}</a>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <a href="mailto:BOSILIMITED254@gmail.com" className="hover:underline">BOSILIMITED254@gmail.com</a>
                    </div>
                    <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        <span>Paybill: 4159879 (Use National ID)</span>
                    </div>
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
