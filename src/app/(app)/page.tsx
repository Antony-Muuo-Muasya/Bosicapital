'use client';
import { PageHeader } from '@/components/page-header';
import { OverviewCards } from '@/components/dashboard/overview-cards';
import { DueLoansTable } from '@/components/dashboard/due-loans-table';
import { DueDateMonitor } from '@/components/dashboard/due-date-monitor';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import type { Loan, Borrower, Installment } from '@/lib/types';
import { useMemo } from 'react';

export default function DashboardPage() {
  const firestore = useFirestore();

  // Queries
  const loansQuery = useMemoFirebase(() => firestore ? collection(firestore, 'loans') : null, [firestore]);
  const borrowersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'borrowers') : null, [firestore]);
  
  // This can get large. In a real app, you'd want to be more specific
  // and likely query for installments related to a specific branch or loan officer.
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

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Welcome back! Here's a real-time summary of your lending portfolio."
      >
        <Button>
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
            <DueDateMonitor />
          </div>
        </div>
      </div>
    </>
  );
}
