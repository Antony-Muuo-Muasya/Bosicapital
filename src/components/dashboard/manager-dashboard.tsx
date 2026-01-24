'use client';
import { PageHeader } from '@/components/page-header';
import { OverviewCards } from '@/components/dashboard/overview-cards';
import { useCollection, useFirestore, useMemoFirebase, useUserProfile } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Loan, Borrower, RegistrationPayment } from '@/lib/types';
import { useMemo } from 'react';

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

  const regPaymentsQuery = useMemoFirebase(() => {
    if (!firestore || !organizationId) return null;
    // Registration payments may not have branchIds, so query by org
    return query(collection(firestore, 'registrationPayments'), where('organizationId', '==', organizationId));
  }, [firestore, organizationId]);

  const { data: loans, isLoading: loansLoading } = useCollection<Loan>(loansQuery);
  const { data: borrowers, isLoading: borrowersLoading } = useCollection<Borrower>(borrowersQuery);
  const { data: regPayments, isLoading: regPaymentsLoading } = useCollection<RegistrationPayment>(regPaymentsQuery);

  // Set installments to null since we are not querying them to avoid the permission error.
  const installments = null; 

  const isLoading = isProfileLoading || loansLoading || borrowersLoading || regPaymentsLoading;

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
        <div className="border shadow-sm rounded-lg p-8 mt-4 text-center text-muted-foreground">
          Due loans and AI monitor have been temporarily disabled to resolve an error.
        </div>
      </div>
    </>
  );
}
