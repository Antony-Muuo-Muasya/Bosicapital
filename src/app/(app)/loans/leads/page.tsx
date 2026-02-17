'use client';
import { PageHeader } from '@/components/page-header';

export default function LeadsPage() {
  return (
    <>
      <PageHeader title="Leads" description="List of potential borrowers." />
      <div className="p-4 md:p-6">
        <div className="border shadow-sm rounded-lg p-8 text-center text-muted-foreground">
            Leads page content will be here.
        </div>
      </div>
    </>
  );
}
