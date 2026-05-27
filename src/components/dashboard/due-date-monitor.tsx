'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatCurrency } from '@/lib/utils';
import { 
  AlertTriangle, 
  CheckCircle, 
  Sparkles, 
  Smartphone, 
  Loader2, 
  Phone,
  Activity,
  TrendingUp,
  UserCheck,
  TrendingDown,
  Info,
  Calendar,
  DollarSign
} from 'lucide-react';
import type { Loan, Borrower, Installment } from '@/lib/types';
import { startOfToday, differenceInDays, format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface DueDateMonitorProps {
  loans: Loan[] | null;
  borrowers: Borrower[] | null;
  installments: Installment[] | null;
  isLoading: boolean;
}

export function DueDateMonitor({ loans, borrowers, installments, isLoading }: DueDateMonitorProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'risk' | 'overdue' | 'upcoming'>('risk');
  const [promptingBorrowerId, setPromptingBorrowerId] = useState<string | null>(null);

  // Real-time calculations from Postgres DB records
  const stats = useMemo(() => {
    if (!loans || !borrowers || !installments) {
      return {
        totalOutstanding: 0,
        totalOverdue: 0,
        overdueRatio: 0,
        riskLevel: 'Low' as 'Low' | 'Medium' | 'High',
        overdueBorrowers: [] as Array<{
          borrower: Borrower;
          loanId: string;
          amountOverdue: number;
          daysOverdue: number;
        }>,
        upcomingBorrowers: [] as Array<{
          borrower: Borrower;
          loanId: string;
          amountDue: number;
          dueDate: Date;
        }>,
        totalActiveLoans: 0
      };
    }

    const today = startOfToday();
    const borrowersMap = new Map(borrowers.map(b => [b.id, b]));
    const loansMap = new Map(loans.map(l => [l.id, l]));

    const activeLoans = loans.filter(l => l.status === 'Active' || (l.status as string) === 'In Arrears');
    const activeLoanIds = new Set(activeLoans.map(l => l.id));
    const activeInstallments = installments.filter(i => activeLoanIds.has(i.loanId));

    let totalOutstanding = 0;
    let totalOverdue = 0;

    const overdueBorrowerMap = new Map<string, {
      borrower: Borrower;
      loanId: string;
      amountOverdue: number;
      daysOverdue: number;
    }>();

    const upcomingBorrowerList: Array<{
      borrower: Borrower;
      loanId: string;
      amountDue: number;
      dueDate: Date;
    }> = [];

    activeInstallments.forEach(inst => {
      const loan = loansMap.get(inst.loanId);
      if (!loan) return;

      const borrower = borrowersMap.get(loan.borrowerId);
      if (!borrower) return;

      const unpaidAmount = inst.expectedAmount - inst.paidAmount;
      if (unpaidAmount <= 0) return;

      totalOutstanding += unpaidAmount;

      const [year, month, day] = inst.dueDate.split('-').map(Number);
      const dueDate = new Date(year, month - 1, day);

      if (dueDate < today) {
        totalOverdue += unpaidAmount;
        const days = differenceInDays(today, dueDate);

        const existing = overdueBorrowerMap.get(borrower.id);
        if (existing) {
          existing.amountOverdue += unpaidAmount;
          existing.daysOverdue = Math.max(existing.daysOverdue, days);
        } else {
          overdueBorrowerMap.set(borrower.id, {
            borrower,
            loanId: inst.loanId,
            amountOverdue: unpaidAmount,
            daysOverdue: days
          });
        }
      } else {
        const daysToDue = differenceInDays(dueDate, today);
        if (daysToDue <= 7) {
          upcomingBorrowerList.push({
            borrower,
            loanId: inst.loanId,
            amountDue: unpaidAmount,
            dueDate
          });
        }
      }
    });

    const overdueRatio = totalOutstanding > 0 ? (totalOverdue / totalOutstanding) * 100 : 0;

    let riskLevel: 'Low' | 'Medium' | 'High' = 'Low';
    if (overdueRatio > 15) {
      riskLevel = 'High';
    } else if (overdueRatio > 5) {
      riskLevel = 'Medium';
    }

    const overdueBorrowers = Array.from(overdueBorrowerMap.values())
      .sort((a, b) => b.amountOverdue - a.amountOverdue);

    const upcomingBorrowers = upcomingBorrowerList
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    return {
      totalOutstanding,
      totalOverdue,
      overdueRatio,
      riskLevel,
      overdueBorrowers,
      upcomingBorrowers,
      totalActiveLoans: activeLoans.length
    };
  }, [loans, borrowers, installments]);

  // Handle M-Pesa STK Push Prompt for Overdue Borrower
  const handlePromptPayment = async (
    borrowerId: string, 
    phone: string, 
    amount: number, 
    loanId: string, 
    nationalId: string,
    fullName: string
  ) => {
    setPromptingBorrowerId(borrowerId);
    try {
      const res = await fetch("/api/payments/stk-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          phone, 
          amount: Math.ceil(amount), 
          loanId, 
          nationalId 
        })
      });

      const data = await res.json();
      if (data.success) {
        toast({
          title: "STK Push Initiated",
          description: `An M-Pesa prompt of ${formatCurrency(amount, 'KES')} has been successfully sent to ${fullName} (${phone}).`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "STK Push Failed",
          description: data.error || "Please verify customer phone configuration and try again.",
        });
      }
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Failed to communicate with the payment server.",
      });
    } finally {
      setPromptingBorrowerId(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="h-full flex flex-col min-h-[400px]">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="h-5 w-40 bg-muted animate-pulse rounded" />
              <div className="h-3.5 w-64 bg-muted animate-pulse rounded" />
            </div>
            <div className="h-6 w-16 bg-muted animate-pulse rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground animate-pulse">Calculating portfolio risk metrics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get Risk level colors
  const getRiskStyles = () => {
    switch (stats.riskLevel) {
      case 'High':
        return {
          border: 'border-red-500/20 bg-red-500/5',
          text: 'text-red-500',
          badge: 'bg-red-500 hover:bg-red-600',
          glow: 'shadow-red-500/10'
        };
      case 'Medium':
        return {
          border: 'border-amber-500/20 bg-amber-500/5',
          text: 'text-amber-500',
          badge: 'bg-amber-500 hover:bg-amber-600',
          glow: 'shadow-amber-500/10'
        };
      case 'Low':
      default:
        return {
          border: 'border-emerald-500/20 bg-emerald-500/5',
          text: 'text-emerald-500',
          badge: 'bg-emerald-500 hover:bg-emerald-600',
          glow: 'shadow-emerald-500/10'
        };
    }
  };

  const riskStyles = getRiskStyles();

  return (
    <Card className={`h-full flex flex-col transition-all duration-300 border shadow-md relative overflow-hidden ${riskStyles.border} ${riskStyles.glow}`}>
      
      {/* Visual background indicator */}
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <Activity className="w-36 h-36" />
      </div>

      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg flex items-center gap-1.5 font-bold">
                <Activity className="h-4 w-4 text-primary" />
                Portfolio Risk Analyzer
              </CardTitle>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <CardDescription className="text-xs">Live database tracking & automated collections.</CardDescription>
          </div>
          <Badge className={`uppercase text-[10px] tracking-wider font-bold ${riskStyles.badge}`}>
            {stats.riskLevel} RISK
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-grow flex flex-col space-y-4">
        
        {/* Real-time Meter Card */}
        <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-background/50 border backdrop-blur-sm">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> Portfolio Overdue
            </span>
            <p className="text-lg font-extrabold tracking-tight text-red-500">
              {formatCurrency(stats.totalOverdue, 'KES')}
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Portfolio at Risk
            </span>
            <p className={`text-lg font-extrabold tracking-tight ${riskStyles.text}`}>
              {stats.overdueRatio.toFixed(1)}%
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full flex-grow flex flex-col">
          <TabsList className="grid grid-cols-3 h-8 p-1 bg-muted/80 mb-3">
            <TabsTrigger value="risk" className="text-xs py-1">Insights</TabsTrigger>
            <TabsTrigger value="overdue" className="text-xs py-1 flex items-center gap-1">
              Overdue
              {stats.overdueBorrowers.length > 0 && (
                <Badge variant="destructive" className="h-4 w-4 p-0 flex items-center justify-center text-[9px] font-bold">
                  {stats.overdueBorrowers.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="text-xs py-1">Upcoming</TabsTrigger>
          </TabsList>

          {/* INSIGHTS TAB */}
          <TabsContent value="risk" className="flex-grow flex flex-col space-y-3 focus-visible:outline-none">
            <div className="flex-grow space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                Data-Driven Insights
              </h4>
              
              {stats.overdueBorrowers.length > 0 ? (
                <Alert className="border-red-500/10 bg-red-500/5 text-xs py-2.5 px-3">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                  <AlertTitle className="font-bold text-red-600">Arrears Recovery Action Required</AlertTitle>
                  <AlertDescription className="text-muted-foreground mt-1 leading-relaxed">
                    There are <strong>{stats.overdueBorrowers.length}</strong> borrowers with overdue installments totaling <strong>{formatCurrency(stats.totalOverdue, 'KES')}</strong>. Use the Overdue tab to trigger immediate M-Pesa STK prompts.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-emerald-500/10 bg-emerald-500/5 text-xs py-2.5 px-3">
                  <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
                  <AlertTitle className="font-bold text-emerald-600">Outstanding Performance</AlertTitle>
                  <AlertDescription className="text-muted-foreground mt-1 leading-relaxed">
                    Zero arrears reported for active branch loans! Keep maintaining this standard of performance and prompt client engagement.
                  </AlertDescription>
                </Alert>
              )}

              {stats.upcomingBorrowers.length > 0 && (
                <div className="flex items-start gap-2.5 p-2.5 rounded-lg border bg-muted/30 text-xs">
                  <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold">SMS Reminder Opportunity</p>
                    <p className="text-[11px] text-muted-foreground">
                      <strong>{stats.upcomingBorrowers.length}</strong> payments are due in the next 7 days. Early payment SMS reminders are recommended to sustain portfolio health.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t text-[10px] text-muted-foreground italic flex justify-between items-center">
              <span>Auto-calculating live Postgres state</span>
              <span>Updated in real-time</span>
            </div>
          </TabsContent>

          {/* OVERDUE LIST TAB */}
          <TabsContent value="overdue" className="flex-grow flex flex-col focus-visible:outline-none">
            <ScrollArea className="h-[210px] pr-2">
              {stats.overdueBorrowers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center gap-2 border border-dashed rounded-lg bg-muted/10">
                  <CheckCircle className="h-8 w-8 text-emerald-500/60" />
                  <p className="text-xs font-medium text-muted-foreground">No overdue borrowers found!</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {stats.overdueBorrowers.map(({ borrower, loanId, amountOverdue, daysOverdue }) => (
                    <div key={borrower.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-background hover:bg-muted/10 transition-colors shadow-sm gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="h-8 w-8 border">
                          <AvatarImage src={borrower.photoUrl} alt={borrower.fullName} />
                          <AvatarFallback className="text-xs font-bold">
                            {borrower.fullName?.charAt(0) ?? '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{borrower.fullName}</p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-semibold">
                            <span className="text-red-500">{daysOverdue}d overdue</span> • <span className="font-mono text-[9px] uppercase">{loanId}</span>
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-xs font-extrabold text-red-500">{formatCurrency(amountOverdue, 'KES')}</p>
                        </div>
                        <Button 
                          size="icon" 
                          variant="secondary"
                          className="h-8 w-8 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-full transition-all flex items-center justify-center"
                          disabled={promptingBorrowerId === borrower.id}
                          onClick={() => handlePromptPayment(
                            borrower.id,
                            borrower.phone,
                            amountOverdue,
                            loanId,
                            borrower.nationalId,
                            borrower.fullName
                          )}
                          title="Prompt M-Pesa STK Push"
                        >
                          {promptingBorrowerId === borrower.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Smartphone className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* UPCOMING LIST TAB */}
          <TabsContent value="upcoming" className="flex-grow flex flex-col focus-visible:outline-none">
            <ScrollArea className="h-[210px] pr-2">
              {stats.upcomingBorrowers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center gap-2 border border-dashed rounded-lg bg-muted/10">
                  <Calendar className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-xs font-medium text-muted-foreground">No upcoming payments in next 7 days.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {stats.upcomingBorrowers.map(({ borrower, loanId, amountDue, dueDate }) => (
                    <div key={borrower.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-background hover:bg-muted/10 transition-colors shadow-sm gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="h-8 w-8 border">
                          <AvatarImage src={borrower.photoUrl} alt={borrower.fullName} />
                          <AvatarFallback className="text-xs font-bold">
                            {borrower.fullName?.charAt(0) ?? '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{borrower.fullName}</p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-semibold">
                            <span>Due: {format(dueDate, 'MMM dd, yyyy')}</span> • <span className="font-mono text-[9px] uppercase">{loanId}</span>
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-xs font-extrabold text-primary">{formatCurrency(amountDue, 'KES')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
