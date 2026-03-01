// Error handling utilities for summarization API

export interface SummarizationError {
  error: string
  code: string
  maxLength?: number
  details?: string
}

export interface ErrorResponse {
  error: string
  code: string
  userMessage: string
  retryable: boolean
  maxLength?: number
}

// Error codes and their user-friendly messages
export const ERROR_MESSAGES = {
  INVALID_JSON: {
    userMessage: 'Invalid request format. Please try again.',
    retryable: false
  },
  MISSING_TEXT: {
    userMessage: 'Please provide text to summarize.',
    retryable: false
  },
  EMPTY_TEXT: {
    userMessage: 'Cannot summarize empty text. Please add some content.',
    retryable: false
  },
  TEXT_TOO_LONG: {
    userMessage: 'Text is too long. Please shorten your content and try again.',
    retryable: false
  },
  TIMEOUT: {
    userMessage: 'Summarization is taking longer than expected. Please try again with shorter text.',
    retryable: true
  },
  SERVICE_UNAVAILABLE: {
    userMessage: 'Summarization service is temporarily unavailable. Please try again in a few moments.',
    retryable: true
  },
  UNKNOWN_ERROR: {
    userMessage: 'An unexpected error occurred. Please try again.',
    retryable: true
  },
  INVALID_RESPONSE: {
    userMessage: 'Received invalid response from service. Please try again.',
    retryable: true
  },
  INVALID_SUMMARY_FORMAT: {
    userMessage: 'Generated summary format is invalid. Please try again.',
    retryable: true
  },
  INTERNAL_ERROR: {
    userMessage: 'An internal error occurred. Please try again later.',
    retryable: true
  },
  NETWORK_ERROR: {
    userMessage: 'Network connection failed. Please check your connection and try again.',
    retryable: true
  },
  RATE_LIMITED: {
    userMessage: 'Too many requests. Please wait a moment before trying again.',
    retryable: true
  }
} as const

export type ErrorCode = keyof typeof ERROR_MESSAGES

// Create user-friendly error response
export function createErrorResponse(
  code: ErrorCode, 
  originalError?: string,
  maxLength?: number
): ErrorResponse {
  const errorInfo = ERROR_MESSAGES[code]
  
  return {
    error: originalError || errorInfo.userMessage,
    code,
    userMessage: errorInfo.userMessage,
    retryable: errorInfo.retryable,
    ...(maxLength && { maxLength })
  }
}

// Determine if an error is retryable
export function isRetryableError(code: ErrorCode): boolean {
  return ERROR_MESSAGES[code].retryable
}

// Get retry delay based on error type (in milliseconds)
export function getRetryDelay(code: ErrorCode, attempt: number = 1): number {
  const baseDelays = {
    TIMEOUT: 2000,
    SERVICE_UNAVAILABLE: 5000,
    NETWORK_ERROR: 1000,
    RATE_LIMITED: 10000,
    UNKNOWN_ERROR: 3000,
    INVALID_RESPONSE: 2000,
    INVALID_SUMMARY_FORMAT: 2000,
    INTERNAL_ERROR: 5000
  }
  
  const baseDelay = baseDelays[code as keyof typeof baseDelays] || 3000
  
  // Exponential backoff with jitter
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1)
  const jitter = Math.random() * 1000 // Add up to 1 second of jitter
  
  return Math.min(exponentialDelay + jitter, 30000) // Cap at 30 seconds
}

// Parse FastAPI error response
export function parseFastApiError(response: Response, errorData?: any): ErrorCode {
  // Map HTTP status codes to error codes
  switch (response.status) {
    case 400:
      if (errorData?.code === 'TEXT_TOO_LONG') return 'TEXT_TOO_LONG'
      if (errorData?.code === 'EMPTY_TEXT') return 'EMPTY_TEXT'
      return 'INVALID_JSON'
    case 413:
      return 'TEXT_TOO_LONG'
    case 422:
      return 'INVALID_JSON'
    case 429:
      return 'RATE_LIMITED'
    case 500:
      return 'INTERNAL_ERROR'
    case 502:
      return 'INVALID_RESPONSE'
    case 503:
      return 'SERVICE_UNAVAILABLE'
    case 504:
      return 'TIMEOUT'
    default:
      return 'UNKNOWN_ERROR'
  }
}

// Validate summarization request
export function validateSummarizationRequest(body: any): { 
  isValid: boolean
  error?: ErrorResponse 
} {
  if (!body || typeof body !== 'object') {
    return {
      isValid: false,
      error: createErrorResponse('INVALID_JSON')
    }
  }

  if (!body.text || typeof body.text !== 'string') {
    return {
      isValid: false,
      error: createErrorResponse('MISSING_TEXT')
    }
  }

  const sanitizedText = body.text.trim()
  
  if (sanitizedText.length === 0) {
    return {
      isValid: false,
      error: createErrorResponse('EMPTY_TEXT')
    }
  }

  const MAX_TEXT_LENGTH = 100000  // Increased to 100k characters (~25k words)
  if (sanitizedText.length > MAX_TEXT_LENGTH) {
    return {
      isValid: false,
      error: createErrorResponse('TEXT_TOO_LONG', undefined, MAX_TEXT_LENGTH)
    }
  }

  return { isValid: true }
}