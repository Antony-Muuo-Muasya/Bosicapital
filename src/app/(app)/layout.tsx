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

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
      return;
    }

    if (firestore && user && !isLoading) {
        const userDocRef = doc(firestore, 'users', user.uid);

        // Scenario 1: First-time login, create the profile
        if (!userProfile) {
            const roleId = user.email === 'tonniehmuas@gmail.com' ? 'admin' : 'loan_officer';
            
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
            
            setDocumentNonBlocking(userDocRef, newUserProfile, { merge: false });
        } 
        // Scenario 2: User exists, but is the designated admin and doesn't have the admin role. Update them.
        else if (user.email === 'tonniehmuas@gmail.com' && userProfile.roleId !== 'admin') {
             // Use non-blocking update to change the role
            updateDocumentNonBlocking(userDocRef, { roleId: 'admin' });
        }

        // Scenario 3: Admin is logged in, check if roles need to be seeded.
        if (userProfile?.roleId === 'admin') {
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
