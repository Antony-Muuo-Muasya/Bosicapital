'use client';
import { PageHeader } from "@/components/page-header";
import { useUserProfile, useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Borrower, Loan, Installment } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";

const StatCard = ({ title, value, description }: { title: string, value: string, description: string }) => (
    <Card>
        <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="text-3xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
    </Card>
);

export default function MyDashboardPage() {
    const firestore = useFirestore();
    const { user } = useUserProfile();

    const borrowerQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'borrowers'), where('userId', '==', user.uid));
    }, [firestore, user]);

    const { data: borrowerData, isLoading: isLoadingBorrower } = useCollection<Borrower>(borrowerQuery);
    const borrower = useMemo(() => borrowerData?.[0], [borrowerData]);

    const loansQuery = useMemoFirebase(() => {
        if (!borrower) return null;
        return query(collection(firestore, 'loans'), where('borrowerId', '==', borrower.id), where('status', '==', 'Active'));
    }, [firestore, borrower]);

    const { data: loans, isLoading: isLoadingLoans } = useCollection<Loan>(loansQuery);

    const activeLoan = useMemo(() => loans?.[0], [loans]);

    const installmentsQuery = useMemoFirebase(() => {
        if (!activeLoan) return null;
        return query(collection(firestore, 'installments'), where('loanId', '==', activeLoan.id));
    }, [firestore, activeLoan]);

    const { data: installments, isLoading: isLoadingInstallments } = useCollection<Installment>(installmentsQuery);

    const { nextDueDate, nextInstallmentAmount, totalPaid, totalOutstanding } = useMemo(() => {
        if (!installments || !activeLoan) {
            return { nextDueDate: '-', nextInstallmentAmount: 0, totalPaid: 0, totalOutstanding: 0 };
        }
        
        const upcomingInstallments = installments
            .filter(i => i.status === 'Unpaid' || i.status === 'Partial' || i.status === 'Overdue')
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

        const nextInstallment = upcomingInstallments[0];

        const totalPaid = installments.reduce((acc, curr) => acc + curr.paidAmount, 0);

        return {
            nextDueDate: nextInstallment ? new Date(nextInstallment.dueDate).toLocaleDateString() : 'N/A',
            nextInstallmentAmount: nextInstallment ? nextInstallment.expectedAmount - nextInstallment.paidAmount : 0,
            totalPaid: totalPaid,
            totalOutstanding: activeLoan.totalPayable - totalPaid,
        };
    }, [installments, activeLoan]);

    const isLoading = isLoadingBorrower || isLoadingLoans || isLoadingInstallments;

    if (isLoading) {
        return (
            <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
                 <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!borrower) {
        return (
             <div className="container max-w-5xl py-8">
                <PageHeader title="My Dashboard" description="Welcome to your personal loan portal." />
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Profile Not Found</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>We could not find a borrower profile linked to your user account. Please contact your loan officer to get set up.</p>
                    </CardContent>
                </Card>
             </div>
        )
    }
    
    return (
        <div className="container max-w-5xl py-8">
            <PageHeader title="My Dashboard" description="A summary of your current loan status." />
            
            {!activeLoan && (
                 <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>No Active Loan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>You do not currently have any active loans.</p>
                    </CardContent>
                </Card>
            )}

            {activeLoan && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mt-6">
                   <StatCard 
                     title="Next Due Date"
                     value={nextDueDate}
                     description="Your next payment is due on this date."
                   />
                    <StatCard 
                     title="Next Payment Amount"
                     value={formatCurrency(nextInstallmentAmount, 'KES')}
                     description="The amount due for your next installment."
                   />
                    <StatCard 
                     title="Total Outstanding"
                     value={formatCurrency(totalOutstanding, 'KES')}
                     description="The remaining balance on your loan."
                   />
                    <StatCard 
                     title="Total Paid"
                     value={formatCurrency(totalPaid, 'KES')}
                     description="The total amount you have paid so far."
                   />
                </div>
            )}
             <div className="border shadow-sm rounded-lg p-8 mt-8 text-center text-muted-foreground">
                Recent payment history and other widgets will be built here.
            </div>
        </div>
    )
}
