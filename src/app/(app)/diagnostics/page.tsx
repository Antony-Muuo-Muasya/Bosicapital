'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getDiagnosticInfo, manualRecon, testSMS } from '@/actions/diagnostics';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, RefreshCcw, ShieldCheck, AlertCircle, Zap, Send, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function DiagnosticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [smsTesting, setSmsTesting] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const { toast } = useToast();

  const [form, setForm] = useState({
    transId: '',
    msisdn: '',
    amount: '',
    billRef: ''
  });

  const load = async () => {
    setLoading(true);
    const res = await getDiagnosticInfo();
    setData(res);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleManualSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.transId || !form.amount || !form.billRef) {
        return toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
    }

    setSubmitting(true);
    try {
        const res = await manualRecon({
            transId: form.transId.trim().toUpperCase(),
            msisdn: form.msisdn.trim(),
            amount: Number(form.amount),
            billRef: form.billRef.trim()
        });

        if (res.success) {
            toast({ title: "Success", description: res.message });
            setForm({ transId: '', msisdn: '', amount: '', billRef: '' });
            load();
        } else {
            toast({ title: "Failed", description: res.message, variant: "destructive" });
        }
    } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
        setSubmitting(false);
    }
  };

  const handleTestSMS = async () => {
    if (!testPhone) return toast({ title: "Error", description: "Enter a phone number", variant: "destructive" });
    setSmsTesting(true);
    try {
        const res = await testSMS(testPhone);
        if (res.success) {
            toast({ title: "Sent!", description: "Message sent! Check your phone." });
        } else {
            console.error("SMS Error:", res.error);
            toast({ 
                title: "SMS Failed", 
                description: typeof res.error === 'object' ? JSON.stringify(res.error) : res.error, 
                variant: "destructive" 
            });
        }
    } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
        setSmsTesting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="System Diagnostics" description="Real-time health check for your payment and SMS integrations.">
        <div className="flex gap-2">
            <Button onClick={load} disabled={loading} size="sm" variant="outline">
                <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
            </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* M-PESA STATUS */}
        <Card className={data.mpesa.status.includes('✅') ? 'border-emerald-500/20' : 'border-red-500/20'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              M-Pesa API Status
              <Zap className={data.mpesa.status.includes('✅') ? 'text-emerald-500' : 'text-red-500'} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.mpesa.status}</div>
            <p className="text-xs text-muted-foreground mt-1 font-mono break-all line-clamp-1">
              {data.mpesa.detail}
            </p>
          </CardContent>
        </Card>

        {/* SMS PROVIDER */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
                Africa's Talking
                <MessageSquare className="h-4 w-4 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="font-mono text-blue-600 font-bold">{data.env.AFRICAS_TALKING_USERNAME}</span>
                <Badge variant={data.env.AFRICAS_TALKING_APIKEY ? 'default' : 'destructive'}>
                  {data.env.AFRICAS_TALKING_APIKEY ? 'CONNECTED' : 'MISSING KEY'}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Input 
                    placeholder="Test Phone 254..." 
                    className="h-8 text-xs" 
                    value={testPhone} 
                    onChange={e => setTestPhone(e.target.value)} 
                />
                <Button size="sm" variant="secondary" className="h-8" onClick={handleTestSMS} disabled={smsTesting}>
                   {smsTesting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Test"}
                </Button>
              </div>
          </CardContent>
        </Card>

        {/* ENV VARS */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Core Environment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-[10px] items-center">
               <Badge variant="outline">DB: {data.env.DATABASE_URL ? '✅' : '❌'}</Badge>
               <Badge variant="outline">MPESA: {data.env.MPESA_CONSUMER_KEY ? '✅' : '❌'}</Badge>
               <Badge variant="outline">SECRET: {data.env.MPESA_CONSUMER_SECRET ? '✅' : '❌'}</Badge>
               <Badge variant="outline">PASS: {data.env.MPESA_PASSKEY ? '✅' : '❌'}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* MANUAL RECONCILIATION FORM */}
        <Card className="border-blue-500/20 bg-blue-500/5 shadow-lg">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-blue-500" />
                    Force Reconciliation
                </CardTitle>
                <CardDescription>
                    Manually process a payment that Safaricom missed. This will update the borrower and send the SMS.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleManualSync} className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs">M-Pesa Code</Label>
                        <Input 
                            placeholder="e.g. RLK4Z..." 
                            value={form.transId} 
                            onChange={e => setForm({...form, transId: e.target.value})} 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs">Account / ID No</Label>
                        <Input 
                            placeholder="Borrower ID" 
                            value={form.billRef} 
                            onChange={e => setForm({...form, billRef: e.target.value})} 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs">Amount (KES)</Label>
                        <Input 
                            type="number" 
                            placeholder="500" 
                            value={form.amount} 
                            onChange={e => setForm({...form, amount: e.target.value})} 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs">Borrower Phone (for SMS)</Label>
                        <Input 
                            placeholder="254..." 
                            value={form.msisdn} 
                            onChange={e => setForm({...form, msisdn: e.target.value})} 
                        />
                    </div>
                    <Button type="submit" className="col-span-2 mt-2 font-bold" disabled={submitting}>
                        {submitting ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2 h-4 w-4" />}
                        PROCESS & SEND NOTIFICATION
                    </Button>
                </form>
            </CardContent>
        </Card>

        {/* LOGS */}
        <Card className="flex flex-col">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Zap className="h-5 w-5 text-emerald-500" />
                    Live Activity
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-[100px]">Time</TableHead>
                                <TableHead>Reference</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.callbacks.length > 0 ? data.callbacks.slice(0, 8).map((cb: any) => (
                            <TableRow key={cb.id} className="text-xs">
                                <TableCell className="text-muted-foreground">{new Date(cb.createdAt).toLocaleTimeString()}</TableCell>
                                <TableCell className="font-mono font-medium">{cb.transId}</TableCell>
                                <TableCell>KES {cb.transAmount}</TableCell>
                                <TableCell>
                                    <Badge variant={cb.status === 'Processed' ? 'default' : 'secondary'} className="rounded-sm">
                                        {cb.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                            )) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-20 text-muted-foreground">
                                    No activity records found
                                </TableCell>
                            </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
