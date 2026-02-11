
'use client';
import { AppShell } from '@/components/app-shell';
import { useFirestore, useUserProfile, setDocumentNonBlocking } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { doc, collection, getDocs, writeBatch, query, where, setDoc } from 'firebase/firestore';
import type { User as AppUser, Role, Branch } from '@/lib/types';

const staffRoles = ['admin', 'manager', 'loan_officer'];
const routePermissions = {
    '/users': ['admin'],
    '/settings': ['admin'],
    '/branches': ['admin', 'manager'],
    '/loan-products': ['admin'], // Assuming this will be a page
    '/approvals': ['manager'],
    '/disbursements': ['admin'],
    '/reports': ['admin', 'manager'],
};

type ProtectedRoute = keyof typeof routePermissions;

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, isLoading, userRole } = useUserProfile();
  const router = useRouter();
  const pathname = usePathname();
  const firestore = useFirestore();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (userProfile) {
        // Redirect non-staff users away from the staff portal
        if (!staffRoles.includes(userProfile.roleId)) {
            router.replace('/my-dashboard');
            return;
        }

        // Check page-level permissions for staff
        const requiredRoles = routePermissions[pathname as ProtectedRoute];
        if (requiredRoles && !requiredRoles.includes(userProfile.roleId)) {
            router.replace('/access-denied');
            return;
        }
    }
  }, [user, userProfile, isLoading, router, firestore, pathname]);
  
  if (isLoading || !userProfile) {
    return (
      <div className="flex h-screen items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Final check to prevent rendering children before redirect
  if (!staffRoles.includes(userProfile.roleId) || (routePermissions[pathname as ProtectedRoute] && !routePermissions[pathname as ProtectedRoute]!.includes(userProfile.roleId))) {
    return (
        <div className="flex h-screen items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      );
  }

  return <AppShell>{children}</AppShell>;
}
