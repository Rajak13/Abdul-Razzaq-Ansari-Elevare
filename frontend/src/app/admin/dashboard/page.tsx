'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApiClient } from '@/lib/admin-api-client';
import { AdminRouteGuard } from '@/components/admin/admin-route-guard';
import { AdminLayout } from '@/components/admin/admin-nav';
import { CleanAdminDashboard } from '@/components/admin/clean-admin-dashboard';

export default function AdminDashboardPage() {
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['admin-overview-metrics'],
    queryFn: () => adminApiClient.getOverviewMetrics(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: recentUsers } = useQuery({
    queryKey: ['admin-recent-users'],
    queryFn: () => adminApiClient.getUsers({ limit: 8 }),
  });

  const { data: recentActivity } = useQuery({
    queryKey: ['admin-recent-activity'],
    queryFn: () => adminApiClient.getAuditLogs({ limit: 4 }),
  });

  const usersList = recentUsers?.data?.users || recentUsers?.users || (Array.isArray(recentUsers) ? recentUsers : []);
  const activityList = recentActivity?.data?.logs || recentActivity?.logs || (Array.isArray(recentActivity) ? recentActivity : []);

  return (
    <AdminRouteGuard>
      <AdminLayout>
        <CleanAdminDashboard
          metrics={metrics}
          recentUsers={usersList}
          recentActivity={activityList}
          isLoading={metricsLoading}
        />
      </AdminLayout>
    </AdminRouteGuard>
  );
}
