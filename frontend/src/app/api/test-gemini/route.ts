import { NextResponse } from 'next/server'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const NODE_ENV = process.env.NODE_ENV
const IS_VERCEL = process.env.VERCEL === '1' || process.env.VERCEL_ENV === 'production'
const IS_PRODUCTION = NODE_ENV === 'production' || IS_VERCEL

/**
 * Simple test endpoint to verify Gemini API configuration
 * Visit: /api/test-gemini
 */
export async function GET() {
  const testId = crypto.randomUUID().substring(0, 8)
  
  console.log(`[Test:${testId}] ========== GEMINI API TEST ==========`)
  console.log(`[Test:${testId}] Environment:`, NODE_ENV)
  console.log(`[Test:${testId}] VERCEL:`, process.env.VERCEL)
  console.log(`[Test:${testId}] VERCEL_ENV:`, process.env.VERCEL_ENV)
  console.log(`[Test:${testId}] IS_VERCEL:`, IS_VERCEL)
  console.log(`[Test:${testId}] IS_PRODUCTION:`, IS_PRODUCTION)
  console.log(`[Test:${testId}] GEMINI_API_KEY exists:`, !!GEMINI_API_KEY)
  console.log(`[Test:${testId}] GEMINI_API_KEY length:`, GEMINI_API_KEY?.length || 0)
  console.log(`[Test:${testId}] GEMINI_API_KEY prefix:`, GEMINI_API_KEY?.substring(0, 20) || 'N/A')

  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      IS_VERCEL,
      IS_PRODUCTION
    },
    hasApiKey: !!GEMINI_API_KEY,
    apiKeyLength: GEMINI_API_KEY?.length || 0,
    apiKeyPrefix: GEMINI_API_KEY?.substring(0, 10) || 'N/A',
    testId
  }

  if (!GEMINI_API_KEY) {
    console.error(`[Test:${testId}] ❌ GEMINI_API_KEY not found`)
    return NextResponse.json({
      success: false,
      error: 'GEMINI_API_KEY environment variable is not set',
      diagnostics,
      instructions: 'Add GEMINI_API_KEY to Vercel environment variables and redeploy'
    }, { status: 500 })
  }

  try {
    console.log(`[Test:${testId}] Calling Gemini REST API (v1)...`)
    const startTime = Date.now()
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: 'Say "Hello, Gemini API is working!" in one sentence.'
          }]
        }]
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
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response'
    
    console.log(`[Test:${testId}] ✓ Response text:`, text)
    console.log(`[Test:${testId}] ========== TEST SUCCESSFUL ==========`)

    return NextResponse.json({
      success: true,
      message: 'Gemini API is working correctly',
      response: text,
      diagnostics: {
        ...diagnostics,
        responseTime: duration,
        candidatesCount: data.candidates?.length || 0
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
