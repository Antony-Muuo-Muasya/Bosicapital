'use client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Landmark, Users, AlertTriangle, HandCoins, UserCheck, Hourglass } from 'lucide-react';
import type { Loan, Installment, Borrower, RegistrationPayment } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { startOfToday } from 'date-fns';

interface OverviewCardsProps {
  loans: Loan[] | null;
  installments: Installment[] | null;
  borrowers: Borrower[] | null;
  regPayments: RegistrationPayment[] | null;
  isLoading: boolean;
  title?: string;
}

const StatCard = ({ title, value, icon: Icon, description, className, isLoading }: any) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <>
          <Skeleton className="h-7 w-24 mb-1" />
          <Skeleton className="h-3 w-40" />
        </>
      ) : (
        <>
          <div className={`text-2xl font-bold ${className || ''}`}>{value}</div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </>
      )}
    </CardContent>
  </Card>
);


export function OverviewCards({ loans, installments, borrowers, regPayments, isLoading, title = 'Portfolio Overview' }: OverviewCardsProps) {

  const activeLoans = loans ? loans.filter(l => l.status === 'Active') : [];
  const totalPortfolio = activeLoans.reduce((sum, loan) => sum + loan.principal, 0);
  const activeLoansCount = activeLoans.length;

  const today = startOfToday();

  const overdueInstallments = installments ? installments.filter(i => {
    if (i.status === 'Paid') return false;
    // Create date in local timezone from 'YYYY-MM-DD' string to avoid timezone issues
    const [year, month, day] = i.dueDate.split('-').map(Number);
    const dueDate = new Date(year, month - 1, day);
    return dueDate < today;
  }) : [];

  const overdueAmount = overdueInstallments.reduce((sum, inst) => sum + (inst.expectedAmount - inst.paidAmount), 0);
  const overdueLoansCount = new Set(overdueInstallments.map(i => i.loanId)).size;
  
  const totalRegFees = regPayments ? regPayments.reduce((sum, p) => sum + p.amount, 0) : 0;
  const registeredBorrowers = borrowers ? borrowers.filter(b => b.registrationFeePaid).length : 0;

  const pendingApprovalsCount = loans ? loans.filter(l => l.status === 'Pending Approval').length : 0;

  const stats = [
    {
      title: 'Total Portfolio',
      value: formatCurrency(totalPortfolio, 'KES'),
      icon: Landmark,
      description: `${activeLoansCount} active loans`,
    },
    {
      title: 'Active Borrowers',
      value: borrowers?.length ?? 0,
      icon: Users,
      description: 'Across all branches',
    },
    {
      title: 'Pending Approvals',
      value: pendingApprovalsCount,
      icon: Hourglass,
      description: 'Awaiting review',
      className: 'text-amber-600',
    },
    {
      title: 'Total Overdue',
      value: formatCurrency(overdueAmount, 'KES'),
      icon: AlertTriangle,
      description: `${overdueLoansCount} loans with overdue payments`,
      className: 'text-destructive',
    },
    {
      title: 'Registered Borrowers',
      value: registeredBorrowers,
      icon: UserCheck,
      description: `${(borrowers?.length || 0) - registeredBorrowers} pending fee`,
    },
    {
      title: 'Registration Fees',
      value: formatCurrency(totalRegFees, 'KES'),
      icon: HandCoins,
      description: 'Total collected',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => (
        <StatCard key={stat.title} {...stat} isLoading={isLoading} />
      ))}
    </div>
  );
}
