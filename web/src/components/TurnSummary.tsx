'use client';

import { memo, useMemo } from 'react';
import { TurnLog } from '@/simulation/types';
import { dayOfWeekLabel } from '@/simulation/market';

interface Props {
  log: TurnLog | null;
  allLogs: TurnLog[];
  finished: boolean;
  /** 현재 cursor가 과거 일차를 보는 중인지 (Dashboard가 계산) */
  isHistory?: boolean;
  /** 진행된 최종 일차 — 히스토리 배지의 "최신({tailDay}일)으로" 표기에 사용 */
  tailDay?: number;
  /** "최신으로" 클릭 시 호출 — cursor를 null로 복귀 */
  onReturnLive?: () => void;
  /** WarningStripe 클릭 시 호출 (Dashboard에서 Agent 탭으로 전환) */
  onInspectWarnings?: () => void;
  /** true면 28px 한 줄 축약본 — 센터 탭 스크롤 시 */
  compact?: boolean;
}

/**
 * 턴 요약 히어로. 평등한 3-column 위에 두어 "이번 턴의 주인공 정보"를 선명히.
 * centered big-number hero 패턴 회피 — 좌측 정렬 logbook 스타일.
 */
function TurnSummaryImpl({ log, allLogs, finished, isHistory, tailDay, onReturnLive, onInspectWarnings, compact }: Props) {
  // Hook은 조건부 return 이전에 호출해야 함 (rules-of-hooks).
  // 메트릭 5→3 축소: 잔고·판매(units)는 FinancialPanel에 있음. previousLog 기준은 cursor가 아닌 tail이 아님 — logs 인덱스 기준으로 바로 이전.
  const { previousLog, salesDelta, salesDeltaPct, netWorthDelta } = useMemo(() => {
    if (!log) return { previousLog: null, salesDelta: null, salesDeltaPct: null, netWorthDelta: null };
    // log.day - 1이 존재하면 그것과 비교 (히스토리 모드에서도 올바른 delta)
    const prev = log.day >= 2 && allLogs.length >= log.day ? allLogs[log.day - 2] : null;
    return {
      previousLog: prev,
      salesDelta: prev ? log.sales.totalRevenue - prev.sales.totalRevenue : null,
      salesDeltaPct: prev && prev.sales.totalRevenue > 0
        ? ((log.sales.totalRevenue - prev.sales.totalRevenue) / prev.sales.totalRevenue) * 100
        : null,
      netWorthDelta: prev ? log.netWorth - prev.netWorth : null,
    };
  }, [log, allLogs]);

  // Compact 모드: 센터 탭 스크롤 중 28px 한 줄 축약. 일차 + 매출+%delta만.
  if (log && compact) {
    const deltaText = salesDeltaPct !== null
      ? `${salesDeltaPct >= 0 ? '+' : ''}${salesDeltaPct.toFixed(0)}%`
      : null;
    const deltaPositive = salesDelta !== null && salesDelta >= 0;
    return (
      <div style={{
        height: '28px',
        padding: '0 24px',
        borderBottom: '1px solid var(--border-default)',
        background: 'var(--bg-card)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexShrink: 0,
        fontSize: '11px',
        fontVariantNumeric: 'tabular-nums',
      }}>
        <span className="section-heading" style={{ margin: 0 }}>{log.day}일차</span>
        <span style={{ color: 'var(--text-quaternary)' }}>·</span>
        <span style={{ color: 'var(--text-tertiary)' }}>매출</span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
          color: 'var(--text-primary)',
        }}>
          ${log.sales.totalRevenue.toFixed(2)}
        </span>
        {deltaText && (
          <span style={{
            fontWeight: 600,
            color: deltaPositive ? 'var(--accent-green)' : 'var(--accent-red)',
          }}>
            {deltaText}
          </span>
        )}
      </div>
    );
  }

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
      {/* 종료 상태는 상단 FinishBanner(ceremony)가 담당 — 여기선 경고 스트라이프만 */}
      {!finished && log.warnings && log.warnings.length > 0 && (
        <WarningStripe count={log.warnings.length} onInspect={onInspectWarnings} />
      )}

      {/* 히스토리 배지 — cursor가 과거 일차를 볼 때만. 좌측 정렬 hairline 레이블, opinionated signal */}
      {isHistory && tailDay !== undefined && onReturnLive && (
        <HistoryBadge cursorDay={log.day} tailDay={tailDay} onReturnLive={onReturnLive} />
      )}

      {/* Day label — 일차 어휘 통일, Turn 제거. 날짜는 mono 보조로 분리 */}
      <div className="section-heading" style={{ marginBottom: '8px' }}>
        {log.day}일차
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

      {/* Metrics row — 매출(primary) · 순자산 · 행동 3개로 축소.
          잔고/판매(units)는 FinancialPanel(누적) 중복이라 제거. */}
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
          deltaHint={previousLog ? `vs ${previousLog.day}일` : undefined}
          deltaPositive={salesDelta !== null && salesDelta >= 0}
          primary
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
/**
 * 히스토리 배지 — cursor가 tail보다 과거일 때만 TurnSummary 상단에 노출.
 * "← N일 히스토리 보기 · 최신(M일)으로 →" 텍스트 링크 형태.
 * opinionated: 이 배지의 존재 자체가 "지금 현재 아님" 신호 — 색/크기 튀지 않게 hairline 톤 유지.
 */
function HistoryBadge({
  cursorDay,
  tailDay,
  onReturnLive,
}: {
  cursorDay: number;
  tailDay: number;
  onReturnLive: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '10px',
        fontSize: '11px',
        color: 'var(--text-tertiary)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <span>← <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{cursorDay}일</strong> 히스토리 보기</span>
      <span style={{ color: 'var(--text-quaternary)' }}>·</span>
      <button
        type="button"
        onClick={onReturnLive}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          color: 'var(--accent-primary)',
          fontSize: '11px',
          fontFamily: 'inherit',
          fontWeight: 500,
          textDecoration: 'none',
          transition: 'text-decoration var(--transition-fast)',
        }}
        onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
        onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
      >
        최신({tailDay}일)으로 →
      </button>
    </div>
  );
}

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
