'use client';
import * as React from 'react';
import { PageHeader } from '@/components/page-header';
import { OverviewCards } from '@/components/dashboard/overview-cards';
import { useCollection, useFirestore, useMemoFirebase, useUserProfile } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Loan, Borrower, Installment, RegistrationPayment } from '@/lib/types';
import { Button } from '../ui/button';
import { BarChart, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function ManagerDashboard() {
  const firestore = useFirestore();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const router = useRouter();

  const branchIds = userProfile?.branchIds || [];
  const organizationId = userProfile?.organizationId;

  // Queries filtered by manager's branch(es)
  const loansQuery = useMemoFirebase(() => {
    if (!firestore || !organizationId || branchIds.length === 0) return null;
    return query(collection(firestore, 'loans'), where('organizationId', '==', organizationId), where('branchId', 'in', branchIds));
  }, [firestore, organizationId, branchIds]);

  const borrowersQuery = useMemoFirebase(() => {
    if (!firestore || !organizationId || branchIds.length === 0) return null;
    return query(collection(firestore, 'borrowers'), where('organizationId', '==', organizationId), where('branchId', 'in', branchIds));
  }, [firestore, organizationId, branchIds]);

  const installmentsQuery = useMemoFirebase(() => {
    if (!firestore || !organizationId) return null;
    // Firestore doesn't support 'in' queries on different fields in the same query as other filters.
    // So we fetch all installments and filter client-side.
    // For a larger app, this should be denormalized (add branchId to installments).
    return collection(firestore, 'installments');
  }, [firestore, organizationId]);

  const regPaymentsQuery = useMemoFirebase(() => {
    if (!firestore || !organizationId) return null;
     // This is also inefficient. Would be better to have branchId on payments.
    return query(collection(firestore, 'registrationPayments'), where('organizationId', '==', organizationId));
  }, [firestore, organizationId]);

  // Data fetching
  const { data: allLoans, isLoading: loansLoading } = useCollection<Loan>(loansQuery);
  const { data: borrowers, isLoading: borrowersLoading } = useCollection<Borrower>(borrowersQuery);
  const { data: allInstallments, isLoading: installmentsLoading } = useCollection<Installment>(installmentsQuery);
  const { data: allRegPayments, isLoading: regPaymentsLoading } = useCollection<RegistrationPayment>(regPaymentsQuery);

  const isLoading = isProfileLoading || loansLoading || borrowersLoading || installmentsLoading || regPaymentsLoading;

  const { loans, installments, regPayments } = React.useMemo(() => {
    if (isLoading) return { loans: null, installments: null, regPayments: null };
    const loanIdsInBranch = new Set(allLoans?.map(l => l.id));
    const borrowerIdsInBranch = new Set(borrowers?.map(b => b.id));

    const filteredInstallments = allInstallments?.filter(i => loanIdsInBranch.has(i.loanId)) || null;
    const filteredPayments = allRegPayments?.filter(p => borrowerIdsInBranch.has(p.borrowerId)) || null;

    return { loans: allLoans, installments: filteredInstallments, regPayments: filteredPayments };
  }, [allLoans, borrowers, allInstallments, allRegPayments, isLoading]);


  return (
    <>
      <PageHeader
        title="Manager Dashboard"
        description={`Summary of activities for your branch(es).`}
      >
        <div className='flex gap-2'>
             <Button variant="outline" onClick={() => router.push('/reports')}>
                <BarChart className="mr-2 h-4 w-4" />
                View Branch Reports
            </Button>
        </div>
      </PageHeader>
      <div className="p-4 md:p-6 grid gap-6">
        <OverviewCards
          loans={loans}
          installments={installments}
          borrowers={borrowers}
          regPayments={regPayments}
          isLoading={isLoading}
          title="Branch Overview"
        />
        {/* We can add more manager-specific components here */}
         <div className="border shadow-sm rounded-lg p-8 mt-4 text-center text-muted-foreground">
          Additional manager-specific widgets can be built here.
        </div>
      </div>
    </>
  );
}
