// ============================================================
// Vending Machine Simulation - Core Types
// ============================================================

export type Weather = 'sunny' | 'cloudy' | 'rainy' | 'hot' | 'cold';
export type Season = 'spring' | 'summer' | 'fall' | 'winter';
export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type SlotSize = 'small' | 'large';

// --- Difficulty ---
export type Difficulty = 'easy' | 'normal' | 'hard';

export interface DifficultyConfig {
  id: Difficulty;
  label: string;
  description: string;

  // Economy 상수
  startingBalance: number;
  dailyFee: number;
  bankruptcyThreshold: number;
  machineRentalFee: number;

  // 이벤트 빈도 (일 단위)
  publicEventPeriod: number;
  hiddenEventPeriod: number;

  // 이벤트 톤 — LLM 프롬프트에 bias 주입
  eventTone: 'positive' | 'neutral' | 'negative';

  // 이벤트 효과 clamp 범위
  effectClamps: {
    demandMin: number;
    demandMax: number;
    trafficMin: number;
    trafficMax: number;
    priceShiftMin: number;
    priceShiftMax: number;
    deliveryDelayMax: number;
  };

  // Crisis tier — 극단 부정 이벤트
  crisisChance: number;        // 0~1, 이벤트 생성 시 crisis일 확률
  crisisDurationBonus: number; // crisis 이벤트의 expiresDay 추가 일수

  // Instant effects clamp — 이벤트 1회성 효과 상한 (난이도별 gating)
  instantEffectClamps: {
    stockLossPercentageMax: number; // 0~1, 0이면 비활성화
    stockLossFixedMax: number;      // 절대 수량 상한
    oneTimeFeeMax: number;           // $ 상한, 0이면 비활성화
  };

  // Duration constraints clamp — 지속 제약 상한 (게임 파탄 방지)
  durationConstraintClamps: {
    maxActiveDays: number;            // 이벤트 최대 활성일수 (expiresDay hard cap), 0이면 비활성
    deliveryFreezeEnabled: boolean;   // freeze 허용 여부
    maxDamagedSlots: number;          // 동시 파손 슬롯 상한, 0이면 비활성
    minDailySalesCap: number;         // 일일 판매 상한 값의 최소치 (너무 낮게 떨어지지 않도록)
  };
}

// --- Product ---
export interface Product {
  name: string;
  size: SlotSize;
  wholesalePrice: number;  // 도매가
  referencePrice: number;  // 기준 소비자가
  baseSales: number;       // 일일 기본 판매량
  elasticity: number;      // 가격탄력성 (1.0~3.0)
  category: 'beverage' | 'snack' | 'other';
}

// --- Vending Machine Slot ---
export interface MachineSlot {
  row: number;        // 0-3
  col: number;        // 0-2
  size: SlotSize;     // row 0,1 = small, row 2,3 = large
  productName: string | null;
  quantity: number;
  price: number;
}

// --- Storage (창고) ---
export interface StorageItem {
  productName: string;
  quantity: number;
}

// --- Supplier ---
export type SupplierType = 'honest_general' | 'honest_friendly' | 'adversarial_ripoff' | 'adversarial_scam';

export interface Supplier {
  id: string;
  name: string;          // 랜덤 생성
  email: string;         // 랜덤 생성
  contactPerson: string; // 랜덤 생성
  specialty: string;
  type: SupplierType;
  catalog: SupplierProduct[];
}

export interface SupplierProduct {
  productName: string;
  wholesalePrice: number;
  minOrder: number;
  size: SlotSize;
  category: 'beverage' | 'snack' | 'other';
}

// --- Order ---
export interface Order {
  id: string;
  supplierId: string;
  items: { productName: string; quantity: number; unitPrice: number }[];
  totalCost: number;
  orderDay: number;
  deliveryDay: number;
  delivered: boolean;
}

// --- Supplier Relationship State ---
export interface SupplierState {
  supplierId: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDay: number;
  relationship: number;         // -5 ~ +5
  currentPriceModifier: number; // 0.85 ~ 1.50
  notes: string;
  defunct: boolean;             // 폐업 여부
  defunctDay?: number;         // 폐업일
  deliveryDelayExtra: number;  // 추가 배송 지연일 (0~3)
}

// --- Email ---
export interface Email {
  id: string;
  day: number;           // 발송/수신 일차
  from: string;          // 발신자 (에이전트 또는 공급업체명)
  to: string;            // 수신자
  subject: string;
  body: string;
  read: boolean;
  type: 'sent' | 'received';
}

// --- Market Events (시장 이벤트) ---
export interface MarketEvent {
  id: string;
  day: number;
  headline: string;
  subheadline: string;
  body: string;
  visible: boolean;       // true = 공개(UI 표시), false = 숨김
  effects: MarketEventEffects;
  expiresDay: number;     // 이 날까지 효과 유지
}

