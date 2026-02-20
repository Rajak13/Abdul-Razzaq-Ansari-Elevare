'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { adminApiClient } from '@/lib/admin-api-client';
import { AdminRouteGuard } from '@/components/admin/admin-route-guard';
import { AdminLayout } from '@/components/admin/admin-nav';
import { Shield, AlertTriangle, Search, Filter, Eye, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminModerationPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-abuse-reports', page, statusFilter],
    queryFn: () =>
      adminApiClient.getAbuseReports({
        page,
        limit: 20,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
  });

  const reports = data?.reports || [];
  const pagination = data?.pagination || { total: 0, totalPages: 0, page: 1, limit: 20 };

  const filteredReports = reports.filter((report: any) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      report.reason?.toLowerCase().includes(search) ||
      report.content_type?.toLowerCase().includes(search) ||
      report.contentType?.toLowerCase().includes(search)
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'reviewed':
      case 'under_review':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'resolved':
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'reviewed':
      case 'under_review':
        return <Eye className="w-4 h-4" />;
      case 'resolved':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <AdminRouteGuard requiredRole="moderator">
      <AdminLayout>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 bg-[hsl(142,71%,45%)] rounded-full"></div>
            <div>
              <h1 className="text-2xl font-bold text-[#1A1A1A]">Content Moderation</h1>
              <p className="text-sm text-[#717171]">Review abuse reports and manage content violations</p>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-[#717171]">Total Reports</p>
                <Shield className="w-5 h-5 text-[#717171]" />
              </div>
              <p className="text-3xl font-bold text-[#1A1A1A]">{pagination?.total || 0}</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-yellow-500">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-[#717171]">Pending</p>
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <p className="text-3xl font-bold text-yellow-600">
                {reports.filter((r: any) => r.status === 'pending').length}
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-[#717171]">Under Review</p>
                <Eye className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-600">
                {reports.filter((r: any) => r.status === 'reviewed' || r.status === 'under_review').length}
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-green-500">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-[#717171]">Resolved</p>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-600">
                {reports.filter((r: any) => r.status === 'resolved').length}
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
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#FCFBF7] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(142,71%,45%)] focus:border-transparent"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#717171]" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 bg-[#FCFBF7] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(142,71%,45%)] focus:border-transparent"
                >
                  <option value="all">All Reports</option>
                  <option value="pending">Pending</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>
          </div>

          {/* Reports Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(142,71%,45%)]"></div>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
              <Shield className="w-12 h-12 text-[#717171] mx-auto mb-4" />
              <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">No reports found</h3>
              <p className="text-sm text-[#717171]">
                {searchTerm ? 'Try adjusting your search terms' : 'No reports match the selected filter'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#FCFBF7] border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
                        Report ID
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
                        Content Type
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
                        Reason
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
                        Reported
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
                    {filteredReports.map((report: any) => (
                      <tr key={report.id} className="hover:bg-[#FCFBF7] transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-mono text-[#717171]">
                            {report.id.slice(0, 8)}...
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-[#1A1A1A] capitalize">
                            {report.content_type || report.contentType}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-[#717171]">{report.reason}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-[#717171]">
                            {format(new Date(report.created_at || report.createdAt), 'MMM d, yyyy HH:mm')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1.5 text-xs font-bold rounded-full border flex items-center gap-1.5 w-fit ${getStatusColor(report.status)}`}>
                            {getStatusIcon(report.status)}
                            {report.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button 
                            onClick={() => router.push(`/admin/moderation/reports/${report.id}`)}
                            className="px-4 py-2 bg-[hsl(142,71%,45%)] hover:bg-[hsl(142,71%,40%)] text-white text-sm font-semibold rounded-lg transition-colors"
                          >
                            Review
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
                Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, pagination.total)} of {pagination.total} reports
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
