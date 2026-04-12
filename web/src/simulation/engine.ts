import {
  SimulationState,
  TurnLog,
  TurnResponse,
  MachineSlot,
  LlmVendor,
} from './types';
import { generateMarketCondition } from './market';
import { createEmptyMachine } from './vending-machine';
import { processDeliveries, initSupplierStates, processRandomEvents, generateSuppliers } from './suppliers';
import { simulateCustomerPurchases } from './customers';
import { generateMorningReport, runAgentTurn } from './agent';
import { updateMarketEvents, aggregateEventEffects } from './market-events';

const DAILY_FEE = 2;
const STARTING_BALANCE = 500;
const BANKRUPTCY_THRESHOLD = 10;
const MACHINE_RENTAL_FEE = 400;

// 초기 상태 생성
export function createInitialState(maxDays: number = 30, startDate?: string): SimulationState {
  const suppliers = generateSuppliers();
  return {
    day: 0,
    startDate: startDate || new Date().toISOString().split('T')[0],
    balance: STARTING_BALANCE,
    machineBalance: 0,
    machine: createEmptyMachine(),
    storage: [],
    orders: [],
    suppliers,
    emails: [],
    supplierStates: initSupplierStates(suppliers),
    marketEvents: [],
    history: [],
    consecutiveNegativeDays: 0,
    bankrupt: false,
    maxDays,
    conversationHistory: [],
  };
}

// 순자산 계산
function calculateNetWorth(state: SimulationState): number {
  const cashTotal = state.balance + state.machineBalance;
  const storageValue = state.storage.reduce((sum, s) => sum + s.quantity * 0.75, 0);
  const machineValue = state.machine
    .filter((s): s is MachineSlot & { productName: string } => s.productName !== null && s.quantity > 0)
    .reduce((sum, s) => sum + s.quantity * 0.75, 0);
  return cashTotal + storageValue + machineValue - MACHINE_RENTAL_FEE;
}

export type ProgressCallback = (step: string, status: 'start' | 'done', doneLabel?: string) => void;

// 한 턴 실행
export async function executeTurn(
  state: SimulationState,
  model: string,
  agentPrompt: string,
  vendor: LlmVendor = 'anthropic',
  apiKey?: string,
  onProgress?: ProgressCallback
): Promise<TurnResponse> {
  const emit = onProgress || (() => {});
  let currentState = { ...state, day: state.day + 1 };
  const { suppliers } = currentState;

  // 1. 배송 도착 처리
  emit('배송 도착 확인하는 중...', 'start');
  const deliveryResult = processDeliveries(
    currentState.orders, currentState.storage, currentState.day, suppliers
  );
  currentState.orders = deliveryResult.orders;
  currentState.storage = deliveryResult.storage;
  if (deliveryResult.deliveryEmails.length > 0) {
    currentState.emails = [...currentState.emails, ...deliveryResult.deliveryEmails];
  }

  emit('배송 도착 확인하는 중...', 'done', '배송 도착 확인 완료');

  // 2. 랜덤 이벤트 (공급업체 폐업, 배송 지연)
  emit('랜덤 이벤트 처리하는 중...', 'start');
  const { updatedStates: eventStates, events } = processRandomEvents(
    currentState.supplierStates, suppliers, currentState.day
  );
  currentState.supplierStates = eventStates;
  for (const event of events) {
    currentState.emails = [...currentState.emails, {
      id: `SYS-${currentState.day}-${Math.random().toString(36).slice(2, 6)}`,
      day: currentState.day,
      from: 'system@vendingmachine.com',
      to: 'agent@vendingmachine.com',
      subject: '시스템 알림',
      body: event,
      read: false,
      type: 'received',
    }];
  }

  emit('랜덤 이벤트 처리하는 중...', 'done', '랜덤 이벤트 처리 완료');

  // 3+4. 날씨 생성 + 시장 이벤트 갱신을 병렬 실행
  emit('시장 상황 분석하는 중...', 'start'); // 서로 독립적인 Haiku 호출
  const recentMarkets = currentState.history.slice(-5).map(h => h.market);
  const currentSeason = recentMarkets.length > 0 ? recentMarkets[recentMarkets.length - 1].season : 'spring';

  const [market, updatedMarketEvents] = await Promise.all([
    generateMarketCondition(currentState.day, currentState.startDate, recentMarkets, vendor, apiKey),
    updateMarketEvents(currentState.marketEvents, currentState.day, currentSeason, vendor, apiKey),
  ]);

  currentState.marketEvents = updatedMarketEvents;
  const eventEffects = aggregateEventEffects(currentState.marketEvents);
  emit('시장 상황 분석하는 중...', 'done', '시장 상황 분석 완료');

  // 5. 아침 리포트 생성 (공개 이벤트 포함)
  const morningReport = generateMorningReport(currentState, market, deliveryResult.delivered);

  // 6. AI 에이전트 실행
  emit('자판기 에이전트 일하는 중...', 'start');
  const agentResult = await runAgentTurn(currentState, morningReport, model, agentPrompt, vendor, apiKey, emit);
  currentState = agentResult.state;
  emit('자판기 에이전트 일하는 중...', 'done', '자판기 에이전트 작업 완료');

  // 7. 고객 구매 시뮬레이션 (이벤트 효과 반영)
  emit('고객 구매 시뮬레이션하는 중...', 'start');
  const purchaseResult = simulateCustomerPurchases(currentState.machine, market, eventEffects);
  currentState.machine = purchaseResult.newMachine;
  currentState.machineBalance += purchaseResult.machineRevenue;

  emit('고객 구매 시뮬레이션하는 중...', 'done', '고객 구매 시뮬레이션 완료');

  // 8. 일일 운영비 차감
  emit('재무 정산하는 중...', 'start');
  currentState.balance -= DAILY_FEE;

  // 9. 파산 체크
  if (currentState.balance < 0) {
    currentState.consecutiveNegativeDays++;
  } else {
    currentState.consecutiveNegativeDays = 0;
  }
  if (currentState.consecutiveNegativeDays >= BANKRUPTCY_THRESHOLD) {
    currentState.bankrupt = true;
  }

  emit('재무 정산하는 중...', 'done', '재무 정산 완료');

  // 10. 턴 로그 기록
  const netWorth = calculateNetWorth(currentState);
  const turnLog: TurnLog = {
    day: currentState.day,
    market,
    agentThinking: agentResult.thinking,
    agentActions: agentResult.actions,
    sales: purchaseResult.sales,
    deliveries: deliveryResult.delivered,
    balanceAfter: currentState.balance,
    netWorth,
  };

  currentState.history = [...currentState.history, turnLog];

  // 시뮬레이션 종료 시 자판기 대여료 $400 차감
  const finished = currentState.bankrupt || currentState.day >= currentState.maxDays;
  if (finished && !currentState.bankrupt) {
    currentState.balance -= MACHINE_RENTAL_FEE;
  }

  const finishReason = currentState.bankrupt
    ? 'bankrupt' as const
    : currentState.day >= currentState.maxDays
      ? 'max_days' as const
      : undefined;

  return { state: currentState, log: turnLog, finished, finishReason };
}
