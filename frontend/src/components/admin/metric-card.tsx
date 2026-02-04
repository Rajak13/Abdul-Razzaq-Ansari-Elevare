'use client';

import { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  type?: 'success' | 'important' | 'warning';
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  isLoading?: boolean;
}

export function MetricCard({
  title,
  value,
  icon,
  type = 'success',
  trend,
  isLoading,
}: MetricCardProps) {
  if (isLoading) {
    return (
      <div className="admin-metric-card">
        <Skeleton className="w-12 h-12 rounded-lg" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-32" />
        {trend && <Skeleton className="h-3 w-20" />}
      </div>
    );
  }

  return (
    <div className="admin-metric-card" data-type={type}>
      <div className="admin-metric-icon">{icon}</div>
      <div className="admin-metric-title">{title}</div>
      <div className="admin-metric-value">{value}</div>
      <div className="admin-metric-chart">
        {/* Space for mini chart/sparkline */}
      </div>
      {trend && (
        <div
          className={`admin-metric-trend ${
            trend.isPositive ? 'positive' : 'negative'
          }`}
        >
          {trend.isPositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          <span>
            {trend.isPositive ? '+' : '-'}
            {Math.abs(trend.value)}%
          </span>
          <span className="text-muted-foreground">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
