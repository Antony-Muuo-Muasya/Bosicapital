'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import type { Loan, Borrower } from '@/lib/types';
import { useMemo } from 'react';
import { startOfMonth } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { Target as TargetIcon, Users } from 'lucide-react';


interface PerformanceTrackerProps {
  loans: Loan[] | null;
  borrowers: Borrower[] | null;
  targets: any[] | null;
  isLoading: boolean;
}

export function PerformanceTracker({ loans, borrowers, targets, isLoading }: PerformanceTrackerProps) {

    const { disbursedThisMonth, newBorrowersThisMonth } = useMemo(() => {
        if (!loans || !borrowers) return { disbursedThisMonth: 0, newBorrowersThisMonth: 0 };

        const start = startOfMonth(new Date());

        const disbursedThisMonth = loans
            .filter(l => {
                if (l.status !== 'Active') return false;
                const [year, month, day] = l.issueDate.split('-').map(Number);
                const issueDate = new Date(year, month - 1, day);
                return issueDate >= start;
            })
            .reduce((sum, l) => sum + l.principal, 0);

        const newBorrowersThisMonth = borrowers
            .filter(b => b.registrationFeePaidAt && new Date(b.registrationFeePaidAt) >= start)
            .length;
        
        return { disbursedThisMonth, newBorrowersThisMonth };

    }, [loans, borrowers]);

    const activeTargets = useMemo(() => {
        if (!targets) return { disbursal: 500000, borrowers: 10 };
        
        const now = new Date();
        const current = targets.filter(t => {
            const start = new Date(t.startDate);
            const end = new Date(t.endDate);
            return now >= start && now <= end;
        });

        return {
            disbursal: current.filter(t => t.type === 'disbursal_amount').reduce((sum, t) => sum + t.value, 0) || 500000,
            borrowers: current.filter(t => t.type === 'new_borrowers').reduce((sum, t) => sum + t.value, 0) || 10
        };
    }, [targets]);

    const disbursalGoal = activeTargets.disbursal;
    const borrowerGoal = activeTargets.borrowers;

    const disbursalProgress = (disbursedThisMonth / disbursalGoal) * 100;
    const borrowerProgress = (newBorrowersThisMonth / borrowerGoal) * 100;

    if (isLoading) {
        return (
            <Card>
                <CardHeader><CardTitle>Monthly Performance</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader><CardTitle>Monthly Performance</CardTitle></CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <div className="flex justify-between items-center mb-1 text-sm">
                        <p className="font-medium flex items-center gap-2"><TargetIcon className="w-4 h-4 text-muted-foreground" /> Disbursal Goal</p>
                        <p className="text-muted-foreground">{formatCurrency(disbursedThisMonth)} / <span className="font-semibold text-foreground">{formatCurrency(disbursalGoal)}</span></p>
                    </div>
                    <Progress value={disbursalProgress} />
                </div>
                 <div>
                    <div className="flex justify-between items-center mb-1 text-sm">
                        <p className="font-medium flex items-center gap-2"><Users className="w-4 h-4 text-muted-foreground" /> New Borrowers Goal</p>
                        <p className="text-muted-foreground">{newBorrowersThisMonth} / <span className="font-semibold text-foreground">{borrowerGoal}</span></p>
                    </div>
                    <Progress value={borrowerProgress} />
                </div>
            </CardContent>
        </Card>
    );
}
