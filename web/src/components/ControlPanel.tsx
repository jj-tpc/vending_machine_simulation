'use client';

import { useState } from 'react';
import { SimulationState } from '@/simulation/types';
import { LoadingStep } from '@/hooks/useSimulation';

interface Props {
  state: SimulationState | null;
  isLoading: boolean;
  loadingSteps: LoadingStep[];
  finished: boolean;
  finishReason: string | null;
  onStart: (maxDays: number, startDate?: string) => void;
  startDate: string;
  onChangeStartDate: (date: string) => void;
  onNextTurn: () => void;
  onSkipTurns: (count: number) => void;
  onReset: () => void;
}

export default function ControlPanel({
  state,
  isLoading,
  loadingSteps,
  finished,
  finishReason,
  onStart,
  startDate,
  onChangeStartDate,
  onNextTurn,
  onSkipTurns,
  onReset,
}: Props) {
  const notStarted = !state;
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleReset = () => {
    setShowResetConfirm(false);
    onReset();
  };

  const hasSteps = loadingSteps.length > 0;

  return (
    <>
      <div className="flex items-center gap-2">
        {notStarted ? (
          <>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Duration:</span>
            <button onClick={() => onStart(15, startDate)} disabled={isLoading} className="btn btn-secondary">
              15 Days
            </button>
            <button onClick={() => onStart(30, startDate)} disabled={isLoading} className="btn btn-secondary">
              30 Days
            </button>
          </>
        ) : (
          <>
            {/* All steps inline */}
            {hasSteps && (
              <>
                <div className="flex items-center gap-2" style={{ fontSize: '11px', overflow: 'hidden' }}>
                  {loadingSteps.map((step, i) => {
                    const hideLabel = step.status === 'done' && i >= 3;
                    return (
                      <div key={i} className="flex items-center gap-1" style={{ flexShrink: 0 }}>
                        {step.status === 'loading' ? (
                          <span style={{
                            width: '10px',
                            height: '10px',
                            border: '2px solid var(--border-default)',
                            borderTopColor: 'var(--accent-primary)',
                            borderRadius: '50%',
                            display: 'inline-block',
                            animation: 'spin 0.8s linear infinite',
                            flexShrink: 0,
                          }} />
                        ) : (
                          <span style={{ color: 'var(--accent-green)', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>&#10003;</span>
                        )}
                        {!hideLabel && (
                          <span style={{
                            color: step.status === 'loading' ? 'var(--text-primary)' : 'var(--accent-green)',
                            fontWeight: step.status === 'loading' ? 600 : 400,
                            whiteSpace: 'nowrap',
                          }}>
                            {step.label}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div style={{ width: '1px', height: '16px', background: 'var(--border-default)', margin: '0 2px', flexShrink: 0 }} />
              </>
            )}

            <div className="flex items-center gap-1.5" style={{ fontSize: '13px', flexShrink: 0 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Day</span>
              <span style={{ fontWeight: 700, fontSize: '16px', fontVariantNumeric: 'tabular-nums' }}>
                {state.day}
              </span>
              <span style={{ color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>/ {state.maxDays}</span>
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
                <button onClick={() => setShowResetConfirm(true)} className="btn btn-secondary" style={{ color: 'var(--accent-red)' }}>
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
                <button onClick={() => setShowResetConfirm(true)} disabled={isLoading} className="btn btn-ghost">
                  Reset
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* Spinner keyframes */}
      {hasSteps && (
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      )}

      {/* Reset confirmation popup */}
      {showResetConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowResetConfirm(false);
          }}
        >
          <div style={{
            width: '360px',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2), 0 0 0 1px var(--border-light)',
            padding: '24px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>&#9888;&#65039;</div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              시뮬레이션을 리셋할까요?
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
              현재 진행 중인 시뮬레이션의 모든 데이터가 초기화됩니다.
            </p>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="btn btn-secondary"
                style={{ minWidth: '80px' }}
              >
                취소
              </button>
              <button
                onClick={handleReset}
                className="btn"
                style={{
                  minWidth: '80px',
                  background: 'var(--accent-red)',
                  color: 'white',
                }}
              >
                리셋
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
