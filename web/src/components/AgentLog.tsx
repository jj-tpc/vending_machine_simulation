'use client';

import { TurnLog } from '@/simulation/types';

interface Props {
  log: TurnLog | null;
}

export default function AgentLog({ log }: Props) {
  if (!log) {
    return (
      <div className="card p-6 h-full flex items-center justify-center">
        <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
          Start the simulation to see agent actions.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h3 style={{
        fontSize: '18px',
        fontWeight: 700,
        color: 'var(--text-primary)',
        marginBottom: '16px',
      }}>
        Agent Log &mdash; Day {log.day}
      </h3>

      {/* Agent thinking */}
      {log.agentThinking && (
        <div style={{ marginBottom: '16px' }}>
          <div className="section-heading" style={{ marginBottom: '6px', color: 'var(--accent-blue)' }}>
            Thinking
          </div>
          <div style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            background: 'var(--bg-primary)',
            borderRadius: 'var(--radius-md)',
            padding: '12px',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.6,
            border: '1px solid var(--border-light)',
          }}>
            {log.agentThinking}
          </div>
        </div>
      )}

      {/* Actions */}
      {log.agentActions.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div className="section-heading" style={{ marginBottom: '6px', color: 'var(--accent-green)' }}>
            Actions ({log.agentActions.length})
          </div>
          <div className="space-y-2">
            {log.agentActions.map((action, i) => (
              <div key={i} style={{
                background: 'var(--bg-primary)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 12px',
                border: '1px solid var(--border-light)',
              }}>
                <div className="flex items-center gap-2" style={{ marginBottom: '4px' }}>
                  <span className="badge" style={{
                    background: 'rgba(74, 127, 186, 0.1)',
                    color: 'var(--accent-blue)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                  }}>
                    {action.tool}
                  </span>
                </div>
                {Object.keys(action.input).length > 0 && (
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--text-tertiary)',
                    fontFamily: 'var(--font-mono)',
                    marginBottom: '4px',
                  }}>
                    {JSON.stringify(action.input, null, 0)}
                  </div>
                )}
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                  {action.result}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sales */}
      <div>
        <div className="section-heading" style={{ marginBottom: '6px', color: 'var(--accent-orange)' }}>
          Sales
        </div>
        {log.sales.items.length > 0 ? (
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 12px',
            border: '1px solid var(--border-light)',
          }}>
            {log.sales.items.map((item, i) => (
              <div key={i} className="flex justify-between" style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                <span>{item.productName} x{item.quantity}</span>
                <span style={{ color: 'var(--accent-green)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                  ${item.revenue.toFixed(2)}
                </span>
              </div>
            ))}
            <div className="flex justify-between" style={{
              borderTop: '1px solid var(--border-light)',
              marginTop: '8px',
              paddingTop: '8px',
              fontSize: '13px',
              fontWeight: 600,
            }}>
              <span style={{ color: 'var(--text-tertiary)' }}>{log.sales.totalUnitsSold} units</span>
              <span style={{ color: 'var(--accent-green)', fontFamily: 'var(--font-mono)' }}>
                ${log.sales.totalRevenue.toFixed(2)}
              </span>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '13px', color: 'var(--text-quaternary)' }}>No sales today.</div>
        )}
      </div>
    </div>
  );
}
