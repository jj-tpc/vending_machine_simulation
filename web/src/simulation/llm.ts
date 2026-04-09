import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { LlmVendor } from './types';

const HELPER_MODELS: Record<LlmVendor, string> = {
  anthropic: 'claude-haiku-4-5-20251001',
  openai: 'gpt-5.4-nano',
  gemini: 'gemini-3.1-flash-lite',
};

export function createMainModel(
  vendor: LlmVendor,
  apiKey: string,
  model: string,
  maxTokens: number = 1024
): BaseChatModel {
  switch (vendor) {
    case 'anthropic':
      return new ChatAnthropic({ apiKey, model, maxTokens });
    case 'openai':
      return new ChatOpenAI({ apiKey, model, maxTokens });
    case 'gemini':
      return new ChatGoogleGenerativeAI({ apiKey, model, maxOutputTokens: maxTokens });
  }
}

export function createHelperModel(
  vendor: LlmVendor,
  apiKey: string,
  maxTokens: number = 400
): BaseChatModel {
  const model = HELPER_MODELS[vendor];
  switch (vendor) {
    case 'anthropic':
      return new ChatAnthropic({ apiKey, model, maxTokens });
    case 'openai':
      return new ChatOpenAI({ apiKey, model, maxTokens });
    case 'gemini':
      return new ChatGoogleGenerativeAI({ apiKey, model, maxOutputTokens: maxTokens });
  }
}
