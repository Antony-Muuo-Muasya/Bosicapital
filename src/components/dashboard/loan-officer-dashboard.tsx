'use client';
import { PageHeader } from '@/components/page-header';
import { useUserProfile } from '@/providers/user-profile';
import { getLoanOfficerDashboardStats } from '@/actions/dashboard';
import { getLoanProducts } from '@/actions/loan-products';
import { getBorrowers } from '@/actions/borrowers';
import type { Loan, Borrower, LoanProduct, Repayment, Installment } from '@/lib/types';
import { useEffect, useState, useCallback } from 'react';
import { Button } from '../ui/button';
import { HandCoins, PlusCircle, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { AddBorrowerDialog } from '../borrowers/add-borrower-dialog';
import { AddLoanDialog } from '../loans/add-loan-dialog';
import { StatCard } from './loan-officer/StatCard';
import { Landmark, Users, Scale, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { startOfToday, subMonths, format } from 'date-fns';
import { DualTrendChart } from './loan-officer/DualTrendChart';
import { LoanPipeline } from './loan-officer/LoanPipeline';
import { RecentActivity } from './loan-officer/RecentActivity';
import { TopBorrowers } from './loan-officer/TopBorrowers';
import { PerformanceTracker } from './loan-officer/PerformanceTracker';
import { LifetimeStats } from './loan-officer/LifetimeStats';
import { CollectionEfficiencyGauge } from './loan-officer/CollectionEfficiencyGauge';



export function LoanOfficerDashboard() {

  const { user, userProfile, isLoading: isProfileLoading } = useUserProfile();
  const organizationId = userProfile?.organizationId;
  const router = useRouter();

  const [isAddBorrowerOpen, setIsAddBorrowerOpen] = useState(false);
  const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [loans, setLoans] = useState<Loan[] | null>(null);
  const [borrowersInBranch, setBorrowersInBranch] = useState<Borrower[] | null>(null);
  const [allLoanProducts, setAllLoanProducts] = useState<LoanProduct[] | null>(null);
  const [repayments, setRepayments] = useState<Repayment[] | null>(null);
  const [installments, setInstallments] = useState<Installment[] | null>(null);
  const [targets, setTargets] = useState<any[] | null>(null);

  const fetchDashboardStats = useCallback(async () => {
      if (!userProfile || !user || !organizationId) return;
      setIsLoading(true);
      try {
          const res = await getLoanOfficerDashboardStats(organizationId, user.id);
          if (res.success && res.data) {
              setLoans(res.data.loans as any);
              setRepayments(res.data.repayments as any);
              setInstallments(res.data.installments as any);
              setTargets(res.data.targets as any);
          }
          
          // Need loan products and borrowers in branch for the "Add" dialogs
          const productsRes = await getLoanProducts(organizationId);
          if (productsRes.success && productsRes.products) {
              setAllLoanProducts(productsRes.products as any);
          }
          
          const borrowersRes = await getBorrowers(organizationId);
          if (borrowersRes.success && borrowersRes.borrowers) {
              setBorrowersInBranch(borrowersRes.borrowers as any);
          }

      } catch (e) {
          console.error(e);
      } finally {
          setIsLoading(false);
      }
  }, [userProfile, user, organizationId]);

  useEffect(() => {
     if (!isProfileLoading && userProfile) {
         fetchDashboardStats();
     }
  }, [isProfileLoading, userProfile, fetchDashboardStats]);

  const myBorrowerIds = useMemo(() => {
      if (!loans) return [];
      return [...new Set(loans.map(l => l.borrowerId))];
  }, [loans]);

  const myBorrowers = useMemo(() => {
      if (borrowersInBranch) {
          const idSet = new Set(myBorrowerIds);
          return borrowersInBranch.filter(b => idSet.has(b.id));
      }
      return [];
  }, [borrowersInBranch, myBorrowerIds]);

  const installmentsError = null; // Removed from hooks
  
  // --- DATA PROCESSING FOR DASHBOARD ---
  const dashboardStats = useMemo(() => {
    if (isLoading || !loans || !installments || !myBorrowers) return { portfolioValue: 0, activeLoansCount: 0, totalBorrowers: 0, overdueLoansCount: 0 };
    
    const activeLoans = loans.filter(l => l.status === 'Active');
    
    const portfolioValue = activeLoans.reduce((sum, loan) => {
        const loanInstallments = installments.filter(i => i.loanId === loan.id);
        const totalPaid = loanInstallments.reduce((acc, inst) => acc + inst.paidAmount, 0);
        const outstandingBalance = loan.totalPayable - totalPaid;
        return sum + (outstandingBalance > 0 ? outstandingBalance : 0);
    }, 0);

    const today = startOfToday();
    const overdueInstallments = installments.filter(i => {
        if (i.status === 'Paid') return false;
        const [year, month, day] = i.dueDate.split('-').map(Number);
        const dueDate = new Date(year, month - 1, day);
        return dueDate < today;
    });
    const overdueLoansCount = new Set(overdueInstallments.map(i => i.loanId)).size;

    return {
        portfolioValue,
        activeLoansCount: activeLoans.length,
        totalBorrowers: myBorrowers.length,
        overdueLoansCount: overdueLoansCount,
    };
  }, [isLoading, loans, installments, myBorrowers]);
  
  const monthlyTrends = useMemo(() => {
    if (!loans || !repayments) return [];

    const last6Months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), i)).reverse();
    
    const trends = last6Months.map(monthDate => {
      const monthKey = format(monthDate, 'MMM yyyy');
      
      const disbursed = loans
        .filter(l => {
          if (l.status !== 'Active') return false;
          const [year, month, day] = l.issueDate.split('-').map(Number);
          const issueDate = new Date(year, month - 1, day);
          return format(issueDate, 'MMM yyyy') === monthKey;
        })
        .reduce((sum, l) => sum + l.principal, 0);

      const collected = repayments
        .filter(r => format(new Date(r.paymentDate), 'MMM yyyy') === monthKey)
        .reduce((sum, r) => sum + r.amount, 0);

      return { name: format(monthDate, 'MMM'), disbursed, collected };
    });

    return trends;
  }, [loans, repayments]);
  
    const lifetimeStats = useMemo(() => {
        if (!loans || !repayments) return { totalLoans: 0, totalPrincipal: 0, totalCollected: 0 };
        return {
            totalLoans: loans.length,
            totalPrincipal: loans.reduce((sum, l) => sum + l.principal, 0),
            totalCollected: repayments.reduce((sum, r) => sum + r.amount, 0),
        }
    }, [loans, repayments]);

    const topBorrowers = useMemo(() => {
        if (!loans || !myBorrowers) return [];
        const borrowersMap = new Map(myBorrowers.map(b => [b.id, b]));
        const principalByBorrower = loans.reduce((acc, loan) => {
            acc[loan.borrowerId] = (acc[loan.borrowerId] || 0) + loan.principal;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(principalByBorrower)
            .map(([id, amount]) => ({
                id,
                name: borrowersMap.get(id)?.fullName || 'Unknown',
                avatar: borrowersMap.get(id)?.photoUrl || `https://picsum.photos/seed/${id}/400/400`,
                amount
            }))
            .sort((a,b) => b.amount - a.amount)
            .slice(0, 3);
            
    }, [loans, myBorrowers]);

    const collectionEfficiency = useMemo(() => {
        if (!lifetimeStats.totalPrincipal || lifetimeStats.totalPrincipal === 0) return 0;
        return (lifetimeStats.totalCollected / lifetimeStats.totalPrincipal) * 100;
    }, [lifetimeStats]);


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
            <StatCard title="My Portfolio Value" value={formatCurrency(dashboardStats.portfolioValue, 'KES')} icon={Landmark} featured isLoading={isLoading} />
            <StatCard title="My Active Loans" value={dashboardStats.activeLoansCount} icon={Scale} isLoading={isLoading} />
            <StatCard title="My Borrowers" value={dashboardStats.totalBorrowers} icon={Users} isLoading={isLoading} />
            <StatCard title="Overdue Loans" value={dashboardStats.overdueLoansCount} icon={AlertTriangle} isLoading={isLoading} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className='lg:col-span-2'>
              <DualTrendChart data={monthlyTrends} isLoading={isLoading} />
            </div>
            <div className='space-y-6'>
                <PerformanceTracker loans={loans} borrowers={myBorrowers} targets={targets} isLoading={isLoading} />
                <LoanPipeline loans={loans} borrowers={myBorrowers} isLoading={isLoading} />
            </div>
        </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className='lg:col-span-1 space-y-6'>
                <LifetimeStats {...lifetimeStats} isLoading={isLoading} />
                <CollectionEfficiencyGauge value={collectionEfficiency} isLoading={isLoading} />
            </div>
             <div className='lg:col-span-1'>
                 <TopBorrowers data={topBorrowers} isLoading={isLoading} />
            </div>
             <div className='lg:col-span-1'>
                <RecentActivity loans={loans} borrowers={myBorrowers} repayments={repayments} isLoading={isLoading} />
            </div>
        </div>
      </div>
      
      <AddBorrowerDialog open={isAddBorrowerOpen} onOpenChange={setIsAddBorrowerOpen} />
      <AddLoanDialog 
        open={isAddLoanOpen} 
        onOpenChange={setIsAddLoanOpen}
        borrowers={borrowersInBranch || []}
        loanProducts={allLoanProducts || []}
        isLoading={isLoading}
       />
    </>
  );
}
