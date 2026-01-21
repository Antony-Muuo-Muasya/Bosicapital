'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useUserProfile } from '@/firebase';
import { Loader2 } from 'lucide-react';

// This page's sole purpose is to redirect to the correct dashboard.
export default function AppRootPage() {
  const router = useRouter();
  const { userProfile, isLoading } = useUserProfile();

  useEffect(() => {
    if (isLoading) return;

    if (userProfile?.roleId === 'user') {
      router.replace('/my-dashboard');
    } else {
      router.replace('/dashboard');
    }
  }, [router, userProfile, isLoading]);

  return (
    <div className="flex h-screen items-center justify-center gap-4">
       <Loader2 className="h-8 w-8 animate-spin text-primary" />
       <p className="text-muted-foreground">Redirecting...</p>
     </div>
  );
}
