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
import { startOfToday, subMonths, format } from 'date-fns';
import { DualTrendChart } from './loan-officer/DualTrendChart';
import { LoanPipeline } from './loan-officer/LoanPipeline';
import { RecentActivity } from './loan-officer/RecentActivity';
import { TopBorrowers } from './loan-officer/TopBorrowers';
import { PerformanceTracker } from './loan-officer/PerformanceTracker';
import { LifetimeStats } from './loan-officer/LifetimeStats';
import { CollectionEfficiencyGauge } from './loan-officer/CollectionEfficiencyGauge';


export function LoanOfficerDashboard() {
  const firestore = useFirestore();
  const { user, userProfile, isLoading: isProfileLoading } = useUserProfile();
  const router = useRouter();

  const [isAddBorrowerOpen, setIsAddBorrowerOpen] = useState(false);
  const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);

  // --- DATA QUERIES ---
  const loansQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'loans'), where('loanOfficerId', '==', user.uid));
  }, [firestore, user]);
  const { data: loans, isLoading: loansLoading } = useCollection<Loan>(loansQuery);

  const borrowersInBranchQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.branchIds || userProfile.branchIds.length === 0) {
      return query(collection(firestore, 'borrowers'), where(documentId(), '==', 'no-borrowers-found'));
    };
    return query(
        collection(firestore, 'borrowers'), 
        where('branchId', 'in', userProfile.branchIds)
    );
  }, [firestore, JSON.stringify(userProfile?.branchIds)]);
  const { data: borrowersInBranch, isLoading: borrowersLoading } = useCollection<Borrower>(borrowersInBranchQuery);
  
  const myBorrowerIds = useMemo(() => {
      if (!loans) return [];
      return [...new Set(loans.map(l => l.borrowerId))];
  }, [loans]);

  const myBorrowersQuery = useMemoFirebase(() => {
      if (!firestore || myBorrowerIds.length === 0) return null;
      if (myBorrowerIds.length > 30) {
          // This is a fallback if there are too many borrowers for one 'in' query.
          return null;
      }
      return query(collection(firestore, 'borrowers'), where(documentId(), 'in', myBorrowerIds));
  }, [firestore, JSON.stringify(myBorrowerIds)]);
  const { data: myBorrowersData, isLoading: myBorrowersLoading } = useCollection<Borrower>(myBorrowersQuery);

  const myBorrowers = useMemo(() => {
      if (myBorrowersData) return myBorrowersData;
      if (borrowersInBranch) {
          const idSet = new Set(myBorrowerIds);
          return borrowersInBranch.filter(b => idSet.has(b.id));
      }
      return [];
  }, [myBorrowersData, borrowersInBranch, myBorrowerIds]);


  const allLoanProductsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    return query(collection(firestore, 'loanProducts'), where('organizationId', '==', userProfile.organizationId))
  }, [firestore, userProfile]);
  const { data: allLoanProducts, isLoading: allLoanProductsLoading } = useCollection<LoanProduct>(allLoanProductsQuery);
  
  const repaymentsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'repayments'), where('loanOfficerId', '==', user.uid));
  }, [firestore, user]);
  const { data: repayments, isLoading: repaymentsLoading } = useCollection<Repayment>(repaymentsQuery);

  const installmentsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collectionGroup(firestore, 'installments'), where('loanOfficerId', '==', user.uid));
  }, [firestore, user]);
  const { data: installments, isLoading: installmentsLoading } = useCollection<Installment>(installmentsQuery);

  const isLoading = isProfileLoading || loansLoading || borrowersLoading || myBorrowersLoading || allLoanProductsLoading || repaymentsLoading || installmentsLoading;
  
  // --- DATA PROCESSING FOR DASHBOARD ---
  const dashboardStats = useMemo(() => {
    if (isLoading || !loans || !installments || !myBorrowers) return { portfolioValue: 0, activeLoansCount: 0, totalBorrowers: 0, overdueLoansCount: 0 };
    
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
        totalBorrowers: myBorrowers.length,
        overdueLoansCount: overdueLoansCount,
    };
  }, [isLoading, loans, installments, myBorrowers]);
  
  const monthlyTrends = useMemo(() => {
    if (!loans || !repayments) return [];

    const last6Months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), i)).reverse();
    
    const trends = last6Months.map(monthDate => {
      const monthKey = format(monthDate, 'MMM yyyy');
      
      const disbursed = loans
        .filter(l => l.status === 'Active' && format(new Date(l.issueDate.replace(/-/g, '/')), 'MMM yyyy') === monthKey)
        .reduce((sum, l) => sum + l.principal, 0);

      const collected = repayments
        .filter(r => format(new Date(r.paymentDate), 'MMM yyyy') === monthKey)
        .reduce((sum, r) => sum + r.amount, 0);

      return { name: format(monthDate, 'MMM'), disbursed, collected };
    });

    return trends;
  }, [loans, repayments]);
  
    const lifetimeStats = useMemo(() => {
        if (!loans || !repayments) return { totalLoans: 0, totalPrincipal: 0, totalCollected: 0 };
        return {
            totalLoans: loans.length,
            totalPrincipal: loans.reduce((sum, l) => sum + l.principal, 0),
            totalCollected: repayments.reduce((sum, r) => sum + r.amount, 0),
        }
    }, [loans, repayments]);

    const topBorrowers = useMemo(() => {
        if (!loans || !myBorrowers) return [];
        const borrowersMap = new Map(myBorrowers.map(b => [b.id, b]));
        const principalByBorrower = loans.reduce((acc, loan) => {
            acc[loan.borrowerId] = (acc[loan.borrowerId] || 0) + loan.principal;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(principalByBorrower)
            .map(([id, amount]) => ({
                id,
                name: borrowersMap.get(id)?.fullName || 'Unknown',
                avatar: borrowersMap.get(id)?.photoUrl || `https://picsum.photos/seed/${id}/400/400`,
                amount
            }))
            .sort((a,b) => b.amount - a.amount)
            .slice(0, 3);
            
    }, [loans, myBorrowers]);

    const collectionEfficiency = useMemo(() => {
        if (!lifetimeStats.totalPrincipal || lifetimeStats.totalPrincipal === 0) return 0;
        return (lifetimeStats.totalCollected / lifetimeStats.totalPrincipal) * 100;
    }, [lifetimeStats]);


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
              <DualTrendChart data={monthlyTrends} isLoading={isLoading} />
            </div>
            <div className='space-y-6'>
                <PerformanceTracker loans={loans} borrowers={myBorrowers} isLoading={isLoading} />
                <LoanPipeline loans={loans} borrowers={myBorrowers} isLoading={isLoading} />
            </div>
        </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className='lg:col-span-1 space-y-6'>
                <LifetimeStats {...lifetimeStats} isLoading={isLoading} />
                <CollectionEfficiencyGauge value={collectionEfficiency} isLoading={isLoading} />
            </div>
             <div className='lg:col-span-1'>
                 <TopBorrowers data={topBorrowers} isLoading={isLoading} />
            </div>
             <div className='lg:col-span-1'>
                <RecentActivity loans={loans} borrowers={myBorrowers} repayments={repayments} isLoading={isLoading} />
            </div>
        </div>
      </div>
      
      <AddBorrowerDialog open={isAddBorrowerOpen} onOpenChange={setIsAddBorrowerOpen} />
      <AddLoanDialog 
        open={isAddLoanOpen} 
        onOpenChange={setIsAddLoanOpen}
        borrowers={borrowersInBranch || []}
        loanProducts={allLoanProducts || []}
        isLoading={isLoading}
       />
    </>
  );
}
