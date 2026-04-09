# LangChain Multi-Vendor LLM Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace direct Anthropic SDK calls with LangChain to support OpenAI, Anthropic, and Gemini as selectable LLM vendors.

**Architecture:** Create a thin LLM factory module (`llm.ts`) that returns LangChain `BaseChatModel` instances per vendor. All 6 existing Anthropic SDK call sites (main agent, weather, 2x market events, supplier decision) are refactored to use LangChain message types and `.invoke()`. The main agent tool-use loop is rebuilt using LangChain's `bindTools()` + manual loop (not AgentExecutor, to preserve parallel read-only / sequential mutating execution).

**Tech Stack:** `@langchain/core`, `@langchain/anthropic`, `@langchain/openai`, `@langchain/google-genai`, `zod`

**Helper model mapping by vendor:**
| Vendor | Main Agent Model | Helper (Small) Model |
|--------|-----------------|---------------------|
| Anthropic | user-selected (e.g. claude-sonnet-4) | `claude-haiku-4-5-20251001` |
| OpenAI | user-selected (e.g. gpt-4o) | `gpt-5.4-nano` |
| Gemini | user-selected (e.g. gemini-2.5-pro) | `gemini-3.1-flash-lite` |

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/simulation/llm.ts` | **Create** | LLM factory: `createMainModel()`, `createHelperModel()`, vendor/apiKey config, helper model mapping |
| `src/simulation/market.ts` | **Modify** | Replace `new Anthropic()` with LangChain helper model |
| `src/simulation/market-events.ts` | **Modify** | Replace 2x `new Anthropic()` with LangChain helper model |
| `src/simulation/suppliers.ts` | **Modify** | Replace `new Anthropic()` in `getSupplierDecision` with LangChain helper model |
| `src/simulation/agent.ts` | **Modify** | Replace main agent loop with LangChain `bindTools()` + manual loop, replace Anthropic tool types with zod-based LangChain tools |
| `src/simulation/engine.ts` | **Modify** | Pass `vendor` (instead of just `apiKey`) to all sub-functions |
| `src/simulation/types.ts` | **Modify** | Remove unused Anthropic-specific types if any |
| `package.json` | **Modify** | Add LangChain dependencies |

---

### Task 1: Install LangChain Dependencies

**Files:**
- Modify: `web/package.json`

- [ ] **Step 1: Install packages**

```bash
cd web && npm install @langchain/core @langchain/anthropic @langchain/openai @langchain/google-genai zod
```

- [ ] **Step 2: Verify install**

Run: `cd web && npx tsc --noEmit`
Expected: No new errors (existing code unchanged)

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add LangChain dependencies for multi-vendor LLM support"
```

---

### Task 2: Create LLM Factory Module

**Files:**
- Create: `src/simulation/llm.ts`

- [ ] **Step 1: Create `llm.ts`**

