import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit">
            <ShieldAlert className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle className="text-2xl mt-4">Access Denied</CardTitle>
          <CardDescription>
            You do not have the necessary permissions to view this page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">
            If you believe this is an error, please contact your system administrator.
          </p>
          <Button asChild>
            <Link href="/dashboard">Return to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
