import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { createHelperModel } from './llm';
import { MarketEvent, MarketEventEffects, LlmVendor } from './types';

// ============================================================
// 공개 이벤트 (7일마다) - UI에 신문처럼 표시
// ============================================================

async function generatePublicEvent(
  day: number,
  season: string,
  recentEvents: MarketEvent[],
  vendor: LlmVendor = 'anthropic',
  apiKey?: string,
  dateStr?: string,
  weather?: string,
  warnings?: string[]
): Promise<MarketEvent> {
  const recentHeadlines = recentEvents
    .filter(e => e.visible)
    .slice(-3)
    .map(e => e.headline)
    .join(', ');

  try {
    const llm = createHelperModel(vendor, apiKey!, 400);
    const response = await llm.invoke([
      new SystemMessage(`당신은 자판기 사업과 관련된 시장 뉴스를 생성하는 시뮬레이터입니다.
현실적이고 자판기 운영에 영향을 줄 수 있는 뉴스를 만드세요.

예시 주제: 음료 트렌드 변화, 원자재 가격 변동, 소비자 선호도 변화, 날씨/계절 이벤트,
대형 행사(축제/시험기간), 경기 변동, 건강 트렌드, 신제품 출시, 물류 파업 등

## 출력 규칙 (엄격)
- **오직 JSON 객체 하나만** 출력. 앞뒤로 텍스트·머릿말·설명·맺음말 금지.
- 마크다운 코드블록(\`\`\`json, \`\`\`) **절대 금지**. 괄호 \`{\`로 시작, \`}\`로 끝.
- JSON 내부 주석(//, /* */) 금지. 값은 모두 큰따옴표 문자열 또는 숫자.
- 아래 형식에서 키 이름·구조 일체 변경 금지. 모든 키를 포함해서 출력.
- 응답이 위 규칙을 어기면 파싱 실패로 간주되어 유저에게 경고가 표시됩니다.

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
      new HumanMessage(`${day}일차, 날짜: ${dateStr || '미정'}, 계절: ${season}, 날씨: ${weather || '미정'}${recentHeadlines ? `\n최근 뉴스: ${recentHeadlines}\n(이전과 다른 주제로 생성하되, 현재 날짜와 계절, 날씨를 반영하세요)` : '\n현재 날짜와 계절, 날씨에 맞는 뉴스를 생성하세요.'}\n\nJSON 객체 하나만 출력하세요.`),
    ]);

    const text = typeof response.content === 'string' ? response.content : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      warnings?.push(`공개 이벤트 LLM 응답에서 JSON을 찾지 못해 폴백 사용 (원본: "${text.slice(0, 120)}")`);
      return fallbackPublicEvent(day);
    }
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        id: `PUB-${day}-${Math.random().toString(36).slice(2, 6)}`,
        day,
        headline: parsed.headline || '시장 동향',
        subheadline: parsed.subheadline || '',
        body: parsed.body || '',
        visible: true,
        effects: clampEffects(parsed.effects || {}),
        expiresDay: day + 7,
      };
    } catch (parseErr) {
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      warnings?.push(`공개 이벤트 JSON 파싱 실패 → 폴백 사용 (${msg.slice(0, 80)})`);
      return fallbackPublicEvent(day);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn('Public event generation failed:', msg);
    warnings?.push(`공개 이벤트 LLM 호출 실패 → 폴백 사용 (${msg.slice(0, 100)})`);
  }

  return fallbackPublicEvent(day);
}

// ============================================================
// 숨겨진 이벤트 (3일마다) - UI에 표시 안 됨
// ============================================================

async function generateHiddenEvent(
  day: number,
  season: string,
  recentEvents: MarketEvent[],
  vendor: LlmVendor = 'anthropic',
  apiKey?: string,
  dateStr?: string,
  weather?: string,
  warnings?: string[]
): Promise<MarketEvent> {
  const recentHidden = recentEvents
    .filter(e => !e.visible)
    .slice(-2)
    .map(e => e.headline)
    .join(', ');

  try {
    const llm = createHelperModel(vendor, apiKey!, 400);
    const response = await llm.invoke([
      new SystemMessage(`당신은 자판기 사업 환경에 영향을 미치는 숨겨진 시장 변동을 생성합니다.
이것들은 에이전트에게 직접 보이지 않지만 판매량, 배송, 가격에 영향을 줍니다.
에이전트는 결과를 관찰하면서 간접적으로 파악해야 합니다.

예시: 근처 공사로 유동인구 감소, SNS에서 특정 음료 바이럴,
운송업체 내부 문제, 원자재 공급망 변동, 경쟁 자판기 설치/철거,
동네 행사, 학교 시험기간, 날씨 예보 오류 등

## 출력 규칙 (엄격)
- **오직 JSON 객체 하나만** 출력. 앞뒤로 텍스트·머릿말·설명·맺음말 금지.
- 마크다운 코드블록(\`\`\`json, \`\`\`) **절대 금지**. 괄호 \`{\`로 시작, \`}\`로 끝.
- JSON 내부 주석 금지. 값은 모두 큰따옴표 문자열 또는 숫자.
- 아래 형식에서 키 이름·구조 일체 변경 금지. 모든 키를 포함해서 출력.
- 응답이 위 규칙을 어기면 파싱 실패로 간주되어 유저에게 경고가 표시됩니다.

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
      new HumanMessage(`${day}일차, 날짜: ${dateStr || '미정'}, 계절: ${season}, 날씨: ${weather || '미정'}${recentHidden ? `\n최근 숨겨진 이벤트: ${recentHidden}\n(다른 주제로, 현재 날짜와 계절, 날씨를 반영하세요)` : '\n현재 날짜와 계절, 날씨에 맞는 이벤트를 생성하세요.'}\n\nJSON 객체 하나만 출력하세요.`),
    ]);

    const text = typeof response.content === 'string' ? response.content : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      warnings?.push(`숨겨진 이벤트 LLM 응답에서 JSON을 찾지 못해 폴백 사용 (원본: "${text.slice(0, 120)}")`);
      return fallbackHiddenEvent(day);
    }
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        id: `HID-${day}-${Math.random().toString(36).slice(2, 6)}`,
        day,
        headline: parsed.headline || '숨겨진 변동',
        subheadline: parsed.subheadline || '',
        body: parsed.body || '',
        visible: false,
        effects: clampEffects(parsed.effects || {}),
        expiresDay: day + 3,
      };
    } catch (parseErr) {
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      warnings?.push(`숨겨진 이벤트 JSON 파싱 실패 → 폴백 사용 (${msg.slice(0, 80)})`);
      return fallbackHiddenEvent(day);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn('Hidden event generation failed:', msg);
    warnings?.push(`숨겨진 이벤트 LLM 호출 실패 → 폴백 사용 (${msg.slice(0, 100)})`);
  }

  return fallbackHiddenEvent(day);
}

// ============================================================
// 효과 범위 제한
// ============================================================

function clampEffects(effects: MarketEventEffects): MarketEventEffects {
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  const result: MarketEventEffects = {};

  if (effects.demandMultiplier) {
    result.demandMultiplier = {};
    for (const [k, v] of Object.entries(effects.demandMultiplier)) {
      result.demandMultiplier[k] = clamp(v, 0.5, 2.0);
    }
  }
  if (effects.customerTraffic !== undefined) {
    result.customerTraffic = clamp(effects.customerTraffic, 0.5, 1.5);
  }
  if (effects.deliveryDelayGlobal !== undefined) {
    result.deliveryDelayGlobal = clamp(Math.round(effects.deliveryDelayGlobal), 0, 3);
  }
  if (effects.priceShift) {
    result.priceShift = {};
    for (const [k, v] of Object.entries(effects.priceShift)) {
      result.priceShift[k] = clamp(v, -0.2, 0.3);
    }
  }

  return result;
}

// ============================================================
// 폴백 이벤트
// ============================================================

function fallbackPublicEvent(day: number): MarketEvent {
  const events = [
    { headline: '음료 수요 증가세', subheadline: '여름 시즌 음료 판매량 상승', body: '기온 상승과 함께 음료 소비가 늘어나고 있다.', effects: { demandMultiplier: { beverage: 1.2 } } },
    { headline: '스낵 시장 안정', subheadline: '전반적으로 큰 변동 없는 상황', body: '스낵 시장은 안정적인 수요를 유지하고 있다.', effects: {} },
    { headline: '물류비 상승', subheadline: '운송 비용 인상 여파', body: '유류비 인상으로 배송이 지연되고 도매가가 소폭 상승했다.', effects: { deliveryDelayGlobal: 1, priceShift: { beverage: 0.05, snack: 0.05 } } },
  ];
  const e = events[day % events.length];
  return { id: `PUB-${day}-fb`, day, ...e, visible: true, expiresDay: day + 7 };
}

function fallbackHiddenEvent(day: number): MarketEvent {
  const events = [
    { headline: '근처 행사 개최', subheadline: '유동인구 소폭 증가', body: '인근 지역 행사로 유동인구가 증가했다.', effects: { customerTraffic: 1.15 } },
    { headline: 'SNS 바이럴', subheadline: '특정 음료 인기 급상승', body: 'SNS에서 에너지 드링크가 화제가 되면서 수요가 늘었다.', effects: { demandMultiplier: { beverage: 1.3 } } },
    { headline: '경쟁 자판기 등장', subheadline: '근처에 새 자판기 설치', body: '근처에 경쟁 자판기가 설치되어 유동인구가 분산되었다.', effects: { customerTraffic: 0.85 } },
  ];
  const e = events[day % events.length];
  return { id: `HID-${day}-fb`, day, ...e, visible: false, expiresDay: day + 3 };
}

// ============================================================
// 메인: 이벤트 갱신 체크 + 활성 이벤트 효과 합산
// ============================================================

export async function updateMarketEvents(
  currentEvents: MarketEvent[],
  day: number,
  season: string,
  vendor: LlmVendor = 'anthropic',
  apiKey?: string,
  dateStr?: string,
  weather?: string,
  warnings?: string[]
): Promise<MarketEvent[]> {
  // 만료된 이벤트 제거
  const events = currentEvents.filter(e => e.expiresDay > day);

  const needPublic = day === 1 || day % 7 === 1;
  const needHidden = day === 1 || day % 3 === 1;

  if (!needPublic && !needHidden) return events;

  // 공개 이벤트: 1개 60%, 2개 35%, 3개 5%
  const promises: Promise<MarketEvent>[] = [];
  if (needPublic) {
    const roll = Math.random();
    const publicCount = roll < 0.60 ? 1 : roll < 0.95 ? 2 : 3;
    for (let i = 0; i < publicCount; i++) {
      promises.push(generatePublicEvent(day, season, events, vendor, apiKey, dateStr, weather, warnings));
    }
  }
  if (needHidden) promises.push(generateHiddenEvent(day, season, events, vendor, apiKey, dateStr, weather, warnings));

  const newEvents = await Promise.all(promises);
  return [...events, ...newEvents];
}

// 활성 이벤트들의 효과를 합산
export function aggregateEventEffects(events: MarketEvent[]): MarketEventEffects {
  const result: MarketEventEffects = {
    demandMultiplier: {},
    customerTraffic: 1.0,
    deliveryDelayGlobal: 0,
    priceShift: {},
  };

  for (const event of events) {
    const e = event.effects;

    // 수요 배수: 곱셈 합산
    if (e.demandMultiplier) {
      for (const [cat, mult] of Object.entries(e.demandMultiplier)) {
        result.demandMultiplier![cat] = (result.demandMultiplier![cat] || 1.0) * mult;
      }
    }

    // 고객 유동: 곱셈 합산
    if (e.customerTraffic !== undefined) {
      result.customerTraffic! *= e.customerTraffic;
    }

    // 배송 지연: 최대값
    if (e.deliveryDelayGlobal !== undefined) {
      result.deliveryDelayGlobal = Math.max(result.deliveryDelayGlobal!, e.deliveryDelayGlobal);
    }

    // 가격 변동: 가산
    if (e.priceShift) {
      for (const [cat, shift] of Object.entries(e.priceShift)) {
        result.priceShift![cat] = (result.priceShift![cat] || 0) + shift;
      }
    }
  }

  return result;
}
