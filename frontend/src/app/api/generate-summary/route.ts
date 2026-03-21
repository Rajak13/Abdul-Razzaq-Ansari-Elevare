import { NextRequest, NextResponse } from 'next/server'
import {
  createErrorResponse,
  parseFastApiError,
  validateSummarizationRequest,
  type ErrorCode
} from '@/lib/summarization-errors'
import { stripMarkdown } from '@/lib/strip-markdown'

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

const SUMMARIZATION_SERVICE_URL = process.env.SUMMARIZATION_SERVICE_URL || 'http://localhost:8001'
const REQUEST_TIMEOUT = parseInt(process.env.SUMMARIZATION_TIMEOUT || '30000')
const MAX_RETRIES = parseInt(process.env.SUMMARIZATION_MAX_RETRIES || '3')
const HEALTH_CHECK_TIMEOUT = 5000
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const NODE_ENV = process.env.NODE_ENV

// Vercel sets NODE_ENV automatically, but we also check for Vercel-specific env vars
const IS_VERCEL = process.env.VERCEL === '1' || process.env.VERCEL_ENV === 'production'
const IS_PRODUCTION = NODE_ENV === 'production' || IS_VERCEL

// In development, prefer FastAPI even if OpenRouter key is set (for testing)
// In production/Vercel, use OpenRouter if available
const USE_OPENROUTER = !!OPENROUTER_API_KEY && IS_PRODUCTION

console.log('[Config] Environment detection:', {
  NODE_ENV,
  VERCEL: process.env.VERCEL,
  VERCEL_ENV: process.env.VERCEL_ENV,
  IS_VERCEL,
  IS_PRODUCTION,
  HAS_OPENROUTER_KEY: !!OPENROUTER_API_KEY,
  USE_OPENROUTER
})

// ─── OpenRouter summarization ────────────────────────────────────────────────────

