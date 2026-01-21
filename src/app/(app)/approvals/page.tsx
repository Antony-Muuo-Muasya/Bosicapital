import { PageHeader } from '@/components/page-header';

export default function ApprovalsPage() {
  return (
    <>
      <PageHeader title="Approvals" description="Review and approve or reject loan applications." />
      <div className="p-4 md:p-6">
        <div className="border shadow-sm rounded-lg p-8 mt-4 text-center text-muted-foreground">
          Loan approval interface will be built here.
        </div>
      </div>
    </>
  );
}
