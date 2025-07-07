import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '../../../lib/firebase';
import { isSameMonth, getNextMonthFirstDay, formatDateToISO } from '../../../lib/config';
// import { getSubscriptionStatus } from '../../utils/subscription';
import { getModelConfig } from '../../../lib/models';
import { generateResponse, GenericMessage } from '../../../lib/ai-providers';
import { getClientIp } from '../../utils/request';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    let email: string | null = null;
    let decodedToken: { email?: string } | null = null;
    const authHeader = request.headers.get('x-auth-token');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      try {
        decodedToken = await adminAuth.verifyIdToken(token);
        email = decodedToken.email || null;
      } catch (error) {
        email = null;
        console.error('Error processing request:', error);
      }
    }
    let key = `requests/${ip}`;
    let requestLimit = 10;
    if (email) {
      key = `requests/${ip}_${email}`;
      requestLimit = 30;
    }
    const { content, prompt, modelId } = await request.json();

    if (!content) {
      return NextResponse.json({ message: 'No content provided', status: 400, remainingRequests: 0 }, { status: 400 });
    }

    const modelConfig = getModelConfig(modelId || 'gpt-4o-mini');
    if (!modelConfig) {
      return NextResponse.json({ message: 'Invalid model selected', status: 400, remainingRequests: 0 }, { status: 400 });
    }

    const reqRef = adminDb.ref(key);
    const reqSnapshot = await reqRef.once('value');
    const reqData = reqSnapshot.val() || { requestCount: 0, lastRequest: null, ip, email };
    const now = new Date();

    const lastRequest = reqData.lastRequest ? new Date(reqData.lastRequest) : null;
    if (!lastRequest || !isSameMonth(now, lastRequest)) {
      reqData.requestCount = 0;
    }

    if (reqData.requestCount >= requestLimit) {
      return NextResponse.json({ message: email ? 'Monthly request limit reached (IP+email)' : 'Monthly request limit reached (IP only)', status: 429, remainingRequests: 0, limit: requestLimit, resetDate: formatDateToISO(getNextMonthFirstDay(now)), ip, email }, { status: 429 });
    }

    const requestCount = reqData.requestCount + 1;
    const remainingRequests = requestLimit - requestCount;
    await reqRef.update({ requestCount, lastRequest: formatDateToISO(now), ip, email });
    const messages: GenericMessage[] = [
      { role: 'system', content: prompt || 'You are a helpful assistant.' },
      { role: 'user', content: content }
    ];

    const response = await generateResponse(modelConfig, messages, modelConfig.maxTokens);
    return NextResponse.json({
      message: 'Request processed successfully',
      status: 200,
      response: response.content,
      usage: response.usage,
      user: { ip, email, requestCount, remainingRequests, requestLimit }
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ message: 'Failed to process request', status: 500, remainingRequests: 0 }, { status: 500 });
  }
} 