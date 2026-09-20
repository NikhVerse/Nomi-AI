import type { BYOKApiKeys } from '../types';

const STORAGE_KEY = 'nomi_byok_api_keys';

export const getStoredApiKeys = (): BYOKApiKeys => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load stored API keys', e);
    return {};
  }
};

export const saveStoredApiKeys = (keys: BYOKApiKeys): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch (e) {
    console.error('Failed to save API keys', e);
  }
};

export const getKeyForProvider = (provider: string, keys?: BYOKApiKeys): string | undefined => {
  const allKeys = keys || getStoredApiKeys();
  switch (provider.toLowerCase()) {
    case 'gemini':
      return allKeys.gemini_api_key;
    case 'openai':
    case 'chatgpt':
      return allKeys.openai_api_key;
    case 'claude':
    case 'anthropic':
      return allKeys.anthropic_api_key;
    case 'deepseek':
      return allKeys.deepseek_api_key;
    case 'groq':
      return allKeys.groq_api_key;
    case 'mistral':
      return allKeys.mistral_api_key;
    case 'openrouter':
      return allKeys.openrouter_api_key;
    case 'perplexity':
      return allKeys.perplexity_api_key;
    default:
      return undefined;
  }
};
