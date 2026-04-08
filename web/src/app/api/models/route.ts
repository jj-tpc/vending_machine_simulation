import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function GET() {
  try {
    const client = new Anthropic();
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
  } catch (error) {
    console.error('Failed to fetch models:', error);
    // API 실패 시 하드코딩 폴백
    return NextResponse.json({
      models: [
        { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', createdAt: '' },
        { id: 'claude-haiku-4-20250414', name: 'Claude Haiku 4', createdAt: '' },
      ],
    });
  }
}
