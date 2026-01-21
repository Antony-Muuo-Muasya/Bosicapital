import { PageHeader } from '@/components/page-header';
import { OverviewCards } from '@/components/dashboard/overview-cards';
import { DueLoansTable } from '@/components/dashboard/due-loans-table';
import { DueDateMonitor } from '@/components/dashboard/due-date-monitor';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Welcome back! Here's a summary of your lending portfolio."
      >
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Loan
        </Button>
      </PageHeader>
      <div className="p-4 md:p-6 grid gap-6">
        <OverviewCards />
        <div className="grid gap-6 xl:grid-cols-5">
          <div className="xl:col-span-3">
            <DueLoansTable />
          </div>
          <div className="xl:col-span-2">
            <DueDateMonitor />
          </div>
        </div>
      </div>
    </>
  );
}
