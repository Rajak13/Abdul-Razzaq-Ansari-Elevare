'use client'

import { useState, useEffect, useCallback } from 'react'
import { type ErrorResponse, getRetryDelay, isRetryableError } from '@/lib/summarization-errors'

interface RetryState {
  attempt: number
  isRetrying: boolean
  nextRetryAt: Date | null
  canRetry: boolean
}

interface UseRetryManagerOptions {
  maxRetries?: number
  onRetry?: () => Promise<void>
  onMaxRetriesReached?: () => void
}

export function useRetryManager({
  maxRetries = 3,
  onRetry,
  onMaxRetriesReached
}: UseRetryManagerOptions = {}) {
  const [retryState, setRetryState] = useState<RetryState>({
    attempt: 0,
    isRetrying: false,
    nextRetryAt: null,
    canRetry: true
  })

  const [countdown, setCountdown] = useState<number>(0)

  // Countdown timer effect
  useEffect(() => {
    if (!retryState.nextRetryAt) return

    const interval = setInterval(() => {
      const now = new Date()
      const timeLeft = Math.max(0, retryState.nextRetryAt!.getTime() - now.getTime())
      
      if (timeLeft <= 0) {
        setCountdown(0)
        clearInterval(interval)
      } else {
        setCountdown(Math.ceil(timeLeft / 1000))
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [retryState.nextRetryAt])

  const scheduleRetry = useCallback((error: ErrorResponse) => {
    if (!isRetryableError(error.code) || retryState.attempt >= maxRetries) {
      setRetryState(prev => ({ ...prev, canRetry: false }))
      onMaxRetriesReached?.()
      return
    }

    const delay = getRetryDelay(error.code, retryState.attempt + 1)
    const nextRetryAt = new Date(Date.now() + delay)

    setRetryState(prev => ({
      ...prev,
      nextRetryAt,
      canRetry: true
    }))

    // Auto-retry after delay
    setTimeout(() => {
      if (onRetry) {
        executeRetry()
      }
    }, delay)
  }, [retryState.attempt, maxRetries, onRetry, onMaxRetriesReached])

  const executeRetry = useCallback(async () => {
    if (!retryState.canRetry || retryState.isRetrying) return

    setRetryState(prev => ({
      ...prev,
      isRetrying: true,
      attempt: prev.attempt + 1
    }))

    try {
      await onRetry?.()
      
      // Reset on success
      setRetryState({
        attempt: 0,
        isRetrying: false,
        nextRetryAt: null,
        canRetry: true
      })
    } catch (error) {
      setRetryState(prev => ({
        ...prev,
        isRetrying: false,
        nextRetryAt: null
      }))
      
      // Schedule next retry if this was a retryable error
      if (error instanceof Error && 'code' in error) {
        scheduleRetry(error as ErrorResponse)
      }
    }
  }, [retryState.canRetry, retryState.isRetrying, onRetry, scheduleRetry])

  const manualRetry = useCallback(() => {
    setRetryState(prev => ({
      ...prev,
      nextRetryAt: null
    }))
    executeRetry()
  }, [executeRetry])

  const reset = useCallback(() => {
    setRetryState({
      attempt: 0,
      isRetrying: false,
      nextRetryAt: null,
      canRetry: true
    })
    setCountdown(0)
  }, [])

  return {
    retryState,
    countdown,
    scheduleRetry,
    manualRetry,
    reset,
    canRetryNow: retryState.canRetry && !retryState.isRetrying && countdown === 0
  }
}

// Component for displaying retry status
interface RetryStatusProps {
  retryState: RetryState
  countdown: number
  onManualRetry: () => void
  className?: string
}

export function RetryStatus({
  retryState,
  countdown,
  onManualRetry,
  className = ''
}: RetryStatusProps) {
  if (!retryState.canRetry) {
    return (
      <div className={`text-xs text-muted-foreground ${className}`}>
        Maximum retry attempts reached. Please try again later.
      </div>
    )
  }

  if (retryState.isRetrying) {
    return (
      <div className={`text-xs text-blue-600 dark:text-blue-400 ${className}`}>
        Retrying... (Attempt {retryState.attempt})
      </div>
    )
  }

  if (countdown > 0) {
    return (
      <div className={`text-xs text-muted-foreground ${className}`}>
        Next retry in {countdown} seconds...
      </div>
    )
  }

  return null
}

// Hook for exponential backoff with jitter
export function useExponentialBackoff(
  baseDelay: number = 1000,
  maxDelay: number = 30000,
  jitterFactor: number = 0.1
) {
  const calculateDelay = useCallback((attempt: number): number => {
    const exponentialDelay = baseDelay * Math.pow(2, attempt)
    const jitter = exponentialDelay * jitterFactor * Math.random()
    return Math.min(exponentialDelay + jitter, maxDelay)
  }, [baseDelay, maxDelay, jitterFactor])

  return { calculateDelay }
}

// Circuit breaker pattern for preventing cascading failures
interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open'
  failureCount: number
  lastFailureTime: Date | null
  nextAttemptTime: Date | null
}

export function useCircuitBreaker(
  failureThreshold: number = 5,
  recoveryTimeout: number = 60000 // 1 minute
) {
  const [circuitState, setCircuitState] = useState<CircuitBreakerState>({
    state: 'closed',
    failureCount: 0,
    lastFailureTime: null,
    nextAttemptTime: null
  })

  const recordSuccess = useCallback(() => {
    setCircuitState({
      state: 'closed',
      failureCount: 0,
      lastFailureTime: null,
      nextAttemptTime: null
    })
  }, [])

  const recordFailure = useCallback(() => {
    const now = new Date()
    
    setCircuitState(prev => {
      const newFailureCount = prev.failureCount + 1
      
      if (newFailureCount >= failureThreshold) {
        return {
          state: 'open',
          failureCount: newFailureCount,
          lastFailureTime: now,
          nextAttemptTime: new Date(now.getTime() + recoveryTimeout)
        }
      }
      
      return {
        ...prev,
        failureCount: newFailureCount,
        lastFailureTime: now
      }
    })
  }, [failureThreshold, recoveryTimeout])

  const canAttempt = useCallback((): boolean => {
    const now = new Date()
    
    switch (circuitState.state) {
      case 'closed':
        return true
      case 'open':
        if (circuitState.nextAttemptTime && now >= circuitState.nextAttemptTime) {
          setCircuitState(prev => ({ ...prev, state: 'half-open' }))
          return true
        }
        return false
      case 'half-open':
        return true
      default:
        return false
    }
  }, [circuitState])

  return {
    circuitState,
    canAttempt,
    recordSuccess,
    recordFailure
  }
}