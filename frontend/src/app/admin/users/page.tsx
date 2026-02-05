'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApiClient } from '@/lib/admin-api-client';
import { AdminRouteGuard } from '@/components/admin/admin-route-guard';
import { AdminLayout } from '@/components/admin/admin-nav';
import { EmptyState } from '@/components/admin/empty-state';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Users, Search, MoreVertical, Ban, RotateCcw, Trash2, Eye, X, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [limit, setLimit] = useState(25);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [actionType, setActionType] = useState<'suspend' | 'unsuspend' | 'delete' | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [suspendDuration, setSuspendDuration] = useState<number | null>(null);
  const [suspendDurationType, setSuspendDurationType] = useState<'hours' | 'days' | 'permanent'>('permanent');
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search, status, limit],
    queryFn: () =>
      adminApiClient.getUsers({
        page,
        limit,
        search: search || undefined,
        status: status !== 'all' ? status : undefined,
      }),
  });

  const suspendUserMutation = useMutation({
    mutationFn: ({ userId, reason, duration }: { userId: string; reason: string; duration?: number }) =>
      adminApiClient.suspendUser(userId, reason, duration),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: 'Success',
        description: 'User suspended successfully',
      });
      setSelectedUser(null);
      setActionType(null);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to suspend user',
        variant: 'destructive',
      });
    },
  });

  const unsuspendUserMutation = useMutation({
    mutationFn: (userId: string) => adminApiClient.unsuspendUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: 'Success',
        description: 'User suspension lifted successfully',
      });
      setSelectedUser(null);
      setActionType(null);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to unsuspend user',
        variant: 'destructive',
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      adminApiClient.deleteUser(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: 'Success',
        description: 'User account deleted successfully',
      });
      setSelectedUser(null);
      setActionType(null);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete user account',
        variant: 'destructive',
      });
    },
  });

  const handleAction = (user: any, action: 'suspend' | 'unsuspend' | 'delete' | 'view') => {
    if (action === 'view') {
      // Navigate to user details (implement later)
      toast({
        title: 'Info',
        description: 'User details view coming soon',
      });
      return;
    }
    
    setSelectedUser(user);
    setActionType(action);
  };

  const confirmAction = () => {
    if (!selectedUser || !actionType) return;

    switch (actionType) {
      case 'suspend':
        if (!suspendReason.trim()) {
          toast({
            title: 'Error',
            description: 'Please provide a reason for suspension',
            variant: 'destructive',
          });
          return;
        }
        
        // Calculate duration in hours
        let durationHours: number | undefined;
        if (suspendDurationType !== 'permanent' && suspendDuration) {
          durationHours = suspendDurationType === 'days' 
            ? suspendDuration * 24 
            : suspendDuration;
        }
        
        suspendUserMutation.mutate({
          userId: selectedUser.id,
          reason: suspendReason,
          duration: durationHours,
        });
        break;
      case 'unsuspend':
        unsuspendUserMutation.mutate(selectedUser.id);
        break;
      case 'delete':
        if (!deleteReason.trim()) {
          toast({
            title: 'Error',
            description: 'Please provide a reason for deletion',
            variant: 'destructive',
          });
          return;
        }
        deleteUserMutation.mutate({
          userId: selectedUser.id,
          reason: deleteReason,
        });
        break;
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set<string>(data?.users?.map((u: any) => u.id) || []);
      setSelectedUsers(allIds);
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUsers);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleBulkAction = (action: 'suspend' | 'delete') => {
    if (selectedUsers.size === 0) return;
    
    toast({
      title: 'Bulk Action',
      description: `${action === 'suspend' ? 'Suspending' : 'Deleting'} ${selectedUsers.size} users...`,
    });
    
    // Implement bulk action logic here
    setSelectedUsers(new Set());
  };

  const totalPages = data?.pagination?.pages || 0;
  const totalUsers = data?.pagination?.total || 0;
  const activeUsers = data?.users?.filter((u: any) => !u.is_suspended).length || 0;
  const suspendedUsers = data?.users?.filter((u: any) => u.is_suspended).length || 0;
  const verifiedUsers = data?.users?.filter((u: any) => u.email_verified).length || 0;

  return (
    <AdminRouteGuard>
      <AdminLayout>
        <div className="p-6 space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#1A1A1A]">User Management</h1>
              <p className="text-sm text-[#717171] mt-1">View and manage user accounts</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <span className="text-sm font-medium text-[#717171]">Total Users</span>
              </div>
              <span className="text-2xl font-bold text-[#1A1A1A]">{totalUsers.toLocaleString()}</span>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-[hsl(142,71%,45%)]" />
                </div>
                <span className="text-sm font-medium text-[#717171]">Active Users</span>
              </div>
              <span className="text-2xl font-bold text-[#1A1A1A]">{activeUsers}</span>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                  <Eye className="w-5 h-5 text-purple-500" />
                </div>
                <span className="text-sm font-medium text-[#717171]">Verified</span>
              </div>
              <span className="text-2xl font-bold text-[#1A1A1A]">{verifiedUsers}</span>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                  <Ban className="w-5 h-5 text-red-500" />
                </div>
                <span className="text-sm font-medium text-[#717171]">Suspended</span>
              </div>
              <span className="text-2xl font-bold text-[#1A1A1A]">{suspendedUsers}</span>
            </div>
          </div>

        <div className="flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Bulk Actions Bar */}
          {selectedUsers.size > 0 && (
            <div className="bg-[hsl(142,71%,45%)] text-white px-6 py-4 flex items-center justify-between">
              <span className="text-sm font-semibold">{selectedUsers.size} users selected</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleBulkAction('suspend')}
                  className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Suspend Selected
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Delete Selected
                </button>
                <button
                  onClick={() => setSelectedUsers(new Set())}
                  className="ml-2 p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#1A1A1A]">All Users</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#717171]">Show</span>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="bg-[#FCFBF7] border border-gray-200 rounded-lg text-sm font-medium py-1.5 px-3 focus:ring-2 focus:ring-[hsl(142,71%,45%)] focus:border-transparent outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative mb-4">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <Search className="w-5 h-5 text-[#717171]" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email, name or status..."
                className="w-full h-11 pl-12 pr-4 bg-[#FCFBF7] border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[hsl(142,71%,45%)] focus:border-transparent outline-none placeholder:text-[#717171]"
              />
            </div>

            {/* Filter Chips */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setStatus('all')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  status === 'all'
                    ? 'bg-[hsl(142,71%,45%)] text-white'
                    : 'bg-[#FCFBF7] text-[#717171] hover:bg-gray-100'
                }`}
              >
                All Users
              </button>
              <button
                onClick={() => setStatus('active')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  status === 'active'
                    ? 'bg-[hsl(142,71%,45%)] text-white'
                    : 'bg-[#FCFBF7] text-[#717171] hover:bg-gray-100'
                }`}
              >
                <Shield className="w-4 h-4" />
                Active
              </button>
              <button
                onClick={() => setStatus('suspended')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  status === 'suspended'
                    ? 'bg-[hsl(142,71%,45%)] text-white'
                    : 'bg-[#FCFBF7] text-[#717171] hover:bg-gray-100'
                }`}
              >
                Suspended
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(142,71%,45%)]"></div>
              </div>
            ) : data?.users?.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  icon={<Users className="w-12 h-12 text-[#717171]" />}
                  title="No users found"
                  description="No users match your search criteria"
                />
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#FCFBF7] border-b border-gray-100">
                  <tr>
                    <th className="w-12 px-6 py-3">
                      <input
                        type="checkbox"
                        checked={selectedUsers.size === data?.users?.length && data?.users?.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300 text-[hsl(142,71%,45%)] focus:ring-[hsl(142,71%,45%)] w-4 h-4"
                      />
                    </th>
                    <th className="text-xs font-semibold text-[#717171] py-3 px-4">Email</th>
                    <th className="text-xs font-semibold text-[#717171] py-3 px-4">Name</th>
                    <th className="text-xs font-semibold text-[#717171] py-3 px-4">Registration Date</th>
                    <th className="text-xs font-semibold text-[#717171] py-3 px-4">Verified</th>
                    <th className="text-xs font-semibold text-[#717171] py-3 px-4">Status</th>
                    <th className="text-xs font-semibold text-[#717171] py-3 px-4 text-center">Violations</th>
                    <th className="text-xs font-semibold text-[#717171] py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data?.users?.map((user: any) => (
                    <tr key={user.id} className="hover:bg-[#FCFBF7] transition-colors">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.id)}
                          onChange={(e) => handleSelectUser(user.id, e.target.checked)}
                          className="rounded border-gray-300 text-[hsl(142,71%,45%)] focus:ring-[hsl(142,71%,45%)] w-4 h-4"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-[#1A1A1A] font-medium">
                          {user.email.replace(/(.{3})(.*)(@.*)/, '$1***$3')}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-[#1A1A1A]">{user.name || 'N/A'}</span>
                      </td>
                      <td className="px-4 py-4 text-sm text-[#717171]">
                        {format(new Date(user.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            user.email_verified
                              ? 'bg-green-50 text-green-700'
                              : 'bg-yellow-50 text-yellow-700'
                          }`}
                        >
                          {user.email_verified ? 'Verified' : 'Unverified'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            user.is_suspended
                              ? 'bg-gray-100 text-[#717171]'
                              : 'bg-green-50 text-green-700'
                          }`}
                        >
                          {user.is_suspended ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center text-sm font-medium text-[#717171]">
                        {user.violation_count || 0}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                              <MoreVertical className="w-5 h-5 text-[#717171]" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleAction(user, 'view')}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.is_suspended ? (
                              <DropdownMenuItem
                                onClick={() => handleAction(user, 'unsuspend')}
                              >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Unsuspend User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleAction(user, 'suspend')}
                              >
                                <Ban className="w-4 h-4 mr-2" />
                                Suspend User
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleAction(user, 'delete')}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Account
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {data?.pagination && totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="text-sm text-[#717171]">
                  Showing <span className="font-medium text-[#1A1A1A]">{((page - 1) * limit) + 1}</span> to <span className="font-medium text-[#1A1A1A]">{Math.min(page * limit, totalUsers)}</span> of <span className="font-medium text-[#1A1A1A]">{totalUsers.toLocaleString()}</span> users
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-3 py-2 text-sm font-medium text-[#717171] hover:text-[#1A1A1A] hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    Previous
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {page > 2 && (
                      <>
                        <button
                          onClick={() => setPage(1)}
                          className="w-10 h-10 flex items-center justify-center text-sm font-medium text-[#717171] hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          1
                        </button>
                        {page > 3 && (
                          <span className="px-2 text-[#717171]">...</span>
                        )}
                      </>
                    )}
                    
                    {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 2, page - 1)) + i;
                      if (pageNum < 1 || pageNum > totalPages) return null;
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`w-10 h-10 flex items-center justify-center text-sm font-medium rounded-lg transition-colors ${
                            page === pageNum
                              ? 'bg-[hsl(142,71%,45%)] text-white'
                              : 'text-[#717171] hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    {page < totalPages - 1 && (
                      <>
                        {page < totalPages - 2 && (
                          <span className="px-2 text-[#717171]">...</span>
                        )}
                        <button
                          onClick={() => setPage(totalPages)}
                          className="w-10 h-10 flex items-center justify-center text-sm font-medium text-[#717171] hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                  </div>
                  
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-2 text-sm font-medium text-[#717171] hover:text-[#1A1A1A] hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>

        {/* Confirmation Dialog */}
        <AlertDialog open={!!actionType} onOpenChange={() => {
          setActionType(null);
          setSelectedUser(null);
          setSuspendReason('');
          setDeleteReason('');
          setSuspendDuration(null);
          setSuspendDurationType('permanent');
        }}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {actionType === 'suspend' && 'Suspend User'}
                {actionType === 'unsuspend' && 'Unsuspend User'}
                {actionType === 'delete' && 'Delete User Account'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {actionType === 'suspend' && 
                  `You are about to suspend ${selectedUser?.email}. This will prevent them from accessing the platform.`
                }
                {actionType === 'unsuspend' && 
                  `Are you sure you want to lift the suspension for ${selectedUser?.email}? They will regain access to the platform.`
                }
                {actionType === 'delete' && 
                  `You are about to permanently delete the account for ${selectedUser?.email}. This action cannot be undone.`
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            {/* Suspend Form */}
            {actionType === 'suspend' && (
              <div className="space-y-4">
                {/* Duration Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#1A1A1A]">
                    Suspension Duration <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSuspendDurationType('hours')}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        suspendDurationType === 'hours'
                          ? 'bg-[hsl(142,71%,45%)] text-white'
                          : 'bg-[#FCFBF7] text-[#717171] hover:bg-gray-100'
                      }`}
                    >
                      Hours
                    </button>
                    <button
                      type="button"
                      onClick={() => setSuspendDurationType('days')}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        suspendDurationType === 'days'
                          ? 'bg-[hsl(142,71%,45%)] text-white'
                          : 'bg-[#FCFBF7] text-[#717171] hover:bg-gray-100'
                      }`}
                    >
                      Days
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSuspendDurationType('permanent');
                        setSuspendDuration(null);
                      }}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        suspendDurationType === 'permanent'
                          ? 'bg-[hsl(142,71%,45%)] text-white'
                          : 'bg-[#FCFBF7] text-[#717171] hover:bg-gray-100'
                      }`}
                    >
                      Permanent
                    </button>
                  </div>
                </div>

                {/* Duration Input */}
                {suspendDurationType !== 'permanent' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#1A1A1A]">
                      Number of {suspendDurationType}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={suspendDuration || ''}
                      onChange={(e) => setSuspendDuration(parseInt(e.target.value) || null)}
                      placeholder={`Enter number of ${suspendDurationType}`}
                      className="w-full px-3 py-2 bg-[#FCFBF7] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(142,71%,45%)] focus:border-transparent"
                    />
                  </div>
                )}
                
                {/* Reason Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#1A1A1A]">
                    Reason for Suspension <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                    placeholder="Explain why this user is being suspended..."
                    rows={3}
                    className="w-full px-3 py-2 bg-[#FCFBF7] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(142,71%,45%)] focus:border-transparent resize-none"
                  />
                  <p className="text-xs text-[#717171]">
                    This reason will be shown to the user when they try to log in.
                  </p>
                </div>
              </div>
            )}
            
            {/* Reason Input for Delete */}
            {actionType === 'delete' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#1A1A1A]">
                  Reason for Deletion <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Explain why this account is being deleted..."
                  rows={4}
                  className="w-full px-3 py-2 bg-[#FCFBF7] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(142,71%,45%)] focus:border-transparent resize-none"
                />
                <p className="text-xs text-[#717171]">
                  This will be logged for audit purposes.
                </p>
              </div>
            )}
            
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmAction}
                className={actionType === 'delete' ? 'bg-destructive hover:bg-destructive/90' : ''}
              >
                {actionType === 'suspend' && 'Suspend User'}
                {actionType === 'unsuspend' && 'Unsuspend User'}
                {actionType === 'delete' && 'Delete Account'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </AdminLayout>
    </AdminRouteGuard>
  );
}
