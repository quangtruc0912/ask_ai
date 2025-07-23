import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_ORIGIN = '*'; // Replace this

export async function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    const preflight = new NextResponse(null, { status: 204 });

    // Only allow requests from the specific origin
    if (origin === ALLOWED_ORIGIN) {
      preflight.headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    }

    preflight.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    preflight.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    preflight.headers.set('Access-Control-Max-Age', '86400');

    return preflight;
  }

  // Validate Authorization header
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    const res = NextResponse.json(
      { error: 'No token provided' },
      { status: 401 }
    );
    if (origin === ALLOWED_ORIGIN) {
      res.headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    }
    return res;
  }

  // Pass token via custom header
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-auth-token', authHeader);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Add CORS header to successful responses
  if (origin === ALLOWED_ORIGIN) {
    response.headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  }

  return response;
}

// Middleware route matcher
export const config = {
  matcher: [
    '/api/analyze-action',
    '/api/chat',
    '/api/analyze-image-only',
    '/api/user-info',
    '/api/check-subscription',
    '/api/create-subscription',
    '/api/write',
    '/api/web-analysis',
  ],
};
