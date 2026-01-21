'use client';
import { AppShell } from '@/components/app-shell';
import { useFirestore, useUserProfile, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { doc } from 'firebase/firestore';
import type { User as AppUser } from '@/lib/types';


export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, isLoading } = useUserProfile();
  const router = useRouter();
  const firestore = useFirestore();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
      return;
    }

    if (firestore && user && !isLoading) {
        const userDocRef = doc(firestore, 'users', user.uid);

        // Scenario 1: First-time login, create the profile
        if (!userProfile) {
            const roleId = user.email === 'tonniehmuas@gmail.com' ? 'admin' : 'loan_officer';
            
            const newUserProfile: AppUser = {
                id: user.uid,
                organizationId: 'org_1', // Default organization
                fullName: user.displayName || 'New User',
                email: user.email!,
                roleId: roleId,
                branchIds: ['branch-1'], // Default branch
                status: 'active',
                createdAt: new Date().toISOString(),
            };
            
            setDocumentNonBlocking(userDocRef, newUserProfile, { merge: false });
        } 
        // Scenario 2: User exists, but is the designated admin and doesn't have the admin role. Update them.
        else if (user.email === 'tonniehmuas@gmail.com' && userProfile.roleId !== 'admin') {
             // Use non-blocking update to change the role
            updateDocumentNonBlocking(userDocRef, { roleId: 'admin' });
        }
    }
  }, [user, userProfile, isLoading, router, firestore]);

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // This can happen if a user is created in Auth but their profile document in Firestore
  // hasn't been created yet. We wait until the profile is loaded.
  if (!userProfile) {
     return (
      <div className="flex h-screen items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Finalizing setup...</p>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
