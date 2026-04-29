'use client';
import { PageHeader } from "@/components/page-header";
import { getLoan } from "@/actions/loans";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileDown, Circle, CheckCircle, AlertCircle, User, Phone, Briefcase } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useMemo, useState, useCallback } from "react";
import { startOfToday } from 'date-fns';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

export default function LoanDetailPage() {
    const router = useRouter();
    const params = useParams() as { loanId: string };
    const loanId = params.loanId;
    const [data, setData] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLoanData = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getLoan(loanId);
            if (res.success && res.loan) {
                setData(res.loan);
            } else {
                setError(res.error || 'Loan not found');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [loanId]);

    useEffect(() => {
        fetchLoanData();
    }, [fetchLoanData]);

    useEffect(() => {
        if (error && error.includes('not found')) {
            console.error("Permission denied or error fetching loan:", error);
            router.replace('/access-denied');
        }
    }, [error, router]);

    const loan = data;
    const product = loan?.loanProduct;
    const borrower = loan?.borrower;
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
        }).sort((a: any,b: any) => a.installmentNumber - b.installmentNumber);
    }, [installments]);
    
    const { totalPaid, totalOutstanding } = useMemo(() => {
        if (!installments || !loan) return { totalPaid: 0, totalOutstanding: 0 };
        const paid = installments.reduce((acc: any, curr: any) => acc + curr.paidAmount, 0);
        return {
            totalPaid: paid,
            totalOutstanding: (loan.totalPayable - paid) > 0 ? (loan.totalPayable - paid) : 0
        }
    }, [installments, loan]);

    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    if (isLoading) {
        return (
            <div className="flex h-[calc(100vh-200px)] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!loan) {
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
        return <div className="flex items-center justify-center h-screen"><Loader2 className="h-10 w-10 animate-spin" /></div>;
    }

    const handleDownload = () => {
        if (!loan || !product || !sortedInstallments) return;

        const csvRows = [];
        
        // 1. Header & Loan Details
        csvRows.push(`LOAN STATEMENT - ${product.name.toUpperCase()}`);
        csvRows.push(`Organization,Bosi Capital Limited`);
        csvRows.push(`Loan ID,${loan.id}`);
        csvRows.push(`Borrower,${borrower.fullName}`);
        csvRows.push(`Date Generated,${new Date().toLocaleString()}`);
        csvRows.push('');

        // 2. Summary Stats
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
            csvRows.push(`${inst.installmentNumber},${inst.dueDate},${inst.expectedAmount},${inst.paidAmount},${inst.status}`);
        });
        csvRows.push('');

        // 4. Payment History (Actual Transactions)
        if (loan.repayments && loan.repayments.length > 0) {
            csvRows.push('PAYMENT HISTORY');
            csvRows.push('Payment Date,Transaction ID,Amount,Method,Phone/Ref');
            loan.repayments.forEach((rep: any) => {
                csvRows.push(`${new Date(rep.paymentDate).toLocaleDateString()},${rep.id},${rep.amount},${rep.method},${rep.phone || rep.reference || ''}`);
            });
        }

        const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Statement_${loan.id.substring(0,8)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const [isPaying, setIsPaying] = useState(false);
    const [payPhone, setPayPhone] = useState("");
    const [payAmount, setPayAmount] = useState("");

    // Automatically prefill the registered phone number once
    useEffect(() => {
        if (borrower?.phone) {
            setPayPhone(borrower.phone);
            setPayAmount(String(totalOutstanding));
        }
    }, [borrower?.phone, totalOutstanding]);

    const handleStkPush = async () => {
        if (!payPhone || !payAmount) return alert("Please enter phone and amount.");
        setIsPaying(true);
        try {
            const res = await fetch("/api/payments/stk-push", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: payPhone, amount: payAmount, loanId: loan.id, nationalId: borrower?.nationalId })
            });
            const d = await res.json();
            if (d.success) {
                alert("STK Push sent! Please check the phone (" + payPhone + ") and enter the M-Pesa PIN.");
                setPayAmount("");
            } else {
                alert("Failed: " + (d.error || "Please try again later."));
                console.error(d);
            }
        } catch (e) {
            alert("Error sending request.");
        } finally {
            setIsPaying(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto py-8 px-4 md:px-6">
                 <PageHeader title={product?.name || 'Loan Details'} description={`Details for loan #${String(loan.id).substring(0, 8)}`}>
                    <Button variant="outline" onClick={handleDownload}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Download Statement
                    </Button>
                </PageHeader>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-6">
                    {borrower && (
                        <Card>
                            <CardHeader><CardTitle>Borrower Details</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-12 w-12">
                                        <AvatarImage src={borrower.photoUrl || undefined} alt={borrower.fullName} />
                                        <AvatarFallback className="text-xl">{borrower.fullName?.charAt(0) ?? '?'}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold">{borrower.fullName}</p>
                                        <p className="text-sm text-muted-foreground">{borrower.email}</p>
                                    </div>
                                </div>
                                <div className="text-sm space-y-2">
                                    <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> <span>{borrower.phone}</span></div>
                                    <div className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-muted-foreground" /> <span>{borrower.employmentStatus}</span></div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                     <Card>
                        <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
                        <CardContent className="space-y-4 text-sm">
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">Principal</span>
                                <span className="font-medium">{formatCurrency(loan.principal, 'KES')}</span>
                             </div>
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">Total Payable</span>
                                <span className="font-medium">{formatCurrency(loan.totalPayable, 'KES')}</span>
                             </div>
                             <div className="flex justify-between text-green-600">
                                <span className="text-muted-foreground">Amount Paid</span>
                                <span className="font-medium">{formatCurrency(totalPaid, 'KES')}</span>
                             </div>
                             <div className="flex justify-between text-destructive">
                                <span className="text-muted-foreground">Outstanding</span>
                                <span className="font-medium">{formatCurrency(totalOutstanding, 'KES')}</span>
                             </div>
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">Status</span>
                                <Badge variant={getLoanStatusVariant(loan.status)}>{loan.status}</Badge>
                             </div>
                        </CardContent>
                    </Card>

                    <Card className="border-primary/20 bg-primary/5">
                        <CardHeader>
                            <CardTitle className="text-primary flex items-center gap-2">
                                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                                    <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
                                </svg>
                                M-Pesa Repayment (STK Push)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground uppercase font-semibold">Paybill Number</p>
                                <p className="text-lg font-bold tracking-tight text-primary">4159879</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground uppercase font-semibold">Account Number (National ID)</p>
                                <p className="text-lg font-bold tracking-tight text-primary select-all">{borrower?.nationalId || 'N/A'}</p>
                            </div>
                            <p className="text-[11px] text-muted-foreground italic leading-relaxed">
                                Use the National ID as the Account Number when paying via M-Pesa. The payment will be matched to this loan automatically.
                            </p>
                            
                            <hr className="my-2 border-border" />
                            
                            <div className="space-y-3">
                                <label className="text-xs font-semibold flex justify-between w-full">
                                    <span>Send STK Prompt to Borrower</span>
                                    {borrower?.phone && payPhone !== borrower.phone && (
                                        <Badge 
                                            variant="secondary" 
                                            className="text-[9px] cursor-pointer hover:bg-secondary/80 py-0 h-4"
                                            onClick={() => setPayPhone(borrower.phone)}
                                        >
                                            Reset to '{borrower.phone}'
                                        </Badge>
                                    )}
                                </label>
                                <div className="space-y-2">
                                     <input 
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" 
                                        placeholder="Phone (e.g. 0712345678)"
                                        value={payPhone}
                                        onChange={(e) => setPayPhone(e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                        <input 
                                            type="number"
                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" 
                                            placeholder="Amount"
                                            value={payAmount}
                                            onChange={(e) => setPayAmount(e.target.value)}
                                        />
                                        <Button size="sm" className="h-9 whitespace-nowrap" onClick={handleStkPush} disabled={isPaying || !payPhone || !payAmount}>
                                            {isPaying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Send Prompt"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Repayment Schedule</CardTitle>
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
            </div>
        </div>
    );
}
