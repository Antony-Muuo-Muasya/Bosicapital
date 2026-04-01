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
        if (!sortedInstallments || !loan || !product) return;

        const headers = ['Installment #', 'Due Date', 'Amount Due', 'Amount Paid', 'Status'];
        const rows = sortedInstallments.map((inst: any) => [
            inst.installmentNumber,
            new Date(inst.dueDate).toLocaleDateString(),
            inst.expectedAmount,
            inst.paidAmount,
            inst.status
        ].join(','));

        const csvContent = [
            `Loan Statement for ${product.name}`,
            `Loan ID: ${loan.id}`,
            `Date: ${new Date().toLocaleDateString()}`,
            '',
            headers.join(','),
            ...rows
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `loan_statement_${loan.id.substring(0,6)}.csv`);
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
