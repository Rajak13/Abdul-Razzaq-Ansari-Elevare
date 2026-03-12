import { NextRequest, NextResponse } from 'next/server'
import { 
  createErrorResponse, 
  parseFastApiError, 
  validateSummarizationRequest,
  type ErrorCode 
} from '@/lib/summarization-errors'
import { stripMarkdown } from '@/lib/strip-markdown'

// Types for the summarization API
interface SummarizationRequest {
  text: string
  maxLength?: number
  minLength?: number
}

interface SummarizationResponse {
  summary: string
  processingTime: number
  chunksProcessed: number
  model: string
}

// Configuration with environment variable validation
const SUMMARIZATION_SERVICE_URL = process.env.SUMMARIZATION_SERVICE_URL || 'http://localhost:8001'
const REQUEST_TIMEOUT = parseInt(process.env.SUMMARIZATION_TIMEOUT || '30000') // 30 seconds default
const MAX_RETRIES = parseInt(process.env.SUMMARIZATION_MAX_RETRIES || '3')
const HEALTH_CHECK_TIMEOUT = 5000 // 5 seconds for health checks

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Parse and validate request body
    let body: SummarizationRequest
    try {
      body = await request.json()
    } catch (parseError) {
      const errorResponse = createErrorResponse('INVALID_JSON')
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // Validate request using utility function
    const validation = validateSummarizationRequest(body)
    if (!validation.isValid) {
      const statusCode = validation.error?.code === 'TEXT_TOO_LONG' ? 413 : 400
      return NextResponse.json(validation.error, { status: statusCode })
    }

    // Prepare request for FastAPI service
    // Strip markdown formatting to get clean plain text for summarization
    const plainText = stripMarkdown(body.text.trim())
    const sanitizedText = plainText.trim()
    
    const fastApiRequest: SummarizationRequest = {
      text: sanitizedText,
      maxLength: Math.min(body.maxLength || 150, 300), // Cap max length
      minLength: Math.max(body.minLength || 50, 20)    // Ensure min length
    }

    // Attempt to call FastAPI service with retry logic
    let lastError: ErrorCode = 'UNKNOWN_ERROR'
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await callSummarizationService(fastApiRequest, attempt)
        
        if (result.success) {
          // Add processing metadata
          const processingTime = Date.now() - startTime
          const response = {
            ...result.data,
            processingTime,
            metadata: {
              attempt,
              totalProcessingTime: processingTime
            }
          }

          console.log('[API] Summary generated successfully:', {
            summaryLength: result.data.summary.length,
            processingTime,
            model: result.data.model
          });

          // Save the summary to the database via backend API
          try {
            const noteId = request.headers.get('x-note-id')
            const authToken = request.headers.get('authorization')
            
            console.log('🔍 API: Checking for noteId and authToken:', {
              hasNoteId: !!noteId,
              hasAuthToken: !!authToken,
              noteId: noteId
            });
            
            if (noteId && authToken) {
              const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001'
              console.log('💾 API: Saving summary to backend:', backendUrl);
              
              const saveResponse = await fetch(`${backendUrl}/api/notes/${noteId}/summary`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': authToken
                },
                body: JSON.stringify({
                  summary: result.data.summary,
                  model: result.data.model || 'PEGASUS'
                })
              });
              
              console.log('📨 API: Backend save response status:', saveResponse.status);
              
              if (saveResponse.ok) {
                const saveResult = await saveResponse.json();
                console.log('[API] Summary saved to backend successfully:', saveResult);
              } else {
                const saveError = await saveResponse.text();
                console.error('❌ API: Backend save failed:', saveError);
              }
            } else {
              console.log('⚠️ API: Missing noteId or authToken, skipping backend save');
            }
          } catch (saveError) {
            console.warn('⚠️ API: Failed to save summary to database:', saveError)
            // Continue with response even if save fails
          }

          return NextResponse.json(response)
        } else {
          lastError = result.errorCode
          
          // Don't retry for non-retryable errors
          if (!isRetryableError(result.errorCode)) {
            break
          }
          
          // Wait before retry (except on last attempt)
          if (attempt < MAX_RETRIES) {
            const delay = getRetryDelay(result.errorCode, attempt)
            await new Promise(resolve => setTimeout(resolve, delay))
          }
        }
      } catch (error) {
        console.error(`Summarization attempt ${attempt} failed:`, error)
        lastError = 'NETWORK_ERROR'
        
        // Wait before retry (except on last attempt)
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        }
      }
    }

    // All retries failed
    const errorResponse = createErrorResponse(lastError)
    const statusCode = getStatusCodeForError(lastError)
    return NextResponse.json(errorResponse, { status: statusCode })

  } catch (error) {
    console.error('Error in POST /api/generate-summary:', error)
    const errorResponse = createErrorResponse('INTERNAL_ERROR')
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// Helper function to call summarization service
async function callSummarizationService(
  request: SummarizationRequest, 
  attempt: number
): Promise<{ success: true; data: SummarizationResponse } | { success: false; errorCode: ErrorCode }> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

  try {
    const response = await fetch(`${SUMMARIZATION_SERVICE_URL}/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Attempt': attempt.toString(),
        'X-Request-ID': crypto.randomUUID()
      },
      body: JSON.stringify(request),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      let errorData
      try {
        errorData = await response.json()
      } catch {
        errorData = null
      }
      
      const errorCode = parseFastApiError(response, errorData)
      return { success: false, errorCode }
    }

    // Parse successful response
    const summaryData: SummarizationResponse = await response.json()
    
    // Validate response format
    if (!summaryData.summary || typeof summaryData.summary !== 'string') {
      console.error('Invalid summary format from FastAPI:', summaryData)
      return { success: false, errorCode: 'INVALID_SUMMARY_FORMAT' }
    }

    return { success: true, data: summaryData }

  } catch (fetchError) {
    clearTimeout(timeoutId)
    
    if (fetchError instanceof Error && fetchError.name === 'AbortError') {
      return { success: false, errorCode: 'TIMEOUT' }
    }
    
    console.error('Network error calling summarization service:', fetchError)
    return { success: false, errorCode: 'NETWORK_ERROR' }
  }
}

// Helper function to determine HTTP status code for error
function getStatusCodeForError(errorCode: ErrorCode): number {
  const statusMap: Record<ErrorCode, number> = {
    INVALID_JSON: 400,
    MISSING_TEXT: 400,
    EMPTY_TEXT: 400,
    TEXT_TOO_LONG: 413,
    TIMEOUT: 504,
    SERVICE_UNAVAILABLE: 503,
    NETWORK_ERROR: 503,
    RATE_LIMITED: 429,
    UNKNOWN_ERROR: 500,
    INVALID_RESPONSE: 502,
    INVALID_SUMMARY_FORMAT: 502,
    INTERNAL_ERROR: 500
  }
  
  return statusMap[errorCode] || 500
}

// Helper functions (imported from error utility)
function isRetryableError(code: ErrorCode): boolean {
  const retryableCodes: ErrorCode[] = [
    'TIMEOUT', 'SERVICE_UNAVAILABLE', 'NETWORK_ERROR', 
    'UNKNOWN_ERROR', 'INVALID_RESPONSE', 'INVALID_SUMMARY_FORMAT', 
    'INTERNAL_ERROR'
  ]
  return retryableCodes.includes(code)
}

function getRetryDelay(code: ErrorCode, attempt: number): number {
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
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1)
  const jitter = Math.random() * 1000
  
  return Math.min(exponentialDelay + jitter, 30000)
}

// Enhanced health check endpoint with detailed service status
export async function GET() {
  try {
    const startTime = Date.now()
    
    // Check if FastAPI service is available with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT)

    const response = await fetch(`${SUMMARIZATION_SERVICE_URL}/health`, {
      method: 'GET',
      headers: {
        'X-Health-Check': 'true',
        'X-Request-ID': crypto.randomUUID()
      },
      signal: controller.signal
    })

    clearTimeout(timeoutId)
    const responseTime = Date.now() - startTime

    if (response.ok) {
      let serviceInfo
      try {
        serviceInfo = await response.json()
      } catch {
        serviceInfo = { status: 'unknown' }
      }

      return NextResponse.json({
        status: 'healthy',
        service: 'available',
        responseTime,
        serviceInfo,
        timestamp: new Date().toISOString(),
        config: {
          serviceUrl: SUMMARIZATION_SERVICE_URL,
          timeout: REQUEST_TIMEOUT,
          maxRetries: MAX_RETRIES
        }
      })
    } else {
      return NextResponse.json(
        {
          status: 'unhealthy',
          service: 'error',
          responseTime,
          httpStatus: response.status,
          timestamp: new Date().toISOString()
        },
        { status: 503 }
      )
    }
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError'
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        service: 'unavailable',
        error: isTimeout ? 'timeout' : 'connection_failed',
        timestamp: new Date().toISOString(),
        config: {
          serviceUrl: SUMMARIZATION_SERVICE_URL,
          timeout: HEALTH_CHECK_TIMEOUT
        }
      },
      { status: 503 }
    )
  }
}