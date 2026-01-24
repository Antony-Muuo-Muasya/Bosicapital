'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { Crown } from 'lucide-react';

interface TopBorrower {
    id: string;
    name: string;
    avatar: string;
    amount: number;
}

interface TopBorrowersProps {
    data: TopBorrower[] | null;
    isLoading: boolean;
}

export function TopBorrowers({ data, isLoading }: TopBorrowersProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>My Top Borrowers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoading && Array.from({length: 3}).map((_, i) => (
                     <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="flex-1 space-y-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-16" />
                        </div>
                    </div>
                ))}
                {!isLoading && data && data.map((borrower, index) => (
                     <div key={borrower.id} className="flex items-center gap-4">
                        {index === 0 ? <Crown className="h-6 w-6 text-amber-500" /> : <span className="font-semibold text-muted-foreground w-6 text-center">{index + 1}</span>}
                        <Avatar className="h-9 w-9">
                            <AvatarImage src={borrower.avatar} alt={borrower.name} />
                            <AvatarFallback>{borrower.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="grid gap-0.5 flex-1">
                            <p className="font-semibold text-sm">{borrower.name}</p>
                            <p className="text-xs text-muted-foreground">
                                Total Principal: {formatCurrency(borrower.amount)}
                            </p>
                        </div>
                    </div>
                ))}
                 {!isLoading && (!data || data.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No borrower data to display.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
