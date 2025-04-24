import { NextResponse } from 'next/server';
import { getSubscriptionStatus } from '../../utils/subscription';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('x-auth-token');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { 
          message: 'No token provided',
          status: 401,
        },
        { status: 401 }
      );
    }
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const status = await getSubscriptionStatus(email);
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error checking subscription:', error);
    return NextResponse.json(
      { error: 'Failed to check subscription status' },
      { status: 500 }
    );
  }
} 