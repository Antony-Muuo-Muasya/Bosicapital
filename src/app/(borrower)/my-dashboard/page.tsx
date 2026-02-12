'use client';
import { PageHeader } from "@/components/page-header";
import { useUserProfile, useCollection, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import type { Borrower, Loan, Installment, User as LoanOfficer, LoanProduct } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Loader2, Trophy, Lightbulb, User, Mail, Wallet, CalendarDays, Hourglass, Sparkles, BookOpen, ShieldCheck, History, PlusCircle, Info } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow, startOfToday } from 'date-fns';

const financialTips = [
    "Create a monthly budget and stick to it.",
    "Try to save at least 10% of your income.",
    "Pay off high-interest debts first.",
    "Build an emergency fund for unexpected expenses.",
    "Review your bank statements regularly for errors."
];

const StatCard = ({ title, value, icon: Icon, description }: { title: string, value: string | number, icon: React.ElementType, description?: string }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </CardContent>
    </Card>
);


export default function MyDashboardPage() {
    const firestore = useFirestore();
    const { user, userProfile } = useUserProfile();
    const [randomTip, setRandomTip] = useState<string | undefined>();

    useEffect(() => {
        setRandomTip(financialTips[Math.floor(Math.random() * financialTips.length)]);
    }, []);

    // 1. Fetch borrower profile
    const borrowerQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'borrowers'), where('userId', '==', user.uid));
    }, [firestore, user]);
    const { data: borrowerData, isLoading: isLoadingBorrower } = useCollection<Borrower>(borrowerQuery);
    const borrower = useMemo(() => borrowerData?.[0], [borrowerData]);

    // 2. Fetch all loans for the borrower (active, pending, etc.)
    const allLoansQuery = useMemoFirebase(() => {
        if (!borrower) return null;
        return query(collection(firestore, 'loans'), 
            where('organizationId', '==', borrower.organizationId),
            where('borrowerId', '==', borrower.id)
        );
    }, [firestore, borrower]);
    const { data: allLoans, isLoading: isLoadingLoans } = useCollection<Loan>(allLoansQuery);

    // 3. Separate loans by status
    const { activeLoan, pendingLoan } = useMemo(() => {
        if (!allLoans) return { activeLoan: undefined, pendingLoan: undefined };
        const active = allLoans.find(l => l.status === 'Active');
        const pending = allLoans.find(l => l.status === 'Pending Approval');
        return { activeLoan: active, pendingLoan: pending };
    }, [allLoans]);

    // 4. Fetch details for the active loan (installments, product, officer)
    const installmentsQuery = useMemoFirebase(() => {
        if (!activeLoan) return null;
        return collection(firestore, 'loans', activeLoan.id, 'installments');
    }, [firestore, activeLoan]);
    const { data: installments, isLoading: isLoadingInstallments } = useCollection<Installment>(installmentsQuery);
    
    const productRef = useMemoFirebase(() => {
        if (!activeLoan) return null;
        return doc(firestore, 'loanProducts', activeLoan.loanProductId);
    }, [firestore, activeLoan]);
    const { data: loanProduct, isLoading: isLoadingProduct } = useDoc<LoanProduct>(productRef);

    const loanOfficerRef = useMemoFirebase(() => {
        if (!activeLoan) return null;
        return doc(firestore, 'users', activeLoan.loanOfficerId);
    }, [firestore, activeLoan]);
    const { data: loanOfficer, isLoading: isLoadingLoanOfficer } = useDoc<LoanOfficer>(loanOfficerRef);

    // 5. Compute derived data for the dashboard
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
                nextDueDate: null, 
                nextInstallmentAmount: 0, 
                totalPaid: 0, 
                totalOutstanding: 0, 
                progress: 0,
                upcomingInstallments: [],
                achievements: { totalPayments: 0, isPromptPayer: false, hasCompletedLoan: false }
            };
        }
        
        const today = startOfToday();
        const processedInstallments = installments.map(inst => {
            const [year, month, day] = inst.dueDate.split('-').map(Number);
            const dueDate = new Date(year, month - 1, day);
            const isOverdue = dueDate < today && inst.status !== 'Paid';
            return {
                ...inst,
                status: isOverdue ? 'Overdue' : inst.status
            };
        });

        const sortedUpcoming = processedInstallments
            .filter(i => i.status === 'Unpaid' || i.status === 'Partial' || i.status === 'Overdue')
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

        const nextInstallment = sortedUpcoming[0];
        const totalPaid = processedInstallments.reduce((acc, curr) => acc + curr.paidAmount, 0);
        const progress = activeLoan.totalPayable > 0 ? (totalPaid / activeLoan.totalPayable) * 100 : 0;

        const totalPaymentsMade = processedInstallments.filter(i => i.status === 'Paid').length;
        const isPromptPayer = !processedInstallments.some(i => i.status === 'Overdue');
        const hasCompletedLoan = allLoans?.some(l => l.status === 'Completed') || false;

        return {
            nextDueDate: nextInstallment ? new Date(nextInstallment.dueDate) : null,
            nextInstallmentAmount: nextInstallment ? nextInstallment.expectedAmount / 4 : 0,
            totalPaid: totalPaid,
            totalOutstanding: activeLoan.totalPayable - totalPaid,
            progress: progress,
            upcomingInstallments: sortedUpcoming.slice(0, 3),
            achievements: { totalPayments: totalPaymentsMade, isPromptPayer, hasCompletedLoan }
        };
    }, [installments, activeLoan, allLoans]);

    const isLoading = isLoadingBorrower || isLoadingLoans || isLoadingInstallments || isLoadingLoanOfficer || isLoadingProduct;

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
            
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    {!activeLoan && !pendingLoan && (
                        <Card className="text-center py-12">
                            <CardHeader>
                                <CardTitle>No Active Loans</CardTitle>
                                <CardDescription className="max-w-md mx-auto">You don&apos;t have any active or pending loans right now. If you&apos;re interested in a new loan, please contact your loan officer.</CardDescription>
                            </CardHeader>
                        </Card>
                    )}

                    {activeLoan && loanProduct && (
                        <>
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                    <CardTitle className="text-xl">{loanProduct.name}</CardTitle>
                                    <CardDescription>Your active loan progress.</CardDescription>
                                    </div>
                                    <Button asChild variant="secondary" size="sm">
                                    <Link href={`/my-loans/${activeLoan.id}`}>View Details</Link>
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Progress value={progress} className="h-3" />
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Paid</span>
                                    <span className="font-medium text-foreground">{formatCurrency(totalPaid)} of {formatCurrency(activeLoan.totalPayable)}</span>
                                </div>
                            </CardContent>
                        </Card>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <StatCard title="Next Payment Due" value={nextDueDate ? format(nextDueDate, 'MMM dd, yyyy') : 'N/A'} icon={CalendarDays} description={nextDueDate ? formatDistanceToNow(nextDueDate, { addSuffix: true }) : 'Fully Paid'} />
                            <StatCard title="Next Payment Amount" value={formatCurrency(nextInstallmentAmount)} icon={Wallet} description="Suggested partial payment" />
                            <StatCard title="Outstanding Balance" value={formatCurrency(totalOutstanding)} icon={Hourglass} description="Total remaining on loan" />
                        </div>

                        <Card>
                            <CardHeader><CardTitle>Upcoming Payments</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Due Date</TableHead>
                                        <TableHead className="text-right">Amount Due</TableHead>
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
                        </>
                    )}
                    
                    {pendingLoan && (
                        <Card>
                            <CardHeader className="flex-row items-center gap-4 space-y-0">
                                <div className="p-3 bg-secondary rounded-full"><Hourglass className="w-6 h-6 text-primary"/></div>
                                <div>
                                    <CardTitle>Loan Application Pending</CardTitle>
                                    <CardDescription>Your loan application submitted on {format(new Date(pendingLoan.issueDate), 'MMM dd, yyyy')} is currently under review.</CardDescription>
                                </div>
                            </CardHeader>
                        </Card>
                    )}
                </div>

                <div className="lg:col-span-1 space-y-6">
                     <Card className="bg-primary/5 border-primary/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Info className="text-primary"/> How to Pay</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <p>You can easily pay your loan via M-Pesa:</p>
                            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                                <li>Go to Lipa na M-Pesa, then Pay Bill.</li>
                                <li>Enter Business No: <strong className="text-foreground">4159879</strong></li>
                                <li>Enter Account No: <strong className="text-foreground">{borrower.nationalId}</strong></li>
                                <li>Enter the amount and your PIN.</li>
                            </ol>
                        </CardContent>
                    </Card>

                    <Card>
                         <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="text-amber-500" /> Achievements</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className={`flex items-center gap-3 p-3 rounded-lg ${achievements.isPromptPayer && activeLoan ? 'bg-green-500/10' : 'bg-muted'}`}>
                                <ShieldCheck className={`w-6 h-6 ${achievements.isPromptPayer && activeLoan ? 'text-green-600' : 'text-muted-foreground'}`}/>
                                <div>
                                    <p className="text-sm font-semibold">Prompt Payer</p>
                                    <p className="text-xs text-muted-foreground">You have no overdue payments.</p>
                                </div>
                            </div>
                             <div className={`flex items-center gap-3 p-3 rounded-lg ${achievements.hasCompletedLoan ? 'bg-green-500/10' : 'bg-muted'}`}>
                                <Trophy className={`w-6 h-6 ${achievements.hasCompletedLoan ? 'text-green-600' : 'text-muted-foreground'}`}/>
                                <div>
                                    <p className="text-sm font-semibold">Loan Veteran</p>
                                    <p className="text-xs text-muted-foreground">You have successfully paid off loans.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    {loanOfficer && (
                        <Card>
                             <CardHeader><CardTitle>Your Loan Officer</CardTitle></CardHeader>
                             <CardContent className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <User className="w-5 h-5 text-muted-foreground"/>
                                    <span className="font-medium">{loanOfficer.fullName}</span>
                                </div>
                                 <div className="flex items-center gap-4">
                                    <Mail className="w-5 h-5 text-muted-foreground"/>
                                    <a href={`mailto:${loanOfficer.email}`} className="text-muted-foreground hover:underline">{loanOfficer.email}</a>
                                </div>
                                <Button className="w-full">Send Message</Button>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lightbulb className="text-blue-500" /> Financial Tip</CardTitle></CardHeader>
                        <CardContent><p className="text-sm text-muted-foreground">{randomTip}</p></CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
