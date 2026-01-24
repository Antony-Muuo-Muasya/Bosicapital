'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { Users, Landmark, ShieldCheck } from 'lucide-react';

interface ManagerStatsCardsProps {
  outstandingLoanBalance: number;
  performingLoanBalance: number;
  totalCustomers: number;
  isLoading: boolean;
}

const StatCard = ({ title, value, icon: Icon, isLoading }: { title: string, value: string | number, icon: React.ElementType, isLoading: boolean }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-3/4" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
);

export function ManagerStatsCards({
  outstandingLoanBalance,
  performingLoanBalance,
  totalCustomers,
  isLoading,
}: ManagerStatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
        <StatCard 
            title="Outstanding Loan Balance"
            value={formatCurrency(outstandingLoanBalance, 'KES')}
            icon={Landmark}
            isLoading={isLoading}
        />
        <StatCard 
            title="Performing Loan Balance"
            value={formatCurrency(performingLoanBalance, 'KES')}
            icon={ShieldCheck}
            isLoading={isLoading}
        />
        <StatCard 
            title="Total Customers"
            value={totalCustomers}
            icon={Users}
            isLoading={isLoading}
        />
    </div>
  );
}
