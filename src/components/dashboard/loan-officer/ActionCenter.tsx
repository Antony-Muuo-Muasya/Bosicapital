'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Borrower, Installment, Loan } from '@/lib/types';
import { useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';
import { formatDistanceToNow, isToday, isFuture } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ActionCenterProps {
    installments: Installment[] | null;
    loans: Loan[] | null;
    borrowers: Borrower[] | null;
    isLoading: boolean;
}

const ActionItem = ({ name, photo, loanId, due, amount, isOverdue }: { name: string, photo: string, loanId: string, due: string, amount: number, isOverdue: boolean }) => (
    <div className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted">
        <Avatar className="h-9 w-9">
            <AvatarImage src={photo} alt={name} />
            <AvatarFallback>{name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="grid gap-0.5 flex-1">
            <p className="font-semibold text-sm">{name}</p>
            <p className="text-xs text-muted-foreground">Loan ID: {loanId.substring(0,8)}</p>
        </div>
        <div className="text-right">
            <p className={`font-semibold text-sm ${isOverdue ? 'text-destructive' : ''}`}>{formatCurrency(amount)}</p>
            <p className="text-xs text-muted-foreground">Due {due}</p>
        </div>
         <Button variant="outline" size="sm">Contact</Button>
    </div>
)

export function ActionCenter({ installments, loans, borrowers, isLoading }: ActionCenterProps) {

    const { overdue, upcoming } = useMemo(() => {
        if (!installments || !loans || !borrowers) return { overdue: [], upcoming: [] };
        
        const loansMap = new Map(loans.map(l => [l.id, l]));
        const borrowersMap = new Map(borrowers.map(b => [b.id, b]));

        const processedInstallments = installments
            .filter(i => i.status === 'Overdue' || (i.status === 'Unpaid' && (isToday(new Date(i.dueDate)) || isFuture(new Date(i.dueDate)))))
            .map(inst => {
                const loan = loansMap.get(inst.loanId);
                if (!loan) return null;
                const borrower = borrowersMap.get(loan.borrowerId);
                if (!borrower) return null;

                return {
                    ...inst,
                    borrowerName: borrower.fullName,
                    borrowerPhoto: borrower.photoUrl,
                    isOverdue: inst.status === 'Overdue',
                    dueDistance: formatDistanceToNow(new Date(inst.dueDate), { addSuffix: true }),
                    amountDue: inst.expectedAmount - inst.paidAmount
                }
            })
            .filter(Boolean) as any[];

        const overdue = processedInstallments.filter(i => i.isOverdue);
        const upcoming = processedInstallments.filter(i => !i.isOverdue);
        
        return { overdue, upcoming };

    }, [installments, loans, borrowers]);


    return (
        <Card>
            <CardHeader>
                <CardTitle>Action Center</CardTitle>
                <CardDescription>A prioritized list of borrowers who require your attention.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="overdue">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="overdue">Overdue ({overdue.length})</TabsTrigger>
                        <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overdue" className="space-y-2 pt-2">
                         {isLoading && Array.from({length: 2}).map((_, i) => <Skeleton key={i} className="h-[68px] w-full" />)}
                         {!isLoading && overdue.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No overdue payments. Great job!</p>}
                         {!isLoading && overdue.map(item => <ActionItem key={item.id} name={item.borrowerName} photo={item.borrowerPhoto} loanId={item.loanId} due={item.dueDistance} amount={item.amountDue} isOverdue />)}
                    </TabsContent>
                    <TabsContent value="upcoming" className="space-y-2 pt-2">
                        {isLoading && Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-[68px] w-full" />)}
                        {!isLoading && upcoming.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No payments due soon.</p>}
                        {!isLoading && upcoming.map(item => <ActionItem key={item.id} name={item.borrowerName} photo={item.borrowerPhoto} loanId={item.loanId} due={item.dueDistance} amount={item.amountDue} isOverdue={false} />)}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
