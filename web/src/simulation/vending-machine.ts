import { MachineSlot, StorageItem, SlotSize } from './types';

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
    return { machine, storage, error: `Slot is ${slot.size} but product is ${productSize}` };
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

// 창고 요약 텍스트
export function storageSummary(storage: StorageItem[]): string {
  if (storage.length === 0) return 'Storage is empty.';
  return storage.map(s => `${s.productName}: ${s.quantity} units`).join('\n');
}
