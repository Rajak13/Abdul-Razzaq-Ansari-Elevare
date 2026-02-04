'use client';

import { useTheme } from 'next-themes';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import {
    Bell,
    Search,
    Package,
    StickyNote,
    CheckCircle,
    TrendingUp,
    ChevronDown,
    ArrowUp,
    Plus,
    RefreshCw,
    Mail,
    AlertCircle,
    Moon,
    Sun,
    User,
    Users,
    Shield,
    Clock
} from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ModernDashboardProps {
    metrics: any;
    isLoading: boolean;
    recentUsers?: any[];
    recentActivity?: any[];
}

export function ModernDashboard({ metrics, isLoading, recentUsers = [], recentActivity = [] }: ModernDashboardProps) {
    const { theme, setTheme } = useTheme();
    const { admin } = useAdminAuth();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diff = (now.getTime() - date.getTime()) / 1000; // seconds

        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100 transition-colors duration-200 min-h-screen font-sans pb-24">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-dashboard-primary rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-dashboard-primary/20">
                                E
                            </div>
                            <div>
                                <h1 className="text-lg font-bold tracking-tight">Dashboard</h1>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    Welcome, {admin?.email?.split('@')[0] || 'Admin'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm relative hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border border-slate-100 dark:border-slate-700">
                                <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-800"></span>
                            </button>
                            <div className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-800 shadow-sm bg-slate-200 flex items-center justify-center overflow-hidden">
                                {/* Placeholder avatar if no image */}
                                <User className="w-6 h-6 text-slate-500" />
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 relative hidden sm:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            className="w-full bg-white dark:bg-slate-800 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-dashboard-primary/50 shadow-sm dark:placeholder-slate-500 outline-none transition-all placeholder:text-slate-400"
                            placeholder="Search resources, users, tasks..."
                            type="text"
                        />
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">

                {/* Mobile Search (only visible on small screens) */}
                <div className="relative sm:hidden">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        className="w-full bg-white dark:bg-slate-800 border-none rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-dashboard-primary shadow-sm dark:placeholder-slate-500 outline-none"
                        placeholder="Search..."
                        type="text"
                    />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100 dark:border-slate-700/50">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center">
                                <Package className="w-5 h-5 text-dashboard-primary" />
                            </div>
                            <span className="text-xs font-semibold px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg">+2.5%</span>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{isLoading ? '...' : metrics?.totalResources || 0}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Resources</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100 dark:border-slate-700/50">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center">
                                <StickyNote className="w-5 h-5 text-blue-500" />
                            </div>
                            <span className="text-xs font-semibold px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">+5%</span>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{isLoading ? '...' : metrics?.totalNotes || 0}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Active Notes</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100 dark:border-slate-700/50">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center">
                                <CheckCircle className="w-5 h-5 text-orange-500" />
                            </div>
                            <span className="text-xs font-semibold px-2 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-lg">~ stable</span>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{isLoading ? '...' : metrics?.totalTasks || 0}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Pending Tasks</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100 dark:border-slate-700/50">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center">
                                <Users className="w-5 h-5 text-purple-500" />
                            </div>
                            <span className="text-xs font-semibold px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg">+12%</span>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{isLoading ? '...' : metrics?.totalUsers || 0}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Users</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Visitors Chart */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100 dark:border-slate-700/50">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="font-semibold text-slate-500 dark:text-slate-400 text-sm uppercase tracking-wider">
                                    Active Users
                                </h3>
                                <p className="text-4xl font-bold mt-2 text-slate-800 dark:text-white">
                                    {isLoading ? '...' : metrics?.activeUsersDaily || 0}
                                </p>
                            </div>
                            <div className="flex items-center text-dashboard-primary text-sm font-bold bg-green-50 dark:bg-green-900/10 px-3 py-1 rounded-full">
                                <TrendingUp className="w-4 h-4 mr-1" />
                                Daily
                            </div>
                        </div>
                        <div className="h-40 w-full flex items-end gap-1 relative overflow-hidden">
                            <svg
                                className="absolute inset-0 w-full h-full"
                                viewBox="0 0 400 100"
                                preserveAspectRatio="none"
                            >
                                <path
                                    className="text-dashboard-primary opacity-10"
                                    d="M0,100 Q40,40 80,80 T160,20 T240,60 T320,10 T400,50 V100 H0 Z"
                                    fill="currentColor"
                                ></path>
                                <path
                                    className="text-dashboard-primary"
                                    d="M0,100 Q40,40 80,80 T160,20 T240,60 T320,10 T400,50"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    vectorEffect="non-scaling-stroke"
                                ></path>
                                <circle
                                    className="fill-dashboard-primary"
                                    cx="400"
                                    cy="50"
                                    r="4"
                                ></circle>
                            </svg>
                        </div>
                    </div>

                    {/* Growth Summary */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100 dark:border-slate-700/50">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="font-bold text-lg">Growth Summary</h3>
                            <div className="bg-slate-50 dark:bg-slate-700 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 border border-slate-200 dark:border-slate-600 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600">
                                Month <ChevronDown className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div className="flex justify-between mb-8">
                            <div className="space-y-1">
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                                    Total Users
                                </p>
                                <p className="font-bold text-xl">{isLoading ? '...' : metrics?.totalUsers || 0}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                                    New Users
                                </p>
                                <p className="font-bold text-xl flex items-center gap-1">
                                    {isLoading ? '...' : metrics?.activeUsersWeekly || 0} <ArrowUp className="w-4 h-4 text-dashboard-primary" />
                                </p>
                            </div>
                            <div className="text-right space-y-1">
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                                    Growth
                                </p>
                                <p className="font-bold text-xl text-dashboard-primary">+10%</p>
                            </div>
                        </div>
                        <div className="flex items-end justify-between h-32 px-2 gap-2">
                            <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-t-lg h-[40%] hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"></div>
                            <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-t-lg h-[25%] hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"></div>
                            <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-t-lg h-[55%] hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"></div>
                            <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-t-lg h-[35%] hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"></div>
                            <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-t-lg h-[45%] hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"></div>
                            <div className="flex-1 bg-dashboard-primary rounded-t-lg h-[85%] relative hover:opacity-90 transition-opacity">
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-dashboard-primary border-2 border-white dark:border-slate-800 shadow-sm"></div>
                            </div>
                            <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-t-lg h-[60%] hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"></div>
                            <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-t-lg h-[20%] hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"></div>
                            <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-t-lg h-[50%] hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"></div>
                        </div>
                    </div>
                </div>

                {/* Recent Users & Activity Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Recent Users - Takes 2 cols on large screens via col-span-2 if needed, but lets keep it simple */}
                    <div className="lg:col-span-3"> {/* Full width row for users list to scroll horizontally nicely */}
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">Recent Users</h3>
                            <Link href="/admin/users" className="text-dashboard-primary text-sm font-semibold hover:underline">
                                View All
                            </Link>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50">
                            <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
                                {recentUsers && recentUsers.length > 0 ? (
                                    recentUsers.map((user: any, i: number) => (
                                        <div key={user.id || i} className="flex-shrink-0 flex flex-col items-center min-w-[80px] group cursor-pointer">
                                            <div className={`w-14 h-14 rounded-full border-2 ${i === 0 ? 'border-dashboard-primary p-0.5' : 'border-slate-100 dark:border-slate-700'} transition-transform group-hover:scale-105`}>
                                                <div className="w-full h-full rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                                    {user.avatarUrl ? (
                                                        <img src={user.avatarUrl} alt={user.fullName || user.username} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User className="w-6 h-6 text-slate-400" />
                                                    )}
                                                </div>
                                            </div>
                                            <span className="text-xs mt-3 font-semibold text-slate-700 dark:text-slate-300 truncate w-20 text-center">{user.fullName?.split(' ')[0] || user.username || 'User'}</span>
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate w-20 text-center">New Member</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex items-center justify-center p-8 w-full">
                                        <p className="text-sm text-slate-500">No recent users found</p>
                                    </div>
                                )}
                                <div className="flex-shrink-0 flex flex-col items-center min-w-[80px] group cursor-pointer justify-start pt-0.5">
                                    <div className="w-14 h-14 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center hover:border-dashboard-primary hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                        <Plus className="w-6 h-6 text-slate-400 group-hover:text-dashboard-primary" />
                                    </div>
                                    <span className="text-xs mt-3 font-medium text-slate-500 group-hover:text-dashboard-primary">Invite</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Activity Section */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50">
                    <h3 className="font-bold text-lg mb-6">Recent Activity</h3>
                    <div className="space-y-6">
                        {recentActivity && recentActivity.length > 0 ? (
                            recentActivity.map((log: any, i: number) => (
                                <div key={log.id || i} className="flex gap-4 relative group">
                                    {i !== recentActivity.length - 1 && (
                                        <div className="absolute left-3 top-8 bottom-[-24px] w-[2px] bg-slate-100 dark:bg-slate-800"></div>
                                    )}
                                    <div className={`z-10 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-slate-800 shrink-0 mt-1
                      ${log.status === 'failure' || log.severity === 'high' ? 'bg-red-500' : 'bg-dashboard-primary'} shadow-sm
                  `}>
                                        {log.status === 'failure' || log.severity === 'high' ? (
                                            <AlertCircle className="w-3 h-3 text-white" />
                                        ) : (
                                            <Clock className="w-3 h-3 text-white" />
                                        )}
                                    </div>
                                    <div className="flex-1 group-hover:translate-x-1 transition-transform duration-200">
                                        <div className="flex justify-between items-start">
                                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{log.action || 'System Event'}</h4>
                                            <span className="text-xs text-slate-400 font-medium">{formatDate(log.createdAt || log.timestamp)}</span>
                                        </div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                            {log.details || log.message || 'No details available.'}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
                                <Shield className="w-12 h-12 mb-3 opacity-20" />
                                <p className="text-sm font-medium">No recent activity detected.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Dark Mode Toggle */}
            <button
                className="fixed right-6 bottom-24 w-12 h-12 bg-white dark:bg-slate-800 shadow-xl rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-700 z-40 transition-transform active:scale-95 hover:scale-105"
                onClick={toggleTheme}
                aria-label="Toggle dark mode"
            >
                {theme === 'dark' ? (
                    <Sun className="w-6 h-6 text-dashboard-primary" />
                ) : (
                    <Moon className="w-6 h-6 text-dashboard-primary" />
                )}
            </button>
        </div>
    );
}
