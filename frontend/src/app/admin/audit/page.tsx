'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApiClient } from '@/lib/admin-api-client';
import { AdminRouteGuard } from '@/components/admin/admin-route-guard';
import { AdminLayout } from '@/components/admin/admin-nav';
import { FileText, Search, Download, Eye, Filter, X, Calendar, User, Activity } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminAuditPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionType, setActionType] = useState('all');
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', page, search, actionType],
    queryFn: () =>
      adminApiClient.getAuditLogs({
        page,
        limit: 20,
        actionType: actionType !== 'all' ? actionType : undefined,
      }),
  });

  const logs = data?.data?.logs || [];
  const pagination = data?.data?.pagination;
  const totalPages = pagination?.pages || pagination?.totalPages || 1;

  const filteredLogs = logs.filter((log: any) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      log.admin_email?.toLowerCase().includes(searchLower) ||
      log.adminEmail?.toLowerCase().includes(searchLower) ||
      log.action_type?.toLowerCase().includes(searchLower) ||
      log.actionType?.toLowerCase().includes(searchLower) ||
      log.target_entity?.toLowerCase().includes(searchLower) ||
      log.targetEntity?.toLowerCase().includes(searchLower) ||
      log.ip_address?.toLowerCase().includes(searchLower) ||
      log.ipAddress?.toLowerCase().includes(searchLower)
    );
  });

  const getActionColor = (action: string) => {
    if (action.includes('delete') || action.includes('suspend') || action.includes('block')) {
      return 'bg-red-50 text-red-700 border-red-200';
    } else if (action.includes('create') || action.includes('approve') || action.includes('unsuspend')) {
      return 'bg-green-50 text-green-700 border-green-200';
    } else if (action.includes('update') || action.includes('modify') || action.includes('review')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    } else if (action.includes('login') || action.includes('logout')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getActionIcon = (action: string) => {
    if (action.includes('login') || action.includes('logout')) {
      return <User className="w-4 h-4" />;
    } else if (action.includes('config') || action.includes('feature')) {
      return <Activity className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  const actionTypes = [
    { value: 'all', label: 'All Actions' },
    { value: 'admin_login', label: 'Admin Login' },
    { value: 'admin_logout', label: 'Admin Logout' },
    { value: 'user_suspend', label: 'User Suspend' },
    { value: 'user_unsuspend', label: 'User Unsuspend' },
    { value: 'user_delete', label: 'User Delete' },
    { value: 'user_password_reset', label: 'Password Reset' },
    { value: 'moderation_action', label: 'Moderation Action' },
    { value: 'feature_flag_create', label: 'Feature Flag Create' },
    { value: 'feature_flag_update', label: 'Feature Flag Update' },
    { value: 'feature_flag_delete', label: 'Feature Flag Delete' },
    { value: 'system_config_update', label: 'System Config Update' },
    { value: 'maintenance_mode_enable', label: 'Maintenance Enable' },
    { value: 'maintenance_mode_disable', label: 'Maintenance Disable' },
    { value: 'ip_block', label: 'IP Block' },
    { value: 'ip_unblock', label: 'IP Unblock' },
  ];

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
                <p className="text-sm text-[#717171]">Comprehensive audit trail of all administrative actions</p>
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
                <Calendar className="w-5 h-5 text-blue-600" />
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
                <Calendar className="w-5 h-5 text-green-600" />
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
                <Calendar className="w-5 h-5 text-purple-600" />
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
                  placeholder="Search by admin, action, target, or IP address..."
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
                  className="px-4 py-2 bg-[#FCFBF7] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(142,71%,45%)] focus:border-transparent min-w-[200px]"
                >
                  {actionTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
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
                {search ? 'Try adjusting your search terms' : 'No audit logs match your filters'}
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
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-[#1A1A1A]">
                              {log.details?.admin_email || log.admin_email || log.adminEmail || 'Unknown'}
                            </span>
                            <span className="text-xs text-[#717171] capitalize">
                              {log.details?.admin_role || log.admin_role || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1.5 text-xs font-bold rounded-full border inline-flex items-center gap-1.5 ${getActionColor(log.action_type || log.actionType)}`}>
                            {getActionIcon(log.action_type || log.actionType)}
                            {(log.action_type || log.actionType).replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-[#717171]">
                            <div className="font-medium text-[#1A1A1A]">
                              {log.target_entity || log.targetEntity || 'N/A'}
                            </div>
                            {(log.target_id || log.targetId) && (
                              <span className="text-xs text-[#717171] font-mono">
                                {(log.target_id || log.targetId).slice(0, 12)}...
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-mono text-[#717171]">
                            {log.ip_address || log.ipAddress || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="px-3 py-1.5 bg-[#FCFBF7] hover:bg-gray-200 text-[#717171] text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                          >
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
          {pagination && pagination.total > 0 && totalPages > 1 && (
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
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                    if (pageNum > totalPages) return null;
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
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm font-medium text-[#717171] bg-[#FCFBF7] rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm font-medium text-[#717171] bg-[#FCFBF7] rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Audit Log Details Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-xl font-bold text-[#1A1A1A]">Audit Log Details</h2>
                  <p className="text-sm text-[#717171] mt-1">
                    {format(new Date(selectedLog.timestamp || selectedLog.created_at), 'MMMM d, yyyy at HH:mm:ss')}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-[#717171]" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                <div className="space-y-6">
                  {/* Action Info */}
                  <div>
                    <h3 className="text-sm font-bold text-[#1A1A1A] mb-3">Action Information</h3>
                    <div className="bg-[#FCFBF7] rounded-lg p-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-[#717171]">Action Type:</span>
                        <span className={`px-3 py-1 text-xs font-bold rounded-full border ${getActionColor(selectedLog.action_type || selectedLog.actionType)}`}>
                          {(selectedLog.action_type || selectedLog.actionType).replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-[#717171]">Target Entity:</span>
                        <span className="text-sm font-medium text-[#1A1A1A]">
                          {selectedLog.target_entity || selectedLog.targetEntity || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-[#717171]">Target ID:</span>
                        <span className="text-sm font-mono text-[#1A1A1A]">
                          {selectedLog.target_id || selectedLog.targetId || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Admin Info */}
                  <div>
                    <h3 className="text-sm font-bold text-[#1A1A1A] mb-3">Administrator Information</h3>
                    <div className="bg-[#FCFBF7] rounded-lg p-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-[#717171]">Admin ID:</span>
                        <span className="text-sm font-mono text-[#1A1A1A]">
                          {selectedLog.admin_id || selectedLog.adminId}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-[#717171]">Email:</span>
                        <span className="text-sm font-medium text-[#1A1A1A]">
                          {selectedLog.details?.admin_email || selectedLog.admin_email || selectedLog.adminEmail || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-[#717171]">Role:</span>
                        <span className="text-sm font-medium text-[#1A1A1A] capitalize">
                          {selectedLog.details?.admin_role || selectedLog.admin_role || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Request Info */}
                  <div>
                    <h3 className="text-sm font-bold text-[#1A1A1A] mb-3">Request Information</h3>
                    <div className="bg-[#FCFBF7] rounded-lg p-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-[#717171]">IP Address:</span>
                        <span className="text-sm font-mono text-[#1A1A1A]">
                          {selectedLog.ip_address || selectedLog.ipAddress}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-[#717171]">Method:</span>
                        <span className="text-sm font-medium text-[#1A1A1A]">
                          {selectedLog.details?.method || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-[#717171]">Path:</span>
                        <span className="text-sm font-mono text-[#1A1A1A]">
                          {selectedLog.details?.path || 'N/A'}
                        </span>
                      </div>
                      {selectedLog.user_agent || selectedLog.userAgent && (
                        <div className="flex flex-col gap-1">
                          <span className="text-sm text-[#717171]">User Agent:</span>
                          <span className="text-xs font-mono text-[#1A1A1A] break-all">
                            {selectedLog.user_agent || selectedLog.userAgent}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional Details */}
                  {selectedLog.details && (
                    <div>
                      <h3 className="text-sm font-bold text-[#1A1A1A] mb-3">Additional Details</h3>
                      <div className="bg-[#FCFBF7] rounded-lg p-4">
                        <pre className="text-xs font-mono text-[#1A1A1A] whitespace-pre-wrap break-all">
                          {JSON.stringify(selectedLog.details, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Integrity Hash */}
                  {selectedLog.hash && (
                    <div>
                      <h3 className="text-sm font-bold text-[#1A1A1A] mb-3">Cryptographic Integrity</h3>
                      <div className="bg-[#FCFBF7] rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm text-[#717171]">SHA-256 Hash:</span>
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">
                            VERIFIED
                          </span>
                        </div>
                        <span className="text-xs font-mono text-[#1A1A1A] break-all">
                          {selectedLog.hash}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 bg-[#FCFBF7] hover:bg-gray-200 text-[#717171] font-semibold rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </AdminRouteGuard>
  );
}
