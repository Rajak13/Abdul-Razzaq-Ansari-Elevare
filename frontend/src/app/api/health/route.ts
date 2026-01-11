import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if summarization service is available
    const summarizationHealthy = await fetch('http://localhost:8001/health', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(res => res.ok)
      .catch(() => false);

    // Check if backend service is available  
    const backendHealthy = await fetch('http://localhost:5001/health', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(res => res.ok)
      .catch(() => false);

    const status = summarizationHealthy && backendHealthy ? 'healthy' : 'degraded';

    return NextResponse.json({
      status,
      service: 'Elevare Frontend',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      dependencies: {
        summarization_service: summarizationHealthy ? 'healthy' : 'unavailable',
        backend_service: backendHealthy ? 'healthy' : 'unavailable'
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        service: 'Elevare Frontend',
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}