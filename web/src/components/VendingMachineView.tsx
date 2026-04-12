'use client';

import { MachineSlot } from '@/simulation/types';

interface Props {
  machine: MachineSlot[];
}

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
  if (!productName) return '#E8E2DA';
  return PRODUCT_COLORS[productName] || '#7B61B0';
}

function getMaxQty(size: 'small' | 'large'): number {
  return size === 'small' ? 15 : 8;
}

export default function VendingMachineView({ machine }: Props) {
  return (
    <div className="card p-3">
      <h3 className="section-heading" style={{ marginBottom: '8px' }}>
        Vending Machine
      </h3>

      <div style={{
        background: 'var(--bg-primary)',
        borderRadius: 'var(--radius-md)',
        padding: '8px',
        border: '1px solid var(--border-light)',
      }}>
        {[0, 1, 2, 3].map(row => (
          <div key={row} className="flex gap-1.5" style={{ marginBottom: row < 3 ? '6px' : 0 }}>
            <span style={{
              fontSize: '9px',
              color: 'var(--text-quaternary)',
              width: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
            }}>
              {row < 2 ? 'S' : 'L'}
            </span>
            {[0, 1, 2].map(col => {
              const slot = machine.find(s => s.row === row && s.col === col);
              if (!slot) return null;
              const maxQty = getMaxQty(slot.size);
              const hasStock = slot.productName && slot.quantity > 0;
              const fillPct = hasStock ? (slot.quantity / maxQty) * 100 : 0;
              const color = getColor(slot.productName);

              return (
                <div
                  key={col}
                  className="flex-1 relative overflow-hidden"
                  style={{
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-light)',
                    padding: '6px',
                    minHeight: '58px',
                    background: 'var(--bg-card)',
                    opacity: hasStock ? 1 : 0.5,
                    transition: 'opacity var(--transition-default)',
                  }}
                >
                  <div
                    className="absolute bottom-0 left-0 right-0"
                    style={{
                      height: `${fillPct}%`,
                      background: color,
                      opacity: 0.1,
                      transition: 'height 500ms ease',
                    }}
                  />
                  <div className="relative" style={{ zIndex: 1 }}>
                    {hasStock ? (
                      <>
                        <div style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {slot.productName}
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                          {slot.quantity}/{maxQty}
                        </div>
                        <div style={{
                          fontSize: '10px',
                          color: 'var(--accent-green)',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 600,
                        }}>
                          ${slot.price.toFixed(2)}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: '9px', color: 'var(--text-quaternary)', textAlign: 'center', marginTop: '14px' }}>
                        Empty
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex justify-between" style={{ marginTop: '6px', fontSize: '9px', color: 'var(--text-quaternary)' }}>
        <span>S = Small (max 15)</span>
        <span>L = Large (max 8)</span>
      </div>
    </div>
  );
}
