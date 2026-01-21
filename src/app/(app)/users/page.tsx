'use client';
import { PageHeader } from '@/components/page-header';
import { useUserProfile } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function UsersPage() {
  const { userRole, isLoading } = useUserProfile();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && userRole?.id !== 'admin') {
      router.push('/access-denied');
    }
  }, [isLoading, userRole, router]);

  if (isLoading || userRole?.id !== 'admin') {
    return null;
  }
  
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
