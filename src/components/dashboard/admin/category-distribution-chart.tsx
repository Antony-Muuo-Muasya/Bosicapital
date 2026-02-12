'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Pie, PieChart, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';

interface CategoryDistributionChartProps {
    data: { name: string; value: number, fill: string }[] | undefined | null;
    isLoading: boolean;
}

export function CategoryDistributionChart({ data, isLoading }: CategoryDistributionChartProps) {
    
    const chartConfig = useMemo(() => {
        if (!data) return {};
        return data.reduce((acc, item) => {
            acc[item.name] = { label: item.name, color: item.fill };
            return acc;
        }, {} as any)
    }, [data]);

    if (isLoading) {
        return (
             <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent className="flex justify-center items-center h-[250px]">
                    <Skeleton className="h-40 w-40 rounded-full" />
                </CardContent>
            </Card>
        );
    }

    if (!data || data.length === 0) {
        return (
           <Card>
               <CardHeader>
                   <CardTitle>Loan Categories</CardTitle>
                   <CardDescription>Distribution of loans by category.</CardDescription>
               </CardHeader>
               <CardContent className="flex h-[250px] items-center justify-center text-muted-foreground">
                   No category data to display.
               </CardContent>
           </Card>
       );
   }
    
  return (
    <Card>
        <CardHeader>
            <CardTitle>Loan Categories</CardTitle>
            <CardDescription>Distribution of loans by category.</CardDescription>
        </CardHeader>
        <CardContent>
            <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[250px]">
                <PieChart>
                    <ChartTooltip content={<ChartTooltipContent nameKey="value" />} />
                    <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={50} labelLine={false} label={false}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Pie>
                     <ChartLegend
                        content={<ChartLegendContent nameKey="name" />}
                        verticalAlign="bottom"
                        layout="horizontal"
                    />
                </PieChart>
            </ChartContainer>
        </CardContent>
    </Card>
  );
}
