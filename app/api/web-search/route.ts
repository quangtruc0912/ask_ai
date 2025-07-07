import { NextResponse } from 'next/server';
import { adminAuth } from '../../../lib/firebase';

const GOOGLE_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_SEARCH_CSE_ID;

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
    if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
      return NextResponse.json({ message: 'Google Search API not configured', status: 500 }, { status: 500 });
    }

    // Call Google Custom Search API
    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CSE_ID}&q=${encodeURIComponent(query)}`;
    const googleRes = await fetch(url);
    if (!googleRes.ok) {
      return NextResponse.json({ message: 'Failed to fetch from Google Search API', status: 500 }, { status: 500 });
    }
    const data = await googleRes.json();

    // Define a type for Google search result items
    type GoogleSearchItem = {
      title?: string;
      link?: string;
      snippet?: string;
    };

    const items = Array.isArray(data?.items)
      ? (data.items as GoogleSearchItem[]).map((item) => ({
          title: item.title ?? '',
          url: item.link ?? '',
          snippet: item.snippet ?? '',
        }))
      : [];

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