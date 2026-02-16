'use client';
import { PageHeader } from '@/components/page-header';
import { useCollection, useFirestore, useMemoFirebase, useUserProfile } from '@/firebase';
import { collection, query, where, collectionGroup } from 'firebase/firestore';
import type { Loan, Borrower, Installment, RegistrationPayment, Repayment } from '@/lib/types';
import { DueLoansTable } from './due-loans-table';
import { useMemo } from 'react';
import { DueDateMonitor } from './due-date-monitor';
import type { DueDateMonitoringInput } from '@/ai/flows/due-date-monitoring-tool';
import { formatCurrency } from '@/lib/utils';
import { startOfToday, startOfMonth } from 'date-fns';
import { ManagerStatsCards } from './manager/stats-cards';
import { LoansOverview } from './manager/loans-overview';
import { CustomerOverview } from './manager/customer-overview';
import { CollectionOverview } from './manager/collection-overview';

export function ManagerDashboard() {
  const firestore = useFirestore();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const organizationId = userProfile?.organizationId;
  const branchIds = userProfile?.branchIds || [];
  const isSuperAdmin = userProfile?.roleId === 'superadmin';

  // Branch-specific queries
  const loansQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    if (isSuperAdmin) return collection(firestore, 'loans');
    if (branchIds.length === 0) return null;
    return query(collection(firestore, 'loans'), where('branchId', 'in', branchIds));
  }, [firestore, JSON.stringify(branchIds), isSuperAdmin]);
  
  const borrowersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    if (isSuperAdmin) return collection(firestore, 'borrowers');
    if (branchIds.length === 0) return null;
    return query(collection(firestore, 'borrowers'), where('branchId', 'in', branchIds));
  }, [firestore, JSON.stringify(branchIds), isSuperAdmin]);

  const installmentsQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      if (isSuperAdmin) return query(collectionGroup(firestore, 'installments'));
      if (branchIds.length === 0) return null;
      return query(
        collectionGroup(firestore, 'installments'), 
        where('branchId', 'in', branchIds)
      );
  }, [firestore, JSON.stringify(branchIds), isSuperAdmin]);

  const regPaymentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    if (isSuperAdmin) return collection(firestore, 'registrationPayments');
    if (!organizationId) return null;
    return query(collection(firestore, 'registrationPayments'), where('organizationId', '==', organizationId));
  }, [firestore, organizationId, isSuperAdmin]);

  const repaymentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    if (isSuperAdmin) return collection(firestore, 'repayments');
    if (!organizationId) return null;
    return query(collection(firestore, 'repayments'), where('organizationId', '==', organizationId));
  }, [firestore, organizationId, isSuperAdmin]);

  const { data: loans, isLoading: isLoadingLoans } = useCollection<Loan>(loansQuery);
  const { data: borrowers, isLoading: isLoadingBorrowers } = useCollection<Borrower>(borrowersQuery);
  const { data: installments, isLoading: isLoadingInstallments } = useCollection<Installment>(installmentsQuery);
  const { data: regPayments, isLoading: regPaymentsLoading } = useCollection<RegistrationPayment>(regPaymentsQuery);
  const { data: repayments, isLoading: isLoadingRepayments } = useCollection<Repayment>(repaymentsQuery);

  const isLoading = isProfileLoading || isLoadingLoans || isLoadingBorrowers || isLoadingInstallments || regPaymentsLoading || isLoadingRepayments;

  const {
      outstandingLoanBalance,
      performingLoanBalance,
      totalCustomers,
      disbursedLoans,
      loansDueToday,
      monthToDateArrears,
      outstandingTotalLoanArrears,
      activeCustomers,
      inactiveCustomers,
      todaysCollectionRate,
      monthlyCollectionRate,
  } = useMemo(() => {
      if (isLoading || !loans || !borrowers || !installments || !repayments) {
          return {
              outstandingLoanBalance: 0, performingLoanBalance: 0, totalCustomers: 0,
              disbursedLoans: 0, loansDueToday: 0, monthToDateArrears: 0, outstandingTotalLoanArrears: 0,
              activeCustomers: 0, inactiveCustomers: 0, todaysCollectionRate: 0, monthlyCollectionRate: 0
          };
      }
      
      const today = startOfToday();
      const startOfMonthDate = startOfMonth(today);
  
      // --- High level stats ---
      const totalCustomers = borrowers.length;
      let outstandingLoanBalance = 0;
      const activeLoanIds = new Set<string>();

      loans.forEach(loan => {
          if (loan.status === 'Active') {
              const paidAmount = installments.filter(i => i.loanId === loan.id).reduce((sum, i) => sum + i.paidAmount, 0);
              const outstanding = loan.totalPayable - paidAmount;
              if (outstanding > 0) {
                  outstandingLoanBalance += outstanding;
                  activeLoanIds.add(loan.id);
              }
          }
      });
  
      const overdueLoanIds = new Set(installments.filter(i => new Date(i.dueDate) < today && i.status !== 'Paid').map(i => i.loanId));
      let performingLoanBalance = 0;
      activeLoanIds.forEach(loanId => {
          if (!overdueLoanIds.has(loanId)) {
              const loan = loans.find(l => l.id === loanId);
              if (loan) {
                   const paidAmount = installments.filter(i => i.loanId === loan.id).reduce((sum, i) => sum + i.paidAmount, 0);
                   const outstanding = loan.totalPayable - paidAmount;
                   if (outstanding > 0) {
                      performingLoanBalance += outstanding;
                   }
              }
          }
      });
  
      // --- Loans Overview stats ---
      const disbursedLoans = loans.filter(l => l.status === 'Active' || l.status === 'Completed').length;
      const todayISOString = today.toISOString().split('T')[0];
      const loansDueToday = installments.filter(i => i.dueDate === todayISOString).length;
      
      let monthToDateArrears = 0;
      let outstandingTotalLoanArrears = 0;
  
      installments.forEach(inst => {
          if (inst.status !== 'Paid') {
              const dueDate = new Date(inst.dueDate);
              if (dueDate < today) {
                  const arrear = inst.expectedAmount - inst.paidAmount;
                  outstandingTotalLoanArrears += arrear;
                  if (dueDate >= startOfMonthDate) {
                      monthToDateArrears += arrear;
                  }
              }
          }
      });
  
      // --- Customer Overview stats ---
      const allLoanBorrowerIds = new Set(loans.map(l => l.borrowerId));
      const activeLoanBorrowerIds = new Set(loans.filter(l => l.status === 'Active').map(l => l.borrowerId));
      const activeCustomers = activeLoanBorrowerIds.size;
      const inactiveCustomers = allLoanBorrowerIds.size - activeLoanBorrowerIds.size;
      
      // --- Collection Overview stats ---
      const installmentsDueTodayList = installments.filter(i => i.dueDate === todayISOString);
      const expectedToday = installmentsDueTodayList.reduce((sum, i) => sum + i.expectedAmount, 0);
      const paidTodayForDues = repayments.filter(r => new Date(r.paymentDate).toISOString().split('T')[0] === todayISOString && installmentsDueTodayList.some(i => i.loanId === r.loanId)).reduce((sum, r) => sum + r.amount, 0);
      const todaysCollectionRate = expectedToday > 0 ? (paidTodayForDues / expectedToday) * 100 : 0;
      
      const installmentsDueThisMonth = installments.filter(i => {
        const dueDate = new Date(i.dueDate);
        return dueDate >= startOfMonthDate && dueDate <= today
      });
      const expectedThisMonth = installmentsDueThisMonth.reduce((sum, i) => sum + i.expectedAmount, 0);
      const paidThisMonthForDues = repayments.filter(r => {
        const paymentDate = new Date(r.paymentDate);
        return paymentDate >= startOfMonthDate && installmentsDueThisMonth.some(i => i.loanId === r.loanId)
      }).reduce((sum, r) => sum + r.amount, 0);
      const monthlyCollectionRate = expectedThisMonth > 0 ? (paidThisMonthForDues / expectedThisMonth) * 100 : 0;
  
      return {
          outstandingLoanBalance, performingLoanBalance, totalCustomers,
          disbursedLoans, loansDueToday, monthToDateArrears, outstandingTotalLoanArrears,
          activeCustomers, inactiveCustomers, todaysCollectionRate, monthlyCollectionRate
      };
  }, [isLoading, loans, borrowers, installments, repayments]);


  const dueInstallmentsWithDetails = useMemo(() => {
    if (!installments || !borrowers) return [];
    const borrowersMap = new Map(borrowers.map(b => [b.id, b]));

    return installments
      .filter(inst => inst.status !== 'Paid')
      .map(inst => {
        const loan = loans?.find(l => l.id === inst.loanId);
        const borrower = loan ? borrowersMap.get(loan.borrowerId) : undefined;
        
        const [year, month, day] = inst.dueDate.split('-').map(Number);
        const dueDate = new Date(year, month - 1, day);
        const isOverdue = dueDate < startOfToday() && inst.status !== 'Paid';
        const currentStatus = isOverdue ? 'Overdue' : inst.status;

        return {
          ...inst,
          status: currentStatus,
          borrowerName: borrower?.fullName || 'Unknown Borrower',
          borrowerPhotoUrl: borrower?.photoUrl || `https://picsum.photos/seed/${inst.id}/400/400`,
        };
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [installments, borrowers, loans]);

  const aiInput = useMemo((): DueDateMonitoringInput => {
    const history = dueInstallmentsWithDetails.map(i => `${i.borrowerName}: ${i.status} on ${i.dueDate} for ${formatCurrency(i.expectedAmount)}`).join('\n');
    const upcoming = dueInstallmentsWithDetails.filter(i => i.status === 'Unpaid').map(i => `${i.borrowerName} on ${i.dueDate}`).join(', ');
    const overdue = dueInstallmentsWithDetails.filter(i => i.status === 'Overdue').map(i => `${i.borrowerName} on ${i.dueDate}`).join(', ');

    return {
      repaymentHistory: history || 'No relevant repayment history.',
      externalEvents: 'No major external events reported.',
      upcomingSchedule: upcoming || 'No upcoming payments.',
      overdueSchedule: overdue || 'No overdue payments.',
      currentSchedule: 'All other loans are current.'
    }
  }, [dueInstallmentsWithDetails]);


  return (
    <>
      <PageHeader
        title="Manager Dashboard"
        description="Overview of your assigned branches."
      />
      <div className="p-4 md:p-6 grid gap-6">
        <ManagerStatsCards 
            outstandingLoanBalance={outstandingLoanBalance}
            performingLoanBalance={performingLoanBalance}
            totalCustomers={totalCustomers}
            isLoading={isLoading}
        />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <LoansOverview 
                disbursedLoans={disbursedLoans}
                loansDueToday={loansDueToday}
                monthToDateArrears={monthToDateArrears}
                outstandingTotalLoanArrears={outstandingTotalLoanArrears}
                isLoading={isLoading}
            />
            <CustomerOverview 
                activeCustomers={activeCustomers}
                inactiveCustomers={inactiveCustomers}
                isLoading={isLoading}
            />
            <CollectionOverview
                todaysCollectionRate={todaysCollectionRate}
                monthlyCollectionRate={monthlyCollectionRate}
                isLoading={isLoading}
            />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            <div className="lg:col-span-4">
              <DueLoansTable dueInstallments={dueInstallmentsWithDetails} isLoading={isLoading} />
            </div>
            <div className="lg:col-span-3">
              <DueDateMonitor aiInput={aiInput} />
            </div>
        </div>
      </div>
    </>
  );
}
