import { NextRequest, NextResponse } from 'next/server'
import {
  createErrorResponse,
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

const GROQ_API_KEY = process.env.GROQ_API_KEY
const REQUEST_TIMEOUT = 30000 // 30 seconds
const MAX_RETRIES = 3

console.log('[Config] Groq API Configuration:', {
  hasApiKey: !!GROQ_API_KEY,
  apiKeyLength: GROQ_API_KEY?.length || 0,
  apiKeyPrefix: GROQ_API_KEY?.substring(0, 10) || 'N/A'
})

// ─── Helper: Fetch with retry ────────────────────────────────────────────────

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options)
      
      if (response.status !== 429 && response.status !== 503) {
        return response
      }
      
      // Rate limited or service unavailable - wait before retrying
      if (i < retries - 1) {
        const waitTime = Math.pow(2, i) * 1000 // Exponential backoff: 1s, 2s, 4s
        console.log(`[Groq] Status ${response.status}, retrying in ${waitTime}ms... (attempt ${i + 1}/${retries})`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    } catch (error) {
      if (i === retries - 1) throw error
      const waitTime = Math.pow(2, i) * 1000
      console.log(`[Groq] Network error, retrying in ${waitTime}ms... (attempt ${i + 1}/${retries})`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }
  
  throw new Error('Max retries exceeded')
}

// ─── Groq summarization ──────────────────────────────────────────────────────

async function summarizeWithGroq(text: string): Promise<SummarizationResponse> {
  const requestId = crypto.randomUUID().substring(0, 8)
  
  console.log(`[Groq:${requestId}] ========== GROQ API CALL START ==========`)
  console.log(`[Groq:${requestId}] Text length:`, text.length)
  console.log(`[Groq:${requestId}] API key available:`, !!GROQ_API_KEY)
  
  if (!GROQ_API_KEY) {
    console.error(`[Groq:${requestId}] ❌ GROQ_API_KEY is not configured`)
    throw new Error('GROQ_API_KEY is not configured')
  }

  try {
    // Comprehensive prompt for detailed summaries
    const prompt = `Summarize the following text comprehensively. Cover all main topics, key points, and important details so that someone reading only the summary can understand the entire content. Be thorough but concise.

Text:
${text}

Provide a comprehensive summary:`

    console.log(`[Groq:${requestId}] Calling Groq API...`)
    
    const startTime = Date.now()
    
    const response = await fetchWithRetry('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', // Fast and free
        messages: [{
          role: 'system',
          content: 'You are a helpful assistant that creates comprehensive summaries. Always respond with just the summary content, no introductory phrases like "Here is a summary" or "The text discusses". Start directly with the summary. Cover all main topics and key points thoroughly.'
        }, {
          role: 'user',
          content: prompt
        }],
        temperature: 0.5,
        max_tokens: 1000, // Allow longer summaries for comprehensive coverage
        top_p: 1,
        stream: false
      })
    }, 3)
    
    const duration = Date.now() - startTime
    console.log(`[Groq:${requestId}] ✓ Got response in ${duration}ms`)
    console.log(`[Groq:${requestId}] Response status:`, response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Groq:${requestId}] ❌ API error:`, errorText)
      throw new Error(`Groq API error: ${response.status} ${errorText}`)
    }
    
    const data = await response.json()
    console.log(`[Groq:${requestId}] Response data structure:`, {
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length || 0
    })
    
    if (!data.choices || data.choices.length === 0) {
      console.error(`[Groq:${requestId}] ❌ No choices in response`)
      throw new Error('No response generated from Groq')
    }
    
    let summary = data.choices[0]?.message?.content?.trim()
    
    if (!summary) {
      console.error(`[Groq:${requestId}] ❌ No content in choice`)
      throw new Error('Empty response from Groq')
    }
    
    // Clean up common AI preambles (just in case)
    const preambles = [
      /^Here is a (comprehensive |detailed )?summary( of the text)?:?\s*/i,
      /^Here's a (comprehensive |detailed )?summary( of the text)?:?\s*/i,
      /^The text (discusses|describes|explains|talks about|is about):?\s*/i,
      /^This text (discusses|describes|explains|talks about|is about):?\s*/i,
      /^Summary:?\s*/i,
      /^In summary,?\s*/i,
      /^To summarize,?\s*/i,
      /^Comprehensive summary:?\s*/i
    ]
    
    for (const pattern of preambles) {
      summary = summary.replace(pattern, '')
    }
    
    summary = summary.trim()
    
    console.log(`[Groq:${requestId}] ✓ Summary generated, length:`, summary.length)
    console.log(`[Groq:${requestId}] Summary preview:`, summary.substring(0, 150) + '...')
    console.log(`[Groq:${requestId}] ========== GROQ API CALL SUCCESS ==========`)
    
    return {
      summary,
      processingTime: duration,
      chunksProcessed: 1,
      model: 'llama-3.1-8b-instant (Groq)'
    }
  } catch (error: any) {
    console.error(`[Groq:${requestId}] ========== GROQ API CALL FAILED ==========`)
    console.error(`[Groq:${requestId}] Error type:`, typeof error)
    console.error(`[Groq:${requestId}] Error name:`, error.name)
    console.error(`[Groq:${requestId}] Error message:`, error.message)
    
    // Check for specific error types
    if (error.message?.includes('API key') || error.message?.includes('401') || error.message?.includes('403')) {
      console.error(`[Groq:${requestId}] ❌ API key error detected`)
      throw new Error('Invalid or missing Groq API key')
    }
    if (error.message?.includes('quota') || error.message?.includes('rate limit') || error.message?.includes('429')) {
      console.error(`[Groq:${requestId}] ❌ Rate limit error detected`)
      throw new Error('Groq API rate limit exceeded. Please try again in a moment.')
    }
    
    throw error
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
  console.log(`[${requestId}] Using Groq API (FREE)`)

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

    try {
      console.log(`[${requestId}] Calling Groq API...`)
      const result = await summarizeWithGroq(plainText)

      console.log(`[${requestId}] ✅ Groq summarization successful`)
      console.log(`[${requestId}] Summary length:`, result.summary.length)
      console.log(`[${requestId}] Processing time:`, result.processingTime, 'ms')

      if (noteId && authToken) {
        console.log(`[${requestId}] Saving summary to backend for note:`, noteId)
        await saveSummaryToBackend(result.summary, result.model, noteId, authToken)
      }

      console.log(`[${requestId}] ========== REQUEST COMPLETE ==========`)
      return NextResponse.json(result)
    } catch (err: any) {
      console.error(`[${requestId}] ❌ Groq summarization FAILED`)
      console.error(`[${requestId}] Error:`, err.message)
      
      return NextResponse.json({
        ...createErrorResponse('UNKNOWN_ERROR'),
        error: err.message,
        debug: {
          requestId,
          timestamp: new Date().toISOString(),
          hasApiKey: !!GROQ_API_KEY
        }
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error(`[${requestId}] ❌ FATAL ERROR in POST /api/generate-summary`)
    console.error(`[${requestId}] Error:`, error.message)
    return NextResponse.json(createErrorResponse('INTERNAL_ERROR'), { status: 500 })
  }
}

// ─── GET health check ─────────────────────────────────────────────────────────

export async function GET() {
  console.log('[Health] Health check requested')
  console.log('[Health] Using Groq API')
  console.log('[Health] GROQ_API_KEY exists:', !!GROQ_API_KEY)
  
  return NextResponse.json({
    status: 'healthy',
    service: 'groq',
    model: 'llama-3.1-8b-instant',
    hasApiKey: !!GROQ_API_KEY,
    apiKeyLength: GROQ_API_KEY?.length || 0,
    cost: 'FREE',
    limits: '14,400 requests/day',
    timestamp: new Date().toISOString()
  })
}
