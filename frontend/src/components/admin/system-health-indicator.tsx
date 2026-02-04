'use client';

import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface SystemHealthIndicatorProps {
  status: 'healthy' | 'degraded' | 'critical';
  isLoading?: boolean;
}

export function SystemHealthIndicator({
  status,
  isLoading,
}: SystemHealthIndicatorProps) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border p-6">
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
    );
  }

  const statusConfig = {
    healthy: {
      icon: <CheckCircle className="w-6 h-6" />,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      title: 'System Healthy',
      description: 'All systems are operating normally',
    },
    degraded: {
      icon: <AlertCircle className="w-6 h-6" />,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      title: 'System Degraded',
      description: 'Some services are experiencing issues',
    },
    critical: {
      icon: <XCircle className="w-6 h-6" />,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      title: 'System Critical',
      description: 'Critical issues detected - immediate attention required',
    },
  };

  const config = statusConfig[status];

  return (
    <div
      className={`rounded-lg border p-6 ${config.bgColor} ${config.borderColor}`}
    >
      <div className="flex items-center gap-4">
        <div className={config.color}>{config.icon}</div>
        <div>
          <h3 className={`text-lg font-semibold ${config.color}`}>
            {config.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {config.description}
          </p>
        </div>
      </div>
    </div>
  );
}
