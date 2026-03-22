'use client';
import { PageHeader } from '@/components/page-header';
import { useUserProfile } from '@/firebase';
import { getManagerDashboardStats } from '@/actions/dashboard';
import { getLoanProducts } from '@/actions/loan-products';
import { getBorrowers } from '@/actions/borrowers';
import { getRoles } from '@/actions/roles';
import type { Loan, Borrower, Installment, Repayment, LoanProduct, Role } from '@/lib/types';
import { useEffect, useState, useCallback } from 'react';
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
import { Button } from '@/components/ui/button';
import { UserPlus, PlusCircle, Users } from 'lucide-react';
import { AddBorrowerDialog } from '../borrowers/add-borrower-dialog';
import { AddLoanDialog } from '../loans/add-loan-dialog';
import { AddStaffDialog } from '../users/add-staff-dialog';

export function ManagerDashboard() {
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const organizationId = userProfile?.organizationId;
  const branchIds = userProfile?.branchIds || [];

  const [isLoading, setIsLoading] = useState(true);
  const [loans, setLoans] = useState<Loan[] | null>(null);
  const [allBorrowers, setAllBorrowers] = useState<Borrower[] | null>(null);
  const [allInstallments, setAllInstallments] = useState<Installment[] | null>(null);
  const [allRepayments, setAllRepayments] = useState<Repayment[] | null>(null);
  const [allLoanProducts, setAllLoanProducts] = useState<LoanProduct[] | null>(null);
  const [allRoles, setAllRoles] = useState<Role[] | null>(null);

  const [isAddBorrowerOpen, setIsAddBorrowerOpen] = useState(false);
  const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);

  const fetchDashboardStats = useCallback(async () => {
      if (!userProfile || branchIds.length === 0 || !organizationId) return;
      setIsLoading(true);
      try {
          const res = await getManagerDashboardStats(organizationId, branchIds);
          if (res.success && res.data) {
              setLoans(res.data.loans as any);
              setAllBorrowers(res.data.borrowers as any);
              setAllInstallments(res.data.installments as any);
              setAllRepayments(res.data.repayments as any);
          }

          const [productsRes, rolesRes] = await Promise.all([
            getLoanProducts(organizationId),
            getRoles(organizationId)
          ]);

          if (productsRes.success) setAllLoanProducts(productsRes.products as any);
          if (rolesRes.success) setAllRoles(rolesRes.roles as any);

      } catch (e) {
          console.error(e);
      } finally {
          setIsLoading(false);
      }
  }, [userProfile, organizationId, JSON.stringify(branchIds)]);

  useEffect(() => {
     if (!isProfileLoading && userProfile) {
         fetchDashboardStats();
     }
  }, [isProfileLoading, userProfile, fetchDashboardStats]);

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
      const defaultResult = {
          outstandingLoanBalance: 0, performingLoanBalance: 0, totalCustomers: 0,
          disbursedLoans: 0, loansDueToday: 0, monthToDateArrears: 0, outstandingTotalLoanArrears: 0,
          activeCustomers: 0, inactiveCustomers: 0, todaysCollectionRate: 0, monthlyCollectionRate: 0
      };

      if (isLoading || !loans || !allBorrowers || !allInstallments || !allRepayments) {
          return defaultResult;
      }
      
      const managerLoanIds = new Set(loans.map(l => l.id));
      const managerBorrowerIds = new Set(loans.map(l => l.borrowerId));
      const borrowers = allBorrowers.filter(b => managerBorrowerIds.has(b.id));
      const installments = allInstallments.filter(i => managerLoanIds.has(i.loanId));
      const repayments = allRepayments.filter(r => managerLoanIds.has(r.loanId));
      
      const today = startOfToday();
      const startOfMonthDate = startOfMonth(today);
  
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
  
      const overdueLoanIds = new Set(installments.filter(i => {
           const [year, month, day] = i.dueDate.split('-').map(Number);
           const dueDate = new Date(year, month - 1, day);
           return dueDate < today && i.status !== 'Paid';
      }).map(i => i.loanId));

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
  
      const disbursedLoans = loans.filter(l => l.status === 'Active' || l.status === 'Completed').length;
      const todayISOString = today.toISOString().split('T')[0];
      const loansDueToday = installments.filter(i => i.dueDate === todayISOString).length;
      
      let monthToDateArrears = 0;
      let outstandingTotalLoanArrears = 0;
  
      installments.forEach(inst => {
          if (inst.status !== 'Paid') {
              const [year, month, day] = inst.dueDate.split('-').map(Number);
              const dueDate = new Date(year, month - 1, day);
              if (dueDate < today) {
                  const arrear = inst.expectedAmount - inst.paidAmount;
                  outstandingTotalLoanArrears += arrear;
                  if (dueDate >= startOfMonthDate) {
                      monthToDateArrears += arrear;
                  }
              }
          }
      });
  
      const allLoanBorrowerIds = new Set(loans.map(l => l.borrowerId));
      const activeLoanBorrowerIds = new Set(loans.filter(l => l.status === 'Active').map(l => l.borrowerId));
      const activeCustomers = activeLoanBorrowerIds.size;
      const inactiveCustomers = allLoanBorrowerIds.size - activeLoanBorrowerIds.size;
      
      const installmentsDueTodayList = installments.filter(i => i.dueDate === todayISOString);
      const expectedToday = installmentsDueTodayList.reduce((sum, i) => sum + i.expectedAmount, 0);
      const paidTodayForDues = repayments.filter(r => new Date(r.paymentDate).toISOString().split('T')[0] === todayISOString && installmentsDueTodayList.some(i => i.loanId === r.loanId)).reduce((sum, r) => sum + r.amount, 0);
      const todaysCollectionRate = expectedToday > 0 ? (paidTodayForDues / expectedToday) * 100 : 0;
      
      const installmentsDueThisMonth = installments.filter(i => {
        const [year, month, day] = i.dueDate.split('-').map(Number);
        const dueDate = new Date(year, month - 1, day);
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
  }, [isLoading, loans, allBorrowers, allInstallments, allRepayments]);


  const dueInstallmentsWithDetails = useMemo(() => {
    if (!allInstallments || !allBorrowers || !loans) return [];
    
    const managerLoanIds = new Set(loans.map(l => l.id));
    const managerInstallments = allInstallments.filter(i => managerLoanIds.has(i.loanId));

    const borrowersMap = new Map(allBorrowers.map(b => [b.id, b]));

    return managerInstallments
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
  }, [allInstallments, allBorrowers, loans]);

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
        description="Overview of your branch loan portfolio."
      >
          <div className='flex gap-2'>
            <Button onClick={() => setIsAddStaffOpen(true)}>
                <Users className="mr-2 h-4 w-4" />
                Add Staff
            </Button>
            <Button onClick={() => setIsAddBorrowerOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Create Borrower
            </Button>
            <Button onClick={() => setIsAddLoanOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Loan
            </Button>
        </div>
      </PageHeader>
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

      <AddStaffDialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen} roles={allRoles || []} />
      <AddBorrowerDialog open={isAddBorrowerOpen} onOpenChange={setIsAddBorrowerOpen} />
      <AddLoanDialog
        open={isAddLoanOpen}
        onOpenChange={setIsAddLoanOpen}
        borrowers={allBorrowers || []}
        loanProducts={allLoanProducts || []}
        isLoading={isLoading}
       />
    </>
  );
}
