'use client';
import { useEffect, useState } from 'react';
import { getBranchPerformance } from '@/actions/branches';
import { useUserProfile } from '@/providers/user-profile';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { TrendingUp, Users, Wallet, AlertCircle, CheckCircle } from 'lucide-react';

export function BranchPerformance() {
    const { userProfile } = useUserProfile();
    const [performance, setPerformance] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (userProfile?.organizationId) {
            setIsLoading(true);
            getBranchPerformance(userProfile.organizationId)
                .then(res => {
                    if (res.success && res.data) {
                        setPerformance(res.data);
                    }
                })
                .catch(console.error)
                .finally(() => setIsLoading(false));
        }
    }, [userProfile]);

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Highest Principal</CardTitle>
                        <Wallet className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            KES {Math.max(...performance.map(p => p.totalPrincipal), 0).toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {performance.find(p => p.totalPrincipal === Math.max(...performance.map(px => px.totalPrincipal), 0))?.name || 'All branches'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Best Collection</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {Math.max(...performance.map(p => p.collectionRate), 0).toFixed(1)}%
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {performance.find(p => p.collectionRate === Math.max(...performance.map(px => px.collectionRate), 0))?.name || 'All branches'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Most Borrowers</CardTitle>
                        <Users className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {Math.max(...performance.map(p => p.totalBorrowers), 0)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {performance.find(p => p.totalBorrowers === Math.max(...performance.map(px => px.totalBorrowers), 0))?.name || 'All branches'}
                        </p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Platform Defaults</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {performance.reduce((acc, p) => acc + p.overdueInstallments, 0)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Total overdue installments</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Branch Comparison</CardTitle>
                    <CardDescription>Performance breakdown across all active branches.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Branch Name</TableHead>
                                <TableHead className="text-right">Borrowers</TableHead>
                                <TableHead className="text-right">Active Loans</TableHead>
                                <TableHead className="text-right">Total Disbursed</TableHead>
                                <TableHead className="text-right">Total Collected</TableHead>
                                <TableHead className="text-right">Arrears</TableHead>
                                <TableHead className="text-right">Collection Rate</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {performance.map((p) => (
                                <TableRow key={p.id}>
                                    <TableCell className="font-medium">{p.name}</TableCell>
                                    <TableCell className="text-right">{p.totalBorrowers}</TableCell>
                                    <TableCell className="text-right">{p.activeLoans}</TableCell>
                                    <TableCell className="text-right font-mono text-xs">KES {p.totalPrincipal.toLocaleString()}</TableCell>
                                    <TableCell className="text-right font-mono text-xs">KES {p.totalCollected.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant={p.overdueInstallments > 0 ? "destructive" : "outline"} className="text-[10px]">
                                            {p.overdueInstallments}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <div className="h-2 w-16 bg-muted rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full ${p.collectionRate > 90 ? 'bg-green-500' : p.collectionRate > 70 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                                                    style={{ width: `${Math.min(p.collectionRate, 100)}%` }} 
                                                />
                                            </div>
                                            <span className="text-xs font-bold">{p.collectionRate.toFixed(1)}%</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
