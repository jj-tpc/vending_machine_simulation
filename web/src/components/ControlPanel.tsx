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
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>기간</span>
            <button onClick={() => onStart(15, startDate)} disabled={isLoading} className="btn btn-secondary">
              15일
            </button>
            <button onClick={() => onStart(30, startDate)} disabled={isLoading} className="btn btn-secondary">
              30일
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

            {/* Day N/M 카운터는 Scrubber 라벨로 통합됨 (NewsLine) — 중복 제거 */}
            {finished ? (
              <>
                <span className="badge" style={{
                  background: finishReason === 'bankrupt' ? 'var(--surface-alert)' : 'var(--surface-pending)',
                  color: finishReason === 'bankrupt' ? 'var(--surface-alert-text)' : 'var(--surface-pending-text)',
                  fontSize: '12px',
                  padding: '3px 10px',
                }}>
                  {finishReason === 'bankrupt' ? '파산' : '완료'}
                </span>
                <button onClick={() => setShowResetConfirm(true)} className="btn btn-secondary" style={{ color: 'var(--accent-red)' }}>
                  리셋
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onNextTurn}
                  disabled={isLoading}
                  className="btn btn-primary"
                >
                  {isLoading ? '처리 중…' : '다음 일'}
                </button>
                <button onClick={() => setShowResetConfirm(true)} disabled={isLoading} className="btn btn-ghost">
                  리셋
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
            {/* 1-stroke caution triangle — VS16 emoji 대체 */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', color: 'var(--accent-red)' }}>
              <svg
                viewBox="0 0 28 28"
                width="28"
                height="28"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M14 4 L25 23 L3 23 Z" />
                <line x1="14" y1="11" x2="14" y2="17" />
                <circle cx="14" cy="20" r="0.9" fill="currentColor" stroke="none" />
              </svg>
            </div>
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
                  color: 'var(--text-on-accent)',
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
