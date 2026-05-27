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
import { Loader2, Trophy, Lightbulb, User, Mail, Wallet, CalendarDays, Hourglass, Sparkles, ShieldCheck, Info, Smartphone } from "lucide-react";
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

    const fetchMyDashboardData = useCallback(async (silent = false) => {
        if (!user) return;
        if (!silent) setIsLoading(true);
        try {
            const borrowersRes = await getBorrowers(undefined as any, user.id);
            if (borrowersRes.success && borrowersRes.borrowers && borrowersRes.borrowers.length > 0) {
                const b = borrowersRes.borrowers[0];
                setBorrower(b as any);
                
                const loansRes = await getLoans(b.organizationId, b.id);
                if (loansRes.success && loansRes.loans) {
                    setAllLoans(loansRes.loans as any);
                    // Treat both Active and In Arrears as the primary dashboard loan
                    const active = loansRes.loans.find((l: any) => l.status === 'Active' || l.status === 'In Arrears');
                    if (active) {
                        const [instRes, productsRes, officerRes] = await Promise.all([
                            getInstallments(undefined as any, active.id),
                            getLoanProducts(b.organizationId),
                            getUserProfile(active.loanOfficerId)
                        ]);

                        if (instRes.success) setInstallments(instRes.installments as any);
                        if (productsRes.success) setLoanProduct(productsRes.products.find((p: any) => p.id === active.loanProductId) as any);
                        if (officerRes.success) setLoanOfficer(officerRes.user as any);
                    }
                }

                const repRes = await getRepayments(b.organizationId, undefined, b.id);
                if (repRes.success && repRes.repayments) {
                    setRecentPayments(repRes.repayments.slice(0, 5) as any);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            if (!silent) setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchMyDashboardData();
            const interval = setInterval(() => fetchMyDashboardData(true), 30000);
            return () => clearInterval(interval);
        }
    }, [user, fetchMyDashboardData]);

    const { activeLoan, pendingLoan } = useMemo(() => {
        if (!allLoans) return { activeLoan: undefined, pendingLoan: undefined };
        const active = allLoans.find(l => l.status === 'Active' || l.status === 'In Arrears');
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
                achievements: { totalPayments: 0, isPromptPayer: true, hasCompletedLoan: false }
            };
        }
        
        const today = startOfToday();
        const processedInstallments = installments.map((inst: any) => {
            const dueDate = new Date(inst.dueDate);
            const isOverdue = dueDate < today && inst.status !== 'Paid';
            return { ...inst, status: isOverdue ? 'Overdue' : inst.status };
        });

        const sortedUpcoming = processedInstallments
            .filter(i => i.status !== 'Paid')
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

        const nextInstallment = sortedUpcoming[0];
        const totalPaid = processedInstallments.reduce((acc, curr) => acc + curr.paidAmount, 0);
        const progress = activeLoan.totalPayable > 0 ? (totalPaid / activeLoan.totalPayable) * 100 : 0;
        const totalPaymentsMade = processedInstallments.filter(i => i.status === 'Paid').length;
        const isPromptPayer = !processedInstallments.some(i => i.status === 'Overdue');
        const hasCompletedLoan = allLoans?.some(l => l.status === 'Completed') || false;

        return {
            nextDueDate: nextInstallment ? new Date(nextInstallment.dueDate) : null,
            nextInstallmentAmount: nextInstallment ? nextInstallment.expectedAmount - nextInstallment.paidAmount : 0,
            totalPaid,
            totalOutstanding: Math.max(0, activeLoan.totalPayable - totalPaid),
            progress,
            upcomingInstallments: sortedUpcoming.slice(0, 3),
            achievements: { totalPayments: totalPaymentsMade, isPromptPayer, hasCompletedLoan }
        };
    }, [installments, activeLoan, allLoans]);

    const [isPaying, setIsPaying] = useState(false);
    const [payPhone, setPayPhone] = useState("");
    const [payAmount, setPayAmount] = useState("");

    useEffect(() => {
        if (borrower?.phone && !payPhone) setPayPhone(borrower.phone);
        if (nextInstallmentAmount > 0 && !payAmount) setPayAmount(String(nextInstallmentAmount));
    }, [borrower, nextInstallmentAmount, payPhone, payAmount]);

    const handleStkPushOrder = async () => {
        if (!payPhone || !payAmount || !activeLoan) return alert("Missing payment details.");
        setIsPaying(true);
        try {
            const res = await fetch("/api/payments/stk-push", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: payPhone, amount: payAmount, loanId: activeLoan.id, nationalId: borrower?.nationalId })
            });
            const data = await res.json();
            if (data.success) {
                alert("STK Push sent! Please confirm on your phone.");
                setPayAmount("");
            } else {
                alert("Error: " + (data.error || "Please try again."));
            }
        } catch (e) {
            alert("Connection error.");
        } finally {
            setIsPaying(false);
        }
    };

    if (isLoading) {
        return <div className="flex h-[calc(100vh-4rem)] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (!borrower) {
        return (
             <div className="container max-w-7xl py-8">
                <PageHeader title="Welcome" description="Your profile is being set up." />
                <Card className="mt-6"><CardContent className="pt-6 text-center text-muted-foreground italic">Borrower profile not found. Please contact support.</CardContent></Card>
             </div>
        );
    }
    
    return (
        <div className="container max-w-7xl py-8">
            <div className="mb-8">
                <h1 className="font-headline text-3xl font-semibold">Welcome back, {userProfile?.fullName?.split(' ')[0] || 'Borrower'}!</h1>
                <p className="text-muted-foreground italic">Excellence in financial partnership.</p>
            </div>
            
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    {!activeLoan && !pendingLoan && (
                        <Card className="text-center py-12">
                            <CardHeader>
                                <CardTitle>No Active Loans</CardTitle>
                                <CardDescription>You don&apos;t have any active loans right now.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button asChild variant="outline"><Link href="/my-loans">View Loan History</Link></Button>
                            </CardContent>
                        </Card>
                    )}

                    {activeLoan && loanProduct && (
                        <>
                        <Card className="border-primary/20 bg-primary/5">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant={activeLoan.status === 'In Arrears' ? 'destructive' : 'default'}>{activeLoan.status}</Badge>
                                            <span className="text-xs font-mono text-muted-foreground">{activeLoan.id}</span>
                                        </div>
                                        <CardTitle className="text-xl uppercase tracking-tighter">{loanProduct.name}</CardTitle>
                                    </div>
                                    <Button asChild variant="secondary" size="sm" className="hidden sm:flex">
                                        <Link href={`/my-loans/${activeLoan.id}`}>Loan Details</Link>
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-xs font-bold uppercase"><span>Loan Progress</span><span>{Math.round(progress)}%</span></div>
                                    <Progress value={progress} className="h-2" />
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground italic">Repaid {formatCurrency(totalPaid)}</span>
                                    <span className="font-bold">Total {formatCurrency(activeLoan.totalPayable)}</span>
                                </div>
                            </CardContent>
                        </Card>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <StatCard title="Priority Due Date" value={nextDueDate ? format(nextDueDate, 'MMM dd, yyyy') : 'N/A'} icon={CalendarDays} description={nextDueDate ? `Due in ${formatDistanceToNow(nextDueDate)}` : 'Wait for next cycle'} />
                            <StatCard title="Due Amount" value={formatCurrency(nextInstallmentAmount)} icon={Wallet} description="Next installment" />
                            <StatCard title="Total Balance" value={formatCurrency(totalOutstanding)} icon={Hourglass} description="Full outstanding debt" />
                        </div>

                        <Card>
                            <CardHeader><CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary"/> Upcoming Installments</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                <TableBody>
                                    {upcomingInstallments.length > 0 ? upcomingInstallments.map(inst => (
                                        <TableRow key={inst.id}>
                                            <TableCell className="py-2">{format(new Date(inst.dueDate), 'MMM dd, yyyy')}</TableCell>
                                            <TableCell className="py-2 text-right font-medium">{formatCurrency(inst.expectedAmount - inst.paidAmount)}</TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell className="text-center h-12 text-muted-foreground italic text-sm">No pending installments</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-base">Recent Payments</CardTitle>
                                <Link href="/my-loans" className="text-xs text-primary hover:underline">See history &rarr;</Link>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableBody>
                                        {recentPayments.length > 0 ? recentPayments.map(rep => (
                                            <TableRow key={rep.id}>
                                                <TableCell className="py-2">{format(new Date(rep.paymentDate), 'MMM dd')}</TableCell>
                                                <TableCell className="py-2 font-mono text-[10px] uppercase">{rep.transId || 'MPESA'}</TableCell>
                                                <TableCell className="py-2 text-right font-bold text-emerald-600">{formatCurrency(rep.amount)}</TableCell>
                                            </TableRow>
                                        )) : <TableRow><TableCell className="text-center h-12 text-muted-foreground italic text-sm">No payments yet</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                        </>
                    )}
                    
                    {pendingLoan && (
                        <Card className="border-amber-500/20 bg-amber-50/5">
                            <CardHeader className="flex-row items-center gap-4 space-y-0">
                                <div className="p-3 bg-amber-500/10 rounded-full"><Hourglass className="w-6 h-6 text-amber-600"/></div>
                                <div className="flex-1">
                                    <CardTitle className="text-base">Application Under Review</CardTitle>
                                    <CardDescription>Submitted on {format(new Date(pendingLoan.issueDate), 'MMM dd, yyyy')}.</CardDescription>
                                </div>
                                <Badge className="bg-amber-500">Processing</Badge>
                            </CardHeader>
                        </Card>
                    )}
                </div>

                <div className="lg:col-span-1 space-y-6">
                     <Card className="bg-primary/5 border-primary/20 overflow-hidden relative shadow-md">
                        <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none text-primary"><Sparkles className="w-12 h-12" /></div>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-primary font-bold"><Wallet className="h-5 w-5"/> QUICK PAY</CardTitle>
                            <CardDescription className="text-[10px] uppercase font-bold tracking-wider">Send M-Pesa STK Push</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {activeLoan && totalOutstanding > 0 ? (
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Phone Number</label>
                                        <input className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary" value={payPhone} onChange={(e) => setPayPhone(e.target.value)} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Amount (KES)</label>
                                        <input type="number" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
                                    </div>
                                    <Button className="w-full font-bold h-11" onClick={handleStkPushOrder} disabled={isPaying || !payPhone || !payAmount}>
                                        {isPaying ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" /> : <Smartphone className="mr-2 h-4 w-4" />}
                                        {isPaying ? "SENDING PUSH..." : "PROMPT PAYMENT"}
                                    </Button>
                                </div>
                            ) : <p className="text-xs text-muted-foreground italic py-4 text-center border rounded-lg bg-background/50">No outstanding balance.</p>}
                            
                            <div className="pt-2 border-t border-primary/10">
                                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Manual Paybill Details</p>
                                <div className="text-[11px] font-bold font-mono bg-background/40 p-2 rounded border gap-1 flex flex-col">
                                    <div className="flex justify-between"><span>Paybill:</span> <span className="text-primary">4159879</span></div>
                                    <div className="flex justify-between"><span>Account:</span> <span className="text-primary">{borrower?.nationalId || 'NATIONAL_ID'}</span></div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                         <CardHeader className="py-4"><CardTitle className="text-sm flex items-center gap-2"><Trophy className="text-amber-500 h-4 w-4" /> Achievements</CardTitle></CardHeader>
                        <CardContent className="space-y-3 pb-4">
                            <div className={`flex items-center gap-3 p-2 rounded-md ${achievements.isPromptPayer ? 'bg-green-500/10' : 'bg-muted'}`}>
                                <ShieldCheck className={`w-5 h-5 ${achievements.isPromptPayer ? 'text-green-600' : 'text-muted-foreground'}`}/>
                                <div className="text-xs font-semibold">Prompt Payer</div>
                            </div>
                            <div className={`flex items-center gap-3 p-2 rounded-md ${achievements.hasCompletedLoan ? 'bg-green-500/10' : 'bg-muted'}`}>
                                <Trophy className={`w-5 h-5 ${achievements.hasCompletedLoan ? 'text-green-600' : 'text-muted-foreground'}`}/>
                                <div className="text-xs font-semibold">Loan Veteran</div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    {loanOfficer && (
                        <Card className="shadow-sm">
                             <CardHeader className="py-4"><CardTitle className="text-sm">Loan Officer</CardTitle></CardHeader>
                             <CardContent className="space-y-3 pb-4">
                                <div className="flex items-center gap-3 text-xs font-medium"><User className="w-4 h-4 text-muted-foreground"/>{loanOfficer.fullName}</div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground truncate"><Mail className="w-4 h-4 flex-shrink-0"/>{loanOfficer.email}</div>
                                <Button className="w-full text-xs h-8" variant="outline">Quick Message</Button>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="bg-blue-50/10 border-blue-100 shadow-sm">
                        <CardHeader className="py-3"><CardTitle className="text-xs flex items-center gap-2 text-blue-600"><Lightbulb className="h-3 w-3" /> Financial Tip</CardTitle></CardHeader>
                        <CardContent className="pb-3 px-3"><p className="text-xs text-muted-foreground italic leading-relaxed">&ldquo;{randomTip}&rdquo;</p></CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

