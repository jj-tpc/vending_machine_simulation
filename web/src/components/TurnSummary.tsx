'use client';

import { memo, useMemo } from 'react';
import { TurnLog } from '@/simulation/types';
import { dayOfWeekLabel } from '@/simulation/market';

interface Props {
  log: TurnLog | null;
  allLogs: TurnLog[];
  finished: boolean;
  finishReason: string | null;
  /** WarningStripe 클릭 시 호출 (Dashboard에서 Agent 탭으로 전환) */
  onInspectWarnings?: () => void;
}

/**
 * 턴 요약 히어로. 평등한 3-column 위에 두어 "이번 턴의 주인공 정보"를 선명히.
 * centered big-number hero 패턴 회피 — 좌측 정렬 logbook 스타일.
 */
function TurnSummaryImpl({ log, allLogs, finished, finishReason, onInspectWarnings }: Props) {
  // Hook은 조건부 return 이전에 호출해야 함 (rules-of-hooks)
  const { previousLog, salesDelta, salesDeltaPct, balanceDelta, netWorthDelta } = useMemo(() => {
    if (!log) return { previousLog: null, salesDelta: null, salesDeltaPct: null, balanceDelta: null, netWorthDelta: null };
    const prev = allLogs.length >= 2 ? allLogs[allLogs.length - 2] : null;
    return {
      previousLog: prev,
      salesDelta: prev ? log.sales.totalRevenue - prev.sales.totalRevenue : null,
      salesDeltaPct: prev && prev.sales.totalRevenue > 0
        ? ((log.sales.totalRevenue - prev.sales.totalRevenue) / prev.sales.totalRevenue) * 100
        : null,
      balanceDelta: prev ? log.balanceAfter - prev.balanceAfter : null,
      netWorthDelta: prev ? log.netWorth - prev.netWorth : null,
    };
  }, [log, allLogs]);

  if (!log) {
    return (
      <div style={{
        padding: '14px 24px',
        borderBottom: '1px solid var(--border-light)',
        fontSize: '12px',
        color: 'var(--text-tertiary)',
      }}>
        첫 턴을 진행하면 이 자리에 요약이 표시됩니다.
      </div>
    );
  }

  return (
    <div style={{
      padding: '14px 24px 16px',
      borderBottom: '1px solid var(--border-default)',
      background: 'var(--bg-card)',
      flexShrink: 0,
    }}>
      {/* Critical status banner */}
      {finished && (
        <StatusBanner bankrupt={finishReason === 'bankrupt'} />
      )}
      {!finished && log.warnings && log.warnings.length > 0 && (
        <WarningStripe count={log.warnings.length} onInspect={onInspectWarnings} />
      )}

      {/* Turn label — .section-heading 컨벤션으로 통합. 날짜는 mono 보조로 분리 */}
      <div className="section-heading" style={{ marginBottom: '8px' }}>
        Turn {log.day}
        <span style={{
          margin: '0 8px',
          color: 'var(--text-quaternary)',
          fontWeight: 400,
        }}>·</span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 500,
          textTransform: 'none',
          letterSpacing: 0,
        }}>
          {log.market.date} ({dayOfWeekLabel(log.market.dayOfWeek)})
        </span>
        <span style={{
          margin: '0 8px',
          color: 'var(--text-quaternary)',
          fontWeight: 400,
        }}>·</span>
        완료
      </div>

      {/* Metrics row — 좌측 정렬 tabular logbook */}
      <div style={{
        display: 'flex',
        gap: '36px',
        alignItems: 'baseline',
        flexWrap: 'wrap',
        rowGap: '10px',
      }}>
        <Metric
          label="매출"
          value={`$${log.sales.totalRevenue.toFixed(2)}`}
          delta={salesDeltaPct !== null
            ? `${salesDeltaPct >= 0 ? '+' : ''}${salesDeltaPct.toFixed(0)}%`
            : undefined}
          deltaHint={previousLog ? `vs D${previousLog.day}` : undefined}
          deltaPositive={salesDelta !== null && salesDelta >= 0}
          primary
        />
        <Metric
          label="잔고"
          value={`$${log.balanceAfter.toFixed(2)}`}
          delta={balanceDelta !== null
            ? `${balanceDelta >= 0 ? '+' : ''}$${balanceDelta.toFixed(2)}`
            : undefined}
          deltaPositive={balanceDelta !== null && balanceDelta >= 0}
        />
        <Metric
          label="순자산"
          value={`$${log.netWorth.toFixed(2)}`}
          delta={netWorthDelta !== null
            ? `${netWorthDelta >= 0 ? '+' : ''}$${netWorthDelta.toFixed(2)}`
            : undefined}
          deltaPositive={netWorthDelta !== null && netWorthDelta >= 0}
        />
        <Metric
          label="판매"
          value={`${log.sales.totalUnitsSold}`}
          suffix="units"
        />
        <Metric
          label="행동"
          value={`${log.agentActions.length}`}
          suffix={`tool call${log.agentActions.length === 1 ? '' : 's'}`}
        />
      </div>
    </div>
  );
}

