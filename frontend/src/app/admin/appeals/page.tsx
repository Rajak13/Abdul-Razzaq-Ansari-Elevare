'use client';

import { useState, useEffect } from 'react';
import { adminApiClient } from '@/lib/admin-api-client';
import { 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search,
  Filter,
  Send,
  User,
  Calendar,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';

interface Appeal {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  suspension_id: string;
  suspension_reason: string;
  appeal_message: string;
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  admin_response?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

interface AppealStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  under_review: number;
}

export default function AppealsPage() {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [stats, setStats] = useState<AppealStats | null>(null);
  const [filter, setFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAppeal, setSelectedAppeal] = useState<string | null>(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected' | 'under_review'>('approved');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [appealsData, statsData] = await Promise.all([
        adminApiClient.getAppeals({ status: filter }),
        adminApiClient.getAppealStatistics()
      ]);
      
      setAppeals(appealsData.data?.appeals || []);
      setStats(statsData.data || null);
    } catch (error: any) {
      console.error('Failed to load appeals:', error);
      toast.error('Failed to load appeals');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async (appealId: string) => {
    if (adminResponse.length < 10) {
      toast.error('Admin response must be at least 10 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      await adminApiClient.reviewAppeal(appealId, {
        status: reviewStatus,
        admin_response: adminResponse
      });

      toast.success(
        reviewStatus === 'approved' 
          ? 'Appeal approved and user unsuspended' 
          : reviewStatus === 'rejected'
          ? 'Appeal rejected'
          : 'Appeal marked as under review'
      );

      setSelectedAppeal(null);
      setAdminResponse('');
      setReviewStatus('approved');
      loadData();
    } catch (error: any) {
      console.error('Failed to review appeal:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to review appeal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAppeals = appeals.filter(appeal => {
    const matchesSearch = 
      appeal.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appeal.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appeal.appeal_message?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'approved':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'under_review':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      case 'under_review':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(142,71%,45%)]"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-8 bg-[hsl(142,71%,45%)] rounded-full"></div>
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Suspension Appeals</h1>
          <p className="text-sm text-[#717171]">Review and manage user suspension appeals</p>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-[#717171]">Total Appeals</p>
              <MessageSquare className="w-5 h-5 text-[#717171]" />
            </div>
            <p className="text-3xl font-bold text-[#1A1A1A]">{stats.total}</p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-yellow-500">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-[#717171]">Pending</p>
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-[#717171]">Approved</p>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-red-500">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-[#717171]">Rejected</p>
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#717171]" />
            <input
              type="text"
              placeholder="Search by name, email, or message..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#FCFBF7] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(142,71%,45%)] focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#717171]" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 bg-[#FCFBF7] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(142,71%,45%)] focus:border-transparent"
            >
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Appeals List */}
      <div className="space-y-4">
        {filteredAppeals.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <MessageSquare className="w-12 h-12 text-[#717171] mx-auto mb-4" />
            <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">No appeals found</h3>
            <p className="text-sm text-[#717171]">
              {searchTerm ? 'Try adjusting your search terms' : 'No appeals match the selected filter'}
            </p>
          </div>
        ) : (
          filteredAppeals.map((appeal) => (
            <div key={appeal.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Appeal Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-[hsl(142,71%,45%)] rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-lg">
                        {appeal.user_name?.[0]?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#1A1A1A]">{appeal.user_name}</h3>
                      <p className="text-sm text-[#717171]">{appeal.user_email}</p>
                      <p className="text-xs text-[#717171] mt-1">
                        User ID: {appeal.user_id.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1.5 text-xs font-bold rounded-full border flex items-center gap-1.5 ${getStatusColor(appeal.status)}`}>
                    {getStatusIcon(appeal.status)}
                    {appeal.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-[#717171]">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Submitted: {new Date(appeal.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Appeal Content */}
              <div className="p-6 space-y-4">
                {/* Suspension Reason */}
                <div className="bg-red-50 rounded-xl p-4">
                  <p className="text-sm font-bold text-red-900 mb-2">Suspension Reason:</p>
                  <p className="text-sm text-red-700">{appeal.suspension_reason}</p>
                </div>

                {/* User's Appeal */}
                <div className="bg-[#FCFBF7] rounded-xl p-4">
                  <p className="text-sm font-bold text-[#1A1A1A] mb-2">User's Appeal:</p>
                  <p className="text-sm text-[#717171] whitespace-pre-wrap">{appeal.appeal_message}</p>
                </div>

                {/* Review Section for Pending Appeals */}
                {appeal.status === 'pending' && (
                  <div className="pt-4 border-t border-gray-200 space-y-4">
                    <p className="text-sm font-bold text-[#1A1A1A]">Review Appeal</p>
                    
                    {/* Decision Select */}
                    <div>
                      <label className="text-xs font-medium text-[#717171] mb-2 block">
                        Decision
                      </label>
                      <select
                        value={selectedAppeal === appeal.id ? reviewStatus : 'approved'}
                        onChange={(e) => {
                          setSelectedAppeal(appeal.id);
                          setReviewStatus(e.target.value as any);
                        }}
                        className="w-full px-4 py-2.5 bg-[#FCFBF7] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(142,71%,45%)] focus:border-transparent"
                      >
                        <option value="approved">✓ Approve & Unsuspend User</option>
                        <option value="rejected">✗ Reject Appeal</option>
                        <option value="under_review">⏱ Mark as Under Review</option>
                      </select>
                    </div>

                    {/* Admin Response */}
                    <div>
                      <label className="text-xs font-medium text-[#717171] mb-2 block">
                        Admin Response (required, min 10 characters)
                      </label>
                      <textarea
                        placeholder="Provide a detailed response to the user explaining your decision..."
                        value={selectedAppeal === appeal.id ? adminResponse : ''}
                        onChange={(e) => {
                          setSelectedAppeal(appeal.id);
                          setAdminResponse(e.target.value);
                        }}
                        rows={4}
                        className="w-full px-4 py-3 bg-[#FCFBF7] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(142,71%,45%)] focus:border-transparent resize-none"
                      />
                      <p className="text-xs text-[#717171] mt-1">
                        {selectedAppeal === appeal.id ? adminResponse.length : 0}/2000 characters
                      </p>
                    </div>

                    {/* Submit Button */}
                    <button
                      onClick={() => handleReview(appeal.id)}
                      disabled={isSubmitting || (selectedAppeal === appeal.id && adminResponse.length < 10)}
                      className="w-full py-3 px-4 bg-[hsl(142,71%,45%)] hover:bg-[hsl(142,71%,40%)] text-white font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[hsl(142,71%,45%)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      {isSubmitting ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </div>
                )}

                {/* Admin Response (for reviewed appeals) */}
                {appeal.admin_response && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="bg-blue-50 rounded-xl p-4">
                      <p className="text-sm font-bold text-blue-900 mb-2">Admin Response:</p>
                      <p className="text-sm text-blue-700 whitespace-pre-wrap">{appeal.admin_response}</p>
                      {appeal.reviewed_at && (
                        <p className="text-xs text-blue-600 mt-3">
                          Reviewed: {new Date(appeal.reviewed_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
