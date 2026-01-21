'use client';
import { AppShell } from '@/components/app-shell';
import { useFirestore, useUserProfile, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { doc, collection, getDocs, writeBatch } from 'firebase/firestore';
import type { User as AppUser, Role } from '@/lib/types';


export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, isLoading } = useUserProfile();
  const router = useRouter();
  const firestore = useFirestore();

  // This useEffect handles all one-time setup and correction logic.
  useEffect(() => {
    // Redirect to login if not authenticated and loading is complete.
    if (!isLoading && !user) {
      router.push('/login');
      return;
    }

    // Only proceed if services are available and user is loaded.
    if (firestore && user && !isLoading) {
        const userDocRef = doc(firestore, 'users', user.uid);

        if (!userProfile) {
            // SCENARIO 1: First-time user. Create their profile document.
            const roleId = user.email === 'admin@adoo.app' ? 'admin' : 'loan_officer';
            
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
            
            // Use a non-blocking write. The UI will show a loader until the profile is available.
            setDocumentNonBlocking(userDocRef, newUserProfile, { merge: false });

        } else {
            // SCENARIO 2: User exists. Check if they are the designated admin and need a role update.
            if (user.email === 'admin@adoo.app' && userProfile.roleId !== 'admin') {
                // Use a non-blocking update. The UI will show a loader until the role is corrected.
                updateDocumentNonBlocking(userDocRef, { roleId: 'admin' });
            }

            // SCENARIO 3: If the current user is an admin, check if system roles need to be seeded.
            if (userProfile.roleId === 'admin') {
                const seedRoles = async () => {
                    const rolesColRef = collection(firestore, 'roles');
                    const rolesSnapshot = await getDocs(rolesColRef);

                    if (rolesSnapshot.empty) {
                        const batch = writeBatch(firestore);
                        const rolesToSeed: Omit<Role, 'organizationId'>[] = [
                            {
                              id: 'admin',
                              name: 'Administrator',
                              systemRole: true,
                              permissions: [
                                'user.create', 'user.edit', 'user.delete', 'user.view', 'role.manage', 
                                'branch.manage', 'loan.create', 'loan.approve', 'loan.view', 
                                'repayment.create', 'reports.view'
                              ],
                            },
                            {
                              id: 'manager',
                              name: 'Manager',
                              systemRole: true,
                              permissions: [
                                'user.view', 'branch.manage', 'loan.create', 'loan.approve', 'loan.view', 
                                'repayment.create', 'reports.view'
                              ],
                            },
                            {
                              id: 'loan_officer',
                              name: 'Loan Officer',
                              systemRole: true,
                              permissions: ['loan.create', 'loan.view', 'repayment.create'],
                            },
                            {
                              id: 'auditor',
                              name: 'Auditor',
                              systemRole: true,
                              permissions: ['loan.view', 'reports.view', 'user.view'],
                            },
                        ];

                        rolesToSeed.forEach(roleData => {
                            const docRef = doc(firestore, 'roles', roleData.id);
                            const newRole = { ...roleData, organizationId: userProfile.organizationId };
                            batch.set(docRef, newRole);
                        });
                        
                        await batch.commit();
                        console.log('Default roles have been seeded to Firestore.');
                    }
                };

                seedRoles().catch(console.error);
            }
        }
    }
  }, [user, userProfile, isLoading, router, firestore]);
  
  // Render blocking logic based on auth and profile state.
  
  if (isLoading || !user) {
    // Primary loading state while checking auth.
    return (
      <div className="flex h-screen items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!userProfile) {
    // User is authenticated, but their profile document is not yet available.
    // This state occurs for first-time users while their profile is being created.
    return (
     <div className="flex h-screen items-center justify-center gap-4">
       <Loader2 className="h-8 w-8 animate-spin text-primary" />
       <p className="text-muted-foreground">Finalizing setup...</p>
     </div>
   );
  }

  // If the designated admin user's role is not yet 'admin', show a loader.
  // This prevents rendering child pages with incorrect permissions during the role update.
  const isDesignatedAdmin = user.email === 'admin@adoo.app';
  if (isDesignatedAdmin && userProfile.roleId !== 'admin') {
    return (
        <div className="flex h-screen items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Updating permissions...</p>
        </div>
    );
  }

  // All checks passed, render the main application shell.
  return <AppShell>{children}</AppShell>;
}
