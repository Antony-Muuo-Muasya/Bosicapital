'use client';

import { useUserProfile } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { user, userProfile, isLoading } = useUserProfile();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) {
      return; // Wait until user profile and role are loaded
    }

    if (!user) {
      router.replace('/login');
    } else if (userProfile) {
      if (userProfile.roleId === 'user') {
        router.replace('/my-dashboard');
      } else {
        router.replace('/dashboard');
      }
    }
    // If user exists but userProfile is still loading, the hook will re-trigger
  }, [user, userProfile, isLoading, router]);

  return (
    <div className="flex h-screen items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">Loading...</p>
    </div>
  );
}
