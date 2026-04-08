import Anthropic from '@anthropic-ai/sdk';
import { SimulationState, AgentAction, MarketCondition, Order, Email } from './types';
import { machineInventorySummary, storageSummary, stockMachine, setSlotPrice, collectCash } from './vending-machine';
import { supplierDirectory, processAgentEmail, ordersSummary } from './suppliers';

// 고정 시스템 지침 (환경 규칙, 도구 사용법 등)
function buildFixedPrompt(suppliersDir: string): string {
  return `반드시 한국어로 응답하세요.

## 환경 규칙
- 4행 × 3열 = 12슬롯의 자판기를 운영 중
  - 0-1행: 소형 상품 (슬롯당 최대 15개)
  - 2-3행: 대형 상품 (슬롯당 최대 8개)
- 배송된 상품이 보관되는 별도 창고가 있음
- 시작 자금 $500, 일일 운영비 $2
- 시뮬레이션 종료 시 자판기 대여료 $400을 납부해야 함 (최종 잔고에서 차감)
- 잔고가 10일 연속 마이너스면 파산

## 환경 정보
- 도매가로 구매해서 소비자가로 판매
- 주말 매출이 평일보다 높음
- 날씨와 계절이 매출에 영향 (여름/더운 날씨에 음료 잘 팔림)
- 주문 후 배송까지 2-3일 소요
- 공급업체가 갑자기 폐업할 수 있으니 항상 대안(Plan B)을 준비하세요
- 모든 공급업체가 정직하지는 않습니다. 가격을 비교하고 의심스러운 제안에 주의하세요

## 공급업체 연락처
${suppliersDir}

## 이메일 주문 방법
- send_email 도구로 공급업체에 이메일을 보내 상품을 문의하거나 주문하세요
- 주문 시 이메일 본문에 상품명과 수량을 명확히 적으세요 (예: "Cola 20개, Water 15개")
- 공급업체가 이메일로 답장합니다. read_inbox로 확인하세요
- 배송 완료 시에도 이메일 알림이 옵니다
- 공급업체 담당자들은 이전 대화를 기억합니다. 이전 메일에서 논의한 내용(가격, 협상, 약속 등)을 참조하며 일관성 있게 소통하세요
- 가격 협상이나 불만 제기 시 이전 이메일 내용을 근거로 제시하면 효과적입니다

## 도구 사용 규칙
- 반드시 도구(tool)를 사용해서 행동해야 합니다. 생각만 하면 안 됩니다.
- 자판기에 상품을 넣을 때 정확한 슬롯(row, col)을 지정해야 합니다.`;
}

// 기본 에이전트 프롬프트 (사용자가 편집 가능)
export const DEFAULT_AGENT_PROMPT = `## 역할
당신은 자율적으로 운영되는 자판기 사업 관리자입니다. 재고 관리, 가격 설정, 주문을 통해 수익을 극대화하는 것이 목표입니다.

## 성격
- 꼼꼼하고 분석적인 성격
- 데이터 기반으로 의사결정
- 위험을 적당히 감수하는 균형 잡힌 투자 성향

## 행동 패턴
- 매일 재고를 확인하고, 부족한 상품을 미리 주문
- 적정 마진(1.5~2.5배)으로 가격 설정
- 인기 상품을 비축하고 다양성 유지 (4-6종이 최적)
- 자판기 현금을 정기적으로 수거해서 잔고 유지
- 재고가 떨어지기 전에 미리 재주문
- 매일 고려할 것: 재입고 필요? 추가 주문? 가격 조정? 현금 수거?
- 적극적이고 결단력 있게 행동
- 공급업체에 이메일을 보내 상품을 주문하고, 답장을 확인`;

// 최종 시스템 프롬프트 조합
export function buildSystemPrompt(agentPrompt: string, suppliers: import('./types').Supplier[]): string {
  const suppliersDir = supplierDirectory(suppliers);
  return `${agentPrompt}\n\n${buildFixedPrompt(suppliersDir)}`;
}

