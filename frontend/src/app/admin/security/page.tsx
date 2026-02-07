'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApiClient } from '@/lib/admin-api-client';
import { AdminRouteGuard } from '@/components/admin/admin-route-guard';
import { AdminLayout } from '@/components/admin/admin-nav';
import { AlertTriangle, Shield, XCircle, Search, Filter, Eye } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminSecurityPage() {
  const [page, setPage] = useState(1);
  const [severity, setSeverity] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

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

  const eventsList = events?.events || [];
  const pagination = events?.pagination;

  const criticalThreats = Array.isArray(threats?.threats)
    ? threats.threats.filter((t: any) => t.severity === 'critical').length
    : 0;

  const failedLoginCount = failedLogins?.attempts?.length || failedLogins?.data?.length || 0;

  const filteredEvents = eventsList.filter((event: any) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      event.event_type?.toLowerCase().includes(search) ||
      event.type?.toLowerCase().includes(search) ||
      event.description?.toLowerCase().includes(search) ||
      event.details?.toLowerCase().includes(search)
    );
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'medium':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <AdminRouteGuard>
      <AdminLayout>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 bg-[hsl(142,71%,45%)] rounded-full"></div>
            <div>
              <h1 className="text-2xl font-bold text-[#1A1A1A]">Security Monitoring</h1>
              <p className="text-sm text-[#717171]">Monitor security events and respond to threats</p>
            </div>
          </div>

          {/* Threat Indicators */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-red-500">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-[#717171]">Critical Threats</p>
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-3xl font-bold text-red-600">
                {loadingThreats ? '...' : criticalThreats}
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-yellow-500">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-[#717171]">Failed Login Attempts</p>
                <XCircle className="w-5 h-5 text-yellow-600" />
              </div>
              <p className="text-3xl font-bold text-yellow-600">
                {loadingLogins ? '...' : failedLoginCount}
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-gray-500">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-[#717171]">Blocked IPs</p>
                <Shield className="w-5 h-5 text-gray-600" />
              </div>
              <p className="text-3xl font-bold text-gray-600">0</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-2xl shadow-sm">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#717171]" />
                <input
                  type="text"
                  placeholder="Search security events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#FCFBF7] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(142,71%,45%)] focus:border-transparent"
                />
              </div>

              {/* Severity Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#717171]" />
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="px-4 py-2 bg-[#FCFBF7] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(142,71%,45%)] focus:border-transparent"
                >
                  <option value="all">All Severities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
          </div>

          {/* Security Events Table */}
          {loadingEvents ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(142,71%,45%)]"></div>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
              <Shield className="w-12 h-12 text-[#717171] mx-auto mb-4" />
              <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">No security events</h3>
              <p className="text-sm text-[#717171]">
                {searchTerm ? 'Try adjusting your search terms' : 'No security events match the selected filter'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#FCFBF7] border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
                        Severity
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
                        IP Address
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredEvents.map((event: any) => (
                      <tr key={event.id} className="hover:bg-[#FCFBF7] transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-[#717171]">
                            {format(new Date(event.timestamp || event.created_at), 'MMM d, yyyy HH:mm')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-[#1A1A1A]">
                            {event.event_type || event.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1.5 text-xs font-bold rounded-full border ${getSeverityColor(event.severity)}`}>
                            {event.severity.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-[#717171]">
                            {event.description || event.details}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-mono text-[#717171]">
                            {event.source_ip || event.ipAddress || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1.5 text-xs font-bold rounded-full border ${
                            event.resolved
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                          }`}>
                            {event.resolved ? 'RESOLVED' : 'ACTIVE'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button className="px-4 py-2 bg-[hsl(142,71%,45%)] hover:bg-[hsl(142,71%,40%)] text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            Investigate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm">
              <div className="text-sm text-[#717171]">
                Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, pagination.total)} of {pagination.total} events
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm font-medium text-[#717171] bg-[#FCFBF7] rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  First
                </button>
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm font-medium text-[#717171] bg-[#FCFBF7] rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(pagination.totalPages - 4, page - 2)) + i;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-10 h-10 text-sm font-medium rounded-lg transition-colors ${
                          pageNum === page
                            ? 'bg-[hsl(142,71%,45%)] text-white'
                            : 'bg-[#FCFBF7] text-[#717171] hover:bg-gray-200'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === pagination.totalPages}
                  className="px-3 py-1.5 text-sm font-medium text-[#717171] bg-[#FCFBF7] rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
                <button
                  onClick={() => setPage(pagination.totalPages)}
                  disabled={page === pagination.totalPages}
                  className="px-3 py-1.5 text-sm font-medium text-[#717171] bg-[#FCFBF7] rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </div>
      </AdminLayout>
    </AdminRouteGuard>
  );
}
