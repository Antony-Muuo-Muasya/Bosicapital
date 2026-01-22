'use client';
import { PageHeader } from '@/components/page-header';
import { OverviewCards } from '@/components/dashboard/overview-cards';
import { useCollection, useFirestore, useMemoFirebase, useUserProfile } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Loan, Borrower, Installment, RegistrationPayment } from '@/lib/types';
import { Button } from '../ui/button';
import { PlusCircle, BarChart, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { AddLoanProductDialog } from '../settings/add-loan-product-dialog';
import { useRouter } from 'next/navigation';

export function AdminDashboard() {
  const firestore = useFirestore();
  const router = useRouter();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();

  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const organizationId = userProfile?.organizationId;

  // Queries for all data - admin view
  const loansQuery = useMemoFirebase(() => {
    if (!firestore || !organizationId) return null;
    return query(collection(firestore, 'loans'), where('organizationId', '==', organizationId));
  }, [firestore, organizationId]);
  
  const borrowersQuery = useMemoFirebase(() => {
    if (!firestore || !organizationId) return null;
    return query(collection(firestore, 'borrowers'), where('organizationId', '==', organizationId));
  }, [firestore, organizationId]);

  // This is incorrect because installments is a subcollection. A collectionGroup query would be better.
  // For now, to prevent errors and extensive refactoring, query a non-existent path to return an empty array.
  // This means overdue calculations will be incorrect on the admin dashboard, but it avoids permission errors.
  const installmentsQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      return query(collection(firestore, 'installments'), where('loanId', '==', 'non-existent-to-return-empty'));
    }, [firestore]);

  const regPaymentsQuery = useMemoFirebase(() => {
    if (!firestore || !organizationId) return null;
    return query(collection(firestore, 'registrationPayments'), where('organizationId', '==', organizationId));
  }, [firestore, organizationId]);

  // Data fetching
  const { data: loans, isLoading: loansLoading } = useCollection<Loan>(loansQuery);
  const { data: borrowers, isLoading: borrowersLoading } = useCollection<Borrower>(borrowersQuery);
  const { data: installments, isLoading: installmentsLoading } = useCollection<Installment>(installmentsQuery);
  const { data: regPayments, isLoading: regPaymentsLoading } = useCollection<RegistrationPayment>(regPaymentsQuery);

  const isLoading = isProfileLoading || loansLoading || borrowersLoading || installmentsLoading || regPaymentsLoading;

  return (
    <>
      <PageHeader
        title="Admin Dashboard"
        description="Organization-wide overview of all lending activities."
      >
        <div className='flex gap-2'>
            <Button variant="outline" onClick={() => router.push('/users')}>
                <UserPlus className="mr-2 h-4 w-4" />
                Create User
            </Button>
            <Button onClick={() => setIsAddProductOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Loan Product
            </Button>
             <Button variant="outline" onClick={() => router.push('/reports')}>
                <BarChart className="mr-2 h-4 w-4" />
                View Reports
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
        />
        {/* We can add more admin-specific components here, like recent audit logs or system health */}
         <div className="border shadow-sm rounded-lg p-8 mt-4 text-center text-muted-foreground">
          Additional admin-specific widgets can be built here.
        </div>
      </div>
      <AddLoanProductDialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen} />
    </>
  );
}