// Tool definitions for Claude
const TOOLS: Anthropic.Tool[] = [
  {
    name: 'check_balance',
    description: '현재 보유 현금과 자판기 내 미수거 현금을 확인합니다',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_machine_inventory',
    description: '자판기 재고 현황을 확인합니다 (12슬롯의 상품명, 수량, 가격)',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_storage_inventory',
    description: '창고에 보관 중인 상품을 확인합니다 (자판기에 넣을 수 있는 재고)',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'send_email',
    description: '이메일을 보냅니다. 공급업체에 상품 문의나 주문을 할 때 사용합니다. 주문 시 본문에 상품명과 수량을 명확히 적으세요.',
    input_schema: {
      type: 'object' as const,
      properties: {
        to: { type: 'string', description: '수신자 이메일 주소 (예: sales@freshdrinks.com)' },
        subject: { type: 'string', description: '이메일 제목' },
        body: { type: 'string', description: '이메일 본문' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'read_inbox',
    description: '수신함을 확인합니다. 공급업체 답장, 주문 확인, 배송 알림 등을 확인할 수 있습니다.',
    input_schema: {
      type: 'object' as const,
      properties: {
        unread_only: { type: 'boolean', description: '읽지 않은 메일만 표시 (기본: true)' },
      },
      required: [],
    },
  },
  {
    name: 'stock_machine',
    description: '창고의 상품을 자판기 특정 슬롯에 넣습니다. 0-1행은 소형, 2-3행은 대형 상품용입니다.',
    input_schema: {
      type: 'object' as const,
      properties: {
        productName: { type: 'string', description: '넣을 상품명' },
        row: { type: 'number', description: '행 (0-3). 0-1행 소형, 2-3행 대형.' },
        col: { type: 'number', description: '열 (0-2)' },
        quantity: { type: 'number', description: '넣을 수량' },
        price: { type: 'number', description: '소비자 판매가 (예: 1.50)' },
      },
      required: ['productName', 'row', 'col', 'quantity', 'price'],
    },
  },
  {
    name: 'set_price',
    description: '특정 슬롯의 상품 가격을 변경합니다',
    input_schema: {
      type: 'object' as const,
      properties: {
        row: { type: 'number', description: '행 (0-3)' },
        col: { type: 'number', description: '열 (0-2)' },
        price: { type: 'number', description: '새 판매가' },
      },
      required: ['row', 'col', 'price'],
    },
  },
  {
    name: 'collect_cash',
    description: '자판기에 쌓인 판매 수익금을 모두 수거합니다',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
];

// 이메일 ID 카운터
let sentEmailCounter = 0;

// 도구 실행 (send_email은 async)
async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  state: SimulationState
): Promise<{ result: string; state: SimulationState }> {
  switch (toolName) {
    case 'check_balance': {
      return {
        result: `보유 현금: $${state.balance.toFixed(2)}\n자판기 내 미수거 현금: $${state.machineBalance.toFixed(2)}\n총 유동자금: $${(state.balance + state.machineBalance).toFixed(2)}`,
        state,
      };
    }
    case 'get_machine_inventory': {
      return { result: machineInventorySummary(state.machine), state };
    }
    case 'get_storage_inventory': {
      return { result: storageSummary(state.storage), state };
    }
    case 'send_email': {
      const { to, subject, body } = input as { to: string; subject: string; body: string };
      sentEmailCounter++;

      // 에이전트가 보낸 이메일 기록
      const sentEmail: Email = {
        id: `SENT-${String(sentEmailCounter).padStart(4, '0')}`,
        day: state.day,
        from: 'agent@vendingmachine.com',
        to,
        subject,
        body,
        read: true,
        type: 'sent',
      };

      let newState = { ...state, emails: [...state.emails, sentEmail] };

      // 공급업체 응답 처리 (Haiku가 공급업체 페르소나로 독자적 판단)
      const { replyEmail, order, newBalance, updatedSupplierStates } = await processAgentEmail(
        sentEmail, state.day, newState.balance, newState.supplierStates, state.suppliers, newState.emails
      );

      newState.emails = [...newState.emails, replyEmail];
      newState.supplierStates = updatedSupplierStates;

      if (order) {
        newState.orders = [...newState.orders, order];
      }
      if (newBalance !== undefined) {
        newState.balance = newBalance;
      }

      return {
        result: `이메일을 ${to}에게 보냈습니다.\n제목: ${subject}\n\n(답장이 수신함에 도착했습니다. read_inbox로 확인하세요.)`,
        state: newState,
      };
    }
    case 'read_inbox': {
      const unreadOnly = (input.unread_only ?? true) as boolean;
      const emails = state.emails.filter(e =>
        e.type === 'received' && (!unreadOnly || !e.read)
      );

      if (emails.length === 0) {
        return {
          result: unreadOnly ? '읽지 않은 이메일이 없습니다.' : '수신함이 비어있습니다.',
          state,
        };
      }

      // 읽음 처리
      const newEmails = state.emails.map(e =>
        emails.find(ue => ue.id === e.id) ? { ...e, read: true } : e
      );

      const emailTexts = emails.map(e =>
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `From: ${e.from}\n` +
        `Subject: ${e.subject}\n` +
        `Day: ${e.day}일차\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `${e.body}`
      ).join('\n\n');

      return {
        result: `${emails.length}개의 ${unreadOnly ? '새 ' : ''}이메일:\n\n${emailTexts}`,
        state: { ...state, emails: newEmails },
      };
    }
    case 'stock_machine': {
      const { productName, row, col, quantity, price } = input as {
        productName: string; row: number; col: number; quantity: number; price: number;
      };
      let productSize: 'small' | 'large' = 'small';
      for (const supplier of state.suppliers) {
        const cat = supplier.catalog.find(p => p.productName === productName);
        if (cat) { productSize = cat.size; break; }
      }
      const result = stockMachine(state.machine, state.storage, productName, row, col, quantity, price, productSize);
      if (result.error) return { result: `재입고 실패: ${result.error}`, state };
      return {
        result: `${productName} ${quantity}개를 [${row}행, ${col}열]에 개당 $${price.toFixed(2)}로 입고했습니다.`,
        state: { ...state, machine: result.machine, storage: result.storage },
      };
    }
    case 'set_price': {
      const { row, col, price } = input as { row: number; col: number; price: number };
      const result = setSlotPrice(state.machine, row, col, price);
      if (result.error) return { result: `가격 변경 실패: ${result.error}`, state };
      return {
        result: `[${row}행, ${col}열] 가격을 $${price.toFixed(2)}로 변경했습니다.`,
        state: { ...state, machine: result.machine },
      };
    }
    case 'collect_cash': {
      const { collected } = collectCash(state.machineBalance);
      if (collected <= 0) return { result: '자판기에 수거할 현금이 없습니다.', state };
      return {
        result: `자판기에서 $${collected.toFixed(2)}를 수거했습니다.`,
        state: { ...state, balance: state.balance + collected, machineBalance: 0 },
      };
    }
    default:
      return { result: `알 수 없는 도구: ${toolName}`, state };
  }
}

// 아침 리포트 생성
export function generateMorningReport(
  state: SimulationState,
  market: MarketCondition,
  deliveredOrders: Order[]
): string {
  const parts: string[] = [];

  const dowKo: Record<string, string> = {
    mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일'
  };
  const weatherKo: Record<string, string> = {
    sunny: '맑음', cloudy: '흐림', rainy: '비', hot: '더움', cold: '추움'
  };
  const seasonKo: Record<string, string> = {
    spring: '봄', summer: '여름', fall: '가을', winter: '겨울'
  };

  parts.push(`=== ${state.day}일차 아침 보고 ===`);
  parts.push(`날짜: ${market.date} (${dowKo[market.dayOfWeek]}요일)`);
  parts.push(`날씨: ${weatherKo[market.weather]} | 계절: ${seasonKo[market.season]}`);
  parts.push(`보유 현금: $${state.balance.toFixed(2)} | 자판기 내 현금: $${state.machineBalance.toFixed(2)}`);

  // 새 이메일 알림
  const unreadCount = state.emails.filter(e => e.type === 'received' && !e.read).length;
  if (unreadCount > 0) {
    parts.push(`\n📧 읽지 않은 이메일 ${unreadCount}통이 있습니다. read_inbox로 확인하세요.`);
  }

  // 어제 매출
  if (state.history.length > 0) {
    const yesterday = state.history[state.history.length - 1];
    parts.push(`\n--- 어제 매출 (${yesterday.day}일차) ---`);
    if (yesterday.sales.items.length > 0) {
      for (const item of yesterday.sales.items) {
        parts.push(`  ${item.productName}: ${item.quantity}개 판매, $${item.revenue.toFixed(2)}`);
      }
      parts.push(`  합계: ${yesterday.sales.totalUnitsSold}개, $${yesterday.sales.totalRevenue.toFixed(2)}`);
    } else {
      parts.push('  어제 매출 없음.');
    }
  } else {
    parts.push('\n오늘이 첫날입니다. 자판기가 비어있으니 공급업체에 이메일을 보내 상품을 주문하세요!');
  }

  // 대기 중 주문
  const pendingOrders = state.orders.filter(o => !o.delivered);
  if (pendingOrders.length > 0) {
    parts.push('\n--- 배송 대기 중 ---');
    parts.push(ordersSummary(state.orders, state.day));
  }

  // 공개 시장 뉴스
  const visibleEvents = state.marketEvents.filter(e => e.visible && e.expiresDay > state.day);
  if (visibleEvents.length > 0) {
    parts.push('\n--- 시장 뉴스 ---');
    for (const ev of visibleEvents) {
      parts.push(`📰 ${ev.headline} - ${ev.subheadline}`);
      parts.push(`   ${ev.body}`);
    }
  }

  parts.push(`\n오늘 무엇을 하시겠습니까? 도구를 사용해 행동하세요.`);

  return parts.join('\n');
}

// Claude 에이전트 실행 (한 턴)
export async function runAgentTurn(
  state: SimulationState,
  morningReport: string,
  model: string,
  agentPrompt: string
): Promise<{ state: SimulationState; thinking: string; actions: AgentAction[] }> {
  const client = new Anthropic();
  const actions: AgentAction[] = [];
  let thinking = '';
  let currentState = { ...state };
  const systemPrompt = buildSystemPrompt(agentPrompt, state.suppliers);

  const recentHistory = currentState.conversationHistory.slice(-6);

  const messages: Anthropic.MessageParam[] = [
    ...recentHistory.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content as string,
    })),
    { role: 'user', content: morningReport },
  ];

  const MAX_TOOL_CALLS = 8; // 이메일 송수신 포함해서 넉넉하게
  let toolCallCount = 0;

  while (toolCallCount < MAX_TOOL_CALLS) {
    const response = await client.messages.create({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      tools: TOOLS,
      messages,
    });

    for (const block of response.content) {
      if (block.type === 'text') {
        thinking += (thinking ? '\n' : '') + block.text;
      }
    }

    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');

    if (toolUseBlocks.length === 0 || response.stop_reason === 'end_turn') {
      messages.push({ role: 'assistant', content: response.content as unknown as string });
      break;
    }

    messages.push({ role: 'assistant', content: response.content as unknown as string });

    // 읽기 전용 도구와 상태 변경 도구를 분리
    const READ_ONLY_TOOLS = new Set(['check_balance', 'get_machine_inventory', 'get_storage_inventory', 'read_inbox']);
    const readOnlyBlocks = toolUseBlocks.filter(b => b.type === 'tool_use' && READ_ONLY_TOOLS.has(b.name));
    const mutatingBlocks = toolUseBlocks.filter(b => b.type === 'tool_use' && !READ_ONLY_TOOLS.has(b.name));

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    // 읽기 전용 도구: 병렬 실행 (상태 변경 없음)
    if (readOnlyBlocks.length > 0) {
      const readResults = await Promise.all(
        readOnlyBlocks.map(async (block) => {
          if (block.type !== 'tool_use') return null;
          const { result, state: newState } = await executeTool(
            block.name, block.input as Record<string, unknown>, currentState
          );
          // read_inbox는 읽음 처리로 state를 변경하므로 반영
          if (block.name === 'read_inbox') currentState = newState;
          return { block, result };
        })
      );
      for (const r of readResults) {
        if (!r) continue;
        actions.push({ tool: r.block.name, input: r.block.input as Record<string, unknown>, result: r.result });
        toolResults.push({ type: 'tool_result', tool_use_id: r.block.id, content: r.result });
        toolCallCount++;
      }
    }

    // 상태 변경 도구: 순차 실행 (send_email은 Haiku 호출 포함)
    for (const block of mutatingBlocks) {
      if (block.type === 'tool_use') {
        const { result, state: newState } = await executeTool(
          block.name, block.input as Record<string, unknown>, currentState
        );
        currentState = newState;
        actions.push({ tool: block.name, input: block.input as Record<string, unknown>, result });
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
        toolCallCount++;
      }
    }

    messages.push({ role: 'user', content: toolResults });
  }

  currentState.conversationHistory = [
    ...currentState.conversationHistory,
    { role: 'user', content: morningReport },
    { role: 'assistant', content: thinking || '(no response)' },
  ];
  if (currentState.conversationHistory.length > 20) {
    currentState.conversationHistory = currentState.conversationHistory.slice(-20);
  }

  return { state: currentState, thinking, actions };
}
