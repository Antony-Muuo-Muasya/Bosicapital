'use client';
import { PageHeader } from '@/components/page-header';

export default function DefaultersPage() {
  return (
    <>
      <PageHeader title="Defaulters" description="List of loans in default." />
      <div className="p-4 md:p-6">
        <div className="border shadow-sm rounded-lg p-8 text-center text-muted-foreground">
            Defaulters page content will be here.
        </div>
      </div>
    </>
  );
}
