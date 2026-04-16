import { executeTurn } from '@/simulation/engine';
import { TurnRequest } from '@/simulation/types';
import { DEFAULT_AGENT_PROMPT } from '@/simulation/agent';

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const body: TurnRequest = await request.json();

    if (!body.state) {
      return Response.json({ error: 'Missing simulation state' }, { status: 400 });
    }

    if (!body.apiKey) {
      return Response.json({ error: 'API key is required' }, { status: 400 });
    }

    if (body.state.bankrupt) {
      return Response.json({ error: 'Simulation has ended (bankrupt)' }, { status: 400 });
    }

    if (body.state.day >= body.state.maxDays) {
      return Response.json({ error: 'Simulation has reached max days' }, { status: 400 });
    }

    const model = body.model || 'claude-sonnet-4-20250514';
    const agentPrompt = body.agentPrompt || DEFAULT_AGENT_PROMPT;
    const vendor = body.vendor || 'anthropic';
    const apiKey = body.apiKey;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (type: string, data: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, ...data as object })}\n\n`));
        };

        const onProgress = (step: string, status: 'start' | 'done', doneLabel?: string) => {
          sendEvent('progress', { step, status, doneLabel });
        };

        try {
          const result = await executeTurn(body.state, model, agentPrompt, vendor, apiKey, onProgress);
          sendEvent('result', result);
        } catch (error) {
          sendEvent('error', { error: error instanceof Error ? error.message : 'Failed to execute turn' });
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Turn execution error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to execute turn' },
      { status: 500 }
    );
  }
}
