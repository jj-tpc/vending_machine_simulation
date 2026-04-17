import {
  SimulationState,
  TurnLog,
  TurnResponse,
  LlmVendor,
  Difficulty,
} from './types';
import { DEFAULT_DIFFICULTY, getDifficultyConfig } from './difficulty';
import { calculateNetWorth } from './net-worth';
import { generateMarketCondition } from './market';
import { createEmptyMachine } from './vending-machine';
import { processDeliveries, initSupplierStates, processRandomEvents, generateSuppliers } from './suppliers';
import { simulateCustomerPurchases } from './customers';
import { generateMorningReport, runAgentTurn } from './agent';
import { updateMarketEvents, aggregateEventEffects } from './market-events';
import { applyInstantEffects } from './event-effects';

// 초기 상태 생성 — 난이도 설정에 따라 시작 자본 결정, state에 difficulty 저장
export function createInitialState(
  maxDays: number = 30,
  startDate?: string,
  difficulty: Difficulty = DEFAULT_DIFFICULTY,
): SimulationState {
  const config = getDifficultyConfig(difficulty);
  const suppliers = generateSuppliers();
  return {
    day: 0,
    startDate: startDate || new Date().toISOString().split('T')[0],
    balance: config.startingBalance,
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
    difficulty,
    conversationHistory: [],
  };
}

// 순자산 계산은 pure util(simulation/net-worth.ts)에 분리 — 클라이언트/서버 공용.

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
  const warnings: string[] = [];
  let currentState = { ...state, day: state.day + 1 };
  const { suppliers } = currentState;
  const difficultyConfig = getDifficultyConfig(currentState.difficulty);

  // 이전 턴까지 이어진 활성 이벤트의 집계 — 이번 턴 배송 단계가 참고
  // (이번 턴에 새로 생성될 이벤트는 step 4에서 이후 집계에 합류)
  const carryoverEffects = aggregateEventEffects(
    currentState.marketEvents.filter(e => e.expiresDay > currentState.day),
  );
  const deliveryFreeze = carryoverEffects.durationConstraints?.deliveryFreeze ?? false;

  // 1. 배송 도착 처리
  emit('배송 도착 확인하는 중...', 'start');
  const deliveryResult = processDeliveries(
    currentState.orders, currentState.storage, currentState.day, suppliers, deliveryFreeze
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

  // 3. 날씨 생성 (먼저 실행 - 날짜/계절 정보 확보)
  emit('시장 상황 분석하는 중...', 'start');
  const recentMarkets = currentState.history.slice(-5).map(h => h.market);
  const market = await generateMarketCondition(currentState.day, currentState.startDate, recentMarkets, vendor, apiKey, warnings);

  // 4. 시장 이벤트 갱신 (날짜, 계절, 날씨, 난이도 config 전달)
  const previousEventIds = new Set(currentState.marketEvents.map(e => e.id));
  const updatedMarketEvents = await updateMarketEvents(
    currentState.marketEvents, currentState.day, market.season, vendor, apiKey, market.date, market.weather, warnings, difficultyConfig
  );
  currentState.marketEvents = updatedMarketEvents;

  // 4b. 새로 추가된 이벤트의 instantEffects(재고 손실·즉시 비용)를 state에 1회 적용
  const newEvents = updatedMarketEvents.filter(e => !previousEventIds.has(e.id));
  if (newEvents.length > 0) {
    const applied = applyInstantEffects(currentState, newEvents);
    currentState = applied.state;
    // 알림 메일 — 에이전트가 오늘 턴부터 인지할 수 있도록 받은편지함에 추가
    for (const notif of applied.notifications) {
      currentState.emails = [...currentState.emails, {
        id: `INST-${currentState.day}-${Math.random().toString(36).slice(2, 6)}`,
        day: currentState.day,
        from: 'system@vendingmachine.com',
        to: 'agent@vendingmachine.com',
        subject: notif.kind === 'oneTimeFee' ? `비용 발생 — ${notif.eventHeadline}` : `재고 손실 — ${notif.eventHeadline}`,
        body: `${notif.eventHeadline}\n\n${notif.detail}`,
        read: false,
        type: 'received',
      }];
    }
  }

  const eventEffects = aggregateEventEffects(currentState.marketEvents);
  emit('시장 상황 분석하는 중...', 'done', '시장 상황 분석 완료');

  // 5. 아침 리포트 생성 (공개 이벤트 포함)
  const morningReport = generateMorningReport(currentState, market, deliveryResult.delivered);

  // 6. AI 에이전트 실행
  emit('자판기 에이전트 일하는 중...', 'start');
  const agentResult = await runAgentTurn(currentState, morningReport, model, agentPrompt, vendor, apiKey, emit, warnings);
  currentState = agentResult.state;
  emit('자판기 에이전트 일하는 중...', 'done', '자판기 에이전트 작업 완료');

  // 7. 고객 구매 시뮬레이션 (이벤트 효과 반영)
  emit('고객 구매 시뮬레이션하는 중...', 'start');
  const purchaseResult = simulateCustomerPurchases(currentState.machine, market, eventEffects);
  currentState.machine = purchaseResult.newMachine;
  currentState.machineBalance += purchaseResult.machineRevenue;

  emit('고객 구매 시뮬레이션하는 중...', 'done', '고객 구매 시뮬레이션 완료');

  // 8. 일일 운영비 차감 (난이도별)
  emit('재무 정산하는 중...', 'start');
  currentState.balance -= difficultyConfig.dailyFee;

  // 9. 파산 체크 (난이도별 임계)
  if (currentState.balance < 0) {
    currentState.consecutiveNegativeDays++;
  } else {
    currentState.consecutiveNegativeDays = 0;
  }
  if (currentState.consecutiveNegativeDays >= difficultyConfig.bankruptcyThreshold) {
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
    warnings: warnings.length > 0 ? warnings : undefined,
  };

  currentState.history = [...currentState.history, turnLog];

  // 시뮬레이션 종료 시 자판기 대여료 차감 (난이도별)
  const finished = currentState.bankrupt || currentState.day >= currentState.maxDays;
  if (finished && !currentState.bankrupt) {
    currentState.balance -= difficultyConfig.machineRentalFee;
  }

  const finishReason = currentState.bankrupt
    ? 'bankrupt' as const
    : currentState.day >= currentState.maxDays
      ? 'max_days' as const
      : undefined;

  return { state: currentState, log: turnLog, finished, finishReason };
}
