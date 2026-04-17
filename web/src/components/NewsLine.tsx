'use client';

import { useMemo, useRef, useEffect, useCallback } from 'react';
import { TurnLog, SimulationState } from '@/simulation/types';
import { weatherLabel, seasonLabel, dayOfWeekLabel } from '@/simulation/market';

interface Props {
  state: SimulationState;
  log: TurnLog | null;
}

// Speed: pixels per second (lower = slower)
const TICKER_SPEED = 20;

export default function NewsLine({ state, log }: Props) {
  const market = log?.market;
  const visibleEvents = state.marketEvents.filter(e => e.visible && e.expiresDay > state.day);
  const isWeekend = market && (market.dayOfWeek === 'sat' || market.dayOfWeek === 'sun');

  const tickerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const posRef = useRef(0);

  const startAnimation = useCallback(() => {
    let lastTime: number | null = null;

    const step = (timestamp: number) => {
      if (!tickerRef.current) return;
      if (lastTime === null) lastTime = timestamp;
      const delta = (timestamp - lastTime) / 1000; // seconds
      lastTime = timestamp;

      posRef.current -= TICKER_SPEED * delta;

      const halfWidth = tickerRef.current.scrollWidth / 2;
      if (halfWidth > 0 && Math.abs(posRef.current) >= halfWidth) {
        posRef.current += halfWidth;
      }

      tickerRef.current.style.transform = `translateX(${posRef.current}px)`;
      animationRef.current = requestAnimationFrame(step);
    };

    animationRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    if (visibleEvents.length > 0) {
      posRef.current = 0;
      startAnimation();
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [visibleEvents.length, startAnimation]);

  const NewsContent = useMemo(() => {
    return visibleEvents.map((event, i) => (
      <span key={event.id}>
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{event.headline}</span>
        <span style={{ color: 'var(--text-tertiary)', margin: '0 6px' }}>—</span>
        <span>{event.subheadline}</span>
        {event.body && (
          <>
            <span style={{ color: 'var(--text-tertiary)', margin: '0 6px' }}>·</span>
            <span style={{ color: 'var(--text-tertiary)' }}>{event.body}</span>
          </>
        )}
        {i < visibleEvents.length - 1 && (
          <span style={{ color: 'var(--accent-orange)', margin: '0 16px', fontWeight: 700 }}>◆</span>
        )}
      </span>
    ));
  }, [visibleEvents]);

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderBottom: '1px solid var(--border-light)',
      padding: '8px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      minHeight: '40px',
      flexShrink: 0,
    }}>
      {/* Day + Progress */}
      <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Day</span>
        <span style={{ fontSize: '14px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {state.day}
        </span>
        <span style={{ fontSize: '12px', color: 'var(--text-quaternary)', fontVariantNumeric: 'tabular-nums' }}>/ {state.maxDays}</span>
        <div style={{
          width: '60px',
          height: '4px',
          background: 'var(--fill-light)',
          borderRadius: '2px',
          overflow: 'hidden',
          marginLeft: '4px',
        }}>
          <div style={{
            width: `${(state.day / state.maxDays) * 100}%`,
            height: '100%',
            background: 'var(--accent-primary)',
            borderRadius: '2px',
            transition: 'width 300ms ease',
          }} />
        </div>
      </div>

      <div style={{ width: '1px', height: '16px', background: 'var(--border-default)' }} />

      {/* Market info — 날짜·요일 한 pill, 날씨·계절 한 pill */}
      {market && (
        <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
          <Pill
            label={`${market.date} (${dayOfWeekLabel(market.dayOfWeek)})`}
            highlight={isWeekend}
          />
          <Pill label={`${weatherLabel(market.weather)} · ${seasonLabel(market.season)}`} />
          {isWeekend && (
            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--accent-orange)' }}>
              주말 +30%
            </span>
          )}
        </div>
      )}

      {/* News ticker */}
      {visibleEvents.length > 0 && (
        <>
          <div style={{ width: '1px', height: '16px', background: 'var(--border-default)', flexShrink: 0 }} />

          <div className="flex items-center gap-3 flex-1" style={{ minWidth: 0, overflow: 'hidden' }}>
            <span style={{
              padding: '2px 8px',
              background: '#FFFBEB',
              color: 'var(--accent-orange)',
              fontSize: '10px',
              fontWeight: 700,
              borderRadius: '4px',
              border: '1px solid #FDE68A',
              flexShrink: 0,
            }}>
              NEWS
            </span>

            <div style={{
              flex: 1,
              overflow: 'hidden',
              maskImage: 'linear-gradient(to right, transparent 0%, black 3%, black 97%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 3%, black 97%, transparent 100%)',
            }}>
              <div
                ref={tickerRef}
                style={{
                  display: 'inline-block',
                  whiteSpace: 'nowrap',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  willChange: 'transform',
                }}
              >
                <span>{NewsContent}</span>
                <span style={{ marginLeft: '120px' }}>{NewsContent}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {!market && (
        <span style={{ fontSize: '12px', color: 'var(--text-quaternary)' }}>
          Waiting for simulation...
        </span>
      )}
    </div>
  );
}

function Pill({ label, highlight }: { label: string; highlight?: boolean }) {
  return (
    <span style={{
      fontSize: '11px',
      padding: '2px 8px',
      borderRadius: '4px',
      background: highlight ? '#FFF7ED' : 'var(--fill-light)',
      color: highlight ? 'var(--accent-orange)' : 'var(--text-secondary)',
      fontWeight: 500,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}
