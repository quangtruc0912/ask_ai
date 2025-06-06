import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '../../../lib/firebase';
import { isSameMonth, getUserLimits } from '../../../lib/config';
import { getSubscriptionStatus } from '../../utils/subscription';

export async function GET(request: Request) {
  try {
    // Get the auth token from headers
    const authHeader = request.headers.get('x-auth-token');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          message: 'No token provided',
          status: 401,
          remainingRequests: 0
        },
        { status: 401 }
      );
    }

    // Verify the token
    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
      console.log('Authenticated user:', decodedToken.uid);
    } catch (error) {
      console.error('Error verifying token:', error);
      return NextResponse.json(
        {
          message: 'Invalid token',
          status: 401,
          remainingRequests: 0
        },
        { status: 401 }
      );
    }

    if (!decodedToken.email) {
      return NextResponse.json(
        {
          message: 'User email not found',
          status: 400,
          remainingRequests: 0
        },
        { status: 400 }
      );
    }

    // Check subscription status
    const subscriptionStatus = await getSubscriptionStatus(decodedToken.email);
    const { requestLimit } = getUserLimits(subscriptionStatus.isActive);

    // Get user data from database
    const userRef = adminDb.ref(`users/${decodedToken.uid}`);
    const userSnapshot = await userRef.once('value');
    const userData = userSnapshot.val() || { requestCount: 0, lastRequest: null };

    const now = new Date();
    const lastRequest = userData.lastRequest ? new Date(userData.lastRequest) : null;

    // Reset request count if it's a new month
    if (!lastRequest || !isSameMonth(now, lastRequest)) {
      userData.requestCount = 0;
      await userRef.update({ requestCount: 0 });
    }

    return NextResponse.json({
      message: 'User info retrieved successfully',
      status: 200,
      user: {
        id: decodedToken.uid,
        email: decodedToken.email,
        requestCount: userData.requestCount,
        remainingRequests: requestLimit - userData.requestCount,
        isProUser: subscriptionStatus.isActive,
        lastRequest: userData.lastRequest,
        requestLimit
      }
    });
  } catch (error) {
    console.error('Error retrieving user info:', error);
    return NextResponse.json(
      {
        message: 'Failed to retrieve user info',
        status: 500,
        remainingRequests: 0
      },
      { status: 500 }
    );
  }
} 