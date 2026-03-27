'use client';
import { BranchManagement } from '@/components/settings/branch-management';
import { BranchPerformance } from '@/components/settings/branch-performance';
import { PageHeader } from '@/components/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function BranchesPage() {
  return (
    <>
      <PageHeader title="Branch Management" description="Create, view, and manage your organization's branches." />
      <div className="p-4 md:p-6">
        <Tabs defaultValue="performance" className="space-y-4">
          <TabsList>
            <TabsTrigger value="performance">Performance Overview</TabsTrigger>
            <TabsTrigger value="branches">Branch List & Management</TabsTrigger>
          </TabsList>
          
          <TabsContent value="performance" className="space-y-4">
            <BranchPerformance />
          </TabsContent>
          
          <TabsContent value="branches" className="space-y-4">
            <BranchManagement />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
