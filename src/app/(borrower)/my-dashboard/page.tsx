'use client';
import { PageHeader } from "@/components/page-header";
import { useUserProfile } from '@/providers/user-profile';
import { getBorrowers } from "@/actions/borrowers";
import { getLoans } from "@/actions/loans";
import { getInstallments } from "@/actions/installments";
import { getRepayments } from "@/actions/repayments";

import { getLoanProducts } from "@/actions/loan-products";
import { getUserProfile } from "@/actions/users";

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Loader2, Trophy, Lightbulb, User, Mail, Wallet, CalendarDays, Hourglass, Sparkles, ShieldCheck, Info } from "lucide-react";
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
    const { user, userProfile } = useUserProfile();
    const [randomTip, setRandomTip] = useState<string | undefined>();
    const [isLoading, setIsLoading] = useState(true);
    const [borrower, setBorrower] = useState<any | null>(null);
    const [allLoans, setAllLoans] = useState<any[] | null>(null);
    const [installments, setInstallments] = useState<any[] | null>(null);
    const [loanProduct, setLoanProduct] = useState<any | null>(null);
    const [loanOfficer, setLoanOfficer] = useState<any | null>(null);
    const [recentPayments, setRecentPayments] = useState<any[]>([]);


    useEffect(() => {
        setRandomTip(financialTips[Math.floor(Math.random() * financialTips.length)]);
    }, []);

    const fetchMyDashboardData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            // Borrower
            const borrowersRes = await getBorrowers(undefined as any, user.id);
            if (borrowersRes.success && borrowersRes.borrowers && borrowersRes.borrowers.length > 0) {
                const b = borrowersRes.borrowers[0];
                setBorrower(b as any);
                
                // All Loans
                const loansRes = await getLoans(b.organizationId, b.id);
                if (loansRes.success && loansRes.loans) {
                    setAllLoans(loansRes.loans as any);
                    const active = loansRes.loans.find((l: any) => l.status === 'Active');
                    if (active) {
                        // Installments
                        const instRes = await getInstallments(undefined as any, active.id);
                        if (instRes.success && instRes.installments) {
                            setInstallments(instRes.installments as any);
                        }
                        
                        // Product
                        const productsRes = await getLoanProducts(b.organizationId);
                        if (productsRes.success && productsRes.products) {
                            setLoanProduct(productsRes.products.find((p: any) => p.id === active.loanProductId) as any);
                        }
                        
                        // Loan Officer
                        const officerRes = await getUserProfile(active.loanOfficerId);
                        if (officerRes.success && officerRes.user) {
                            setLoanOfficer(officerRes.user as any);
                        }
                    }
                }

                // Recent Payments
                const repRes = await getRepayments(b.organizationId, undefined, b.id);
                if (repRes.success && repRes.repayments) {
                    setRecentPayments(repRes.repayments.slice(0, 5) as any);
                }
            }

        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchMyDashboardData();

            // Real-time updates via Pusher
            const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
            const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
            let pusher: any = null;

            if (pusherKey && pusherCluster && pusherKey !== 'YOUR_PUSHER_KEY') {
                const Pusher = require('pusher-js');
                pusher = new Pusher(pusherKey, { cluster: pusherCluster });
                const channel = pusher.subscribe('repayments-channel');
                channel.bind('new-payment', (data: any) => {
                    // Only refresh if the payment belongs to this borrower (security/relevance check)
                    // Note: In a production app, use private channels with borrower-specific IDs
                    // For now, we refresh and let the fetch handle filters
                    console.log("[Borrower Dashboard] Real-time payment update");
                    fetchMyDashboardData();
                });
            }

            return () => {
                if (pusher) {
                    pusher.unsubscribe('repayments-channel');
                    pusher.disconnect();
                }
            };
        }
    }, [user, fetchMyDashboardData]);

    // 5. Compute derived data for the dashboard
    const { activeLoan, pendingLoan } = useMemo(() => {
        if (!allLoans) return { activeLoan: undefined, pendingLoan: undefined };
        const active = allLoans.find(l => l.status === 'Active');
        const pending = allLoans.find(l => l.status === 'Pending Approval');
        return { activeLoan: active, pendingLoan: pending };
    }, [allLoans]);

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
        const processedInstallments = installments.map((inst: any) => {
            const dueDate = new Date(inst.dueDate);
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
            nextInstallmentAmount: nextInstallment ? nextInstallment.expectedAmount : 0,
            totalPaid: totalPaid,
            totalOutstanding: activeLoan.totalPayable - totalPaid,
            progress: progress,
            upcomingInstallments: sortedUpcoming.slice(0, 3),
            achievements: { totalPayments: totalPaymentsMade, isPromptPayer, hasCompletedLoan }
        };
    }, [installments, activeLoan, allLoans]);

    const [isPaying, setIsPaying] = useState(false);
    const [payPhone, setPayPhone] = useState("");
    const [payAmount, setPayAmount] = useState("");

    // Prefill phone and amount when active loan changes
    useEffect(() => {
        if (borrower?.phone && !payPhone) {
            setPayPhone(borrower.phone);
        }
        if (totalOutstanding > 0 && !payAmount) {
            setPayAmount(String(totalOutstanding));
        }
    }, [borrower, totalOutstanding, payPhone, payAmount]);

    const handleStkPushOrder = async () => {
        if (!payPhone || !payAmount || !activeLoan) return alert("Please ensure you have an active loan, phone and amount.");
        setIsPaying(true);
        try {
            const res = await fetch("/api/payments/stk-push", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: payPhone, amount: payAmount, loanId: activeLoan.id, nationalId: borrower?.nationalId })
            });
            const data = await res.json();
            if (data.success) {
                alert("STK Push sent! Please check your phone (" + payPhone + ") and enter your M-Pesa PIN.");
                setPayAmount("");
            } else {
                alert("Failed: " + (data.error || "Please try again later."));
            }
        } catch (e) {
            alert("Error sending request.");
        } finally {
            setIsPaying(false);
        }
    };

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
                <h1 className="font-headline text-3xl font-semibold">Welcome back, {userProfile?.fullName?.split(' ')[0] || 'Borrower'}!</h1>
                <p className="text-muted-foreground">Here’s a summary of your financial dashboard.</p>
            </div>
            
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    {!activeLoan && !pendingLoan && !isLoading && (
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
                            <StatCard title="Next Payment Amount" value={formatCurrency(nextInstallmentAmount)} icon={Wallet} description="Full installment amount" />
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

                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle>Recent Payments</CardTitle>
                                    <Button asChild variant="outline" size="sm">
                                        <Link href="/my-loans">View All</Link>
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Reference</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recentPayments.length > 0 ? recentPayments.map(rep => (
                                            <TableRow key={rep.id}>
                                                <TableCell>{new Date(rep.paymentDate).toLocaleDateString()}</TableCell>
                                                <TableCell className="font-mono text-xs uppercase">{rep.transId || rep.id.substring(0,8)}</TableCell>
                                                <TableCell className="text-right font-medium text-emerald-600">{formatCurrency(rep.amount)}</TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow><TableCell colSpan={3} className="text-center h-24">No payments recorded yet.</TableCell></TableRow>
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
                     <Card className="bg-primary/5 border-primary/20 overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                            <Sparkles className="w-12 h-12 text-primary" />
                        </div>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Wallet className="text-primary"/> Quick Pay</CardTitle>
                            <CardDescription>Request an M-Pesa prompt to pay now.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {activeLoan && totalOutstanding > 0 ? (
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Phone Number</label>
                                        <input 
                                            className="flex h-9 w-full rounded-md border border-input bg-background/50 px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary" 
                                            value={payPhone}
                                            onChange={(e) => setPayPhone(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Amount (KES)</label>
                                        <input 
                                            type="number"
                                            className="flex h-9 w-full rounded-md border border-input bg-background/50 px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary" 
                                            value={payAmount}
                                            onChange={(e) => setPayAmount(e.target.value)}
                                        />
                                    </div>
                                    <Button className="w-full shadow-sm" onClick={handleStkPushOrder} disabled={isPaying || !payPhone || !payAmount}>
                                        {isPaying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        {isPaying ? "Sending..." : "Send Payment Prompt"}
                                    </Button>
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground italic">No active loan or outstanding balance to pay.</p>
                            )}
                            
                            <hr className="border-primary/10" />
                            
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold uppercase text-muted-foreground">Manual Payment</p>
                                <div className="text-xs space-y-1 text-muted-foreground bg-background/30 p-2 rounded">
                                    <p>Paybill: <span className="text-foreground font-bold font-mono">4159879</span></p>
                                    <p>Account: <span className="text-foreground font-bold font-mono">{borrower?.nationalId || activeLoan?.id || 'National ID'}</span></p>
                                </div>
                            </div>
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
                                <Button className="w-full" variant="outline">Message Officer</Button>
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
