'use client';

import { SimulationState } from '@/simulation/types';

interface Props {
  state: SimulationState | null;
  isLoading: boolean;
  finished: boolean;
  finishReason: string | null;
  onStart: (maxDays: number) => void;
  onNextTurn: () => void;
  onSkipTurns: (count: number) => void;
  onReset: () => void;
}

export default function ControlPanel({
  state,
  isLoading,
  finished,
  finishReason,
  onStart,
  onNextTurn,
  onSkipTurns,
  onReset,
}: Props) {
  const notStarted = !state;

  return (
    <div className="flex items-center gap-2">
      {notStarted ? (
        <>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Duration:</span>
          <button onClick={() => onStart(15)} disabled={isLoading} className="btn btn-secondary">
            15 Days
          </button>
          <button onClick={() => onStart(30)} disabled={isLoading} className="btn btn-secondary">
            30 Days
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-1.5" style={{ fontSize: '13px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Day</span>
            <span style={{ fontWeight: 700, fontSize: '16px', fontFamily: 'var(--font-mono)' }}>
              {state.day}
            </span>
            <span style={{ color: 'var(--text-tertiary)' }}>/ {state.maxDays}</span>
          </div>

          <div style={{ width: '1px', height: '16px', background: 'var(--border-default)', margin: '0 4px' }} />

          {finished ? (
            <>
              <span className="badge" style={{
                background: finishReason === 'bankrupt' ? '#FEF2F2' : '#FFF7ED',
                color: finishReason === 'bankrupt' ? 'var(--accent-red)' : 'var(--accent-orange)',
                fontSize: '12px',
                padding: '3px 10px',
              }}>
                {finishReason === 'bankrupt' ? 'BANKRUPT' : 'COMPLETE'}
              </span>
              <button onClick={onReset} className="btn btn-secondary" style={{ color: 'var(--accent-red)' }}>
                Reset
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onNextTurn}
                disabled={isLoading}
                className="btn btn-primary"
              >
                {isLoading ? 'Processing...' : 'Next Turn'}
              </button>
              <button
                onClick={() => onSkipTurns(15)}
                disabled={isLoading}
                className="btn btn-secondary"
              >
                Skip 15
              </button>
              <button onClick={onReset} disabled={isLoading} className="btn btn-ghost">
                Reset
              </button>
            </>
          )}

          {isLoading && (
            <span className="animate-pulse" style={{ fontSize: '12px', color: 'var(--accent-primary)' }}>
              AI is thinking...
            </span>
          )}
        </>
      )}
    </div>
  );
}
