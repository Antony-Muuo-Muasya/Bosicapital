'use client';
import { PageHeader } from '@/components/page-header';
import { OverviewCards } from '@/components/dashboard/overview-cards';
import { useCollection, useFirestore, useMemoFirebase, useUserProfile } from '@/firebase';
import { collection, query, where, collectionGroup } from 'firebase/firestore';
import type { Loan, Borrower, Installment, RegistrationPayment, User, LoanProduct } from '@/lib/types';
import { useMemo, useState } from 'react';
import { DisbursalTrendChart } from '../admin/disbursal-trend-chart';
import { CustomerGrowthChart } from '../admin/customer-growth-chart';
import { LoanOfficerLeaderboard, type LeaderboardEntry } from '../admin/loan-officer-leaderboard';
import { TopProducts } from '../admin/top-products';
import { subMonths, format, isToday, isThisMonth } from 'date-fns';
import { Button } from '../ui/button';
import { PlusCircle, UserPlus, HandCoins } from 'lucide-react';
import { AddBorrowerDialog } from '../borrowers/add-borrower-dialog';
import { AddLoanDialog } from '../loans/add-loan-dialog';
import { useRouter } from 'next/navigation';
import { CollectionOverview } from './manager/collection-overview';
import { CreateIndexCard } from './manager/CreateIndexCard';

