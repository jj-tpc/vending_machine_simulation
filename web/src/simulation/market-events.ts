import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { createHelperModel } from './llm';
import { MarketEvent, MarketEventEffects, LlmVendor, DifficultyConfig } from './types';
import { DIFFICULTY_CONFIGS } from './difficulty';

// 난이도 톤에 따른 LLM 프롬프트 가이드
const TONE_GUIDE: Record<DifficultyConfig['eventTone'], string> = {
  positive: '긍정적·기회 중심 뉴스를 우선 생성하세요. 수요 증가, 호재, 인기 상승 등 사업에 유리한 소재.',
  neutral: '긍정·부정·중립을 고르게 섞어 현실적으로 생성하세요.',
  negative: '사업 환경에 압박을 주는 부정적·도전적 소재를 우선 생성하세요. 원자재 인상, 물류 차질, 수요 부진, 경쟁 심화, 경기 침체 등.',
};

// Crisis 이벤트 프롬프트 — 극단 부정, 즉시 효과 가능
const CRISIS_PROMPT = `이번에는 CRISIS(위기) 등급 이벤트입니다. 자판기 사업에 **심각한 타격**을 주는 급성 위기 상황을 생성하세요.
예: 대규모 정전, 물류 파업 장기화, 지역 경기 급냉, 주요 공급망 붕괴, 대형 공사 장기 봉쇄, 절도 사건, 자판기 파손.
수요·유동인구는 현저히 감소(0.3~0.6), 또는 도매가·배송 지연이 크게 상승. 본문에서 위기임을 명시.

## 즉시 효과(선택) — instantEffects
사건의 성격에 맞을 때 JSON에 instantEffects를 함께 출력할 수 있습니다. 이벤트 활성화 시점에 1회만 적용됨:
- stockLoss: 재고 손실 (절도·변질·화재·파손)
  형식: { "target": "storage" | "machine" | "both", "categoryFilter": "beverage" | "snack" | "other" | "all", "percentage": 0.1~0.35, "reason": "사유" }
  또는 fixedUnits 사용: { ..., "fixedUnits": 5~25, "reason": "..." }
- oneTimeFee: 즉시 비용 차감 (수리비·과태료·긴급검사)
  형식: { "amount": 20~150, "reason": "사유" }

## 지속 제약(선택) — durationConstraints
이벤트 활성 기간 동안 매 턴 적용되는 구조적 제약. **최대 3일간만 활성**(구현체가 expiresDay 제한):
- deliveryFreeze: true — 배송 동결 (물류 파업·재난·봉쇄 시나리오)
- damagedSlots: [{"row":0,"col":1}, ...] — 고장 슬롯 판매 불가 (자판기 파손·정전)
- dailySalesCap: 3~15 — 일일 총 판매 상한 (배급제·긴급조치)

durationConstraints를 설정하면 expiresDay는 자동으로 짧게 조정됩니다. 사건 성격에 맞는 경우에만 사용.

예시:
"durationConstraints": { "deliveryFreeze": true }
"durationConstraints": { "damagedSlots": [{"row":0,"col":1},{"row":2,"col":0}] }
"durationConstraints": { "dailySalesCap": 8 }`;

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
  warnings?: string[],
  config: DifficultyConfig = DIFFICULTY_CONFIGS.normal,
  isCrisis: boolean = false,
): Promise<MarketEvent> {
  const recentHeadlines = recentEvents
    .filter(e => e.visible)
    .slice(-3)
    .map(e => e.headline)
    .join(', ');

  const toneGuide = TONE_GUIDE[config.eventTone];
  const crisisGuide = isCrisis ? `\n\n${CRISIS_PROMPT}` : '';

  try {
    const llm = createHelperModel(vendor, apiKey!, 400);
    const response = await llm.invoke([
      new SystemMessage(`당신은 자판기 사업과 관련된 시장 뉴스를 생성하는 시뮬레이터입니다.
현실적이고 자판기 운영에 영향을 줄 수 있는 뉴스를 만드세요.

## 난이도 톤 가이드
${toneGuide}${crisisGuide}

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
      return fallbackPublicEvent(day, config, isCrisis);
    }
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const event: MarketEvent = {
        id: `PUB-${day}-${isCrisis ? 'CR-' : ''}${Math.random().toString(36).slice(2, 6)}`,
        day,
        headline: parsed.headline || '시장 동향',
        subheadline: parsed.subheadline || '',
        body: parsed.body || '',
        visible: true,
        effects: clampEffects(parsed.effects || {}, config),
        expiresDay: day + 7 + (isCrisis ? config.crisisDurationBonus : 0),
      };
      return capConstraintEventDuration(event, config);
    } catch (parseErr) {
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      warnings?.push(`공개 이벤트 JSON 파싱 실패 → 폴백 사용 (${msg.slice(0, 80)})`);
      return fallbackPublicEvent(day, config, isCrisis);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn('Public event generation failed:', msg);
    warnings?.push(`공개 이벤트 LLM 호출 실패 → 폴백 사용 (${msg.slice(0, 100)})`);
  }

  return fallbackPublicEvent(day, config, isCrisis);
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
  warnings?: string[],
  config: DifficultyConfig = DIFFICULTY_CONFIGS.normal,
  isCrisis: boolean = false,
): Promise<MarketEvent> {
  const recentHidden = recentEvents
    .filter(e => !e.visible)
    .slice(-2)
    .map(e => e.headline)
    .join(', ');

  const toneGuide = TONE_GUIDE[config.eventTone];
  const crisisGuide = isCrisis ? `\n\n${CRISIS_PROMPT}` : '';

  try {
    const llm = createHelperModel(vendor, apiKey!, 400);
    const response = await llm.invoke([
      new SystemMessage(`당신은 자판기 사업 환경에 영향을 미치는 숨겨진 시장 변동을 생성합니다.
이것들은 에이전트에게 직접 보이지 않지만 판매량, 배송, 가격에 영향을 줍니다.
에이전트는 결과를 관찰하면서 간접적으로 파악해야 합니다.

## 난이도 톤 가이드
${toneGuide}${crisisGuide}

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
      return fallbackHiddenEvent(day, config, isCrisis);
    }
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const event: MarketEvent = {
        id: `HID-${day}-${isCrisis ? 'CR-' : ''}${Math.random().toString(36).slice(2, 6)}`,
        day,
        headline: parsed.headline || '숨겨진 변동',
        subheadline: parsed.subheadline || '',
        body: parsed.body || '',
        visible: false,
        effects: clampEffects(parsed.effects || {}, config),
        expiresDay: day + 3 + (isCrisis ? config.crisisDurationBonus : 0),
      };
      return capConstraintEventDuration(event, config);
    } catch (parseErr) {
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      warnings?.push(`숨겨진 이벤트 JSON 파싱 실패 → 폴백 사용 (${msg.slice(0, 80)})`);
      return fallbackHiddenEvent(day, config, isCrisis);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn('Hidden event generation failed:', msg);
    warnings?.push(`숨겨진 이벤트 LLM 호출 실패 → 폴백 사용 (${msg.slice(0, 100)})`);
  }

  return fallbackHiddenEvent(day, config, isCrisis);
}

// ============================================================
// 효과 범위 제한
// ============================================================

function clampEffects(effects: MarketEventEffects, config: DifficultyConfig): MarketEventEffects {
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  const c = config.effectClamps;
  const ic = config.instantEffectClamps;
  const result: MarketEventEffects = {};

  if (effects.demandMultiplier) {
    result.demandMultiplier = {};
    for (const [k, v] of Object.entries(effects.demandMultiplier)) {
      result.demandMultiplier[k] = clamp(v, c.demandMin, c.demandMax);
    }
  }
  if (effects.customerTraffic !== undefined) {
    result.customerTraffic = clamp(effects.customerTraffic, c.trafficMin, c.trafficMax);
  }
  if (effects.deliveryDelayGlobal !== undefined) {
    result.deliveryDelayGlobal = clamp(Math.round(effects.deliveryDelayGlobal), 0, c.deliveryDelayMax);
  }
  if (effects.priceShift) {
    result.priceShift = {};
    for (const [k, v] of Object.entries(effects.priceShift)) {
      result.priceShift[k] = clamp(v, c.priceShiftMin, c.priceShiftMax);
    }
  }

  // Instant effects — 난이도별 상한에 clamp. 0이면 해당 효과 자체를 제거(난이도가 비활성).
  if (effects.instantEffects) {
    const inst = effects.instantEffects;
    const resultInst: NonNullable<MarketEventEffects['instantEffects']> = {};

    if (inst.stockLoss && (ic.stockLossPercentageMax > 0 || ic.stockLossFixedMax > 0)) {
      const sl = inst.stockLoss;
      const clamped: NonNullable<typeof resultInst.stockLoss> = {
        target: sl.target ?? 'storage',
        categoryFilter: sl.categoryFilter ?? 'all',
        reason: sl.reason,
      };
      if (sl.percentage !== undefined && ic.stockLossPercentageMax > 0) {
        clamped.percentage = clamp(sl.percentage, 0, ic.stockLossPercentageMax);
      }
      if (sl.fixedUnits !== undefined && ic.stockLossFixedMax > 0) {
        clamped.fixedUnits = clamp(Math.round(sl.fixedUnits), 0, ic.stockLossFixedMax);
      }
      // 최소 한쪽이라도 실제 값이 있을 때만 담음
      if (clamped.percentage || clamped.fixedUnits) {
        resultInst.stockLoss = clamped;
      }
    }

    if (inst.oneTimeFee && ic.oneTimeFeeMax > 0) {
      const amount = clamp(inst.oneTimeFee.amount, 0, ic.oneTimeFeeMax);
      if (amount > 0) {
        resultInst.oneTimeFee = { amount, reason: inst.oneTimeFee.reason };
      }
    }

    if (resultInst.stockLoss || resultInst.oneTimeFee) {
      result.instantEffects = resultInst;
    }
  }

  // Duration constraints — 난이도별 clamp. 비활성이면 전체 제거.
  if (effects.durationConstraints) {
    const dc = effects.durationConstraints;
    const dcClamp = config.durationConstraintClamps;
    const resultDc: NonNullable<MarketEventEffects['durationConstraints']> = {};

    if (dcClamp.maxActiveDays > 0) {
      if (dc.deliveryFreeze && dcClamp.deliveryFreezeEnabled) {
        resultDc.deliveryFreeze = true;
      }
      if (dc.damagedSlots && dc.damagedSlots.length > 0 && dcClamp.maxDamagedSlots > 0) {
        const validSlots = dc.damagedSlots
          .filter(s => s && typeof s.row === 'number' && typeof s.col === 'number'
                    && s.row >= 0 && s.row <= 3 && s.col >= 0 && s.col <= 2)
          .slice(0, dcClamp.maxDamagedSlots);
        if (validSlots.length > 0) resultDc.damagedSlots = validSlots;
      }
      if (typeof dc.dailySalesCap === 'number') {
        resultDc.dailySalesCap = Math.max(dcClamp.minDailySalesCap, Math.round(dc.dailySalesCap));
      }
    }

    if (resultDc.deliveryFreeze || resultDc.damagedSlots || resultDc.dailySalesCap !== undefined) {
      result.durationConstraints = resultDc;
    }
  }

  return result;
}

/** durationConstraints를 가진 이벤트의 expiresDay를 난이도별 maxActiveDays로 hard cap */
export function capConstraintEventDuration(event: MarketEvent, config: DifficultyConfig): MarketEvent {
  if (!event.effects.durationConstraints) return event;
  const maxDays = config.durationConstraintClamps.maxActiveDays;
  if (maxDays <= 0) return event;
  const cappedExpiry = event.day + maxDays;
  if (event.expiresDay > cappedExpiry) {
    return { ...event, expiresDay: cappedExpiry };
  }
  return event;
}

// ============================================================
// 폴백 이벤트
// ============================================================

function fallbackPublicEvent(day: number, config: DifficultyConfig, isCrisis: boolean = false): MarketEvent {
  // Crisis 전용 harsh fallback 풀 — 심각한 부정 사건 (LLM 실패 시에도 위기 전달)
  // instantEffects는 clampEffects에서 난이도별 상한으로 축소되므로 쉬움에선 자동 무효화
  type PoolItem = { headline: string; subheadline: string; body: string; effects: MarketEventEffects };
  const crisisPool: PoolItem[] = [
    { headline: '지역 경기 급냉', subheadline: '소비 심리 급락', body: '지역 경기 침체로 전반적인 소비가 줄어들었다.', effects: { demandMultiplier: { all: 0.55 }, customerTraffic: 0.55 } },
    { headline: '물류 파업 장기화', subheadline: '공급망 전면 차질', body: '운송업체 파업 장기화로 전 업체 배송에 큰 차질이 발생했다.', effects: { deliveryDelayGlobal: 3, priceShift: { beverage: 0.25, snack: 0.2 } } },
    { headline: '원자재 급등', subheadline: '도매가 일제 상승', body: '국제 원자재 가격 급등으로 모든 카테고리 도매가가 크게 올랐다.', effects: { priceShift: { beverage: 0.3, snack: 0.25, other: 0.25 } } },
    { headline: '창고 절도 발생', subheadline: '보관 재고 일부 손실', body: '야간 침입으로 창고 보관 재고 일부가 도난당했다.', effects: { instantEffects: { stockLoss: { target: 'storage', categoryFilter: 'all', percentage: 0.2, reason: '창고 절도' } } } },
    { headline: '자판기 파손 사건', subheadline: '수리비 발생', body: '기물 파손으로 자판기 수리비를 부담하게 되었다.', effects: { instantEffects: { oneTimeFee: { amount: 80, reason: '자판기 파손 수리비' } } } },
    { headline: '물류 동결', subheadline: '배송 일시 중단', body: '지역 물류 대란으로 모든 배송이 일시 중단되었다. 며칠간 주문 건 도착 지연 불가피.', effects: { durationConstraints: { deliveryFreeze: true } } },
    { headline: '자판기 슬롯 고장', subheadline: '수리 대기 중', body: '일부 슬롯이 고장 나 판매 불가. 기술자 방문까지 대기가 필요하다.', effects: { durationConstraints: { damagedSlots: [{ row: 0, col: 1 }, { row: 2, col: 0 }] } } },
  ];
  const neutralPool: PoolItem[] = [
    { headline: '음료 수요 증가세', subheadline: '여름 시즌 음료 판매량 상승', body: '기온 상승과 함께 음료 소비가 늘어나고 있다.', effects: { demandMultiplier: { beverage: 1.2 } } },
    { headline: '스낵 시장 안정', subheadline: '전반적으로 큰 변동 없는 상황', body: '스낵 시장은 안정적인 수요를 유지하고 있다.', effects: {} },
    { headline: '물류비 상승', subheadline: '운송 비용 인상 여파', body: '유류비 인상으로 배송이 지연되고 도매가가 소폭 상승했다.', effects: { deliveryDelayGlobal: 1, priceShift: { beverage: 0.05, snack: 0.05 } } },
  ];
  const pool = isCrisis ? crisisPool : neutralPool;
  const e = pool[day % pool.length];
  const event: MarketEvent = {
    id: `PUB-${day}-${isCrisis ? 'CR-' : ''}fb`,
    day,
    ...e,
    effects: clampEffects(e.effects, config),
    visible: true,
    expiresDay: day + 7 + (isCrisis ? config.crisisDurationBonus : 0),
  };
  return capConstraintEventDuration(event, config);
}

function fallbackHiddenEvent(day: number, config: DifficultyConfig, isCrisis: boolean = false): MarketEvent {
  type PoolItem = { headline: string; subheadline: string; body: string; effects: MarketEventEffects };
  const crisisPool: PoolItem[] = [
    { headline: '대형 공사 장기 봉쇄', subheadline: '주변 유동인구 급감', body: '인근 대형 공사로 유동인구가 장기간 급감했다.', effects: { customerTraffic: 0.5 } },
    { headline: '공급망 내부 파행', subheadline: '주요 업체 배송 차질', body: '운송업체 내부 문제로 배송이 지속적으로 지연되고 있다.', effects: { deliveryDelayGlobal: 2 } },
  ];
  const neutralPool: PoolItem[] = [
    { headline: '근처 행사 개최', subheadline: '유동인구 소폭 증가', body: '인근 지역 행사로 유동인구가 증가했다.', effects: { customerTraffic: 1.15 } },
    { headline: 'SNS 바이럴', subheadline: '특정 음료 인기 급상승', body: 'SNS에서 에너지 드링크가 화제가 되면서 수요가 늘었다.', effects: { demandMultiplier: { beverage: 1.3 } } },
    { headline: '경쟁 자판기 등장', subheadline: '근처에 새 자판기 설치', body: '근처에 경쟁 자판기가 설치되어 유동인구가 분산되었다.', effects: { customerTraffic: 0.85 } },
  ];
  const pool = isCrisis ? crisisPool : neutralPool;
  const e = pool[day % pool.length];
  const event: MarketEvent = {
    id: `HID-${day}-${isCrisis ? 'CR-' : ''}fb`,
    day,
    ...e,
    effects: clampEffects(e.effects, config),
    visible: false,
    expiresDay: day + 3 + (isCrisis ? config.crisisDurationBonus : 0),
  };
  return capConstraintEventDuration(event, config);
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
  warnings?: string[],
  config: DifficultyConfig = DIFFICULTY_CONFIGS.normal,
): Promise<MarketEvent[]> {
  // 만료된 이벤트 제거
  const events = currentEvents.filter(e => e.expiresDay > day);

  // 난이도별 주기 — hard에서는 5일/2일, easy에서는 10일/4일
  const needPublic = day === 1 || day % config.publicEventPeriod === 1;
  const needHidden = day === 1 || day % config.hiddenEventPeriod === 1;

  if (!needPublic && !needHidden) return events;

  // 공개 이벤트: 1개 60%, 2개 35%, 3개 5% — crisis는 각 이벤트마다 독립 roll
  const promises: Promise<MarketEvent>[] = [];
  if (needPublic) {
    const roll = Math.random();
    const publicCount = roll < 0.60 ? 1 : roll < 0.95 ? 2 : 3;
    for (let i = 0; i < publicCount; i++) {
      const isCrisis = Math.random() < config.crisisChance;
      promises.push(generatePublicEvent(day, season, events, vendor, apiKey, dateStr, weather, warnings, config, isCrisis));
    }
  }
  if (needHidden) {
    const isCrisis = Math.random() < config.crisisChance;
    promises.push(generateHiddenEvent(day, season, events, vendor, apiKey, dateStr, weather, warnings, config, isCrisis));
  }

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

  // Duration constraints 누산용 (하나라도 freeze면 freeze, damagedSlots 합집합, dailySalesCap 최소값)
  let deliveryFreeze = false;
  const damagedSlotsMap = new Map<string, { row: number; col: number }>();
  let dailySalesCap: number | undefined = undefined;

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

    // Duration constraints — 합의 규칙: freeze는 OR, damagedSlots는 합집합, dailySalesCap은 최솟값
    if (e.durationConstraints) {
      const dc = e.durationConstraints;
      if (dc.deliveryFreeze) deliveryFreeze = true;
      if (dc.damagedSlots) {
        for (const slot of dc.damagedSlots) {
          damagedSlotsMap.set(`${slot.row},${slot.col}`, slot);
        }
      }
      if (dc.dailySalesCap !== undefined) {
        dailySalesCap = dailySalesCap === undefined
          ? dc.dailySalesCap
          : Math.min(dailySalesCap, dc.dailySalesCap);
      }
    }
  }

  if (deliveryFreeze || damagedSlotsMap.size > 0 || dailySalesCap !== undefined) {
    result.durationConstraints = {};
    if (deliveryFreeze) result.durationConstraints.deliveryFreeze = true;
    if (damagedSlotsMap.size > 0) result.durationConstraints.damagedSlots = Array.from(damagedSlotsMap.values());
    if (dailySalesCap !== undefined) result.durationConstraints.dailySalesCap = dailySalesCap;
  }

  return result;
}
