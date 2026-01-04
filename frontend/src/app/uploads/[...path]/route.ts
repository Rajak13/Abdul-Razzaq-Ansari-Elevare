import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const filePath = path.join('/');
    
    const response = await fetch(`${BACKEND_URL}/uploads/${filePath}`, {
      method: 'GET',
      headers: {
        // Forward any relevant headers
        ...(request.headers.get('range') && {
          'range': request.headers.get('range')!
        })
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: response.status }
      );
    }

    // Get the response as a stream
    const fileStream = response.body;
    
    if (!fileStream) {
      return NextResponse.json(
        { error: 'File stream not available' },
        { status: 500 }
      );
    }

    // Create response with proper headers
    const headers = new Headers();
    
    // Copy relevant headers from backend response
    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');
    const contentDisposition = response.headers.get('content-disposition');
    const cacheControl = response.headers.get('cache-control');
    const etag = response.headers.get('etag');
    const lastModified = response.headers.get('last-modified');

    if (contentType) headers.set('Content-Type', contentType);
    if (contentLength) headers.set('Content-Length', contentLength);
    if (contentDisposition) headers.set('Content-Disposition', contentDisposition);
    if (cacheControl) headers.set('Cache-Control', cacheControl);
    if (etag) headers.set('ETag', etag);
    if (lastModified) headers.set('Last-Modified', lastModified);

    // Handle range requests for video/audio files
    if (response.status === 206) {
      const contentRange = response.headers.get('content-range');
      if (contentRange) headers.set('Content-Range', contentRange);
      headers.set('Accept-Ranges', 'bytes');
      
      return new NextResponse(fileStream, {
        status: 206,
        headers
      });
    }

    return new NextResponse(fileStream, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('File proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}