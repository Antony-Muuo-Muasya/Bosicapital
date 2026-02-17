'use client';
import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUserProfile } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Target, Branch } from '@/lib/types';
import { getTargetsColumns } from './targets-columns';
import { Button } from '../ui/button';
import { PlusCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { AddTargetDialog } from './add-target-dialog';
import { EditTargetDialog } from './edit-target-dialog';

export function TargetsManagement() {
    const firestore = useFirestore();
    const { userProfile, isLoading: isProfileLoading } = useUserProfile();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingTarget, setEditingTarget] = useState<Target | null>(null);

    const isSuperAdmin = userProfile?.roleId === 'superadmin';
    const organizationId = userProfile?.organizationId;

    const targetsQuery = useMemoFirebase(() => {
        if (!firestore || !organizationId) return null;
        return query(collection(firestore, 'targets'), where('organizationId', '==', organizationId));
    }, [firestore, organizationId]);

    const branchesQuery = useMemoFirebase(() => {
        if (!firestore || !organizationId) return null;
        return query(collection(firestore, 'branches'), where('organizationId', '==', organizationId));
    }, [firestore, organizationId]);

    const { data: targets, isLoading: areTargetsLoading } = useCollection<Target>(targetsQuery);
    const { data: branches, isLoading: areBranchesLoading } = useCollection<Branch>(branchesQuery);
    
    const isLoading = isProfileLoading || areTargetsLoading || areBranchesLoading;

    const branchesMap = useMemo(() => {
        if (!branches) return new Map();
        return new Map(branches.map(b => [b.id, b.name]));
    }, [branches]);

    const handleEdit = (target: Target) => {
        setEditingTarget(target);
    }
    
    const columns = useMemo(() => getTargetsColumns(handleEdit, branchesMap), [branchesMap]);

    const table = useReactTable({
        data: targets || [],
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

  return (
    <>
    <Card className="mt-4">
        <CardHeader>
            <div className='flex items-center justify-between'>
                <div>
                    <CardTitle>Performance Targets</CardTitle>
                    <CardDescription>Set and manage performance goals for your branches.</CardDescription>
                </div>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Target
                </Button>
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
                            {columns.map(col => <TableCell key={col.id}><Skeleton className="h-5 w-full" /></TableCell>)}
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
                    {!isLoading && (!targets || targets.length === 0) && (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center">
                                No targets have been set.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
        </CardContent>
    </Card>
    <AddTargetDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} branches={branches || []} />
    {editingTarget && (
        <EditTargetDialog 
            target={editingTarget}
            branches={branches || []}
            open={!!editingTarget}
            onOpenChange={(open) => !open && setEditingTarget(null)}
        />
    )}
    </>
  );
}
