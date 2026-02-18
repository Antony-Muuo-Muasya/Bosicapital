'use client';
import { useState } from 'react';
import { useFormStatus, useFormState } from 'react-dom';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { generateDueDateRecommendationsAction } from '@/app/actions';
import { Lightbulb, AlertTriangle, Loader2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import type { DueDateMonitoringInput } from '@/ai/flows/due-date-monitoring-tool';

const initialState = {
  recommendations: '',
  riskAssessment: '',
  error: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Analyzing...
        </>
      ) : (
        'Generate Recommendations'
      )}
    </Button>
  );
}

const getRiskVariant = (risk: string | null) => {
    if (!risk) return 'default';
    switch (risk.toLowerCase()) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'default';
      default: return 'default';
    }
}

export function DueDateMonitor({ aiInput }: { aiInput: DueDateMonitoringInput }) {
  const [state, formAction] = useFormState(generateDueDateRecommendationsAction, initialState);
  const formKey = JSON.stringify(aiInput);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>AI Due-Date Monitor</CardTitle>
        <CardDescription>Analyze factors to get repayment recommendations.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow grid gap-4">
        <form action={formAction} key={formKey} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="repaymentHistory">Repayment History</Label>
            <Textarea id="repaymentHistory" name="repaymentHistory" placeholder="Enter repayment details" rows={3} defaultValue={aiInput.repaymentHistory} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="externalEvents">External Events</Label>
            <Textarea id="externalEvents" name="externalEvents" placeholder="e.g., economic downturns, local events" rows={2} defaultValue={aiInput.externalEvents} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="upcomingSchedule">Upcoming</Label>
                <Textarea id="upcomingSchedule" name="upcomingSchedule" rows={2} defaultValue={aiInput.upcomingSchedule} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="overdueSchedule">Overdue</Label>
                <Textarea id="overdueSchedule" name="overdueSchedule" rows={2} defaultValue={aiInput.overdueSchedule} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="currentSchedule">Current Schedule Summary</Label>
            <Textarea id="currentSchedule" name="currentSchedule" placeholder="e.g., All other loans are current." rows={1} defaultValue={aiInput.currentSchedule} />
          </div>
          <SubmitButton />
        </form>

        {state.error && (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{state.error}</AlertDescription>
            </Alert>
        )}
      </CardContent>
      {(state.recommendations || state.riskAssessment) && (
        <CardFooter className="flex flex-col items-start gap-4 border-t pt-4">
            {state.riskAssessment && (
                 <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">Risk Assessment:</h3>
                    <Badge variant={getRiskVariant(state.riskAssessment)}>{state.riskAssessment}</Badge>
                </div>
            )}
            {state.recommendations && (
                <Alert>
                    <Lightbulb className="h-4 w-4" />
                    <AlertTitle>Recommendations</AlertTitle>
                    <AlertDescription className="whitespace-pre-wrap text-sm">
                        {state.recommendations}
                    </AlertDescription>
                </Alert>
            )}
        </CardFooter>
      )}
    </Card>
  );
}
