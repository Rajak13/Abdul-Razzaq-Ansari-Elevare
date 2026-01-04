import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = new URLSearchParams();
    
    // Forward all query parameters
    searchParams.forEach((value, key) => {
      params.append(key, value);
    });

    const response = await fetch(`${BACKEND_URL}/api/resources?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward auth headers if present
        ...(request.headers.get('authorization') && {
          'authorization': request.headers.get('authorization')!
        }),
        ...(request.headers.get('cookie') && {
          'cookie': request.headers.get('cookie')!
        })
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch resources' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Resources API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const response = await fetch(`${BACKEND_URL}/api/resources`, {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type for FormData, let the browser set it
        ...(request.headers.get('authorization') && {
          'authorization': request.headers.get('authorization')!
        }),
        ...(request.headers.get('cookie') && {
          'cookie': request.headers.get('cookie')!
        })
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Resource upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload resource' },
      { status: 500 }
    );
  }
}