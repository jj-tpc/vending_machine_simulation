'use client';

import { TurnLog } from '@/simulation/types';

interface Props {
  log: TurnLog | null;
}

export default function AgentLog({ log }: Props) {
  if (!log) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 h-full">
        <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
          Agent Log
        </h3>
        <p className="text-gray-600 text-sm">Start the simulation to see agent actions.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 h-full overflow-y-auto">
      <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
        Agent Log - Day {log.day}
      </h3>

      {/* Agent thinking */}
      {log.agentThinking && (
        <div className="mb-3">
          <div className="text-[10px] text-blue-400 font-medium mb-1">THINKING</div>
          <div className="text-xs text-gray-300 bg-gray-800 rounded-lg p-3 whitespace-pre-wrap leading-relaxed">
            {log.agentThinking}
          </div>
        </div>
      )}

      {/* Actions */}
      {log.agentActions.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] text-emerald-400 font-medium mb-1">
            ACTIONS ({log.agentActions.length})
          </div>
          <div className="space-y-2">
            {log.agentActions.map((action, i) => (
              <div key={i} className="bg-gray-800 rounded-lg p-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-900 text-blue-300 rounded font-mono">
                    {action.tool}
                  </span>
                </div>
                {Object.keys(action.input).length > 0 && (
                  <div className="text-[10px] text-gray-500 font-mono mb-1">
                    {JSON.stringify(action.input, null, 0)}
                  </div>
                )}
                <div className="text-[11px] text-gray-400 whitespace-pre-wrap">
                  {action.result}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sales */}
      <div>
        <div className="text-[10px] text-amber-400 font-medium mb-1">SALES</div>
        {log.sales.items.length > 0 ? (
          <div className="bg-gray-800 rounded-lg p-2">
            {log.sales.items.map((item, i) => (
              <div key={i} className="flex justify-between text-xs text-gray-300">
                <span>{item.productName} x{item.quantity}</span>
                <span className="text-emerald-400">${item.revenue.toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t border-gray-700 mt-1 pt-1 flex justify-between text-xs font-medium">
              <span className="text-gray-400">{log.sales.totalUnitsSold} units</span>
              <span className="text-emerald-400">${log.sales.totalRevenue.toFixed(2)}</span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-gray-600">No sales today.</div>
        )}
      </div>
    </div>
  );
}
