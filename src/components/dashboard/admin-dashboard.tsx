'use client';
import { PageHeader } from '@/components/page-header';
import { OverviewCards } from '@/components/dashboard/overview-cards';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Loan, Borrower, Installment, RegistrationPayment } from '@/lib/types';
import { Button } from '../ui/button';
import { PlusCircle, BarChart, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { AddLoanProductDialog } from '../settings/add-loan-product-dialog';
import { useRouter } from 'next/navigation';

export function AdminDashboard() {
  const firestore = useFirestore();
  const router = useRouter();

  const [isAddProductOpen, setIsAddProductOpen] = useState(false);

  // Queries for all data - admin view
  const loansQuery = useMemoFirebase(() => firestore ? collection(firestore, 'loans') : null, [firestore]);
  const borrowersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'borrowers') : null, [firestore]);
  const installmentsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'installments') : null, [firestore]);
  const regPaymentsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'registrationPayments') : null, [firestore]);

  // Data fetching
  const { data: loans, isLoading: loansLoading } = useCollection<Loan>(loansQuery);
  const { data: borrowers, isLoading: borrowersLoading } = useCollection<Borrower>(borrowersQuery);
  const { data: installments, isLoading: installmentsLoading } = useCollection<Installment>(installmentsQuery);
  const { data: regPayments, isLoading: regPaymentsLoading } = useCollection<RegistrationPayment>(regPaymentsQuery);

  const isLoading = loansLoading || borrowersLoading || installmentsLoading || regPaymentsLoading;

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
