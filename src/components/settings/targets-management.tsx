'use client';
import { useMemo, useState } from 'react';
import { useUserProfile } from '@/firebase';
import { useEffect, useCallback } from 'react';
import { getTargets } from '@/actions/targets';
import { getBranches } from '@/actions/branches';
import { getUsers } from '@/actions/users';
import type { Target, Branch, User as AppUser } from '@/lib/types';
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
    const { userProfile, isLoading: isProfileLoading } = useUserProfile();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingTarget, setEditingTarget] = useState<any | null>(null);
    const organizationId = userProfile?.organizationId;

    const [targets, setTargets] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [areDataLoading, setAreDataLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!organizationId) return;
        setAreDataLoading(true);
        try {
            const [targetsRes, branchesRes, usersRes] = await Promise.all([
                getTargets(organizationId),
                getBranches(organizationId),
                getUsers(organizationId)
            ]);
            
            if (targetsRes.success) setTargets(targetsRes.targets as any[]);
            if (branchesRes.success) setBranches(branchesRes.branches as any[]);
            if (usersRes.success && usersRes.users) {
                // Filter to only manager and loan_officer
                const filteredUsers = usersRes.users.filter((u: any) => u.roleId === 'manager' || u.roleId === 'loan_officer');
                setUsers(filteredUsers);
            }
        } catch(err) {
            console.error(err);
        } finally {
            setAreDataLoading(false);
        }
    }, [organizationId]);

    useEffect(() => {
        if (!isProfileLoading && organizationId) {
            fetchData();
        }
    }, [isProfileLoading, organizationId, fetchData, isAddDialogOpen]);

    const isLoading = isProfileLoading || areDataLoading;

    const branchesMap = useMemo(() => {
        if (!branches) return new Map();
        return new Map(branches.map(b => [b.id, b.name]));
    }, [branches]);

    const usersMap = useMemo(() => {
        if (!users) return new Map();
        return new Map(users.map(u => [u.id, u.fullName]));
    }, [users]);

    const handleEdit = (target: Target) => {
        setEditingTarget(target);
    }
    
    const columns = useMemo(() => getTargetsColumns(handleEdit, branchesMap, usersMap, fetchData), [branchesMap, usersMap, fetchData]);

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
                    <CardDescription>Set and manage performance goals for your branches and staff.</CardDescription>
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
                            {columns.map((col, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
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
    <AddTargetDialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if(!open) fetchData();
    }} branches={branches || []} users={users || []} />
    {editingTarget && (
        <EditTargetDialog 
            target={editingTarget}
            branches={branches || []}
            users={users || []}
            open={!!editingTarget}
            onOpenChange={(open) => {
                if (!open) {
                    setEditingTarget(null);
                    fetchData();
                }
            }}
        />
    )}
    </>
  );
}
