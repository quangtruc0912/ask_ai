import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '../../../lib/firebase';
import { isSameMonth } from '../../../lib/config';
import { getSubscriptionStatus } from '../../utils/subscription';
import { getModelConfig } from '../../../lib/models';
import { generateResponse ,GenericMessage} from '../../../lib/ai-providers';


export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

const FREE_TIER_LIMIT = 5;
const PRO_TIER_LIMIT = 300;

export async function POST(request: Request) {
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

    const { imageBase64, chatMessage, prompt, conversationHistory, modelId } = await request.json();

    if (!imageBase64 && !chatMessage) {
      return NextResponse.json(
        {
          message: 'No message or image provided',
          status: 400,
          remainingScans: 0
        },
        { status: 400 }
      );
    }

    // Get model configuration
    const modelConfig = getModelConfig(modelId || 'gpt-4-vision-preview');
    if (!modelConfig) {
      return NextResponse.json(
        {
          message: 'Invalid model selected',
          status: 400,
          remainingScans: 0
        },
        { status: 400 }
      );
    }

    // Check if model supports images when image is provided
    if (imageBase64 && !modelConfig.supportsImages) {
      return NextResponse.json(
        {
          message: 'Selected model does not support image analysis',
          status: 400,
          remainingScans: 0
        },
        { status: 400 }
      );
    }

    // Only check and update scan limits if image is provided
    let scanCount = 0;
    let remainingScans = 0;
    if (imageBase64) {
      const userRef = adminDb.ref(`users/${decodedToken.uid}`);
      const userSnapshot = await userRef.once('value');
      const userData = userSnapshot.val() || { scanCount: 0, lastScan: null };

      const now = new Date();
      const lastScan = userData.lastScan ? new Date(userData.lastScan) : null;

      // Reset scan count if it's a new month
      if (!lastScan || !isSameMonth(now, lastScan)) {
        userData.scanCount = 0;
      }

      // Check if user has exceeded monthly limit
      if (userData.scanCount >= scanLimit) {
        return NextResponse.json(
          {
            message: subscriptionStatus.isActive ? 'Pro monthly scan limit reached' : 'Free tier scan limit reached',
            status: 429,
            remainingScans: 0,
            limit: scanLimit,
            resetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
            isProUser: subscriptionStatus.isActive
          },
          { status: 429 }
        );
      }

      // Update scan count in database
      scanCount = userData.scanCount + 1;
      remainingScans = scanLimit - scanCount;
      await userRef.update({
        scanCount,
        lastScan: now.toISOString(),
      });
    }

    // Prepare messages for AI
    const messages: GenericMessage[] = [
      {
        role: 'system',
        content: prompt,
      }
    ];

    // Add conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      conversationHistory.forEach((msg: ConversationMessage) => {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      });
    }

    if (imageBase64) {
      // If image is provided, analyze the image
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: chatMessage ? chatMessage : 'Analyze the image and answer any question it contains.' },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`,
            },
          },
        ],
      });
    } else if (chatMessage) {
      // If only text question is provided
      messages.push({
        role: 'user',
        content: chatMessage,
      });
    }

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
        scanCount,
        remainingScans,
        isProUser: subscriptionStatus.isActive,
        scanLimit
      }
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      {
        message: 'Failed to process request',
        status: 500,
        remainingScans: 0
      },
      { status: 500 }
    );
  }
} 