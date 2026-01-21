'use client';

import { AdooLogo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/firebase';

export default function AccessDeniedPage() {
    const router = useRouter();
    const { userProfile } = useUserProfile();

    const handleReturn = () => {
        if (userProfile?.roleId === 'user') {
            router.push('/my-dashboard');
        } else {
            router.push('/dashboard');
        }
    }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
            <div className='mx-auto bg-destructive/10 p-3 rounded-full w-fit'>
                <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
          <CardTitle className="text-2xl mt-4">Access Denied</CardTitle>
          <CardDescription>You do not have the required permissions to view this page. Please contact your administrator if you believe this is an error.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleReturn} className="w-full">
            Return to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
