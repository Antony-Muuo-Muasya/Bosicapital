'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  isLoading: boolean;
  featured?: boolean;
}

export function StatCard({ title, value, icon: Icon, isLoading, featured = false }: StatCardProps) {
  return (
    <Card className={cn(
        "transition-all",
        featured && "relative bg-gradient-to-br from-primary/80 to-primary text-primary-foreground shadow-lg hover:shadow-xl hover:-translate-y-1"
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={cn("text-sm font-medium", featured && "text-primary-foreground/80")}>{title}</CardTitle>
        <Icon className={cn("h-4 w-4 text-muted-foreground", featured && "text-primary-foreground/80")} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className={cn("h-8 w-3/4", featured && "bg-white/30")} />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}
