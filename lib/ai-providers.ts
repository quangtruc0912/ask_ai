import OpenAI from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { GoogleGenerativeAI, Content } from '@google/generative-ai';
import { CohereClient } from 'cohere-ai';
import { ModelConfig } from './models';
import type { TextBlock, ImageBlockParam, MessageParam } from '@anthropic-ai/sdk/resources/messages';

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
  content: string;
  imageBase64?: string; // Optional, only for user messages with images
}

export async function generateResponse(
  modelConfig: ModelConfig,
  messages: GenericMessage[],
  maxTokens: number
): Promise<AIResponse> {
  try {
    switch (modelConfig.provider) {
      case 'openai':
        return await handleOpenAI(modelConfig.id, messages, maxTokens);
      case 'anthropic':
        return await handleAnthropic(modelConfig.id, messages, maxTokens);
      case 'google':
        return await handleGoogle(modelConfig.id, messages, maxTokens);
      case 'cohere':
        return await handleCohere(modelConfig.id, messages, maxTokens);
      case 'meta':
      case 'mistral':
      case 'xai':
        return {
          content: `Error: Provider ${modelConfig.provider} is not yet implemented`
        };
      default:
        return {
          content: `Error: Unknown provider: ${modelConfig.provider}`
        };
    }
  } catch (error) {
    return {
      content: `Error: ${error instanceof Error ? error.message : 'An unexpected error occurred'}`
    };
  }
}

async function handleOpenAI(
  modelId: string,
  messages: GenericMessage[],
  maxTokens: number
): Promise<AIResponse> {
  try {
    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = messages.map((msg) => {
      if (msg.imageBase64 && msg.role === 'user') {
        // User message with image
        return {
          role: 'user',
          content: [
            { type: 'text', text: msg.content },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${msg.imageBase64}` } }
          ]
        };
      } else {
        // All other messages (system, assistant, or user text-only)
        return {
          role: msg.role,
          content: msg.content
        };
      }
    });
    
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
  } catch (error) {
    return {
      content: `Error from OpenAI: ${error instanceof Error ? error.message : 'An unexpected error occurred'}`
    };
  }
}

async function handleAnthropic(
  modelId: string,
  messages: GenericMessage[],
  maxTokens: number
): Promise<AIResponse> {
  try {
    // Extract system message if present
    const systemMessage = messages.find(msg => msg.role === 'system');
    const nonSystemMessages = messages.filter(msg => msg.role !== 'system');

    const anthropicMessages: MessageParam[] = nonSystemMessages.map(msg => {
      if (msg.imageBase64 && msg.role === 'user') {
        // Extract media type from the base64 string if present
        const base64Match = msg.imageBase64.match(/^data:image\/(\w+);base64,(.+)$/);
        const mediaType = base64Match ? `image/${base64Match[1]}` : 'image/jpeg';
        const cleanBase64 = base64Match ? base64Match[2] : msg.imageBase64.replace(/^data:image\/\w+;base64,/, '');
        
        return {
          role: 'user',
          content: [
            { type: 'text', text: msg.content } as TextBlock,
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: cleanBase64 } } as ImageBlockParam
          ]
        };
      } else {
        return {
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        };
      }
    });

    const response = await anthropic.messages.create({
      model: modelId,
      max_tokens: maxTokens,
      messages: anthropicMessages,
      system: systemMessage?.content
    });

    return {
      content: response.content[0].text,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  } catch (error) {
    return {
      content: `Error from Anthropic: ${error instanceof Error ? error.message : 'An unexpected error occurred'}`
    };
  }
}

async function handleGoogle(
  modelId: string,
  messages: GenericMessage[],
  maxTokens: number
): Promise<AIResponse> {
  try {
    const model = googleAI.getGenerativeModel({ model: modelId });

    const googleMessages: Content[] = messages.map(msg => {
      const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [];
      if (msg.content) {
        parts.push({ text: msg.content });
      }
      if (msg.imageBase64) {
        const cleanBase64 = msg.imageBase64.replace(/^data:image\/\w+;base64,/, '');
        parts.push({ inlineData: { data: cleanBase64, mimeType: 'image/jpeg' } });
      }
      return {
        role: msg.role,
        parts,
      };
    });

    const result = await model.generateContent({
      contents: googleMessages,
      generationConfig: {
        maxOutputTokens: maxTokens,
      },
    });

    return {
      content: result.response.text(),
    };
  } catch (error) {
    return {
      content: `Error from Google AI: ${error instanceof Error ? error.message : 'An unexpected error occurred'}`
    };
  }
}

async function handleCohere(
  modelId: string,
  messages: GenericMessage[],
  maxTokens: number
): Promise<AIResponse> {
  try {
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
  } catch (error) {
    return {
      content: `Error from Cohere: ${error instanceof Error ? error.message : 'An unexpected error occurred'}`
    };
  }
}
