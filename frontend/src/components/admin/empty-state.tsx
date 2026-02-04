'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="admin-empty-state">
      <div className="admin-empty-illustration">
        <div className="text-center">
          {icon}
          <p className="text-xs mt-2">
            Space for custom Canva illustration
            <br />
            (200x150px)
          </p>
        </div>
      </div>
      <h3 className="admin-empty-title">{title}</h3>
      <p className="admin-empty-description">{description}</p>
      {action && (
        <Button onClick={action.onClick} className="admin-btn-primary">
          {action.label}
        </Button>
      )}
    </div>
  );
}
