'use client';

import { memo, useMemo } from 'react';
import { MachineSlot } from '@/simulation/types';

interface Props {
  machine: MachineSlot[];
}

// Corner ticks 정적 스타일 — 매 렌더 재생성 방지
const CORNER_TICK_BASE = {
  position: 'absolute' as const,
  width: '6px',
  height: '6px',
  borderColor: 'var(--text-quaternary)',
};
const CORNER_TICK_TL = { ...CORNER_TICK_BASE, top: '-1px', left: '-1px', borderTop: '1px solid', borderLeft: '1px solid' };
const CORNER_TICK_TR = { ...CORNER_TICK_BASE, top: '-1px', right: '-1px', borderTop: '1px solid', borderRight: '1px solid' };
const CORNER_TICK_BL = { ...CORNER_TICK_BASE, bottom: '-1px', left: '-1px', borderBottom: '1px solid', borderLeft: '1px solid' };
const CORNER_TICK_BR = { ...CORNER_TICK_BASE, bottom: '-1px', right: '-1px', borderBottom: '1px solid', borderRight: '1px solid' };

// 상품 고유색 — 실제 세계 제품 연상을 해치지 않게 개별 유지
const PRODUCT_COLORS: Record<string, string> = {
  'Cola': '#C9493B',
  'Water': '#4A7FBA',
  'Orange Juice': '#CC7A2E',
  'Energy Drink': '#3D8B5F',
  'Iced Coffee': '#8B7355',
  'Chips': '#B8952E',
  'Chocolate Bar': '#7A5C3A',
  'Cookies': '#A06830',
  'Granola Bar': '#6B8F42',
  'Crackers': '#9B8530',
  'Gum': '#D4718E',
  'Mints': '#4A9BB5',
};

function getColor(productName: string | null): string {
  if (!productName) return 'var(--border-default)';
  return PRODUCT_COLORS[productName] || 'var(--accent-purple)';
}

function getMaxQty(size: 'small' | 'large'): number {
  return size === 'small' ? 15 : 8;
}

// 재고 수준 구간 — bar 시각화에 반영
function stockLevel(pct: number): 'full' | 'mid' | 'low' {
  if (pct >= 66) return 'full';
  if (pct >= 33) return 'mid';
  return 'low';
}

/**
 * 기술 도면 스타일 자판기 시각화.
 * Small 2행 / Large 2행을 구획으로 분리, 각 셀은 [좌표·이름·fill bar·qty·price].
 */
function VendingMachineViewImpl({ machine }: Props) {
  // 데이터 네이티브 4×3 순회 (machine 레퍼런스가 같으면 재계산 생략)
  const rows = useMemo(
    () => [0, 1, 2, 3].map(row =>
      [0, 1, 2].map(col => machine.find(s => s.row === row && s.col === col)).filter((s): s is MachineSlot => !!s)
    ),
    [machine]
  );

  return (
    <div className="surface-rail p-3">
      <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
        <h3 className="section-heading" style={{ margin: 0 }}>Vending Machine</h3>
        <span style={{
          fontSize: '10px',
          color: 'var(--text-quaternary)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.02em',
        }}>
          4 × 3 · 12 slots
        </span>
      </div>

      {/* 도면 프레임 — corner ticks */}
      <div style={{
        position: 'relative',
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 10px',
      }}>
        <CornerTicks />

        {/* Small 섹션 */}
        <SizeBanner label="Small" max={15} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginBottom: '8px' }}>
          {rows[0].map(slot => <Cell key={`${slot.row}-${slot.col}`} slot={slot} />)}
          {rows[1].map(slot => <Cell key={`${slot.row}-${slot.col}`} slot={slot} />)}
        </div>

        {/* 구획 구분선 */}
        <div style={{
          height: '1px',
          background: 'var(--border-light)',
          margin: '8px -10px',
        }} />

        {/* Large 섹션 */}
        <SizeBanner label="Large" max={8} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
          {rows[2].map(slot => <Cell key={`${slot.row}-${slot.col}`} slot={slot} />)}
          {rows[3].map(slot => <Cell key={`${slot.row}-${slot.col}`} slot={slot} />)}
        </div>
      </div>

      {/* 범례 — low 레벨 swatch는 실제 셀과 동일한 빨간 트랙으로 렌더하여 재고 부족 신호를 명시 */}
      <div className="flex items-center gap-3" style={{ marginTop: '8px', fontSize: '10px', color: 'var(--text-tertiary)' }}>
        <LegendBar level="full" label="재고 충분" />
        <LegendBar level="mid" label="보통" />
        <LegendBar level="low" label="부족 — 주문 필요" />
      </div>
    </div>
  );
}

