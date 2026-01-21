'use client';
import { AppShell } from '@/components/app-shell';
import { useFirestore, useUserProfile, setDocumentNonBlocking } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { doc, collection, getDocs, writeBatch, query, where, setDoc } from 'firebase/firestore';
import type { User as AppUser, Role, Branch } from '@/lib/types';


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

        const seedRoles = async () => {
            const rolesColRef = collection(firestore, 'roles');
            const rolesSnapshot = await getDocs(rolesColRef);

            if (rolesSnapshot.empty) {
                const batch = writeBatch(firestore);
                const organizationId = userProfile?.organizationId || 'org_1';
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
                    const newRole = { ...roleData, organizationId };
                    batch.set(docRef, newRole);
                });
                
                await batch.commit();
                console.log('Default roles have been seeded to Firestore.');
            }
        };

        const seedMainBranch = async () => {
            const branchesColRef = collection(firestore, 'branches');
            const mainBranchQuery = query(branchesColRef, where('isMain', '==', true));
            const mainBranchSnapshot = await getDocs(mainBranchQuery);
        
            if (mainBranchSnapshot.empty) {
                const mainBranchRef = doc(firestore, 'branches', 'branch-1');
                const organizationId = userProfile?.organizationId || 'org_1';
                const newMainBranch = {
                    id: 'branch-1',
                    name: 'Headquarters',
                    location: 'Main City',
                    isMain: true,
                    organizationId,
                };
                await setDoc(mainBranchRef, newMainBranch);
                console.log('Main branch has been seeded to Firestore.');
            }
        };

        // Run seeding, then proceed with user profile logic.
        seedRoles().then(seedMainBranch).then(() => {
            if (!userProfile) {
                const userDocRef = doc(firestore, 'users', user.uid);
                // SCENARIO 1: First-time user. Create their profile document.
                const newUserProfile: AppUser = {
                    id: user.uid,
                    organizationId: 'org_1', // Default organization
                    fullName: user.displayName || 'New User',
                    email: user.email!,
                    roleId: 'loan_officer', // All new users are loan officers by default
                    branchIds: ['branch-1'], // Default branch
                    status: 'active',
                    createdAt: new Date().toISOString(),
                };
                
                setDocumentNonBlocking(userDocRef, newUserProfile, { merge: false });
            }
        }).catch(console.error);
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
