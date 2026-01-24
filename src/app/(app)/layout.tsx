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
    '/approvals': ['admin'],
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

    // One-time data seeding for new deployments
    if (firestore && user) {
        const seedRoles = async () => {
            const rolesColRef = collection(firestore, 'roles');
            const rolesSnapshot = await getDocs(rolesColRef);

            if (rolesSnapshot.empty) {
                const batch = writeBatch(firestore);
                const organizationId = 'org_1';
                const rolesToSeed: Omit<Role, 'organizationId' | 'id'> & { id: Role['id'] }[] = [
                    {
                      id: 'admin', name: 'Administrator', systemRole: true,
                      permissions: ['user.create', 'user.edit', 'user.delete', 'user.view', 'role.manage', 'branch.manage', 'loan.create', 'loan.approve', 'loan.view', 'repayment.create', 'reports.view'],
                    },
                    {
                      id: 'manager', name: 'Manager', systemRole: true,
                      permissions: ['user.view', 'branch.manage', 'loan.create', 'loan.approve', 'loan.view', 'repayment.create', 'reports.view'],
                    },
                    {
                      id: 'loan_officer', name: 'Loan Officer', systemRole: true,
                      permissions: ['loan.create', 'loan.view', 'repayment.create'],
                    },
                    {
                      id: 'user', name: 'User', systemRole: true, // For borrowers
                      permissions: ['borrower.view.own'],
                    },
                ];

                rolesToSeed.forEach(roleData => {
                    const docRef = doc(firestore, 'roles', roleData.id);
                    batch.set(docRef, { ...roleData, organizationId });
                });
                
                await batch.commit();
            }
        };

        const seedMainBranch = async () => {
            const branchesColRef = collection(firestore, 'branches');
            const mainBranchQuery = query(branchesColRef, where('isMain', '==', true));
            const mainBranchSnapshot = await getDocs(mainBranchQuery);
        
            if (mainBranchSnapshot.empty) {
                const mainBranchRef = doc(firestore, 'branches', 'branch-1');
                await setDoc(mainBranchRef, {
                    id: 'branch-1', name: 'Headquarters', location: 'Main City', isMain: true, organizationId: 'org_1',
                });
            }
        };

        // The user creation logic has been moved to the /signup page to prevent
        // race conditions that were incorrectly overwriting user roles.
        seedRoles().then(seedMainBranch).catch(console.error);
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
