'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Pie, PieChart, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import type { User, Role } from '@/lib/types';
import { useMemo } from 'react';

interface UserRolesChartProps {
    users: User[] | null;
    roles: Role[] | null;
    isLoading: boolean;
}

const CHART_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export function UserRolesChart({ users, roles, isLoading }: UserRolesChartProps) {

    const roleDistribution = useMemo(() => {
        if (!users || !roles) return [];
        const rolesMap = new Map(roles.map(r => [r.id, r.name]));
        const counts = users.reduce((acc, user) => {
            const roleName = rolesMap.get(user.roleId) || 'Unknown';
            acc[roleName] = (acc[roleName] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(counts).map(([name, value]) => ({ name, value }));

    }, [users, roles]);

    if (isLoading) {
        return (
             <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent className="flex justify-center items-center h-[200px]">
                    <Skeleton className="h-32 w-32 rounded-full" />
                </CardContent>
            </Card>
        );
    }

  return (
    <Card>
        <CardHeader>
            <CardTitle>User Roles</CardTitle>
            <CardDescription>Distribution of users by role.</CardDescription>
        </CardHeader>
        <CardContent>
            <ChartContainer config={{}} className="mx-auto aspect-square h-[200px]">
                <PieChart>
                    <ChartTooltip content={<ChartTooltipContent nameKey="value" />} />
                    <Pie data={roleDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5}>
                        {roleDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                    </Pie>
                </PieChart>
            </ChartContainer>
        </CardContent>
    </Card>
  );
}
