'use client';
import { useUserProfile } from '@/firebase';
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';
import { AdminDashboard } from '@/components/dashboard/admin-dashboard';
import { ManagerDashboard } from '@/components/dashboard/manager-dashboard';
import { LoanOfficerDashboard } from '@/components/dashboard/loan-officer-dashboard';

export default function DashboardPage() {
  const { userProfile, isLoading } = useUserProfile();

  // Show skeleton while loading (profile is coming from Firestore)
  if (isLoading || !userProfile) {
    return <DashboardSkeleton />;
  }

  switch (userProfile.roleId) {
    case 'superadmin':
    case 'admin':
      return <AdminDashboard />;
    case 'manager':
      return <ManagerDashboard />;
    case 'loan_officer':
      return <LoanOfficerDashboard />;
    default:
      return (
        <div className="p-6">
          <p>No dashboard available for your role.</p>
        </div>
      );
  }
}
