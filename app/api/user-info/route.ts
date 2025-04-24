import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '../../../lib/firebase';
import { isSameMonth } from '../../../lib/config';
import { getSubscriptionStatus } from '../../utils/subscription';

const FREE_TIER_LIMIT = 5;
const PRO_TIER_LIMIT = 300;

export async function GET(request: Request) {
  try {
    // Get the auth token from headers
    const authHeader = request.headers.get('x-auth-token');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { 
          message: 'No token provided',
          status: 401,
          remainingScans: 0
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
          remainingScans: 0
        },
        { status: 401 }
      );
    }

    if (!decodedToken.email) {
      return NextResponse.json(
        { 
          message: 'User email not found',
          status: 400,
          remainingScans: 0
        },
        { status: 400 }
      );
    }

    // Check subscription status
    const subscriptionStatus = await getSubscriptionStatus(decodedToken.email);
    const scanLimit = subscriptionStatus.isActive ? PRO_TIER_LIMIT : FREE_TIER_LIMIT;

    // Get user data from database
    const userRef = adminDb.ref(`users/${decodedToken.uid}`);
    const userSnapshot = await userRef.once('value');
    const userData = userSnapshot.val() || { scanCount: 0, lastScan: null };
    
    const now = new Date();
    const lastScan = userData.lastScan ? new Date(userData.lastScan) : null;
    
    // Reset scan count if it's a new month
    if (!lastScan || !isSameMonth(now, lastScan)) {
      userData.scanCount = 0;
      await userRef.update({ scanCount: 0 });
    }

    // Calculate reset date (first day of next month)
    const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return NextResponse.json({ 
      message: 'User information retrieved successfully',
      status: 200,
      user: {
        id: decodedToken.uid,
        email: decodedToken.email,
        scanCount: userData.scanCount,
        remainingScans: scanLimit - userData.scanCount,
        resetDate: resetDate.toISOString(),
        lastScan: userData.lastScan,
        subscription: {
          isActive: subscriptionStatus.isActive,
          expiresAt: subscriptionStatus.expiresAt,
          planId: subscriptionStatus.planId,
          scanLimit,
          tier: subscriptionStatus.isActive ? 'pro' : 'free'
        }
      }
    });
  } catch (error) {
    console.error('Error getting user information:', error);
    return NextResponse.json(
      { 
        message: 'Failed to get user information',
        status: 500,
        remainingScans: 0
      },
      { status: 500 }
    );
  }
} 