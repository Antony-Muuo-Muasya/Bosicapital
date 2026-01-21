'use client';
import { AppShell } from '@/components/app-shell';
import { useFirestore, useUserProfile, setDocumentNonBlocking } from '@/firebase';
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

    // If auth is done, we have a user, but we don't have a firestore profile for them.
    // This means it's their first login and we need to create their document.
    if (firestore && user && !userProfile && !isLoading) {
        const userDocRef = doc(firestore, 'users', user.uid);
        
        // Default new users to 'admin' to facilitate the creation of the first admin account.
        // In a real app, this would be handled by a more robust user invitation system.
        const newUserProfile: AppUser = {
            id: user.uid,
            organizationId: 'org_1', // Default organization
            fullName: user.displayName || 'New User',
            email: user.email!,
            roleId: 'admin', // Default role for new sign-ups
            branchIds: ['branch-1'], // Default branch
            status: 'active',
            createdAt: new Date().toISOString(),
        };
        
        // Use the non-blocking version to create the document
        setDocumentNonBlocking(userDocRef, newUserProfile, { merge: false });
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
