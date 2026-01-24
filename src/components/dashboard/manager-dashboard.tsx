'use client';
import { PageHeader } from '@/components/page-header';
import { useCollection, useFirestore, useMemoFirebase, useUserProfile } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Loan, Borrower } from '@/lib/types';
import { useMemo } from 'react';
import { ManagerStatsCards } from './manager/stats-cards';
import { CustomerOverview } from './manager/customer-overview';
import { LoansOverview } from './manager/loans-overview';
import { CollectionOverview } from './manager/collection-overview';

export function ManagerDashboard() {
  const firestore = useFirestore();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const branchIds = userProfile?.branchIds || [];

  const loansQuery = useMemoFirebase(() => {
    if (!firestore || branchIds.length === 0) return null;
    return query(collection(firestore, 'loans'), where('branchId', 'in', branchIds));
  }, [firestore, branchIds]);
  
  const borrowersQuery = useMemoFirebase(() => {
    if (!firestore || branchIds.length === 0) return null;
    return query(collection(firestore, 'borrowers'), where('branchId', 'in', branchIds));
  }, [firestore, branchIds]);

  const { data: loans, isLoading: loansLoading } = useCollection<Loan>(loansQuery);
  const { data: borrowers, isLoading: borrowersLoading } = useCollection<Borrower>(borrowersQuery);

  const isLoading = isProfileLoading || loansLoading || borrowersLoading;

  const dashboardStats = useMemo(() => {
    if (isLoading || !loans || !borrowers) {
      return {
        outstandingLoanBalance: 0,
        performingLoanBalance: 0,
        totalCustomers: 0,
        activeCustomers: 0,
        inactiveCustomers: 0,
        disbursedLoans: 0,
        loansDueToday: 0,
        monthToDateArrears: 0,
        outstandingTotalLoanArrears: 0,
      };
    }

    const activeLoans = loans.filter(l => l.status === 'Active');
    
    // NOTE: Without fetching all installments, we cannot accurately calculate balances or arrears.
    // These are set to 0 to prevent the app from crashing.
    const outstandingLoanBalance = 0;
    const performingLoanBalance = 0;
    
    const totalCustomers = borrowers.length;
    const activeCustomerIds = new Set(activeLoans.map(l => l.borrowerId));
    const activeCustomers = activeCustomerIds.size;
    const inactiveCustomers = totalCustomers - activeCustomers;

    const disbursedLoans = activeLoans.length;

    const loansDueToday = 0;
    const monthToDateArrears = 0;
    const outstandingTotalLoanArrears = 0;

    return {
      outstandingLoanBalance,
      performingLoanBalance,
      totalCustomers,
      activeCustomers,
      inactiveCustomers,
      disbursedLoans,
      loansDueToday,
      monthToDateArrears,
      outstandingTotalLoanArrears,
    };

  }, [loans, borrowers, isLoading]);
  
  return (
    <>
      <PageHeader
        title="Manager Dashboard"
        description="Overview of your assigned branches."
      />
      <div className="p-4 md:p-6 grid gap-6">
        <ManagerStatsCards 
            outstandingLoanBalance={dashboardStats.outstandingLoanBalance}
            performingLoanBalance={dashboardStats.performingLoanBalance}
            totalCustomers={dashboardStats.totalCustomers}
            isLoading={isLoading}
        />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <CustomerOverview 
                activeCustomers={dashboardStats.activeCustomers}
                inactiveCustomers={dashboardStats.inactiveCustomers}
                isLoading={isLoading}
            />
            <div className="lg:col-span-2">
                <LoansOverview
                    disbursedLoans={dashboardStats.disbursedLoans}
                    loansDueToday={dashboardStats.loansDueToday}
                    monthToDateArrears={dashboardStats.monthToDateArrears}
                    outstandingTotalLoanArrears={dashboardStats.outstandingTotalLoanArrears}
                    isLoading={isLoading}
                />
            </div>
        </div>
        <CollectionOverview todaysCollectionRate={0} monthlyCollectionRate={0} isLoading={false} />
      </div>
    </>
  );
}
