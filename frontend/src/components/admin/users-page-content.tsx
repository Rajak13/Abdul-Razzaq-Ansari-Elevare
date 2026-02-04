'use client';

import { useState } from 'react';
import { Search, Filter, MoreVertical, Mail, Ban, Trash2, Key } from 'lucide-react';

interface UsersPageContentProps {
  users?: any[];
  isLoading?: boolean;
  pagination?: any;
}

export function UsersPageContent({ users = [], isLoading, pagination }: UsersPageContentProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(142,71%,45%)]"></div>
      </div>
    );
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.account_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 bg-[hsl(142,71%,45%)] rounded-full"></div>
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A1A]">User Management</h1>
            <p className="text-sm text-[#717171]">{users.length} total users</p>
          </div>
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
              placeholder="Search by name or email..."
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
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F8F7F3] border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#717171] uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#717171] uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#717171] uppercase tracking-wider">
                  Account Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#717171] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#717171] uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-[#717171] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user, index) => {
                const initials = user.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '?';
                const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-yellow-500', 'bg-indigo-500'];
                const color = colors[index % colors.length];
                const joinDate = user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A';
                
                return (
                  <tr key={user.id} className="hover:bg-[#FCFBF7] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center text-white font-bold text-sm`}>
                          {initials}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#1A1A1A]">{user.name || 'Unknown'}</p>
                          <p className="text-xs text-[#717171]">ID: {user.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-[#717171]" />
                        <span className="text-sm text-[#1A1A1A]">{user.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-indigo-50 text-indigo-600 capitalize">
                        {user.account_type || 'student'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                        user.account_status === 'active' ? 'bg-green-50 text-green-600' :
                        user.account_status === 'suspended' ? 'bg-red-50 text-red-600' :
                        'bg-yellow-50 text-yellow-600'
                      } capitalize`}>
                        {user.account_status || 'active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#717171]">
                      {joinDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Reset Password"
                        >
                          <Key className="w-4 h-4 text-[#717171]" />
                        </button>
                        <button
                          className="p-2 hover:bg-yellow-50 rounded-lg transition-colors"
                          title="Suspend User"
                        >
                          <Ban className="w-4 h-4 text-yellow-600" />
                        </button>
                        <button
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                          <MoreVertical className="w-4 h-4 text-[#717171]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-[#717171]">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
            </p>
            <div className="flex gap-2">
              <button
                disabled={pagination.page === 1}
                className="px-4 py-2 text-sm font-medium text-[#717171] bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                className="px-4 py-2 text-sm font-medium text-white bg-[hsl(142,71%,45%)] rounded-lg hover:bg-[hsl(142,71%,40%)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
