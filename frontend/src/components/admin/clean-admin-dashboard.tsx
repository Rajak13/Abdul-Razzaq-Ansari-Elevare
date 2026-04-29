'use client';

import { Package, FileText, CheckSquare, Users } from 'lucide-react';

interface DashboardProps {
  metrics?: any;
  recentUsers?: any[];
  recentActivity?: any[];
  isLoading?: boolean;
}

export function CleanAdminDashboard({ metrics, recentUsers = [], recentActivity = [], isLoading }: DashboardProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(142,71%,45%)]"></div>
      </div>
    );
  }

  const totalUsers = metrics?.totalUsers || 0;
  const totalResources = metrics?.totalResources || 0;
  const totalNotes = metrics?.totalNotes || 0;
  const totalTasks = metrics?.totalTasks || 0;
  const totalGroups = metrics?.totalGroups || 0;
  const newUsers = metrics?.rawData?.users?.new_registrations_today || 0;
  const activeDaily = metrics?.activeUsersDaily || 0;

  const growthRate = metrics?.rawData?.users?.new_registrations_week 
    ? Math.round((metrics.rawData.users.new_registrations_week / totalUsers) * 100)
    : 0;

  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const isCurrentMonth = new Date().getMonth() === i;
    return {
      month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
      value: isCurrentMonth ? totalUsers : Math.floor(totalUsers * (0.7 + (i / 12) * 0.3)),
      isCurrent: isCurrentMonth
    };
  });

  const maxValue = Math.max(...monthlyData.map(d => d.value), 1); // Ensure at least 1 to avoid division by zero

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 bg-[hsl(142,71%,45%)] rounded-full"></div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Dashboard</h1>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column */}
        <div className="flex-1 space-y-6">
          {/* Top Stats Grid - Horizontal Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                  <Package className="w-5 h-5 text-[hsl(142,71%,45%)]" />
                </div>
                <span className="text-sm font-medium text-[#717171]">Resources</span>
              </div>
              <span className="text-2xl font-bold text-[#1A1A1A]">{totalResources.toLocaleString()}</span>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[hsl(142,71%,45%)]" />
                </div>
                <span className="text-sm font-medium text-[#717171]">Notes</span>
              </div>
              <span className="text-2xl font-bold text-[#1A1A1A]">{totalNotes.toLocaleString()}</span>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                  <CheckSquare className="w-5 h-5 text-orange-400" />
                </div>
                <span className="text-sm font-medium text-[#717171]">Tasks</span>
              </div>
              <span className="text-2xl font-bold text-[#1A1A1A]">{totalTasks.toLocaleString()}</span>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-sm font-medium text-[#717171]">Groups</span>
              </div>
              <span className="text-2xl font-bold text-[#1A1A1A]">{totalGroups.toLocaleString()}</span>
            </div>
          </div>

          {/* Visitors Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-lg text-[#1A1A1A]">Visitors</h3>
              <span className="text-2xl font-bold text-[#1A1A1A]">{totalUsers.toLocaleString()}</span>
            </div>
            
            <div className="relative h-24 w-full mt-4">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 100">
                <path 
                  d={`M0,${100 - (monthlyData[0].value / maxValue * 80)} ${monthlyData.map((d, i) => 
                    `L${(i / 11) * 400},${100 - (d.value / maxValue * 80)}`
                  ).join(' ')}`}
                  fill="none" 
                  stroke="hsl(142, 71%, 45%)" 
                  strokeWidth="3"
                />
                {monthlyData.map((d, i) => {
                  const cx = (i / 11) * 400;
                  const cy = 100 - (d.value / maxValue * 80);
                  // Only render circle if values are valid numbers
                  if (d.isCurrent && !isNaN(cx) && !isNaN(cy)) {
                    return (
                      <circle 
                        key={i}
                        cx={cx} 
                        cy={cy} 
                        r="4" 
                        fill="hsl(142, 71%, 45%)" 
                        stroke="white" 
                        strokeWidth="2"
                      />
                    );
                  }
                  return null;
                })}
              </svg>
            </div>
          </div>

          {/* User Stats */}
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
              <div>
                <p className="text-xs text-[#717171] mb-1">Total Users</p>
                <p className="text-xl font-bold text-[#1A1A1A]">{totalUsers.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-[#717171] mb-1">New User</p>
                <div className="flex items-center gap-1">
                  <p className="text-xl font-bold text-[#1A1A1A]">{newUsers}</p>
                  {newUsers > 0 && (
                    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-[#717171] mb-1">Growth</p>
                <p className="text-xl font-bold text-[#1A1A1A]">+{growthRate}%</p>
              </div>
              <div>
                <p className="text-xs text-[#717171] mb-1">Period</p>
                <div className="flex items-center gap-1 cursor-pointer">
                  <p className="text-xl font-bold text-[#1A1A1A]">Month</p>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Monthly Bar Chart */}
            <div className="flex items-end justify-between h-48 w-full gap-2 px-2">
              {monthlyData.map((data, index) => (
                <div key={index} className="flex flex-col items-center flex-1 gap-2">
                  <div 
                    className={`w-full rounded-md ${data.isCurrent ? 'bg-[hsl(142,71%,45%)]' : 'bg-indigo-50'} relative`}
                    style={{ height: `${(data.value / maxValue) * 100}%` }}
                  >
                    {data.isCurrent && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white border-2 border-[hsl(142,71%,45%)]"></div>
                    )}
                  </div>
                  <span className={`text-[10px] ${data.isCurrent ? 'font-bold text-[#1A1A1A]' : 'text-[#717171]'}`}>
                    {data.month}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <aside className="w-full lg:w-80 space-y-6">
          {/* Server Status */}
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h3 className="font-bold mb-6 text-[#1A1A1A]">Server Status</h3>
            <div className="flex items-end gap-[2px] h-20 mb-6">
              {Array.from({ length: 27 }, (_, i) => (
                <div 
                  key={i} 
                  className="w-1 bg-[hsl(142,71%,45%)]" 
                  style={{ height: `${Math.random() * 100}%` }}
                ></div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div>
                <p className="text-[#717171]">Country</p>
                <p className="font-bold text-[#1A1A1A]">Nepal</p>
              </div>
              <div>
                <p className="text-[#717171]">Domain</p>
                <p className="font-bold text-[#1A1A1A]">elevare.com</p>
              </div>
              <div>
                <p className="text-[#717171]">Response</p>
                <p className="font-bold text-[#1A1A1A]">2.0 mbps</p>
              </div>
            </div>
          </div>

          {/* Recent Users */}
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-[#1A1A1A]">Recent Users</h3>
              <a className="text-[10px] text-[hsl(142,71%,45%)] font-bold" href="/admin/users">View All</a>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {recentUsers.slice(0, 8).map((user, index) => {
                const initials = user.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '?';
                const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-yellow-500', 'bg-indigo-500', 'bg-red-500', 'bg-teal-500'];
                const color = colors[index % colors.length];
                
                return (
                  <div key={user.id} className="flex flex-col items-center gap-1">
                    <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center text-white font-bold text-xs`}>
                      {initials}
                    </div>
                    <span className="text-[10px] font-medium text-[#1A1A1A] truncate w-full text-center">
                      {user.name?.split(' ')[0] || 'User'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h3 className="font-bold mb-6 text-[#1A1A1A]">Recent Activity</h3>
            <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
              <button className="flex-1 bg-[hsl(142,71%,45%)] text-white text-[10px] font-bold py-2 rounded-md">
                Activity
              </button>
              <button className="flex-1 text-[#717171] text-[10px] font-bold py-2">
                Update
              </button>
            </div>
            <div className="space-y-6 relative ml-2">
              <div className="absolute left-2.5 top-2 bottom-2 w-[1px] bg-gray-200"></div>
              {recentActivity.slice(0, 4).map((activity, index) => {
                const colors = ['bg-green-500', 'bg-gray-800', 'bg-orange-400', 'bg-orange-300'];
                const color = colors[index % colors.length];
                const timeAgo = activity.timestamp 
                  ? Math.floor((Date.now() - new Date(activity.timestamp).getTime()) / (1000 * 60 * 60))
                  : 2;
                
                return (
                  <div key={activity.id || index} className="relative flex gap-4 pl-8">
                    <div className={`absolute left-[-2px] top-1 w-4 h-4 rounded ${color} z-10`}></div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-[10px] font-bold text-[#1A1A1A]">
                          {activity.action_type?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Activity'}
                        </p>
                        <p className="text-[10px] text-[#717171]">{timeAgo} Hour Ago</p>
                      </div>
                      <p className="text-[10px] text-[#717171] leading-tight">
                        {activity.details?.description || activity.target_entity || 'System activity recorded'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
