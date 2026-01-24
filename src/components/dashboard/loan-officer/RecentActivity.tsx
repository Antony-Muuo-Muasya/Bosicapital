'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Loan, Borrower, Repayment } from '@/lib/types';
import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { UserPlus, CircleDollarSign, HandCoins } from 'lucide-react';

interface Activity {
    id: string;
    type: 'NEW_LOAN' | 'NEW_BORROWER' | 'REPAYMENT';
    date: Date;
    description: string;
    amount?: number;
}

interface RecentActivityProps {
    loans: Loan[] | null;
    borrowers: Borrower[] | null;
    repayments: Repayment[] | null;
    isLoading: boolean;
}

const iconMap = {
    NEW_LOAN: <CircleDollarSign className="h-5 w-5" />,
    NEW_BORROWER: <UserPlus className="h-5 w-5" />,
    REPAYMENT: <HandCoins className="h-5 w-5" />,
}

export function RecentActivity({ loans, borrowers, repayments, isLoading }: RecentActivityProps) {

    const activities = useMemo(() => {
        const allActivities: Activity[] = [];

        if (loans) {
            loans.forEach(l => allActivities.push({
                id: l.id,
                type: 'NEW_LOAN',
                date: new Date(l.issueDate),
                description: `New loan for ${l.borrowerId.substring(0,8)}...`,
                amount: l.principal
            }));
        }

        if (borrowers) {
             borrowers.forEach(b => {
                if (b.registrationFeePaidAt) {
                    allActivities.push({
                        id: b.id,
                        type: 'NEW_BORROWER',
                        date: new Date(b.registrationFeePaidAt),
                        description: `Registered ${b.fullName}`
                    })
                }
            });
        }
        
        if (repayments) {
            repayments.forEach(r => allActivities.push({
                id: r.id,
                type: 'REPAYMENT',
                date: new Date(r.paymentDate),
                description: `Payment from ${r.loanId.substring(0,8)}...`,
                amount: r.amount
            }));
        }

        return allActivities.sort((a,b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

    }, [loans, borrowers, repayments]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>My Recent Activity</CardTitle>
                <CardDescription>A log of your latest actions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoading && Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                
                {!isLoading && activities.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-10">No recent activity.</p>
                )}

                {!isLoading && activities.map(activity => (
                    <div key={activity.id} className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded-full text-muted-foreground">
                            {iconMap[activity.type]}
                        </div>
                        <div className="flex-1 text-sm">
                            <p className="font-medium">{activity.description}</p>
                            <p className="text-xs text-muted-foreground">{formatDistanceToNow(activity.date, { addSuffix: true })}</p>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
