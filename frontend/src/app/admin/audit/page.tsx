'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApiClient } from '@/lib/admin-api-client';
import { AdminRouteGuard } from '@/components/admin/admin-route-guard';
import { AdminLayout } from '@/components/admin/admin-nav';
import { FileText, Search, Download, Eye, Filter } from 'lucide-react';
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

  const logs = data?.logs || [];
  const pagination = data?.pagination;

  const filteredLogs = logs.filter((log: any) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      log.admin_email?.toLowerCase().includes(searchLower) ||
      log.adminEmail?.toLowerCase().includes(searchLower) ||
      log.action_type?.toLowerCase().includes(searchLower) ||
      log.actionType?.toLowerCase().includes(searchLower) ||
      log.target_entity?.toLowerCase().includes(searchLower) ||
      log.targetEntity?.toLowerCase().includes(searchLower)
    );
  });

  const getActionColor = (action: string) => {
    if (action.includes('delete') || action.includes('suspend')) {
      return 'bg-red-50 text-red-700 border-red-200';
    } else if (action.includes('create') || action.includes('approve')) {
      return 'bg-green-50 text-green-700 border-green-200';
    } else if (action.includes('update') || action.includes('modify')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  return (
    <AdminRouteGuard>
      <AdminLayout>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-8 bg-[hsl(142,71%,45%)] rounded-full"></div>
              <div>
                <h1 className="text-2xl font-bold text-[#1A1A1A]">Audit Logs</h1>
                <p className="text-sm text-[#717171]">View comprehensive audit trail of all administrative actions</p>
              </div>
            </div>
            <button className="px-4 py-2 bg-[hsl(142,71%,45%)] hover:bg-[hsl(142,71%,40%)] text-white font-semibold rounded-lg transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export Logs
            </button>
          </div>

          {/* Statistics */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-[#717171]">Total Logs</p>
                <FileText className="w-5 h-5 text-[#717171]" />
              </div>
              <p className="text-3xl font-bold text-[#1A1A1A]">{pagination?.total || 0}</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-[#717171]">Today</p>
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-600">
                {logs.filter((l: any) => {
                  const logDate = new Date(l.timestamp || l.created_at);
                  const today = new Date();
                  return logDate.toDateString() === today.toDateString();
                }).length}
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-green-500">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-[#717171]">This Week</p>
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-600">
                {logs.filter((l: any) => {
                  const logDate = new Date(l.timestamp || l.created_at);
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return logDate >= weekAgo;
                }).length}
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-purple-500">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-[#717171]">This Month</p>
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-purple-600">
                {logs.filter((l: any) => {
                  const logDate = new Date(l.timestamp || l.created_at);
                  const monthAgo = new Date();
                  monthAgo.setMonth(monthAgo.getMonth() - 1);
                  return logDate >= monthAgo;
                }).length}
              </p>
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
                  placeholder="Search audit logs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#FCFBF7] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(142,71%,45%)] focus:border-transparent"
                />
              </div>

              {/* Action Type Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#717171]" />
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="px-4 py-2 bg-[#FCFBF7] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(142,71%,45%)] focus:border-transparent"
                >
                  <option value="all">All Actions</option>
                  <option value="login">Login</option>
                  <option value="user_suspend">User Suspend</option>
                  <option value="user_delete">User Delete</option>
                  <option value="config_change">Config Change</option>
                </select>
              </div>
            </div>
          </div>

          {/* Audit Logs Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(142,71%,45%)]"></div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
              <FileText className="w-12 h-12 text-[#717171] mx-auto mb-4" />
              <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">No audit logs found</h3>
              <p className="text-sm text-[#717171]">
                {search ? 'Try adjusting your search terms' : 'No audit logs match your search criteria'}
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
                        Admin
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
                        Target
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
                        IP Address
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-[#FCFBF7] transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-[#717171]">
                            {format(new Date(log.timestamp || log.created_at), 'MMM d, yyyy HH:mm:ss')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-[#1A1A1A]">
                            {log.admin_email || log.adminEmail}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1.5 text-xs font-bold rounded-full border ${getActionColor(log.action_type || log.actionType)}`}>
                            {(log.action_type || log.actionType).toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-[#717171]">
                            {log.target_entity || log.targetEntity}
                            {(log.target_id || log.targetId) && (
                              <span className="text-xs text-[#717171] ml-1">
                                ({(log.target_id || log.targetId).slice(0, 8)}...)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-mono text-[#717171]">
                            {log.ip_address || log.ipAddress}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button className="px-3 py-1.5 bg-[#FCFBF7] hover:bg-gray-200 text-[#717171] text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            View
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
                Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, pagination.total)} of {pagination.total} logs
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
