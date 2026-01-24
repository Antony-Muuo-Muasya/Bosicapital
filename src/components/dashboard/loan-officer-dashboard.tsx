'use client';
import { PageHeader } from '@/components/page-header';
import { useCollection, useFirestore, useMemoFirebase, useUserProfile } from '@/firebase';
import { collection, query, where, documentId } from 'firebase/firestore';
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
import { subMonths, format } from 'date-fns';
import { DualTrendChart } from './loan-officer/DualTrendChart';
import { PortfolioMixChart } from './loan-officer/PortfolioMixChart';
import { LifetimeStats } from './loan-officer/LifetimeStats';
import { CollectionEfficiencyGauge } from './loan-officer/CollectionEfficiencyGauge';
import { TopBorrowers } from './loan-officer/TopBorrowers';


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
  const borrowersQuery = useMemoFirebase(() => {
    if (!firestore || loansLoading) return null; 
    const borrowerIds = loans ? [...new Set(loans.map(l => l.borrowerId))] : [];
    if (borrowerIds.length === 0) {
      return query(collection(firestore, 'borrowers'), where(documentId(), '==', 'no-borrowers-found'));
    }
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
  
  // --- DATA PROCESSING FOR DASHBOARD ---
  const dashboardData = useMemo(() => {
    if (isLoading || !loans || !borrowers || !repayments || !allLoanProducts) return null;
    
    // Top-level stats
    const activeLoans = loans.filter(l => l.status === 'Active');
    const portfolioValue = activeLoans.reduce((sum, loan) => sum + loan.principal, 0);
    const avgLoanSize = activeLoans.length > 0 ? portfolioValue / activeLoans.length : 0;
    
    // For Dual Trend Chart
    const today = new Date();
    const last6Months = Array.from({ length: 6 }, (_, i) => subMonths(today, i)).reverse();
    const monthLabels = last6Months.map(d => format(d, 'MMM yy'));
    
    const disbursalByMonth = loans.filter(l => l.status === 'Active').reduce((acc, loan) => {
        const month = format(new Date(loan.issueDate), 'MMM yy');
        acc[month] = (acc[month] || 0) + loan.principal;
        return acc;
    }, {} as Record<string, number>);

    const collectionsByMonth = repayments.reduce((acc, repayment) => {
        const month = format(new Date(repayment.paymentDate), 'MMM yy');
        acc[month] = (acc[month] || 0) + repayment.amount;
        return acc;
    }, {} as Record<string, number>);

    const dualTrendData = monthLabels.map(month => ({
        name: month,
        disbursed: disbursalByMonth[month] || 0,
        collected: collectionsByMonth[month] || 0,
    }));

    // For Portfolio Mix Chart
    const productsMap = new Map(allLoanProducts.map(p => [p.id, p.name]));
    const loanCountsByProduct = activeLoans.reduce((acc, loan) => {
        const productName = productsMap.get(loan.loanProductId) || 'Unknown Product';
        acc[productName] = (acc[productName] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const portfolioMixData = Object.entries(loanCountsByProduct).map(([name, value]) => ({ name, value }));

    // For Lifetime Stats & Collection Gauge
    const totalPrincipalDisbursed = loans.reduce((sum, l) => sum + l.principal, 0);
    const totalRepaymentsCollected = repayments.reduce((sum, r) => sum + r.amount, 0);
    const collectionEfficiency = totalPrincipalDisbursed > 0 ? (totalRepaymentsCollected / totalPrincipalDisbursed) * 100 : 0;

    // For Top Borrowers
    const borrowersMap = new Map(borrowers.map(b => [b.id, { name: b.fullName, avatar: b.photoUrl }]));
    const principalByBorrower = loans.reduce((acc, loan) => {
        acc[loan.borrowerId] = (acc[loan.borrowerId] || 0) + loan.principal;
        return acc;
    }, {} as Record<string, number>);

    const topBorrowersData = Object.entries(principalByBorrower)
        .map(([id, amount]) => ({
            id,
            name: borrowersMap.get(id)?.name || 'Unknown Borrower',
            avatar: borrowersMap.get(id)?.avatar || `https://picsum.photos/seed/${id}/100`,
            amount,
        }))
        .sort((a,b) => b.amount - a.amount)
        .slice(0, 5);
        
    return {
        statCards: {
            activeLoans: activeLoans.length,
            portfolioValue,
            avgLoanSize,
            borrowerCount: borrowers.length,
        },
        dualTrendData,
        portfolioMixData,
        lifetimeStats: {
            totalLoans: loans.length,
            totalPrincipalDisbursed,
            totalRepaymentsCollected,
        },
        collectionEfficiency,
        topBorrowersData
    }
  }, [loans, borrowers, repayments, allLoanProducts, isLoading]);


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
            <StatCard title="My Portfolio Value" value={formatCurrency(dashboardData?.statCards.portfolioValue || 0, 'KES')} icon={Landmark} featured isLoading={isLoading} />
            <StatCard title="My Active Loans" value={dashboardData?.statCards.activeLoans || 0} icon={AlertTriangle} isLoading={isLoading} />
            <StatCard title="My Borrowers" value={dashboardData?.statCards.borrowerCount || 0} icon={Users} isLoading={isLoading} />
            <StatCard title="Avg. Loan Size" value={formatCurrency(dashboardData?.statCards.avgLoanSize || 0, 'KES')} icon={Scale} isLoading={isLoading} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className='lg:col-span-2 space-y-6'>
                <DualTrendChart data={dashboardData?.dualTrendData} isLoading={isLoading} />
                <LoanPipeline loans={loans} isLoading={isLoading} />
            </div>
            <div className='lg:col-span-1 space-y-6'>
                <PerformanceTracker loans={loans} borrowers={borrowers} isLoading={isLoading} />
                <PortfolioMixChart data={dashboardData?.portfolioMixData} isLoading={isLoading} />
                <CollectionEfficiencyGauge value={dashboardData?.collectionEfficiency || 0} isLoading={isLoading} />
                <LifetimeStats 
                    totalLoans={dashboardData?.lifetimeStats.totalLoans || 0}
                    totalPrincipal={dashboardData?.lifetimeStats.totalPrincipalDisbursed || 0}
                    totalCollected={dashboardData?.lifetimeStats.totalRepaymentsCollected || 0}
                    isLoading={isLoading}
                />
                <TopBorrowers data={dashboardData?.topBorrowersData} isLoading={isLoading} />
                <RecentActivity loans={loans} borrowers={borrowers} repayments={repayments} isLoading={isLoading} />
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
