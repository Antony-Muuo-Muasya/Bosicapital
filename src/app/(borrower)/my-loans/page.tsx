'use client';
import { PageHeader } from "@/components/page-header";
import { useUserProfile } from '@/providers/user-profile';
import { getBorrowers } from "@/actions/borrowers";
import { getLoans } from "@/actions/loans";
import { getLoanProducts } from "@/actions/loan-products";
import type { Borrower, Loan, LoanProduct } from '@/lib/types';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const getStatusVariant = (status: string): {variant: "default" | "secondary" | "outline" | "destructive", className: string} => {
    switch (status) {
        case 'Pending Approval': return { variant: 'secondary', className: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20' };
        case 'Active': return { variant: 'default', className: 'bg-blue-500/10 text-blue-700 border-blue-500/20' };
        case 'Completed': return { variant: 'outline', className: 'bg-green-500/10 text-green-700 border-green-500/20' };
        case 'Rejected': return { variant: 'destructive', className: '' };
        default: return { variant: 'outline', className: '' };
    }
};

export default function MyLoansPage() {
    const { user, isLoading: isProfileLoading } = useUserProfile();

    const [isLoading, setIsLoading] = useState(true);
    const [borrower, setBorrower] = useState<Borrower | null>(null);
    const [loans, setLoans] = useState<Loan[] | null>(null);
    const [loanProducts, setLoanProducts] = useState<LoanProduct[] | null>(null);

    const fetchMyLoansData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            // Borrower
            const borrowersRes = await getBorrowers(undefined as any, user.id);
            if (borrowersRes.success && borrowersRes.borrowers && borrowersRes.borrowers.length > 0) {
                const b = borrowersRes.borrowers[0];
                setBorrower(b as any);
                
                // Loans
                const loansRes = await getLoans(b.organizationId, b.id);
                if (loansRes.success && loansRes.loans) {
                    setLoans(loansRes.loans as any);
                }

                // Products
                const productsRes = await getLoanProducts(b.organizationId);
                if (productsRes.success && productsRes.products) {
                    setLoanProducts(productsRes.products as any);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!isProfileLoading && user) {
            fetchMyLoansData();
        }
    }, [isProfileLoading, user, fetchMyLoansData]);
    
    const loansWithDetails = useMemo(() => {
        if (!loans || !loanProducts) return [];
        const loanProductsMap = new Map(loanProducts.map(p => [p.id, p]));
        return loans.map(loan => ({
            ...loan,
            loanProductName: loanProductsMap.get(loan.loanProductId)?.name || 'Unknown Product',
        })).sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
    }, [loans, loanProducts]);

    /* Redundant isLoading removal */

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
                {loansWithDetails.map(loan => {
                    const statusConfig = getStatusVariant(loan.status);
                    return (
                    <Link href={`/my-loans/${loan.id}`} key={loan.id} className="focus:outline-none focus:ring-2 focus:ring-ring rounded-lg group">
                        <Card className="hover:border-primary transition-all h-full flex flex-col">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle>{loan.loanProductName}</CardTitle>
                                    <Badge variant={statusConfig.variant} className={statusConfig.className}>{loan.status}</Badge>
                                </div>
                                <CardDescription>Issued on: {new Date(loan.issueDate).toLocaleDateString()}</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4 text-sm flex-grow">
                                <div>
                                    <p className="text-muted-foreground">Principal</p>
                                    <p className="font-semibold text-lg">{formatCurrency(loan.principal, 'KES')}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Total Payable</p>
                                    <p className="font-semibold text-lg">{formatCurrency(loan.totalPayable, 'KES')}</p>
                                </div>
                            </CardContent>
                             <div className="p-6 pt-0 text-right text-xs text-primary group-hover:underline">
                                View Details &rarr;
                             </div>
                        </Card>
                    </Link>
                )})}
            </div>
        </div>
    )
}
