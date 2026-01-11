'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  AlertCircle, 
  AlertTriangle, 
  RefreshCw, 
  Clock, 
  Wifi, 
  Server, 
  FileText,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { useState } from 'react'
import { type ErrorResponse, getRetryDelay, isRetryableError } from '@/lib/summarization-errors'

interface ErrorDisplayProps {
  error: ErrorResponse
  onRetry?: () => void
  onDismiss?: () => void
  isRetrying?: boolean
  retryAttempt?: number
  maxRetries?: number
  className?: string
}

export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
  isRetrying = false,
  retryAttempt = 0,
  maxRetries = 3,
  className = ''
}: ErrorDisplayProps) {
  const [showDetails, setShowDetails] = useState(false)

  const getErrorIcon = () => {
    switch (error.code) {
      case 'NETWORK_ERROR':
        return <Wifi className="h-4 w-4" />
      case 'SERVICE_UNAVAILABLE':
      case 'INTERNAL_ERROR':
        return <Server className="h-4 w-4" />
      case 'TIMEOUT':
        return <Clock className="h-4 w-4" />
      case 'TEXT_TOO_LONG':
        return <FileText className="h-4 w-4" />
      case 'RATE_LIMITED':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getErrorSeverity = () => {
    const criticalErrors = ['INTERNAL_ERROR', 'SERVICE_UNAVAILABLE']
    const warningErrors = ['TIMEOUT', 'RATE_LIMITED', 'TEXT_TOO_LONG']
    
    if (criticalErrors.includes(error.code)) return 'critical'
    if (warningErrors.includes(error.code)) return 'warning'
    return 'error'
  }

  const getSeverityStyles = () => {
    const severity = getErrorSeverity()
    
    switch (severity) {
      case 'critical':
        return {
          card: 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950',
          icon: 'text-red-600 dark:text-red-400',
          text: 'text-red-900 dark:text-red-100',
          subtext: 'text-red-700 dark:text-red-300'
        }
      case 'warning':
        return {
          card: 'border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950',
          icon: 'text-yellow-600 dark:text-yellow-400',
          text: 'text-yellow-900 dark:text-yellow-100',
          subtext: 'text-yellow-700 dark:text-yellow-300'
        }
      default:
        return {
          card: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950',
          icon: 'text-red-600 dark:text-red-400',
          text: 'text-red-900 dark:text-red-100',
          subtext: 'text-red-700 dark:text-red-300'
        }
    }
  }

  const getRetryCountdown = () => {
    if (!isRetryableError(error.code as any) || retryAttempt >= maxRetries) return null
    
    const delay = getRetryDelay(error.code as any, retryAttempt + 1)
    return Math.ceil(delay / 1000)
  }

  const getHelpText = () => {
    switch (error.code) {
      case 'TEXT_TOO_LONG':
        return 'Try breaking your content into smaller sections or removing unnecessary text.'
      case 'NETWORK_ERROR':
        return 'Check your internet connection and try again.'
      case 'SERVICE_UNAVAILABLE':
        return 'The AI service is temporarily down. This usually resolves within a few minutes.'
      case 'TIMEOUT':
        return 'The request took too long. Try with shorter content or during off-peak hours.'
      case 'RATE_LIMITED':
        return 'You\'ve made too many requests recently. Please wait before trying again.'
      case 'EMPTY_TEXT':
        return 'Add some content to your note before generating a summary.'
      default:
        return 'If this problem persists, try refreshing the page or contact support.'
    }
  }

  const styles = getSeverityStyles()
  const canRetry = error.retryable && onRetry && retryAttempt < maxRetries
  const retryCountdown = getRetryCountdown()

  return (
    <Card className={`${styles.card} ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Main Error Message */}
          <div className="flex items-start gap-3">
            <div className={`${styles.icon} flex-shrink-0 mt-0.5`}>
              {getErrorIcon()}
            </div>
            
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={`text-sm font-medium ${styles.text}`}>
                    {error.userMessage}
                  </p>
                  
                  {/* Error Code Badge */}
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {error.code}
                    </Badge>
                    
                    {retryAttempt > 0 && (
                      <Badge variant="outline" className="text-xs">
                        Attempt {retryAttempt + 1}/{maxRetries}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Dismiss Button */}
                {onDismiss && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDismiss}
                    className="h-6 w-6 p-0 opacity-70 hover:opacity-100"
                  >
                    ×
                  </Button>
                )}
              </div>

              {/* Additional Info */}
              {error.maxLength && (
                <p className={`text-xs ${styles.subtext}`}>
                  Maximum allowed length: {error.maxLength.toLocaleString()} characters
                </p>
              )}

              {/* Help Text */}
              <div className={`text-xs ${styles.subtext} flex items-start gap-2`}>
                <HelpCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                <span>{getHelpText()}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Retry Button */}
              {canRetry && (
                <Button
                  onClick={onRetry}
                  disabled={isRetrying}
                  variant="outline"
                  size="sm"
                  className="h-8"
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-3 w-3" />
                      Retry {retryCountdown ? `(${retryCountdown}s)` : ''}
                    </>
                  )}
                </Button>
              )}

              {/* Max Retries Reached */}
              {error.retryable && retryAttempt >= maxRetries && (
                <p className={`text-xs ${styles.subtext}`}>
                  Maximum retry attempts reached. Please try again later.
                </p>
              )}
            </div>

            {/* Details Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="h-6 text-xs opacity-70 hover:opacity-100"
            >
              Details
              {showDetails ? (
                <ChevronUp className="ml-1 h-3 w-3" />
              ) : (
                <ChevronDown className="ml-1 h-3 w-3" />
              )}
            </Button>
          </div>

          {/* Error Details */}
          {showDetails && (
            <div className={`text-xs ${styles.subtext} bg-black/5 dark:bg-white/5 p-2 rounded border`}>
              <div className="space-y-1">
                <div><strong>Error Code:</strong> {error.code}</div>
                <div><strong>Retryable:</strong> {error.retryable ? 'Yes' : 'No'}</div>
                {error.error !== error.userMessage && (
                  <div><strong>Technical Details:</strong> {error.error}</div>
                )}
                <div><strong>Timestamp:</strong> {new Date().toLocaleString()}</div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Compact error display for inline use
export function CompactErrorDisplay({
  error,
  onRetry,
  isRetrying = false,
  className = ''
}: Pick<ErrorDisplayProps, 'error' | 'onRetry' | 'isRetrying' | 'className'>) {
  const styles = getSeverityStyles(error.code)

  return (
    <div className={`flex items-center gap-2 p-2 rounded-md ${styles.card} ${className}`}>
      <div className={styles.icon}>
        <AlertCircle className="h-4 w-4" />
      </div>
      
      <p className={`text-sm flex-1 ${styles.text}`}>
        {error.userMessage}
      </p>

      {error.retryable && onRetry && (
        <Button
          onClick={onRetry}
          disabled={isRetrying}
          variant="ghost"
          size="sm"
          className="h-6 px-2"
        >
          {isRetrying ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
        </Button>
      )}
    </div>
  )
}

// Helper function to get severity styles (extracted for reuse)
function getSeverityStyles(errorCode: string) {
  const criticalErrors = ['INTERNAL_ERROR', 'SERVICE_UNAVAILABLE']
  const warningErrors = ['TIMEOUT', 'RATE_LIMITED', 'TEXT_TOO_LONG']
  
  if (criticalErrors.includes(errorCode)) {
    return {
      card: 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950',
      icon: 'text-red-600 dark:text-red-400',
      text: 'text-red-900 dark:text-red-100',
      subtext: 'text-red-700 dark:text-red-300'
    }
  }
  
  if (warningErrors.includes(errorCode)) {
    return {
      card: 'border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950',
      icon: 'text-yellow-600 dark:text-yellow-400',
      text: 'text-yellow-900 dark:text-yellow-100',
      subtext: 'text-yellow-700 dark:text-yellow-300'
    }
  }
  
  return {
    card: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950',
    icon: 'text-red-600 dark:text-red-400',
    text: 'text-red-900 dark:text-red-100',
    subtext: 'text-red-700 dark:text-red-300'
  }
}