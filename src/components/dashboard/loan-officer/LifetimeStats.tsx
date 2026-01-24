'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { Briefcase, Landmark, HandCoins } from 'lucide-react';

interface LifetimeStatsProps {
    totalLoans: number;
    totalPrincipal: number;
    totalCollected: number;
    isLoading: boolean;
}

export function LifetimeStats({ totalLoans, totalPrincipal, totalCollected, isLoading }: LifetimeStatsProps) {

    const StatItem = ({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) => (
        <div className="flex items-center gap-4 text-sm">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
                <p className="text-muted-foreground">{title}</p>
                {isLoading ? <Skeleton className="h-5 w-24 mt-1" /> : <p className="font-semibold">{value}</p>}
            </div>
        </div>
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>Lifetime Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <StatItem title="Total Loans Issued" value={totalLoans} icon={Briefcase} />
                <StatItem title="Total Principal Disbursed" value={formatCurrency(totalPrincipal, 'KES')} icon={Landmark} />
                <StatItem title="Total Repayments Collected" value={formatCurrency(totalCollected, 'KES')} icon={HandCoins} />
            </CardContent>
        </Card>
    );
}