interface MetricProps {
  label: string;
  value: string;
  delta?: string;
  deltaHint?: string;
  deltaPositive?: boolean;
  suffix?: string;
  primary?: boolean;
}

function Metric({ label, value, delta, deltaHint, deltaPositive, suffix, primary }: MetricProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{
        fontSize: '10px',
        color: 'var(--text-tertiary)',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: '3px',
      }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{
          fontSize: primary ? '22px' : '18px',
          fontWeight: primary ? 700 : 600,
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.01em',
        }}>
          {value}
        </span>
        {suffix && (
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{suffix}</span>
        )}
        {delta && (
          <span style={{
            fontSize: '12px',
            fontWeight: 600,
            color: deltaPositive ? 'var(--accent-green)' : 'var(--accent-red)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {delta}
            {deltaHint && (
              <span style={{
                marginLeft: '4px',
                fontSize: '10px',
                fontWeight: 400,
                color: 'var(--text-quaternary)',
              }}>
                {deltaHint}
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

function StatusBanner({ bankrupt }: { bankrupt: boolean }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 10px',
      background: bankrupt ? 'var(--surface-alert)' : 'var(--surface-pending)',
      border: `1px solid ${bankrupt ? 'var(--surface-alert-border)' : 'var(--surface-pending-border)'}`,
      borderRadius: 'var(--radius-sm)',
      fontSize: '11px',
      fontWeight: 700,
      color: bankrupt ? 'var(--surface-alert-text)' : 'var(--surface-pending-text)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      marginBottom: '10px',
    }}>
      {bankrupt ? '파산 — 시뮬레이션 종료' : '시뮬레이션 완료'}
    </div>
  );
}

const TurnSummary = memo(TurnSummaryImpl);
export default TurnSummary;

function WarningStripe({ count, onInspect }: { count: number; onInspect?: () => void }) {
  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '3px 8px',
    background: 'var(--surface-warning)',
    border: '1px solid var(--surface-warning-border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '11px',
    color: 'var(--surface-warning-text)',
    marginBottom: '10px',
  };

  if (!onInspect) {
    return (
      <div style={baseStyle}>
        <InlineCautionMark />
        이번 턴 파싱 경고 {count}건 — AgentLog 확인
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onInspect}
      style={{
        ...baseStyle,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'background var(--transition-fast)',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-warning-border)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-warning)')}
    >
      <InlineCautionMark />
      이번 턴 파싱 경고 {count}건 — AgentLog 확인 →
    </button>
  );
}

// 10×10 1-stroke 경고 삼각형 — ⚠ 유니코드(브라우저별로 emoji-colorize 갈림) 대체
function InlineCautionMark() {
  return (
    <svg
      viewBox="0 0 12 12"
      width="10"
      height="10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M6 1.5 L11 10.5 L1 10.5 Z" />
      <line x1="6" y1="5" x2="6" y2="7.5" />
      <circle cx="6" cy="9" r="0.55" fill="currentColor" stroke="none" />
    </svg>
  );
}
