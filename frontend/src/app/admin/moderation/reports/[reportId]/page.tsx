'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { adminApiClient } from '@/lib/admin-api-client';
import { AdminRouteGuard } from '@/components/admin/admin-route-guard';
import { AdminLayout } from '@/components/admin/admin-nav';
import { 
  Shield, 
  ArrowLeft, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  User,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const reportId = params.reportId as string;
  
  const [action, setAction] = useState('');
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [showActionDialog, setShowActionDialog] = useState(false);

  const { data: report, isLoading } = useQuery({
    queryKey: ['admin-report', reportId],
    queryFn: async () => {
      console.log('[Report Details] Fetching report:', reportId);
      const response = await adminApiClient.client.get(`/moderation/reports/${reportId}`);
      console.log('[Report Details] Report data received:', response.data);
      return response.data.data || response.data;
    },
  });

  const { data: reportedContent, isLoading: isLoadingContent } = useQuery({
    queryKey: ['reported-content', report?.content_type, report?.content_id],
    queryFn: async () => {
      if (!report?.content_type || !report?.content_id) return null;
      console.log('[Report Details] Fetching reported content:', {
        contentType: report.content_type,
        contentId: report.content_id
      });
      const result = await adminApiClient.getReportedContent(report.content_type, report.content_id);
      console.log('[Report Details] Reported content received:', result);
      return result;
    },
    enabled: !!report?.content_type && !!report?.content_id,
  });

  const updateReportMutation = useMutation({
    mutationFn: async ({ action, notes, duration }: { action: string; notes: string; duration?: number }) => {
      console.log('[Report Action] Starting moderation action:', {
        reportId,
        action,
        notes,
        duration
      });
      const result = await adminApiClient.updateAbuseReport(reportId, action, notes, duration);
      console.log('[Report Action] Action completed successfully:', result);
      return result;
    },
    onSuccess: () => {
      console.log('[Report Action] Success - invalidating queries');
      toast.success('Report updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-report', reportId] });
      queryClient.invalidateQueries({ queryKey: ['admin-abuse-reports'] });
      setShowActionDialog(false);
      setAction('');
      setNotes('');
      setDuration(undefined);
    },
    onError: (error: any) => {
      console.error('[Report Action] Error occurred:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      toast.error(error.response?.data?.message || 'Failed to update report');
    },
  });

  const handleAction = (selectedAction: string) => {
    console.log('[Report Action] Action button clicked:', selectedAction);
    setAction(selectedAction);
    setShowActionDialog(true);
  };

  const handleSubmitAction = () => {
    console.log('[Report Action] Validating action submission:', {
      action,
      notes,
      duration,
      notesLength: notes.trim().length
    });
    
    if (!notes.trim()) {
      console.warn('[Report Action] Validation failed: Notes are empty');
      toast.error('Please provide notes for this action');
      return;
    }
    if ((action === 'suspend' || action === 'ban') && !duration && action === 'suspend') {
      console.warn('[Report Action] Validation failed: Duration required for suspend');
      toast.error('Please specify suspension duration');
      return;
    }
    
    console.log('[Report Action] Validation passed, submitting action');
    updateReportMutation.mutate({ action, notes, duration });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'under_review':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'resolved':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'dismissed':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5" />;
      case 'under_review':
        return <AlertTriangle className="w-5 h-5" />;
      case 'resolved':
        return <CheckCircle className="w-5 h-5" />;
      case 'dismissed':
        return <XCircle className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      warn: 'Warn User',
      suspend: 'Suspend User',
      delete_content: 'Delete Content',
      dismiss: 'Dismiss Report',
      resolve: 'Mark as Resolved',
    };
    return labels[actionType] || actionType;
  };

  if (isLoading) {
    return (
      <AdminRouteGuard requiredRole="moderator">
        <AdminLayout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(142,71%,45%)]"></div>
          </div>
        </AdminLayout>
      </AdminRouteGuard>
    );
  }

  if (!report) {
    return (
      <AdminRouteGuard requiredRole="moderator">
        <AdminLayout>
          <div className="p-6">
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
              <Shield className="w-12 h-12 text-[#717171] mx-auto mb-4" />
              <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">Report not found</h3>
              <button
                onClick={() => router.push('/admin/moderation')}
                className="mt-4 px-4 py-2 bg-[hsl(142,71%,45%)] hover:bg-[hsl(142,71%,40%)] text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Back to Reports
              </button>
            </div>
          </div>
        </AdminLayout>
      </AdminRouteGuard>
    );
  }

  return (
    <AdminRouteGuard requiredRole="moderator">
      <AdminLayout>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/admin/moderation')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-[#717171]" />
              </button>
              <div className="w-1.5 h-8 bg-[hsl(142,71%,45%)] rounded-full"></div>
              <div>
                <h1 className="text-2xl font-bold text-[#1A1A1A]">Report Details</h1>
                <p className="text-sm text-[#717171]">Review and take action on this report</p>
              </div>
            </div>
            <span className={`px-4 py-2 text-sm font-bold rounded-full border flex items-center gap-2 ${getStatusColor(report.status)}`}>
              {getStatusIcon(report.status)}
              {report.status.toUpperCase().replace('_', ' ')}
            </span>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Report Information */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-[#1A1A1A] mb-4">Report Information</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-[#717171] mb-1">Report ID</p>
                      <p className="text-sm font-mono text-[#1A1A1A]">{report.id.slice(0, 8)}...</p>
                    </div>
                    <div>
                      <p className="text-sm text-[#717171] mb-1">Content Type</p>
                      <p className="text-sm font-semibold text-[#1A1A1A] capitalize">{report.content_type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[#717171] mb-1">Reason</p>
                      <p className="text-sm font-semibold text-[#1A1A1A] capitalize">{report.reason.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[#717171] mb-1">Priority</p>
                      <p className="text-sm font-semibold text-[#1A1A1A] capitalize">{report.priority}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[#717171] mb-1">Reported At</p>
                      <p className="text-sm text-[#1A1A1A]">{format(new Date(report.created_at), 'MMM d, yyyy HH:mm')}</p>
                    </div>
                    {report.resolved_at && (
                      <div>
                        <p className="text-sm text-[#717171] mb-1">Resolved At</p>
                        <p className="text-sm text-[#1A1A1A]">{format(new Date(report.resolved_at), 'MMM d, yyyy HH:mm')}</p>
                      </div>
                    )}
                  </div>

                  {report.description && (
                    <div>
                      <p className="text-sm text-[#717171] mb-2">Description</p>
                      <div className="bg-[#FCFBF7] rounded-lg p-4">
                        <p className="text-sm text-[#1A1A1A]">{report.description}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Reported Content Preview */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-[#1A1A1A] mb-4">Reported Content</h2>
                {isLoadingContent ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(142,71%,45%)]"></div>
                  </div>
                ) : reportedContent ? (
                  <div className="space-y-4">
                    {/* Resource */}
                    {report.content_type === 'resource' && reportedContent.content && (
                      <div className="bg-[#FCFBF7] rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start gap-3">
                          <FileText className="w-5 h-5 text-[hsl(142,71%,45%)] mt-1 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-[#1A1A1A] mb-1">
                              {reportedContent.content.title || 'Untitled Resource'}
                            </h3>
                            {reportedContent.content.description && (
                              <p className="text-sm text-[#717171] mb-2 line-clamp-3">
                                {reportedContent.content.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-[#717171] mb-3">
                              <span>Type: {reportedContent.content.type}</span>
                              <span>Created: {format(new Date(reportedContent.content.created_at), 'MMM d, yyyy')}</span>
                            </div>
                            {reportedContent.content.file_url && (
                              <a
                                href={reportedContent.content.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-[hsl(142,71%,45%)] hover:bg-[hsl(142,71%,40%)] text-white text-sm font-semibold rounded-lg transition-colors"
                              >
                                <FileText className="w-4 h-4" />
                                View Resource
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Study Group */}
                    {report.content_type === 'study_group' && reportedContent.content && (
                      <div className="bg-[#FCFBF7] rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start gap-3">
                          <User className="w-5 h-5 text-[hsl(142,71%,45%)] mt-1 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-[#1A1A1A] mb-1">
                              {reportedContent.content.name || 'Unnamed Group'}
                            </h3>
                            {reportedContent.content.description && (
                              <p className="text-sm text-[#717171] mb-2 line-clamp-3">
                                {reportedContent.content.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-[#717171]">
                              <span>Created: {format(new Date(reportedContent.content.created_at), 'MMM d, yyyy')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Message */}
                    {report.content_type === 'message' && reportedContent.content && (
                      <div className="bg-[#FCFBF7] rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-1 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[#1A1A1A] mb-2 whitespace-pre-wrap">
                              {reportedContent.content.content}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-[#717171]">
                              <span>Sent: {format(new Date(reportedContent.content.created_at), 'MMM d, yyyy HH:mm')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Comment */}
                    {report.content_type === 'comment' && reportedContent.content && (
                      <div className="bg-[#FCFBF7] rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-1 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[#1A1A1A] mb-2 whitespace-pre-wrap">
                              {reportedContent.content.content}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-[#717171]">
                              <span>Posted: {format(new Date(reportedContent.content.created_at), 'MMM d, yyyy HH:mm')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Note */}
                    {report.content_type === 'note' && reportedContent.content && (
                      <div className="bg-[#FCFBF7] rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start gap-3">
                          <FileText className="w-5 h-5 text-[hsl(142,71%,45%)] mt-1 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-[#1A1A1A] mb-1">
                              {reportedContent.content.title || 'Untitled Note'}
                            </h3>
                            {reportedContent.content.content && (
                              <p className="text-sm text-[#717171] mb-2 line-clamp-4 whitespace-pre-wrap">
                                {reportedContent.content.content}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-[#717171]">
                              <span>Created: {format(new Date(reportedContent.content.created_at), 'MMM d, yyyy')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* File */}
                    {report.content_type === 'file' && reportedContent.content && (
                      <div className="bg-[#FCFBF7] rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start gap-3">
                          <FileText className="w-5 h-5 text-[hsl(142,71%,45%)] mt-1 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-[#1A1A1A] mb-1">
                              {reportedContent.content.filename}
                            </h3>
                            <div className="flex items-center gap-4 text-xs text-[#717171]">
                              <span>Type: {reportedContent.content.file_type}</span>
                              <span>Size: {(reportedContent.content.file_size / 1024).toFixed(2)} KB</span>
                              <span>Uploaded: {format(new Date(reportedContent.content.created_at), 'MMM d, yyyy')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Whiteboard */}
                    {report.content_type === 'whiteboard' && reportedContent.content && (
                      <div className="bg-[#FCFBF7] rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start gap-3">
                          <FileText className="w-5 h-5 text-[hsl(142,71%,45%)] mt-1 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-[#1A1A1A] mb-1">
                              {reportedContent.content.title || 'Untitled Whiteboard'}
                            </h3>
                            <div className="flex items-center gap-4 text-xs text-[#717171]">
                              <span>Created: {format(new Date(reportedContent.content.created_at), 'MMM d, yyyy')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Profile */}
                    {report.content_type === 'profile' && reportedContent.content && (
                      <div className="bg-[#FCFBF7] rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start gap-3">
                          <User className="w-5 h-5 text-[hsl(142,71%,45%)] mt-1 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-[#1A1A1A] mb-1">
                              {reportedContent.content.name}
                            </h3>
                            <p className="text-sm text-[#717171] mb-1">{reportedContent.content.email}</p>
                            {reportedContent.content.bio && (
                              <p className="text-sm text-[#717171] mt-2 line-clamp-3">
                                {reportedContent.content.bio}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-yellow-800 mb-1">Content Not Available</p>
                        <p className="text-sm text-yellow-700">
                          The reported content may have been deleted or is no longer accessible.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Reporter Information */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-[#1A1A1A] mb-4">Reporter Information</h2>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[hsl(142,71%,45%)] rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A1A]">{report.reporter_email || 'Anonymous'}</p>
                    <p className="text-xs text-[#717171]">Reporter</p>
                  </div>
                </div>
              </div>

              {/* Reported User Information */}
              {report.reported_user_email && (
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h2 className="text-lg font-bold text-[#1A1A1A] mb-4">Reported User</h2>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1A1A1A]">{report.reported_user_email}</p>
                      <p className="text-xs text-[#717171]">Reported User</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Moderator Notes */}
              {report.moderator_notes && (
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h2 className="text-lg font-bold text-[#1A1A1A] mb-4">Moderator Notes</h2>
                  <div className="bg-[#FCFBF7] rounded-lg p-4">
                    <p className="text-sm text-[#1A1A1A]">{report.moderator_notes}</p>
                  </div>
                  {report.moderator_email && (
                    <p className="text-xs text-[#717171] mt-2">By: {report.moderator_email}</p>
                  )}
                </div>
              )}
            </div>

            {/* Actions Sidebar */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-[#1A1A1A] mb-4">Actions</h2>
                <div className="space-y-2">
                  {report.status === 'pending' || report.status === 'under_review' ? (
                    <>
                      <button
                        onClick={() => handleAction('warn')}
                        className="w-full px-4 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 text-sm font-semibold rounded-lg transition-colors border border-yellow-200"
                      >
                        Warn User
                      </button>
                      <button
                        onClick={() => handleAction('suspend')}
                        className="w-full px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 text-sm font-semibold rounded-lg transition-colors border border-orange-200"
                      >
                        Suspend User
                      </button>
                      <button
                        onClick={() => handleAction('delete_content')}
                        className="w-full px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-semibold rounded-lg transition-colors border border-red-200"
                      >
                        Delete Content
                      </button>
                      <button
                        onClick={() => handleAction('resolve')}
                        className="w-full px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 text-sm font-semibold rounded-lg transition-colors border border-green-200"
                      >
                        Mark as Resolved
                      </button>
                      <button
                        onClick={() => handleAction('dismiss')}
                        className="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg transition-colors border border-gray-200"
                      >
                        Dismiss Report
                      </button>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-[#717171]">This report has been {report.status}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Dialog */}
        {showActionDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-[#1A1A1A] mb-4">
                {getActionLabel(action)}
              </h3>
              <p className="text-sm text-[#717171] mb-4">
                Please provide notes for this action. This will be recorded in the audit log.
              </p>
              
              {/* Duration field for suspend action */}
              {action === 'suspend' && (
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                    Suspension Duration (hours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={duration || ''}
                    onChange={(e) => setDuration(parseInt(e.target.value) || undefined)}
                    placeholder="e.g., 24, 168 (1 week), 720 (30 days)"
                    className="w-full px-4 py-3 bg-[#FCFBF7] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(142,71%,45%)] focus:border-transparent"
                  />
                  <p className="text-xs text-[#717171] mt-1">
                    Leave empty for permanent suspension
                  </p>
                </div>
              )}
              
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter your notes here..."
                className="w-full px-4 py-3 bg-[#FCFBF7] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(142,71%,45%)] focus:border-transparent resize-none"
                rows={4}
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowActionDialog(false);
                    setAction('');
                    setNotes('');
                    setDuration(undefined);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-colors"
                  disabled={updateReportMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitAction}
                  disabled={updateReportMutation.isPending || !notes.trim()}
                  className="flex-1 px-4 py-2 bg-[hsl(142,71%,45%)] hover:bg-[hsl(142,71%,40%)] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateReportMutation.isPending ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </AdminRouteGuard>
  );
}
