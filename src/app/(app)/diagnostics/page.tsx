'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getDiagnosticInfo } from '@/actions/diagnostics';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, RefreshCcw, ShieldCheck, AlertCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DiagnosticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await getDiagnosticInfo();
    setData(res);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

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

      {/* RECENT CALLBACK LOGS (The Handshake Check) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCcw className="h-5 w-5 text-muted-foreground" />
            Recent M-Pesa Notifications (The "Handshake" History)
          </CardTitle>
          <CardDescription>
            This shows every time Safaricom tries to talk to your server. If your payment is missing here, the notification never reached your website.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time Received</TableHead>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Error/Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.callbacks.length > 0 ? data.callbacks.map((cb: any) => (
                <TableRow key={cb.id}>
                  <TableCell>{new Date(cb.createdAt).toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-xs">{cb.transId || 'PENDING'}</TableCell>
                  <TableCell>{cb.transAmount}</TableCell>
                  <TableCell>
                    <Badge variant={cb.status === 'Processed' ? 'default' : cb.status === 'Failed' ? 'destructive' : 'secondary'}>
                      {cb.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                    {cb.errorMessage || 'No issues detected'}
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <AlertCircle className="h-8 w-8" />
                      <p>Safaricom hasn't sent any notifications yet.</p>
                      <p className="text-xs">If you just paid, this means the notification was blocked or your URL is not registered.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
