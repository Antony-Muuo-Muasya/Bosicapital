'use client';
import type { Branch } from '@/lib/types';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '../ui/button';
import { MoreHorizontal } from 'lucide-react';
import { useFirestore, deleteDocumentNonBlocking, useUserProfile } from '@/firebase';
import { doc } from 'firebase/firestore';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '../ui/badge';

const BranchActions = ({ branch, onEdit }: { branch: Branch, onEdit: (branch: Branch) => void }) => {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { userProfile } = useUserProfile();

  const handleDelete = () => {
    if (branch.isMain) {
        toast({ variant: 'destructive', title: 'Action Prohibited', description: 'Cannot delete the main branch.' });
        return;
    }
    if (confirm(`Are you sure you want to delete the "${branch.name}" branch?`)) {
      const branchDocRef = doc(firestore, 'branches', branch.id);
      deleteDocumentNonBlocking(branchDocRef)
        .then(() => toast({ title: 'Success', description: 'Branch deleted.' }))
        .catch(err => toast({ variant: 'destructive', title: 'Error', description: 'Could not delete branch.' }));
    }
  };

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
        <DropdownMenuItem onClick={() => onEdit(branch)}>
          Edit Branch
        </DropdownMenuItem>
        {userProfile?.roleId === 'admin' && (
            <DropdownMenuItem onClick={handleDelete} className="text-destructive" disabled={branch.isMain}>
                Delete Branch
            </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const getBranchColumns = (onEdit: (branch: Branch) => void): ColumnDef<Branch>[] => [
  {
    accessorKey: 'name',
    header: 'Branch Name',
    cell: ({ row }) => {
        const branch = row.original;
        return (
            <div className="flex items-center gap-2">
                <span>{branch.name}</span>
                {branch.isMain && <Badge>Main</Badge>}
            </div>
        )
    }
  },
  {
    accessorKey: 'location',
    header: 'Location',
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const branch = row.original;
      return <BranchActions branch={branch} onEdit={onEdit} />;
    },
  },
];
