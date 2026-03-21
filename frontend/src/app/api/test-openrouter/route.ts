import { NextResponse } from 'next/server'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const NODE_ENV = process.env.NODE_ENV
const IS_VERCEL = process.env.VERCEL === '1' || process.env.VERCEL_ENV === 'production'
const IS_PRODUCTION = NODE_ENV === 'production' || IS_VERCEL

/**
 * Simple test endpoint to verify OpenRouter API configuration
 * Visit: /api/test-openrouter
 */
export async function GET() {
  const testId = crypto.randomUUID().substring(0, 8)
  
  console.log(`[Test:${testId}] ========== OPENROUTER API TEST ==========`)
  console.log(`[Test:${testId}] Environment:`, NODE_ENV)
  console.log(`[Test:${testId}] VERCEL:`, process.env.VERCEL)
  console.log(`[Test:${testId}] VERCEL_ENV:`, process.env.VERCEL_ENV)
  console.log(`[Test:${testId}] IS_VERCEL:`, IS_VERCEL)
  console.log(`[Test:${testId}] IS_PRODUCTION:`, IS_PRODUCTION)
  console.log(`[Test:${testId}] OPENROUTER_API_KEY exists:`, !!OPENROUTER_API_KEY)
  console.log(`[Test:${testId}] OPENROUTER_API_KEY length:`, OPENROUTER_API_KEY?.length || 0)

  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      IS_VERCEL,
      IS_PRODUCTION
    },
    hasApiKey: !!OPENROUTER_API_KEY,
    apiKeyLength: OPENROUTER_API_KEY?.length || 0,
    apiKeyPrefix: OPENROUTER_API_KEY?.substring(0, 15) || 'N/A',
    testId
  }

  if (!OPENROUTER_API_KEY) {
    console.error(`[Test:${testId}] ❌ OPENROUTER_API_KEY not found`)
    return NextResponse.json({
      success: false,
      error: 'OPENROUTER_API_KEY environment variable is not set',
      diagnostics,
      instructions: 'Add OPENROUTER_API_KEY to Vercel environment variables and redeploy'
    }, { status: 500 })
  }

  try {
    console.log(`[Test:${testId}] Calling OpenRouter API...`)
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
        model: 'meta-llama/llama-3.2-1b-instruct:free',
        messages: [{
          role: 'user',
          content: 'Say "Hello, OpenRouter API is working!" in one sentence.'
        }],
        route: 'fallback'
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
      message: 'OpenRouter API is working correctly',
      response: text,
      model: 'meta-llama/llama-3.2-1b-instruct:free',
      diagnostics: {
        ...diagnostics,
        responseTime: duration,
        choicesCount: data.choices?.length || 0
      }
    })

  } catch (error: any) {
    console.error(`[Test:${testId}] ========== TEST FAILED ==========`)
    console.error(`[Test:${testId}] Error type:`, typeof error)
    console.error(`[Test:${testId}] Error name:`, error.name)
    console.error(`[Test:${testId}] Error message:`, error.message)
    console.error(`[Test:${testId}] Error stack:`, error.stack)

    return NextResponse.json({
      success: false,
      error: error.message,
      errorType: error.name,
      diagnostics: {
        ...diagnostics,
        errorDetails: {
          message: error.message,
          name: error.name
        }
      }
    }, { status: 500 })
  }
}
