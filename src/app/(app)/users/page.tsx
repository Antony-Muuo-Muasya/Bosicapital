import { PageHeader } from '@/components/page-header';

export default function UsersPage() {
  return (
    <>
      <PageHeader title="User Management" description="Create, edit, and manage user accounts and roles." />
      <div className="p-4 md:p-6">
        <div className="border shadow-sm rounded-lg p-8 mt-4 text-center text-muted-foreground">
          User management interface will be built here.
        </div>
      </div>
    </>
  );
}
