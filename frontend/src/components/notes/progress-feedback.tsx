'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Bot, 
  Clock, 
  FileText, 
  Zap, 
  X, 
  Pause, 
  Play,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'

interface ProgressStage {
  id: string
  name: string
  description: string
  estimatedDuration: number // in milliseconds
  completed: boolean
  current: boolean
  error?: string
}

interface ProgressFeedbackProps {
  isActive: boolean
  stages: ProgressStage[]
  currentStage?: string
  progress: number
  estimatedTimeRemaining?: number
  processingStats?: {
    textLength: number
    chunksTotal: number
    chunksProcessed: number
    averageChunkTime: number
  }
  onCancel?: () => void
  onPause?: () => void
  onResume?: () => void
  isPaused?: boolean
  canCancel?: boolean
  canPause?: boolean
  className?: string
}

export function ProgressFeedback({
  isActive,
  stages,
  currentStage,
  progress,
  estimatedTimeRemaining,
  processingStats,
  onCancel,
  onPause,
  onResume,
  isPaused = false,
  canCancel = true,
  canPause = false,
  className = ''
}: ProgressFeedbackProps) {
  const [elapsedTime, setElapsedTime] = useState(0)
  const [startTime] = useState(Date.now())

  // Update elapsed time
  useEffect(() => {
    if (!isActive || isPaused) return

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime)
    }, 1000)

    return () => clearInterval(interval)
  }, [isActive, isPaused, startTime])

  const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`
    }
    return `${remainingSeconds}s`
  }

  const getCurrentStageInfo = () => {
    return stages.find(stage => stage.id === currentStage) || stages.find(stage => stage.current)
  }

  const getProgressColor = () => {
    if (isPaused) return 'bg-yellow-500'
    if (progress >= 100) return 'bg-green-500'
    return 'bg-blue-500'
  }

  const currentStageInfo = getCurrentStageInfo()

  if (!isActive) return null

  return (
    <Card className={`border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center text-blue-900 dark:text-blue-100">
            <Bot className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" />
            AI Processing
            {isPaused && (
              <Badge variant="outline" className="ml-2 text-yellow-600 border-yellow-300">
                Paused
              </Badge>
            )}
          </CardTitle>

          <div className="flex items-center gap-2">
            {/* Pause/Resume Button */}
            {canPause && (
              <Button
                variant="ghost"
                size="sm"
                onClick={isPaused ? onResume : onPause}
                className="h-8 w-8 p-0"
                title={isPaused ? 'Resume processing' : 'Pause processing'}
              >
                {isPaused ? (
                  <Play className="h-4 w-4" />
                ) : (
                  <Pause className="h-4 w-4" />
                )}
              </Button>
            )}

            {/* Cancel Button */}
            {canCancel && onCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900"
                title="Cancel processing"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-blue-900 dark:text-blue-100">
              {currentStageInfo?.name || 'Processing...'}
            </span>
            <span className="text-blue-700 dark:text-blue-300">
              {Math.round(progress)}%
            </span>
          </div>
          
          <Progress 
            value={progress} 
            className="h-3 bg-blue-100 dark:bg-blue-900"
          />
          
          {currentStageInfo?.description && (
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {currentStageInfo.description}
            </p>
          )}
        </div>

        {/* Processing Statistics */}
        {processingStats && (
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileText className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                <span className="text-blue-700 dark:text-blue-300">
                  Text: {processingStats.textLength.toLocaleString()} chars
                </span>
              </div>
              
              {processingStats.chunksTotal > 1 && (
                <div className="flex items-center gap-2">
                  <Zap className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  <span className="text-blue-700 dark:text-blue-300">
                    Chunks: {processingStats.chunksProcessed}/{processingStats.chunksTotal}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                <span className="text-blue-700 dark:text-blue-300">
                  Elapsed: {formatTime(elapsedTime)}
                </span>
              </div>
              
              {estimatedTimeRemaining && estimatedTimeRemaining > 0 && (
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  <span className="text-blue-700 dark:text-blue-300">
                    Remaining: ~{formatTime(estimatedTimeRemaining)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stage Progress */}
        {stages.length > 1 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Processing Stages
            </h4>
            
            <div className="space-y-1">
              {stages.map((stage, index) => (
                <div
                  key={stage.id}
                  className={`flex items-center gap-2 text-xs p-2 rounded ${
                    stage.current
                      ? 'bg-blue-100 dark:bg-blue-900 border border-blue-200 dark:border-blue-700'
                      : stage.completed
                      ? 'bg-green-50 dark:bg-green-950'
                      : 'bg-gray-50 dark:bg-gray-900'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {stage.error ? (
                      <AlertCircle className="h-3 w-3 text-red-500" />
                    ) : stage.completed ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : stage.current ? (
                      <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
                    ) : (
                      <div className="h-3 w-3 rounded-full border border-gray-300 dark:border-gray-600" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${
                        stage.current ? 'text-blue-900 dark:text-blue-100' :
                        stage.completed ? 'text-green-900 dark:text-green-100' :
                        'text-gray-600 dark:text-gray-400'
                      }`}>
                        {index + 1}. {stage.name}
                      </span>
                      
                      {stage.current && estimatedTimeRemaining && (
                        <span className="text-blue-600 dark:text-blue-400">
                          ~{formatTime(stage.estimatedDuration)}
                        </span>
                      )}
                    </div>
                    
                    {stage.error && (
                      <p className="text-red-600 dark:text-red-400 mt-1">
                        {stage.error}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance Tips */}
        {processingStats && processingStats.textLength > 5000 && (
          <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded border border-blue-200 dark:border-blue-700">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              <strong>Processing large content:</strong> This may take a few minutes. 
              {processingStats.chunksTotal > 1 && (
                <> Your text is being processed in {processingStats.chunksTotal} chunks for better results.</>
              )}
            </p>
          </div>
        )}

        {/* Cancellation Warning */}
        {isPaused && (
          <div className="bg-yellow-100 dark:bg-yellow-900 p-3 rounded border border-yellow-200 dark:border-yellow-700">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              <strong>Processing paused.</strong> Click resume to continue or cancel to stop.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Hook for managing progress feedback state
export function useProgressFeedback() {
  const [isActive, setIsActive] = useState(false)
  const [progress, setProgress] = useState(0)
  const [stages, setStages] = useState<ProgressStage[]>([])
  const [currentStage, setCurrentStage] = useState<string>()
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number>()
  const [processingStats, setProcessingStats] = useState<{
    textLength: number
    chunksTotal: number
    chunksProcessed: number
    averageChunkTime: number
  }>()
  const [isPaused, setIsPaused] = useState(false)

  const startProgress = useCallback((initialStages: ProgressStage[], stats?: typeof processingStats) => {
    setIsActive(true)
    setProgress(0)
    setStages(initialStages)
    setCurrentStage(initialStages[0]?.id)
    setProcessingStats(stats)
    setIsPaused(false)
  }, [])

  const updateProgress = useCallback((newProgress: number, stageId?: string) => {
    setProgress(Math.min(100, Math.max(0, newProgress)))
    
    if (stageId) {
      setCurrentStage(stageId)
      setStages(prev => prev.map(stage => ({
        ...stage,
        current: stage.id === stageId,
        completed: stage.id !== stageId && prev.find(s => s.id === stageId)
          ? prev.indexOf(prev.find(s => s.id === stageId)!) > prev.indexOf(stage)
          : stage.completed
      })))
    }
  }, [])

  const completeStage = useCallback((stageId: string) => {
    setStages(prev => prev.map(stage => 
      stage.id === stageId 
        ? { ...stage, completed: true, current: false }
        : stage
    ))
  }, [])

  const setStageError = useCallback((stageId: string, error: string) => {
    setStages(prev => prev.map(stage => 
      stage.id === stageId 
        ? { ...stage, error, current: false }
        : stage
    ))
  }, [])

  const updateEstimatedTime = useCallback((timeMs: number) => {
    setEstimatedTimeRemaining(timeMs)
  }, [])

  const updateProcessingStats = useCallback((stats: Partial<typeof processingStats>) => {
    setProcessingStats(prev => prev ? { ...prev, ...stats } : undefined)
  }, [])

  const pauseProgress = useCallback(() => {
    setIsPaused(true)
  }, [])

  const resumeProgress = useCallback(() => {
    setIsPaused(false)
  }, [])

  const completeProgress = useCallback(() => {
    setProgress(100)
    setStages(prev => prev.map(stage => ({ ...stage, completed: true, current: false })))
    
    // Auto-hide after completion
    setTimeout(() => {
      setIsActive(false)
    }, 2000)
  }, [])

  const cancelProgress = useCallback(() => {
    setIsActive(false)
    setProgress(0)
    setStages([])
    setCurrentStage(undefined)
    setEstimatedTimeRemaining(undefined)
    setProcessingStats(undefined)
    setIsPaused(false)
  }, [])

  return {
    // State
    isActive,
    progress,
    stages,
    currentStage,
    estimatedTimeRemaining,
    processingStats,
    isPaused,
    
    // Actions
    startProgress,
    updateProgress,
    completeStage,
    setStageError,
    updateEstimatedTime,
    updateProcessingStats,
    pauseProgress,
    resumeProgress,
    completeProgress,
    cancelProgress
  }
}

// Predefined stage templates for common operations
export const SUMMARIZATION_STAGES: ProgressStage[] = [
  {
    id: 'preprocessing',
    name: 'Preprocessing Text',
    description: 'Cleaning and preparing your content for analysis',
    estimatedDuration: 2000,
    completed: false,
    current: false
  },
  {
    id: 'chunking',
    name: 'Text Analysis',
    description: 'Breaking down content into optimal chunks',
    estimatedDuration: 3000,
    completed: false,
    current: false
  },
  {
    id: 'ai_processing',
    name: 'AI Summarization',
    description: 'Generating intelligent summary using PEGASUS',
    estimatedDuration: 15000,
    completed: false,
    current: false
  },
  {
    id: 'postprocessing',
    name: 'Finalizing',
    description: 'Polishing and formatting the summary',
    estimatedDuration: 2000,
    completed: false,
    current: false
  }
]