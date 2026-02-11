
'use client';
import { PageHeader } from '@/components/page-header';
import { Button } from '../ui/button';
import { PlusCircle, UserPlus, Building } from 'lucide-react';
import { useState, useMemo } from 'react';
import { AddLoanProductDialog } from '../settings/add-loan-product-dialog';
import { useRouter } from 'next/navigation';
import { useCollection, useFirestore, useMemoFirebase, useUserProfile } from '@/firebase';
import { collection, query, where, collectionGroup } from 'firebase/firestore';
import type { Loan, Borrower, LoanProduct, User, Branch, RegistrationPayment, Role, Installment } from '@/lib/types';
import { OverviewCards } from './overview-cards';
import { PortfolioStatusChart } from './admin/portfolio-status-chart';
import { DisbursalTrendChart } from './admin/disbursal-trend-chart';
import { BranchPerformance } from './admin/branch-performance';
import { RecentActivity } from './admin/recent-activity';
import { TopProducts } from './admin/top-products';
import { UserRolesChart } from './admin/user-roles-chart';
import { CustomerGrowthChart } from './admin/customer-growth-chart';
import { CategoryDistributionChart } from './admin/category-distribution-chart';
import { LoanOfficerLeaderboard, type LeaderboardEntry } from './admin/loan-officer-leaderboard';
import { subMonths, format } from 'date-fns';


