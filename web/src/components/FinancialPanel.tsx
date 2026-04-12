'use client';

import { TurnLog, SimulationState } from '@/simulation/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props {
  state: SimulationState;
  logs: TurnLog[];
}

export default function FinancialPanel({ state, logs }: Props) {
  const chartData = logs.map(log => ({
    day: log.day,
    balance: Number(log.balanceAfter.toFixed(2)),
    netWorth: Number(log.netWorth.toFixed(2)),
    revenue: Number(log.sales.totalRevenue.toFixed(2)),
  }));

  const totalRevenue = logs.reduce((s, l) => s + l.sales.totalRevenue, 0);
  const totalUnitsSold = logs.reduce((s, l) => s + l.sales.totalUnitsSold, 0);
  const latestNetWorth = logs.length > 0 ? logs[logs.length - 1].netWorth : 500;

  return (
    <div className="card p-3">
      <h3 className="section-heading" style={{ marginBottom: '10px' }}>
        Financials
      </h3>

      {/* KPIs - 재무제표 스타일 */}
      <div style={{ marginBottom: '14px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <KpiRow label="Cash Balance" value={`$${state.balance.toFixed(2)}`} color={state.balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} />
        <KpiRow label="Net Worth" value={`$${latestNetWorth.toFixed(2)}`} color={latestNetWorth >= 500 ? 'var(--accent-green)' : 'var(--accent-orange)'} />
        <KpiRow label="Total Revenue" value={`$${totalRevenue.toFixed(2)}`} color="var(--text-primary)" />
        <KpiRow label="Units Sold" value={`${totalUnitsSold}`} color="var(--text-primary)" last />
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div style={{ height: '160px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis
                dataKey="day"
                stroke="var(--text-quaternary)"
                tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--text-quaternary)"
                tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: 'var(--text-primary)',
                  boxShadow: 'var(--shadow-md)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
              <Line type="monotone" dataKey="netWorth" stroke="#3D8B5F" strokeWidth={2} dot={false} name="Net Worth" />
              <Line type="monotone" dataKey="balance" stroke="#4A7FBA" strokeWidth={1.5} dot={false} name="Cash" />
              <Line type="monotone" dataKey="revenue" stroke="#D4718E" strokeWidth={1} dot={false} name="Daily Revenue" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function KpiRow({ label, value, color, last }: { label: string; value: string; color: string; last?: boolean }) {
  return (
    <div className="flex items-center justify-between" style={{
      padding: '1px 12px',
      borderBottom: last ? 'none' : '1px solid var(--border-light)',
      background: 'var(--bg-card)',
    }}>
      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-mono)', color }}>{value}</span>
    </div>
  );
}
