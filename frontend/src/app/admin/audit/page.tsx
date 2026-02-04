'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApiClient } from '@/lib/admin-api-client';
import { AdminRouteGuard } from '@/components/admin/admin-route-guard';
import { AdminLayout } from '@/components/admin/admin-nav';
import { EmptyState } from '@/components/admin/empty-state';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Search, Download } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminAuditPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionType, setActionType] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', page, search, actionType],
    queryFn: () =>
      adminApiClient.getAuditLogs({
        page,
        limit: 20,
        actionType: actionType !== 'all' ? actionType : undefined,
      }),
  });

  return (
    <AdminRouteGuard>
      <AdminLayout>
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Audit Logs</h1>
          <p className="text-muted-foreground">
            View comprehensive audit trail of all administrative actions
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search audit logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={actionType} onValueChange={setActionType}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="login">Login</SelectItem>
              <SelectItem value="user_suspend">User Suspend</SelectItem>
              <SelectItem value="user_delete">User Delete</SelectItem>
              <SelectItem value="config_change">Config Change</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Audit Logs Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : data?.logs?.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-12 h-12 text-muted-foreground" />}
            title="No audit logs found"
            description="No audit logs match your search criteria"
          />
        ) : (
          <div className="bg-card rounded-lg border overflow-hidden">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Admin</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>IP Address</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {data?.logs?.map((log: any) => (
                  <tr key={log.id}>
                    <td>
                      {format(new Date(log.timestamp || log.created_at), 'MMM d, yyyy HH:mm:ss')}
                    </td>
                    <td className="font-medium">{log.admin_email || log.adminEmail}</td>
                    <td>
                      <Badge className="admin-badge-info">
                        {log.action_type || log.actionType}
                      </Badge>
                    </td>
                    <td>
                      {log.target_entity || log.targetEntity}
                      {(log.target_id || log.targetId) && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({(log.target_id || log.targetId).slice(0, 8)}...)
                        </span>
                      )}
                    </td>
                    <td className="font-mono text-sm">{log.ip_address || log.ipAddress}</td>
                    <td>
                      <Button variant="ghost" size="sm">
                        View
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
              Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, data.pagination.total)} of {data.pagination.total} logs
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
