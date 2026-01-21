'use client';
import { PageHeader } from '@/components/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserProfile } from '@/firebase';
import { LoanProductsManagement } from '@/components/settings/loan-products-management';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';


export default function SettingsPage() {
  const { userRole, isLoading } = useUserProfile();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && userRole?.id !== 'admin') {
      router.push('/access-denied');
    }
  }, [isLoading, userRole, router]);

  // Render nothing or a loader while checking permissions
  if (isLoading || userRole?.id !== 'admin') {
    return null;
  }

  return (
    <>
      <PageHeader title="Settings" description="Configure your organization, branches, and loan products." />
      <div className="p-4 md:p-6">
        <Tabs defaultValue="products">
          <TabsList className="grid w-full grid-cols-4 max-w-lg">
            <TabsTrigger value="products">Loan Products</TabsTrigger>
            <TabsTrigger value="branches">Branches</TabsTrigger>
            <TabsTrigger value="users">Users & Roles</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>
          <TabsContent value="products">
            <LoanProductsManagement />
          </TabsContent>
          <TabsContent value="branches">
          <div className="border shadow-sm rounded-lg p-8 mt-4 text-center text-muted-foreground">
              Branch management will be here.
            </div>
          </TabsContent>
          <TabsContent value="users">
          <div className="border shadow-sm rounded-lg p-8 mt-4 text-center text-muted-foreground">
              User and role management will be here.
            </div>
          </TabsContent>
           <TabsContent value="general">
          <div className="border shadow-sm rounded-lg p-8 mt-4 text-center text-muted-foreground">
              General organization settings will be here.
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