async function summarizeWithOpenRouter(text: string): Promise<SummarizationResponse> {
  const requestId = crypto.randomUUID().substring(0, 8)
  
  console.log(`[OpenRouter:${requestId}] ========== OPENROUTER API CALL START ==========`)
  console.log(`[OpenRouter:${requestId}] Text length:`, text.length)
  console.log(`[OpenRouter:${requestId}] Text preview:`, text.substring(0, 100) + '...')
  console.log(`[OpenRouter:${requestId}] API key available:`, !!OPENROUTER_API_KEY)
  console.log(`[OpenRouter:${requestId}] API key length:`, OPENROUTER_API_KEY?.length || 0)
  
  if (!OPENROUTER_API_KEY) {
    console.error(`[OpenRouter:${requestId}] ❌ OPENROUTER_API_KEY is not configured`)
    throw new Error('OPENROUTER_API_KEY is not configured')
  }

  try {
    const prompt = `Summarize the following text concisely in 2-4 sentences. Return only the summary, no preamble or explanation.\n\nText:\n${text}`

    console.log(`[OpenRouter:${requestId}] Prompt length:`, prompt.length)
    console.log(`[OpenRouter:${requestId}] Calling OpenRouter API...`)
    
    const startTime = Date.now()
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://elevarelearning.vercel.app',
        'X-Title': 'Elevare Learning'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [{
          role: 'user',
          content: prompt
        }],
        temperature: 0.7,
        max_tokens: 500
      })
    })
    
    const duration = Date.now() - startTime
    console.log(`[OpenRouter:${requestId}] ✓ Got response in ${duration}ms`)
    console.log(`[OpenRouter:${requestId}] Response status:`, response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[OpenRouter:${requestId}] ❌ API error:`, errorText)
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log(`[OpenRouter:${requestId}] Response data structure:`, {
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length || 0
    })
    
    if (!data.choices || data.choices.length === 0) {
      console.error(`[OpenRouter:${requestId}] ❌ No choices in response`)
      throw new Error('No response generated from OpenRouter')
    }
    
    const summary = data.choices[0]?.message?.content?.trim()
    
    if (!summary) {
      console.error(`[OpenRouter:${requestId}] ❌ No content in choice`)
      throw new Error('Empty response from OpenRouter')
    }
    
    console.log(`[OpenRouter:${requestId}] ✓ Summary generated, length:`, summary.length)
    console.log(`[OpenRouter:${requestId}] Summary preview:`, summary.substring(0, 100) + '...')

    console.log(`[OpenRouter:${requestId}] ========== OPENROUTER API CALL SUCCESS ==========`)
    return {
      summary,
      processingTime: 0, // filled in by caller
      chunksProcessed: 1,
      model: 'gemini-2.0-flash-exp'
    }
  } catch (error: any) {
    console.error(`[OpenRouter:${requestId}] ========== OPENROUTER API CALL FAILED ==========`)
    console.error(`[OpenRouter:${requestId}] Error type:`, typeof error)
    console.error(`[OpenRouter:${requestId}] Error name:`, error.name)
    console.error(`[OpenRouter:${requestId}] Error message:`, error.message)
    console.error(`[OpenRouter:${requestId}] Error stack:`, error.stack)
    
    // Check for specific error types
    if (error.message?.includes('API key') || error.message?.includes('401') || error.message?.includes('403')) {
      console.error(`[OpenRouter:${requestId}] ❌ API key error detected`)
      throw new Error('Invalid or missing OpenRouter API key')
    }
    if (error.message?.includes('quota') || error.message?.includes('rate limit') || error.message?.includes('429')) {
      console.error(`[OpenRouter:${requestId}] ❌ Rate limit error detected`)
      throw new Error('OpenRouter API rate limit exceeded. Please try again later.')
    }
    
    console.error(`[OpenRouter:${requestId}] ❌ Rethrowing original error`)
    throw error
  }
}

// ─── FastAPI summarization (dev) ─────────────────────────────────────────────

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
      try { errorData = await response.json() } catch { errorData = null }
      return { success: false, errorCode: parseFastApiError(response, errorData) }
    }

    const summaryData: SummarizationResponse = await response.json()
    if (!summaryData.summary || typeof summaryData.summary !== 'string') {
      return { success: false, errorCode: 'INVALID_SUMMARY_FORMAT' }
    }

    return { success: true, data: summaryData }
  } catch (fetchError) {
    clearTimeout(timeoutId)
    if (fetchError instanceof Error && fetchError.name === 'AbortError') {
      return { success: false, errorCode: 'TIMEOUT' }
    }
    return { success: false, errorCode: 'NETWORK_ERROR' }
  }
}

// ─── Shared: save summary to backend ─────────────────────────────────────────

async function saveSummaryToBackend(
  summary: string,
  model: string,
  noteId: string,
  authToken: string
): Promise<void> {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001'
  try {
    const saveResponse = await fetch(`${backendUrl}/api/notes/${noteId}/summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': authToken },
      body: JSON.stringify({ summary, model })
    })
    if (!saveResponse.ok) {
      console.error('❌ API: Backend save failed:', await saveResponse.text())
    } else {
      console.log('[API] Summary saved to backend successfully')
    }
  } catch (err) {
    console.warn('⚠️ API: Failed to save summary to database:', err)
  }
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = crypto.randomUUID()

  console.log(`[${requestId}] ========== NEW SUMMARIZATION REQUEST ==========`)
  console.log(`[${requestId}] Timestamp:`, new Date().toISOString())
  console.log(`[${requestId}] Environment:`, process.env.NODE_ENV)
  console.log(`[${requestId}] USE_OPENROUTER:`, USE_OPENROUTER)
  console.log(`[${requestId}] OPENROUTER_API_KEY exists:`, !!OPENROUTER_API_KEY)
  console.log(`[${requestId}] OPENROUTER_API_KEY length:`, OPENROUTER_API_KEY?.length || 0)

  try {
    let body: SummarizationRequest
    try {
      body = await request.json()
      console.log(`[${requestId}] Request body parsed, text length:`, body.text?.length || 0)
    } catch (parseError: any) {
      console.error(`[${requestId}] Failed to parse JSON:`, parseError.message)
      return NextResponse.json(createErrorResponse('INVALID_JSON'), { status: 400 })
    }

    const validation = validateSummarizationRequest(body)
    if (!validation.isValid) {
      console.warn(`[${requestId}] Validation failed:`, validation.error)
      const statusCode = validation.error?.code === 'TEXT_TOO_LONG' ? 413 : 400
      return NextResponse.json(validation.error, { status: statusCode })
    }

    const plainText = stripMarkdown(body.text.trim()).trim()
    const noteId = request.headers.get('x-note-id')
    const authToken = request.headers.get('authorization')

    console.log(`[${requestId}] Plain text length:`, plainText.length)
    console.log(`[${requestId}] Note ID:`, noteId || 'none')
    console.log(`[${requestId}] Auth token present:`, !!authToken)

    // ── Production: use OpenRouter ──
    if (USE_OPENROUTER) {
      console.log(`[${requestId}] ========== USING OPENROUTER API ==========`)
      console.log(`[${requestId}] API Key prefix:`, OPENROUTER_API_KEY?.substring(0, 10) + '...')
      
      try {
        console.log(`[${requestId}] Calling summarizeWithOpenRouter...`)
        const result = await summarizeWithOpenRouter(plainText)
        result.processingTime = Date.now() - startTime

        console.log(`[${requestId}] ✅ OpenRouter summarization successful`)
        console.log(`[${requestId}] Summary length:`, result.summary.length)
        console.log(`[${requestId}] Processing time:`, result.processingTime, 'ms')

        if (noteId && authToken) {
          console.log(`[${requestId}] Saving summary to backend for note:`, noteId)
          await saveSummaryToBackend(result.summary, result.model, noteId, authToken)
        }

        console.log(`[${requestId}] ========== REQUEST COMPLETE ==========`)
        return NextResponse.json(result)
      } catch (err: any) {
        console.error(`[${requestId}] ❌ OpenRouter summarization FAILED`)
        console.error(`[${requestId}] Error name:`, err.name)
        console.error(`[${requestId}] Error message:`, err.message)
        console.error(`[${requestId}] Error stack:`, err.stack)
        console.error(`[${requestId}] Error cause:`, err.cause)
        
        // Return more detailed error for debugging
        return NextResponse.json({
          ...createErrorResponse('UNKNOWN_ERROR'),
          debug: {
            requestId,
            error: err.message,
            type: err.name,
            hasApiKey: !!OPENROUTER_API_KEY,
            apiKeyLength: OPENROUTER_API_KEY?.length || 0,
            environment: process.env.NODE_ENV,
            useOpenRouter: USE_OPENROUTER,
            timestamp: new Date().toISOString()
          }
        }, { status: 500 })
      }
    }

    // ── Development: use FastAPI ──
    console.log(`[${requestId}] ========== USING FASTAPI ==========`)
    console.log(`[${requestId}] FastAPI URL:`, SUMMARIZATION_SERVICE_URL)
    
    const fastApiRequest: SummarizationRequest = {
      text: plainText,
      maxLength: Math.min(body.maxLength || 150, 300),
      minLength: Math.max(body.minLength || 50, 20)
    }

    let lastError: ErrorCode = 'UNKNOWN_ERROR'

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      console.log(`[${requestId}] Attempt ${attempt}/${MAX_RETRIES}`)
      
      try {
        const result = await callSummarizationService(fastApiRequest, attempt)

        if (result.success) {
          const processingTime = Date.now() - startTime
          const response = { ...result.data, processingTime, metadata: { attempt, totalProcessingTime: processingTime } }

          console.log(`[${requestId}] ✅ FastAPI summarization successful`)
          console.log(`[${requestId}] Processing time:`, processingTime, 'ms')

          if (noteId && authToken) {
            console.log(`[${requestId}] Saving summary to backend`)
            await saveSummaryToBackend(result.data.summary, result.data.model, noteId, authToken)
          }

          console.log(`[${requestId}] ========== REQUEST COMPLETE ==========`)
          return NextResponse.json(response)
        }

        console.warn(`[${requestId}] Attempt ${attempt} failed with error:`, result.errorCode)
        lastError = result.errorCode
        if (!isRetryableError(result.errorCode)) {
          console.log(`[${requestId}] Error is not retryable, stopping`)
          break
        }
        if (attempt < MAX_RETRIES) {
          const delay = getRetryDelay(result.errorCode, attempt)
          console.log(`[${requestId}] Retrying in ${delay}ms...`)
          await new Promise(r => setTimeout(r, delay))
        }
      } catch (attemptError: any) {
        console.error(`[${requestId}] Attempt ${attempt} threw exception:`, attemptError.message)
        lastError = 'NETWORK_ERROR'
        if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 1000 * attempt))
      }
    }

    console.error(`[${requestId}] ❌ All attempts failed, last error:`, lastError)
    return NextResponse.json(createErrorResponse(lastError), { status: getStatusCodeForError(lastError) })
  } catch (error: any) {
    console.error(`[${requestId}] ❌ FATAL ERROR in POST /api/generate-summary`)
    console.error(`[${requestId}] Error:`, error.message)
    console.error(`[${requestId}] Stack:`, error.stack)
    return NextResponse.json(createErrorResponse('INTERNAL_ERROR'), { status: 500 })
  }
}

