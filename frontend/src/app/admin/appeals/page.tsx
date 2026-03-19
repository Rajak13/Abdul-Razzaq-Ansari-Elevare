'use client';

import { useState, useEffect, useMemo } from 'react';
import { adminApiClient } from '@/lib/admin-api-client';
import { AdminRouteGuard } from '@/components/admin/admin-route-guard';
import { AdminLayout } from '@/components/admin/admin-nav';
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
  MessageSquare,
  LayoutGrid,
  List,
  MoreHorizontal,
  ExternalLink,
  ShieldAlert,
  History,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

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

type ViewMode = 'grid' | 'list';

export default function AppealsPage() {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [stats, setStats] = useState<AppealStats | null>(null);
  const [filter, setFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  // Single selected appeal for the detail view
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // Review form state
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
      toast.error('Failed to load appeals data');
    } finally {
      setIsLoading(false);
    }
  };

  const openAppeal = (appeal: Appeal) => {
    setSelectedAppeal(appeal);
    setAdminResponse(appeal.admin_response || '');
    setReviewStatus(appeal.status === 'pending' ? 'approved' : appeal.status as any);
    setIsDetailOpen(true);
  };

  const handleReview = async () => {
    if (!selectedAppeal) return;
    
    if (adminResponse.length < 10) {
      toast.error('Admin response must be at least 10 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      await adminApiClient.reviewAppeal(selectedAppeal.id, {
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

      setIsDetailOpen(false);
      loadData();
    } catch (error: any) {
      console.error('Failed to review appeal:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to review appeal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAppeals = useMemo(() => {
    return appeals.filter(appeal => {
      const term = searchTerm.toLowerCase();
      return (
        appeal.user_name?.toLowerCase().includes(term) ||
        appeal.user_email?.toLowerCase().includes(term) ||
        appeal.appeal_message?.toLowerCase().includes(term) ||
        appeal.suspension_reason?.toLowerCase().includes(term)
      );
    });
  }, [appeals, searchTerm]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { 
          color: 'bg-amber-50 text-amber-700 border-amber-200', 
          icon: Clock, 
          label: 'Pending',
          dot: 'bg-amber-500'
        };
      case 'approved':
        return { 
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200', 
          icon: CheckCircle, 
          label: 'Approved',
          dot: 'bg-emerald-500'
        };
      case 'rejected':
        return { 
          color: 'bg-rose-50 text-rose-700 border-rose-200', 
          icon: XCircle, 
          label: 'Rejected',
          dot: 'bg-rose-500'
        };
      case 'under_review':
        return { 
          color: 'bg-blue-50 text-blue-700 border-blue-200', 
          icon: AlertCircle, 
          label: 'Under Review',
          dot: 'bg-blue-500'
        };
      default:
        return { 
          color: 'bg-slate-50 text-slate-700 border-slate-200', 
          icon: MessageSquare, 
          label: status,
          dot: 'bg-slate-500'
        };
    }
  };

  return (
    <AdminRouteGuard requiredRole="moderator">
      <AdminLayout>
        <div className="flex flex-col min-h-screen bg-[#FCFBF7]">
          {/* Header Section */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-[hsl(142,71%,45%)] rounded-full"></div>
                <div>
                  <h1 className="text-2xl font-bold text-[#1A1A1A]">Suspension Appeals</h1>
                  <p className="text-sm text-[#717171]">Manage and review user requests for account unsuspension</p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-100">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                    viewMode === 'grid' ? "bg-white text-[#1A1A1A] shadow-sm border border-gray-100" : "text-[#717171] hover:text-[#1A1A1A]"
                  )}
                >
                  <LayoutGrid className="w-4 h-4" />
                  Cards
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                    viewMode === 'list' ? "bg-white text-[#1A1A1A] shadow-sm border border-gray-100" : "text-[#717171] hover:text-[#1A1A1A]"
                  )}
                >
                  <List className="w-4 h-4" />
                  List
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
            {/* Stats Dashboard */}
            {stats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Appeals', value: stats.total, icon: MessageSquare, color: 'blue' },
                  { label: 'Pending Review', value: stats.pending, icon: Clock, color: 'amber' },
                  { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'emerald' },
                  { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'rose' },
                ].map((item) => (
                  <div key={item.label} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        item.color === 'blue' ? "bg-blue-50 text-blue-500" :
                        item.color === 'amber' ? "bg-amber-50 text-amber-500" :
                        item.color === 'emerald' ? "bg-green-50 text-[hsl(142,71%,45%)]" :
                        "bg-red-50 text-red-500"
                      )}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-medium text-[#717171]">{item.label}</span>
                    </div>
                    <span className="text-2xl font-bold text-[#1A1A1A]">{item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#717171]" />
                <input
                  type="text"
                  placeholder="Search by name, email or message..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#FCFBF7] border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[hsl(142,71%,45%)] focus:border-transparent outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto no-scrollbar">
                {['pending', 'under_review', 'approved', 'rejected'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilter(status)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap",
                      filter === status 
                        ? "bg-[hsl(142,71%,45%)] text-white shadow-sm" 
                        : "bg-[#FCFBF7] text-[#717171] border border-gray-200 hover:bg-gray-100"
                    )}
                  >
                    {status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Content Area */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[hsl(142,71%,45%)]"></div>
                <p className="text-sm font-medium text-[#717171]">Loading appeals...</p>
              </div>
            ) : filteredAppeals.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
                <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-bold text-[#1A1A1A] mb-1">No appeals found</h3>
                <p className="text-[#717171] max-w-sm mx-auto text-sm">
                  {searchTerm ? 'No results match your search term' : 'There are no active appeals in this category'}
                </p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAppeals.map((appeal) => (
                  <div 
                    key={appeal.id} 
                    onClick={() => openAppeal(appeal)}
                    className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-[hsl(142,71%,45%)] text-white font-bold">
                            {appeal.user_name?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-bold text-[#1A1A1A]">{appeal.user_name}</h4>
                          <p className="text-xs text-[#717171]">{appeal.user_email}</p>
                        </div>
                      </div>
                      <Badge className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold shadow-none", getStatusConfig(appeal.status).color)}>
                        {getStatusConfig(appeal.status).label.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="flex-grow space-y-3">
                      <div className="bg-[#FCFBF7] rounded-xl p-3 border border-gray-50">
                        <span className="text-[10px] font-bold text-[#717171] uppercase tracking-wider mb-1 block">Reason for suspension</span>
                        <p className="text-xs text-[#1A1A1A] font-medium line-clamp-2">{appeal.suspension_reason}</p>
                      </div>
                      
                      <div>
                        <span className="text-[10px] font-bold text-[#717171] uppercase tracking-wider mb-1 block">Appeal message</span>
                        <p className="text-sm text-[#1A1A1A] font-medium italic line-clamp-3">"{appeal.appeal_message}"</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[#717171]">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-medium">{format(new Date(appeal.created_at), 'MMM d, yyyy HH:mm')}</span>
                      </div>
                      <span className="text-[10px] font-bold text-[hsl(142,71%,45%)] group-hover:underline flex items-center gap-1">
                        Review <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-3 text-xs font-bold text-[#717171] uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-xs font-bold text-[#717171] uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-xs font-bold text-[#717171] uppercase tracking-wider">Submitted</th>
                        <th className="px-6 py-3 text-xs font-bold text-[#717171] uppercase tracking-wider">Preview</th>
                        <th className="px-6 py-3 text-xs font-bold text-[#717171] uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredAppeals.map((appeal) => (
                        <tr 
                          key={appeal.id} 
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => openAppeal(appeal)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-[hsl(142,71%,45%)] text-white text-[10px] font-bold">
                                  {appeal.user_name?.[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-bold text-[#1A1A1A]">{appeal.user_name}</p>
                                <p className="text-[10px] text-[#717171] font-medium">{appeal.user_email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className={cn("w-1.5 h-1.5 rounded-full", getStatusConfig(appeal.status).dot)}></div>
                              <span className="text-xs font-bold text-[#1A1A1A]">{getStatusConfig(appeal.status).label}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs text-[#717171] font-medium">{format(new Date(appeal.created_at), 'MMM d, yyyy')}</span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs text-[#1A1A1A] font-medium truncate max-w-[250px]">
                              {appeal.appeal_message}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="text-[hsl(142,71%,45%)] font-bold text-xs hover:underline">Review Details</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Appeal Detail Modal */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-2xl p-0 overflow-hidden border-none rounded-2xl shadow-xl bg-white">
            {selectedAppeal && (
              <div className="flex flex-col max-h-[90vh]">
                <DialogHeader className="p-6 border-b border-gray-100 bg-white">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 border border-gray-100">
                      <AvatarFallback className="bg-[hsl(142,71%,45%)] text-white font-bold text-lg">
                        {selectedAppeal.user_name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-grow">
                      <DialogTitle className="text-xl font-bold text-[#1A1A1A]">
                        {selectedAppeal.user_name}
                      </DialogTitle>
                      <DialogDescription className="text-xs font-medium text-[#717171] mt-0.5">
                        Reviewing appeal for {selectedAppeal.user_email}
                      </DialogDescription>
                    </div>
                    <Badge className={cn("rounded-full px-3 py-1 text-[10px] font-bold shadow-none", getStatusConfig(selectedAppeal.status).color)}>
                      {getStatusConfig(selectedAppeal.status).label.toUpperCase()}
                    </Badge>
                  </div>
                </DialogHeader>

                <ScrollArea className="flex-grow p-6 bg-[#FCFBF7]/30">
                  <div className="space-y-8">
                    {/* Information Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-[#717171] uppercase tracking-wider block">Submitted On</span>
                        <div className="flex items-center gap-2 text-sm font-semibold text-[#1A1A1A]">
                          <Calendar className="w-4 h-4 text-[#717171]" />
                          {format(new Date(selectedAppeal.created_at), 'PPP p')}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-[#717171] uppercase tracking-wider block">User ID</span>
                        <div className="text-sm font-mono text-[#717171] bg-gray-50 px-2 py-0.5 rounded border border-gray-100 inline-block">
                          {selectedAppeal.user_id.slice(0, 16)}...
                        </div>
                      </div>
                    </div>

                    {/* Content Sections */}
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-[#717171] uppercase tracking-wider flex items-center gap-2">
                          <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                          Suspension Context
                        </h4>
                        <div className="bg-red-50/50 p-4 rounded-xl border border-red-100">
                          <p className="text-sm font-semibold text-red-900 leading-relaxed">
                            {selectedAppeal.suspension_reason}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-[#717171] uppercase tracking-wider flex items-center gap-2">
                          <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                          User's Appeal Message
                        </h4>
                        <div className="bg-white p-5 rounded-xl border border-gray-100 relative group">
                          <div className="absolute -left-1 top-4 w-1 h-8 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <p className="text-sm font-medium text-[#1A1A1A] leading-relaxed whitespace-pre-wrap italic">
                            "{selectedAppeal.appeal_message}"
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Verdict Form */}
                    {(selectedAppeal.status === 'pending' || selectedAppeal.status === 'under_review') ? (
                      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[hsl(142,71%,45%)]/10 flex items-center justify-center">
                            <History className="w-4 h-4 text-[hsl(142,71%,45%)]" />
                          </div>
                          <h4 className="text-sm font-bold text-[#1A1A1A]">Administrative Decision</h4>
                        </div>

                        <div className="space-y-5">
                          <div>
                            <label className="text-xs font-bold text-[#717171] uppercase block mb-3">Outcome Status</label>
                            <div className="flex gap-2">
                              {[
                                { id: 'approved', label: 'Approve', color: 'green' },
                                { id: 'rejected', label: 'Reject', color: 'red' },
                                { id: 'under_review', label: 'Flag', color: 'blue' },
                              ].map((opt) => (
                                <button
                                  key={opt.id}
                                  onClick={() => setReviewStatus(opt.id as any)}
                                  className={cn(
                                    "flex-1 py-2.5 px-4 rounded-xl text-xs font-bold border-2 transition-all flex items-center justify-center gap-2",
                                    reviewStatus === opt.id 
                                      ? `bg-white border-${opt.color}-500 text-${opt.color}-700 shadow-md ring-2 ring-${opt.color}-500/10` 
                                      : "bg-gray-50 border-gray-100 text-[#717171] hover:bg-white hover:border-gray-200"
                                  )}
                                >
                                  {opt.id === 'approved' && <CheckCircle className="w-3.5 h-3.5" />}
                                  {opt.id === 'rejected' && <XCircle className="w-3.5 h-3.5" />}
                                  {opt.id === 'under_review' && <AlertCircle className="w-3.5 h-3.5" />}
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-bold text-[#717171] uppercase block mb-2">Public Response to User</label>
                            <textarea
                              placeholder="Explain the reason for this decision. This will be visible to the user..."
                              value={adminResponse}
                              onChange={(e) => setAdminResponse(e.target.value)}
                              rows={4}
                              className="w-full px-4 py-3 bg-[#FCFBF7] border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[hsl(142,71%,45%)] focus:border-transparent outline-none resize-none transition-all placeholder:text-[#717171]/50"
                            />
                            <div className="flex justify-between items-center mt-2 px-1">
                              <span className={cn("text-[10px] font-bold uppercase", adminResponse.length < 10 ? "text-red-500" : "text-[hsl(142,71%,45%)]")}>
                                {adminResponse.length < 10 ? 'Min. 10 characters required' : 'Ready to submit'}
                              </span>
                              <span className="text-[10px] font-bold text-[#717171] bg-gray-100 px-2 py-0.5 rounded-md">{adminResponse.length} / 2000</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-blue-50/30 p-6 rounded-2xl border border-blue-100 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-2">
                             <Info className="w-3.5 h-3.5" />
                             Decision Record
                          </h4>
                          <span className="text-[10px] font-bold text-blue-400 uppercase">Reviewed on {selectedAppeal.reviewed_at && format(new Date(selectedAppeal.reviewed_at), 'MMM d, yyyy')}</span>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-blue-100/50 shadow-sm">
                          <p className="text-sm font-medium text-[#1A1A1A] leading-relaxed italic">
                            "{selectedAppeal.admin_response}"
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <DialogFooter className="p-6 border-t border-gray-100 bg-white sm:justify-between items-center">
                  <Button 
                    variant="ghost" 
                    className="font-bold text-[#717171] hover:bg-gray-50 px-6" 
                    onClick={() => setIsDetailOpen(false)}
                  >
                    Cancel
                  </Button>
                  {(selectedAppeal.status === 'pending' || selectedAppeal.status === 'under_review') && (
                    <Button
                      onClick={handleReview}
                      disabled={isSubmitting || adminResponse.length < 10}
                      className="bg-[hsl(142,71%,45%)] hover:bg-[hsl(142,71%,40%)] text-white font-bold px-8 h-11 rounded-xl shadow-lg shadow-[hsl(142,71%,45%)]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Submitting...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Send className="w-4 h-4" />
                          Finalize Verdict
                        </div>
                      )}
                    </Button>
                  )}
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </AdminLayout>
    </AdminRouteGuard>
  );
}
