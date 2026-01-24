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

export function ManagerDashboard() {
  const firestore = useFirestore();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const organizationId = userProfile?.organizationId;
  const branchIds = userProfile?.branchIds || [];

  // Branch-specific queries
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
      // This query is simplified to avoid requiring a composite index.
      // Filtering by status is now done on the client-side.
      return query(
        collectionGroup(firestore, 'installments'), 
        where('branchId', 'in', branchIds)
      );
  }, [firestore, branchIds]);

  const regPaymentsQuery = useMemoFirebase(() => {
    if (!firestore || !organizationId) return null;
    // Registration payments may not have branchIds, so query by org
    return query(collection(firestore, 'registrationPayments'), where('organizationId', '==', organizationId));
  }, [firestore, organizationId]);

  const { data: loans, isLoading: loansLoading } = useCollection<Loan>(loansQuery);
  const { data: borrowers, isLoading: borrowersLoading } = useCollection<Borrower>(borrowersQuery);
  const { data: allInstallments, isLoading: installmentsLoading } = useCollection<Installment>(installmentsQuery);
  const { data: regPayments, isLoading: regPaymentsLoading } = useCollection<RegistrationPayment>(regPaymentsQuery);

  const isLoading = isProfileLoading || loansLoading || borrowersLoading || installmentsLoading || regPaymentsLoading;

  const dueInstallmentsWithDetails = useMemo(() => {
    if (!allInstallments || !borrowers || !loans) return [];
    
    const dueStatuses: Installment['status'][] = ['Overdue', 'Unpaid', 'Partial'];
    const installments = allInstallments.filter(inst => dueStatuses.includes(inst.status));
    
    const borrowersMap = new Map(borrowers.map(b => [b.id, b]));

    return installments
      .map(inst => {
        const loan = loans?.find(l => l.id === inst.loanId);
        const borrower = loan ? borrowersMap.get(loan.borrowerId) : undefined;
        return {
          ...inst,
          borrowerName: borrower?.fullName || 'Unknown Borrower',
          borrowerPhotoUrl: borrower?.photoUrl || `https://picsum.photos/seed/${inst.id}/400/400`,
        };
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [allInstallments, borrowers, loans]);

  const overviewInstallments = useMemo(() => {
    // For overview cards, we use all installments for the branch.
    return allInstallments;
  }, [allInstallments]);


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
          installments={overviewInstallments}
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
