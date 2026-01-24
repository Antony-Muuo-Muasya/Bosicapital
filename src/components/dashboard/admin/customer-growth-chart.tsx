'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface CustomerGrowthChartProps {
    data: { name: string; total: number }[] | undefined | null;
    isLoading: boolean;
}

export function CustomerGrowthChart({ data, isLoading }: CustomerGrowthChartProps) {
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
                   <CardTitle>Customer Growth</CardTitle>
                   <CardDescription>New registered borrowers per month.</CardDescription>
               </CardHeader>
               <CardContent className="flex h-[250px] items-center justify-center text-muted-foreground">
                   No new borrower data available.
               </CardContent>
           </Card>
       );
   }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Customer Growth</CardTitle>
            <CardDescription>New registered borrowers per month.</CardDescription>
        </CardHeader>
        <CardContent>
            <ChartContainer config={{ total: { label: "New Borrowers", color: "hsl(var(--chart-2))" } }} className="h-[250px] w-full">
                <AreaChart data={data} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        />
                    <YAxis 
                        tickFormatter={(value) => value.toString()}
                        allowDecimals={false}
                    />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                    <defs>
                        <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0.1}/>
                        </linearGradient>
                    </defs>
                    <Area dataKey="total" type="monotone" fill="url(#fillTotal)" stroke="var(--color-total)" />
                </AreaChart>
            </ChartContainer>
        </CardContent>
    </Card>
  );
}
