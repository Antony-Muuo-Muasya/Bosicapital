'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Pie, PieChart, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface LoanStatusChartProps {
    data: { name: string; value: number, fill: string }[] | undefined | null;
    isLoading: boolean;
}

export function LoanStatusChart({ data, isLoading }: LoanStatusChartProps) {
    if (isLoading) {
        return (
             <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent className="flex justify-center items-center h-[250px]">
                    <Skeleton className="h-48 w-48 rounded-full" />
                </CardContent>
            </Card>
        );
    }

    if (!data || data.length === 0) {
         return (
            <Card>
                <CardHeader>
                    <CardTitle>My Portfolio Status</CardTitle>
                    <CardDescription>Distribution of your approved loans by status.</CardDescription>
                </CardHeader>
                <CardContent className="flex h-[250px] items-center justify-center text-muted-foreground">
                    No loan data to display.
                </CardContent>
            </Card>
        );
    }
    
  return (
    <Card>
        <CardHeader>
            <CardTitle>My Portfolio Status</CardTitle>
            <CardDescription>Distribution of your approved loans by status.</CardDescription>
        </CardHeader>
        <CardContent>
            <ChartContainer config={{}} className="mx-auto aspect-square h-[250px]">
                <PieChart>
                    <ChartTooltip content={<ChartTooltipContent nameKey="value" />} />
                    <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {data.map((entry) => (
                            <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                        ))}
                    </Pie>
                </PieChart>
            </ChartContainer>
        </CardContent>
    </Card>
  );
}
