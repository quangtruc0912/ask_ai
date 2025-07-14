import { NextResponse } from 'next/server';
import { adminAuth } from '../../../lib/firebase';
import { googleCustomSearch } from '../../utils/request';

export async function POST(request: Request) {
  try {
    // Verify user
    const authHeader = request.headers.get('x-auth-token');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'No token provided', status: 401 }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error) {
      console.error('Error processing request:', error);
      return NextResponse.json({ message: 'Invalid token', status: 401 }, { status: 401 });
    }
    if (!decodedToken.email) {
      return NextResponse.json({ message: 'User email not found', status: 400 }, { status: 400 });
    }

    // Parse query
    const { query } = await request.json();
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ message: 'Missing or invalid query', status: 400 }, { status: 400 });
    }

    // Use the utility function for Google Custom Search
    let items;
    try {
      items = await googleCustomSearch(query);
    } catch (error) {
      return NextResponse.json({ message: error instanceof Error ? error.message : 'Search error', status: 500 }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Search successful',
      status: 200,
      results: items,
    });
  } catch (error) {
    console.error('Error in web search:', error);
    return NextResponse.json({ message: 'Internal server error', status: 500 }, { status: 500 });
  }
} 