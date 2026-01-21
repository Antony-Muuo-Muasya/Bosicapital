'use client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { CircleDollarSign, Landmark, Users, AlertTriangle, HandCoins, UserCheck } from 'lucide-react';
import type { Loan, Installment, Borrower, RegistrationPayment } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';

interface OverviewCardsProps {
  loans: Loan[] | null;
  installments: Installment[] | null;
  borrowers: Borrower[] | null;
  regPayments: RegistrationPayment[] | null;
  isLoading: boolean;
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


export function OverviewCards({ loans, installments, borrowers, regPayments, isLoading }: OverviewCardsProps) {

  const totalPortfolio = loans
    ? loans.filter(l => l.status === 'Active').reduce((sum, loan) => sum + loan.principal, 0)
    : 0;
  
  const activeLoansCount = loans ? loans.filter(l => l.status === 'Active').length : 0;
  
  const overdueAmount = installments
    ? installments.filter(i => i.status === 'Overdue').reduce((sum, inst) => sum + (inst.expectedAmount - inst.paidAmount), 0)
    : 0;

  const overdueLoansCount = installments 
    ? new Set(installments.filter(i => i.status === 'Overdue').map(i => i.loanId)).size
    : 0;
  
  const totalRegFees = regPayments ? regPayments.reduce((sum, p) => sum + p.amount, 0) : 0;
  const registeredBorrowers = borrowers ? borrowers.filter(b => b.registrationFeePaid).length : 0;

  const stats = [
    {
      title: 'Total Portfolio',
      value: formatCurrency(totalPortfolio),
      icon: CircleDollarSign,
      description: `${activeLoansCount} active loans`,
    },
    {
      title: 'Active Borrowers',
      value: borrowers?.length ?? 0,
      icon: Users,
      description: 'Across all branches',
    },
     {
      title: 'Registered Borrowers',
      value: registeredBorrowers,
      icon: UserCheck,
      description: `${(borrowers?.length || 0) - registeredBorrowers} pending registration`,
    },
    {
      title: 'Registration Fees',
      value: formatCurrency(totalRegFees, 'KES'),
      icon: HandCoins,
      description: 'Total collected',
    },
    {
      title: 'Total Overdue',
      value: formatCurrency(overdueAmount),
      icon: AlertTriangle,
      description: `${overdueLoansCount} loans with overdue payments`,
      className: 'text-destructive',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {stats.map((stat) => (
        <StatCard key={stat.title} {...stat} isLoading={isLoading} />
      ))}
    </div>
  );
}
