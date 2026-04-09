import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { LlmVendor } from '@/simulation/types';

interface ModelsRequest {
  vendor: LlmVendor;
  apiKey: string;
}

export async function POST(request: Request) {
  try {
    const body: ModelsRequest = await request.json();
    const { vendor, apiKey } = body;

    if (!apiKey) {
      return NextResponse.json({ models: [] });
    }

    if (vendor === 'anthropic') {
      return await fetchAnthropicModels(apiKey);
    }

    // OpenAI, Gemini: 클라이언트에서 하드코딩된 목록 사용
    return NextResponse.json({ models: [] });
  } catch (error) {
    console.error('Failed to fetch models:', error);
    return NextResponse.json({ models: [] });
  }
}

async function fetchAnthropicModels(apiKey: string) {
  const client = new Anthropic({ apiKey });
  const response = await client.models.list({ limit: 100 });

  const models = response.data
    .filter(m => m.type === 'model' && m.id.startsWith('claude'))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(m => ({
      id: m.id,
      name: m.display_name,
      createdAt: m.created_at,
    }));

  return NextResponse.json({ models });
}
