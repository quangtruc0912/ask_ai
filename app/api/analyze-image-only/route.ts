import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '../../../lib/firebase';
import { isSameMonth, getUserLimits, getNextMonthFirstDay, formatDateToISO } from '../../../lib/config';
import { getSubscriptionStatus } from '../../utils/subscription';
import { getModelConfig } from '../../../lib/models';
import { generateResponse, GenericMessage } from '../../../lib/ai-providers';

export async function POST(request: Request) {
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

    const { imageBase64, prompt, modelId } = await request.json();
    
    // Clean up the base64 string if it contains data URL prefix
    const cleanBase64 = imageBase64?.replace(/^data:image\/\w+;base64,/, '');
    
    if (!cleanBase64) {
      return NextResponse.json(
        {
          message: 'No image provided',
          status: 400,
          remainingRequests: 0
        },
        { status: 400 }
      );
    }

    // Get model configuration
    const modelConfig = getModelConfig(modelId || 'gpt-4o-mini');
    if (!modelConfig) {
      return NextResponse.json(
        {
          message: 'Invalid model selected',
          status: 400,
          remainingRequests: 0
        },
        { status: 400 }
      );
    }

    // Check if model supports images
    if (!modelConfig.supportsImages) {
      return NextResponse.json(
        {
          message: 'Selected model does not support image analysis',
          status: 400,
          remainingRequests: 0
        },
        { status: 400 }
      );
    }

    // Check and update request limits
    const userRef = adminDb.ref(`users/${decodedToken.uid}`);
    const userSnapshot = await userRef.once('value');
    const userData = userSnapshot.val() || { requestCount: 0, lastRequest: null };

    const now = new Date();
    const lastRequest = userData.lastRequest ? new Date(userData.lastRequest) : null;

    // Reset request count if it's a new month
    if (!lastRequest || !isSameMonth(now, lastRequest)) {
      userData.requestCount = 0;
    }

    // Check if user has exceeded monthly limit
    if (userData.requestCount >= requestLimit) {
      return NextResponse.json(
        {
          message: subscriptionStatus.isActive ? 'Pro monthly request limit reached' : 'Free tier request limit reached',
          status: 429,
          remainingRequests: 0,
          limit: requestLimit,
          resetDate: formatDateToISO(getNextMonthFirstDay(now)),
          isProUser: subscriptionStatus.isActive
        },
        { status: 429 }
      );
    }

    // Update request count in database
    const requestCount = userData.requestCount + 1;
    const remainingRequests = requestLimit - requestCount;
    await userRef.update({
      requestCount,
      lastRequest: formatDateToISO(now),
    });

    // Prepare messages for AI
    const messages: GenericMessage[] = [
      {
        role: 'system',
        content: prompt || 'Analyze the image and provide a detailed description of what you see.',
      },
      {
        role: 'user',
        imageBase64 : `data:image/jpeg;base64,${cleanBase64}`,
        content: '',
      }
    ];

    // Generate response using the selected model
    const response = await generateResponse(modelConfig, messages, modelConfig.maxTokens);

    return NextResponse.json({
      message: 'Request processed successfully',
      status: 200,
      response: response.content,
      usage: response.usage,
      user: {
        id: decodedToken.uid,
        email: decodedToken.email,
        requestCount,
        remainingRequests,
        isProUser: subscriptionStatus.isActive,
        requestLimit
      }
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      {
        message: 'Failed to process request',
        status: 500,
        remainingRequests: 0
      },
      { status: 500 }
    );
  }
} 