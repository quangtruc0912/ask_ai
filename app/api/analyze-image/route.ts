import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { adminAuth, adminDb } from '../../../lib/firebase';
import { isSameMonth } from '../../../lib/config';
import { getSubscriptionStatus } from '../../utils/subscription';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const FREE_TIER_LIMIT = 5;
const PRO_TIER_LIMIT = 300;

const basePrompt = `You are a smart assistant that answers all types of questions and can exchange pleasantries.

Use temporary memory to remember relevant context during the current session, such as the topic of previous questions or user preferences (e.g. format, tone).

If the input is a multiple-choice question with options A, B, C, and D, return only the correct letter and its option (e.g., C. Paris). Do not explain.

If the input is a regular open-ended question, return a short and direct answer only—no explanations.

If you receive multiple questions, answer each one in the same format, separated clearly (e.g., by numbering or newlines).

For pleasantries (e.g., "Hi", "Thanks"), respond briefly and politely.

Remember: adapt to the flow of the conversation using temporary memory to handle context, follow-ups, or repeated formats.

`;


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

    const { imageBase64, chatMessage, prompt, isSystemPrompt, conversationHistory } = await request.json();

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

    // Prepare messages for OpenAI
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: isSystemPrompt ? basePrompt : prompt,
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
      // If image is provided, analyze the image for a question
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

      // Use a single request to get both image description and answer
      const combinedResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'First, describe briefly what is in the image. Then, answer the question.',
          },
          {
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
          },
        ],
        max_tokens: 300,
      });

      const combinedContent = combinedResponse.choices[0].message.content || '';
      const parts = combinedContent.split('\n');
      const imageDescription = parts[0];
      const answer = parts.slice(1).join('\n').replace(/^\n/, '');

      return NextResponse.json({
        message: 'Request processed successfully',
        status: 200,
        response: answer,
        imageDescription: imageDescription,
        user: {
          id: decodedToken.uid,
          email: decodedToken.email,
          scanCount,
          remainingScans,
          isProUser: subscriptionStatus.isActive,
          scanLimit
        }
      });
    } else if (chatMessage) {
      // If only text question is provided
      messages.push({
        role: 'user',
        content: chatMessage,
      });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 300,
    });

    return NextResponse.json({
      message: 'Request processed successfully',
      status: 200,
      response: response.choices[0].message.content,
      imageDescription: null,
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