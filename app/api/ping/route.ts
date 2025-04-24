import { NextResponse } from 'next/server';

// Helper function to add CORS headers
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

export async function OPTIONS() {
  return addCorsHeaders(new NextResponse(null, { status: 204 }));
}

export async function GET(request: Request) {
  // Log the request headers for debugging
  console.log('Ping received from:', request.headers.get('user-agent'));
  
  const response = NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Ping received successfully'
  });
  
  return addCorsHeaders(response);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Log the request data for debugging
    console.log('Ping POST received data:', body);
    
    const response = NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      receivedData: body,
      message: 'Data received successfully'
    });
    
    return addCorsHeaders(response);
  } catch {
    const response = NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: 'Invalid JSON data received'
    }, { status: 400 });
    
    return addCorsHeaders(response);
  }
} 