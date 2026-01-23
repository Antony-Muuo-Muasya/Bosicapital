'use client';
import { PageHeader } from "@/components/page-header";
import { useUserProfile, useCollection, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import type { Borrower, Loan, Installment, User as LoanOfficer } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Loader2, TrendingUp, Trophy, Lightbulb, User, Phone, Mail } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const financialTips = [
    "Create a monthly budget and stick to it.",
    "Try to save at least 10% of your income.",
    "Pay off high-interest debts first.",
    "Build an emergency fund for unexpected expenses.",
    "Review your bank statements regularly for errors."
];

export default function MyDashboardPage() {
    const firestore = useFirestore();
    const { user, userProfile } = useUserProfile();
    const [randomTip, setRandomTip] = useState<string | undefined>();

    useEffect(() => {
        setRandomTip(financialTips[Math.floor(Math.random() * financialTips.length)]);
    }, []);

    const borrowerQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'borrowers'), where('userId', '==', user.uid));
    }, [firestore, user]);

    const { data: borrowerData, isLoading: isLoadingBorrower } = useCollection<Borrower>(borrowerQuery);
    const borrower = useMemo(() => borrowerData?.[0], [borrowerData]);

    const loansQuery = useMemoFirebase(() => {
        if (!borrower) return null;
        return query(collection(firestore, 'loans'), 
            where('organizationId', '==', borrower.organizationId),
            where('borrowerId', '==', borrower.id), 
            where('status', '==', 'Active')
        );
    }, [firestore, borrower]);
    const { data: loans, isLoading: isLoadingLoans } = useCollection<Loan>(loansQuery);
    const activeLoan = useMemo(() => loans?.[0], [loans]);

    const installmentsQuery = useMemoFirebase(() => {
        if (!activeLoan) return null;
        return collection(firestore, 'loans', activeLoan.id, 'installments');
    }, [firestore, activeLoan]);
    const { data: installments, isLoading: isLoadingInstallments } = useCollection<Installment>(installmentsQuery);

    const loanOfficerRef = useMemoFirebase(() => {
        if (!activeLoan) return null;
        return doc(firestore, 'users', activeLoan.loanOfficerId);
    }, [firestore, activeLoan]);
    const { data: loanOfficer, isLoading: isLoadingLoanOfficer } = useDoc<LoanOfficer>(loanOfficerRef);

    const { 
        nextDueDate, 
        nextInstallmentAmount, 
        totalPaid, 
        totalOutstanding,
        progress,
        upcomingInstallments,
        achievements,
     } = useMemo(() => {
        if (!installments || !activeLoan) {
            return { 
                nextDueDate: '-', 
                nextInstallmentAmount: 0, 
                totalPaid: 0, 
                totalOutstanding: 0, 
                progress: 0,
                upcomingInstallments: [],
                achievements: { totalPayments: 0, isPromptPayer: false }
            };
        }
        
        const sortedUpcoming = installments
            .filter(i => i.status === 'Unpaid' || i.status === 'Partial' || i.status === 'Overdue')
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

        const nextInstallment = sortedUpcoming[0];
        const totalPaid = installments.reduce((acc, curr) => acc + curr.paidAmount, 0);
        const progress = activeLoan.totalPayable > 0 ? (totalPaid / activeLoan.totalPayable) * 100 : 0;

        const totalPaymentsMade = installments.filter(i => i.status === 'Paid').length;
        const isPromptPayer = !installments.some(i => i.status === 'Overdue');

        return {
            nextDueDate: nextInstallment ? new Date(nextInstallment.dueDate).toLocaleDateString() : 'N/A',
            nextInstallmentAmount: nextInstallment ? nextInstallment.expectedAmount : 0,
            totalPaid: totalPaid,
            totalOutstanding: activeLoan.totalPayable - totalPaid,
            progress: progress,
            upcomingInstallments: sortedUpcoming.slice(0, 3),
            achievements: { totalPayments: totalPaymentsMade, isPromptPayer }
        };
    }, [installments, activeLoan]);

    const isLoading = isLoadingBorrower || isLoadingLoans || isLoadingInstallments || isLoadingLoanOfficer;

    if (isLoading) {
        return (
            <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
                 <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!borrower) {
        return (
             <div className="container max-w-7xl py-8">
                <PageHeader title="Welcome" description="It looks like your user account isn't linked to a borrower profile yet." />
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
        <div className="container max-w-7xl py-8">
            <div className="mb-8">
                <h1 className="font-headline text-3xl font-semibold">Welcome back, {userProfile?.fullName.split(' ')[0]}!</h1>
                <p className="text-muted-foreground">Here’s a summary of your financial dashboard.</p>
            </div>
            
            {!activeLoan && (
                 <Card className="mt-6 text-center py-12">
                    <CardHeader>
                        <CardTitle>No Active Loan</CardTitle>
                        <CardDescription className="max-w-md mx-auto">You don&apos;t have any active loans right now. If you&apos;re interested in a new loan, please contact your loan officer.</CardDescription>
                    </CardHeader>
                </Card>
            )}

            {activeLoan && (
                <div className="grid gap-6 lg:grid-cols-3">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                           <div className="flex justify-between items-start">
                             <div>
                                <CardTitle>Active Loan Summary</CardTitle>
                                <CardDescription>Your current loan progress.</CardDescription>
                             </div>
                             <Button asChild variant="secondary" size="sm">
                                <Link href={`/my-loans/${activeLoan.id}`}>View Details</Link>
                             </Button>
                           </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <div className="flex justify-between items-center mb-2 text-sm">
                                    <span className="text-muted-foreground">Paid</span>
                                    <span className="font-medium text-foreground">{formatCurrency(totalPaid)} of {formatCurrency(activeLoan.totalPayable)}</span>
                                </div>
                                <Progress value={progress} className="h-3" />
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <p className="text-sm text-muted-foreground">Next Due Date</p>
                                    <p className="text-lg font-semibold">{nextDueDate}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Next Payment</p>
                                    <p className="text-lg font-semibold text-primary">{formatCurrency(nextInstallmentAmount)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Outstanding</p>
                                    <p className="text-lg font-semibold">{formatCurrency(totalOutstanding)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-6">
                        <Card>
                             <CardHeader className="pb-4">
                                <CardTitle className="text-base flex items-center gap-2"><Trophy className="text-amber-500" /> Achievements</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4">
                                <div className="text-center bg-muted/50 p-4 rounded-lg">
                                    <p className="text-3xl font-bold">{achievements.totalPayments}</p>
                                    <p className="text-xs text-muted-foreground">Payments Made</p>
                                </div>
                                {achievements.isPromptPayer ? (
                                    <div className="text-center bg-green-500/10 text-green-700 p-4 rounded-lg">
                                        <p className="text-xl font-bold">Prompt Payer</p>
                                        <p className="text-xs">No overdue payments!</p>
                                    </div>
                                ) : (
                                     <div className="text-center bg-destructive/10 text-destructive p-4 rounded-lg">
                                        <p className="text-xl font-bold">Catch Up</p>
                                        <p className="text-xs">You have overdue payments.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                         <Card>
                             <CardHeader className="pb-4">
                                <CardTitle className="text-base flex items-center gap-2"><Lightbulb className="text-blue-500" /> Financial Tip</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">{randomTip || 'Loading tip...'}</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Upcoming Payments</CardTitle>
                            <CardDescription>Your next three due installments.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Due Date</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {upcomingInstallments.length > 0 ? upcomingInstallments.map(inst => (
                                        <TableRow key={inst.id}>
                                            <TableCell>{new Date(inst.dueDate).toLocaleDateString()}</TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(inst.expectedAmount - inst.paidAmount)}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow><TableCell colSpan={2} className="text-center h-24">All payments are up to date!</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {loanOfficer && (
                        <Card>
                             <CardHeader>
                                <CardTitle>Your Loan Officer</CardTitle>
                                <CardDescription>Your primary contact for any questions.</CardDescription>
                            </CardHeader>
                             <CardContent className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <User className="w-5 h-5 text-muted-foreground"/>
                                    <span className="font-medium">{loanOfficer.fullName}</span>
                                </div>
                                 <div className="flex items-center gap-4">
                                    <Mail className="w-5 h-5 text-muted-foreground"/>
                                    <span className="text-muted-foreground">{loanOfficer.email}</span>
                                </div>
                                <Button className="w-full">Send Message</Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    )
}
