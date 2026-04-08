'use client';

import { MachineSlot } from '@/simulation/types';

interface Props {
  machine: MachineSlot[];
}

const PRODUCT_COLORS: Record<string, string> = {
  'Cola': 'bg-red-800',
  'Water': 'bg-blue-800',
  'Orange Juice': 'bg-orange-800',
  'Energy Drink': 'bg-green-800',
  'Iced Coffee': 'bg-amber-900',
  'Chips': 'bg-yellow-800',
  'Chocolate Bar': 'bg-amber-800',
  'Cookies': 'bg-orange-900',
  'Granola Bar': 'bg-lime-900',
  'Crackers': 'bg-yellow-900',
  'Gum': 'bg-pink-800',
  'Mints': 'bg-cyan-800',
};

function getColor(productName: string | null): string {
  if (!productName) return 'bg-gray-800';
  return PRODUCT_COLORS[productName] || 'bg-purple-800';
}

function getMaxQty(size: 'small' | 'large'): number {
  return size === 'small' ? 15 : 8;
}

export default function VendingMachineView({ machine }: Props) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
        Vending Machine
      </h3>

      <div className="bg-gray-950 rounded-lg p-3 border border-gray-800">
        {/* 4 rows */}
        {[0, 1, 2, 3].map(row => (
          <div key={row} className="flex gap-2 mb-2 last:mb-0">
            <span className="text-[10px] text-gray-600 w-4 flex items-center justify-center">
              {row < 2 ? 'S' : 'L'}
            </span>
            {[0, 1, 2].map(col => {
              const slot = machine.find(s => s.row === row && s.col === col);
              if (!slot) return null;
              const maxQty = getMaxQty(slot.size);
              const hasStock = slot.productName && slot.quantity > 0;
              const fillPct = hasStock ? (slot.quantity / maxQty) * 100 : 0;

              return (
                <div
                  key={col}
                  className={`flex-1 rounded-lg border border-gray-700 p-2 min-h-[72px] relative overflow-hidden ${
                    hasStock ? '' : 'opacity-50'
                  }`}
                >
                  {/* Fill bar */}
                  <div
                    className={`absolute bottom-0 left-0 right-0 ${hasStock ? getColor(slot.productName) : 'bg-gray-800'} opacity-30 transition-all duration-500`}
                    style={{ height: `${fillPct}%` }}
                  />

                  <div className="relative z-10">
                    {hasStock ? (
                      <>
                        <div className="text-[11px] font-medium text-white truncate">
                          {slot.productName}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1">
                          {slot.quantity}/{maxQty}
                        </div>
                        <div className="text-[11px] text-emerald-400 font-mono">
                          ${slot.price.toFixed(2)}
                        </div>
                      </>
                    ) : (
                      <div className="text-[10px] text-gray-600 text-center mt-3">
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

      <div className="mt-2 flex justify-between text-[10px] text-gray-600">
        <span>S = Small slot (max 15)</span>
        <span>L = Large slot (max 8)</span>
      </div>
    </div>
  );
}
