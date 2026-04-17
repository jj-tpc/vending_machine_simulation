'use client';

import { TurnLog } from '@/simulation/types';

interface Props {
  log: TurnLog | null;
  allLogs: TurnLog[];
  finished: boolean;
  finishReason: string | null;
}

/**
 * 턴 요약 히어로. 평등한 3-column 위에 두어 "이번 턴의 주인공 정보"를 선명히.
 * centered big-number hero 패턴 회피 — 좌측 정렬 logbook 스타일.
 */
export default function TurnSummary({ log, allLogs, finished, finishReason }: Props) {
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

  const previousLog = allLogs.length >= 2 ? allLogs[allLogs.length - 2] : null;

  const salesDelta = previousLog
    ? log.sales.totalRevenue - previousLog.sales.totalRevenue
    : null;
  const salesDeltaPct = previousLog && previousLog.sales.totalRevenue > 0
    ? ((log.sales.totalRevenue - previousLog.sales.totalRevenue) / previousLog.sales.totalRevenue) * 100
    : null;
  const balanceDelta = previousLog
    ? log.balanceAfter - previousLog.balanceAfter
    : null;
  const netWorthDelta = previousLog
    ? log.netWorth - previousLog.netWorth
    : null;

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
        <WarningStripe count={log.warnings.length} />
      )}

      {/* Turn label */}
      <div style={{
        fontSize: '10px',
        fontWeight: 700,
        color: 'var(--text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: '8px',
      }}>
        Turn {log.day} — 완료
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
      background: bankrupt ? '#FEF2F2' : '#FFF7ED',
      border: `1px solid ${bankrupt ? '#FECACA' : '#FED7AA'}`,
      borderRadius: 'var(--radius-sm)',
      fontSize: '11px',
      fontWeight: 700,
      color: bankrupt ? 'var(--accent-red)' : 'var(--accent-orange)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      marginBottom: '10px',
    }}>
      {bankrupt ? '파산 — 시뮬레이션 종료' : '시뮬레이션 완료'}
    </div>
  );
}

function WarningStripe({ count }: { count: number }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '3px 8px',
      background: '#FFFBEB',
      border: '1px solid #FCD34D',
      borderRadius: 'var(--radius-sm)',
      fontSize: '11px',
      color: '#92400E',
      marginBottom: '10px',
    }}>
      ⚠ 이번 턴 파싱 경고 {count}건 — AgentLog 확인
    </div>
  );
}
