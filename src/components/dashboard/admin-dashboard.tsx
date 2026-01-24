'use client';
import { PageHeader } from '@/components/page-header';
import { Button } from '../ui/button';
import { PlusCircle, UserPlus, Building } from 'lucide-react';
import { useState, useMemo } from 'react';
import { AddLoanProductDialog } from '../settings/add-loan-product-dialog';
import { useRouter } from 'next/navigation';
import { useCollection, useFirestore, useMemoFirebase, useUserProfile } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Loan, Borrower, LoanProduct, User, Branch, RegistrationPayment, Role } from '@/lib/types';
import { OverviewCards } from './overview-cards';
import { PortfolioStatusChart } from './admin/portfolio-status-chart';
import { DisbursalTrendChart } from './admin/disbursal-trend-chart';
import { BranchPerformance } from './admin/branch-performance';
import { RecentActivity } from './admin/recent-activity';
import { TopProducts } from './admin/top-products';
import { UserRolesChart } from './admin/user-roles-chart';


export function AdminDashboard() {
  const router = useRouter();
  const firestore = useFirestore();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const organizationId = userProfile?.organizationId;
  
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);

  // Data queries
  const loansQuery = useMemoFirebase(() => {
    if (!firestore || !organizationId) return null;
    // Removed orderBy to prevent query from requiring a composite index
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


  const { data: loans, isLoading: loansLoading } = useCollection<Loan>(loansQuery);
  const { data: borrowers, isLoading: borrowersLoading } = useCollection<Borrower>(borrowersQuery);
  const { data: loanProducts, isLoading: productsLoading } = useCollection<LoanProduct>(productsQuery);
  const { data: users, isLoading: usersLoading } = useCollection<User>(usersQuery);
  const { data: branches, isLoading: branchesLoading } = useCollection<Branch>(branchesQuery);
  const { data: regPayments, isLoading: regPaymentsLoading } = useCollection<RegistrationPayment>(regPaymentsQuery);
  const { data: roles, isLoading: rolesLoading } = useCollection<Role>(rolesQuery);


  const isLoading = isProfileLoading || loansLoading || borrowersLoading || productsLoading || usersLoading || branchesLoading || regPaymentsLoading || rolesLoading;

  const dashboardData = useMemo(() => {
    if (isLoading || !loans) return null;

    const loanStatusCounts = loans.reduce((acc, loan) => {
        acc[loan.status] = (acc[loan.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const portfolioStatusData = Object.entries(loanStatusCounts).map(([name, value]) => ({ name, value, fill: `var(--chart-${Object.keys(loanStatusCounts).indexOf(name) + 1})` }));
    
    // Get last 6 months for trend
    const last6Months: string[] = [];
    const today = new Date();
    for(let i=5; i>=0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        last6Months.push(d.toLocaleString('default', { month: 'short', year: '2-digit' }));
    }
    
    const disbursalData = loans.filter(l => l.status === 'Active').reduce((acc, loan) => {
        const month = new Date(loan.issueDate).toLocaleString('default', { month: 'short', year: '2-digit' });
        acc[month] = (acc[month] || 0) + loan.principal;
        return acc;
    }, {} as Record<string, number>);
    
    const disbursalTrendData = last6Months.map(month => ({
        name: month,
        total: disbursalData[month] || 0
    }));
    
    return { portfolioStatusData, disbursalTrendData };

  }, [loans, isLoading]);
  
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
            installments={null} // Not fetching installments for performance
            borrowers={borrowers}
            regPayments={regPayments}
            isLoading={isLoading}
        />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
            <PortfolioStatusChart data={dashboardData?.portfolioStatusData} isLoading={isLoading} />
            <DisbursalTrendChart data={dashboardData?.disbursalTrendData} isLoading={isLoading} />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <RecentActivity loans={loans} borrowers={borrowers} isLoading={isLoading} />
            <BranchPerformance loans={loans} branches={branches} isLoading={isLoading} />
            <div className="space-y-6">
                <TopProducts loans={loans} loanProducts={loanProducts} isLoading={isLoading} />
                <UserRolesChart users={users} roles={roles} isLoading={isLoading} />
            </div>
        </div>
      </div>
      <AddLoanProductDialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen} />
    </>
  );
}
