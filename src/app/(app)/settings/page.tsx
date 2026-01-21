'use client';
import { PageHeader } from '@/components/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserProfile } from '@/firebase';
import { LoanProductsManagement } from '@/components/settings/loan-products-management';


export default function SettingsPage() {
  const { userRole } = useUserProfile();

  // Admins are the only ones who should see this page.
  // The navigation is already hidden, but this prevents direct access.
  if (userRole?.id !== 'admin') {
    // Or redirect to an access denied page
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
