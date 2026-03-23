'use client';

import type { User as AppUser } from '@/lib/types';
import { ColumnDef } from '@tanstack/react-table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '../ui/button';
import { MoreHorizontal } from 'lucide-react';
import { useUserProfile } from '@/providers/user-profile';
import { updateUser, deleteUser } from '@/actions/users';
import { Badge } from '../ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { Row } from '@tanstack/react-table';

type UserWithRole = AppUser & { roleName: string };

const UserActions = ({ user, onEdit, onRefresh }: { user: UserWithRole, onEdit: (user: UserWithRole) => void, onRefresh: () => void }) => {
  const { user: currentUser } = useUserProfile();
  const { toast } = useToast();

  const handleStatusToggle = async () => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    if (confirm(`Are you sure you want to ${newStatus} this user?`)) {
      const res = await updateUser(user.id, { status: newStatus });
      if (res.success) {
        toast({ title: 'Success', description: 'User status updated.' });
        onRefresh();
      } else {
        toast({ title: 'Error', variant: 'destructive', description: res.error || 'Failed to update user status.' });
      }
    }
  };
  
  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete ${user.fullName}? This will permanently delete the user and their login credentials.`)) {
      const res = await deleteUser(user.id);
      if (res.success) {
        toast({ title: 'Success', description: 'User deleted successfully.' });
        onRefresh();
      } else {
        toast({ title: 'Error', variant: 'destructive', description: res.error || 'Failed to delete user.' });
      }
    }
  };

  const isCurrentUser = currentUser?.uid === user.id;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onEdit(user)} disabled={isCurrentUser}>
          Edit User
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleStatusToggle} disabled={isCurrentUser}>
          {user.status === 'active' ? 'Suspend User' : 'Reactivate User'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDelete} disabled={isCurrentUser} className="text-destructive">
          Delete User
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const UserNameCell = ({ row }: { row: Row<UserWithRole> }) => {
    const user = row.original;
    return (
    <div className="flex items-center gap-3">
        <Avatar className="hidden h-9 w-9 sm:flex">
        <AvatarImage src={user.avatarUrl} alt={user.fullName} />
        <AvatarFallback>{user.fullName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="grid gap-0.5">
        <span className="font-medium">{user.fullName}</span>
        <span className="text-xs text-muted-foreground">{user.email}</span>
        </div>
    </div>
    );
};

const StatusCell = ({ row }: { row: Row<UserWithRole> }) => {
    const status = row.getValue('status') as string;
    return (
    <Badge variant={status === 'active' ? 'default' : 'secondary'} className={`capitalize ${status === 'active' ? 'bg-green-500/20 text-green-700 border-green-500/30 hover:bg-green-500/30' : ''}`}>
        {status}
    </Badge>
    );
};

const CreatedAtCell = ({ row }: { row: Row<UserWithRole> }) => {
    const date = row.getValue('createdAt') as string;
    return new Date(date).toLocaleDateString();
};


export const getUserColumns = (onEdit: (user: UserWithRole) => void, onRefresh: () => void): ColumnDef<UserWithRole>[] => [
  {
    accessorKey: 'fullName',
    header: 'Name',
    cell: UserNameCell,
    filterFn: (row, id, value) => {
        const name = row.original.fullName.toLowerCase();
        const email = row.original.email.toLowerCase();
        const filterValue = String(value).toLowerCase();
        return name.includes(filterValue) || email.includes(filterValue);
    }
  },
  {
    accessorKey: 'roleName',
    header: 'Role',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: StatusCell,
  },
  {
    accessorKey: 'createdAt',
    header: 'Date Added',
    cell: CreatedAtCell,
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const user = row.original;
      return <UserActions user={user} onEdit={onEdit} onRefresh={onRefresh} />;
    },
  },
];
