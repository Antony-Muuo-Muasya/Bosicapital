'use client';
import { AppShell } from '@/components/app-shell';
import { useUserProfile } from '@/providers/user-profile';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const staffRoles = ['superadmin', 'admin', 'manager', 'loan_officer'];
const routePermissions: Record<string, string[]> = {
    '/users': ['superadmin', 'admin', 'manager'],
    '/settings': ['superadmin', 'admin'],
    '/branches': ['superadmin', 'admin', 'manager'],
    '/loan-products': ['superadmin', 'admin'],
    '/approvals': ['superadmin', 'manager'],
    '/disbursements': ['superadmin', 'admin'],
    '/reports': ['superadmin', 'admin', 'manager'],
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, userProfile, isLoading } = useUserProfile();
  const router = useRouter();
  const pathname = usePathname();

  // Guard 1: Redirect unauthenticated users to login
  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  // Guard 2: Once profile is available apply role-based routing
  useEffect(() => {
    if (isLoading || !userProfile) return;
    
    if (!staffRoles.includes(userProfile.roleId)) {
      router.replace('/my-dashboard');
      return;
    }
    
    const requiredRoles = routePermissions[pathname];
    if (requiredRoles && !requiredRoles.includes(userProfile.roleId)) {
      router.replace('/access-denied');
    }
  }, [userProfile, isLoading, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // No user → redirect is in progress
  if (!user) return null;

  return <AppShell>{children}</AppShell>;
}
