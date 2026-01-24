'use client';
import { PageHeader } from '@/components/page-header';
import { useCollection, useFirestore, useMemoFirebase, useUserProfile } from '@/firebase';
import { collection, query, where, collectionGroup, documentId } from 'firebase/firestore';
import type { Loan, Borrower, Installment, LoanProduct, Repayment } from '@/lib/types';
import { Button } from '../ui/button';
import { HandCoins, PlusCircle, UserPlus, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { AddBorrowerDialog } from '../borrowers/add-borrower-dialog';
import { AddLoanDialog } from '../loans/add-loan-dialog';
import { StatCard } from './loan-officer/StatCard';
import { Landmark, Users, Scale, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PerformanceTracker } from './loan-officer/PerformanceTracker';
import { LoanPipeline } from './loan-officer/LoanPipeline';
import { RecentActivity } from './loan-officer/RecentActivity';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';


export function LoanOfficerDashboard() {
  const firestore = useFirestore();
  const { user, userProfile, isLoading: isProfileLoading } = useUserProfile();
  const router = useRouter();

  const [isAddBorrowerOpen, setIsAddBorrowerOpen] = useState(false);
  const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);

  // --- DATA QUERIES ---

  // 1. Get loans for the current officer
  const loansQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'loans'), where('loanOfficerId', '==', user.uid));
  }, [firestore, user]);
  const { data: loans, isLoading: loansLoading } = useCollection<Loan>(loansQuery);

  // 2. Get borrowers associated with those loans.
  // This query now correctly depends on `loans` being fetched first.
  const borrowersQuery = useMemoFirebase(() => {
    if (!firestore || loansLoading) return null; // Wait for loans to be loaded
    
    const borrowerIds = loans ? [...new Set(loans.map(l => l.borrowerId))] : [];
    if (borrowerIds.length === 0) {
      // If there are no borrowers, return a query that will result in an empty set.
      return query(collection(firestore, 'borrowers'), where(documentId(), '==', 'no-borrowers-found'));
    }
    
    // Firestore 'in' queries are limited to 30 items. We slice to prevent an error.
    return query(collection(firestore, 'borrowers'), where(documentId(), 'in', borrowerIds.slice(0, 30)));
  }, [firestore, loans, loansLoading]);
  const { data: borrowers, isLoading: borrowersLoading } = useCollection<Borrower>(borrowersQuery);

  // 3. Get all loan products (for dialogs)
  const allLoanProductsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'loanProducts') : null, [firestore]);
  const { data: allLoanProducts, isLoading: allLoanProductsLoading } = useCollection<LoanProduct>(allLoanProductsQuery);

  // 4. Get repayments collected by the current officer
  const repaymentsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'repayments'), where('collectedById', '==', user.uid));
  }, [firestore, user]);
  const { data: repayments, isLoading: repaymentsLoading } = useCollection<Repayment>(repaymentsQuery);

  // Overall loading state
  const isLoading = isProfileLoading || loansLoading || borrowersLoading || allLoanProductsLoading || repaymentsLoading;
  
  // --- DATA PROCESSING ---
  const portfolioStats = useMemo(() => {
    if (!loans || !borrowers) return { activeLoans: 0, portfolioValue: 0, avgLoanSize: 0, borrowerCount: 0 };
    
    const activeLoans = loans.filter(l => l.status === 'Active');
    const portfolioValue = activeLoans.reduce((sum, loan) => sum + loan.principal, 0);
    const avgLoanSize = activeLoans.length > 0 ? portfolioValue / activeLoans.length : 0;
    
    return {
      activeLoans: activeLoans.length,
      portfolioValue,
      avgLoanSize,
      borrowerCount: borrowers.length,
    }
  }, [loans, borrowers]);

  const topProducts = useMemo(() => {
    if (!loans || !allLoanProducts) return [];
    const productCount = loans.reduce((acc, loan) => {
        acc[loan.loanProductId] = (acc[loan.loanProductId] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const productsMap = new Map(allLoanProducts.map(p => [p.id, p.name]));
    
    return Object.entries(productCount)
        .map(([id, count]) => ({ name: productsMap.get(id) || 'Unknown Product', count }))
        .sort((a,b) => b.count - a.count)
        .slice(0, 3);
  }, [loans, allLoanProducts]);


  return (
    <>
      <PageHeader
        title="Loan Officer Dashboard"
        description="Your personal dashboard for managing loans and borrowers."
      >
        <div className='flex gap-2'>
            <Button onClick={() => setIsAddBorrowerOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Create Borrower
            </Button>
            <Button onClick={() => setIsAddLoanOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Loan
            </Button>
             <Button variant="outline" onClick={() => router.push('/repayments')}>
                <HandCoins className="mr-2 h-4 w-4" />
                Record Repayment
            </Button>
        </div>
      </PageHeader>
      
      <div className="p-4 md:p-6 grid gap-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="My Portfolio Value" value={formatCurrency(portfolioStats.portfolioValue, 'KES')} icon={Landmark} featured isLoading={isLoading} />
            <StatCard title="My Active Loans" value={portfolioStats.activeLoans} icon={AlertTriangle} isLoading={isLoading} />
            <StatCard title="My Borrowers" value={portfolioStats.borrowerCount} icon={Users} isLoading={isLoading} />
            <StatCard title="Avg. Loan Size" value={formatCurrency(portfolioStats.avgLoanSize, 'KES')} icon={Scale} isLoading={isLoading} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <PerformanceTracker loans={loans} borrowers={borrowers} isLoading={isLoading} />
            <Card>
                <CardHeader>
                    <CardTitle>Action Center</CardTitle>
                    <CardDescription>A prioritized list of borrowers who require your attention.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center text-center h-full min-h-[150px]">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Info className="h-8 w-8" />
                        <p className="text-sm max-w-xs">
                            The Action Center is disabled because it requires a database index. Please ask your administrator to create the required index in Firestore.
                        </p>
                    </div>
                </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
              <LoanPipeline loans={loans} isLoading={isLoading} />
              <RecentActivity loans={loans} borrowers={borrowers} repayments={repayments} isLoading={isLoading || repaymentsLoading} />
          </div>
        </div>
      </div>
      
      <AddBorrowerDialog open={isAddBorrowerOpen} onOpenChange={setIsAddBorrowerOpen} />
      <AddLoanDialog 
        open={isAddLoanOpen} 
        onOpenChange={setIsAddLoanOpen}
        borrowers={borrowers || []}
        loanProducts={allLoanProducts || []}
        isLoading={isLoading}
       />
    </>
  );
}
