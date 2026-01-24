'use client';
import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUserProfile } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Branch } from '@/lib/types';
import { getBranchColumns } from './branch-columns';
import { Button } from '../ui/button';
import { PlusCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { AddBranchDialog } from './add-branch-dialog';
import { EditBranchDialog } from './edit-branch-dialog';

export function BranchManagement() {
    const firestore = useFirestore();
    const { userProfile, isLoading: isProfileLoading } = useUserProfile();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

    const branchesQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile) return null;
        
        const branchesCol = collection(firestore, 'branches');
        const orgId = userProfile.organizationId;

        if (userProfile.roleId === 'admin') {
            return query(branchesCol, where('organizationId', '==', orgId));
        }

        if (userProfile.roleId === 'manager' && userProfile.branchIds?.length > 0) {
            return query(branchesCol, where('organizationId', '==', orgId), where('id', 'in', userProfile.branchIds));
        }

        // For other roles or managers with no branches, return a query that finds nothing.
        return query(branchesCol, where('id', '==', 'no-branches-found'));
    }, [firestore, userProfile]);

    const { data: branches, isLoading: areBranchesLoading } = useCollection<Branch>(branchesQuery);
    const isLoading = isProfileLoading || areBranchesLoading;

    const handleEdit = (branch: Branch) => {
        setEditingBranch(branch);
    }
    
    const columns = useMemo(() => getBranchColumns(handleEdit), []);

    const table = useReactTable({
        data: branches || [],
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    const canAddBranches = userProfile?.roleId === 'admin';

  return (
    <>
    <Card className="mt-4">
        <CardHeader>
            <div className='flex items-center justify-between'>
                <div>
                    <CardTitle>Branch Management</CardTitle>
                    <CardDescription>Manage your organization's branches.</CardDescription>
                </div>
                {canAddBranches && (
                    <Button onClick={() => setIsAddDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Branch
                    </Button>
                )}
            </div>
        </CardHeader>
        <CardContent>
            <div className="rounded-md border">
                <Table>
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                        ))}
                    </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {isLoading && Array.from({length: 3}).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                            <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                        </TableRow>
                    ))}
                    {!isLoading && table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                        ))}
                    </TableRow>
                    ))}
                    {!isLoading && (!branches || branches.length === 0) && (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center">
                                No branches found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
        </CardContent>
    </Card>
    {canAddBranches && <AddBranchDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />}
    {editingBranch && (
        <EditBranchDialog 
            branch={editingBranch}
            open={!!editingBranch}
            onOpenChange={(open) => !open && setEditingBranch(null)}
        />
    )}
    </>
  );
}
