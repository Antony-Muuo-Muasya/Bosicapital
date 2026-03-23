'use client';
import { PageHeader } from '@/components/page-header';
import { useUserProfile } from '@/providers/user-profile';
import { useEffect, useState, useMemo, useCallback } from 'react';
import type { User as AppUser, Role, Branch } from '@/lib/types';
import { UsersDataTable } from '@/components/users/users-data-table';
import { getUserColumns } from '@/components/users/columns';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { EditUserDialog } from '@/components/users/edit-user-dialog';
import { AddStaffDialog } from '@/components/users/add-staff-dialog';
import { getUsers, getRoles, getBranches } from '@/actions/users';

type UserWithRole = AppUser & { roleName: string };

export default function UsersPage() {
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();

  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [isAddStaffDialogOpen, setIsAddStaffDialogOpen] = useState(false);

  const [users, setUsers] = useState<AppUser[] | null>(null);
  const [roles, setRoles] = useState<Role[] | null>(null);
  const [branches, setBranches] = useState<Branch[] | null>(null);
  const [areDataLoading, setAreDataLoading] = useState(true);

  const isSuperAdmin = userProfile?.roleId === 'superadmin';

  const fetchData = useCallback(async () => {
    if (!userProfile) return;
    setAreDataLoading(true);

    try {
      const [usersRes, rolesRes, branchesRes] = await Promise.all([
        getUsers(userProfile.organizationId, userProfile.roleId),
        getRoles(userProfile.organizationId, isSuperAdmin),
        getBranches(userProfile.organizationId, isSuperAdmin)
      ]);

      if (usersRes.success) setUsers(usersRes.users as any);
      if (rolesRes.success) setRoles(rolesRes.roles as any);
      if (branchesRes.success) setBranches(branchesRes.branches as any);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setAreDataLoading(false);
    }
  }, [userProfile, isSuperAdmin]);

  useEffect(() => {
    if (!isProfileLoading && userProfile) {
      fetchData();
    }
  }, [isProfileLoading, userProfile, fetchData, isAddStaffDialogOpen]);

  const isLoading = isProfileLoading || areDataLoading;

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
  
  const columns = useMemo(() => getUserColumns(handleEditUser, fetchData), [handleEditUser, fetchData]);
  
  const canAddStaff = userProfile?.roleId === 'admin' || userProfile?.roleId === 'manager' || userProfile?.roleId === 'superadmin';

  return (
    <>
      <PageHeader title="User Management" description="Create, edit, and manage user accounts and roles.">
        {canAddStaff && (
            <Button onClick={() => setIsAddStaffDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Staff User
            </Button>
        )}
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
            onOpenChange={(open) => {
              if (!open) setEditingUser(null);
              if (!open) fetchData();
            }}
        />
      )}
       <AddStaffDialog 
        open={isAddStaffDialogOpen} 
        onOpenChange={setIsAddStaffDialogOpen}
        roles={roles || []}
        branches={branches || []}
       />
    </>
  );
}
