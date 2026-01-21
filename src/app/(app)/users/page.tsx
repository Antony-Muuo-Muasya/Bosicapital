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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function UsersPage() {
  const { userRole, isLoading: isProfileLoading } = useUserProfile();
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();

  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [signupUrl, setSignupUrl] = useState('');

  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const rolesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'roles') : null, [firestore]);

  const { data: users, isLoading: areUsersLoading } = useCollection<AppUser>(usersQuery);
  const { data: roles, isLoading: areRolesLoading } = useCollection<Role>(rolesQuery);

  const isLoading = isProfileLoading || areUsersLoading || areRolesLoading;

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSignupUrl(`${window.location.origin}/signup`);
    }
  }, []);
  
  useEffect(() => {
    if (!isProfileLoading && userRole?.id !== 'admin') {
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: "You don't have permission to view the user management page.",
      });
      router.replace('/dashboard');
    }
  }, [isProfileLoading, userRole, router, toast]);

  if (isProfileLoading || userRole?.id !== 'admin') {
    return (
        <div className="flex h-full flex-1 items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Verifying permissions...</p>
        </div>
    );
  }
  
  return (
    <>
      <PageHeader title="User Management" description="Create, edit, and manage user accounts and roles.">
        <Button onClick={() => setIsAddUserDialogOpen(true)}>
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
       <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
            <DialogTitle>How to Add a New User</DialogTitle>
            <DialogDescription>
                To maintain security, new users must create their own accounts.
            </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-2 text-sm">
                <div className='space-y-2'>
                    <Label htmlFor="signup-link" className='font-medium'>1. Share the signup link</Label>
                    <p className='text-xs text-muted-foreground'>Direct the new user to the signup page. You can copy this link:</p>
                    <Input
                        id="signup-link"
                        readOnly
                        value={signupUrl}
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                </div>
                 <div className='space-y-1'>
                    <p className='font-medium'>2. User creates an account</p>
                    <p className='text-xs text-muted-foreground'>The user will fill in their name, email, and password.</p>
                </div>
                <div className='space-y-1'>
                    <p className='font-medium'>3. Manage the new user</p>
                    <p className='text-xs text-muted-foreground'>Once they sign up, they will appear here. You can then edit their role and details.</p>
                </div>
            </div>
            <DialogFooter className="sm:justify-end">
                <Button type="button" onClick={() => setIsAddUserDialogOpen(false)}>Done</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
