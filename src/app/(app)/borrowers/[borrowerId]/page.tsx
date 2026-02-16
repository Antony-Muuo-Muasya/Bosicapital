'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useCollection, useFirestore, useMemoFirebase, useUserProfile } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AddLoanDialog } from '@/components/loans/add-loan-dialog';
import { PlusCircle, Loader2, Phone, Mail, Fingerprint, Home as HomeIcon } from 'lucide-react';
import type { Borrower, Loan, LoanProduct } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { InteractionHistory } from '@/components/borrowers/interaction-history';

const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Pending Approval': return 'secondary';
      case 'Active': return 'default';
      case 'Completed': return 'outline';
      case 'Rejected': return 'destructive';
      default: return 'outline';
    }
};

export default function BorrowerDetailPage() {
  const params = useParams() as { borrowerId: string };
  const borrowerId = params.borrowerId;
  const router = useRouter();
  const firestore = useFirestore();
  const { userProfile } = useUserProfile();
  
  const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);

  // --- Data Fetching ---
  const borrowerRef = useMemoFirebase(() => doc(firestore, 'borrowers', borrowerId), [firestore, borrowerId]);
  const { data: borrower, isLoading: isLoadingBorrower } = useDoc<Borrower>(borrowerRef);

  const loansQuery = useMemoFirebase(() => query(collection(firestore, 'loans'), where('borrowerId', '==', borrowerId)), [firestore, borrowerId]);
  const { data: loans, isLoading: isLoadingLoans } = useCollection<Loan>(loansQuery);

  const allLoanProductsQuery = useMemoFirebase(() => {
    if (!userProfile) return null;
    return query(collection(firestore, 'loanProducts'), where('organizationId', '==', userProfile.organizationId))
  }, [firestore, userProfile]);
  const { data: allLoanProducts, isLoading: isLoadingProducts } = useCollection<LoanProduct>(allLoanProductsQuery);

  const isLoading = isLoadingBorrower || isLoadingLoans || isLoadingProducts;

  // --- Memos ---
  const loansWithDetails = useMemo(() => {
    if (!loans || !allLoanProducts) return [];
    const productsMap = new Map(allLoanProducts.map(p => [p.id, p]));
    return loans.map(loan => ({
      ...loan,
      loanProductName: productsMap.get(loan.loanProductId)?.name || 'Unknown Product',
    })).sort((a,b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
  }, [loans, allLoanProducts]);

  const canInitiateNewLoan = useMemo(() => {
    if (!loans || !borrower) return false;
    if (!borrower.registrationFeePaid) return false;
    return !loans.some(l => l.status === 'Active' || l.status === 'Pending Approval');
  }, [loans, borrower]);

  if (isLoading) {
    return (
        <div className="flex h-[calc(100vh-200px)] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }

  if (!borrower) {
    return (
        <div className="container max-w-5xl py-8">
           <PageHeader title="Borrower Not Found" />
           <Card className="mt-6">
               <CardContent className="pt-6">
                   <p className="text-center text-muted-foreground">The requested borrower could not be found or you do not have permission to view them.</p>
               </CardContent>
           </Card>
        </div>
   )
  }

  return (
    <>
      <PageHeader title={borrower.fullName} description={`ID: ${borrower.id}`}>
        <Button onClick={() => setIsAddLoanOpen(true)} disabled={!canInitiateNewLoan}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Initiate New Loan
        </Button>
      </PageHeader>
      
      <div className="p-4 md:p-6 grid gap-6 grid-cols-1 lg:grid-cols-5">
        <div className="lg:col-span-2 flex flex-col gap-6">
            <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                    <Avatar className="h-16 w-16 border">
                        <AvatarImage src={borrower.photoUrl} alt={borrower.fullName} />
                        <AvatarFallback className="text-xl">{borrower.fullName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className="text-xl">{borrower.fullName}</CardTitle>
                        <CardDescription>{borrower.email}</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /><span>{borrower.phone}</span></div>
                    <div className="flex items-center gap-3"><Fingerprint className="h-4 w-4 text-muted-foreground" /><span>{borrower.nationalId}</span></div>
                    <div className="flex items-start gap-3"><HomeIcon className="h-4 w-4 text-muted-foreground mt-0.5" /><span>{borrower.address}</span></div>
                </CardContent>
            </Card>
            <InteractionHistory borrowerId={borrowerId} />
        </div>
        <div className="lg:col-span-3">
            <Card>
                <CardHeader>
                    <CardTitle>Loan History</CardTitle>
                    <CardDescription>A record of all loans associated with this borrower.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead>Principal</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loansWithDetails.map(loan => (
                                <TableRow key={loan.id} onClick={() => router.push(`/loans/${loan.id}`)} className="cursor-pointer">
                                    <TableCell>{loan.loanProductName}</TableCell>
                                    <TableCell>{formatCurrency(loan.principal, 'KES')}</TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(loan.status)}>{loan.status}</Badge>
                                    </TableCell>
                                    <TableCell>{new Date(loan.issueDate).toLocaleDateString()}</TableCell>
                                </TableRow>
                            ))}
                            {!isLoading && loansWithDetails.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No loan history found for this borrower.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
      </div>
      
      <AddLoanDialog
        open={isAddLoanOpen}
        onOpenChange={setIsAddLoanOpen}
        preselectedBorrower={borrower}
        borrowers={[borrower]}
        loanProducts={allLoanProducts || []}
        isLoading={isLoading}
       />
    </>
  );
}
