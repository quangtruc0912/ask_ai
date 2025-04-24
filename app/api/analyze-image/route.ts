import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { adminAuth, adminDb } from '../../../lib/firebase';
import { MAX_SCANS_PER_MONTH, isSameMonth } from '../../../lib/config';
import { getSubscriptionStatus } from '../../utils/subscription';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const FREE_TIER_LIMIT = 5;
const PRO_TIER_LIMIT = 300;

const prompt = `You are an expert image analyst. Analyze the following image and describe everything you can observe, including:
- Objects and their relationships
- Text (if any) and what it says
- Scene context or possible setting
- Any notable or unusual details
- Possible purpose or meaning behind the image

Be clear and concise, but include as much detail as possible.`;

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

    const { imageBase64 } = await request.json();
    
    if (!imageBase64) {
      return NextResponse.json(
        { 
          message: 'No image provided',
          status: 400,
          remainingScans: 0
        },
        { status: 400 }
      );
    }

    // Check scan limits
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
    await userRef.update({
      scanCount: userData.scanCount + 1,
      lastScan: now.toISOString(),
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 300,
    });

    return NextResponse.json({ 
      message: 'Image analyzed successfully',
      status: 200,
      analysis: response.choices[0].message.content,
      user: {
        id: decodedToken.uid,
        email: decodedToken.email,
        scanCount: userData.scanCount + 1,
        remainingScans: scanLimit - (userData.scanCount + 1),
        isProUser: subscriptionStatus.isActive,
        scanLimit
      }
    });
  } catch (error) {
    console.error('Error analyzing image:', error);
    return NextResponse.json(
      { 
        message: 'Failed to analyze image',
        status: 500,
        remainingScans: 0
      },
      { status: 500 }
    );
  }
} 