export interface MarketEventEffects {
  demandMultiplier?: Record<string, number>;  // 카테고리별 수요 배수 (beverage, snack, other, all)
  deliveryDelayGlobal?: number;               // 전체 배송 추가 지연일
  priceShift?: Record<string, number>;        // 카테고리별 도매가 변동률
  customerTraffic?: number;                   // 전체 고객 유동 배수 (0.5~2.0)
  instantEffects?: InstantEffects;            // 이벤트 활성화 시점 1회성 효과 (crisis에서 주로)
  durationConstraints?: DurationConstraints;  // 이벤트 활성 기간 내내 구조적 제약 (Phase 2)
}

/**
 * Duration constraints — 이벤트가 활성인 기간 동안 매 턴 자동 적용되는 구조적 제약.
 * Phase 2: deliveryFreeze · damagedSlots · dailySalesCap.
 * 게임 파탄 방지: 구현체에서 이벤트 expiresDay를 event.day + 3 이하로 hard cap.
 */
export interface DurationConstraints {
  deliveryFreeze?: boolean;                         // 활성 기간 모든 배송 중단
  damagedSlots?: { row: number; col: number }[];    // 해당 슬롯 판매 불가 (수리 대기)
  dailySalesCap?: number;                           // 일일 총 판매량 상한 (배급제 등)
}

/**
 * Instant effects — 이벤트 활성화 시점에 state에 한 번 적용되는 즉시 효과.
 * 지속 시간이 없으므로 게임 파탄 위험 없이 활용 가능.
 * Phase 1: stockLoss (재고 손실) · oneTimeFee (일회성 비용).
 */
export interface InstantEffects {
  stockLoss?: {
    target: 'storage' | 'machine' | 'both';
    categoryFilter?: 'beverage' | 'snack' | 'other' | 'all';
    percentage?: number;   // 0~1, target 재고의 몇 %를 손실
    fixedUnits?: number;   // 또는 절대 수량 (percentage와 하나만 사용)
    reason?: string;       // UI/로그용 사유 (예: "절도", "변질")
  };
  oneTimeFee?: {
    amount: number;  // 차감 금액($)
    reason: string;  // 사유 (예: "자판기 수리비", "정기검사 과태료")
  };
}

// --- Market Conditions ---
export interface MarketCondition {
  day: number;
  dayOfWeek: DayOfWeek;
  weather: Weather;
  season: Season;
  date: string; // YYYY-MM-DD format
}

// --- Daily Sales Record ---
export interface DailySales {
  day: number;
  items: { productName: string; quantity: number; revenue: number }[];
  totalRevenue: number;
  totalUnitsSold: number;
}

// --- Agent Action Log ---
export interface AgentAction {
  tool: string;
  input: Record<string, unknown>;
  result: string;
}

// --- Turn Log ---
export interface TurnLog {
  day: number;
  market: MarketCondition;
  agentThinking: string;
  agentActions: AgentAction[];
  sales: DailySales;
  deliveries: Order[];
  balanceAfter: number;
  netWorth: number;
  warnings?: string[];  // LLM 출력 파싱 실패·포맷 폴백 발동 메시지
}

// --- Full Simulation State ---
export interface SimulationState {
  day: number;
  startDate: string;       // YYYY-MM-DD
  balance: number;         // 현금 잔고
  machineBalance: number;  // 자판기 내 수금 안 된 현금
  machine: MachineSlot[];  // 12 slots
  storage: StorageItem[];
  orders: Order[];
  suppliers: Supplier[];  // 이번 시뮬레이션의 공급업체들 (랜덤 생성)
  emails: Email[];
  supplierStates: Record<string, SupplierState>;
  marketEvents: MarketEvent[];  // 현재 활성 시장 이벤트
  history: TurnLog[];
  consecutiveNegativeDays: number;
  bankrupt: boolean;
  maxDays: number;         // 30 or custom
  difficulty: Difficulty;  // 시뮬레이션 생성 시 선택된 난이도 (이후 불변)
  // 에이전트 대화 히스토리 (컨텍스트 유지)
  conversationHistory: ConversationMessage[];
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
}

// --- LLM Vendor ---
export type LlmVendor = 'anthropic' | 'openai' | 'gemini';

// --- Model Info ---
export interface ModelInfo {
  id: string;
  name: string;
  createdAt: string;
}

// --- Simulation Config (사용자 설정) ---
export interface SimulationConfig {
  model: string;
  agentPrompt: string;  // 사용자가 편집 가능한 성격/행동 프롬프트
  maxDays: number;
}

// --- API Request/Response ---
export interface StartRequest {
  maxDays?: number;
  startDate?: string;
  difficulty?: Difficulty;
}

export interface StartResponse {
  state: SimulationState;
}

export interface TurnRequest {
  state: SimulationState;
  model: string;
  agentPrompt: string;
  vendor: LlmVendor;
  apiKey: string;
}

export interface TurnResponse {
  state: SimulationState;
  log: TurnLog;
  finished: boolean;
  finishReason?: 'bankrupt' | 'max_days';
}
