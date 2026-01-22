'use client';
import { BranchManagement } from '@/components/settings/branch-management';
import { PageHeader } from '@/components/page-header';

export default function BranchesPage() {
  return (
    <>
      <PageHeader title="Branch Management" description="Create, view, and manage your organization's branches." />
      <div className="p-4 md:p-6">
        <BranchManagement />
      </div>
    </>
  );
}
