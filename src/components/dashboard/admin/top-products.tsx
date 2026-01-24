'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Loan, LoanProduct } from '@/lib/types';
import { useMemo } from 'react';

interface TopProductsProps {
    loans: Loan[] | null;
    loanProducts: LoanProduct[] | null;
    isLoading: boolean;
}

export function TopProducts({ loans, loanProducts, isLoading }: TopProductsProps) {
    
    const topProducts = useMemo(() => {
        if (!loans || !loanProducts) return [];
        
        const productCounts = loans.reduce((acc, loan) => {
            acc[loan.loanProductId] = (acc[loan.loanProductId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const productsMap = new Map(loanProducts.map(p => [p.id, p.name]));

        return Object.entries(productCounts)
            .map(([id, count]) => ({
                name: productsMap.get(id) || 'Unknown Product',
                count
            }))
            .sort((a,b) => b.count - a.count)
            .slice(0, 5);

    }, [loans, loanProducts]);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                     <Skeleton className="h-6 w-1/2" />
                     <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-3">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                </CardContent>
            </Card>
        )
    }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Top Loan Products</CardTitle>
            <CardDescription>By number of loans issued.</CardDescription>
        </CardHeader>
        <CardContent>
           {topProducts.length > 0 ? (
            <div className="space-y-4">
                {topProducts.map(product => (
                    <div key={product.name} className="flex justify-between items-center text-sm">
                       <span>{product.name}</span>
                       <span className="font-semibold">{product.count} loans</span>
                    </div>
                ))}
            </div>
           ) : (
            <div className="flex h-24 items-center justify-center text-muted-foreground">
                No data available.
            </div>
           )}
        </CardContent>
    </Card>
  );
}
