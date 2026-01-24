'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Pie, PieChart, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';

interface PortfolioMixChartProps {
    data: { name: string; value: number }[] | undefined | null;
    isLoading: boolean;
}

const CHART_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function PortfolioMixChart({ data, isLoading }: PortfolioMixChartProps) {
    
    const chartConfig = useMemo(() => {
        if (!data) return {};
        return data.reduce((acc, item, index) => {
            acc[item.name] = { label: item.name, color: CHART_COLORS[index % CHART_COLORS.length] };
            return acc;
        }, {} as any)
    }, [data]);

    if (isLoading) {
        return (
             <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                </CardHeader>
                <CardContent className="flex justify-center items-center h-[200px]">
                    <Skeleton className="h-32 w-32 rounded-full" />
                </CardContent>
            </Card>
        );
    }

    if (!data || data.length === 0) {
        return (
           <Card>
               <CardHeader>
                   <CardTitle>Loan Product Mix</CardTitle>
               </CardHeader>
               <CardContent className="flex h-[200px] items-center justify-center text-muted-foreground">
                   No loans to display.
               </CardContent>
           </Card>
       );
   }
    
  return (
    <Card>
        <CardHeader>
            <CardTitle>Loan Product Mix</CardTitle>
        </CardHeader>
        <CardContent>
            <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[200px]">
                <PieChart>
                    <ChartTooltip content={<ChartTooltipContent nameKey="value" />} />
                    <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                        const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                        return (percent > 0.05) ? (
                            <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-bold">
                                {`${(percent * 100).toFixed(0)}%`}
                            </text>
                        ) : null;
                    }}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                    </Pie>
                     <ChartLegend content={<ChartLegendContent nameKey="name" />} layout="vertical" align="right" verticalAlign="middle" />
                </PieChart>
            </ChartContainer>
        </CardContent>
    </Card>
  );
}
