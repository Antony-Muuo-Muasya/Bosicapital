'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Loan, Borrower } from '@/lib/types';
import { useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CircleDollarSign, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface RecentActivityProps {
    loans: Loan[] | null;
    borrowers: Borrower[] | null;
    isLoading: boolean;
}

export function RecentActivity({ loans, borrowers, isLoading }: RecentActivityProps) {
    
    const recentActivities = useMemo(() => {
        if (!loans || !borrowers) return [];

        const sortedLoans = [...loans].sort((a,b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());

        const recentLoans = sortedLoans.slice(0, 3).map(loan => ({
            type: 'Loan',
            id: loan.id,
            date: new Date(loan.issueDate),
            title: `New loan for ${formatCurrency(loan.principal, 'KES')}`,
            borrower: borrowers.find(b => b.id === loan.borrowerId)
        }));
        
        const recentBorrowers = borrowers
            .filter(b => b.registrationFeePaidAt)
            .sort((a, b) => new Date(b.registrationFeePaidAt!).getTime() - new Date(a.registrationFeePaidAt!).getTime())
            .slice(0, 2)
            .map(borrower => ({
                type: 'Borrower',
                id: borrower.id,
                date: new Date(borrower.registrationFeePaidAt!),
                title: `${borrower.fullName} was registered.`,
                borrower: borrower
            }));

        return [...recentLoans, ...recentBorrowers].sort((a,b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

    }, [loans, borrowers]);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                     <Skeleton className="h-6 w-1/2" />
                     <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        )
    }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>A log of recent organization events.</CardDescription>
        </CardHeader>
        <CardContent>
           {recentActivities.length > 0 ? (
            <div className="space-y-4">
                {recentActivities.map(activity => (
                    <div key={activity.id} className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded-full">
                           {activity.type === 'Loan' ? <CircleDollarSign className="h-5 w-5 text-muted-foreground" /> : <UserPlus className="h-5 w-5 text-muted-foreground" />}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium">{activity.title}</p>
                            <p className="text-xs text-muted-foreground">
                                {activity.borrower?.fullName} &middot; {formatDistanceToNow(activity.date, { addSuffix: true })}
                            </p>
                        </div>
                         <Avatar className="h-8 w-8">
                            <AvatarImage src={activity.borrower?.photoUrl} alt={activity.borrower?.fullName || ''} />
                            <AvatarFallback>{activity.borrower?.fullName.charAt(0)}</AvatarFallback>
                        </Avatar>
                    </div>
                ))}
            </div>
           ) : (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
                No recent activity to display.
            </div>
           )}
        </CardContent>
    </Card>
  );
}
