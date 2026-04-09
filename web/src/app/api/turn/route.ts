import { NextResponse } from 'next/server';
import { executeTurn } from '@/simulation/engine';
import { TurnRequest, TurnResponse } from '@/simulation/types';
import { DEFAULT_AGENT_PROMPT } from '@/simulation/agent';

export const maxDuration = 60; // Vercel Pro: 60s timeout

export async function POST(request: Request) {
  try {
    const body: TurnRequest = await request.json();

    if (!body.state) {
      return NextResponse.json({ error: 'Missing simulation state' }, { status: 400 });
    }

    if (!body.apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    if (body.state.bankrupt) {
      return NextResponse.json({ error: 'Simulation has ended (bankrupt)' }, { status: 400 });
    }

    if (body.state.day >= body.state.maxDays) {
      return NextResponse.json({ error: 'Simulation has reached max days' }, { status: 400 });
    }

    const model = body.model || 'claude-sonnet-4-20250514';
    const agentPrompt = body.agentPrompt || DEFAULT_AGENT_PROMPT;
    const vendor = body.vendor || 'anthropic';
    const apiKey = body.apiKey;

    const result: TurnResponse = await executeTurn(body.state, model, agentPrompt, vendor, apiKey);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Turn execution error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute turn' },
      { status: 500 }
    );
  }
}
