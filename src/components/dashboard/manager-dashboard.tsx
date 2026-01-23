'use client';
import { PageHeader } from '@/components/page-header';
import { useCollection, useFirestore, useMemoFirebase, useUserProfile } from '@/firebase';
import { collection, query, where, collectionGroup } from 'firebase/firestore';
import type { Loan, Borrower, Installment, Repayment, Branch } from '@/lib/types';
import { useMemo, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Users, UserCheck, UserX, TrendingUp, TrendingDown, Banknote, CalendarClock, AlertCircle, Scale } from 'lucide-react';
import { isSameDay, isThisMonth, parseISO } from 'date-fns';

// A reusable stat card component
const StatCard = ({ title, value, icon: Icon, description, isLoading }: { title: string, value: string | number, icon: React.ElementType, description?: string, isLoading: boolean }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            {isLoading ? (
                 <div className="h-7 w-24 animate-pulse rounded-md bg-muted mb-1" />
            ) : (
                <div className="text-2xl font-bold">{value}</div>
            )}
            {description && !isLoading && <p className="text-xs text-muted-foreground">{description}</p>}
        </CardContent>
    </Card>
);

const CollectionProgress = ({ title, value, isLoading }: { title: string, value: number, isLoading: boolean }) => (
    <div>
        <div className="mb-2 flex justify-between text-sm">
            <span className="text-muted-foreground">{title}</span>
            <span className="font-medium">{isLoading ? '...' : `${value.toFixed(2)}%`}</span>
        </div>
        {isLoading ? <div className="h-2 w-full animate-pulse rounded-full bg-muted" /> : <Progress value={value} className="h-2" />}
    </div>
);


