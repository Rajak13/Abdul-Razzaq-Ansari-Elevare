import { NextResponse } from 'next/server'

const GROQ_API_KEY = process.env.GROQ_API_KEY

/**
 * Simple test endpoint to verify Groq API configuration
 * Visit: /api/test-groq
 */
export async function GET() {
  const testId = crypto.randomUUID().substring(0, 8)
  
  console.log(`[Test:${testId}] ========== GROQ API TEST ==========`)
  console.log(`[Test:${testId}] GROQ_API_KEY exists:`, !!GROQ_API_KEY)
  console.log(`[Test:${testId}] GROQ_API_KEY length:`, GROQ_API_KEY?.length || 0)

  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    hasApiKey: !!GROQ_API_KEY,
    apiKeyLength: GROQ_API_KEY?.length || 0,
    apiKeyPrefix: GROQ_API_KEY?.substring(0, 10) || 'N/A',
    testId
  }

  if (!GROQ_API_KEY) {
    console.error(`[Test:${testId}] ❌ GROQ_API_KEY not found`)
    return NextResponse.json({
      success: false,
      error: 'GROQ_API_KEY environment variable is not set',
      diagnostics,
      instructions: 'Add GROQ_API_KEY to Vercel environment variables and redeploy'
    }, { status: 500 })
  }

  try {
    console.log(`[Test:${testId}] Calling Groq API...`)
    const startTime = Date.now()
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{
          role: 'user',
          content: 'Say "Hello, Groq API is working!" in one sentence.'
        }],
        temperature: 0.5,
        max_tokens: 50
      })
    })
    
    const duration = Date.now() - startTime
    console.log(`[Test:${testId}] ✓ Response received in ${duration}ms`)
    console.log(`[Test:${testId}] Response status:`, response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Test:${testId}] ❌ API error:`, errorText)
      throw new Error(`API returned ${response.status}: ${errorText}`)
    }
    
    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || 'No response'
    
    console.log(`[Test:${testId}] ✓ Response text:`, text)
    console.log(`[Test:${testId}] ========== TEST SUCCESSFUL ==========`)

    return NextResponse.json({
      success: true,
      message: 'Groq API is working correctly',
      response: text,
      model: 'llama-3.1-8b-instant',
      cost: 'FREE',
      limits: '14,400 requests/day',
      diagnostics: {
        ...diagnostics,
        responseTime: duration,
        choicesCount: data.choices?.length || 0
      }
    })

  } catch (error: any) {
    console.error(`[Test:${testId}] ========== TEST FAILED ==========`)
    console.error(`[Test:${testId}] Error:`, error.message)

    return NextResponse.json({
      success: false,
      error: error.message,
      errorType: error.name,
      diagnostics
    }, { status: 500 })
  }
}
