'use client';
import { PageHeader } from "@/components/page-header";
import { useDoc, useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { doc, collection } from "firebase/firestore";
import type { Loan, LoanProduct, Installment, Borrower } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileDown, Circle, CheckCircle, AlertCircle, User, Phone, Briefcase } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
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

export default function LoanDetailPage({ params }: { params: { loanId: string } }) {
    const { loanId } = params;
    const firestore = useFirestore();
    const router = useRouter();

    const loanRef = useMemoFirebase(() => doc(firestore, 'loans', loanId), [firestore, loanId]);
    const { data: loan, isLoading: isLoadingLoan, error: loanError } = useDoc<Loan>(loanRef);

    useEffect(() => {
        if (loanError) {
            console.error("Permission denied or error fetching loan:", loanError.message);
            router.replace('/access-denied');
        }
    }, [loanError, router]);

    const productRef = useMemoFirebase(() => loan ? doc(firestore, 'loanProducts', loan.loanProductId) : null, [firestore, loan]);
    const { data: product, isLoading: isLoadingProduct } = useDoc<LoanProduct>(productRef);

    const borrowerRef = useMemoFirebase(() => loan ? doc(firestore, 'borrowers', loan.borrowerId) : null, [firestore, loan]);
    const { data: borrower, isLoading: isLoadingBorrower } = useDoc<Borrower>(borrowerRef);

    const installmentsQuery = useMemoFirebase(() => loan ? collection(firestore, 'loans', loan.id, 'installments') : null, [firestore, loan]);
    const { data: installments, isLoading: isLoadingInstallments } = useCollection<Installment>(installmentsQuery);
    
    const sortedInstallments = useMemo(() => {
        if (!installments) return [];
        const today = startOfToday();
        return installments.map(inst => {
            const [year, month, day] = inst.dueDate.split('-').map(Number);
            const dueDate = new Date(year, month - 1, day);
            const isOverdue = dueDate < today && inst.status !== 'Paid';
            return {
                ...inst,
                status: isOverdue ? 'Overdue' : inst.status,
            };
        }).sort((a,b) => a.installmentNumber - b.installmentNumber);
    }, [installments]);
    
    const { totalPaid, totalOutstanding } = useMemo(() => {
        if (!installments || !loan) return { totalPaid: 0, totalOutstanding: 0 };
        const paid = installments.reduce((acc, curr) => acc + curr.paidAmount, 0);
        return {
            totalPaid: paid,
            totalOutstanding: loan.totalPayable - paid
        }
    }, [installments, loan]);

    const isLoading = isLoadingLoan || isLoadingProduct || isLoadingInstallments || isLoadingBorrower;

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

    return (
        <div className="max-w-5xl mx-auto py-8 px-4 md:px-6">
             <PageHeader title={product?.name || 'Loan Details'} description={`Details for loan #${loan.id.substring(0, 8)}`}>
                <Button variant="outline">
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
                                        <AvatarImage src={borrower.photoUrl} alt={borrower.fullName} />
                                        <AvatarFallback>{borrower.fullName.charAt(0)}</AvatarFallback>
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
                                    {sortedInstallments.map(inst => {
                                        const statusConfig = getInstallmentStatusConfig(inst.status);
                                        const Icon = statusConfig.icon;
                                        return (
                                        <TableRow key={inst.id} className={inst.status === 'Paid' ? 'bg-green-500/5' : ''}>
                                            <TableCell>{inst.installmentNumber}</TableCell>
                                            <TableCell>{new Date(inst.dueDate).toLocaleDateString()}</TableCell>
                                            <TableCell>{formatCurrency(inst.expectedAmount, 'KES')}</TableCell>
                                            <TableCell>{formatCurrency(inst.paidAmount, 'KES')}</TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant={statusConfig.variant} className={cn('gap-1.5', statusConfig.className)}>
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
