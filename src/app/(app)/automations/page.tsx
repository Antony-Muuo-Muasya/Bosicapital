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
    Loader2,
    Database
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

import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';

export default function AutomationsPage() {
    const { toast } = useToast();
    const [running, setRunning] = useState<string | null>(null);
    const [showResults, setShowResults] = useState(false);
    const [resultsData, setResultsData] = useState<any>(null);

    const handleRun = async (id: string, action: () => Promise<any>) => {
        setRunning(id);
        try {
            const res = await action();
            if (res.success) {
                setResultsData({ ...res, taskId: id });
                setShowResults(true);
                toast({
                    title: "Success",
                    description: `Automation task completed. Check results.`,
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
            action: async () => ({ success: true, summary: "Mock: All fully paid loans have been flagged for clearance." })
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
                            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                        </Card>
                    ))}
                </div>
            </div>

            <Dialog open={showResults} onOpenChange={setShowResults}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <div className="mx-auto my-4 p-3 bg-primary/10 rounded-full text-primary w-fit">
                            <Activity className="w-8 h-8" />
                        </div>
                        <DialogTitle className="text-center text-2xl">Automation Completed</DialogTitle>
                        <DialogDescription className="text-center text-lg mt-2">
                            The background task has finished successfully.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-6 border-y my-4">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground uppercase tracking-wider font-semibold">Summary</span>
                                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">Success</Badge>
                            </div>
                            <p className="text-foreground leading-relaxed font-medium">
                                {resultsData?.summary || "Operations completed successfully across all relevant records."}
                            </p>
                            
                            {resultsData?.updatedCount !== undefined && (
                                <div className="p-3 bg-muted rounded-md flex justify-between items-center">
                                    <span className="text-sm">Records Affected</span>
                                    <span className="font-bold text-primary">{resultsData.updatedCount}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button className="w-full h-12 text-lg" onClick={() => setShowResults(false)}>
                            Return to Dashboard
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
