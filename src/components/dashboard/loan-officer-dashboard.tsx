'use client';
import { PageHeader } from '@/components/page-header';
import { useCollection, useFirestore, useMemoFirebase, useUserProfile } from '@/firebase';
import { collection, query, where, documentId, collectionGroup } from 'firebase/firestore';
import type { Loan, Borrower, LoanProduct, Repayment, Installment } from '@/lib/types';
import { Button } from '../ui/button';
import { HandCoins, PlusCircle, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { AddBorrowerDialog } from '../borrowers/add-borrower-dialog';
import { AddLoanDialog } from '../loans/add-loan-dialog';
import { StatCard } from './loan-officer/StatCard';
import { Landmark, Users, Scale, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { startOfToday } from 'date-fns';
import { LoanPipeline } from './loan-officer/LoanPipeline';
import { RecentActivity } from './loan-officer/RecentActivity';
import { ActionCenter } from './loan-officer/ActionCenter';
import { CreateIndexCard } from './loan-officer/CreateIndexCard';

export function LoanOfficerDashboard() {
  const firestore = useFirestore();
  const { user, userProfile, isLoading: isProfileLoading } = useUserProfile();
  const router = useRouter();

  const [isAddBorrowerOpen, setIsAddBorrowerOpen] = useState(false);
  const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);

  // --- DATA QUERIES ---

  // 1. Get loans for the current officer
  const loansQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'loans'), where('loanOfficerId', '==', user.uid));
  }, [firestore, user]);
  const { data: loans, isLoading: loansLoading } = useCollection<Loan>(loansQuery);

  // 2. Get all borrowers in the officer's branch(es).
  const borrowersQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.branchIds || userProfile.branchIds.length === 0) {
      return query(collection(firestore, 'borrowers'), where(documentId(), '==', 'no-borrowers-found'));
    };
    return query(
        collection(firestore, 'borrowers'), 
        where('branchId', 'in', userProfile.branchIds)
    );
  }, [firestore, JSON.stringify(userProfile?.branchIds)]);
  const { data: borrowers, isLoading: borrowersLoading } = useCollection<Borrower>(borrowersQuery);


  // 3. Get all loan products (for dialogs)
  const allLoanProductsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    return query(collection(firestore, 'loanProducts'), where('organizationId', '==', userProfile.organizationId))
  }, [firestore, userProfile]);
  const { data: allLoanProducts, isLoading: allLoanProductsLoading } = useCollection<LoanProduct>(allLoanProductsQuery);
  
  // 4. Get repayments for the officer's loans
  const repaymentsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'repayments'), where('loanOfficerId', '==', user.uid));
  }, [firestore, user]);
  const { data: repayments, isLoading: repaymentsLoading } = useCollection<Repayment>(repaymentsQuery);

  // 5. Get installments for the officer's loans (This is the query that might be failing)
  const installmentsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collectionGroup(firestore, 'installments'), where('loanOfficerId', '==', user.uid));
  }, [firestore, user]);
  const { data: installments, isLoading: installmentsLoading, error: installmentsError } = useCollection<Installment>(installmentsQuery);


  // Overall loading state
  const isLoading = isProfileLoading || loansLoading || borrowersLoading || allLoanProductsLoading || repaymentsLoading || installmentsLoading;
  
  // --- DATA PROCESSING FOR DASHBOARD ---
  const dashboardStats = useMemo(() => {
    if (!loans || !installments || !borrowers) return { portfolioValue: 0, activeLoansCount: 0, totalBorrowers: 0, overdueLoansCount: 0 };
    
    const parseDate = (dateString: string) => {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
    };

    const activeLoans = loans.filter(l => l.status === 'Active');
    const portfolioValue = activeLoans.reduce((sum, loan) => sum + loan.principal, 0);

    const today = startOfToday();
    const overdueInstallments = installments.filter(i => {
        if (i.status === 'Paid') return false;
        return parseDate(i.dueDate) < today;
    });
    const overdueLoansCount = new Set(overdueInstallments.map(i => i.loanId)).size;

    return {
        portfolioValue,
        activeLoansCount: activeLoans.length,
        totalBorrowers: borrowers.length,
        overdueLoansCount: overdueLoansCount,
    };
  }, [loans, installments, borrowers]);


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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="My Portfolio Value" value={formatCurrency(dashboardStats.portfolioValue, 'KES')} icon={Landmark} featured isLoading={isLoading} />
            <StatCard title="My Active Loans" value={dashboardStats.activeLoansCount} icon={Scale} isLoading={isLoading} />
            <StatCard title="My Borrowers" value={dashboardStats.totalBorrowers} icon={Users} isLoading={isLoading} />
            <StatCard title="Overdue Loans" value={dashboardStats.overdueLoansCount} icon={AlertTriangle} isLoading={isLoading} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className='lg:col-span-2'>
              {installmentsError ? (
                  <CreateIndexCard />
              ) : (
                  <ActionCenter 
                      installments={installments}
                      loans={loans}
                      borrowers={borrowers}
                      isLoading={isLoading}
                  />
              )}
            </div>
            <div className='lg:col-span-1 space-y-6'>
                <LoanPipeline loans={loans} borrowers={borrowers} isLoading={isLoading} />
                <RecentActivity loans={loans} borrowers={borrowers} repayments={repayments} isLoading={isLoading} />
            </div>
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