```typescript
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { LlmVendor } from './types';

const HELPER_MODELS: Record<LlmVendor, string> = {
  anthropic: 'claude-haiku-4-5-20251001',
  openai: 'gpt-5.4-nano',
  gemini: 'gemini-3.1-flash-lite',
};

export function createMainModel(
  vendor: LlmVendor,
  apiKey: string,
  model: string,
  maxTokens: number = 1024
): BaseChatModel {
  switch (vendor) {
    case 'anthropic':
      return new ChatAnthropic({ apiKey, model, maxTokens });
    case 'openai':
      return new ChatOpenAI({ apiKey, model, maxTokens });
    case 'gemini':
      return new ChatGoogleGenerativeAI({ apiKey, model, maxOutputTokens: maxTokens });
  }
}

export function createHelperModel(
  vendor: LlmVendor,
  apiKey: string,
  maxTokens: number = 400
): BaseChatModel {
  const model = HELPER_MODELS[vendor];
  switch (vendor) {
    case 'anthropic':
      return new ChatAnthropic({ apiKey, model, maxTokens });
    case 'openai':
      return new ChatOpenAI({ apiKey, model, maxTokens });
    case 'gemini':
      return new ChatGoogleGenerativeAI({ apiKey, model, maxOutputTokens: maxTokens });
  }
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: PASS (no errors)

- [ ] **Step 3: Commit**

```bash
git add src/simulation/llm.ts
git commit -m "feat: add LLM factory module for multi-vendor support"
```

---

### Task 3: Refactor `market.ts` — Weather Generation

**Files:**
- Modify: `src/simulation/market.ts`

This is the simplest LLM call — single-turn, short output, enum parsing.

- [ ] **Step 1: Replace Anthropic import and HAIKU_MODEL constant**

Remove:
```typescript
import Anthropic from '@anthropic-ai/sdk';
// ...
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
```

Add:
```typescript
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { createHelperModel } from './llm';
import { LlmVendor } from './types';
```

- [ ] **Step 2: Update `generateMarketCondition` signature**

Change from:
```typescript
export async function generateMarketCondition(
  day: number,
  startDate: string,
  recentHistory?: MarketCondition[],
  apiKey?: string
): Promise<MarketCondition> {
```

To:
```typescript
export async function generateMarketCondition(
  day: number,
  startDate: string,
  recentHistory?: MarketCondition[],
  vendor: LlmVendor = 'anthropic',
  apiKey?: string
): Promise<MarketCondition> {
```

- [ ] **Step 3: Replace the LLM call inside the try block**

Replace:
```typescript
    const client = new Anthropic(apiKey ? { apiKey } : undefined);
    const response = await client.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 20,
      system: '날씨를 결정하는 시뮬레이터입니다. 반드시 sunny, cloudy, rainy, hot, cold 중 하나만 출력하세요. 다른 말은 하지 마세요. 현실적인 날씨 변화를 반영하되, 같은 날씨가 3일 이상 지속되면 변화를 줘야 합니다.',
      messages: [{
        role: 'user',
        content: `날짜: ${dateStr} (${dayOfWeek}), 계절: ${season}, 월: ${month}월${recentWeather ? `\n최근 날씨: ${recentWeather}\n같은 날씨가 계속되고 있다면 변화를 주세요.` : ''}\n\n오늘의 날씨는?`,
      }],
    });

    const text = (response.content[0].type === 'text' ? response.content[0].text : '')
      .trim().toLowerCase();
```

With:
```typescript
    const llm = createHelperModel(vendor, apiKey!, 20);
    const response = await llm.invoke([
      new SystemMessage('날씨를 결정하는 시뮬레이터입니다. 반드시 sunny, cloudy, rainy, hot, cold 중 하나만 출력하세요. 다른 말은 하지 마세요. 현실적인 날씨 변화를 반영하되, 같은 날씨가 3일 이상 지속되면 변화를 줘야 합니다.'),
      new HumanMessage(`날짜: ${dateStr} (${dayOfWeek}), 계절: ${season}, 월: ${month}월${recentWeather ? `\n최근 날씨: ${recentWeather}\n같은 날씨가 계속되고 있다면 변화를 주세요.` : ''}\n\n오늘의 날씨는?`),
    ]);

    const text = (typeof response.content === 'string' ? response.content : '')
      .trim().toLowerCase();
