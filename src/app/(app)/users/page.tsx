'use client';
import { PageHeader } from '@/components/page-header';
import { useUserProfile, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import type { User as AppUser, Role } from '@/lib/types';
import { collection } from 'firebase/firestore';
import { UsersDataTable } from '@/components/users/users-data-table';
import { getUserColumns } from '@/components/users/columns';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { EditUserDialog } from '@/components/users/edit-user-dialog';

export default function UsersPage() {
  const { userRole, isLoading: isProfileLoading } = useUserProfile();
  const router = useRouter();
  const firestore = useFirestore();

  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const rolesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'roles') : null, [firestore]);

  const { data: users, isLoading: areUsersLoading } = useCollection<AppUser>(usersQuery);
  const { data: roles, isLoading: areRolesLoading } = useCollection<Role>(rolesQuery);

  const isLoading = isProfileLoading || areUsersLoading || areRolesLoading;

  useEffect(() => {
    if (!isProfileLoading && userRole?.id !== 'admin') {
      router.push('/access-denied');
    }
  }, [isProfileLoading, userRole, router]);

  const usersWithRoles = useMemo(() => {
    if (!users || !roles) return [];
    const rolesMap = new Map(roles.map(r => [r.id, r.name]));
    return users.map(user => ({
      ...user,
      roleName: rolesMap.get(user.roleId) || user.roleId,
    }));
  }, [users, roles]);

  const handleEditUser = (user: AppUser) => {
    setEditingUser(user);
  };
  
  const columns = useMemo(() => getUserColumns(handleEditUser), []);

  if (isProfileLoading || userRole?.id !== 'admin') {
    return null;
  }
  
  return (
    <>
      <PageHeader title="User Management" description="Create, edit, and manage user accounts and roles.">
        <Button onClick={() => alert("To add a new user, have them create an account via the signup page. They will appear here once registered, and you can then manage their role.")}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add User
        </Button>
      </PageHeader>
      <div className="p-4 md:p-6">
        {isLoading && <div className="border shadow-sm rounded-lg p-8 text-center text-muted-foreground">Loading users...</div>}
        {!isLoading && <UsersDataTable columns={columns} data={usersWithRoles} />}
      </div>
      {editingUser && roles && (
        <EditUserDialog
            user={editingUser}
            roles={roles}
            open={!!editingUser}
            onOpenChange={(open) => !open && setEditingUser(null)}
        />
      )}
    </>
  );
}
