'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Info } from 'lucide-react';

interface CollectionOverviewProps {
    todaysCollectionRate: number;
    monthlyCollectionRate: number;
    isLoading: boolean;
}

export function CollectionOverview({ todaysCollectionRate, monthlyCollectionRate, isLoading }: CollectionOverviewProps) {
  if (isLoading) {
      return (
          <Card>
              <CardHeader>
                  <CardTitle>Collection Overview</CardTitle>
                  <CardDescription>Performance on collecting loan repayments.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                  <div className="space-y-2">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-full" />
                  </div>
                  <div className="space-y-2">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-full" />
                  </div>
              </CardContent>
          </Card>
      )
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Collection Overview</CardTitle>
            <CardDescription>Performance on collecting loan repayments.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div>
                <div className="flex justify-between items-center mb-1">
                    <p className="text-sm font-medium">Today's Collection Rate</p>
                    <p className="text-sm font-semibold">{todaysCollectionRate.toFixed(1)}%</p>
                </div>
                <Progress value={todaysCollectionRate} />
            </div>
            <div>
                <div className="flex justify-between items-center mb-1">
                    <p className="text-sm font-medium">Monthly Collection Rate</p>
                    <p className="text-sm font-semibold">{monthlyCollectionRate.toFixed(1)}%</p>
                </div>
                <Progress value={monthlyCollectionRate} />
            </div>
        </CardContent>
    </Card>
  );
}
