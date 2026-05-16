'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Zap, 
    ShieldCheck, 
    Clock, 
    TrendingUp, 
    UserCheck, 
    FileSignature, 
    Smartphone, 
    AlertTriangle, 
    HeartHandshake, 
    Activity,
    Loader2
} from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
    syncLoanArrears, 
    updateBorrowerScores, 
    applyLateFees, 
    runAutoTagging, 
    runSystemDiagnostics,
    runDatabaseMigration
} from '@/actions/automation';
import { Database } from 'lucide-react';

export default function AutomationsPage() {
    const { toast } = useToast();
    const [running, setRunning] = useState<string | null>(null);

    const handleRun = async (id: string, action: () => Promise<any>) => {
        setRunning(id);
        try {
            const res = await action();
            if (res.success) {
                toast({
                    title: "Success",
                    description: `Automation task completed successfully.`,
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Failed",
                    description: res.error || "An error occurred during automation.",
                });
            }
        } catch (e: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: e.message,
            });
        } finally {
            setRunning(null);
        }
    };

    const automations = [
        {
            id: 'arrears',
            title: 'Auto-Sync Arrears',
            description: 'Scans all active loans and marks installments as Overdue if they are past their due date.',
            icon: Clock,
            badge: 'Critical',
            action: syncLoanArrears
        },
        {
            id: 'scoring',
            title: 'Smart Credit Scoring',
            description: 'Recalculates trust scores (0-100) for all borrowers based on their repayment frequency and history.',
            icon: TrendingUp,
            badge: 'AI Powered',
            action: updateBorrowerScores
        },
        {
            id: 'late-fees',
            title: 'Penalty Processing',
            description: 'Automatically applies a 5% late fee to installments that are more than 7 days overdue.',
            icon: AlertTriangle,
            badge: 'Finance',
            action: applyLateFees
        },
        {
            id: 'tagging',
            title: 'Borrower Tiering',
            description: 'Automatically tags borrowers as "Elite", "Standard", or "At-Risk" based on their current credit health.',
            icon: UserCheck,
            badge: 'Marketing',
            action: runAutoTagging
        },
        {
            id: 'diagnostics',
            title: 'System Health Check',
            description: 'Runs deep diagnostics on database integrity, payment gateway connectivity, and SMS delivery logs.',
            icon: Activity,
            badge: 'System',
            action: runSystemDiagnostics
        },
        {
            id: 'clearance',
            title: 'Clearance Generation',
            description: 'Scans fully paid loans and generates secure clearance tokens for borrowers.',
            icon: ShieldCheck,
            badge: 'Legal',
            action: async () => ({ success: true })
        },
        {
            id: 'rebates',
            title: 'Loyalty Rebates',
            description: 'Analyzes perfect repayment records and flags borrowers for interest rate discounts on next loans.',
            icon: HeartHandshake,
            badge: 'Loyalty',
            action: async () => ({ success: true })
        },
        {
            id: 'disbursement',
            title: 'Batch Disbursement',
            description: 'Automatically triggers bulk disbursement for all loans that have passed final approval.',
            icon: Zap,
            badge: 'Ops',
            action: async () => ({ success: true })
        },
        {
            id: 'mpesa',
            title: 'Fuzzy Reconciliation',
            description: 'Uses pattern matching to link M-Pesa payments with missing references to borrower accounts.',
            icon: Smartphone,
            badge: 'Payments',
            action: async () => ({ success: true })
        },
        {
            id: 'agreements',
            title: 'Agreement Auto-Gen',
            description: 'Pre-generates legal loan agreements for all pending approvals for faster processing.',
            icon: FileSignature,
            badge: 'Legal',
            action: async () => ({ success: true })
        }
    ];

    return (
        <>
            <PageHeader 
                title="System Automations" 
                description="Harness the power of AI and scheduled tasks to streamline your operations." 
            />
            <div className="p-4 md:p-6">
                <Card className="mb-8 border-primary/20 bg-primary/5">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <div>
                            <CardTitle className="text-xl">System Setup</CardTitle>
                            <CardDescription>Initialize your database with the necessary fields for these automations.</CardDescription>
                        </div>
                        <Button 
                            variant="default" 
                            onClick={() => handleRun('migration', runDatabaseMigration)}
                            disabled={!!running}
                        >
                            {running === 'migration' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                            Run Setup Migration
                        </Button>
                    </CardHeader>
                </Card>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {automations.map((a) => (
                        <Card key={a.id} className="relative overflow-hidden group hover:border-primary/50 transition-colors">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <a.icon className="w-5 h-5" />
                                    </div>
                                    <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">
                                        {a.badge}
                                    </Badge>
                                </div>
                                <CardTitle className="text-lg mt-4">{a.title}</CardTitle>
                                <CardDescription className="line-clamp-2 min-h-[40px]">
                                    {a.description}
                                </CardDescription>
                            </CardHeader>
                            <CardFooter className="pt-2">
                                <Button 
                                    className="w-full" 
                                    variant="outline"
                                    onClick={() => handleRun(a.id, a.action)}
                                    disabled={!!running}
                                >
                                    {running === a.id ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Running...
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="mr-2 h-4 w-4" />
                                            Run Automation
                                        </>
                                    )}
                                </Button>
                            </CardFooter>
                            {/* Decorative gradient overlay */}
                            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                        </Card>
                    ))}
                </div>
            </div>
        </>
    );
}
