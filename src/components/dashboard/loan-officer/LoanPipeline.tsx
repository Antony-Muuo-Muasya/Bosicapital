'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Loan } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { useMemo } from 'react';
import { format } from 'date-fns';

interface LoanPipelineProps {
    loans: Loan[] | null;
    isLoading: boolean;
}

const PipelineCard = ({ name, amount, date }: { name: string, amount: number, date: string }) => (
    <div className="p-3 rounded-md border bg-background text-left">
        <p className="font-semibold text-sm truncate">{name}</p>
        <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>{formatCurrency(amount)}</span>
            <span>{date}</span>
        </div>
    </div>
);

export function LoanPipeline({ loans, isLoading }: LoanPipelineProps) {

    const { pending, active } = useMemo(() => {
        if (!loans) return { pending: [], active: [] };
        const pending = loans.filter(l => l.status === 'Pending Approval').sort((a,b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
        const active = loans.filter(l => l.status === 'Active').sort((a,b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
        return { pending, active };
    }, [loans]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>My Loan Pipeline</CardTitle>
                <CardDescription>A summary of your loan application statuses.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <h4 className="font-semibold text-center text-sm">Pending Approval ({pending.length})</h4>
                    <div className="space-y-2 p-2 rounded-md bg-muted min-h-[100px]">
                        {isLoading && <Skeleton className="h-16 w-full" />}
                        {!isLoading && pending.map(loan => (
                            <PipelineCard key={loan.id} name={loan.borrowerId.substring(0,8)} amount={loan.principal} date={format(new Date(loan.issueDate), 'MMM dd')} />
                        ))}
                    </div>
                </div>
                <div className="space-y-2">
                     <h4 className="font-semibold text-center text-sm">Active ({active.length})</h4>
                     <div className="space-y-2 p-2 rounded-md bg-muted min-h-[100px]">
                        {isLoading && <Skeleton className="h-16 w-full" />}
                        {!isLoading && active.map(loan => (
                            <PipelineCard key={loan.id} name={loan.borrowerId.substring(0,8)} amount={loan.principal} date={format(new Date(loan.issueDate), 'MMM dd')} />
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
