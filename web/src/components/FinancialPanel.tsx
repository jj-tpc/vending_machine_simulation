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
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
        Financials
      </h3>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-gray-800 rounded-lg p-2">
          <div className="text-[10px] text-gray-500">Cash Balance</div>
          <div className={`text-lg font-bold font-mono ${state.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            ${state.balance.toFixed(2)}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-2">
          <div className="text-[10px] text-gray-500">Net Worth</div>
          <div className={`text-lg font-bold font-mono ${latestNetWorth >= 500 ? 'text-emerald-400' : 'text-amber-400'}`}>
            ${latestNetWorth.toFixed(2)}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-2">
          <div className="text-[10px] text-gray-500">Total Revenue</div>
          <div className="text-sm font-mono text-white">${totalRevenue.toFixed(2)}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-2">
          <div className="text-[10px] text-gray-500">Units Sold</div>
          <div className="text-sm font-mono text-white">{totalUnitsSold}</div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="day" stroke="#6b7280" tick={{ fontSize: 10 }} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line type="monotone" dataKey="netWorth" stroke="#10b981" strokeWidth={2} dot={false} name="Net Worth" />
              <Line type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="Cash" />
              <Line type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={1} dot={false} name="Daily Revenue" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
