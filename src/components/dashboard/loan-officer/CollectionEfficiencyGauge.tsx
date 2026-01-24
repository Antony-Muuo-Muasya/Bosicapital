'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

interface CollectionEfficiencyGaugeProps {
    value: number;
    isLoading: boolean;
}

export function CollectionEfficiencyGauge({ value, isLoading }: CollectionEfficiencyGaugeProps) {
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-4 w-full" />
                </CardContent>
            </Card>
        );
    }
    
  return (
    <Card>
        <CardHeader className='pb-2'>
            <CardTitle>Collection Efficiency</CardTitle>
            <CardDescription className='text-xs'>Repayments collected vs. principal disbursed.</CardDescription>
        </CardHeader>
        <CardContent>
             <div className="flex justify-between items-center mb-1 text-sm">
                <p className="font-semibold text-xl">{value.toFixed(1)}%</p>
            </div>
            <Progress value={value} />
        </CardContent>
    </Card>
  );
}
