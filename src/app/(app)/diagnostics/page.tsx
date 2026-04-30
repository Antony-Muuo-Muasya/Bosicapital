'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getDiagnosticInfo, manualRecon } from '@/actions/diagnostics';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, RefreshCcw, ShieldCheck, AlertCircle, Zap, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

export default function DiagnosticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
        <Button onClick={load} disabled={loading} size="sm">
          <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Status
        </Button>
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
            <p className="text-xs text-muted-foreground mt-1 font-mono break-all line-clamp-2">
              {data.mpesa.detail}
            </p>
          </CardContent>
        </Card>

        {/* SMS PROVIDER */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Africa's Talking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Username:</span>
                <span className="font-mono font-bold text-blue-600">{data.env.AFRICAS_TALKING_USERNAME}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>API Key:</span>
                <Badge variant={data.env.AFRICAS_TALKING_APIKEY ? 'default' : 'destructive'}>
                  {data.env.AFRICAS_TALKING_APIKEY ? 'CONFIGURED' : 'MISSING'}
                </Badge>
              </div>
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
               <Badge variant="outline">DB_URL: {data.env.DATABASE_URL ? '✅' : '❌'}</Badge>
               <Badge variant="outline">CONSUMER_KEY: {data.env.MPESA_CONSUMER_KEY ? '✅' : '❌'}</Badge>
               <Badge variant="outline">SECRET: {data.env.MPESA_CONSUMER_SECRET ? '✅' : '❌'}</Badge>
               <Badge variant="outline">PASSKEY: {data.env.MPESA_PASSKEY ? '✅' : '❌'}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MANUAL RECONCILIATION FORM */}
        <Card className="border-blue-500/20 bg-blue-500/5">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-blue-500" />
                    Force Reconciliation
                </CardTitle>
                <CardDescription>
                    If Safaricom failed to send a notification, use this to manually "claim" a receipt. The system will then automatically process the loan/registration and send the SMS.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleManualSync} className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>M-Pesa Code</Label>
                        <Input 
                            placeholder="e.g. RLK4Z9..." 
                            value={form.transId} 
                            onChange={e => setForm({...form, transId: e.target.value})} 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Account No / ID No</Label>
                        <Input 
                            placeholder="National ID or Account" 
                            value={form.billRef} 
                            onChange={e => setForm({...form, billRef: e.target.value})} 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Amount</Label>
                        <Input 
                            type="number" 
                            placeholder="KES" 
                            value={form.amount} 
                            onChange={e => setForm({...form, amount: e.target.value})} 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Phone No (Optional)</Label>
                        <Input 
                            placeholder="254..." 
                            value={form.msisdn} 
                            onChange={e => setForm({...form, msisdn: e.target.value})} 
                        />
                    </div>
                    <Button type="submit" className="col-span-2 mt-2" disabled={submitting}>
                        {submitting ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2 h-4 w-4" />}
                        Process & Send SMS
                    </Button>
                </form>
            </CardContent>
        </Card>

        {/* HANDSHAKE LOGS */}
        <Card className="flex-1">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg">Handshake History</CardTitle>
                <CardDescription>Latest notifications from Safaricom.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.callbacks.length > 0 ? data.callbacks.slice(0, 5).map((cb: any) => (
                        <TableRow key={cb.id} className="text-xs">
                            <TableCell>{new Date(cb.createdAt).toLocaleTimeString()}</TableCell>
                            <TableCell className="font-mono">{cb.transId}</TableCell>
                            <TableCell>
                                <Badge variant={cb.status === 'Processed' ? 'default' : 'secondary'} className="scale-75">
                                    {cb.status}
                                </Badge>
                            </TableCell>
                        </TableRow>
                        )) : (
                        <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground py-10">No logs found</TableCell>
                        </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