export function AdminDashboard() {
  const router = useRouter();
  const firestore = useFirestore();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const organizationId = userProfile?.organizationId;
  
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);

  // Data queries
  const loansQuery = useMemoFirebase(() => {
    if (!firestore || !organizationId) return null;
    return query(collection(firestore, 'loans'), where('organizationId', '==', organizationId));
  }, [firestore, organizationId]);

  const borrowersQuery = useMemoFirebase(() => {
    if (!firestore || !organizationId) return null;
    return query(collection(firestore, 'borrowers'), where('organizationId', '==', organizationId));
  }, [firestore, organizationId]);

  const productsQuery = useMemoFirebase(() => {
    if (!firestore || !organizationId) return null;
    return query(collection(firestore, 'loanProducts'), where('organizationId', '==', organizationId));
  }, [firestore, organizationId]);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !organizationId) return null;
    return query(collection(firestore, 'users'), where('organizationId', '==', organizationId));
  }, [firestore, organizationId]);

  const branchesQuery = useMemoFirebase(() => {
    if (!firestore || !organizationId) return null;
    return query(collection(firestore, 'branches'), where('organizationId', '==', organizationId));
  }, [firestore, organizationId]);

  const regPaymentsQuery = useMemoFirebase(() => {
    if (!firestore || !organizationId) return null;
    return query(collection(firestore, 'registrationPayments'), where('organizationId', '==', organizationId));
  }, [firestore, organizationId]);

  const rolesQuery = useMemoFirebase(() => {
    if (!firestore || !organizationId) return null;
    return query(collection(firestore, 'roles'), where('organizationId', '==', organizationId));
  }, [firestore, organizationId]);

  const installmentsQuery = useMemoFirebase(() => {
    if (!firestore || !organizationId) return null;
    return query(collectionGroup(firestore, 'installments'), where('organizationId', '==', organizationId));
  }, [firestore, organizationId]);


  const { data: loans, isLoading: loansLoading } = useCollection<Loan>(loansQuery);
  const { data: borrowers, isLoading: borrowersLoading } = useCollection<Borrower>(borrowersQuery);
  const { data: loanProducts, isLoading: productsLoading } = useCollection<LoanProduct>(productsQuery);
  const { data: users, isLoading: usersLoading } = useCollection<User>(usersQuery);
  const { data: branches, isLoading: branchesLoading } = useCollection<Branch>(branchesQuery);
  const { data: regPayments, isLoading: regPaymentsLoading } = useCollection<RegistrationPayment>(regPaymentsQuery);
  const { data: roles, isLoading: rolesLoading } = useCollection<Role>(rolesQuery);
  const { data: installments, isLoading: installmentsLoading } = useCollection<Installment>(installmentsQuery);

  const isLoading = isProfileLoading || loansLoading || borrowersLoading || productsLoading || usersLoading || branchesLoading || regPaymentsLoading || rolesLoading || installmentsLoading;

  const dashboardData = useMemo(() => {
    if (isLoading || !loans || !borrowers || !loanProducts || !users) return null;

    const CHART_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

    // Portfolio Status
    const loanStatusCounts = loans.reduce((acc, loan) => {
        acc[loan.status] = (acc[loan.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const portfolioStatusData = Object.entries(loanStatusCounts).map(([name, value], index) => ({ name, value, fill: CHART_COLORS[index % CHART_COLORS.length] }));
    
    // Disbursal & Customer Growth Trends (last 6 months)
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


    // Category Distribution
    const productsMap = new Map(loanProducts.map(p => [p.id, p.category]));
    const categoryCounts = loans.reduce((acc, loan) => {
        const category = productsMap.get(loan.loanProductId) || 'Uncategorized';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const categoryDistributionData = Object.entries(categoryCounts).map(([name, value], index) => ({ name, value, fill: CHART_COLORS[index % CHART_COLORS.length] }));

    // Loan Officer Leaderboard
    const officerStats = loans.reduce((acc, loan) => {
        const officerId = loan.loanOfficerId;
        if (!acc[officerId]) acc[officerId] = { loanCount: 0, totalPrincipal: 0 };
        acc[officerId].loanCount++;
        acc[officerId].totalPrincipal += loan.principal;
        return acc;
    }, {} as Record<string, { loanCount: number, totalPrincipal: number }>);
    
    const usersMap = new Map(users.map(u => [u.id, u]));
    const leaderboardData: LeaderboardEntry[] = Object.entries(officerStats)
        .map(([officerId, stats]) => ({
            officerId,
            officerName: usersMap.get(officerId)?.fullName || 'Unknown Officer',
            officerAvatar: usersMap.get(officerId)?.avatarUrl,
            ...stats
        }))
        .sort((a,b) => b.totalPrincipal - a.totalPrincipal)
        .slice(0, 5);
    
    return { portfolioStatusData, disbursalTrendData, customerGrowthData, categoryDistributionData, leaderboardData };

  }, [loans, borrowers, loanProducts, users, isLoading]);
  
  return (
    <>
      <PageHeader
        title="Admin Dashboard"
        description="Organization-wide overview of all lending activities."
      >
        <div className='flex items-center gap-2'>
            <Button variant="outline" onClick={() => router.push('/users')}>
                <UserPlus className="mr-2 h-4 w-4" />
                Manage Staff
            </Button>
            <Button variant="outline" onClick={() => router.push('/branches')}>
                <Building className="mr-2 h-4 w-4" />
                Manage Branches
            </Button>
            <Button onClick={() => setIsAddProductOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Product
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <RecentActivity loans={loans} borrowers={borrowers} isLoading={isLoading} />
            <BranchPerformance loans={loans} branches={branches} isLoading={isLoading} />
            <LoanOfficerLeaderboard leaderboardData={dashboardData?.leaderboardData} isLoading={isLoading} />
        </div>
         <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <TopProducts loans={loans} loanProducts={loanProducts} isLoading={isLoading} />
         </div>
         <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
            <div className="lg:col-span-2">
                <DisbursalTrendChart data={dashboardData?.disbursalTrendData} isLoading={isLoading} />
            </div>
            <CustomerGrowthChart data={dashboardData?.customerGrowthData} isLoading={isLoading} />
        </div>
         <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
           <PortfolioStatusChart data={dashboardData?.portfolioStatusData} isLoading={isLoading} />
           <UserRolesChart users={users} roles={roles} isLoading={isLoading} />
           <CategoryDistributionChart data={dashboardData?.categoryDistributionData} isLoading={isLoading} />
         </div>
      </div>
      <AddLoanProductDialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen} />
    </>
  );
}
