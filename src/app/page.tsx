'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function Home() {
  const { data: session, status } = useSession();
  const isUserLoading = status === 'loading';
  const router = useRouter();

  useEffect(() => {
    if (isUserLoading) return;

    if (!session) {
      router.replace('/login');
    } else {
      router.replace('/dashboard');
    }
  }, [session, isUserLoading, router]);

  // Always show a simple spinner here – this page is purely a redirect gateway
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">Loading...</p>
    </div>
  );
}
