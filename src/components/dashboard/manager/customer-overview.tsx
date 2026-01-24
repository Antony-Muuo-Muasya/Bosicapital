'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { UserCheck, UserX } from 'lucide-react';

interface CustomerOverviewProps {
  activeCustomers: number;
  inactiveCustomers: number;
  isLoading: boolean;
}

export function CustomerOverview({ activeCustomers, inactiveCustomers, isLoading }: CustomerOverviewProps) {
  return (
    <Card>
        <CardHeader>
            <CardTitle>Customer Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
            <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-full">
                    <UserCheck className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <p className="text-muted-foreground">Active Customers</p>
                    {isLoading ? <Skeleton className="h-7 w-16" /> : <p className="text-2xl font-bold">{activeCustomers}</p>}
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="bg-muted p-3 rounded-full">
                     <UserX className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                    <p className="text-muted-foreground">Inactive Customers</p>
                    {isLoading ? <Skeleton className="h-7 w-16" /> : <p className="text-2xl font-bold">{inactiveCustomers}</p>}
                </div>
            </div>
        </CardContent>
    </Card>
  );
}
