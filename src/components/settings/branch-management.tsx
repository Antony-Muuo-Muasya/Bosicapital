'use client';
import { useMemo, useState } from 'react';
import { useUserProfile } from '@/providers/user-profile';
import { getBranches } from '@/actions/branches';
import { useEffect, useCallback } from 'react';
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
import { BranchUsersDialog } from './branch-users-dialog';

export function BranchManagement() {
    const { userProfile, isLoading: isProfileLoading } = useUserProfile();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
    const [viewingUsersBranch, setViewingUsersBranch] = useState<Branch | null>(null);

    const isSuperAdmin = userProfile?.roleId === 'superadmin';

    const [branches, setBranches] = useState<Branch[]>([]);
    const [areBranchesLoading, setAreBranchesLoading] = useState(true);

    const fetchBranches = useCallback(async () => {
        if (!userProfile) return;
        setAreBranchesLoading(true);
        try {
            const res = await getBranches(userProfile.organizationId);
            if (res.success && res.branches) {
                let filtered = res.branches;
                if (!isSuperAdmin) {
                    if (userProfile.roleId === 'manager' && userProfile.branchIds?.length > 0) {
                        filtered = res.branches.filter((b: any) => userProfile.branchIds.includes(b.id));
                    } else if (userProfile.roleId !== 'admin') {
                        filtered = [];
                    }
                }
                setBranches(filtered as Branch[]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setAreBranchesLoading(false);
        }
    }, [userProfile, isSuperAdmin]);

    useEffect(() => {
        if (!isProfileLoading && userProfile) {
            fetchBranches();
        }
    }, [isProfileLoading, userProfile, fetchBranches, isAddDialogOpen]);

    const isLoading = isProfileLoading || areBranchesLoading;

    const handleEdit = (branch: Branch) => {
        setEditingBranch(branch);
    }

    const handleViewUsers = (branch: Branch) => {
        setViewingUsersBranch(branch);
    }
    
    const columns = useMemo(() => getBranchColumns(handleEdit, handleViewUsers, fetchBranches), [fetchBranches]);

    const table = useReactTable({
        data: branches || [],
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    const canAddBranches = userProfile?.roleId === 'admin' || userProfile?.roleId === 'superadmin';

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
            onOpenChange={(open) => {
                if (!open) {
                    setEditingBranch(null);
                    fetchBranches();
                }
            }}
        />
    )}
    {viewingUsersBranch && (
        <BranchUsersDialog 
            branch={viewingUsersBranch}
            open={!!viewingUsersBranch}
            onOpenChange={(open) => {
                if (!open) {
                    setViewingUsersBranch(null);
                }
            }}
        />
    )}
    </>
  );
}
