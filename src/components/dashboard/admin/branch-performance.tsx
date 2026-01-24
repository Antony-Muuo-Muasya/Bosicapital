'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import type { Loan, Branch } from '@/lib/types';
import { useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface BranchPerformanceProps {
    loans: Loan[] | null;
    branches: Branch[] | null;
    isLoading: boolean;
}

export function BranchPerformance({ loans, branches, isLoading }: BranchPerformanceProps) {
    
    const branchStats = useMemo(() => {
        if (!loans || !branches) return [];
        const stats = branches.map(branch => {
            const branchLoans = loans.filter(l => l.branchId === branch.id);
            const totalPrincipal = branchLoans.reduce((sum, l) => sum + l.principal, 0);
            return {
                ...branch,
                loanCount: branchLoans.length,
                totalPrincipal,
            }
        });
        return stats.sort((a, b) => b.totalPrincipal - a.totalPrincipal);
    }, [loans, branches]);

    if (isLoading) {
        return (
            <Card className="lg:col-span-1">
                <CardHeader>
                     <Skeleton className="h-6 w-1/2" />
                     <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                    </div>
                </CardContent>
            </Card>
        )
    }

  return (
    <Card className="lg:col-span-1">
        <CardHeader>
            <CardTitle>Branch Performance</CardTitle>
            <CardDescription>Key metrics by branch.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Branch</TableHead>
                        <TableHead>Loans</TableHead>
                        <TableHead className="text-right">Total Principal</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                     {branchStats.map(branch => (
                        <TableRow key={branch.id}>
                            <TableCell>
                                <div className="font-medium">{branch.name}</div>
                                <div className="text-sm text-muted-foreground">{branch.location}</div>
                            </TableCell>
                            <TableCell>{branch.loanCount}</TableCell>
                            <TableCell className="text-right">{formatCurrency(branch.totalPrincipal, 'KES')}</TableCell>
                        </TableRow>
                    ))}
                    {!isLoading && branchStats.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center">
                                No branch data available.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
  );
}
