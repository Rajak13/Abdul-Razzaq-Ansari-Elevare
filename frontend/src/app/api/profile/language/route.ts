import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
const SUPPORTED_LOCALES = ['en', 'ne', 'ko'];

/**
 * Update user language preference
 * PATCH /api/profile/language
 */
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    console.log('[Language API] Auth header present:', !!authHeader);
    
    if (!authHeader) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authorization header is required',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { language } = body;

    console.log('[Language API] Language requested:', language);

    // Validate locale
    if (!language || !SUPPORTED_LOCALES.includes(language)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_LOCALE',
            message: `Language must be one of: ${SUPPORTED_LOCALES.join(', ')}`,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    console.log('[Language API] Forwarding to backend:', `${BACKEND_URL}/api/auth/language`);

    // Forward request to backend
    const response = await fetch(`${BACKEND_URL}/api/auth/language`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({ preferred_language: language }),
    });

    console.log('[Language API] Backend response status:', response.status);

    // Handle empty responses (204 No Content or empty body)
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const text = await response.text();
      data = text ? JSON.parse(text) : {};
    } else {
      data = {};
    }

    if (!response.ok) {
      console.error('[Language API] Backend error:', data);
      return NextResponse.json(data, { status: response.status });
    }

    // Return success response
    return NextResponse.json(
      { 
        success: true, 
        language,
        message: 'Language preference updated successfully' 
      }, 
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Language preference update error:', error);
    
    return NextResponse.json(
      {
        error: {
          code: 'UPDATE_LANGUAGE_FAILED',
          message: 'Failed to update language preference',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
