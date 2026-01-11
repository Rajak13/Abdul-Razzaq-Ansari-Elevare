'use client'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/contexts/auth-context'
import { AlertCircle, CheckCircle, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface SummaryGeneratorProps {
  noteContent: string
  noteId?: string
  onSummaryGenerated: (summary: string) => void
  disabled?: boolean
  className?: string
}

interface SummarizationResponse {
  summary: string
  processingTime: number
  chunksProcessed: number
  model: string
}

type GenerationState = 'idle' | 'generating' | 'success' | 'error'

export function SummaryGenerator({
  noteContent,
  noteId,
  onSummaryGenerated,
  disabled = false,
  className = ''
}: SummaryGeneratorProps) {
  const [state, setState] = useState<GenerationState>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  // Get auth token for API requests
  const { token } = useAuth()

  const simulateProgress = () => {
    setProgress(0)
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval)
          return 90 // Stop at 90% until actual completion
        }
        return prev + Math.random() * 10
      })
    }, 300)
    return interval
  }

  const generateSummary = async () => {
    console.log('🚀 SummaryGenerator: generateSummary called');
    console.log('📝 SummaryGenerator: noteContent length:', noteContent.trim().length);
    console.log('🔑 SummaryGenerator: noteId:', noteId);
    console.log('🔒 SummaryGenerator: token exists:', !!token);
    console.log('⚡ SummaryGenerator: isGenerating:', isGenerating);
    console.log('📊 SummaryGenerator: current state:', state);

    if (!noteContent.trim()) {
      console.log('❌ SummaryGenerator: No content, showing error toast');
      toast.error('Please add some content to your note before generating a summary.');
      return;
    }

    if (isGenerating) {
      console.log('⏸️ SummaryGenerator: Already generating, preventing duplicate request');
      return; // Prevent multiple simultaneous requests
    }

    console.log('✅ SummaryGenerator: Starting generation process');
    setIsGenerating(true);
    setState('generating');
    setError(null);
    
    const progressInterval = simulateProgress();
    const startTime = Date.now();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add note ID and auth token if available for database saving
      if (noteId && token) {
        headers['x-note-id'] = noteId;
        headers['authorization'] = `Bearer ${token}`;
        console.log('🔐 SummaryGenerator: Added auth headers for noteId:', noteId);
      } else {
        console.log('⚠️ SummaryGenerator: Missing noteId or token, summary won\'t be saved to DB');
      }
      
      console.log('📡 SummaryGenerator: Making API request to /api/generate-summary');
      const response = await fetch('/api/generate-summary', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text: noteContent.trim(),
          maxLength: 150,
          minLength: 50
        }),
      });

      console.log('📨 SummaryGenerator: API response status:', response.status);
      console.log('📨 SummaryGenerator: API response ok:', response.ok);

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        console.log('❌ SummaryGenerator: API error response:', errorData);
        setError(errorData.userMessage || 'Failed to generate summary');
        setState('error');
        toast.error(errorData.userMessage || 'Failed to generate summary');
        return;
      }

      const data: SummarizationResponse = await response.json();
      console.log('✅ SummaryGenerator: API success response:', data);
      const totalTime = Date.now() - startTime;
      
      setState('success');
      console.log('📤 SummaryGenerator: Calling onSummaryGenerated with summary:', data.summary.substring(0, 50) + '...');
      
      // Call the callback with the generated summary
      onSummaryGenerated(data.summary);
      
      // Show success message only once
      console.log('🎉 SummaryGenerator: Showing success toast');
      toast.success('Summary generated successfully!', {
        description: `Processed in ${(totalTime / 1000).toFixed(1)}s`
      });

      // Reset to idle after a brief success state
      setTimeout(() => {
        console.log('🔄 SummaryGenerator: Resetting to idle state');
        setState('idle');
        setProgress(0);
      }, 2000);

    } catch (networkError) {
      clearInterval(progressInterval);
      console.error('🌐 SummaryGenerator: Network error:', networkError);
      
      setError('Failed to connect to summarization service');
      setState('error');
      toast.error('Failed to connect to summarization service');
    } finally {
      console.log('🏁 SummaryGenerator: Setting isGenerating to false');
      setIsGenerating(false);
    }
  }

  const handleRetry = () => {
    generateSummary()
  }

  const getButtonContent = () => {
    switch (state) {
      case 'generating':
        return (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        )
      case 'success':
        return (
          <>
            <CheckCircle className="mr-2 h-4 w-4" />
            Generated!
          </>
        )
      case 'error':
        return (
          <>
            <AlertCircle className="mr-2 h-4 w-4" />
            Failed
          </>
        )
      default:
        return (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Summary
          </>
        )
    }
  }

  const getButtonVariant = () => {
    switch (state) {
      case 'success':
        return 'default' as const
      case 'error':
        return 'destructive' as const
      default:
        return 'default' as const
    }
  }

  const isButtonDisabled = disabled || state === 'generating' || isGenerating || !noteContent.trim()

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main Generate Button */}
      <div className="flex items-center gap-2">
        <Button
          onClick={generateSummary}
          disabled={isButtonDisabled}
          variant={getButtonVariant()}
          size="sm"
          className="w-full"
        >
          {getButtonContent()}
        </Button>

        {/* Retry button for errors */}
        {state === 'error' && (
          <Button
            onClick={handleRetry}
            variant="outline"
            size="sm"
            className="flex-shrink-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Progress indicator */}
      {state === 'generating' && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            AI is analyzing your content...
          </p>
        </div>
      )}

      {/* Error message */}
      {state === 'error' && error && (
        <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 p-2 rounded border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}
    </div>
  )
}