export function ManagerDashboard() {
  const firestore = useFirestore();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const organizationId = userProfile?.organizationId;
  const branchIds = userProfile?.branchIds || [];

  const [selectedBranchId, setSelectedBranchId] = useState('all');

  // Data Fetching
  const branchesQuery = useMemoFirebase(() => {
    if (!firestore || branchIds.length === 0) return null;
    return query(collection(firestore, 'branches'), where('id', 'in', branchIds));
  }, [firestore, branchIds]);
  
  const loansQuery = useMemoFirebase(() => {
    if (!firestore || branchIds.length === 0) return null;
    return query(collection(firestore, 'loans'), where('branchId', 'in', branchIds));
  }, [firestore, branchIds]);

  const borrowersQuery = useMemoFirebase(() => {
    if (!firestore || branchIds.length === 0) return null;
    return query(collection(firestore, 'borrowers'), where('branchId', 'in', branchIds));
  }, [firestore, branchIds]);

  const installmentsQuery = useMemoFirebase(() => {
      if (!firestore || branchIds.length === 0) return null;
      return query(collectionGroup(firestore, 'installments'), where('branchId', 'in', branchIds));
  }, [firestore, branchIds]);
  
  const { data: allBranches, isLoading: branchesLoading } = useCollection<Branch>(branchesQuery);
  const { data: allLoans, isLoading: loansLoading } = useCollection<Loan>(loansQuery);
  const { data: allBorrowers, isLoading: borrowersLoading } = useCollection<Borrower>(borrowersQuery);
  const { data: allInstallments, isLoading: installmentsLoading } = useCollection<Installment>(installmentsQuery);

  const visibleLoanIds = useMemo(() => allLoans?.map(l => l.id) || [], [allLoans]);
  
  const repaymentsQuery = useMemoFirebase(() => {
    if (!firestore || visibleLoanIds.length === 0) return null;
    if (visibleLoanIds.length > 30) {
      console.warn("Repayment query only supports up to 30 loans for now.")
      return query(collection(firestore, 'repayments'), where('loanId', 'in', visibleLoanIds.slice(0,30)));
    }
    return query(collection(firestore, 'repayments'), where('loanId', 'in', visibleLoanIds));
  }, [firestore, visibleLoanIds]);

  const { data: allRepayments, isLoading: repaymentsLoading } = useCollection<Repayment>(repaymentsQuery);


  // Memoized Filters
  const { loans, borrowers, installments, repayments } = useMemo(() => {
    if (selectedBranchId === 'all') {
        return { loans: allLoans, borrowers: allBorrowers, installments: allInstallments, repayments: allRepayments };
    }
    return {
        loans: allLoans?.filter(l => l.branchId === selectedBranchId),
        borrowers: allBorrowers?.filter(b => b.branchId === selectedBranchId),
        installments: allInstallments?.filter(i => i.branchId === selectedBranchId),
        repayments: allRepayments, // Repayments are not filtered by branch directly
    };
  }, [selectedBranchId, allLoans, allBorrowers, allInstallments, allRepayments]);

  // Metric Calculations
  const metrics = useMemo(() => {
    if (!loans || !borrowers || !installments || !repayments) return null;

    const today = new Date();
    const activeLoans = loans.filter(l => l.status === 'Active');

    // --- High Level ---
    const grossLoanPortfolio = activeLoans.reduce((sum, loan) => sum + loan.principal, 0);

    const overdueInstallments = installments.filter(i => i.status === 'Overdue');
    const loansAtRiskIds = new Set(overdueInstallments.map(i => i.loanId));
    const portfolioAtRisk = activeLoans
        .filter(l => loansAtRiskIds.has(l.id))
        .reduce((sum, loan) => sum + loan.principal, 0);

    const performingLoanBalance = grossLoanPortfolio - portfolioAtRisk;

    // --- Customer Overview ---
    const totalCustomers = borrowers.length;
    const activeCustomers = new Set(activeLoans.map(l => l.borrowerId)).size;
    const inactiveCustomers = totalCustomers - activeCustomers;
    const recruitmentsThisMonth = borrowers.filter(b => b.registrationFeePaidAt && isThisMonth(parseISO(b.registrationFeePaidAt))).length;
    
    // --- Loans Overview ---
    const disbursedThisMonth = loans
        .filter(l => isThisMonth(parseISO(l.issueDate)))
        .reduce((sum, l) => sum + l.principal, 0);

    const installmentsDueToday = installments.filter(i => isSameDay(parseISO(i.dueDate), today) && i.status !== 'Paid');
    const loansDueTodayCount = installmentsDueToday.length;

    const totalLoanArrears = overdueInstallments.reduce((sum, i) => sum + (i.expectedAmount - i.paidAmount), 0);

    // --- Collections Overview ---
    const collectionsToday = repayments
        .filter(r => isSameDay(parseISO(r.paymentDate), today))
        .reduce((sum, r) => sum + r.amount, 0);

    const amountDueToday = installmentsDueToday.reduce((sum, i) => sum + (i.expectedAmount - i.paidAmount), 0);
    const todaysCollectionRate = amountDueToday > 0 ? (collectionsToday / amountDueToday) * 100 : 0;
    
    const collectionsThisMonth = repayments
        .filter(r => isThisMonth(parseISO(r.paymentDate)))
        .reduce((sum, r) => sum + r.amount, 0);
    
    const amountDueThisMonth = installments
        .filter(i => isThisMonth(parseISO(i.dueDate)))
        .reduce((sum, i) => sum + i.expectedAmount, 0);

    const monthlyCollectionRate = amountDueThisMonth > 0 ? (collectionsThisMonth / amountDueThisMonth) * 100 : 0;

    return {
        grossLoanPortfolio,
        performingLoanBalance,
        totalCustomers,
        activeCustomers,
        inactiveCustomers,
        recruitmentsThisMonth,
        disbursedThisMonth,
        loansDueTodayCount,
        totalLoanArrears,
        portfolioAtRisk,
        todaysCollectionRate,
        monthlyCollectionRate
    }

  }, [loans, borrowers, installments, repayments]);

  const isLoading = isProfileLoading || loansLoading || borrowersLoading || installmentsLoading || branchesLoading || repaymentsLoading;

  return (
    <>
      <PageHeader
        title="Manager Dashboard"
        description="Overview of lending activities in your branches."
      />
      <div className="p-4 md:p-6 grid gap-6">
        <div className="flex items-center gap-4">
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId} disabled={isLoading}>
                <SelectTrigger className="w-full md:w-[280px]">
                    <SelectValue placeholder="Select a branch" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All My Branches</SelectItem>
                    {allBranches?.map(branch => (
                        <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             <StatCard title="Outstanding Loan Balance" value={formatCurrency(metrics?.grossLoanPortfolio ?? 0)} icon={Scale} description="Gross Loan Portfolio" isLoading={isLoading} />
             <StatCard title="Performing Loan Balance" value={formatCurrency(metrics?.performingLoanBalance ?? 0)} icon={TrendingUp} description="Balance of loans not in arrears" isLoading={isLoading} />
             <StatCard title="Total Customers" value={metrics?.totalCustomers ?? 0} icon={Users} description="All borrowers in selected branch(es)" isLoading={isLoading} />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="lg:col-span-1">
                <CardHeader>
                    <CardTitle>Customer Overview</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="flex items-center">
                        <UserCheck className="h-5 w-5 mr-4 text-green-500" />
                        <span>Active Customers</span>
                        <span className="ml-auto font-semibold">{isLoading ? '...' : metrics?.activeCustomers}</span>
                    </div>
                    <div className="flex items-center">
                        <UserX className="h-5 w-5 mr-4 text-red-500" />
                        <span>Inactive Customers</span>
                        <span className="ml-auto font-semibold">{isLoading ? '...' : metrics?.inactiveCustomers}</span>
                    </div>
                    <div className="flex items-center">
                        <Users className="h-5 w-5 mr-4 text-blue-500" />
                        <span>Recruitments (This Month)</span>
                        <span className="ml-auto font-semibold">{isLoading ? '...' : metrics?.recruitmentsThisMonth}</span>
                    </div>
                </CardContent>
            </Card>
             <Card className="lg:col-span-1">
                <CardHeader>
                    <CardTitle>Loans Overview</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="flex items-center">
                        <Banknote className="h-5 w-5 mr-4 text-muted-foreground" />
                        <span>Disbursed (This Month)</span>
                        <span className="ml-auto font-semibold">{isLoading ? '...' : formatCurrency(metrics?.disbursedThisMonth ?? 0)}</span>
                    </div>
                    <div className="flex items-center">
                        <CalendarClock className="h-5 w-5 mr-4 text-muted-foreground" />
                        <span>Loans Due Today</span>
                        <span className="ml-auto font-semibold">{isLoading ? '...' : metrics?.loansDueTodayCount}</span>
                    </div>
                    <div className="flex items-center">
                        <AlertCircle className="h-5 w-5 mr-4 text-destructive" />
                        <span>Outstanding Arrears</span>
                        <span className="ml-auto font-semibold">{isLoading ? '...' : formatCurrency(metrics?.totalLoanArrears ?? 0)}</span>
                    </div>
                     <div className="flex items-center">
                        <TrendingDown className="h-5 w-5 mr-4 text-destructive" />
                        <span>Portfolio at Risk (PAR &gt; 1 day)</span>
                        <span className="ml-auto font-semibold">{isLoading ? '...' : formatCurrency(metrics?.portfolioAtRisk ?? 0)}</span>
                    </div>
                </CardContent>
            </Card>
             <Card className="lg:col-span-1">
                <CardHeader>
                    <CardTitle>Collections Overview</CardTitle>
                    <CardDescription>Performance of loan collections.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-2">
                    <CollectionProgress title="Today's Collection Rate" value={metrics?.todaysCollectionRate ?? 0} isLoading={isLoading} />
                    <CollectionProgress title="Monthly Collection Rate" value={metrics?.monthlyCollectionRate ?? 0} isLoading={isLoading} />
                </CardContent>
            </Card>
        </div>
      </div>
    </>
  );
}
