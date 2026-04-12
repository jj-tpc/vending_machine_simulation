'use client';

import { useState, useRef, useEffect } from 'react';
import { SimulationState } from '@/simulation/types';
import { LoadingStep } from '@/hooks/useSimulation';

interface Props {
  state: SimulationState | null;
  isLoading: boolean;
  loadingSteps: LoadingStep[];
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
  loadingSteps,
  finished,
  finishReason,
  onStart,
  onNextTurn,
  onSkipTurns,
  onReset,
}: Props) {
  const notStarted = !state;
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const stepsRef = useRef<HTMLDivElement>(null);

  const handleReset = () => {
    setShowResetConfirm(false);
    onReset();
  };

  // Auto-show dropdown when steps appear, auto-hide when cleared
  useEffect(() => {
    if (loadingSteps.length > 0) {
      setShowSteps(true);
    } else {
      // Small delay before hiding so user sees final state
      const t = setTimeout(() => setShowSteps(false), 500);
      return () => clearTimeout(t);
    }
  }, [loadingSteps.length]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showSteps) return;
    const handler = (e: MouseEvent) => {
      if (stepsRef.current && !stepsRef.current.contains(e.target as Node)) {
        setShowSteps(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSteps]);

  return (
    <>
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
            {/* Processing steps dropdown - left of Day counter */}
            {loadingSteps.length > 0 && (
              <div style={{ position: 'relative' }} ref={stepsRef}>
                <button
                  onClick={() => setShowSteps(!showSteps)}
                  className="btn"
                  style={{
                    fontSize: '12px',
                    height: '28px',
                    padding: '0 10px',
                    gap: '6px',
                    background: 'var(--fill-light)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <span style={{
                    width: '10px',
                    height: '10px',
                    border: '2px solid var(--border-default)',
                    borderTopColor: 'var(--accent-primary)',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  Processing...
                </button>

                {showSteps && (
                  <div style={{
                    position: 'absolute',
                    top: '36px',
                    right: 0,
                    zIndex: 100,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                    padding: '12px 16px',
                    minWidth: '240px',
                    maxHeight: '360px',
                    overflowY: 'auto',
                  }}>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                      Processing Turn
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {loadingSteps.map((step, i) => (
                        <div key={i} className="flex items-center gap-2" style={{ fontSize: '12px' }}>
                          <StepIcon status={step.status} />
                          <span style={{
                            color: step.status === 'done'
                              ? 'var(--accent-green)'
                              : step.status === 'loading'
                                ? 'var(--text-primary)'
                                : 'var(--text-quaternary)',
                            fontWeight: step.status === 'loading' ? 600 : 400,
                            transition: 'color 0.2s ease',
                          }}>
                            {step.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

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
      {loadingSteps.length > 0 && (
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

function StepIcon({ status }: { status: LoadingStep['status'] }) {
  if (status === 'loading') {
    return (
      <span style={{ width: '14px', height: '14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{
          width: '12px', height: '12px',
          border: '2px solid var(--border-default)',
          borderTopColor: 'var(--accent-primary)',
          borderRadius: '50%',
          display: 'block',
          animation: 'spin 0.8s linear infinite',
        }} />
      </span>
    );
  }
  if (status === 'done') {
    return (
      <span style={{ width: '14px', height: '14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--accent-green)', fontSize: '13px', fontWeight: 700 }}>
        &#10003;
      </span>
    );
  }
  return (
    <span style={{ width: '14px', height: '14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--border-default)', display: 'block' }} />
    </span>
  );
}
