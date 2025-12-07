'use client';

import { useAuth } from '@/contexts/auth-context';
import ProtectedRoute from '@/components/auth/protected-route';


export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Good afternoon, {user?.name?.split(' ')[0] || 'Student'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Here's an overview of your academic progress
          </p>
        </div>
      </div>
    </ProtectedRoute>
  );
}
