'use client';
import { PageHeader } from '@/components/page-header';
import { OverviewCards } from '@/components/dashboard/overview-cards';
import { useCollection, useFirestore, useMemoFirebase, useUserProfile } from '@/firebase';
import { collection, query, where, collectionGroup } from 'firebase/firestore';
import type { Loan, Borrower, Installment, RegistrationPayment } from '@/lib/types';
import { DueLoansTable } from './due-loans-table';
import { useMemo } from 'react';
import { DueDateMonitor } from './due-date-monitor';
import type { DueDateMonitoringInput } from '@/ai/flows/due-date-monitoring-tool';
import { formatCurrency } from '@/lib/utils';
import { startOfToday } from 'date-fns';

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
      if (isSuperAdmin) return query(collectionGroup(firestore, 'installments'), where('status', 'in', ['Overdue', 'Unpaid', 'Partial']));
      if (branchIds.length === 0) return null;
      return query(
        collectionGroup(firestore, 'installments'), 
        where('branchId', 'in', branchIds), 
        where('status', 'in', ['Overdue', 'Unpaid', 'Partial'])
      );
  }, [firestore, JSON.stringify(branchIds), isSuperAdmin]);

  const regPaymentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    if (isSuperAdmin) return collection(firestore, 'registrationPayments');
    if (!organizationId) return null;
    // Registration payments may not have branchIds, so query by org
    return query(collection(firestore, 'registrationPayments'), where('organizationId', '==', organizationId));
  }, [firestore, organizationId, isSuperAdmin]);

  const { data: loans, isLoading: isLoadingLoans } = useCollection<Loan>(loansQuery);
  const { data: borrowers, isLoading: isLoadingBorrowers } = useCollection<Borrower>(borrowersQuery);
  const { data: installments, isLoading: isLoadingInstallments } = useCollection<Installment>(installmentsQuery);
  const { data: regPayments, isLoading: regPaymentsLoading } = useCollection<RegistrationPayment>(regPaymentsQuery);

  const isLoading = isProfileLoading || isLoadingLoans || isLoadingBorrowers || installmentsLoading || regPaymentsLoading;

  const dueInstallmentsWithDetails = useMemo(() => {
    if (!installments || !borrowers) return [];
    const borrowersMap = new Map(borrowers.map(b => [b.id, b]));
    const today = startOfToday();

    return installments
      .map(inst => {
        const loan = loans?.find(l => l.id === inst.loanId);
        const borrower = loan ? borrowersMap.get(loan.borrowerId) : undefined;
        
        // Dynamically determine overdue status
        const [year, month, day] = inst.dueDate.split('-').map(Number);
        const dueDate = new Date(year, month - 1, day);
        const isOverdue = dueDate < today && inst.status !== 'Paid';
        const currentStatus = isOverdue ? 'Overdue' : inst.status;

        return {
          ...inst,
          status: currentStatus, // Override status
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
        <OverviewCards
          loans={loans}
          installments={installments}
          borrowers={borrowers}
          regPayments={regPayments}
          isLoading={isLoading}
        />
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
