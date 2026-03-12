'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { SummaryStalnessIndicator } from './summary-staleness-indicator'
import { Note } from '@/types/note'
import { 
  Bot, 
  Edit3, 
  Save, 
  X, 
  Clock, 
  Sparkles,
  Copy,
  Check,
  RefreshCw
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

interface SummaryDisplayProps {
  note: Note
  summary: string
  currentContent?: string
  isEditable?: boolean
  onSummaryChanged?: (newSummary: string) => void
  onRegenerateClick?: () => void
  isRegenerating?: boolean
  className?: string
}

export function SummaryDisplay({
  note,
  summary,
  currentContent,
  isEditable = true,
  onSummaryChanged,
  onRegenerateClick,
  isRegenerating = false,
  className = ''
}: SummaryDisplayProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedSummary, setEditedSummary] = useState(summary)
  const [isCopied, setIsCopied] = useState(false)

  console.log('🎨 SummaryDisplay: Component rendered with props:', {
    noteId: note.id,
    summaryLength: summary.length,
    summaryPreview: summary.substring(0, 50) + '...',
    summaryGeneratedAt: note.summary_generated_at,
    isRegenerating
  });

  // Update edited summary when prop changes
  useEffect(() => {
    console.log('🔄 SummaryDisplay: Summary prop changed, updating editedSummary');
    console.log('📝 SummaryDisplay: New summary:', summary.substring(0, 50) + '...');
    setEditedSummary(summary)
  }, [summary])

  const handleStartEdit = () => {
    setIsEditing(true)
    setEditedSummary(summary)
  }

  const handleSaveEdit = () => {
    if (editedSummary.trim() !== summary) {
      onSummaryChanged?.(editedSummary.trim())
      // Only show toast for saved notes, not temporary ones
      if (note.id !== 'temp-note') {
        toast.success('Summary updated successfully')
      }
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditedSummary(summary)
    setIsEditing(false)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary)
      setIsCopied(true)
      toast.success('Summary copied to clipboard')
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      toast.error('Failed to copy summary')
    }
  }

  const formatGeneratedDate = (dateString?: string) => {
    console.log('📅 SummaryDisplay: formatGeneratedDate called with:', dateString);
    
    if (!dateString) {
      console.log('⚠️ SummaryDisplay: No dateString provided');
      return null;
    }
    
    const date = new Date(dateString);
    const now = new Date();
    
    console.log('📅 SummaryDisplay: Parsed date:', date.toISOString());
    console.log('📅 SummaryDisplay: Current time:', now.toISOString());
    
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    console.log('📅 SummaryDisplay: Time differences:', {
      diffInMs,
      diffInMinutes,
      diffInHours,
      diffInDays
    });
    
    let result;
    if (diffInMinutes < 1) {
      result = 'Generated just now';
    } else if (diffInMinutes < 60) {
      result = `Generated ${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      result = `Generated ${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    } else if (diffInDays < 7) {
      result = `Generated ${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    } else {
      result = `Generated on ${date.toLocaleDateString()}`;
    }
    
    console.log('📅 SummaryDisplay: Formatted result:', result);
    return result;
  }

  // Don't render if no summary
  if (!summary.trim()) {
    console.log('🚫 SummaryDisplay: No summary to display, returning null');
    return null
  }

  console.log('🎨 SummaryDisplay: Rendering summary display with summary:', summary.substring(0, 50) + '...');

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Staleness Indicator */}
      <SummaryStalnessIndicator
        note={note}
        currentContent={currentContent}
        onRegenerateClick={onRegenerateClick}
        isRegenerating={isRegenerating}
      />

      {/* Summary Card */}
      <Card className="border-white/20 bg-white/50 shadow-xl backdrop-blur-sm dark:border-slate-700/30 dark:bg-slate-800/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center text-gray-900 dark:text-white">
              <Bot className="mr-2 h-5 w-5 text-gray-600 dark:text-gray-400" />
              AI Summary
            </CardTitle>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                title="Copy summary"
              >
                {isCopied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>

              {isEditable && !isEditing && onRegenerateClick && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRegenerateClick}
                  disabled={isRegenerating}
                  className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  title="Regenerate summary"
                >
                  <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                </Button>
              )}

              {isEditable && !isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleStartEdit}
                  className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  title="Edit summary"
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              )}

              {isEditing && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSaveEdit}
                    className="h-8 w-8 p-0 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                    title="Save changes"
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    title="Cancel editing"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Generation Timestamp */}
          {note.summary_generated_at && note.id !== 'temp-note' && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatGeneratedDate(note.summary_generated_at)}</span>
            </div>
          )}
          
          {/* For unsaved notes, show a different indicator */}
          {note.id === 'temp-note' && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Generated just now (unsaved)</span>
            </div>
          )}
        </CardHeader>

        <CardContent className="pt-0">
          {isEditing ? (
            <div className="space-y-3">
              <Textarea
                value={editedSummary}
                onChange={(e) => setEditedSummary(e.target.value)}
                placeholder="Edit your summary..."
                className="min-h-[100px] resize-none"
                autoFocus
              />
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {editedSummary.length} characters
                </span>
                <span>
                  Press Ctrl+Enter to save
                </span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed break-words overflow-hidden">
              <p className="whitespace-pre-wrap" style={{ wordBreak: 'break-word' }}>
                {summary}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editing Instructions */}
      {isEditing && (
        <div className="text-xs text-muted-foreground bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700">
          <p>
            <strong>Tip:</strong> You can edit the AI-generated summary to better match your needs. 
            {note.id === 'temp-note' 
              ? ' The edited summary will be saved when you save the note.'
              : ' The edited version will be saved with your note.'
            }
          </p>
        </div>
      )}

      {/* Unsaved note warning */}
      {note.id === 'temp-note' && !isEditing && (
        <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 p-2 rounded border border-amber-200 dark:border-amber-800">
          <p>
            <strong>Note:</strong> This summary will be saved when you save the note. 
            You can edit it now or regenerate it later.
          </p>
        </div>
      )}
    </div>
  )
}

// Keyboard shortcut handler for save
export function useSummaryEditingShortcuts(
  isEditing: boolean,
  onSave: () => void,
  onCancel: () => void
) {
  useEffect(() => {
    if (!isEditing) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'Enter') {
          event.preventDefault()
          onSave()
        } else if (event.key === 'Escape') {
          event.preventDefault()
          onCancel()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isEditing, onSave, onCancel])
}