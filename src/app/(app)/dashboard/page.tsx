'use client';
import { useUserProfile } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { AdminDashboard } from '@/components/dashboard/admin-dashboard';
import { ManagerDashboard } from '@/components/dashboard/manager-dashboard';
import { LoanOfficerDashboard } from '@/components/dashboard/loan-officer-dashboard';

export default function DashboardPage() {
  const { userProfile, isLoading } = useUserProfile();

  if (isLoading || !userProfile) {
    return (
      <div className="flex h-full items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading Dashboard...</p>
      </div>
    );
  }

  switch (userProfile.roleId) {
    case 'admin':
      return <AdminDashboard />;
    case 'manager':
      return <ManagerDashboard />;
    case 'loan_officer':
      return <LoanOfficerDashboard />;
    default:
      // This should be handled by the layout redirect, but as a fallback:
      return (
        <div className="p-6">
            <p>No dashboard available for your role.</p>
        </div>
      );
  }
}
