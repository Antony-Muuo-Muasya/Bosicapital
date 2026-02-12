'use client';
import { PageHeader } from '@/components/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoanProductsManagement } from '@/components/settings/loan-products-management';
import { GeneralSettings } from '@/components/settings/general-settings';


export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Configure your organization, and loan products." />
      <div className="p-4 md:p-6">
        <Tabs defaultValue="products">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="products">Loan Products</TabsTrigger>
            <TabsTrigger value="users">Users & Roles</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>
          <TabsContent value="products">
            <LoanProductsManagement />
          </TabsContent>
          <TabsContent value="users">
          <div className="border shadow-sm rounded-lg p-8 mt-4 text-center text-muted-foreground">
              User and role management will be here.
            </div>
          </TabsContent>
           <TabsContent value="general">
              <GeneralSettings />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
