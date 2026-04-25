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
    };

    return (
        <div className="container max-w-5xl py-8">
             <PageHeader title={product.name} description={`Details for loan #${loan.id.substring(0, 8)}`}>
                <Button variant="outline" onClick={handleDownload} disabled={sortedInstallments.length === 0}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Download Statement
                </Button>
            </PageHeader>

            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Principal Amount</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-semibold">{formatCurrency(loan.principal, 'KES')}</p></CardContent>
                </Card>
                 <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Payable</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-semibold">{formatCurrency(loan.totalPayable, 'KES')}</p></CardContent>
                </Card>
                 <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Amount Paid</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-semibold text-green-600">{formatCurrency(totalPaid, 'KES')}</p></CardContent>
                </Card>
                 <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Amount Outstanding</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-semibold text-destructive">{formatCurrency(totalOutstanding, 'KES')}</p></CardContent>
                </Card>
            </div>

            {loan.status === 'Active' && totalOutstanding > 0 && (
                <Card className="mt-8 border-primary bg-primary/5">
                    <CardHeader>
                        <CardTitle className="text-primary">Pay Automatically (M-Pesa STK Push)</CardTitle>
                        <CardDescription>
                            Enter your M-Pesa number and the amount you want to pay. A prompt will appear on your phone to enter your PIN.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col sm:flex-row gap-4 items-end">
                            <div className="flex-1 space-y-2">
                                <label className="text-sm font-medium">M-Pesa Phone Number</label>
                                <input 
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" 
                                    placeholder="e.g. 0712345678"
                                    value={payPhone}
                                    onChange={(e) => setPayPhone(e.target.value)}
                                />
                            </div>
                            <div className="flex-1 space-y-2">
                                <label className="text-sm font-medium">Amount to Pay (KES)</label>
                                <input 
                                    type="number"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" 
                                    placeholder="Total outstanding: "
                                    value={payAmount}
                                    onChange={(e) => setPayAmount(e.target.value)}
                                />
                            </div>
                            <Button className="h-10 px-8" onClick={handleStkPush} disabled={isPaying || !payPhone || !payAmount}>
                                {isPaying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {isPaying ? "Sending..." : "Send Prompt"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="mt-8">
                <CardHeader>
                    <CardTitle>Repayment Schedule</CardTitle>
                    <CardDescription>
                        Installments are {formatCurrency(loan.installmentAmount, 'KES')} per {product.repaymentCycle}.
                         <Badge variant={getLoanStatusVariant(loan.status) as any} className="ml-2">{loan.status}</Badge>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Amount Due</TableHead>
                                <TableHead>Amount Paid</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedInstallments.map((inst: any) => {
                                const statusConfig = getInstallmentStatusConfig(inst.status);
                                const Icon = statusConfig.icon;
                                return (
                                <TableRow key={inst.id} className={inst.status === 'Paid' ? 'bg-green-500/5' : ''}>
                                    <TableCell>{inst.installmentNumber}</TableCell>
                                    <TableCell>{new Date(inst.dueDate).toLocaleDateString()}</TableCell>
                                    <TableCell>{formatCurrency(inst.expectedAmount, 'KES')}</TableCell>
                                    <TableCell>{formatCurrency(inst.paidAmount, 'KES')}</TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant={statusConfig.variant as any} className={cn('gap-1.5', statusConfig.className)}>
                                            <Icon className="h-3 w-3" />
                                            {inst.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            )})}
                            {!isLoading && sortedInstallments.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        {loan.status === 'Pending Approval' ? `Repayment schedule will be generated upon loan approval.` : 'No installments found for this loan.'}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

        </div>
    );
}
