'use client';
import { PageHeader } from "@/components/page-header";
import { getLoan } from "@/actions/loans";
// import type { Loan, LoanProduct, Installment } from '@prisma/client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileDown, Circle, CheckCircle, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouter, useParams } from "next/navigation";
import { startOfToday } from 'date-fns';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";


const getLoanStatusVariant = (status: string) => {
    switch (status) {
        case 'Pending Approval': return 'secondary';
        case 'Active': return 'default';
        case 'Completed': return 'outline';
        case 'Rejected': return 'destructive';
        default: return 'outline';
    }
};

const getInstallmentStatusConfig = (status: string) => {
    switch (status) {
        case 'Paid': return { variant: 'default', icon: CheckCircle, className: 'bg-green-500/10 text-green-700 border-green-500/20' };
        case 'Unpaid': return { variant: 'secondary', icon: Circle, className: '' };
        case 'Partial': return { variant: 'secondary', icon: Circle, className: '' };
        case 'Overdue': return { variant: 'destructive', icon: AlertCircle, className: '' };
        default: return { variant: 'outline', icon: Circle, className: '' };
    }
};

export default function MyLoanDetailPage() {
    const params = useParams() as { loanId: string };
    const loanId = params.loanId;
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(true);
    const [loan, setLoan] = useState<any>(null);

    const fetchLoanDetail = useCallback(async () => {
        if (!loanId) return;
        setIsLoading(true);
        try {
            const res = await getLoan(loanId);
            if (res.success && res.loan) {
                setLoan(res.loan as any);
            } else {
                router.replace('/my-loans');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [loanId, router]);

    useEffect(() => {
        fetchLoanDetail();

        const interval = setInterval(() => {
            fetchLoanDetail();
        }, 5000);

        return () => clearInterval(interval);
    }, [fetchLoanDetail]);

    const product = loan?.loanProduct;
    const installments = loan?.installments;
    
    const sortedInstallments = useMemo(() => {
        if (!installments) return [];
        const today = startOfToday();
        return installments.map((inst: any) => {
            const dueDate = new Date(inst.dueDate);
            const isOverdue = dueDate < today && inst.status !== 'Paid';
            return {
                ...inst,
                status: isOverdue ? 'Overdue' : inst.status,
            };
        }).sort((a: any, b: any) => a.installmentNumber - b.installmentNumber);
    }, [installments]);
    
    const { totalPaid, totalOutstanding } = useMemo(() => {
        if (!installments || !loan) return { totalPaid: 0, totalOutstanding: 0 };
        const paid = installments.reduce((acc: any, curr: any) => acc + curr.paidAmount, 0);
        return {
            totalPaid: paid,
            totalOutstanding: loan.totalPayable - paid
        }
    }, [installments, loan]);

    /* Redundant isLoading removal */

    const handleDownload = () => {
        if (!loan || !product || !sortedInstallments) return;

        const csvRows = [];
        
        // 1. Header & Loan Details
        csvRows.push(`LOAN STATEMENT - ${product.name.toUpperCase()}`);
        csvRows.push(`Organization,Bosi Capital Limited`);
        csvRows.push(`Loan ID,${loan.id}`);
        csvRows.push(`Date Generated,${new Date().toLocaleString()}`);
        csvRows.push('');

        // 2. Summary
        csvRows.push('SUMMARY');
        csvRows.push(`Principal Amount,${loan.principal}`);
        csvRows.push(`Total Payable,${loan.totalPayable}`);
        csvRows.push(`Total Paid,${totalPaid}`);
        csvRows.push(`Outstanding Balance,${totalOutstanding}`);
        csvRows.push(`Status,${loan.status}`);
        csvRows.push('');

        // 3. Repayment Schedule
        csvRows.push('REPAYMENT SCHEDULE');
        csvRows.push('Installment #,Due Date,Expected Amount,Paid Amount,Status');
        sortedInstallments.forEach((inst: any) => {
            csvRows.push(`${inst.installmentNumber},${new Date(inst.dueDate).toLocaleDateString()},${inst.expectedAmount},${inst.paidAmount},${inst.status}`);
        });
        csvRows.push('');

        // 4. Payment History
        if (loan.repayments && loan.repayments.length > 0) {
            csvRows.push('PAYMENT HISTORY');
            csvRows.push('Payment Date,Transaction ID,Amount,Method');
            loan.repayments.forEach((rep: any) => {
                csvRows.push(`${new Date(rep.paymentDate).toLocaleDateString()},${rep.id},${rep.amount},${rep.method}`);
            });
        }

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `Loan_Statement_${loan.id.substring(0,8)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (isLoading) {
        return (
            <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!loan || !product) {
        return (
             <div className="container max-w-5xl py-8">
                <PageHeader title="Loan Not Found" />
                <Card className="mt-6">
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground">The requested loan could not be found or you do not have permission to view it.</p>
                    </CardContent>
                </Card>
             </div>
        )
    }

    const [isPaying, setIsPaying] = useState(false);
    const [payPhone, setPayPhone] = useState("");
    const [payAmount, setPayAmount] = useState("");
    
    // Automatically prefill the registered phone number once
    useEffect(() => {
        if (loan?.borrower?.phone) {
            setPayPhone(loan.borrower.phone);
            setPayAmount(String(totalOutstanding));
        }
    }, [loan?.borrower?.phone, totalOutstanding]);

    const handleStkPush = async () => {
        if (!payPhone || !payAmount) return alert("Please enter phone and amount.");
        setIsPaying(true);
        try {
            const res = await fetch("/api/payments/stk-push", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: payPhone, amount: payAmount, loanId: loan.id })
            });
            const data = await res.json();
            if (data.success) {
                alert("STK Push sent! Please check your phone (" + payPhone + ") and enter your M-Pesa PIN.");
                setPayAmount("");
            } else {
                alert("Failed: " + (data.error || "Please try again later."));
                console.error(data);
            }
        } catch (e) {
            alert("Error sending request.");
        } finally {
            setIsPaying(false);
        }
    };    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    if (isLoading) {
        return (
            <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!loan || !product) {
        return (
             <div className="container max-w-5xl py-8">
                <PageHeader title="Loan Not Found" />
                <Card className="mt-6">
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground">The requested loan could not be found or you do not have permission to view it.</p>
                    </CardContent>
                </Card>
             </div>
        )
    }

    if (!mounted) {
        return (
            <div className="container max-w-5xl py-8 space-y-8 animate-pulse">
                <div className="h-10 w-48 bg-muted rounded" />
                <div className="grid grid-cols-4 gap-4">
                    {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="container max-w-5xl py-8 space-y-8">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <PageHeader 
                    title={product.name || 'Personal Loan'} 
                    description={`Loan #${String(loan.id).substring(0, 8)} • Issued on ${loan.issueDate ? new Date(loan.issueDate).toLocaleDateString() : 'N/A'}`} 
                />
                <div className="flex items-center gap-2">
                    <Badge variant={getLoanStatusVariant(loan.status) as any} className="h-7 px-3 text-sm">
                        {loan.status}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={handleDownload} disabled={sortedInstallments.length === 0}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Statement
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-card/50 backdrop-blur">
                    <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Principal</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold">{formatCurrency(loan.principal, 'KES')}</p></CardContent>
                </Card>
                 <Card className="bg-card/50 backdrop-blur">
                    <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Payable</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold">{formatCurrency(loan.totalPayable, 'KES')}</p></CardContent>
                </Card>
                 <Card className="bg-card/50 backdrop-blur border-green-500/20">
                    <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold uppercase tracking-wider text-green-600/70">Paid To Date</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid, 'KES')}</p></CardContent>
                </Card>
                 <Card className="bg-card/50 backdrop-blur border-primary/20">
                    <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold uppercase tracking-wider text-primary/70">Outstanding</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold text-primary">{formatCurrency(totalOutstanding, 'KES')}</p></CardContent>
                </Card>
            </div>

            {/* STK Push Section - Made more prominent and always visible for active/pending loans */}
            {['Active', 'Pending Approval', 'Approve'].includes(loan.status) && totalOutstanding > 0 && (
                <Card className="relative overflow-hidden border-primary/30 shadow-lg shadow-primary/5">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <svg className="w-24 h-24 text-primary" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                        </svg>
                    </div>
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="font-bold text-primary text-xs">M</span>
                            </div>
                            <CardTitle className="text-xl text-primary font-bold">Fast M-Pesa Repayment</CardTitle>
                        </div>
                        <CardDescription className="text-sm font-medium">
                            Request a payment prompt directly to your phone. Simply enter your M-Pesa PIN when it appears.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                            <div className="md:col-span-5 space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground flex justify-between">
                                    <span>Phone Number</span>
                                    {loan?.borrower?.phone && payPhone !== loan.borrower.phone && (
                                        <button 
                                            className="text-primary hover:underline"
                                            onClick={() => setPayPhone(loan.borrower.phone)}
                                        >
                                            Use registered phone
                                        </button>
                                    )}
                                </label>
                                <input 
                                    className="flex h-11 w-full rounded-lg border border-input bg-background/50 px-4 py-2 text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-all" 
                                    placeholder="07XXXXXXXX"
                                    value={payPhone}
                                    onChange={(e) => setPayPhone(e.target.value)}
                                />
                            </div>
                            <div className="md:col-span-4 space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Amount (KES)</label>
                                <input 
                                    type="number"
                                    className="flex h-11 w-full rounded-lg border border-input bg-background/50 px-4 py-2 text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-all" 
                                    placeholder="Amount to pay"
                                    value={payAmount}
                                    onChange={(e) => setPayAmount(e.target.value)}
                                />
                            </div>
                            <div className="md:col-span-3">
                                <Button 
                                    className="w-full h-11 text-base font-bold shadow-md hover:shadow-lg transition-all" 
                                    onClick={handleStkPush} 
                                    disabled={isPaying || !payPhone || !payAmount}
                                >
                                    {isPaying ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                                    {isPaying ? "Wait for prompt..." : "Send Payment Prompt"}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Repayment Schedule</CardTitle>
                            <CardDescription>
                                Installment payments are {formatCurrency(loan.installmentAmount, 'KES')} per {product.repaymentCycle}.
                            </CardDescription>
                        </div>
                        <Badge variant="outline" className="font-normal text-xs">
                            {sortedInstallments.filter((i: any) => i.status === 'Paid').length} / {sortedInstallments.length} Paid
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-none">
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Expected</TableHead>
                                <TableHead>Paid</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedInstallments.map((inst: any) => {
                                const statusConfig = getInstallmentStatusConfig(inst.status);
                                const Icon = statusConfig.icon;
                                return (
                                <TableRow key={inst.id} className={cn("transition-colors", inst.status === 'Paid' ? 'bg-green-500/5' : '')}>
                                    <TableCell className="font-medium">{inst.installmentNumber}</TableCell>
                                    <TableCell>{new Date(inst.dueDate).toLocaleDateString()}</TableCell>
                                    <TableCell className="font-semibold">{formatCurrency(inst.expectedAmount, 'KES')}</TableCell>
                                    <TableCell className={cn(inst.paidAmount > 0 ? "text-green-600 font-semibold" : "text-muted-foreground")}>
                                        {formatCurrency(inst.paidAmount, 'KES')}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant={statusConfig.variant as any} className={cn('gap-1.5 font-medium', statusConfig.className)}>
                                            <Icon className="h-3 w-3" />
                                            {inst.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                    {sortedInstallments.length === 0 && (
                        <div className="py-12 text-center">
                            <p className="text-muted-foreground">
                                {loan.status === 'Pending Approval' ? `Repayment schedule will be generated upon loan approval.` : 'No installments found for this loan.'}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
