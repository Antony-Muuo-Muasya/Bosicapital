'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';

interface DisbursalTrendChartProps {
    data: { name: string; total: number }[] | undefined | null;
    isLoading: boolean;
}

export function DisbursalTrendChart({ data, isLoading }: DisbursalTrendChartProps) {
     if (isLoading) {
        return (
             <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent className="pt-4">
                     <Skeleton className="h-[250px] w-full" />
                </CardContent>
            </Card>
        );
    }
    
    if (!data || data.length === 0) {
        return (
           <Card>
               <CardHeader>
                   <CardTitle>Disbursal Trend</CardTitle>
                   <CardDescription>Monthly loan principal disbursal for your approved loans.</CardDescription>
               </CardHeader>
               <CardContent className="flex h-[250px] items-center justify-center text-muted-foreground">
                   No disbursal data available.
               </CardContent>
           </Card>
       );
   }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Disbursal Trend</CardTitle>
            <CardDescription>Monthly loan principal disbursal for your approved loans.</CardDescription>
        </CardHeader>
        <CardContent>
            <ChartContainer config={{ total: { label: "Disbursed", color: "hsl(var(--chart-1))" } }} className="h-[250px] w-full">
                <BarChart data={data} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        />
                    <YAxis 
                        tickFormatter={(value) => formatCurrency(Number(value), 'KES').replace('KES', '').replace('.00', '')}
                    />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value), 'KES')} />} />
                    <Bar dataKey="total" fill="var(--color-total)" radius={4} />
                </BarChart>
            </ChartContainer>
        </CardContent>
    </Card>
  );
}
