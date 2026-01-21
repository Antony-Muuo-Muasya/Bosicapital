import { PageHeader } from '@/components/page-header';

export default function BranchesPage() {
  return (
    <>
      <PageHeader title="Branch Management" description="Manage your organization's branches." />
      <div className="p-4 md:p-6">
        <div className="border shadow-sm rounded-lg p-8 mt-4 text-center text-muted-foreground">
          Branch management interface will be built here.
        </div>
      </div>
    </>
  );
}
