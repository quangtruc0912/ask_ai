import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '../../../lib/firebase';
import { isSameMonth, getNextMonthFirstDay, formatDateToISO } from '../../../lib/config';
import { getModelConfig } from '../../../lib/models';
import { generateResponse, GenericMessage } from '../../../lib/ai-providers';
import { getClientIp } from '../../utils/request';
import { enhanceConversationWithSearch, RequestEnhancements } from '../../utils/request';

export interface ConversationMessage {
  sender: 'user' | 'assistant';
  text: string;
}

export async function POST(request: Request) {
  try {
    // Extract IP address
    const ip = getClientIp(request);
    console.log('ip', ip)
    // Try to get email from x-auth-token if present
    let email: string | null = null;
    let decodedToken: { email?: string } | null = null;
    const authHeader = request.headers.get('x-auth-token');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      try {
        decodedToken = await adminAuth.verifyIdToken(token);
        email = decodedToken.email || null;
      } catch (error) {
        // Invalid token, ignore and treat as anonymous
        email = null;
        console.error('Error processing request:', error);
      }
    }

    // Determine Firebase key and request limit
    let key = `requests/${ip}`;
    let requestLimit = 10;
    if (email) {
      key = `requests/${ip}_${email}`;
      requestLimit = 30;
    }

    // Parse request body
    const { imageBase64, chatMessage, prompt, conversationHistory, modelId, enhancements }: {
      imageBase64?: string;
      chatMessage?: string;
      prompt: string;
      conversationHistory?: ConversationMessage[];
      modelId?: string;
      enhancements?: RequestEnhancements;
    } = await request.json();

    if (!imageBase64 && !chatMessage) {
      return NextResponse.json(
        {
          message: 'No message or image provided',
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

    // Check if model supports images when image is provided
    if (imageBase64 && !modelConfig.supportsImages) {
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
    const reqRef = adminDb.ref(key);
    const reqSnapshot = await reqRef.once('value');
    const reqData = reqSnapshot.val() || { requestCount: 0, lastRequest: null, ip, email };

    const now = new Date();
    const lastRequest = reqData.lastRequest ? new Date(reqData.lastRequest) : null;

    // Reset request count if it's a new month
    if (!lastRequest || !isSameMonth(now, lastRequest)) {
      reqData.requestCount = 0;
    }

    // Check if user has exceeded monthly limit
    if (reqData.requestCount >= requestLimit) {
      return NextResponse.json(
        {
          message: email ? 'Monthly request limit reached (IP+email)' : 'Monthly request limit reached (IP only)',
          status: 429,
          remainingRequests: 0,
          limit: requestLimit,
          resetDate: formatDateToISO(getNextMonthFirstDay(now)),
          ip,
          email
        },
        { status: 429 }
      );
    }

    // Update request count in database
    const requestCount = reqData.requestCount + 1;
    const remainingRequests = requestLimit - requestCount;
    await reqRef.update({
      requestCount,
      lastRequest: formatDateToISO(now),
      ip,
      email
    });

    // Prepare messages for AI
    const messages: GenericMessage[] = [
      {
        role: 'system',
        content: prompt,
      }
    ];

    // Add web search results if enabled and chatMessage is present
    if (enhancements?.allowApiSearch && chatMessage) {
      const searchMessages = await enhanceConversationWithSearch(chatMessage, enhancements);
      searchMessages.forEach((msg) => {
        messages.push({
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.content,
        });
      });
    }

    // Add conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      conversationHistory.forEach((msg: ConversationMessage) => {
        messages.push({
          role: msg.sender,
          content: msg.text,
        });
      });
    }

    if (imageBase64) {
      // If image is provided, analyze the image
      messages.push({
        role: 'user',
        content: chatMessage ? chatMessage : 'Analyze the image and answer any question it contains.',
        imageBase64: imageBase64
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
        ip,
        email,
        requestCount,
        remainingRequests,
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