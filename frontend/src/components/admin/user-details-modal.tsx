'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApiClient } from '@/lib/admin-api-client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  User, 
  Mail, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  Users, 
  FolderOpen,
  AlertTriangle,
  Clock,
  Ban,
  TrendingUp,
  Activity,
  Target,
  Upload
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface UserDetailsModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function UserDetailsModal({ userId, isOpen, onClose }: UserDetailsModalProps) {
  const { data: user, isLoading } = useQuery({
    queryKey: ['admin-user-details', userId],
    queryFn: () => adminApiClient.getUserById(userId),
    enabled: isOpen && !!userId,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-user-stats', userId],
    queryFn: () => adminApiClient.getUserStats(userId),
    enabled: isOpen && !!userId,
  });

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#1A1A1A]">
            User Profile & Activity
          </DialogTitle>
          <DialogDescription>
            Comprehensive overview of user account and activity statistics
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(142,71%,45%)]"></div>
          </div>
        ) : user ? (
          <div className="space-y-6">
            {/* User Profile Header */}
            <div className="bg-gradient-to-br from-[hsl(142,71%,45%)] to-[hsl(142,71%,35%)] rounded-2xl p-6 text-white">
              <div className="flex items-start gap-6">
                <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0">
                  <User className="w-12 h-12" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-3xl font-bold mb-2">{user.name || 'No Name'}</h3>
                  <div className="flex items-center gap-2 text-white/90 mb-4">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm truncate">{user.email}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">
                        Joined {format(new Date(user.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                    {user.email_verified && (
                      <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm font-medium">Email Verified</span>
                      </div>
                    )}
                    {user.violation_count > 0 && (
                      <div className="flex items-center gap-2 bg-red-500/20 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-red-300/30">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-medium">{user.violation_count} Violation{user.violation_count > 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Suspension Alert */}
            {user.is_suspended && user.suspension_info && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Ban className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-red-900 text-lg mb-1">Account Suspended</h4>
                    <p className="text-sm text-red-700 mb-3">{user.suspension_info.reason}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-red-600">
                      <span className="bg-red-100 px-2 py-1 rounded">Type: {user.suspension_info.suspension_type}</span>
                      {user.suspension_info.expires_at && (
                        <span className="bg-red-100 px-2 py-1 rounded">
                          Expires: {format(new Date(user.suspension_info.expires_at), 'MMM d, yyyy HH:mm')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Statistics Grid */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-[hsl(142,71%,45%)]" />
                <h4 className="text-lg font-bold text-[#1A1A1A]">Content Statistics</h4>
              </div>
              {statsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(142,71%,45%)]"></div>
                </div>
              ) : stats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-blue-900">{stats.total_tasks || 0}</div>
                        <div className="text-xs text-blue-600 font-medium">Tasks</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-blue-700">
                      <Target className="w-3 h-3" />
                      <span>{stats.completed_tasks || 0} completed</span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-purple-900">{stats.total_notes || 0}</div>
                        <div className="text-xs text-purple-600 font-medium">Notes</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-purple-700">
                      <Activity className="w-3 h-3" />
                      <span>{stats.notes_last_7_days || 0} this week</span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-[hsl(142,71%,45%)] rounded-xl flex items-center justify-center">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-green-900">{stats.total_groups || 0}</div>
                        <div className="text-xs text-green-600 font-medium">Groups</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-green-700">
                      <Users className="w-3 h-3" />
                      <span>Study groups joined</span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                        <FolderOpen className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-orange-900">{stats.total_files || 0}</div>
                        <div className="text-xs text-orange-600 font-medium">Files</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-orange-700">
                      <Upload className="w-3 h-3" />
                      <span>{formatBytes(stats.total_storage || 0)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[#717171] text-center py-4">No statistics available</p>
              )}
            </div>

            {/* Recent Activity */}
            {stats && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-[hsl(142,71%,45%)]" />
                  <h4 className="text-lg font-bold text-[#1A1A1A]">Recent Activity</h4>
                </div>
                <div className="bg-[#FCFBF7] rounded-xl p-5 space-y-4">
                  {stats.last_activity ? (
                    <>
                      <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                        <span className="text-sm font-medium text-[#717171]">Last Active</span>
                        <span className="text-sm font-bold text-[#1A1A1A]">
                          {formatDistanceToNow(new Date(stats.last_activity), { addSuffix: true })}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {stats.last_task_created && (
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <FileText className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="text-xs font-medium text-[#717171]">Last Task</div>
                              <div className="text-sm font-semibold text-[#1A1A1A]">
                                {format(new Date(stats.last_task_created), 'MMM d, HH:mm')}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {stats.last_note_created && (
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <FileText className="w-4 h-4 text-purple-600" />
                            </div>
                            <div>
                              <div className="text-xs font-medium text-[#717171]">Last Note</div>
                              <div className="text-sm font-semibold text-[#1A1A1A]">
                                {format(new Date(stats.last_note_created), 'MMM d, HH:mm')}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {stats.last_file_uploaded && (
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Upload className="w-4 h-4 text-orange-600" />
                            </div>
                            <div>
                              <div className="text-xs font-medium text-[#717171]">Last Upload</div>
                              <div className="text-sm font-semibold text-[#1A1A1A]">
                                {format(new Date(stats.last_file_uploaded), 'MMM d, HH:mm')}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Weekly Activity Summary */}
                      <div className="pt-3 border-t border-gray-200">
                        <div className="text-xs font-medium text-[#717171] mb-2">Activity (Last 7 Days)</div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-sm text-[#1A1A1A]">{stats.tasks_last_7_days || 0} tasks</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span className="text-sm text-[#1A1A1A]">{stats.notes_last_7_days || 0} notes</span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <Clock className="w-8 h-8 text-[#717171] mx-auto mb-2" />
                      <p className="text-sm text-[#717171]">No recent activity recorded</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bio Section */}
            {user.bio && (
              <div className="bg-[#FCFBF7] rounded-xl p-5">
                <h4 className="font-semibold text-[#1A1A1A] mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  About
                </h4>
                <p className="text-sm text-[#717171] leading-relaxed">{user.bio}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <User className="w-12 h-12 text-[#717171] mx-auto mb-3" />
            <p className="text-[#717171]">User not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
