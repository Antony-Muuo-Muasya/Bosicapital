'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page's sole purpose is to redirect to the /dashboard page.
// This is to resolve the routing conflict where two pages mapped to `/`.
export default function RedirectToDashboard() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p>Redirecting...</p>
    </div>
  );
}
