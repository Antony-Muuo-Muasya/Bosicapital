'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Line, ComposedChart } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';

interface DualTrendChartProps {
    data: { name: string; disbursed: number; collected: number }[] | undefined | null;
    isLoading: boolean;
}

const chartConfig = {
    disbursed: { label: 'Disbursed', color: 'hsl(var(--chart-1))' },
    collected: { label: 'Collected', color: 'hsl(var(--chart-2))' },
}

export function DualTrendChart({ data, isLoading }: DualTrendChartProps) {
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
                   <CardTitle>Monthly Trends</CardTitle>
                   <CardDescription>Disbursal and collection performance.</CardDescription>
               </CardHeader>
               <CardContent className="flex h-[250px] items-center justify-center text-muted-foreground">
                   No data available.
               </CardContent>
           </Card>
       );
   }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Monthly Trends</CardTitle>
            <CardDescription>Disbursal and collection performance.</CardDescription>
        </CardHeader>
        <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <ComposedChart data={data} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
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
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="disbursed" fill="var(--color-disbursed)" radius={4} />
                    <Line dataKey="collected" type="monotone" stroke="var(--color-collected)" strokeWidth={2} dot={false} />
                </ComposedChart>
            </ChartContainer>
        </CardContent>
    </Card>
  );
}
