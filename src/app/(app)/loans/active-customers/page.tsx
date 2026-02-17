'use client';
import { PageHeader } from '@/components/page-header';

export default function ActiveCustomersPage() {
  return (
    <>
      <PageHeader title="Active Customers" description="List of customers with active loans." />
      <div className="p-4 md:p-6">
        <div className="border shadow-sm rounded-lg p-8 text-center text-muted-foreground">
            Active Customers page content will be here.
        </div>
      </div>
    </>
  );
}
