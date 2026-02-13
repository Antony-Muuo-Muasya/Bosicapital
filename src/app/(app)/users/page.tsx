'use client';
import { PageHeader } from '@/components/page-header';
import { useCollection, useFirestore, useMemoFirebase, useUserProfile } from '@/firebase';
import { useEffect, useState, useMemo, useCallback } from 'react';
import type { User as AppUser, Role, Branch } from '@/lib/types';
import { collection, query, where } from 'firebase/firestore';
import { UsersDataTable } from '@/components/users/users-data-table';
import { getUserColumns } from '@/components/users/columns';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { EditUserDialog } from '@/components/users/edit-user-dialog';
import { AddStaffDialog } from '@/components/users/add-staff-dialog';

type UserWithRole = AppUser & { roleName: string };

export default function UsersPage() {
  const firestore = useFirestore();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();

  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [isAddStaffDialogOpen, setIsAddStaffDialogOpen] = useState(false);

  const isSuperAdmin = userProfile?.roleId === 'superadmin';

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    if (isSuperAdmin) return collection(firestore, 'users');
    if (userProfile.roleId !== 'admin') return null;
    return query(collection(firestore, 'users'), where('organizationId', '==', userProfile.organizationId));
  }, [firestore, userProfile, isSuperAdmin]);

  const rolesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'roles') : null, [firestore]);
  
  const branchesQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    if (isSuperAdmin) return collection(firestore, 'branches');
    return query(collection(firestore, 'branches'), where('organizationId', '==', userProfile.organizationId));
  }, [firestore, userProfile, isSuperAdmin]);


  const { data: users, isLoading: areUsersLoading } = useCollection<AppUser>(usersQuery);
  const { data: roles, isLoading: areRolesLoading } = useCollection<Role>(rolesQuery);
  const { data: branches, isLoading: areBranchesLoading } = useCollection<Branch>(branchesQuery);


  const isLoading = isProfileLoading || areUsersLoading || areRolesLoading || areBranchesLoading;


  const usersWithRoles: UserWithRole[] = useMemo(() => {
    if (!users || !roles) return [];
    const rolesMap = new Map(roles.map(r => [r.id, r.name]));
    return users.map(user => ({
      ...user,
      roleName: rolesMap.get(user.roleId) || user.roleId,
    }));
  }, [users, roles]);

  const handleEditUser = useCallback((user: UserWithRole) => {
    setEditingUser(user);
  }, []);
  
  const columns = useMemo(() => getUserColumns(handleEditUser), [handleEditUser]);
  
  return (
    <>
      <PageHeader title="User Management" description="Create, edit, and manage user accounts and roles.">
        <Button onClick={() => setIsAddStaffDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Staff User
        </Button>
      </PageHeader>
      <div className="p-4 md:p-6">
        {isLoading && <div className="border shadow-sm rounded-lg p-8 text-center text-muted-foreground">Loading users...</div>}
        {!isLoading && <UsersDataTable columns={columns} data={usersWithRoles} />}
      </div>
      {editingUser && roles && branches && (
        <EditUserDialog
            user={editingUser}
            roles={roles}
            branches={branches}
            open={!!editingUser}
            onOpenChange={(open) => !open && setEditingUser(null)}
        />
      )}
       <AddStaffDialog 
        open={isAddStaffDialogOpen} 
        onOpenChange={setIsAddStaffDialogOpen}
        roles={roles || []}
       />
    </>
  );
}
