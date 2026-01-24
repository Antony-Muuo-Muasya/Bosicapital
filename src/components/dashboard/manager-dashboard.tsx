'use client';
import { PageHeader } from '@/components/page-header';
import { useCollection, useFirestore, useMemoFirebase, useUserProfile } from '@/firebase';
import { collection, query, where, collectionGroup } from 'firebase/firestore';
import type { Loan, Borrower, Installment } from '@/lib/types';
import { useMemo } from 'react';
import { isToday, isThisMonth } from 'date-fns';
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

  const installmentsQuery = useMemoFirebase(() => {
      if (!firestore || branchIds.length === 0) return null;
      return query(
        collectionGroup(firestore, 'installments'), 
        where('branchId', 'in', branchIds)
      );
  }, [firestore, branchIds]);

  const { data: loans, isLoading: loansLoading } = useCollection<Loan>(loansQuery);
  const { data: borrowers, isLoading: borrowersLoading } = useCollection<Borrower>(borrowersQuery);
  const { data: installments, isLoading: installmentsLoading } = useCollection<Installment>(installmentsQuery);

  const isLoading = isProfileLoading || loansLoading || borrowersLoading || installmentsLoading;

  const dashboardStats = useMemo(() => {
    if (isLoading || !loans || !borrowers || !installments) {
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
    const installmentsByLoan = installments.reduce((acc, inst) => {
        if (!acc[inst.loanId]) acc[inst.loanId] = [];
        acc[inst.loanId].push(inst);
        return acc;
    }, {} as Record<string, Installment[]>);

    let outstandingLoanBalance = 0;
    let performingLoanBalance = 0;

    for (const loan of activeLoans) {
        const totalPaid = (installmentsByLoan[loan.id] || []).reduce((sum, i) => sum + i.paidAmount, 0);
        const balance = loan.totalPayable - totalPaid;
        outstandingLoanBalance += balance;

        const isOverdue = (installmentsByLoan[loan.id] || []).some(i => i.status === 'Overdue');
        if (!isOverdue) {
            performingLoanBalance += balance;
        }
    }
    
    const totalCustomers = borrowers.length;
    const activeCustomerIds = new Set(activeLoans.map(l => l.borrowerId));
    const activeCustomers = activeCustomerIds.size;
    const inactiveCustomers = totalCustomers - activeCustomers;

    const disbursedLoans = activeLoans.length;

    const loansDueToday = installments.filter(i => i.status === 'Unpaid' && isToday(new Date(i.dueDate))).length;
    
    const outstandingTotalLoanArrears = installments
      .filter(i => i.status === 'Overdue')
      .reduce((sum, i) => sum + (i.expectedAmount - i.paidAmount), 0);
      
    const monthToDateArrears = installments
      .filter(i => i.status === 'Overdue' && isThisMonth(new Date(i.dueDate)))
      .reduce((sum, i) => sum + (i.expectedAmount - i.paidAmount), 0);

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

  }, [loans, borrowers, installments, isLoading]);
  
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
