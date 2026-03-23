'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useUserProfile } from '@/providers/user-profile';
import { Loader2 } from 'lucide-react';

// This page redirects to the correct dashboard based on auth state.
// It uses useUserProfile (session-aware) to handle auth-based redirection.
export default function AppRootPage() {
  const router = useRouter();
  const { user, isLoading } = useUserProfile();

  useEffect(() => {
    if (isLoading) return;
    if (user) {
      router.replace('/dashboard');
    }
  }, [router, user, isLoading]);

  return (
    <div className="flex h-screen items-center justify-center gap-4">
       <Loader2 className="h-8 w-8 animate-spin text-primary" />
     </div>
  );
}
