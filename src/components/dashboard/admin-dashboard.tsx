'use client';
import { PageHeader } from '@/components/page-header';
import { useCollection, useFirestore, useMemoFirebase, useUserProfile } from '@/firebase';
import { Button } from '../ui/button';
import { PlusCircle, UserPlus } from 'lucide-react';
import { useState, useMemo } from 'react';
import { AddLoanProductDialog } from '../settings/add-loan-product-dialog';
import { useRouter } from 'next/navigation';
import { collection, query, where, limit, orderBy, collectionGroup } from 'firebase/firestore';
import type { Loan, Borrower, Installment, RegistrationPayment, Repayment, User as AppUser } from '@/lib/types';
import { OverviewCards } from './overview-cards';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { formatCurrency } from '@/lib/utils';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, Tooltip } from "recharts";


export function AdminDashboard() {
  const router = useRouter();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const firestore = useFirestore();
  const organizationId = userProfile?.organizationId;

  // --- Data Fetching ---
  const orgQuery = (collectionName: string) => useMemoFirebase(() => {
    if (!firestore || !organizationId) return null;
    return query(collection(firestore, collectionName), where('organizationId', '==', organizationId));
  }, [firestore, organizationId]);

  const { data: loans, isLoading: loansLoading } = useCollection<Loan>(orgQuery('loans'));
  const { data: borrowers, isLoading: borrowersLoading } = useCollection<Borrower>(orgQuery('borrowers'));
  const { data: regPayments, isLoading: regPaymentsLoading } = useCollection<RegistrationPayment>(orgQuery('registrationPayments'));
  const { data: users, isLoading: usersLoading } = useCollection<AppUser>(orgQuery('users'));
  
  const installmentsQuery = useMemoFirebase(() => {
      if (!firestore || !organizationId) return null;
      return query(collectionGroup(firestore, 'installments'), where('organizationId', '==', organizationId));
  }, [firestore, organizationId]);
  const { data: installments, isLoading: installmentsLoading } = useCollection<Installment>(installmentsQuery);
  
  const recentRepaymentsQuery = useMemoFirebase(() => {
      if (!firestore || !organizationId || !loans) return null;
      const visibleLoanIds = loans.map(l => l.id);
      if (visibleLoanIds.length === 0) {
        return query(collection(firestore, 'repayments'), where('loanId', '==', 'no-loans-found'));
      };
      
      return query(
          collection(firestore, 'repayments'), 
          where('loanId', 'in', visibleLoanIds.slice(0, 30)), // Firestore 'in' query limit is 30
          orderBy('paymentDate', 'desc'),
          limit(5)
        );
  }, [firestore, organizationId, loans]);
  const { data: recentRepayments, isLoading: repaymentsLoading } = useCollection<Repayment>(recentRepaymentsQuery);


  const isLoading = isProfileLoading || loansLoading || borrowersLoading || regPaymentsLoading || installmentsLoading || usersLoading || repaymentsLoading;

  // --- Feature 1-5: Overview Cards ---
  // The <OverviewCards /> component will render these.

  // --- Feature 6-8: Recent Activity ---
  const pendingLoans = useMemo(() => loans?.filter(l => l.status === 'Pending Approval').slice(0, 5) || [], [loans]);
  
  const recentLoans = useMemo(() => loans?.sort((a,b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()).slice(0, 5) || [], [loans]);

  const recentRepaymentsWithDetails = useMemo(() => {
    if (!recentRepayments || !borrowers || !loans) return [];
    const borrowersMap = new Map(borrowers.map(b => [b.id, b.fullName]));
    const loanBorrowerMap = new Map(loans.map(l => [l.id, l.borrowerId]));
    return recentRepayments.map(r => ({
      ...r,
      borrowerName: borrowersMap.get(loanBorrowerMap.get(r.loanId) || '') || 'Unknown'
    }));
  }, [recentRepayments, borrowers, loans]);
  
  // --- Feature 9: Portfolio Composition Chart ---
  const loanStatusData = useMemo(() => {
    if (!loans) return [];
    const statusCounts = loans.reduce((acc, loan) => {
      const statusKey = loan.status.replace(/ /g, '');
      acc[statusKey] = (acc[statusKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCounts).map(([name, value]) => ({ 
        name: name.replace(/([A-Z])/g, ' $1').trim(), // Add space before capital letters
        value, 
        fill: `var(--color-${name.toLowerCase()})` 
    }));
  }, [loans]);

  const chartConfig = {
    PendingApproval: { label: 'Pending', color: 'hsl(var(--chart-2))' },
    Active: { label: 'Active', color: 'hsl(var(--chart-1))' },
    Completed: { label: 'Completed', color: 'hsl(var(--chart-3))' },
    Rejected: { label: 'Rejected', color: 'hsl(var(--chart-5))' },
  };

  // --- Feature 10: Loan Officer Leaderboard ---
  const loanOfficers = useMemo(() => {
    if (!users || !loans) return [];
    const officerMap = new Map<string, { name: string, loanCount: number }>();
    users.filter(u => u.roleId === 'loan_officer').forEach(u => officerMap.set(u.id, { name: u.fullName, loanCount: 0 }));
    loans.filter(l => l.status === 'Active').forEach(l => {
      if (officerMap.has(l.loanOfficerId)) {
        officerMap.get(l.loanOfficerId)!.loanCount += 1;
      }
    });
    return Array.from(officerMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.loanCount - a.loanCount);
  }, [users, loans]);

  return (
    <>
      <PageHeader
        title="Admin Dashboard"
        description="Organization-wide overview of all lending activities."
      >
        <div className='flex gap-2'>
            <Button variant="outline" onClick={() => router.push('/users')}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Staff
            </Button>
            <Button onClick={() => setIsAddProductOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Loan Product
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
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="approvals">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="approvals">Pending Approvals</TabsTrigger>
                  <TabsTrigger value="new-loans">New Loans</TabsTrigger>
                  <TabsTrigger value="repayments">Recent Repayments</TabsTrigger>
                </TabsList>
                <TabsContent value="approvals" className="pt-4">
                  <RecentActivityTable data={pendingLoans} borrowers={borrowers} type="loan" />
                </TabsContent>
                <TabsContent value="new-loans" className="pt-4">
                   <RecentActivityTable data={recentLoans} borrowers={borrowers} type="loan" />
                </TabsContent>
                <TabsContent value="repayments" className="pt-4">
                   <RecentActivityTable data={recentRepaymentsWithDetails} borrowers={borrowers} type="repayment" />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Composition</CardTitle>
              <CardDescription>Breakdown of all loans by status.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[250px]">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                  <Pie data={loanStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                     {loanStatusData.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Loan Officer Leaderboard</CardTitle>
                    <CardDescription>Ranking based on number of active loans.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Rank</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead className="text-right">Active Loans</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loanOfficers.map((officer, index) => (
                                <TableRow key={officer.id}>
                                    <TableCell className="font-medium">{index + 1}</TableCell>
                                    <TableCell>{officer.name}</TableCell>
                                    <TableCell className="text-right font-bold">{officer.loanCount}</TableCell>
                                </TableRow>
                            ))}
                            {!isLoading && loanOfficers.length === 0 && <TableRow><TableCell colSpan={3} className="h-24 text-center">No active loan officers found.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
      </div>
      <AddLoanProductDialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen} />
    </>
  );
}

// Helper component for the activity tabs
function RecentActivityTable({ data, borrowers, type }: { data: any[] | null, borrowers: Borrower[] | null, type: 'loan' | 'repayment' }) {
  const borrowersMap = useMemo(() => new Map(borrowers?.map(b => [b.id, b])), [borrowers]);

  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No recent activity.</p>;
  }

  return (
    <div className="space-y-4">
        {data.map(item => {
          const borrower = type === 'loan' ? borrowersMap.get(item.borrowerId) : null;
          const name = type === 'loan' ? borrower?.fullName : item.borrowerName;
          const photo = type === 'loan' ? borrower?.photoUrl : `https://picsum.photos/seed/${item.id}/100`;

          return (
            <div key={item.id} className="flex items-center">
                <Avatar className="h-9 w-9">
                    <AvatarImage src={photo} alt={name || ''} />
                    <AvatarFallback>{name?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
                <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">{name}</p>
                    <p className="text-sm text-muted-foreground">
                        {type === 'loan' ? `Applied for ${formatCurrency(item.principal)}` : `Paid ${formatCurrency(item.amount)}`}
                    </p>
                </div>
                <div className="ml-auto text-sm text-muted-foreground">
                    {type === 'loan' ? new Date(item.issueDate).toLocaleDateString() : new Date(item.paymentDate).toLocaleDateString()}
                </div>
            </div>
          )
        })}
    </div>
  )
}
