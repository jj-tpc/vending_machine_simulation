'use client';

import { TurnLog, SimulationState } from '@/simulation/types';
import { weatherLabel, seasonLabel, dayOfWeekLabel } from '@/simulation/market';

interface Props {
  state: SimulationState;
  log: TurnLog | null;
}

export default function MarketStatus({ state, log }: Props) {
  const market = log?.market;
  const visibleEvents = state.marketEvents.filter(e => e.visible && e.expiresDay > state.day);

  return (
    <div className="card p-3">
      <h3 className="section-heading" style={{ marginBottom: '10px' }}>
        Market Status
      </h3>

      {market ? (
        <div className="space-y-2">
          <InfoRow label="Date" value={market.date} mono />
          <InfoRow
            label="Day of Week"
            value={dayOfWeekLabel(market.dayOfWeek)}
            badge={(market.dayOfWeek === 'sat' || market.dayOfWeek === 'sun') ? 'Weekend +30%' : undefined}
          />
          <InfoRow label="Weather" value={weatherLabel(market.weather)} />
          <InfoRow label="Season" value={seasonLabel(market.season)} />

          {/* Progress */}
          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '8px' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Progress</span>
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                {state.day} / {state.maxDays}
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '6px',
              background: 'var(--fill-light)',
              borderRadius: '3px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${(state.day / state.maxDays) * 100}%`,
                height: '100%',
                background: 'var(--accent-primary)',
                borderRadius: '3px',
                transition: 'width 300ms ease',
              }} />
            </div>
          </div>

          {/* Market News */}
          {visibleEvents.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '10px' }}>
              <div className="section-heading" style={{ marginBottom: '8px', color: 'var(--accent-orange)' }}>
                Market News
              </div>
              <div className="space-y-2">
                {visibleEvents.map(event => (
                  <div key={event.id} style={{
                    background: '#FFFBEB',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px',
                    border: '1px solid #FDE68A',
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                      {event.headline}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--accent-blue)', marginTop: '2px' }}>
                      {event.subheadline}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', lineHeight: 1.5 }}>
                      {event.body}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-quaternary)', marginTop: '4px' }}>
                      {event.day}일차 ~ {event.expiresDay}일차
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p style={{ fontSize: '13px', color: 'var(--text-quaternary)' }}>
          Waiting for simulation to start...
        </p>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono, badge }: { label: string; value: string; mono?: boolean; badge?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{label}</span>
      <span style={{
        fontSize: '13px',
        color: 'var(--text-primary)',
        fontFamily: mono ? 'var(--font-mono)' : 'inherit',
        fontWeight: 500,
      }}>
        {value}
        {badge && (
          <span style={{ marginLeft: '4px', fontSize: '10px', color: 'var(--accent-orange)', fontWeight: 600 }}>
            ({badge})
          </span>
        )}
      </span>
    </div>
  );
}