// ─── GET health check ─────────────────────────────────────────────────────────

export async function GET() {
  console.log('[Health] Health check requested')
  console.log('[Health] Environment:', process.env.NODE_ENV)
  console.log('[Health] VERCEL:', process.env.VERCEL)
  console.log('[Health] VERCEL_ENV:', process.env.VERCEL_ENV)
  console.log('[Health] IS_PRODUCTION:', IS_PRODUCTION)
  console.log('[Health] USE_OPENROUTER:', USE_OPENROUTER)
  console.log('[Health] OPENROUTER_API_KEY exists:', !!OPENROUTER_API_KEY)
  
  if (USE_OPENROUTER) {
    console.log('[Health] Using OpenRouter service')
    return NextResponse.json({
      status: 'healthy',
      service: 'openrouter',
      model: 'gemini-2.0-flash-exp',
      hasApiKey: !!OPENROUTER_API_KEY,
      apiKeyLength: OPENROUTER_API_KEY?.length || 0,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        VERCEL_ENV: process.env.VERCEL_ENV,
        IS_VERCEL,
        IS_PRODUCTION
      },
      timestamp: new Date().toISOString()
    })
  }

  console.log('[Health] Using FastAPI service')
  console.log('[Health] FastAPI URL:', SUMMARIZATION_SERVICE_URL)
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT)
    const startTime = Date.now()

    const response = await fetch(`${SUMMARIZATION_SERVICE_URL}/health`, {
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    if (response.ok) {
      console.log('[Health] FastAPI is healthy')
      return NextResponse.json({
        status: 'healthy',
        service: 'fastapi',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      })
    }

    console.warn('[Health] FastAPI returned non-OK status:', response.status)
    return NextResponse.json({ 
      status: 'unhealthy', 
      service: 'fastapi',
      reason: 'Non-OK status',
      statusCode: response.status
    }, { status: 503 })
  } catch (error: any) {
    console.error('[Health] FastAPI health check failed:', error.message)
    return NextResponse.json({ 
      status: 'unhealthy', 
      service: 'unavailable', 
      error: error.message,
      config: {
        USE_GEMINI,
        HAS_API_KEY: !!GEMINI_API_KEY,
        IS_PRODUCTION,
        NODE_ENV: process.env.NODE_ENV
      }
    }, { status: 503 })
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatusCodeForError(errorCode: ErrorCode): number {
  const statusMap: Record<ErrorCode, number> = {
    INVALID_JSON: 400, MISSING_TEXT: 400, EMPTY_TEXT: 400,
    TEXT_TOO_LONG: 413, TIMEOUT: 504, SERVICE_UNAVAILABLE: 503,
    NETWORK_ERROR: 503, RATE_LIMITED: 429, UNKNOWN_ERROR: 500,
    INVALID_RESPONSE: 502, INVALID_SUMMARY_FORMAT: 502, INTERNAL_ERROR: 500
  }
  return statusMap[errorCode] || 500
}

function isRetryableError(code: ErrorCode): boolean {
  return ['TIMEOUT', 'SERVICE_UNAVAILABLE', 'NETWORK_ERROR', 'UNKNOWN_ERROR',
    'INVALID_RESPONSE', 'INVALID_SUMMARY_FORMAT', 'INTERNAL_ERROR'].includes(code)
}

function getRetryDelay(code: ErrorCode, attempt: number): number {
  const baseDelays: Partial<Record<ErrorCode, number>> = {
    TIMEOUT: 2000, SERVICE_UNAVAILABLE: 5000, NETWORK_ERROR: 1000,
    RATE_LIMITED: 10000, UNKNOWN_ERROR: 3000, INTERNAL_ERROR: 5000
  }
  const base = baseDelays[code] ?? 3000
  return Math.min(base * Math.pow(2, attempt - 1) + Math.random() * 1000, 30000)
}
