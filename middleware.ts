import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Skip auth for OPTIONS requests (CORS preflight)
  if (request.method === 'OPTIONS') {
    return NextResponse.next();
  }

  // Get the authorization header
  const authHeader = request.headers.get('authorization');
  console.log(authHeader)
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'No token provided' },
      { status: 401 }
    );
  }

  // For now, just pass the token through to the API route
  // The API route will handle the actual token verification
  const requestHeaders = new Headers(request.headers);
  console.log(authHeader)
  requestHeaders.set('x-auth-token', authHeader);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// Configure which routes to run the middleware on
export const config = {
  matcher: [
    '/api/analyze-image',
    '/api/user-info',
    '/api/check-subscription',
    '/api/create-subscription',
  ],
}; 