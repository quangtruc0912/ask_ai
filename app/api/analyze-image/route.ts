import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { adminAuth, adminDb } from '../../../lib/firebase';
import { isSameMonth } from '../../../lib/config';
import { getSubscriptionStatus } from '../../utils/subscription';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const FREE_TIER_LIMIT = 5;
const PRO_TIER_LIMIT = 300;

const basePrompt = `You are an expert image analyst. Analyze the following image and describe everything you can observe, including:
- Objects and their relationships
- Text (if any) and what it says
- Scene context or possible setting
- Any notable or unusual details
- Possible purpose or meaning behind the image

Be clear and concise, but include as much detail as possible.`;

const chatPrompt = `You are an expert image assistant. Please help with the following question or request:`;

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

    const { imageBase64, chatMessage, conversationHistory, imageAnalysis } = await request.json();

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
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (imageBase64) {
      // First time image analysis
      if (!imageAnalysis) {
        console.log('chatMessage', chatMessage);
        if (chatMessage) {
          messages.push({
            role: "user",
            content: `${chatPrompt}\n\nCurrent request: ${chatMessage}`,
          });
        }

        messages.push({
          role: "user",
          content: [
            { type: "text", text: basePrompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        });

        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages,
          max_tokens: 500,
        });

        return NextResponse.json({
          message: 'Image analyzed successfully',
          status: 200,
          response: response.choices[0].message.content,
          imageAnalysis: response.choices[0].message.content,
          user: {
            id: decodedToken.uid,
            email: decodedToken.email,
            scanCount,
            remainingScans,
            isProUser: subscriptionStatus.isActive,
            scanLimit
          }
        });
      }
      // Follow-up conversation about the image
      else {
        // Add system message with image analysis
        messages.push({
          role: "system",
          content: `You are analyzing an image with the following description:\n${imageAnalysis}\n\nYou only respond to questions related to description about this image. If asked about something unrelated, respond with: "I can only answer questions about the image shown. Please ask about the image content."`
        });

        // Add conversation history if provided
        if (conversationHistory?.length > 0) {
          messages.push(...conversationHistory.map((msg: any) => ({
            role: msg.role,
            content: msg.content
          })));
        }

        // Add current message
        messages.push({
          role: "user",
          content: chatMessage || 'Please tell me more about this image.'
        });

        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages,
          max_tokens: 500,
        });

        return NextResponse.json({
          message: 'Request processed successfully',
          status: 200,
          response: response.choices[0].message.content,
          imageAnalysis,
          user: {
            id: decodedToken.uid,
            email: decodedToken.email,
            scanCount,
            remainingScans,
            isProUser: subscriptionStatus.isActive,
            scanLimit
          }
        });
      }
    }
    // Regular chat without image
    else {

      messages.push({
        role: "system",
        content: `You are analyzing an image with the following description:\n${imageAnalysis}\n\nYou only respond to questions related to description about this image. If asked about something unrelated, respond with: "I can only answer questions about the image shown. Please ask about the image content."`
      });

      messages.push({
        role: "user",
        content: `${chatPrompt}\n\nPrevious conversation:\n${conversationHistory?.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n') || 'No previous conversation.'}\n\nCurrent request: ${chatMessage}`,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 500,
      });

      return NextResponse.json({
        message: 'Request processed successfully',
        status: 200,
        response: response.choices[0].message.content,
        user: {
          id: decodedToken.uid,
          email: decodedToken.email,
          scanCount: 0,
          remainingScans: scanLimit,
          isProUser: subscriptionStatus.isActive,
          scanLimit
        }
      });
    }
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