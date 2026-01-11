'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { 
  File,
  Calendar,
  Search,
  User,
  Plus,
  LogOut,
  Settings,
  HelpCircle,
  Bell,
  Shield,
  Palette,
  Download
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const navigationItems = [
  { 
    name: 'Files', 
    href: '/files', 
    icon: File, 
    description: 'Manage your study materials and documents',
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
  },
  { 
    name: 'Resources', 
    href: '/resources', 
    icon: Calendar, 
    description: 'Discover and share educational resources',
    color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
  },
  { 
    name: 'Search', 
    href: '/search', 
    icon: Search, 
    description: 'Find content across your study materials',
    color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
  },
  { 
    name: 'Profile', 
    href: '/profile', 
    icon: User, 
    description: 'Manage your account settings',
    color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
  },
];

const quickActions = [
  { 
    name: 'New Task', 
    href: '/tasks/new', 
    icon: Plus, 
    description: 'Create a new task or assignment',
    color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
  },
  { 
    name: 'New Note', 
    href: '/notes/create', 
    icon: Plus, 
    description: 'Start writing a new note',
    color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400'
  },
];

const accountActions = [
  { 
    name: 'Settings', 
    href: '/settings', 
    icon: Settings, 
    description: 'App preferences and configuration',
    color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
  },
  { 
    name: 'Notifications', 
    href: '/notifications', 
    icon: Bell, 
    description: 'Manage your notifications',
    color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
  },
  { 
    name: 'Privacy & Security', 
    href: '/privacy', 
    icon: Shield, 
    description: 'Privacy settings and security options',
    color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
  },
  { 
    name: 'Appearance', 
    href: '/appearance', 
    icon: Palette, 
    description: 'Customize themes and display settings',
    color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400'
  },
  { 
    name: 'Export Data', 
    href: '/export', 
    icon: Download, 
    description: 'Download your data and backups',
    color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
  },
  { 
    name: 'Help & Support', 
    href: '/help', 
    icon: HelpCircle, 
    description: 'Get help and contact support',
    color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'
  },
];

export default function MorePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    router.push('/');
  };

  const displayName = user?.name || user?.email || 'User';
  const displayEmail = user?.email || '';
  const avatarInitial = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto px-4 py-6 pb-24 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">More</h1>
          <p className="text-muted-foreground">Access additional features and settings</p>
        </div>

        {/* User Profile Section */}
        <Card className="mb-8 border-white/20 bg-white/50 shadow-xl backdrop-blur-sm dark:border-slate-700/30 dark:bg-slate-800/50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                {avatarInitial}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{displayName}</h2>
                <p className="text-sm text-muted-foreground">{displayEmail}</p>
              </div>
              <Link href="/profile">
                <Button variant="outline" size="sm" className="hidden sm:flex">
                  <User className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Navigation Items */}
          <Card className="border-white/20 bg-white/50 shadow-xl backdrop-blur-sm dark:border-slate-700/30 dark:bg-slate-800/50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center">
                <Search className="h-5 w-5 mr-2 text-primary" />
                Navigation
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {navigationItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center space-x-4 p-4 transition-all duration-200 hover:bg-accent/50 group"
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.color} group-hover:scale-110 transition-transform duration-200`}>
                      <item.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-primary transition-colors">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-white/20 bg-white/50 shadow-xl backdrop-blur-sm dark:border-slate-700/30 dark:bg-slate-800/50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center">
                <Plus className="h-5 w-5 mr-2 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {quickActions.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center space-x-4 p-4 transition-all duration-200 hover:bg-accent/50 group"
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.color} group-hover:scale-110 transition-transform duration-200`}>
                      <item.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-primary transition-colors">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Account & Settings - Full width */}
        <Card className="mt-8 border-white/20 bg-white/50 shadow-xl backdrop-blur-sm dark:border-slate-700/30 dark:bg-slate-800/50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center">
              <Settings className="h-5 w-5 mr-2 text-primary" />
              Account & Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
              {accountActions.map((item, index) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center space-x-4 p-4 transition-all duration-200 hover:bg-accent/50 group"
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.color} group-hover:scale-110 transition-transform duration-200`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-primary transition-colors text-sm">{item.name}</h3>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Logout Button */}
        <Card className="mt-8 border-white/20 bg-white/50 shadow-xl backdrop-blur-sm dark:border-slate-700/30 dark:bg-slate-800/50">
          <CardContent className="p-6">
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="w-full sm:w-auto"
              size="lg"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}