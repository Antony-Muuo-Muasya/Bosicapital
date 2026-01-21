'use client';
import { PageHeader } from '@/components/page-header';
import { OverviewCards } from '@/components/dashboard/overview-cards';
import { DueLoansTable } from '@/components/dashboard/due-loans-table';
import { DueDateMonitor } from '@/components/dashboard/due-date-monitor';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Loan, Borrower, Installment } from '@/lib/types';
import { useMemo, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { AddLoanDialog } from '@/components/loans/add-loan-dialog';
import { loanProducts } from '@/lib/data';

export default function DashboardPage() {
  const firestore = useFirestore();
  const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);

  // Queries
  const loansQuery = useMemoFirebase(() => firestore ? collection(firestore, 'loans') : null, [firestore]);
  const borrowersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'borrowers') : null, [firestore]);
  
  const installmentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'installments'), where('status', 'in', ['Overdue', 'Partial', 'Unpaid']));
  }, [firestore]);


  // Data fetching
  const { data: loans, isLoading: loansLoading } = useCollection<Loan>(loansQuery);
  const { data: borrowers, isLoading: borrowersLoading } = useCollection<Borrower>(borrowersQuery);
  const { data: installments, isLoading: installmentsLoading } = useCollection<Installment>(installmentsQuery);

  const dueInstallmentsWithDetails = useMemo(() => {
    if (!installments || !loans || !borrowers) return [];

    const loansMap = new Map(loans.map(l => [l.id, l]));
    const borrowersMap = new Map(borrowers.map(b => [b.id, b]));

    return installments
      .map(installment => {
        const loan = loansMap.get(installment.loanId);
        if (!loan) return null;
        const borrower = borrowersMap.get(loan.borrowerId);
        if (!borrower) return null;

        return {
          ...installment,
          borrowerName: borrower.fullName,
          borrowerPhotoUrl: borrower.photoUrl,
          loanId: loan.id,
        };
      })
      .filter(Boolean) // Remove nulls
      .sort((a, b) => new Date(a!.dueDate).getTime() - new Date(b!.dueDate).getTime()) // Sort by due date
      .slice(0, 10); // Limit to 10 for the dashboard
  }, [installments, loans, borrowers]);

  const isLoading = loansLoading || borrowersLoading || installmentsLoading;

  const aiInput = useMemo(() => {
    if (isLoading || !installments || !loans || !borrowers) {
        return {
            repaymentHistory: 'Loading...',
            externalEvents: 'Local news reports heavy flooding in the North District...', // Keep this one as example
            upcomingSchedule: 'Loading...',
            overdueSchedule: 'Loading...',
            currentSchedule: 'Loading...',
        };
    }

    const loansMap = new Map(loans.map(l => [l.id, l]));
    const borrowersMap = new Map(borrowers.map(b => [b.id, b]));

    const overdue = installments.filter(i => i.status === 'Overdue');
    const upcoming = installments.filter(i => i.status === 'Unpaid' || i.status === 'Partial');

    const formatInstallment = (inst: (Installment & {borrowerName?: string})) => {
        const loan = loansMap.get(inst.loanId);
        const borrower = loan ? borrowersMap.get(loan.borrowerId) : undefined;
        const borrowerName = borrower?.fullName || 'Unknown';
        return `${inst.loanId} (${borrowerName}): Installment ${inst.installmentNumber} for ${formatCurrency(inst.expectedAmount - inst.paidAmount)} due ${new Date(inst.dueDate).toLocaleDateString()}.`;
    }

    const overdueSchedule = overdue.length > 0 ? overdue.map(formatInstallment).join('\n') : 'No overdue payments.';
    const upcomingSchedule = upcoming.length > 0 ? upcoming.map(formatInstallment).join('\n') : 'No upcoming payments.';
    
    // Simplistic history generation
    const repaymentHistory = borrowers.slice(0, 2).map(b => {
        const borrowerLoans = loans.filter(l => l.borrowerId === b.id);
        const loanIds = borrowerLoans.map(l => l.id).join(', ');
        if (borrowerLoans.length === 0) return `No loans for ${b.fullName}.`;
        
        const recentInstallments = installments.filter(i => loanIds.includes(i.loanId));
        const history = recentInstallments.length > 0 ? `Recent status for ${b.fullName} on loans ${loanIds}: ${recentInstallments.map(i => `${i.status} on ${new Date(i.dueDate).toLocaleDateString()}`).join(', ')}` : `No recent installments for ${b.fullName}`;
        return history;
    }).join('\n');

    return {
        repaymentHistory: repaymentHistory || 'No significant repayment history to analyze.',
        externalEvents: 'National economic news indicates a 5% increase in fuel prices, affecting transport and logistics.', // Keeping as example
        upcomingSchedule,
        overdueSchedule,
        currentSchedule: 'All other loans are current.' // simplified
    }

}, [installments, loans, borrowers, isLoading]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Welcome back! Here's a real-time summary of your lending portfolio."
      >
        <Button onClick={() => setIsAddLoanOpen(true)} disabled={isLoading}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Loan
        </Button>
      </PageHeader>
      <div className="p-4 md:p-6 grid gap-6">
        <OverviewCards loans={loans} installments={installments} borrowers={borrowers} isLoading={isLoading} />
        <div className="grid gap-6 xl:grid-cols-5">
          <div className="xl:col-span-3">
            <DueLoansTable dueInstallments={dueInstallmentsWithDetails} isLoading={isLoading} />
          </div>
          <div className="xl:col-span-2">
            <DueDateMonitor aiInput={aiInput} />
          </div>
        </div>
      </div>
      <AddLoanDialog 
        open={isAddLoanOpen} 
        onOpenChange={setIsAddLoanOpen}
        borrowers={borrowers || []}
        loanProducts={loanProducts || []}
       />
    </>
  );
}
