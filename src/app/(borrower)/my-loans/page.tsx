'use client';
import { PageHeader } from "@/components/page-header";
import { useUserProfile, useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Borrower, Loan, LoanProduct } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const getStatusVariant = (status: string) => {
    switch (status) {
        case 'Pending Approval': return 'secondary';
        case 'Active': return 'default';
        case 'Completed': return 'outline';
        case 'Rejected': return 'destructive';
        default: return 'outline';
    }
};

export default function MyLoansPage() {
    const firestore = useFirestore();
    const { user } = useUserProfile();

    const borrowerQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'borrowers'), where('userId', '==', user.uid));
    }, [firestore, user]);

    const { data: borrowerData, isLoading: isLoadingBorrower } = useCollection<Borrower>(borrowerQuery);
    const borrower = useMemo(() => borrowerData?.[0], [borrowerData]);

    const loansQuery = useMemoFirebase(() => {
        if (!borrower) return null;
        return query(collection(firestore, 'loans'), where('borrowerId', '==', borrower.id));
    }, [firestore, borrower]);

    const { data: loans, isLoading: isLoadingLoans } = useCollection<Loan>(loansQuery);

    const loanProductsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'loanProducts') : null, [firestore]);
    const { data: loanProducts, isLoading: isLoadingProducts } = useCollection<LoanProduct>(loanProductsQuery);
    
    const loansWithDetails = useMemo(() => {
        if (!loans || !loanProducts) return [];
        const loanProductsMap = new Map(loanProducts.map(p => [p.id, p]));
        return loans.map(loan => ({
            ...loan,
            loanProductName: loanProductsMap.get(loan.loanProductId)?.name || 'Unknown Product',
        })).sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
    }, [loans, loanProducts]);

    const isLoading = isLoadingBorrower || isLoadingLoans || isLoadingProducts;

    if (isLoading) {
        return (
            <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
                 <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="container max-w-5xl py-8">
            <PageHeader title="My Loans" description="Details of your current and past loans." />
            
            {!isLoading && loansWithDetails.length === 0 && (
                <Card className="mt-6">
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground">You do not have any loans.</p>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6 md:grid-cols-2 mt-6">
                {loansWithDetails.map(loan => (
                    <Link href={`/my-loans/${loan.id}`} key={loan.id} className="focus:outline-none focus:ring-2 focus:ring-ring rounded-lg">
                        <Card className="hover:bg-muted/50 transition-colors h-full">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle>{loan.loanProductName}</CardTitle>
                                    <Badge variant={getStatusVariant(loan.status)}>{loan.status}</Badge>
                                </div>
                                <CardDescription>Issued on: {new Date(loan.issueDate).toLocaleDateString()}</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Principal</p>
                                    <p className="font-medium">{formatCurrency(loan.principal, 'KES')}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Total Payable</p>
                                    <p className="font-medium">{formatCurrency(loan.totalPayable, 'KES')}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    )
}
