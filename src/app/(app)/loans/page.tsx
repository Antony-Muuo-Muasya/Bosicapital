'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Loan, Borrower, LoanProduct } from '@/lib/types';
import { LoansDataTable } from '@/components/loans/loans-data-table';
import { columns } from '@/components/loans/columns';
import { AddLoanDialog } from '@/components/loans/add-loan-dialog';
import { useState, useMemo } from 'react';
import { loanProducts } from '@/lib/data';

export default function LoansPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const loansQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'loans');
  }, [firestore, user]);

  const borrowersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'borrowers');
  }, [firestore, user]);

  const { data: loans, isLoading: isLoadingLoans } = useCollection<Loan>(loansQuery);
  const { data: borrowers, isLoading: isLoadingBorrowers } = useCollection<Borrower>(borrowersQuery);

  const loansWithDetails = useMemo(() => {
    if (!loans || !borrowers) return [];
    
    const borrowersMap = new Map(borrowers.map(b => [b.id, b]));
    const loanProductsMap = new Map(loanProducts.map(p => [p.id, p]));

    return loans.map(loan => ({
      ...loan,
      borrowerName: borrowersMap.get(loan.borrowerId)?.fullName || 'Unknown Borrower',
      borrowerPhotoUrl: borrowersMap.get(loan.borrowerId)?.photoUrl,
      loanProductName: loanProductsMap.get(loan.loanProductId)?.name || 'Unknown Product',
    }));

  }, [loans, borrowers]);

  const isLoading = isLoadingLoans || isLoadingBorrowers;

  return (
    <>
      <PageHeader title="Loans" description="View and manage all loans across branches.">
        <Button onClick={() => setIsAddDialogOpen(true)} disabled={isLoadingBorrowers || !borrowers}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Loan
        </Button>
      </PageHeader>
      <div className="p-4 md:p-6">
        {isLoading && <div className="border shadow-sm rounded-lg p-8 text-center text-muted-foreground">Loading loans...</div>}
        {loansWithDetails && <LoansDataTable columns={columns} data={loansWithDetails} />}
        {!isLoading && !loansWithDetails && <div className="border shadow-sm rounded-lg p-8 text-center text-muted-foreground">No loans found.</div>}
      </div>
      <AddLoanDialog 
        open={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen}
        borrowers={borrowers || []}
        loanProducts={loanProducts || []}
       />
    </>
  );
}
