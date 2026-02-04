'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApiClient } from '@/lib/admin-api-client';
import { AdminRouteGuard } from '@/components/admin/admin-route-guard';
import { AdminLayout } from '@/components/admin/admin-nav';
import { EmptyState } from '@/components/admin/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Shield, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminModerationPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('pending');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-abuse-reports', page, statusFilter],
    queryFn: () =>
      adminApiClient.getAbuseReports({
        page,
        limit: 20,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
  });

  return (
    <AdminRouteGuard requiredRole="moderator">
      <AdminLayout>
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Content Moderation</h1>
          <p className="text-muted-foreground">
            Review abuse reports and manage content violations
          </p>
        </div>

        {/* Filters */}
        <div className="flex justify-between items-center mb-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reports</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reports Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : data?.reports?.length === 0 ? (
          <EmptyState
            icon={<Shield className="w-12 h-12 text-muted-foreground" />}
            title="No reports found"
            description="No abuse reports match your filter criteria"
          />
        ) : (
          <div className="bg-card rounded-lg border overflow-hidden">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Report ID</th>
                  <th>Content Type</th>
                  <th>Reason</th>
                  <th>Reported</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.reports?.map((report: any) => (
                  <tr key={report.id}>
                    <td className="font-mono text-sm">
                      {report.id.slice(0, 8)}...
                    </td>
                    <td className="capitalize">{report.content_type || report.contentType}</td>
                    <td>{report.reason}</td>
                    <td>
                      {format(new Date(report.created_at || report.createdAt), 'MMM d, yyyy HH:mm')}
                    </td>
                    <td>
                      <Badge
                        className={
                          report.status === 'pending'
                            ? 'admin-badge-warning'
                            : report.status === 'reviewed' || report.status === 'under_review'
                            ? 'admin-badge-info'
                            : 'admin-badge-success'
                        }
                      >
                        {report.status}
                      </Badge>
                    </td>
                    <td>
                      <Button variant="outline" size="sm">
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-muted-foreground">
              Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, data.pagination.total)} of {data.pagination.total} reports
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(1)}
                disabled={page === 1}
              >
                First
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, data.pagination.totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(data.pagination.totalPages - 4, page - 2)) + i;
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                      className="w-10"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === data.pagination.totalPages}
              >
                Next
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(data.pagination.totalPages)}
                disabled={page === data.pagination.totalPages}
              >
                Last
              </Button>
            </div>
          </div>
        )}
      </AdminLayout>
    </AdminRouteGuard>
  );
}
