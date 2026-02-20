'use client';

import { Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { ReportDialog } from './report-dialog';

interface ReportButtonProps {
  contentType: 'resource' | 'group' | 'message' | 'comment';
  contentId: string;
  variant?: 'icon' | 'text' | 'menu-item';
  className?: string;
}

export function ReportButton({
  contentType,
  contentId,
  variant = 'icon',
  className
}: ReportButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDialogOpen(true);
  };
  
  if (variant === 'menu-item') {
    return (
      <>
        <div
          onClick={handleClick}
          className={`flex items-center cursor-pointer ${className}`}
        >
          <Flag className="h-4 w-4 mr-2" />
          <span>Report</span>
        </div>
        
        <ReportDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          contentType={contentType}
          contentId={contentId}
        />
      </>
    );
  }
  
  return (
    <>
      <Button
        variant="outline"
        size={variant === 'icon' ? 'icon' : 'sm'}
        onClick={handleClick}
        className={className}
        type="button"
      >
        <Flag className="h-4 w-4" />
        {variant === 'text' && <span className="ml-2">Report</span>}
      </Button>
      
      <ReportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contentType={contentType}
        contentId={contentId}
      />
    </>
  );
}
