'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Database } from 'lucide-react';

export function CreateIndexCard() {
  return (
    <Card className="bg-amber-50 border border-amber-200 dark:bg-amber-950 dark:border-amber-800">
      <CardHeader className="flex-row items-center gap-4 space-y-0">
          <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900">
             <Database className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
        <div>
          <CardTitle>Database Index Required</CardTitle>
          <CardDescription className="text-amber-800 dark:text-amber-300">
            Collection Overview is disabled.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive" className="bg-transparent border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Action Needed</AlertTitle>
            <AlertDescription>
                To enable the real-time collection overview, a composite index must be created in Firestore.
                The original error in your browser's developer console contains a link to create this index automatically. This is a one-time setup.
            </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
