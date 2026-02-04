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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Shield, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminSecurityPage() {
  const [page, setPage] = useState(1);
  const [severity, setSeverity] = useState('all');

  const { data: events, isLoading: loadingEvents } = useQuery({
    queryKey: ['admin-security-events', page, severity],
    queryFn: () =>
      adminApiClient.getSecurityEvents({
        page,
        limit: 20,
        severity: severity !== 'all' ? severity : undefined,
      }),
  });

  const { data: threats, isLoading: loadingThreats } = useQuery({
    queryKey: ['admin-threat-indicators'],
    queryFn: () => adminApiClient.getThreatIndicators(),
  });

  const { data: failedLogins, isLoading: loadingLogins } = useQuery({
    queryKey: ['admin-failed-logins'],
    queryFn: () => adminApiClient.getFailedLoginAttempts({ limit: 10 }),
  });

  return (
    <AdminRouteGuard>
      <AdminLayout>
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Security Monitoring</h1>
          <p className="text-muted-foreground">
            Monitor security events and respond to threats
          </p>
        </div>

        {/* Threat Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Critical Threats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {loadingThreats
                  ? '...'
                  : Array.isArray(threats?.threats)
                  ? threats.threats.filter((t: any) => t.severity === 'critical').length
                  : 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Failed Login Attempts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">
                {loadingLogins ? '...' : failedLogins?.attempts?.length || failedLogins?.data?.length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Blocked IPs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">0</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex justify-between items-center mb-6">
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Security Events Table */}
        {loadingEvents ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : events?.events?.length === 0 ? (
          <EmptyState
            icon={<Shield className="w-12 h-12 text-muted-foreground" />}
            title="No security events"
            description="No security events match your filter criteria"
          />
        ) : (
          <div className="bg-card rounded-lg border overflow-hidden">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Description</th>
                  <th>IP Address</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events?.events?.map((event: any) => (
                  <tr key={event.id}>
                    <td>
                      {format(new Date(event.timestamp || event.created_at), 'MMM d, yyyy HH:mm')}
                    </td>
                    <td className="font-medium">{event.event_type || event.type}</td>
                    <td>
                      <Badge
                        className={
                          event.severity === 'critical'
                            ? 'admin-badge-error'
                            : event.severity === 'high'
                            ? 'admin-badge-warning'
                            : 'admin-badge-info'
                        }
                      >
                        {event.severity}
                      </Badge>
                    </td>
                    <td>{event.description || event.details}</td>
                    <td className="font-mono text-sm">
                      {event.source_ip || event.ipAddress || 'N/A'}
                    </td>
                    <td>
                      <Badge
                        className={
                          event.resolved
                            ? 'admin-badge-success'
                            : 'admin-badge-warning'
                        }
                      >
                        {event.resolved ? 'Resolved' : 'Active'}
                      </Badge>
                    </td>
                    <td>
                      <Button variant="outline" size="sm">
                        Investigate
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {events?.pagination && events.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-muted-foreground">
              Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, events.pagination.total)} of {events.pagination.total} events
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
                {Array.from({ length: Math.min(5, events.pagination.totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(events.pagination.totalPages - 4, page - 2)) + i;
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
                disabled={page === events.pagination.totalPages}
              >
                Next
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(events.pagination.totalPages)}
                disabled={page === events.pagination.totalPages}
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
