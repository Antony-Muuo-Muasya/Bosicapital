import { PageHeader } from '@/components/page-header';

export default function ReportsPage() {
  return (
    <>
      <PageHeader title="Reports" description="Generate and view reports on lending activities." />
      <div className="p-4 md:p-6">
        <div className="border shadow-sm rounded-lg p-8 mt-4 text-center text-muted-foreground">
          Reporting dashboard will be built here.
        </div>
      </div>
    </>
  );
}
