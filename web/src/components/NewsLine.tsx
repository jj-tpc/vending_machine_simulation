'use client';

import { memo, useMemo, useRef, useEffect, useCallback, useState } from 'react';
import { TurnLog, SimulationState } from '@/simulation/types';
import { weatherLabel, seasonLabel, dayOfWeekLabel } from '@/simulation/market';

interface Props {
  state: SimulationState;
  log: TurnLog | null;
  /** 진행된 최종 일차 (1-based; 0이면 로그 없음) */
  tailDay: number;
  /** null이면 Live tail, 숫자면 히스토리 cursor */
  cursorDay: number | null;
  /** day 번호 또는 null(Live)로 이동 */
  onSeek: (day: number | null) => void;
}

// Scrubber 고정 폭·높이 — 터치 타깃 확보(16px pointer-area), 시각 트랙 6px
const SCRUBBER_WIDTH = 180;
const SCRUBBER_CURSOR_WIDTH = 2;

// Speed: pixels per second (lower = slower)
const TICKER_SPEED = 20;

// prefers-reduced-motion이면 RAF loop 자체를 가동하지 않는다.
// globals.css의 transition/animation-duration 제한만으로는 JS RAF을 못 막기 때문.
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

function NewsLineImpl({ state, log, tailDay, cursorDay, onSeek }: Props) {
  const market = log?.market;
  const visibleEvents = state.marketEvents.filter(e => e.visible && e.expiresDay > state.day);
  const isWeekend = market && (market.dayOfWeek === 'sat' || market.dayOfWeek === 'sun');

  const tickerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const posRef = useRef(0);
  const prefersReducedMotion = usePrefersReducedMotion();
  const tickerActive = visibleEvents.length > 0 && !prefersReducedMotion;

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
    if (!tickerActive) {
      // Reduced-motion 또는 이벤트 없음 → 정적 시작 위치로 복귀
      posRef.current = 0;
      if (tickerRef.current) tickerRef.current.style.transform = 'translateX(0px)';
      return;
    }
    posRef.current = 0;
    startAnimation();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [tickerActive, startAnimation]);

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
    /* Self-strip — 뉴스 티커의 RTL 스크롤은 의도된 디자인. toolbar와 분리해 고유 40px 영역 유지 */
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
      {/* Day label + Scrubber — N일 / M일 표기 + 드래그/클릭/키보드 탐색 */}
      <div className="flex items-center gap-3" style={{ flexShrink: 0 }}>
        <div className="flex items-baseline gap-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ fontSize: '14px', fontWeight: 700 }}>{state.day}</span>
          <span style={{ fontSize: '12px', color: 'var(--text-quaternary)' }}>/ {state.maxDays}일</span>
        </div>
        <Scrubber tailDay={tailDay} maxDays={state.maxDays} cursorDay={cursorDay} onSeek={onSeek} />
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
              background: 'var(--surface-pending)',
              color: 'var(--surface-pending-text)',
              fontSize: '10px',
              fontWeight: 700,
              borderRadius: '4px',
              border: '1px solid var(--surface-pending-border)',
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
                  // willChange는 실제로 애니메이션이 돌 때만 — idle 상태에서 compositor layer를 붙잡지 않도록
                  willChange: tickerActive ? 'transform' : 'auto',
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
          시뮬레이션 대기 중…
        </span>
      )}
    </div>
  );
}

const NewsLine = memo(NewsLineImpl);
export default NewsLine;

function Pill({ label, highlight }: { label: string; highlight?: boolean }) {
  return (
    <span style={{
      fontSize: '11px',
      padding: '2px 8px',
      borderRadius: '4px',
      background: highlight ? 'var(--surface-pending)' : 'var(--fill-light)',
      color: highlight ? 'var(--surface-pending-text)' : 'var(--text-secondary)',
      fontWeight: 500,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

/**
 * Turn Scrubber — 180×16 pointer-area, 6px 시각 트랙.
 * Live tail 의미: cursorDay === null이면 tail 고정. 드래그/클릭은 allLogs[1..tailDay] 범위 내 snap.
 * mechanical 정직함: cursor는 day-by-day snap, 연속 값 아님.
 */
function Scrubber({
  tailDay,
  maxDays,
  cursorDay,
  onSeek,
}: {
  tailDay: number;
  maxDays: number;
  cursorDay: number | null;
  onSeek: (day: number | null) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const disabled = tailDay === 0;
  const effectiveCursor = cursorDay ?? tailDay;

  const seekFromClientX = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el || tailDay === 0) return;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    // allLogs는 day 1부터 시작 → 최소 1, 최대 tailDay로 snap
    const day = Math.max(1, Math.min(tailDay, Math.round(pct * tailDay)));
    onSeek(day === tailDay ? null : day);
  }, [tailDay, onSeek]);

  // pointer drag — document-level listener로 트랙 밖에서도 drag 유지
  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: PointerEvent) => seekFromClientX(e.clientX);
    const handleUp = () => setDragging(false);
    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
    document.addEventListener('pointercancel', handleUp);
    return () => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
      document.removeEventListener('pointercancel', handleUp);
    };
  }, [dragging, seekFromClientX]);

  // maxDays 기준 진행(fill): 트랙 전체가 maxDays. tailDay 지점까지가 "지난 일".
  // maxDays 0 방어
  const safeMax = Math.max(1, maxDays);
  const tailScale = Math.min(tailDay / safeMax, 1);
  // cursor translateX(px) — SCRUBBER_WIDTH 기준 선형 매핑
  const cursorTranslate = (effectiveCursor / safeMax) * (SCRUBBER_WIDTH - SCRUBBER_CURSOR_WIDTH);

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-valuemin={Math.min(1, tailDay)}
      aria-valuemax={Math.max(1, tailDay)}
      aria-valuenow={effectiveCursor}
      aria-valuetext={disabled
        ? '로그 없음'
        : `${effectiveCursor}일차 — 전체 ${maxDays}일 중 ${tailDay}일 진행됨`}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onPointerDown={(e) => {
        if (disabled) return;
        e.preventDefault();
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        setDragging(true);
        seekFromClientX(e.clientX);
      }}
      style={{
        position: 'relative',
        width: `${SCRUBBER_WIDTH}px`,
        height: '16px',
        display: 'flex',
        alignItems: 'center',
        cursor: disabled ? 'default' : 'pointer',
        flexShrink: 0,
        touchAction: 'none',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {/* Track base */}
      <div style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        height: '6px',
        background: 'var(--fill-light)',
        borderRadius: '3px',
        overflow: 'hidden',
      }}>
        {/* Played fill — tail까지 terracotta subtle */}
        <div style={{
          position: 'absolute',
          left: 0, top: 0, bottom: 0,
          width: '100%',
          background: 'var(--accent-primary)',
          opacity: 0.28,
          transformOrigin: 'left center',
          transform: `scaleX(${tailScale})`,
          transition: 'transform 200ms ease',
        }} />
      </div>

      {/* Cursor — 2px 수직 바, day-by-day snap */}
      {!disabled && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '2px',
            bottom: '2px',
            left: 0,
            width: `${SCRUBBER_CURSOR_WIDTH}px`,
            background: 'var(--accent-primary)',
            borderRadius: '1px',
            transform: `translateX(${cursorTranslate}px)`,
            transition: dragging ? 'none' : 'transform 150ms ease-out',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}
