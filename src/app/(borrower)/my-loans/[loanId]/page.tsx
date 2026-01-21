'use client';
import { PageHeader } from "@/components/page-header";
import { useDoc, useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { doc, collection } from "firebase/firestore";
import type { Loan, LoanProduct, Installment } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { useEffect } from "react";


const getLoanStatusVariant = (status: string) => {
    switch (status) {
        case 'Pending Approval': return 'secondary';
        case 'Active': return 'default';
        case 'Completed': return 'outline';
        case 'Rejected': return 'destructive';
        default: return 'outline';
    }
};

const getInstallmentStatusVariant = (status: string) => {
    switch (status) {
        case 'Paid': return 'default';
        case 'Unpaid': return 'secondary';
        case 'Partial': return 'secondary';
        case 'Overdue': return 'destructive';
        default: return 'outline';
    }
};

export default function MyLoanDetailPage({ params }: { params: { loanId: string } }) {
    const firestore = useFirestore();
    const router = useRouter();

    const loanRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, 'loans', params.loanId);
    }, [firestore, params.loanId]);
    
    const { data: loan, isLoading: isLoadingLoan, error: loanError } = useDoc<Loan>(loanRef);

    // This is a client-side guard. Security rules are the primary enforcement.
    useEffect(() => {
        if (loanError) {
            router.replace('/access-denied');
        }
    }, [loanError, router]);

    const productRef = useMemoFirebase(() => {
        if (!firestore || !loan) return null;
        return doc(firestore, 'loanProducts', loan.loanProductId);
    }, [firestore, loan]);

    const { data: product, isLoading: isLoadingProduct } = useDoc<LoanProduct>(productRef);

    const installmentsQuery = useMemoFirebase(() => {
        if (!firestore || !loan) return null;
        // Only fetch installments for active or completed loans
        if (loan.status === 'Active' || loan.status === 'Completed') {
            return collection(firestore, 'loans', loan.id, 'installments');
        }
        return null;
    }, [firestore, loan]);

    const { data: installments, isLoading: isLoadingInstallments } = useCollection<Installment>(installmentsQuery);

    const isLoading = isLoadingLoan || isLoadingProduct || isLoadingInstallments;

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

    const sortedInstallments = installments?.sort((a,b) => a.installmentNumber - b.installmentNumber) || [];

    return (
        <div className="container max-w-5xl py-8">
            <PageHeader title={product.name} description={`Details for loan #${loan.id.substring(0, 8)}`} />

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Loan Summary</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-4 gap-4 text-sm">
                    <div>
                        <p className="text-muted-foreground">Principal</p>
                        <p className="font-medium">{formatCurrency(loan.principal, 'KES')}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Total Payable</p>
                        <p className="font-medium">{formatCurrency(loan.totalPayable, 'KES')}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Installment</p>
                        <p className="font-medium">{formatCurrency(loan.installmentAmount, 'KES')} / {product.repaymentCycle}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Status</p>
                        <p className="font-medium"><Badge variant={getLoanStatusVariant(loan.status)}>{loan.status}</Badge></p>
                    </div>
                </CardContent>
            </Card>

            <Card className="mt-8">
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
                            {sortedInstallments.map(inst => (
                                <TableRow key={inst.id}>
                                    <TableCell>{inst.installmentNumber}</TableCell>
                                    <TableCell>{new Date(inst.dueDate).toLocaleDateString()}</TableCell>
                                    <TableCell>{formatCurrency(inst.expectedAmount, 'KES')}</TableCell>
                                    <TableCell>{formatCurrency(inst.paidAmount, 'KES')}</TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant={getInstallmentStatusVariant(inst.status)}>{inst.status}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!isLoading && sortedInstallments.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        {loan.status === 'Active' || loan.status === 'Completed' ? 'No installments found for this loan.' : `Repayment schedule will be generated upon loan approval.`}
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
