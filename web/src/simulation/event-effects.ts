import { SimulationState, MarketEvent, InstantEffects, StorageItem, MachineSlot } from './types';
import { getProductCategory } from './customers';

export interface InstantEffectNotification {
  eventId: string;
  eventHeadline: string;
  kind: 'stockLoss' | 'oneTimeFee';
  detail: string;   // 사람이 읽을 요약 (이메일·로그용)
}

/**
 * 새로 도착한 이벤트들의 instantEffects를 state에 1회 적용.
 * - stockLoss: 타겟(storage/machine/both)의 해당 카테고리 재고를 percentage 또는 fixedUnits만큼 감소
 * - oneTimeFee: balance에서 amount만큼 차감
 *
 * 지속 시간 0. state 자체가 변형되므로 이후 턴에 흔적이 남지 않고 "변형된 새 상태"로 계속 진행.
 * 반환: 업데이트된 state + 에이전트/UI에 알릴 notification 리스트
 */
export function applyInstantEffects(
  state: SimulationState,
  newEvents: MarketEvent[],
): { state: SimulationState; notifications: InstantEffectNotification[] } {
  let currentState = state;
  const notifications: InstantEffectNotification[] = [];

  for (const event of newEvents) {
    const effects = event.effects.instantEffects;
    if (!effects) continue;

    if (effects.stockLoss) {
      const { newStorage, newMachine, detail } = applyStockLoss(
        currentState.storage, currentState.machine, effects.stockLoss,
      );
      if (detail) {
        currentState = { ...currentState, storage: newStorage, machine: newMachine };
        notifications.push({
          eventId: event.id,
          eventHeadline: event.headline,
          kind: 'stockLoss',
          detail,
        });
      }
    }

    if (effects.oneTimeFee) {
      const amount = effects.oneTimeFee.amount;
      if (amount > 0) {
        currentState = { ...currentState, balance: currentState.balance - amount };
        notifications.push({
          eventId: event.id,
          eventHeadline: event.headline,
          kind: 'oneTimeFee',
          detail: `${effects.oneTimeFee.reason} — $${amount.toFixed(2)} 차감`,
        });
      }
    }
  }

  return { state: currentState, notifications };
}

function applyStockLoss(
  storage: StorageItem[],
  machine: MachineSlot[],
  loss: NonNullable<InstantEffects['stockLoss']>,
): { newStorage: StorageItem[]; newMachine: MachineSlot[]; detail: string } {
  const categoryMatch = (productName: string): boolean => {
    if (!loss.categoryFilter || loss.categoryFilter === 'all') return true;
    return getProductCategory(productName) === loss.categoryFilter;
  };

  let storageLoss = 0;
  let machineLoss = 0;
  let newStorage = storage;
  let newMachine = machine;
  const target = loss.target;

  // 감소 로직: percentage면 각 타겟별 카테고리 매칭 수량에 비례,
  // fixedUnits면 매칭 재고를 순회하며 총 fixedUnits까지 차감.
  if (loss.percentage && loss.percentage > 0) {
    if (target === 'storage' || target === 'both') {
      newStorage = storage.map(item => {
        if (!categoryMatch(item.productName)) return item;
        const loseQty = Math.floor(item.quantity * loss.percentage!);
        storageLoss += loseQty;
        return { ...item, quantity: item.quantity - loseQty };
      }).filter(item => item.quantity > 0);
    }
    if (target === 'machine' || target === 'both') {
      newMachine = machine.map(slot => {
        if (!slot.productName || slot.quantity <= 0 || !categoryMatch(slot.productName)) return slot;
        const loseQty = Math.floor(slot.quantity * loss.percentage!);
        machineLoss += loseQty;
        return { ...slot, quantity: slot.quantity - loseQty };
      });
    }
  } else if (loss.fixedUnits && loss.fixedUnits > 0) {
    let remaining = loss.fixedUnits;
    if (target === 'storage' || target === 'both') {
      newStorage = storage.map(item => {
        if (remaining <= 0 || !categoryMatch(item.productName)) return item;
        const take = Math.min(item.quantity, remaining);
        remaining -= take;
        storageLoss += take;
        return { ...item, quantity: item.quantity - take };
      }).filter(item => item.quantity > 0);
    }
    if (remaining > 0 && (target === 'machine' || target === 'both')) {
      newMachine = machine.map(slot => {
        if (!slot.productName || slot.quantity <= 0 || remaining <= 0 || !categoryMatch(slot.productName)) return slot;
        const take = Math.min(slot.quantity, remaining);
        remaining -= take;
        machineLoss += take;
        return { ...slot, quantity: slot.quantity - take };
      });
    }
  }

  const total = storageLoss + machineLoss;
  if (total === 0) return { newStorage, newMachine, detail: '' };

  const reason = loss.reason || '사건';
  const parts: string[] = [];
  if (storageLoss > 0) parts.push(`창고 ${storageLoss}개`);
  if (machineLoss > 0) parts.push(`자판기 ${machineLoss}개`);
  const categoryLabel = loss.categoryFilter && loss.categoryFilter !== 'all' ? ` (${loss.categoryFilter})` : '';
  const detail = `${reason}${categoryLabel} — ${parts.join(' + ')} 손실`;

  return { newStorage, newMachine, detail };
}
