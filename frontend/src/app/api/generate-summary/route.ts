import { NextRequest, NextResponse } from 'next/server'
import {
  createErrorResponse,
  validateSummarizationRequest,
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
const SUMMARIZATION_SERVICE_URL = process.env.SUMMARIZATION_SERVICE_URL || 'http://localhost:8001'
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

console.log('[Config] Summarization mode:', IS_PRODUCTION ? 'Groq (production)' : 'Local BART (development)')
console.log('[Config] SUMMARIZATION_SERVICE_URL:', SUMMARIZATION_SERVICE_URL)
console.log('[Config] Groq API key present:', !!GROQ_API_KEY)

// ─── Helper: fetch with retry ─────────────────────────────────────────────────

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options)
      if (response.status !== 429 && response.status !== 503) return response
      if (i < retries - 1) {
        const wait = Math.pow(2, i) * 1000
        console.log(`[Retry] Status ${response.status}, waiting ${wait}ms (attempt ${i + 1}/${retries})`)
        await new Promise(r => setTimeout(r, wait))
      }
    } catch (error) {
      if (i === retries - 1) throw error
      const wait = Math.pow(2, i) * 1000
      console.log(`[Retry] Network error, waiting ${wait}ms (attempt ${i + 1}/${retries})`)
      await new Promise(r => setTimeout(r, wait))
    }
  }
  throw new Error('Max retries exceeded')
}

// ─── Local BART summarization (development) ───────────────────────────────────

async function summarizeWithLocalBart(text: string, maxLength = 128, minLength = 30): Promise<SummarizationResponse> {
  const requestId = crypto.randomUUID().substring(0, 8)
  console.log(`[BART:${requestId}] Calling local summarization service at ${SUMMARIZATION_SERVICE_URL}`)

  const startTime = Date.now()

  const response = await fetch(`${SUMMARIZATION_SERVICE_URL}/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, max_length: maxLength, min_length: minLength }),
    signal: AbortSignal.timeout(120_000), // 2 min — model can be slow on first call
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`[BART:${requestId}] Service error ${response.status}:`, errorText)
    throw new Error(`Local summarization service returned ${response.status}`)
  }

  const data = await response.json()
  const duration = Date.now() - startTime

  if (!data.summary) {
    throw new Error('Local service returned no summary')
  }

  console.log(`[BART:${requestId}] ✓ Summary generated in ${duration}ms`)

  return {
    summary: data.summary,
    processingTime: duration,
    chunksProcessed: data.chunks_processed ?? 1,
    model: 'facebook/bart-large-cnn (local)',
  }
}

// ─── Groq summarization (production) ─────────────────────────────────────────

async function summarizeWithGroq(text: string): Promise<SummarizationResponse> {
  const requestId = crypto.randomUUID().substring(0, 8)
  console.log(`[Groq:${requestId}] Calling Groq API, text length: ${text.length}`)

  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY is not configured')

  const prompt = `Summarize the following text in exactly 2 short paragraphs (2-3 sentences each). Be concise and informative. No preamble, start directly with the summary.\n\nText:\n${text}`

  const startTime = Date.now()

  const response = await fetchWithRetry('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'You are a concise summarizer. Write exactly 2 short paragraphs (2-3 sentences each). No introductory phrases. Start directly with the content.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 200,
      top_p: 1,
      stream: false,
    }),
  }, 3)

  const duration = Date.now() - startTime

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`[Groq:${requestId}] API error ${response.status}:`, errorText)
    throw new Error(`Groq API error: ${response.status} ${errorText}`)
  }

  const data = await response.json()

  if (!data.choices?.length) throw new Error('No response generated from Groq')

  let summary: string = data.choices[0]?.message?.content?.trim() ?? ''
  if (!summary) throw new Error('Empty response from Groq')

  // Strip common AI preambles
  const preambles = [
    /^Here is a (comprehensive |detailed )?summary( of the text)?:?\s*/i,
    /^Here's a (comprehensive |detailed )?summary( of the text)?:?\s*/i,
    /^The text (discusses|describes|explains|talks about|is about):?\s*/i,
    /^Summary:?\s*/i,
    /^In summary,?\s*/i,
    /^To summarize,?\s*/i,
  ]
  for (const p of preambles) summary = summary.replace(p, '')
  summary = summary.trim()

  console.log(`[Groq:${requestId}] ✓ Summary generated in ${duration}ms, length: ${summary.length}`)

  return {
    summary,
    processingTime: duration,
    chunksProcessed: 1,
    model: 'llama-3.1-8b-instant (Groq)',
  }
}

// ─── Save summary to backend ──────────────────────────────────────────────────

async function saveSummaryToBackend(
  summary: string,
  model: string,
  noteId: string,
  authToken: string
): Promise<void> {
  const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'
  try {
    const res = await fetch(`${backendUrl}/api/notes/${noteId}/summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authToken },
      body: JSON.stringify({ summary, model }),
    })
    if (!res.ok) console.error('[API] Backend save failed:', await res.text())
    else console.log('[API] Summary saved to backend successfully')
  } catch (err) {
    console.warn('[API] Failed to save summary to database:', err)
  }
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  console.log(`[${requestId}] ===== NEW SUMMARIZATION REQUEST (${IS_PRODUCTION ? 'PRODUCTION/Groq' : 'DEVELOPMENT/BART'}) =====`)

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

    try {
      // Use local BART in development, Groq in production
      const result = IS_PRODUCTION
        ? await summarizeWithGroq(plainText)
        : await summarizeWithLocalBart(plainText, body.maxLength, body.minLength)

      console.log(`[${requestId}] ✅ Summarization successful via ${result.model}`)

      if (noteId && authToken) {
        await saveSummaryToBackend(result.summary, result.model, noteId, authToken)
      }

      return NextResponse.json(result)
    } catch (err: any) {
      console.error(`[${requestId}] ❌ Summarization failed:`, err.message)

      // In production, if Groq fails, do NOT fall back to local (it won't be running)
      // In development, if local BART fails, surface a clear error
      return NextResponse.json(
        {
          ...createErrorResponse('UNKNOWN_ERROR'),
          error: err.message,
          debug: {
            requestId,
            mode: IS_PRODUCTION ? 'groq' : 'local-bart',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error(`[${requestId}] ❌ FATAL ERROR:`, error.message)
    return NextResponse.json(createErrorResponse('INTERNAL_ERROR'), { status: 500 })
  }
}

// ─── GET health check ─────────────────────────────────────────────────────────

export async function GET() {
  if (IS_PRODUCTION) {
    return NextResponse.json({
      status: 'healthy',
      mode: 'production',
      service: 'groq',
      model: 'llama-3.1-8b-instant',
      hasApiKey: !!GROQ_API_KEY,
      cost: 'FREE',
      limits: '14,400 requests/day',
      timestamp: new Date().toISOString(),
    })
  }

  // Check if local BART service is reachable
  let bartStatus = 'unknown'
  try {
    const res = await fetch(`${SUMMARIZATION_SERVICE_URL}/health`, { signal: AbortSignal.timeout(3000) })
    bartStatus = res.ok ? 'healthy' : `unhealthy (${res.status})`
  } catch {
    bartStatus = 'unreachable — run the summarization service locally'
  }

  return NextResponse.json({
    status: bartStatus.startsWith('healthy') ? 'healthy' : 'degraded',
    mode: 'development',
    service: 'local-bart',
    model: 'facebook/bart-large-cnn',
    serviceUrl: SUMMARIZATION_SERVICE_URL,
    bartStatus,
    timestamp: new Date().toISOString(),
  })
}
