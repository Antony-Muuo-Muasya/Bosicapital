'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import type { DueDateMonitoringInput } from '@/ai/flows/due-date-monitoring-tool';

export function DueDateMonitor({ aiInput }: { aiInput: DueDateMonitoringInput }) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>AI Due-Date Monitor</CardTitle>
        <CardDescription>Analyze factors to get repayment recommendations.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow grid gap-4 items-center justify-center">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Feature Temporarily Disabled</AlertTitle>
          <AlertDescription>
            The AI analysis feature is currently unavailable. We are working on a fix to resolve the underlying dependency issues.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