```

- [ ] **Step 4: Verify compilation**

Run: `npx tsc --noEmit`
Expected: Errors in `engine.ts` because `generateMarketCondition` now requires `vendor` param — that's expected, will fix in Task 7.

- [ ] **Step 5: Commit**

```bash
git add src/simulation/market.ts
git commit -m "refactor: migrate market.ts weather generation to LangChain"
```

---

### Task 4: Refactor `market-events.ts` — Event Generation

**Files:**
- Modify: `src/simulation/market-events.ts`

Two LLM calls (public + hidden events), both single-turn with JSON output parsing.

- [ ] **Step 1: Replace imports**

Remove:
```typescript
import Anthropic from '@anthropic-ai/sdk';
// ...
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
```

Add:
```typescript
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { createHelperModel } from './llm';
import { LlmVendor } from './types';
```

- [ ] **Step 2: Update `generatePublicEvent` signature and LLM call**

Change signature to:
```typescript
async function generatePublicEvent(
  day: number,
  season: string,
  recentEvents: MarketEvent[],
  vendor: LlmVendor = 'anthropic',
  apiKey?: string
): Promise<MarketEvent> {
```

Replace the LLM call block:
```typescript
    const llm = createHelperModel(vendor, apiKey!, 400);
    const response = await llm.invoke([
      new SystemMessage(`당신은 자판기 사업과 관련된 시장 뉴스를 생성하는 시뮬레이터입니다.
현실적이고 자판기 운영에 영향을 줄 수 있는 뉴스를 만드세요.

예시 주제: 음료 트렌드 변화, 원자재 가격 변동, 소비자 선호도 변화, 날씨/계절 이벤트,
대형 행사(축제/시험기간), 경기 변동, 건강 트렌드, 신제품 출시, 물류 파업 등

반드시 아래 JSON 형식으로만 응답:
{
  "headline": "헤드라인 (15자 이내)",
  "subheadline": "서브헤드라인 (25자 이내)",
  "body": "본문 1문단 (2-3문장)",
  "effects": {
    "demandMultiplier": {"beverage": 1.0, "snack": 1.0, "other": 1.0},
    "customerTraffic": 1.0,
    "deliveryDelayGlobal": 0,
    "priceShift": {"beverage": 0, "snack": 0, "other": 0}
  }
}

effects 범위:
- demandMultiplier: 0.5~2.0 (카테고리별 수요 변화)
- customerTraffic: 0.5~1.5 (전체 유동인구)
- deliveryDelayGlobal: 0~2 (전체 배송 지연일)
- priceShift: -0.2~0.3 (도매가 변동률, 예: 0.1이면 10% 상승)`),
      new HumanMessage(`${day}일차, 계절: ${season}${recentHeadlines ? `\n최근 뉴스: ${recentHeadlines}\n(이전과 다른 주제로 생성)` : ''}`),
    ]);

    const text = typeof response.content === 'string' ? response.content : '';
```

(Keep the JSON parsing logic after `text` identical.)

- [ ] **Step 3: Update `generateHiddenEvent` the same way**

Change signature to:
```typescript
async function generateHiddenEvent(
  day: number,
  season: string,
  recentEvents: MarketEvent[],
  vendor: LlmVendor = 'anthropic',
  apiKey?: string
): Promise<MarketEvent> {
```

Replace LLM call:
```typescript
    const llm = createHelperModel(vendor, apiKey!, 400);
    const response = await llm.invoke([
      new SystemMessage(`당신은 자판기 사업 환경에 영향을 미치는 숨겨진 시장 변동을 생성합니다.
이것들은 에이전트에게 직접 보이지 않지만 판매량, 배송, 가격에 영향을 줍니다.
에이전트는 결과를 관찰하면서 간접적으로 파악해야 합니다.

예시: 근처 공사로 유동인구 감소, SNS에서 특정 음료 바이럴,
운송업체 내부 문제, 원자재 공급망 변동, 경쟁 자판기 설치/철거,
동네 행사, 학교 시험기간, 날씨 예보 오류 등

반드시 아래 JSON 형식으로만 응답:
{
  "headline": "헤드라인 (15자 이내)",
  "subheadline": "서브헤드라인 (25자 이내)",
  "body": "본문 1문단 (2-3문장)",
  "effects": {
    "demandMultiplier": {"beverage": 1.0, "snack": 1.0, "other": 1.0},
    "customerTraffic": 1.0,
    "deliveryDelayGlobal": 0,
    "priceShift": {"beverage": 0, "snack": 0, "other": 0}
  }
}

효과는 미묘하되 의미 있게 (수요 0.7~1.4, 유동인구 0.7~1.3 범위)`),
      new HumanMessage(`${day}일차, 계절: ${season}${recentHidden ? `\n최근 숨겨진 이벤트: ${recentHidden}\n(다른 주제로)` : ''}`),
    ]);

    const text = typeof response.content === 'string' ? response.content : '';
```

- [ ] **Step 4: Update `updateMarketEvents` to pass `vendor`**

Change signature:
```typescript
export async function updateMarketEvents(
  currentEvents: MarketEvent[],
  day: number,
  season: string,
  vendor: LlmVendor = 'anthropic',
  apiKey?: string
): Promise<MarketEvent[]> {
```

Update calls:
```typescript
  if (needPublic) promises.push(generatePublicEvent(day, season, events, vendor, apiKey));
  if (needHidden) promises.push(generateHiddenEvent(day, season, events, vendor, apiKey));
```

- [ ] **Step 5: Verify compilation and commit**

Run: `npx tsc --noEmit` (engine.ts errors expected until Task 7)

```bash
git add src/simulation/market-events.ts
git commit -m "refactor: migrate market-events.ts to LangChain"
```

---

### Task 5: Refactor `suppliers.ts` — Supplier Decision

**Files:**
- Modify: `src/simulation/suppliers.ts`

Multi-turn conversation with role reversal. The LLM plays the supplier (assistant), agent emails are user messages.

- [ ] **Step 1: Update imports**

Add at the top of the file:
```typescript
import { SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { BaseMessage } from '@langchain/core/messages';
import { createHelperModel } from './llm';
import { LlmVendor } from './types';
```

Remove `Anthropic` import (check if it's used elsewhere in the file — it should only be in `getSupplierDecision`):
```typescript
// Remove: import Anthropic from '@anthropic-ai/sdk';
```

Also remove the `HAIKU_MODEL` constant if present.

- [ ] **Step 2: Update `getSupplierDecision` signature**

```typescript
async function getSupplierDecision(
  supplier: Supplier,
  supplierState: SupplierState,
  agentEmail: Email,
  agentBalance: number,
  currentDay: number,
  emailHistory: Email[],
  vendor: LlmVendor = 'anthropic',
  apiKey?: string
): Promise<SupplierDecision> {
```

- [ ] **Step 3: Replace message building and LLM call**

Replace the entire message building + API call block. The Anthropic-specific message merging becomes LangChain messages:

```typescript
    // Build conversation history using LangChain message types
    const recentHistory = emailHistory.slice(-10);
    const conversationMessages: BaseMessage[] = [];

    for (const email of recentHistory) {
      if (email.type === 'received' && email.from === supplier.email) {
        // Supplier's previous reply → AIMessage (supplier is the LLM)
        conversationMessages.push(
          new AIMessage(`[이전에 내가 보낸 답장]\n제목: ${email.subject}\n\n${email.body}`)
        );
      } else if (email.type === 'sent' && email.to === supplier.email) {
        // Agent's email → HumanMessage (agent is the "user" talking to supplier)
        conversationMessages.push(
          new HumanMessage(`[고객 이메일]\n제목: ${email.subject}\n\n${email.body}`)
        );
      }
    }

    // Merge consecutive same-role messages (API constraint for some providers)
    const mergedMessages: BaseMessage[] = [];
    for (const msg of conversationMessages) {
      if (
        mergedMessages.length > 0 &&
        mergedMessages[mergedMessages.length - 1].constructor === msg.constructor
      ) {
        const prev = mergedMessages[mergedMessages.length - 1];
        mergedMessages[mergedMessages.length - 1] = new (msg.constructor as new (content: string) => BaseMessage)(
          prev.content + '\n\n---\n\n' + msg.content
        );
      } else {
        mergedMessages.push(msg);
      }
    }

    // Ensure last message is HumanMessage (current email from agent)
    const currentEmailMsg = `고객으로부터 새 이메일이 왔습니다. 이전 대화 맥락을 고려해서 당신답게 대응하세요.\n\n제목: ${agentEmail.subject}\n\n${agentEmail.body}`;
    if (mergedMessages.length === 0 || !(mergedMessages[mergedMessages.length - 1] instanceof HumanMessage)) {
      mergedMessages.push(new HumanMessage(currentEmailMsg));
    } else {
      mergedMessages[mergedMessages.length - 1] = new HumanMessage(currentEmailMsg);
    }

    // Ensure starts with HumanMessage
    if (mergedMessages.length > 0 && !(mergedMessages[0] instanceof HumanMessage)) {
      mergedMessages.unshift(new HumanMessage('[대화 시작]'));
    }

    const llm = createHelperModel(vendor, apiKey!, 4000);
    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      ...mergedMessages,
    ]);

    const text = typeof response.content === 'string' ? response.content : '';
    const decision = parseSupplierResponse(text, supplier);
    return decision;
```

- [ ] **Step 4: Update `processAgentEmail` to pass `vendor`**

Change signature:
```typescript
export async function processAgentEmail(
  agentEmail: Email,
  currentDay: number,
  balance: number,
  supplierStates: Record<string, SupplierState>,
  suppliers: Supplier[],
  allEmails: Email[],
  vendor: LlmVendor = 'anthropic',
  apiKey?: string
): Promise<{
```

Update the call to `getSupplierDecision`:
```typescript
  const decision = await getSupplierDecision(supplier, sState, agentEmail, balance, currentDay, supplierEmailHistory, vendor, apiKey);
```

- [ ] **Step 5: Verify compilation and commit**

Run: `npx tsc --noEmit`

```bash
git add src/simulation/suppliers.ts
git commit -m "refactor: migrate suppliers.ts to LangChain"
```

---

### Task 6: Refactor `agent.ts` — Main Agent Tool-Use Loop

**Files:**
- Modify: `src/simulation/agent.ts`

This is the most complex refactor. The main agent uses tool calling with a manual loop. We replace Anthropic tool definitions with LangChain tools, and the loop with LangChain message types + `bindTools()`.

- [ ] **Step 1: Update imports**

Remove:
```typescript
import Anthropic from '@anthropic-ai/sdk';
```

Add:
```typescript
import { SystemMessage, HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
import { BaseMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { createMainModel } from './llm';
import { LlmVendor } from './types';
```

- [ ] **Step 2: Replace Anthropic tool definitions with LangChain tools**

Remove the entire `const TOOLS: Anthropic.Tool[] = [...]` block (lines 69-142).

The tools in this agent are **not self-executing** — they modify simulation state that lives outside the tool. So we define them as schema-only tools for `bindTools()`, and keep the separate `executeTool()` function for actual execution.

Create a helper to get the tool schemas for `bindTools()`:

```typescript
// Tool schemas for bindTools() — execution is handled separately via executeTool()
function getToolSchemas() {
  return [
    {
      name: 'check_balance',
      description: '현재 보유 현금과 자판기 내 미수거 현금을 확인합니다',
      schema: z.object({}),
    },
    {
      name: 'get_machine_inventory',
      description: '자판기 재고 현황을 확인합니다 (12슬롯의 상품명, 수량, 가격)',
      schema: z.object({}),
    },
    {
      name: 'get_storage_inventory',
      description: '창고에 보관 중인 상품을 확인합니다 (자판기에 넣을 수 있는 재고)',
      schema: z.object({}),
    },
    {
      name: 'send_email',
      description: '이메일을 보냅니다. 공급업체에 상품 문의나 주문을 할 때 사용합니다. 주문 시 본문에 상품명과 수량을 명확히 적으세요.',
      schema: z.object({
        to: z.string().describe('수신자 이메일 주소 (예: sales@freshdrinks.com)'),
        subject: z.string().describe('이메일 제목'),
        body: z.string().describe('이메일 본문'),
      }),
    },
    {
      name: 'read_inbox',
      description: '수신함을 확인합니다. 공급업체 답장, 주문 확인, 배송 알림 등을 확인할 수 있습니다.',
      schema: z.object({
        unread_only: z.boolean().optional().describe('읽지 않은 메일만 표시 (기본: true)'),
      }),
    },
    {
      name: 'stock_machine',
      description: '창고의 상품을 자판기 특정 슬롯에 넣습니다. 0-1행은 소형, 2-3행은 대형 상품용입니다.',
      schema: z.object({
        productName: z.string().describe('넣을 상품명'),
        row: z.number().describe('행 (0-3). 0-1행 소형, 2-3행 대형.'),
        col: z.number().describe('열 (0-2)'),
        quantity: z.number().describe('넣을 수량'),
        price: z.number().describe('소비자 판매가 (예: 1.50)'),
      }),
    },
    {
      name: 'set_price',
      description: '특정 슬롯의 상품 가격을 변경합니다',
      schema: z.object({
        row: z.number().describe('행 (0-3)'),
        col: z.number().describe('열 (0-2)'),
        price: z.number().describe('새 판매가'),
      }),
    },
    {
      name: 'collect_cash',
      description: '자판기에 쌓인 판매 수익금을 모두 수거합니다',
      schema: z.object({}),
    },
  ].map(t => tool(async () => '', { name: t.name, description: t.description, schema: t.schema }));
}
```

- [ ] **Step 3: Update `executeTool` — add `vendor` parameter**

Change signature:
```typescript
async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  state: SimulationState,
  vendor: LlmVendor = 'anthropic',
  apiKey?: string
): Promise<{ result: string; state: SimulationState }> {
```

In the `send_email` case, update `processAgentEmail` call:
```typescript
      const { replyEmail, order, newBalance, updatedSupplierStates } = await processAgentEmail(
        sentEmail, state.day, newState.balance, newState.supplierStates, state.suppliers, newState.emails, vendor, apiKey
      );
```

- [ ] **Step 4: Rewrite `runAgentTurn` with LangChain loop**

```typescript
export async function runAgentTurn(
  state: SimulationState,
  morningReport: string,
  model: string,
  agentPrompt: string,
  vendor: LlmVendor = 'anthropic',
  apiKey?: string
): Promise<{ state: SimulationState; thinking: string; actions: AgentAction[] }> {
  const llm = createMainModel(vendor, apiKey!, model);
  const tools = getToolSchemas();
  const modelWithTools = llm.bindTools(tools);

  const actions: AgentAction[] = [];
  let thinking = '';
  let currentState = { ...state };
  const systemPrompt = buildSystemPrompt(agentPrompt, state.suppliers);

  // Build messages from conversation history
  const recentHistory = currentState.conversationHistory.slice(-6);
  const messages: BaseMessage[] = [
    new SystemMessage(systemPrompt),
    ...recentHistory.map(m =>
      m.role === 'user'
        ? new HumanMessage(typeof m.content === 'string' ? m.content : JSON.stringify(m.content))
        : new AIMessage(typeof m.content === 'string' ? m.content : JSON.stringify(m.content))
    ),
    new HumanMessage(morningReport),
  ];

  const READ_ONLY_TOOLS = new Set(['check_balance', 'get_machine_inventory', 'get_storage_inventory', 'read_inbox']);
  const MAX_TOOL_CALLS = 8;
  let toolCallCount = 0;

  while (toolCallCount < MAX_TOOL_CALLS) {
    const response = await modelWithTools.invoke(messages);

    // Extract thinking text
    if (typeof response.content === 'string' && response.content) {
      thinking += (thinking ? '\n' : '') + response.content;
    } else if (Array.isArray(response.content)) {
      for (const block of response.content) {
        if (typeof block === 'string') {
          thinking += (thinking ? '\n' : '') + block;
        } else if (typeof block === 'object' && 'text' in block && block.type === 'text') {
          thinking += (thinking ? '\n' : '') + block.text;
        }
      }
    }

    // Check for tool calls
    const toolCalls = response.tool_calls || [];
    if (toolCalls.length === 0) {
      messages.push(response);
      break;
    }

    messages.push(response);

    // Separate read-only vs mutating tool calls
    const readOnlyCalls = toolCalls.filter(tc => READ_ONLY_TOOLS.has(tc.name));
    const mutatingCalls = toolCalls.filter(tc => !READ_ONLY_TOOLS.has(tc.name));

    // Read-only: parallel execution
    if (readOnlyCalls.length > 0) {
      const readResults = await Promise.all(
        readOnlyCalls.map(async (tc) => {
          const { result, state: newState } = await executeTool(
            tc.name, tc.args as Record<string, unknown>, currentState, vendor, apiKey
          );
          if (tc.name === 'read_inbox') currentState = newState;
          return { tc, result };
        })
      );
      for (const r of readResults) {
        actions.push({ tool: r.tc.name, input: r.tc.args as Record<string, unknown>, result: r.result });
        messages.push(new ToolMessage({ content: r.result, tool_call_id: r.tc.id! }));
        toolCallCount++;
      }
    }

    // Mutating: sequential execution
    for (const tc of mutatingCalls) {
      const { result, state: newState } = await executeTool(
        tc.name, tc.args as Record<string, unknown>, currentState, vendor, apiKey
      );
      currentState = newState;
      actions.push({ tool: tc.name, input: tc.args as Record<string, unknown>, result });
      messages.push(new ToolMessage({ content: result, tool_call_id: tc.id! }));
      toolCallCount++;
    }
  }

  // Update conversation history (simplified to strings)
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
```

- [ ] **Step 5: Verify compilation**

Run: `npx tsc --noEmit`
Expected: Errors in `engine.ts` (signature mismatch) — fixed in next task.

- [ ] **Step 6: Commit**

```bash
git add src/simulation/agent.ts
git commit -m "refactor: migrate agent.ts main loop to LangChain with multi-vendor tool calling"
```

---

### Task 7: Update `engine.ts` — Thread `vendor` Through All Calls

**Files:**
- Modify: `src/simulation/engine.ts`

- [ ] **Step 1: Update import**

Add `LlmVendor` import (already present from earlier work, verify).

- [ ] **Step 2: Update `executeTurn` call sites**

The function signature already has `vendor` and `apiKey` params. Update the internal calls to pass `vendor`:

```typescript
  const [market, updatedMarketEvents] = await Promise.all([
    generateMarketCondition(currentState.day, currentState.startDate, recentMarkets, vendor, apiKey),
    updateMarketEvents(currentState.marketEvents, currentState.day, currentSeason, vendor, apiKey),
  ]);
```

And the agent call:
```typescript
  const agentResult = await runAgentTurn(currentState, morningReport, model, agentPrompt, vendor, apiKey);
```

- [ ] **Step 3: Verify full compilation**

Run: `npx tsc --noEmit`
Expected: PASS (all signatures now aligned)

- [ ] **Step 4: Commit**

```bash
git add src/simulation/engine.ts
git commit -m "refactor: thread vendor param through engine to all LLM call sites"
```

---

### Task 8: Clean Up — Remove Direct Anthropic SDK Dependency from Simulation

**Files:**
- Modify: `src/simulation/agent.ts` (verify no `Anthropic` import remains)
- Modify: `src/simulation/market.ts` (verify no `Anthropic` import remains)
- Modify: `src/simulation/market-events.ts` (verify no `Anthropic` import remains)
- Modify: `src/simulation/suppliers.ts` (verify no `Anthropic` import remains)

- [ ] **Step 1: Verify no direct Anthropic SDK imports remain in simulation files**

Run:
```bash
grep -r "from '@anthropic-ai/sdk'" src/simulation/
```

Expected: No matches. Only `llm.ts` should import `@langchain/anthropic` (which wraps the SDK internally).

If any remain, remove them.

- [ ] **Step 2: Run full build**

Run: `npx next build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove direct Anthropic SDK imports from simulation modules"
```

---

### Task 9: End-to-End Smoke Test

**Files:** None (manual verification)

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test Anthropic flow**

1. Open browser to http://localhost:3000
2. Select "Anthropic" vendor
3. Enter a valid Anthropic API key
4. Verify model list loads dynamically
5. Start a 15-day simulation
6. Run 1-2 turns — verify agent thinks, uses tools, emails work

- [ ] **Step 3: Test OpenAI flow**

1. Select "OpenAI" vendor
2. Enter a valid OpenAI API key
3. Verify hardcoded model list appears (gpt-4o, gpt-4o-mini, etc.)
4. Start simulation
5. Run 1-2 turns — verify agent works with OpenAI

- [ ] **Step 4: Test Gemini flow**

1. Select "Google" vendor
2. Enter a valid Gemini API key
3. Verify hardcoded model list appears
4. Start simulation
5. Run 1-2 turns — verify agent works with Gemini

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: LangChain multi-vendor LLM integration complete (Anthropic, OpenAI, Gemini)"
```
