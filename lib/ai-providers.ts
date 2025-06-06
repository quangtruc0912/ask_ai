import OpenAI from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { GoogleGenerativeAI, Content } from '@google/generative-ai';
import { CohereClient } from 'cohere-ai';
import { ModelConfig } from './models';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const googleAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY || '',
});

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface GenericMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: { url: string };
  }>;
}

export async function generateResponse(
  modelConfig: ModelConfig,
  messages: GenericMessage[],
  maxTokens: number
): Promise<AIResponse> {
  switch (modelConfig.provider) {
    case 'openai':
      return handleOpenAI(modelConfig.id, messages, maxTokens);
    case 'anthropic':
      return handleAnthropic(modelConfig.id, messages, maxTokens);
    case 'google':
      return handleGoogle(modelConfig.id, messages, maxTokens);
    case 'cohere':
      return handleCohere(modelConfig.id, messages, maxTokens);
    case 'meta':
    case 'mistral':
    case 'xai':
      throw new Error(`Provider ${modelConfig.provider} not yet implemented`);
    default:
      throw new Error(`Unknown provider: ${modelConfig.provider}`);
  }
}

async function handleOpenAI(
  modelId: string,
  messages: GenericMessage[],
  maxTokens: number
): Promise<AIResponse> {
  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = messages.map((msg) => ({
    role: msg.role,
    content: typeof msg.content === 'string' ? msg.content : '',
  }));

  const response = await openai.chat.completions.create({
    model: modelId,
    messages: openaiMessages,
    max_tokens: maxTokens,
  });

  return {
    content: response.choices[0].message.content ?? '',
    usage: response.usage
      ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      }
      : undefined,
  };
}

async function handleAnthropic(
  modelId: string,
  messages: GenericMessage[],
  maxTokens: number
): Promise<AIResponse> {
  const anthropicMessages = messages
    .filter(msg => msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system')
    .map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user', // this will always be 'user' or 'assistant'
      content: typeof msg.content === 'string' ? msg.content : '',
    })) as { role: 'user' | 'assistant'; content: string }[];

  const response = await anthropic.messages.create({
    model: modelId,
    max_tokens: maxTokens,
    messages: anthropicMessages,
  });

  return {
    content: response.content[0].text,
    usage: {
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    },
  };
}

async function handleGoogle(
  modelId: string,
  messages: GenericMessage[],
  maxTokens: number
): Promise<AIResponse> {
  const model = googleAI.getGenerativeModel({ model: modelId }); // <-- Make sure this is here

  const googleMessages: Content[] = messages.map(msg => ({
    role: msg.role,
    parts: [
      {
        text: typeof msg.content === 'string' ? msg.content : '', // Adjust as needed for images
      },
    ],
  }));

  const result = await model.generateContent({
    contents: googleMessages,
    generationConfig: {
      maxOutputTokens: maxTokens,
    },
  });

  return {
    content: result.response.text(),
  };
}

async function handleCohere(
  modelId: string,
  messages: GenericMessage[],
  maxTokens: number
): Promise<AIResponse> {
  const prompt = messages
    .map(msg => `${msg.role}: ${typeof msg.content === 'string' ? msg.content : ''}`)
    .join('\n');

  const response = await cohere.generate({
    model: modelId,
    prompt,
    maxTokens,
  });

  return {
    content: response.generations[0].text,
  };
}
