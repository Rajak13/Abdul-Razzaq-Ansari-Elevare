import { NextResponse } from 'next/server'

/**
 * Debug endpoint to check all environment variables
 * REMOVE THIS AFTER DEBUGGING
 */
export async function GET() {
  const allEnvKeys = Object.keys(process.env).filter(key => 
    key.includes('GROQ') || 
    key.includes('API') || 
    key.includes('VERCEL') ||
    key.includes('NODE_ENV')
  )
  
  const envInfo: Record<string, any> = {}
  
  allEnvKeys.forEach(key => {
    if (key.includes('KEY') || key.includes('SECRET')) {
      // Don't expose full keys, just show if they exist
      envInfo[key] = process.env[key] ? `EXISTS (${process.env[key]?.length} chars)` : 'NOT SET'
    } else {
      envInfo[key] = process.env[key] || 'NOT SET'
    }
  })
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    isVercel: !!process.env.VERCEL,
    groqApiKey: process.env.GROQ_API_KEY ? `EXISTS (${process.env.GROQ_API_KEY.length} chars)` : 'NOT SET',
    allRelevantEnv: envInfo
  })
}
