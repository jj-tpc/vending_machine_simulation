// ============================================================
// Vending Machine Simulation - Core Types
// ============================================================

export type Weather = 'sunny' | 'cloudy' | 'rainy' | 'hot' | 'cold';
export type Season = 'spring' | 'summer' | 'fall' | 'winter';
export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type SlotSize = 'small' | 'large';

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
