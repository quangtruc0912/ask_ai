import { NextResponse } from 'next/server';
import { adminAuth } from '../../../lib/firebase';
import { getAvailableModels, getImageSupportedModels } from '../../../lib/models';
import { getSubscriptionStatus } from '../../utils/subscription';

export async function GET(request: Request) {
  try {
    // Get the auth token from headers
    const authHeader = request.headers.get('x-auth-token');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          message: 'No token provided',
          status: 401
        },
        { status: 401 }
      );
    }

    // Verify the token
    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error) {
      console.error('Error verifying token:', error);
      return NextResponse.json(
        {
          message: 'Invalid token',
          status: 401
        },
        { status: 401 }
      );
    }

    if (!decodedToken.email) {
      return NextResponse.json(
        {
          message: 'User email not found',
          status: 400
        },
        { status: 400 }
      );
    }

    // Check subscription status
    const subscriptionStatus = await getSubscriptionStatus(decodedToken.email);

    // Get available models based on subscription status
    const availableModels = getAvailableModels(subscriptionStatus.isActive);
    const imageSupportedModels = getImageSupportedModels(subscriptionStatus.isActive);

    return NextResponse.json({
      message: 'Models retrieved successfully',
      status: 200,
      models: {
        all: availableModels,
        imageSupported: imageSupportedModels
      },
      user: {
        id: decodedToken.uid,
        email: decodedToken.email,
        isProUser: subscriptionStatus.isActive
      }
    });
  } catch (error) {
    console.error('Error retrieving models:', error);
    return NextResponse.json(
      {
        message: 'Failed to retrieve models',
        status: 500
      },
      { status: 500 }
    );
  }
} 