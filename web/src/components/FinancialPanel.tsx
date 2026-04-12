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

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2" style={{ marginBottom: '14px' }}>
        <KpiCard
          label="Cash Balance"
          value={`$${state.balance.toFixed(2)}`}
          color={state.balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}
          large
        />
        <KpiCard
          label="Net Worth"
          value={`$${latestNetWorth.toFixed(2)}`}
          color={latestNetWorth >= 500 ? 'var(--accent-green)' : 'var(--accent-orange)'}
          large
        />
        <KpiCard label="Total Revenue" value={`$${totalRevenue.toFixed(2)}`} color="var(--text-primary)" />
        <KpiCard label="Units Sold" value={`${totalUnitsSold}`} color="var(--text-primary)" />
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

function KpiCard({ label, value, color, large }: { label: string; value: string; color: string; large?: boolean }) {
  return (
    <div style={{
      background: 'var(--bg-primary)',
      borderRadius: 'var(--radius-md)',
      padding: '10px',
      border: '1px solid var(--border-light)',
    }}>
      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>{label}</div>
      <div style={{
        fontSize: large ? '18px' : '14px',
        fontWeight: 700,
        fontFamily: 'var(--font-mono)',
        color,
      }}>
        {value}
      </div>
    </div>
  );
}
