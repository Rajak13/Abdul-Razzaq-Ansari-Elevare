import { NextRequest, NextResponse } from 'next/server'
import {
  createErrorResponse,
  parseFastApiError,
  validateSummarizationRequest,
  type ErrorCode
} from '@/lib/summarization-errors'
import { stripMarkdown } from '@/lib/strip-markdown'
import { GoogleGenerativeAI } from '@google/generative-ai'

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
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const NODE_ENV = process.env.NODE_ENV

// In development, prefer FastAPI even if Gemini key is set (for testing)
// In production, use Gemini if available
const USE_GEMINI = GEMINI_API_KEY && NODE_ENV === 'production'

// ─── Gemini summarization ────────────────────────────────────────────────────

async function summarizeWithGemini(text: string): Promise<SummarizationResponse> {
  console.log('[Gemini] Starting summarization, text length:', text.length)
  console.log('[Gemini] API key available:', !!GEMINI_API_KEY)
  console.log('[Gemini] API key prefix:', GEMINI_API_KEY?.substring(0, 20) + '...')
  
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    console.log('[Gemini] GoogleGenerativeAI instance created')
    
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    console.log('[Gemini] Model instance created')

    const prompt = `Summarize the following text concisely in 2-4 sentences. 
Return only the summary, no preamble or explanation.

Text:
${text}`

    console.log('[Gemini] Calling generateContent...')
    const startTime = Date.now()
    const result = await model.generateContent(prompt)
    const duration = Date.now() - startTime
    console.log('[Gemini] Got response from Gemini in', duration, 'ms')
    
    const response = result.response
    console.log('[Gemini] Response object:', {
      candidates: response.candidates?.length,
      promptFeedback: response.promptFeedback
    })
    
    const summary = response.text().trim()
    console.log('[Gemini] Summary generated, length:', summary.length)

    return {
      summary,
      processingTime: 0, // filled in by caller
      chunksProcessed: 1,
      model: 'gemini-1.5-flash'
    }
  } catch (error: any) {
    console.error('[Gemini] Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      response: error.response,
      status: error.status,
      statusText: error.statusText
    })
    
    // Check for specific error types
    if (error.message?.includes('API key')) {
      throw new Error('Invalid or missing Gemini API key')
    }
    if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
      throw new Error('Gemini API rate limit exceeded. Please try again later.')
    }
    if (error.message?.includes('SAFETY')) {
      throw new Error('Content was blocked by safety filters')
    }
    
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

  try {
    let body: SummarizationRequest
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(createErrorResponse('INVALID_JSON'), { status: 400 })
    }

    const validation = validateSummarizationRequest(body)
    if (!validation.isValid) {
      const statusCode = validation.error?.code === 'TEXT_TOO_LONG' ? 413 : 400
      return NextResponse.json(validation.error, { status: statusCode })
    }

    const plainText = stripMarkdown(body.text.trim()).trim()
    const noteId = request.headers.get('x-note-id')
    const authToken = request.headers.get('authorization')

    // ── Production: use Gemini ──
    if (USE_GEMINI) {
      try {
        console.log('[API] Using Gemini for summarization')
        console.log('[API] Environment:', process.env.NODE_ENV)
        console.log('[API] GEMINI_API_KEY exists:', !!GEMINI_API_KEY)
        
        const result = await summarizeWithGemini(plainText)
        result.processingTime = Date.now() - startTime

        console.log('[API] Gemini summarization successful')

        if (noteId && authToken) {
          console.log('[API] Saving summary to backend for note:', noteId)
          await saveSummaryToBackend(result.summary, result.model, noteId, authToken)
        }

        return NextResponse.json(result)
      } catch (err: any) {
        console.error('[API] Gemini summarization failed:', {
          message: err.message,
          name: err.name,
          stack: err.stack,
          cause: err.cause
        })
        
        // Return more detailed error for debugging
        return NextResponse.json({
          ...createErrorResponse('UNKNOWN_ERROR'),
          debug: {
            error: err.message,
            type: err.name,
            hasApiKey: !!GEMINI_API_KEY,
            environment: process.env.NODE_ENV
          }
        }, { status: 500 })
      }
    }

    // ── Development: use FastAPI ──
    console.log('[API] Using FastAPI for summarization')
    const fastApiRequest: SummarizationRequest = {
      text: plainText,
      maxLength: Math.min(body.maxLength || 150, 300),
      minLength: Math.max(body.minLength || 50, 20)
    }

    let lastError: ErrorCode = 'UNKNOWN_ERROR'

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await callSummarizationService(fastApiRequest, attempt)

        if (result.success) {
          const processingTime = Date.now() - startTime
          const response = { ...result.data, processingTime, metadata: { attempt, totalProcessingTime: processingTime } }

          if (noteId && authToken) {
            await saveSummaryToBackend(result.data.summary, result.data.model, noteId, authToken)
          }

          return NextResponse.json(response)
        }

        lastError = result.errorCode
        if (!isRetryableError(result.errorCode)) break
        if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, getRetryDelay(result.errorCode, attempt)))
      } catch {
        lastError = 'NETWORK_ERROR'
        if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 1000 * attempt))
      }
    }

    return NextResponse.json(createErrorResponse(lastError), { status: getStatusCodeForError(lastError) })
  } catch (error) {
    console.error('Error in POST /api/generate-summary:', error)
    return NextResponse.json(createErrorResponse('INTERNAL_ERROR'), { status: 500 })
  }
}

// ─── GET health check ─────────────────────────────────────────────────────────

export async function GET() {
  if (USE_GEMINI) {
    return NextResponse.json({
      status: 'healthy',
      service: 'gemini',
      model: 'gemini-1.5-flash',
      timestamp: new Date().toISOString()
    })
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT)
    const startTime = Date.now()

    const response = await fetch(`${SUMMARIZATION_SERVICE_URL}/health`, {
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    if (response.ok) {
      return NextResponse.json({
        status: 'healthy',
        service: 'fastapi',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({ status: 'unhealthy', service: 'fastapi' }, { status: 503 })
  } catch {
    return NextResponse.json({ status: 'unhealthy', service: 'unavailable' }, { status: 503 })
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
