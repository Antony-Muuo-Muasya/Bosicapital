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
            Some dashboard widgets are disabled.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive" className="bg-transparent border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Action Needed</AlertTitle>
            <AlertDescription>
                <p className="mb-2">To enable real-time portfolio statistics, a specific database index needs to be created. The Firestore SDK provides a direct link to do this automatically.</p>
                <p className="font-semibold">Please follow these steps:</p>
                <ol className="list-decimal list-inside space-y-1 mt-1">
                    <li>Open your browser's developer tools (usually F12 or right-click &rarr; "Inspect").</li>
                    <li>Go to the "Console" tab.</li>
                    <li>Look for an error message from Firestore that starts with 'FAILED_PRECONDITION'.</li>
                    <li>Click the link within that error message. It will take you to the Firebase Console with the index details pre-filled.</li>
                    <li>Click the "Create Index" button.</li>
                </ol>
                <p className="mt-2 text-xs">The index can take a few minutes to build. Once it's ready, refresh this page.</p>
            </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
