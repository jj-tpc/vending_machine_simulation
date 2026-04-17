'use client';

import { memo } from 'react';
import { TurnLog, Difficulty } from '@/simulation/types';
import { getDifficultyConfig } from '@/simulation/difficulty';

interface Props {
  bankrupt: boolean;
  maxDays: number;
  difficulty: Difficulty;
  logs: TurnLog[];
  onReset: () => void;
}

/**
 * 시뮬레이션 종료 ceremony 배너.
 * 3-column 위에 얹혀 피날레 역할. Hedvig display로 종료 문구, 우측에 순자산 델타 + 리셋 CTA.
 * 색·배경은 중립(muted-cream) 유지, 손익은 숫자 색으로만 표현 — 디자인 원칙 #3(기계적 정직함).
 */
function FinishBannerImpl({ bankrupt, maxDays, difficulty, logs, onReset }: Props) {
  // 난이도별 초기 순자산 = startingBalance − machineRentalFee (engine.calculateNetWorth Day 0 식)
  const config = getDifficultyConfig(difficulty);
  const startingNetWorth = config.startingBalance - config.machineRentalFee;
  const finalNetWorth = logs.length > 0 ? logs[logs.length - 1].netWorth : startingNetWorth;
  const delta = finalNetWorth - startingNetWorth;
  const deltaPositive = delta >= 0;
  const daysPlayed = logs.length;

  const phrase = bankrupt
    ? '자본이 다했습니다.'
    : `${maxDays}일의 운영이 끝났습니다.`;

  const overlineLabel = bankrupt ? '시뮬레이션 종료 · 파산' : '시뮬레이션 종료';

  return (
    <section className="finish-banner" role="status" aria-live="polite">
      {/* 좌측: 종료 문구 (Hedvig) */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="section-heading" style={{
          marginBottom: '6px',
          color: bankrupt ? 'var(--accent-red)' : 'var(--text-tertiary)',
        }}>
          {overlineLabel}
        </div>
        <h2
          className="display"
          style={{
            fontSize: '26px',
            color: 'var(--text-primary)',
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          {phrase}
        </h2>
      </div>

      {/* 중앙: 순자산 경로 + 델타 */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '4px',
        flexShrink: 0,
        paddingLeft: '12px',
        borderLeft: '1px solid var(--border-default)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '6px',
          fontSize: '11px',
          color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-mono)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          <span>시작 ${startingNetWorth.toFixed(2)}</span>
          <span style={{ color: 'var(--text-quaternary)' }}>→</span>
          <span>{daysPlayed}일차 ${finalNetWorth.toFixed(2)}</span>
        </div>
        <div style={{
          fontSize: '22px',
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.01em',
          color: deltaPositive ? 'var(--accent-green)' : 'var(--accent-red)',
        }}>
          {deltaPositive ? '+' : '−'}${Math.abs(delta).toFixed(2)}
        </div>
      </div>

      {/* 우측: CTA */}
      <button
        type="button"
        onClick={onReset}
        className="btn btn-primary"
        style={{ flexShrink: 0, height: '36px', padding: '0 18px', fontSize: '13px' }}
      >
        리셋하고 다시
      </button>
    </section>
  );
}

const FinishBanner = memo(FinishBannerImpl);
export default FinishBanner;
