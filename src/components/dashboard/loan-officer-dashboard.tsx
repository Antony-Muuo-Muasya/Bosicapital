'use client';
import { PageHeader } from '@/components/page-header';
import { OverviewCards } from '@/components/dashboard/overview-cards';
import { useCollection, useFirestore, useMemoFirebase, useUserProfile } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Loan, Borrower, Installment, RegistrationPayment } from '@/lib/types';
import { Button } from '../ui/button';
import { HandCoins, PlusCircle, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AddBorrowerDialog } from '../borrowers/add-borrower-dialog';
import { AddLoanDialog } from '../loans/add-loan-dialog';


export function LoanOfficerDashboard() {
  const firestore = useFirestore();
  const { user, userProfile, isLoading: isProfileLoading } = useUserProfile();
  const router = useRouter();

  const [isAddBorrowerOpen, setIsAddBorrowerOpen] = useState(false);
  const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);

  // Queries for all data - will be used to get all products/borrowers for loan creation
  const allLoanProductsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'loanProducts') : null, [firestore]);
  
  // Queries filtered by loan officer
  const loansQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'loans'), where('loanOfficerId', '==', user.uid));
  }, [firestore, user]);

  const borrowersQuery = useMemoFirebase(() => {
    if (!firestore || !user || !userProfile?.branchIds?.length) return null;
    // A borrower is not directly assigned to a loan officer.
    // We will show all borrowers in the officer's branch.
    return query(collection(firestore, 'borrowers'), where('organizationId', '==', userProfile.organizationId), where('branchId', 'in', userProfile.branchIds));
  }, [firestore, user, userProfile]);

  const { data: loans, isLoading: loansLoading } = useCollection<Loan>(loansQuery);
  const { data: borrowers, isLoading: borrowersLoading } = useCollection<Borrower>(borrowersQuery);
  const { data: allLoanProducts, isLoading: allLoanProductsLoading } = useCollection<LoanProduct>(allLoanProductsQuery);

  const isLoading = isProfileLoading || loansLoading || borrowersLoading || allLoanProductsLoading;

  return (
    <>
      <PageHeader
        title="Loan Officer Dashboard"
        description="Your personal dashboard for managing loans and borrowers."
      >
        <div className='flex gap-2'>
            <Button onClick={() => setIsAddBorrowerOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Create Borrower
            </Button>
            <Button onClick={() => setIsAddLoanOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Loan
            </Button>
             <Button variant="outline" onClick={() => router.push('/repayments')}>
                <HandCoins className="mr-2 h-4 w-4" />
                Record Repayment
            </Button>
        </div>
      </PageHeader>
      <div className="p-4 md:p-6 grid gap-6">
        <div className="border shadow-sm rounded-lg p-8 mt-4 text-center text-muted-foreground">
          Widgets for "My Assigned Loans", "Loans Due Today", etc. can be built here.
          <p className='text-sm mt-2'>Assigned Loans: {loans?.length ?? '...'}</p>
          <p className='text-sm'>My Borrowers: {borrowers?.length ?? '...'}</p>
        </div>
      </div>
      <AddBorrowerDialog open={isAddBorrowerOpen} onOpenChange={setIsAddBorrowerOpen} />
      <AddLoanDialog 
        open={isAddLoanOpen} 
        onOpenChange={setIsAddLoanOpen}
        borrowers={borrowers || []}
        loanProducts={allLoanProducts || []}
        isLoading={isLoading}
       />
    </>
  );
}