export function ManagerDashboard() {
  const router = useRouter();
  const firestore = useFirestore();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const organizationId = userProfile?.organizationId;
  const branchIds = userProfile?.branchIds || [];

  const [isAddBorrowerOpen, setIsAddBorrowerOpen] = useState(false);
  const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);

  // --- Data Queries (scoped to manager's branches) ---
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
    // Registration payments may not have branchIds, so query by org and filter later
    return query(collection(firestore, 'registrationPayments'), where('organizationId', '==', organizationId));
  }, [firestore, organizationId]);

  const productsQuery = useMemoFirebase(() => {
    if (!firestore || !organizationId) return null;
    return query(collection(firestore, 'loanProducts'), where('organizationId', '==', organizationId));
  }, [firestore, organizationId]);

  // Query users to find loan officers in manager's branches.
  const usersQuery = useMemoFirebase(() => {
    if (!firestore || branchIds.length === 0) return null;
    return query(collection(firestore, 'users'), where('branchIds', 'array-contains-any', branchIds));
  }, [firestore, branchIds]);
  
  const installmentsQuery = useMemoFirebase(() => {
    if (!firestore || branchIds.length === 0) return null;
    // This uses a collection group query and requires a composite index.
    return query(
      collectionGroup(firestore, 'installments'), 
      where('branchId', 'in', branchIds)
    );
  }, [firestore, branchIds]);

  // --- Data Fetching ---
  const { data: loans, isLoading: loansLoading } = useCollection<Loan>(loansQuery);
  const { data: borrowers, isLoading: borrowersLoading } = useCollection<Borrower>(borrowersQuery);
  const { data: regPayments, isLoading: regPaymentsLoading } = useCollection<RegistrationPayment>(regPaymentsQuery);
  const { data: loanProducts, isLoading: productsLoading } = useCollection<LoanProduct>(productsQuery);
  const { data: users, isLoading: usersLoading } = useCollection<User>(usersQuery);
  const { data: installments, isLoading: installmentsLoading, error: installmentsError } = useCollection<Installment>(installmentsQuery);


  const isLoading = isProfileLoading || loansLoading || borrowersLoading || regPaymentsLoading || productsLoading || usersLoading;

  const collectionRates = useMemo(() => {
    if (installmentsError || !installments) return { todaysCollectionRate: 0, monthlyCollectionRate: 0 };
    
    // Today's collections
    const dueToday = installments.filter(i => isToday(new Date(i.dueDate)));
    const expectedToday = dueToday.reduce((sum, i) => sum + i.expectedAmount, 0);
    const paidToday = dueToday.reduce((sum, i) => sum + i.paidAmount, 0);
    const todaysCollectionRate = expectedToday > 0 ? (paidToday / expectedToday) * 100 : 0;
    
    // Monthly collections
    const dueThisMonth = installments.filter(i => isThisMonth(new Date(i.dueDate)));
    const expectedThisMonth = dueThisMonth.reduce((sum, i) => sum + i.expectedAmount, 0);
    const paidThisMonth = dueThisMonth.reduce((sum, i) => sum + i.paidAmount, 0);
    const monthlyCollectionRate = expectedThisMonth > 0 ? (paidThisMonth / expectedThisMonth) * 100 : 0;
    
    return { todaysCollectionRate, monthlyCollectionRate };
  }, [installments, installmentsError]);
  
  const dashboardData = useMemo(() => {
    if (!loans || !borrowers || !loanProducts || !users) return null;
    
    const today = new Date();
    const last6Months = Array.from({ length: 6 }, (_, i) => subMonths(today, i)).reverse();
    const monthLabels = last6Months.map(d => format(d, 'MMM yy'));
    
    const disbursalData = loans.filter(l => l.status === 'Active').reduce((acc, loan) => {
        const month = format(new Date(loan.issueDate), 'MMM yy');
        acc[month] = (acc[month] || 0) + loan.principal;
        return acc;
    }, {} as Record<string, number>);
    const disbursalTrendData = monthLabels.map(month => ({ name: month, total: disbursalData[month] || 0 }));

    const customerGrowth = borrowers.filter(b => b.registrationFeePaidAt).reduce((acc, borrower) => {
        const month = format(new Date(borrower.registrationFeePaidAt!), 'MMM yy');
        acc[month] = (acc[month] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const customerGrowthData = monthLabels.map(month => ({ name: month, total: customerGrowth[month] || 0 }));

    const loanOfficers = users.filter(u => u.roleId === 'loan_officer');
    const officerStats = loans.reduce((acc, loan) => {
        const officerId = loan.loanOfficerId;
        if (!acc[officerId]) acc[officerId] = { loanCount: 0, totalPrincipal: 0 };
        acc[officerId].loanCount++;
        acc[officerId].totalPrincipal += loan.principal;
        return acc;
    }, {} as Record<string, { loanCount: number, totalPrincipal: number }>);
    
    const usersMap = new Map(users.map(u => [u.id, u]));
    const leaderboardData: LeaderboardEntry[] = loanOfficers
        .map(officer => ({
            officerId: officer.id,
            officerName: officer.fullName,
            officerAvatar: officer.avatarUrl,
            loanCount: officerStats[officer.id]?.loanCount || 0,
            totalPrincipal: officerStats[officer.id]?.totalPrincipal || 0,
        }))
        .sort((a,b) => b.totalPrincipal - a.totalPrincipal)
        .slice(0, 5);
        
    const productCounts = loans.reduce((acc, loan) => {
        acc[loan.loanProductId] = (acc[loan.loanProductId] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const productsNameMap = new Map(loanProducts.map(p => [p.id, p.name]));
    const topProducts = Object.entries(productCounts)
        .map(([id, count]) => ({
            name: productsNameMap.get(id) || 'Unknown Product',
            count
        }))
        .sort((a,b) => b.count - a.count)
        .slice(0, 5);

    return { disbursalTrendData, customerGrowthData, leaderboardData, topProducts };

  }, [loans, borrowers, loanProducts, users]);

  const managerRegPayments = useMemo(() => {
    if (!regPayments || !borrowers) return [];
    const branchBorrowerIds = new Set(borrowers.map(b => b.id));
    return regPayments.filter(p => branchBorrowerIds.has(p.borrowerId));
  }, [regPayments, borrowers]);

  const overallLoading = isLoading || (installmentsLoading && !installmentsError);

  return (
    <>
      <PageHeader
        title="Manager Dashboard"
        description="A comprehensive overview of your assigned branches."
      >
        <div className='flex items-center gap-2'>
            <Button onClick={() => setIsAddBorrowerOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Borrower
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
        <OverviewCards
          loans={loans}
          installments={installments}
          borrowers={borrowers}
          regPayments={managerRegPayments}
          isLoading={overallLoading}
        />
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
             <div className="lg:col-span-2">
                <DisbursalTrendChart data={dashboardData?.disbursalTrendData} isLoading={isLoading} />
            </div>
            {installmentsError ? (
              <CreateIndexCard />
            ) : (
              <CollectionOverview
                  todaysCollectionRate={collectionRates.todaysCollectionRate}
                  monthlyCollectionRate={collectionRates.monthlyCollectionRate}
                  isLoading={overallLoading}
              />
            )}
        </div>
         <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
            <LoanOfficerLeaderboard leaderboardData={dashboardData?.leaderboardData} isLoading={isLoading} />
            <div className="lg:col-span-2">
                 <CustomerGrowthChart data={dashboardData?.customerGrowthData} isLoading={isLoading} />
            </div>
        </div>
         <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <TopProducts loans={loans} loanProducts={loanProducts} isLoading={isLoading} />
         </div>
      </div>

       <AddBorrowerDialog open={isAddBorrowerOpen} onOpenChange={setIsAddBorrowerOpen} />
      <AddLoanDialog 
        open={isAddLoanOpen} 
        onOpenChange={setIsAddLoanOpen}
        borrowers={borrowers || []}
        loanProducts={loanProducts || []}
        isLoading={isLoading}
       />
    </>
  );
}
