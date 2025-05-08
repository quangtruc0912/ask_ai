import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { adminAuth, adminDb } from '../../../lib/firebase';
import { isSameMonth } from '../../../lib/config';
import { getSubscriptionStatus } from '../../utils/subscription';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const FREE_TIER_TOKEN_LIMIT = 100000; // 100K tokens per month
const PRO_TIER_TOKEN_LIMIT = 100000000; // 1M tokens per month

const basePrompt = `You are an expert content analyst. Analyze the following screenshot and provide a brief analysis:

1. Provide a one-line summary of the key information

2. Identify the target audience

3. Purpose/Goal:
- State the primary purpose or goal of the content in one line

Keep the analysis extremely concise. Focus only on the most essential information.`;

const contextPrompt = `You are an expert content analyst. Analyze the following screenshot and provide a brief analysis of changes:

1. Main Changes:
- Provide a one-line summary of key changes

2. Purpose/Goal:
- State the primary purpose or goal of the changes in one line

Focus only on new information and changes. Keep the analysis extremely concise.`;

export async function POST(request: Request) {
  try {
    // Get the auth token from headers
    const authHeader = request.headers.get('x-auth-token');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          message: 'No token provided',
          status: 401,
          remainingTokens: 0
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
          remainingTokens: 0
        },
        { status: 401 }
      );
    }

    if (!decodedToken.email) {
      return NextResponse.json(
        {
          message: 'User email not found',
          status: 400,
          remainingTokens: 0
        },
        { status: 400 }
      );
    }

    // Check subscription status
    const subscriptionStatus = await getSubscriptionStatus(decodedToken.email);
    const tokenLimit = subscriptionStatus.isActive ? PRO_TIER_TOKEN_LIMIT : FREE_TIER_TOKEN_LIMIT;

    const { screenshotBase64, previousAnalysis } = await request.json();

    if (!screenshotBase64) {
      return NextResponse.json(
        {
          message: 'No screenshot provided',
          status: 400,
          remainingTokens: 0
        },
        { status: 400 }
      );
    }

    // Check and update token usage
    const userRef = adminDb.ref(`users/${decodedToken.uid}`);
    const userSnapshot = await userRef.once('value');
    const userData = userSnapshot.val() || { 
      tokenUsage: 0, 
      lastReset: null,
      monthlyHistory: {}
    };

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${now.getMonth() + 1}`;
    const lastReset = userData.lastReset ? new Date(userData.lastReset) : null;

    // Reset token usage if it's a new month
    if (!lastReset || !isSameMonth(now, lastReset)) {
      userData.tokenUsage = 0;
      userData.lastReset = now.toISOString();
    }

    // Check if user has exceeded monthly token limit
    if (userData.tokenUsage >= tokenLimit) {
      return NextResponse.json(
        {
          message: subscriptionStatus.isActive ? 'Pro monthly token limit reached' : 'Free tier token limit reached',
          status: 429,
          remainingTokens: 0,
          limit: tokenLimit,
          resetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
          isProUser: subscriptionStatus.isActive
        },
        { status: 429 }
      );
    }

    // Prepare messages for OpenAI
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    // Use appropriate prompt based on whether we have previous analysis
    const prompt = previousAnalysis ? contextPrompt : basePrompt;

    // Add context from previous analysis if available
    if (previousAnalysis) {
      messages.push({
        role: "system",
        content: `Previous context: ${previousAnalysis}\n\nFocus only on new information and changes. Do not repeat what was already analyzed.`
      });
    }

    // Add the screenshot for analysis
    messages.push({
      role: "user",
      content: [
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${screenshotBase64}`,
          },
        },
      ],
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 1000,
    });

    // Calculate tokens used
    const tokensUsed = response.usage?.total_tokens || 0;
    const newTokenUsage = userData.tokenUsage + tokensUsed;
    const remainingTokens = tokenLimit - newTokenUsage;

    // Update token usage in database with a valid Firebase key format
    const monthlyHistoryKey = currentMonth.replace('.', '-');
    await userRef.update({
      tokenUsage: newTokenUsage,
      lastReset: userData.lastReset || now.toISOString(),
      [`monthlyHistory/${monthlyHistoryKey}`]: {
        tokensUsed: newTokenUsage,
        lastUpdated: now.toISOString()
      }
    });

    return NextResponse.json({
      message: 'Content analyzed successfully',
      status: 200,
      response: response.choices[0].message.content,
      usage: {
        tokensUsed,
        totalTokensUsed: newTokenUsage,
        remainingTokens,
        limit: tokenLimit
      },
      user: {
        id: decodedToken.uid,
        email: decodedToken.email,
        isProUser: subscriptionStatus.isActive
      }
    });

  } catch (error) {
    console.error('Error processing content analysis:', error);
    return NextResponse.json(
      {
        message: 'Internal server error',
        status: 500,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 