'use client';

import { memo, useMemo } from 'react';
import { TurnLog, SimulationState } from '@/simulation/types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Label } from 'recharts';

interface Props {
  state: SimulationState;
  logs: TurnLog[];
}

// 차트 라인 위계: 1차 굵기·투명도 최고, 2/3차는 약하게
const NET_WORTH_COLOR = 'var(--accent-green)';
const CASH_COLOR = 'var(--accent-blue)';
const REVENUE_COLOR = 'var(--accent-pink)';

// 차트 여백·tooltip·tick 스타일 정적 상수 — Hanken/JetBrains 시스템에 정합
// bottom 여백: X축 라벨("Day") 표시 공간 확보
const CHART_MARGIN = { top: 4, right: 8, bottom: 8, left: -20 };
// Y축은 $ 접두사로 통화 단위 명시, 소수점 생략하여 tick 가독성 확보
const Y_TICK_FORMATTER = (v: number) => `$${v}`;
const AXIS_LABEL_STYLE = { fill: 'var(--text-quaternary)', fontSize: 10, fontFamily: 'var(--font-mono)' } as const;
const TOOLTIP_STYLE = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border-default)',
  borderRadius: '8px',
  fontSize: '11px',
  fontFamily: 'var(--font-mono)',
  color: 'var(--text-primary)',
  boxShadow: 'var(--shadow-md)',
};
// SVG <text>용 — CSS variable은 SVG 속성에 안 먹혀 computed 값 사용. fontFamily는 var 가능(상속).
const TICK_STYLE = {
  fontSize: 10,
  fontFamily: 'var(--font-mono)',
  fill: 'var(--text-tertiary)',
} as const;

function FinancialPanelImpl({ state, logs }: Props) {
  // logs 레퍼런스 안정 시 재계산 생략
  const { chartData, totalRevenue, totalUnitsSold, latestNetWorth } = useMemo(() => ({
    chartData: logs.map(log => ({
      day: log.day,
      balance: Number(log.balanceAfter.toFixed(2)),
      netWorth: Number(log.netWorth.toFixed(2)),
      revenue: Number(log.sales.totalRevenue.toFixed(2)),
    })),
    totalRevenue: logs.reduce((s, l) => s + l.sales.totalRevenue, 0),
    totalUnitsSold: logs.reduce((s, l) => s + l.sales.totalUnitsSold, 0),
    latestNetWorth: logs.length > 0 ? logs[logs.length - 1].netWorth : 500,
  }), [logs]);

  return (
    <div className="surface-rail p-3">
      <h3 className="section-heading" style={{ marginBottom: '10px' }}>
        재무 현황
      </h3>

      {/* KPIs - 재무제표 스타일 — TurnSummary 히어로의 라벨 어휘(잔고/순자산/매출)와 정합 */}
      <div style={{ marginBottom: '14px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <KpiRow label="현금 잔고" value={`$${state.balance.toFixed(2)}`} color={state.balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} />
        <KpiRow label="순자산" value={`$${latestNetWorth.toFixed(2)}`} color={latestNetWorth >= 500 ? 'var(--accent-green)' : 'var(--accent-orange)'} />
        <KpiRow label="누적 매출" value={`$${totalRevenue.toFixed(2)}`} color="var(--text-primary)" />
        <KpiRow label="판매 수량" value={`${totalUnitsSold}개`} color="var(--text-primary)" last />
      </div>

      {/* Chart — 인라인 범례, 위계 있는 stroke */}
      {chartData.length > 0 && (
        <div>
          <div className="flex items-center gap-3" style={{ marginBottom: '6px', fontSize: '10px' }}>
            <Dot color={NET_WORTH_COLOR} label="순자산" primary />
            <Dot color={CASH_COLOR} label="잔고" />
            <Dot color={REVENUE_COLOR} label="일 매출" />
          </div>
          <div style={{ height: '140px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={CHART_MARGIN}>
                <XAxis
                  dataKey="day"
                  stroke="var(--text-quaternary)"
                  tick={TICK_STYLE}
                  tickLine={false}
                  axisLine={false}
                >
                  <Label value="일차" position="insideBottomRight" offset={-2} style={AXIS_LABEL_STYLE} />
                </XAxis>
                <YAxis
                  stroke="var(--text-quaternary)"
                  tick={TICK_STYLE}
                  tickFormatter={Y_TICK_FORMATTER}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="netWorth" stroke={NET_WORTH_COLOR} strokeWidth={2.25} dot={false} name="Net Worth" />
                <Line type="monotone" dataKey="balance" stroke={CASH_COLOR} strokeWidth={1.25} strokeOpacity={0.7} dot={false} name="Cash" />
                <Line type="monotone" dataKey="revenue" stroke={REVENUE_COLOR} strokeWidth={1} strokeOpacity={0.55} dot={false} name="Daily Revenue" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiRow({ label, value, color, last }: { label: string; value: string; color: string; last?: boolean }) {
  return (
    <div className="flex items-center justify-between" style={{
      // 1px vertical padding은 오탈자 → 6px로 정상화 (행 높이 ≈28px, 숫자/라벨 읽기 편함)
      padding: '6px 12px',
      borderBottom: last ? 'none' : '1px solid var(--border-light)',
      background: 'var(--bg-card)',
    }}>
      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-mono)', color }}>{value}</span>
    </div>
  );
}

function Dot({ color, label, primary }: { color: string; label: string; primary?: boolean }) {
  return (
    <span className="flex items-center gap-1" style={{
      color: 'var(--text-tertiary)',
      fontWeight: primary ? 600 : 400,
    }}>
      <span style={{
        width: primary ? '8px' : '6px',
        height: primary ? '2.5px' : '1.5px',
        background: color,
        borderRadius: '1px',
        display: 'inline-block',
      }} />
      {label}
    </span>
  );
}

const FinancialPanel = memo(FinancialPanelImpl);
export default FinancialPanel;
