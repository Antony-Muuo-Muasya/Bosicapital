'use client';
import { PageHeader } from '@/components/page-header';

export default function DueTodayPage() {
  return (
    <>
      <PageHeader title="Due Today" description="List of loans with payments due today." />
      <div className="p-4 md:p-6">
        <div className="border shadow-sm rounded-lg p-8 text-center text-muted-foreground">
            Due Today page content will be here.
        </div>
      </div>
    </>
  );
}