function SizeBanner({ label, max }: { label: string; max: number }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'baseline',
      gap: '8px',
      fontSize: '10px',
      fontWeight: 700,
      color: 'var(--text-tertiary)',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      marginBottom: '6px',
    }}>
      <span>{label}</span>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontWeight: 400,
        color: 'var(--text-quaternary)',
      }}>
        max {max}
      </span>
    </div>
  );
}

function Cell({ slot }: { slot: MachineSlot }) {
  const maxQty = getMaxQty(slot.size);
  const hasStock = slot.productName && slot.quantity > 0;
  const fillPct = hasStock ? (slot.quantity / maxQty) * 100 : 0;
  const level = stockLevel(fillPct);
  const color = getColor(slot.productName);
  const coord = `[${slot.row},${slot.col}]`;

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: hasStock
        ? '1px solid var(--border-light)'
        : '1px dashed var(--border-default)',
      borderRadius: 'var(--radius-sm)',
      padding: '6px 7px 7px',
      minHeight: '66px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
    }}>
      {/* 좌표 + 이름 */}
      <div>
        <div style={{
          fontSize: '9px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-quaternary)',
          letterSpacing: '0.02em',
        }}>
          {coord}
        </div>
        {hasStock ? (
          <div style={{
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginTop: '1px',
          }}>
            {slot.productName}
          </div>
        ) : (
          <div style={{
            fontSize: '11px',
            color: 'var(--text-quaternary)',
            marginTop: '1px',
            fontStyle: 'italic',
          }}>
            비어있음
          </div>
        )}
      </div>

      {/* Fill bar + 메타 (재고 있을 때만) */}
      {hasStock && (
        <div>
          <FillBar pct={fillPct} color={color} level={level} />
          <div className="flex items-baseline justify-between" style={{ marginTop: '4px' }}>
            <span style={{
              fontSize: '9px',
              color: 'var(--text-tertiary)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {slot.quantity}/{maxQty}
            </span>
            <span style={{
              fontSize: '10px',
              fontWeight: 600,
              color: 'var(--accent-green)',
              fontFamily: 'var(--font-mono)',
            }}>
              ${slot.price.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function FillBar({ pct, color, level }: { pct: number; color: string; level: 'full' | 'mid' | 'low' }) {
  // 재고 수준에 따라 바 색상·투명도 조정
  const opacity = level === 'full' ? 0.85 : level === 'mid' ? 0.65 : 0.45;
  const trackColor = level === 'low' ? 'var(--surface-alert)' : 'var(--border-light)';
  const scale = Math.max(0, Math.min(pct / 100, 1));

  return (
    <div style={{
      width: '100%',
      height: '4px',
      background: trackColor,
      borderRadius: '2px',
      overflow: 'hidden',
    }}>
      {/* transform: scaleX → GPU 가속, layout thrash 없음 */}
      <div style={{
        width: '100%',
        height: '100%',
        background: color,
        opacity,
        transformOrigin: 'left center',
        transform: `scaleX(${scale})`,
        transition: 'transform 500ms ease, opacity 300ms ease',
      }} />
    </div>
  );
}

function LegendBar({ level, label }: { level: 'full' | 'mid' | 'low'; label: string }) {
  const opacity = level === 'full' ? 0.85 : level === 'mid' ? 0.65 : 0.45;
  // low 레벨은 track(빨간 surface-alert) + 부분 fill 조합으로 렌더 → 실제 셀과 신호 체계 일치
  const isLow = level === 'low';
  return (
    <span className="flex items-center gap-1">
      <span style={{
        position: 'relative',
        width: '14px',
        height: '3px',
        background: isLow ? 'var(--surface-alert)' : 'var(--border-light)',
        borderRadius: '1.5px',
        display: 'inline-block',
        overflow: 'hidden',
      }}>
        <span style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: isLow ? '30%' : '100%',
          background: 'var(--accent-primary)',
          opacity,
        }} />
      </span>
      <span>{label}</span>
    </span>
  );
}

// 기술 도면 정통: 외곽 모서리에 작은 L 마크 (정적 스타일은 모듈 레벨에서 정의됨)
function CornerTicks() {
  return (
    <>
      <div style={CORNER_TICK_TL} />
      <div style={CORNER_TICK_TR} />
      <div style={CORNER_TICK_BL} />
      <div style={CORNER_TICK_BR} />
    </>
  );
}

const VendingMachineView = memo(VendingMachineViewImpl);
export default VendingMachineView;
