'use client';
import type { Target } from '@/lib/types';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '../ui/button';
import { MoreHorizontal } from 'lucide-react';
import { useFirestore, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';

const typeLabels: Record<Target['type'], string> = {
    disbursal_amount: 'Disbursal Amount',
    new_borrowers: 'New Borrowers',
    portfolio_value: 'Portfolio Value',
    collection_rate: 'Collection Rate'
}

const TargetActions = ({ target, onEdit }: { target: Target, onEdit: (target: Target) => void }) => {
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete the "${target.name}" target?`)) {
      const targetDocRef = doc(firestore, 'targets', target.id);
      deleteDocumentNonBlocking(targetDocRef)
        .then(() => toast({ title: 'Success', description: 'Target deleted.' }))
        .catch(err => toast({ variant: 'destructive', title: 'Error', description: 'Could not delete target.' }));
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
        <DropdownMenuItem onClick={() => onEdit(target)}>
          Edit Target
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDelete} className="text-destructive">
            Delete Target
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const getTargetsColumns = (onEdit: (target: Target) => void, branchesMap: Map<string, string>): ColumnDef<Target>[] => [
  {
    accessorKey: 'name',
    header: 'Target Name',
  },
  {
    accessorKey: 'branchId',
    header: 'Branch',
    cell: ({ row }) => branchesMap.get(row.original.branchId) || 'Unknown Branch'
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => typeLabels[row.original.type] || row.original.type
  },
  {
    accessorKey: 'value',
    header: 'Value',
    cell: ({ row }) => {
        const target = row.original;
        if (target.type === 'disbursal_amount' || target.type === 'portfolio_value') {
            return formatCurrency(target.value);
        }
        return target.value;
    }
  },
  {
    id: 'period',
    header: 'Period',
    cell: ({ row }) => {
        const target = row.original;
        return `${format(new Date(target.startDate), 'MMM d, yyyy')} - ${format(new Date(target.endDate), 'MMM d, yyyy')}`
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const target = row.original;
      return <TargetActions target={target} onEdit={onEdit} />;
    },
  },
];
