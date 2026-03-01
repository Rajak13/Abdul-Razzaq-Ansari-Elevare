'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApiClient } from '@/lib/admin-api-client';
import { AdminRouteGuard } from '@/components/admin/admin-route-guard';
import { AdminLayout } from '@/components/admin/admin-nav';
import { AlertTriangle, Shield, XCircle, Search, Filter, Eye, CheckCircle, Ban, Unlock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function AdminSecurityPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [severity, setSeverity] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'events' | 'blocked-ips'>('events');
  const [blockIpModal, setBlockIpModal] = useState(false);
  const [detailsModal, setDetailsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [blockIpAddress, setBlockIpAddress] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blockDuration, setBlockDuration] = useState(24);

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

  const { data: blockedIps, isLoading: loadingBlockedIps, error: blockedIpsError } = useQuery({
    queryKey: ['admin-blocked-ips'],
    queryFn: async () => {
      try {
        const result = await adminApiClient.getBlockedIps({ limit: 50 });
        console.log('Blocked IPs API response:', result);
        return result;
      } catch (error) {
        console.error('Failed to fetch blocked IPs:', error);
        throw error;
      }
    },
    retry: false,
  });

  const { data: securityStats } = useQuery({
    queryKey: ['admin-security-stats'],
    queryFn: () => adminApiClient.getSecurityStatistics(),
  });


  const resolveEventMutation = useMutation({
    mutationFn: ({ eventId, notes }: { eventId: string; notes?: string }) =>
      adminApiClient.resolveSecurityEvent(eventId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-security-events'] });
      toast.success('Security event resolved');
    },
    onError: () => {
      toast.error('Failed to resolve security event');
    },
  });

  const blockIpMutation = useMutation({
    mutationFn: () =>
      adminApiClient.blockIpAddress(blockIpAddress, blockReason, blockDuration),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blocked-ips'] });
      queryClient.invalidateQueries({ queryKey: ['admin-security-stats'] });
      toast.success('IP address blocked successfully');
      setBlockIpModal(false);
      setBlockIpAddress('');
      setBlockReason('');
      setBlockDuration(24);
    },
    onError: () => {
      toast.error('Failed to block IP address');
    },
  });

  const unblockIpMutation = useMutation({
    mutationFn: ({ ipAddress, reason }: { ipAddress: string; reason: string }) =>
      adminApiClient.unblockIpAddress(ipAddress, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blocked-ips'] });
      queryClient.invalidateQueries({ queryKey: ['admin-security-stats'] });
      toast.success('IP address unblocked successfully');
    },
    onError: () => {
      toast.error('Failed to unblock IP address');
    },
  });

  const eventsList = events?.data?.events || events?.events || [];
  const pagination = events?.data?.pagination || events?.pagination;
  
  // Safely extract blocked IPs list with multiple fallbacks
  let blockedIpsList = [];
  if (blockedIps) {
    if (Array.isArray(blockedIps.data?.blocked_ips)) {
      blockedIpsList = blockedIps.data.blocked_ips;
    } else if (Array.isArray(blockedIps.blocked_ips)) {
      blockedIpsList = blockedIps.blocked_ips;
    } else if (Array.isArray(blockedIps.data)) {
      blockedIpsList = blockedIps.data;
    } else if (Array.isArray(blockedIps)) {
      blockedIpsList = blockedIps;
    }
  }

  console.log('Blocked IPs data:', { 
    raw: blockedIps, 
    extracted: blockedIpsList, 
    isArray: Array.isArray(blockedIpsList),
    length: blockedIpsList.length 
  });

  const criticalThreats = Array.isArray(threats?.threats)
    ? threats.threats.filter((t: any) => t.severity === 'critical').length
    : 0;

  // Count failed login events from security_events table (last 24 hours)
  const recentFailedLogins = eventsList.filter((event: any) => {
    if (event.event_type !== 'failed_login' && event.type !== 'failed_login') return false;
    const eventDate = new Date(event.created_at || event.timestamp);
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    return eventDate > oneDayAgo;
  });
  
  const failedLoginCount = recentFailedLogins.length;
  const blockedIpsCount = securityStats?.blocked_ips || blockedIpsList.length || 0;

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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-8 bg-[hsl(142,71%,45%)] rounded-full"></div>
              <div>
                <h1 className="text-2xl font-bold text-[#1A1A1A]">Security Monitoring</h1>
                <p className="text-sm text-[#717171]">Monitor security events and respond to threats</p>
              </div>
            </div>
            <button
              onClick={() => setBlockIpModal(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <Ban className="w-4 h-4" />
              Block IP Address
            </button>
          </div>

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
              <p className="text-3xl font-bold text-gray-600">{blockedIpsCount}</p>
            </div>
          </div>


          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('events')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                  activeTab === 'events'
                    ? 'text-[hsl(142,71%,45%)] border-b-2 border-[hsl(142,71%,45%)]'
                    : 'text-[#717171] hover:text-[#1A1A1A]'
                }`}
              >
                Security Events
              </button>
              <button
                onClick={() => setActiveTab('blocked-ips')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                  activeTab === 'blocked-ips'
                    ? 'text-[hsl(142,71%,45%)] border-b-2 border-[hsl(142,71%,45%)]'
                    : 'text-[#717171] hover:text-[#1A1A1A]'
                }`}
              >
                Blocked IP Addresses
              </button>
            </div>

            {activeTab === 'events' && (
              <>
                <div className="p-4 border-b border-gray-200">
                  <div className="flex flex-col md:flex-row gap-4">
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

                {loadingEvents ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(142,71%,45%)]"></div>
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <div className="p-12 text-center">
                    <Shield className="w-12 h-12 text-[#717171] mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">No security events</h3>
                    <p className="text-sm text-[#717171]">
                      {searchTerm ? 'Try adjusting your search terms' : 'No security events match the selected filter'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#FCFBF7] border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">Timestamp</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">Type</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">Severity</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">IP Address</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">Actions</th>
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
                            <td className="px-6 py-4">
                              <span className="text-sm font-medium text-[#1A1A1A]">
                                {event.event_type || event.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1.5 text-xs font-bold rounded-full border ${getSeverityColor(event.severity)}`}>
                                {event.severity.toUpperCase()}
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
                              <div className="flex items-center gap-2">
                                {!event.resolved && (
                                  <button
                                    onClick={() => resolveEventMutation.mutate({ eventId: event.id })}
                                    disabled={resolveEventMutation.isPending}
                                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                    Resolve
                                  </button>
                                )}
                                <button 
                                  onClick={() => {
                                    setSelectedEvent(event);
                                    setDetailsModal(true);
                                  }}
                                  className="px-3 py-1.5 bg-[hsl(142,71%,45%)] hover:bg-[hsl(142,71%,40%)] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3" />
                                  Details
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t border-gray-200">
                    <div className="text-sm text-[#717171]">
                      Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, pagination.total)} of {pagination.total} events
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="px-3 py-1.5 text-sm font-medium text-[#717171] bg-[#FCFBF7] rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-[#717171]">
                        Page {page} of {pagination.totalPages}
                      </span>
                      <button
                        onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                        disabled={page === pagination.totalPages}
                        className="px-3 py-1.5 text-sm font-medium text-[#717171] bg-[#FCFBF7] rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}


            {activeTab === 'blocked-ips' && (
              <div className="p-6">
                {blockedIpsError && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm font-semibold text-red-900">Error loading blocked IPs</p>
                    <p className="text-sm text-red-700 mt-1">{String(blockedIpsError)}</p>
                  </div>
                )}
                {loadingBlockedIps ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(142,71%,45%)]"></div>
                  </div>
                ) : blockedIpsList.length === 0 ? (
                  <div className="text-center py-12">
                    <Shield className="w-12 h-12 text-[#717171] mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">No blocked IP addresses</h3>
                    <p className="text-sm text-[#717171]">IP addresses blocked for security reasons will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {blockedIpsList.map((blocked: any) => (
                      <div
                        key={blocked.id}
                        className="flex items-center justify-between p-4 bg-[#FCFBF7] rounded-xl hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-lg font-mono font-bold text-[#1A1A1A]">
                              {blocked.ip_address || blocked.ipAddress}
                            </span>
                            <span className="px-2 py-1 text-xs font-bold bg-red-100 text-red-700 rounded-full">
                              BLOCKED
                            </span>
                          </div>
                          <p className="text-sm text-[#717171] mb-1">
                            <span className="font-semibold">Reason:</span> {blocked.reason}
                          </p>
                          <p className="text-xs text-[#717171]">
                            Blocked on {format(new Date(blocked.blocked_at || blocked.createdAt), 'MMM d, yyyy HH:mm')}
                            {blocked.expires_at && ` • Expires ${format(new Date(blocked.expires_at), 'MMM d, yyyy HH:mm')}`}
                          </p>
                        </div>
                        <button
                          onClick={() => unblockIpMutation.mutate({
                            ipAddress: blocked.ip_address || blocked.ipAddress,
                            reason: 'Administrative action'
                          })}
                          disabled={unblockIpMutation.isPending}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                          <Unlock className="w-4 h-4" />
                          Unblock
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {blockIpModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-[#1A1A1A]">Block IP Address</h2>
                <p className="text-sm text-[#717171] mt-1">Prevent access from a specific IP address</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">IP Address</label>
                  <input
                    type="text"
                    value={blockIpAddress}
                    onChange={(e) => setBlockIpAddress(e.target.value)}
                    placeholder="192.168.1.1"
                    className="w-full px-4 py-2.5 bg-[#FCFBF7] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(142,71%,45%)] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">Reason</label>
                  <textarea
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="Describe why this IP should be blocked..."
                    rows={3}
                    className="w-full px-4 py-2.5 bg-[#FCFBF7] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(142,71%,45%)] focus:border-transparent resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">Duration (hours)</label>
                  <input
                    type="number"
                    value={blockDuration}
                    onChange={(e) => setBlockDuration(Number(e.target.value))}
                    min={1}
                    className="w-full px-4 py-2.5 bg-[#FCFBF7] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(142,71%,45%)] focus:border-transparent"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex items-center gap-3">
                <button
                  onClick={() => setBlockIpModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-[#1A1A1A] font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => blockIpMutation.mutate()}
                  disabled={!blockIpAddress || !blockReason || blockIpMutation.isPending}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {blockIpMutation.isPending ? 'Blocking...' : 'Block IP'}
                </button>
              </div>
            </div>
          </div>
        )}

        {detailsModal && selectedEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
                <h2 className="text-xl font-bold text-[#1A1A1A]">Security Event Details</h2>
                <p className="text-sm text-[#717171] mt-1">
                  {format(new Date(selectedEvent.timestamp || selectedEvent.created_at), 'MMMM d, yyyy HH:mm:ss')}
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#717171] uppercase mb-1">Event Type</label>
                    <p className="text-sm font-medium text-[#1A1A1A]">{selectedEvent.event_type || selectedEvent.type}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#717171] uppercase mb-1">Severity</label>
                    <span className={`inline-block px-3 py-1.5 text-xs font-bold rounded-full border ${getSeverityColor(selectedEvent.severity)}`}>
                      {selectedEvent.severity.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#717171] uppercase mb-1">IP Address</label>
                    <p className="text-sm font-mono text-[#1A1A1A]">{selectedEvent.source_ip || selectedEvent.ipAddress || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#717171] uppercase mb-1">Status</label>
                    <span className={`inline-block px-3 py-1.5 text-xs font-bold rounded-full border ${
                      selectedEvent.resolved
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                    }`}>
                      {selectedEvent.resolved ? 'RESOLVED' : 'ACTIVE'}
                    </span>
                  </div>
                </div>

                {selectedEvent.user_agent && (
                  <div>
                    <label className="block text-xs font-bold text-[#717171] uppercase mb-1">User Agent</label>
                    <p className="text-sm text-[#1A1A1A] font-mono bg-[#FCFBF7] p-3 rounded-lg break-all">
                      {selectedEvent.user_agent}
                    </p>
                  </div>
                )}

                {selectedEvent.details && (
                  <div>
                    <label className="block text-xs font-bold text-[#717171] uppercase mb-1">Additional Details</label>
                    <pre className="text-sm text-[#1A1A1A] bg-[#FCFBF7] p-4 rounded-lg overflow-x-auto">
                      {JSON.stringify(
                        typeof selectedEvent.details === 'string' 
                          ? JSON.parse(selectedEvent.details) 
                          : selectedEvent.details, 
                        null, 
                        2
                      )}
                    </pre>
                  </div>
                )}

                {selectedEvent.resolved && (
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-sm font-bold text-[#1A1A1A] mb-3">Resolution Information</h3>
                    <div className="space-y-2">
                      {selectedEvent.resolved_at && (
                        <div>
                          <label className="block text-xs font-bold text-[#717171] uppercase mb-1">Resolved At</label>
                          <p className="text-sm text-[#1A1A1A]">
                            {format(new Date(selectedEvent.resolved_at), 'MMMM d, yyyy HH:mm:ss')}
                          </p>
                        </div>
                      )}
                      {selectedEvent.resolution_notes && (
                        <div>
                          <label className="block text-xs font-bold text-[#717171] uppercase mb-1">Resolution Notes</label>
                          <p className="text-sm text-[#1A1A1A] bg-[#FCFBF7] p-3 rounded-lg">
                            {selectedEvent.resolution_notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-200 flex items-center gap-3 sticky bottom-0 bg-white">
                {!selectedEvent.resolved && (
                  <button
                    onClick={() => {
                      resolveEventMutation.mutate({ eventId: selectedEvent.id });
                      setDetailsModal(false);
                    }}
                    disabled={resolveEventMutation.isPending}
                    className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {resolveEventMutation.isPending ? 'Resolving...' : 'Mark as Resolved'}
                  </button>
                )}
                <button
                  onClick={() => setDetailsModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-[#1A1A1A] font-semibold rounded-lg transition-colors"
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
