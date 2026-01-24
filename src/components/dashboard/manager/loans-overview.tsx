'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { CircleDollarSign, Calendar, AlertTriangle, Scale } from 'lucide-react';

interface LoansOverviewProps {
  disbursedLoans: number;
  loansDueToday: number;
  monthToDateArrears: number;
  outstandingTotalLoanArrears: number;
  isLoading: boolean;
}

const OverviewItem = ({ title, value, icon: Icon, isLoading }: { title: string, value: string | number, icon: React.ElementType, isLoading: boolean }) => (
    <div className='flex items-start gap-4'>
        <div className="bg-muted p-3 rounded-lg">
            <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {isLoading ? <Skeleton className="h-6 w-24 mt-1" /> : <p className="text-xl font-semibold">{value}</p>}
        </div>
    </div>
);

export function LoansOverview({
  disbursedLoans,
  loansDueToday,
  monthToDateArrears,
  outstandingTotalLoanArrears,
  isLoading,
}: LoansOverviewProps) {
  return (
    <Card>
        <CardHeader>
            <CardTitle>Loans Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
            <OverviewItem 
                title="Disbursed Loans"
                value={disbursedLoans}
                icon={CircleDollarSign}
                isLoading={isLoading}
            />
            <OverviewItem 
                title="Loans Due Today"
                value={loansDueToday}
                icon={Calendar}
                isLoading={isLoading}
            />
            <OverviewItem 
                title="Month To Date Arrears"
                value={formatCurrency(monthToDateArrears, 'KES')}
                icon={AlertTriangle}
                isLoading={isLoading}
            />
            <OverviewItem 
                title="Outstanding Total Loan Arrears"
                value={formatCurrency(outstandingTotalLoanArrears, 'KES')}
                icon={Scale}
                isLoading={isLoading}
            />
        </CardContent>
    </Card>
  );
}
