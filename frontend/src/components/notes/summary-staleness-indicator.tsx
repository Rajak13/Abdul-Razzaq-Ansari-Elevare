'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Note } from '@/types/note';
import { useContentChangeDetection } from '@/hooks/use-content-change-detection';

interface SummaryStalnessIndicatorProps {
  note: Note;
  currentContent?: string;
  onRegenerateClick?: () => void;
  isRegenerating?: boolean;
  className?: string;
}

export function SummaryStalnessIndicator({
  note,
  currentContent,
  onRegenerateClick,
  isRegenerating = false,
  className = ''
}: SummaryStalnessIndicatorProps) {
  const { isOutdated, hasUnsavedChanges } = useContentChangeDetection(note, currentContent);

  // Don't show indicator if there's no summary or if summary is current
  if (!note.summary || (!isOutdated && !hasUnsavedChanges)) {
    return null;
  }

  return (
    <div className={`flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg mb-3 ${className}`}>
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <span className="text-sm text-amber-800 dark:text-amber-200">
          {hasUnsavedChanges ? 'Content changed' : 'Summary outdated'}
        </span>
      </div>

      {onRegenerateClick && !hasUnsavedChanges && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRegenerateClick}
          disabled={isRegenerating}
          className="h-7 px-2 text-amber-700 hover:text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:hover:text-amber-200 dark:hover:bg-amber-900"
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${isRegenerating ? 'animate-spin' : ''}`} />
          {isRegenerating ? 'Updating...' : 'Update'}
        </Button>
      )}
    </div>
  );
}