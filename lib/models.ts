export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  maxTokens: number;
  supportsImages: boolean;
}

export const SUPPORTED_MODELS: ModelConfig[] = [
  // OpenAI Models
  {
    id: 'gpt-4-vision-preview',
    name: 'GPT-4 Vision',
    provider: 'openai',
    maxTokens: 4096,
    supportsImages: true
  },
  {
    id: 'gpt-4-turbo-preview',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    maxTokens: 4096,
    supportsImages: false
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    maxTokens: 4096,
    supportsImages: false
  },

  // Anthropic Models
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    maxTokens: 4096,
    supportsImages: true
  },
  {
    id: 'claude-3-sonnet-20240229',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    maxTokens: 4096,
    supportsImages: true
  },
  {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    maxTokens: 4096,
    supportsImages: true
  },

  // Google Models
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    maxTokens: 4096,
    supportsImages: true
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'google',
    maxTokens: 4096,
    supportsImages: true
  },

  // Cohere Models
  {
    id: 'command-r-plus',
    name: 'Command R+',
    provider: 'cohere',
    maxTokens: 4096,
    supportsImages: false
  },
  {
    id: 'command-r',
    name: 'Command R',
    provider: 'cohere',
    maxTokens: 4096,
    supportsImages: false
  },

  // Meta Models
  {
    id: 'llama-3-70b',
    name: 'LLaMA 3 70B',
    provider: 'meta',
    maxTokens: 4096,
    supportsImages: false
  },
  {
    id: 'llama-3-8b',
    name: 'LLaMA 3 8B',
    provider: 'meta',
    maxTokens: 4096,
    supportsImages: false
  },

  // Mistral Models
  {
    id: 'mixtral-8x7b',
    name: 'Mixtral 8x7B',
    provider: 'mistral',
    maxTokens: 4096,
    supportsImages: false
  },
  {
    id: 'mistral-7b',
    name: 'Mistral 7B',
    provider: 'mistral',
    maxTokens: 4096,
    supportsImages: false
  },

  // xAI Models
  {
    id: 'grok-1',
    name: 'Grok-1',
    provider: 'xai',
    maxTokens: 4096,
    supportsImages: false
  }
];

export function getModelConfig(modelId: string): ModelConfig | undefined {
  return SUPPORTED_MODELS.find(model => model.id === modelId);
}

export function getAvailableModels(isProUser: boolean): ModelConfig[] {
  return SUPPORTED_MODELS;
}

export function getImageSupportedModels(isProUser: boolean): ModelConfig[] {
  return SUPPORTED_MODELS.filter(model => model.supportsImages);
} 