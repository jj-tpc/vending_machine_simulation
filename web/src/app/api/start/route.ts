import { NextResponse } from 'next/server';
import { createInitialState } from '@/simulation/engine';
import { StartRequest, StartResponse } from '@/simulation/types';

export async function POST(request: Request) {
  try {
    const body: StartRequest = await request.json();
    const state = createInitialState(body.maxDays || 30, body.startDate, body.difficulty);
    const response: StartResponse = { state };
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start simulation' },
      { status: 500 }
    );
  }
}
