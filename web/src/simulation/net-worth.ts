import { SimulationState, MachineSlot } from './types';
import { getDifficultyConfig } from './difficulty';

// 재고·자판기 내 상품의 순자산 가치 비율 (도매가 × 0.75 ≈ 처분 가능 자산)
const INVENTORY_VALUE_RATIO = 0.75;

/**
 * 순자산 계산 — cash + 재고 가치 + 자판기 내 상품 가치 − 대여료 부채.
 * 순수 함수: 클라이언트/서버 양쪽에서 동일한 결과.
 * 난이도 config의 machineRentalFee를 참조하므로 state.difficulty 기반.
 */
export function calculateNetWorth(state: SimulationState): number {
  const config = getDifficultyConfig(state.difficulty);
  const cashTotal = state.balance + state.machineBalance;
  const storageValue = state.storage.reduce((sum, s) => sum + s.quantity * INVENTORY_VALUE_RATIO, 0);
  const machineValue = state.machine
    .filter((s): s is MachineSlot & { productName: string } => s.productName !== null && s.quantity > 0)
    .reduce((sum, s) => sum + s.quantity * INVENTORY_VALUE_RATIO, 0);
  return cashTotal + storageValue + machineValue - config.machineRentalFee;
}
