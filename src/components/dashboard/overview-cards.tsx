'use client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Landmark, AlertTriangle, Hourglass, Coins, CalendarCheck, CalendarClock } from 'lucide-react';
import type { Loan, Installment, Borrower, RegistrationPayment, Repayment } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { startOfToday } from 'date-fns';

interface OverviewCardsProps {
  loans: Loan[] | null;
  installments: Installment[] | null;
  borrowers: Borrower[] | null;
  regPayments: RegistrationPayment[] | null;
  repayments: Repayment[] | null;
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


export function OverviewCards({ loans, installments, borrowers, regPayments, repayments, isLoading, title = 'Portfolio Overview' }: OverviewCardsProps) {

  // --- Existing Calculations ---
  const activeLoans = loans ? loans.filter(l => l.status === 'Active') : [];
  const totalPortfolio = activeLoans.reduce((sum, loan) => sum + loan.principal, 0);
  const activeLoansCount = activeLoans.length;
  const pendingApprovalsCount = loans ? loans.filter(l => l.status === 'Pending Approval').length : 0;
  
  const today = startOfToday();

  const overdueInstallments = installments ? installments.filter(i => {
    if (i.status === 'Paid') return false;
    const [year, month, day] = i.dueDate.split('-').map(Number);
    const dueDate = new Date(year, month - 1, day);
    return dueDate < today;
  }) : [];
  const overdueAmount = overdueInstallments.reduce((sum, inst) => sum + (inst.expectedAmount - inst.paidAmount), 0);
  const overdueLoansCount = new Set(overdueInstallments.map(i => i.loanId)).size;

  // --- New Daily Stats Calculations ---
  const todayISO = new Date().toISOString().split('T')[0];

  const paymentsCollectedToday = repayments ? repayments
    .filter(r => new Date(r.paymentDate).toISOString().split('T')[0] === todayISO)
    .reduce((sum, r) => sum + r.amount, 0) : 0;

  const loansDisbursedToday = loans ? loans.filter(l => l.issueDate === todayISO && l.status === 'Active').length : 0;
  
  const installmentsDueToday = installments ? installments.filter(i => i.dueDate === todayISO).length : 0;
  
  const stats = [
    {
      title: 'Collected Today',
      value: formatCurrency(paymentsCollectedToday, 'KES'),
      icon: Coins,
      description: `Total payments received`,
    },
    {
      title: 'Disbursed Today',
      value: loansDisbursedToday,
      icon: CalendarCheck,
      description: 'Newly activated loans',
    },
     {
      title: 'Due Today',
      value: installmentsDueToday,
      icon: CalendarClock,
      description: 'Installments due for payment',
    },
    {
      title: 'Total Portfolio',
      value: formatCurrency(totalPortfolio, 'KES'),
      icon: Landmark,
      description: `${activeLoansCount} active loans`,
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
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => (
        <StatCard key={stat.title} {...stat} isLoading={isLoading} />
      ))}
    </div>
  );
}
