import { MachineSlot, StorageItem, SlotSize, Supplier } from './types';

// 4행 × 3열 = 12슬롯
// row 0,1 = small / row 2,3 = large
export function createEmptyMachine(): MachineSlot[] {
  const slots: MachineSlot[] = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      slots.push({
        row,
        col,
        size: row < 2 ? 'small' : 'large',
        productName: null,
        quantity: 0,
        price: 0,
      });
    }
  }
  return slots;
}

// 슬롯 최대 수량
export function maxQuantityForSize(size: SlotSize): number {
  return size === 'small' ? 15 : 8;
}

// 창고에서 자판기로 재입고
export function stockMachine(
  machine: MachineSlot[],
  storage: StorageItem[],
  productName: string,
  row: number,
  col: number,
  quantity: number,
  price: number,
  productSize: SlotSize
): { machine: MachineSlot[]; storage: StorageItem[]; error?: string } {
  const slotIndex = machine.findIndex(s => s.row === row && s.col === col);
  if (slotIndex === -1) return { machine, storage, error: 'Invalid slot position' };

  const slot = machine[slotIndex];
  if (slot.size !== productSize) {
    const validRows = productSize === 'small' ? '0 또는 1' : '2 또는 3';
    return {
      machine,
      storage,
      error: `[${row}행,${col}열] 슬롯은 ${slot.size}(${slot.size === 'small' ? '소형' : '대형'})인데 ${productName}은(는) ${productSize}(${productSize === 'small' ? '소형' : '대형'}) 상품입니다. ${productSize === 'small' ? '소형' : '대형'} 상품은 ${validRows}행에 넣으세요.`,
    };
  }

  // 이미 다른 상품이 있으면
  if (slot.productName && slot.productName !== productName && slot.quantity > 0) {
    return { machine, storage, error: `Slot already has ${slot.productName}` };
  }

  const storageItem = storage.find(s => s.productName === productName);
  if (!storageItem || storageItem.quantity < quantity) {
    return { machine, storage, error: `Not enough ${productName} in storage (have: ${storageItem?.quantity ?? 0})` };
  }

  const maxQty = maxQuantityForSize(slot.size);
  const currentQty = slot.productName === productName ? slot.quantity : 0;
  const canAdd = Math.min(quantity, maxQty - currentQty);

  if (canAdd <= 0) {
    return { machine, storage, error: 'Slot is full' };
  }

  const newMachine = [...machine];
  newMachine[slotIndex] = {
    ...slot,
    productName,
    quantity: currentQty + canAdd,
    price,
  };

  const newStorage = storage.map(s =>
    s.productName === productName ? { ...s, quantity: s.quantity - canAdd } : s
  ).filter(s => s.quantity > 0);

  return { machine: newMachine, storage: newStorage };
}

// 가격 설정
export function setSlotPrice(
  machine: MachineSlot[],
  row: number,
  col: number,
  price: number
): { machine: MachineSlot[]; error?: string } {
  const slotIndex = machine.findIndex(s => s.row === row && s.col === col);
  if (slotIndex === -1) return { machine, error: 'Invalid slot' };
  if (!machine[slotIndex].productName) return { machine, error: 'Slot is empty' };

  const newMachine = [...machine];
  newMachine[slotIndex] = { ...newMachine[slotIndex], price };
  return { machine: newMachine };
}

// 자판기에서 현금 수거
export function collectCash(machineBalance: number): { collected: number } {
  return { collected: machineBalance };
}

// 자판기 재고 요약 텍스트
export function machineInventorySummary(machine: MachineSlot[]): string {
  const lines = machine.map(s => {
    const pos = `[Row ${s.row}, Col ${s.col}] (${s.size})`;
    if (!s.productName) return `${pos}: Empty`;
    return `${pos}: ${s.productName} - qty: ${s.quantity}, price: $${s.price.toFixed(2)}`;
  });
  return lines.join('\n');
}

// 창고 요약 텍스트 — 상품별 size를 공급업체 카탈로그에서 조회해 함께 표시.
// size를 몰라 잘못된 슬롯에 재입고 시도하는 사고를 막기 위해 size와 유효한 행을 명시.
export function storageSummary(storage: StorageItem[], suppliers?: Supplier[]): string {
  if (storage.length === 0) return 'Storage is empty.';
  return storage.map(s => {
    let size: SlotSize | undefined;
    if (suppliers) {
      for (const sup of suppliers) {
        const cat = sup.catalog.find(p => p.productName === s.productName);
        if (cat) { size = cat.size; break; }
      }
    }
    if (!size) return `${s.productName}: ${s.quantity} units`;
    const rowHint = size === 'small' ? 'row 0-1' : 'row 2-3';
    return `${s.productName}: ${s.quantity} units (${size}, ${rowHint})`;
  }).join('\n');
}
