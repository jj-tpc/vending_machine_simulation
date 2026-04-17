'use client';

import { useState } from 'react';
import { TurnLog, AgentAction } from '@/simulation/types';

interface Props {
  log: TurnLog | null;
}

const THINKING_PREVIEW_CHARS = 180;

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

      {/* Parsing/format warnings */}
      {log.warnings && log.warnings.length > 0 && (
        <div style={{
          marginBottom: '16px',
          padding: '10px 12px',
          background: '#FFFBEB',
          border: '1px solid #FCD34D',
          borderRadius: 'var(--radius-md)',
        }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#92400E', marginBottom: '6px' }}>
            ⚠️ 출력 파싱 경고 ({log.warnings.length})
          </div>
          <ul style={{ fontSize: '12px', color: '#78350F', lineHeight: 1.55, paddingLeft: '16px', margin: 0 }}>
            {log.warnings.map((w, i) => (
              <li key={i} style={{ marginBottom: '2px' }}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Agent thinking — collapsible */}
      {log.agentThinking && (
        <Thinking key={`thinking-${log.day}`} text={log.agentThinking} />
      )}

      {/* Actions — each row expandable */}
      {log.agentActions.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div className="section-heading" style={{ marginBottom: '6px', color: 'var(--accent-green)' }}>
            Actions ({log.agentActions.length})
          </div>
          <div className="space-y-1">
            {log.agentActions.map((action, i) => (
              <ActionRow key={`action-${log.day}-${i}`} action={action} />
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

// ---------- Thinking (collapsible) ----------

function Thinking({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const needsToggle = text.length > THINKING_PREVIEW_CHARS;
  const shown = expanded || !needsToggle ? text : text.slice(0, THINKING_PREVIEW_CHARS).trimEnd() + '…';

  return (
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
        {shown}
      </div>
      {needsToggle && (
        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            marginTop: '4px',
            fontSize: '11px',
            color: 'var(--accent-blue)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 0',
          }}
        >
          {expanded ? '접기' : `전체 보기 (${text.length}자)`}
        </button>
      )}
    </div>
  );
}

// ---------- ActionRow (expandable) ----------

function ActionRow({ action }: { action: AgentAction }) {
  const [expanded, setExpanded] = useState(false);
  const inputKeys = Object.keys(action.input);
  const inputSummary = summarizeInput(action.input);
  const resultIsLong = action.result.length > 80;
  const collapsedResult = resultIsLong ? action.result.slice(0, 80).trimEnd() + '…' : action.result;

  return (
    <button
      type="button"
      onClick={() => (resultIsLong || inputKeys.length > 2) && setExpanded(v => !v)}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: 'var(--bg-primary)',
        borderRadius: 'var(--radius-md)',
        padding: '8px 10px',
        border: '1px solid var(--border-light)',
        cursor: (resultIsLong || inputKeys.length > 2) ? 'pointer' : 'default',
        transition: 'background var(--transition-fast)',
      }}
    >
      <div className="flex items-center gap-2" style={{ marginBottom: expanded || !resultIsLong ? '4px' : 0 }}>
        <span className="badge" style={{
          background: 'rgba(74, 127, 186, 0.1)',
          color: 'var(--accent-blue)',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
        }}>
          {action.tool}
        </span>
        {inputSummary && (
          <span style={{
            fontSize: '11px',
            color: 'var(--text-tertiary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            minWidth: 0,
          }}>
            {inputSummary}
          </span>
        )}
      </div>
      <div style={{
        fontSize: '12px',
        color: 'var(--text-secondary)',
        whiteSpace: 'pre-wrap',
        lineHeight: 1.5,
      }}>
        {expanded ? action.result : collapsedResult}
      </div>
    </button>
  );
}

// 툴 인자를 한 줄로 요약 (key:value 형태)
function summarizeInput(input: Record<string, unknown>): string {
  const entries = Object.entries(input);
  if (entries.length === 0) return '';
  return entries
    .map(([k, v]) => {
      const val = typeof v === 'string' && v.length > 24 ? v.slice(0, 24) + '…' : String(v);
      return `${k}=${val}`;
    })
    .join(' · ');
}
