import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { createHelperModel } from './llm';
import { Weather, Season, DayOfWeek, MarketCondition, LlmVendor } from './types';

const DAYS_OF_WEEK: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const VALID_WEATHER: Weather[] = ['sunny', 'cloudy', 'rainy', 'hot', 'cold'];

function getSeason(month: number): Season {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
}

function addDays(dateStr: string, days: number): Date {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export async function generateMarketCondition(
  day: number,
  startDate: string,
  recentHistory?: MarketCondition[],
  vendor: LlmVendor = 'anthropic',
  apiKey?: string,
  warnings?: string[]
): Promise<MarketCondition> {
  const date = addDays(startDate, day - 1);
  const month = date.getMonth() + 1;
  const jsDay = date.getDay();
  const dowIndex = jsDay === 0 ? 6 : jsDay - 1;
  const season = getSeason(month);
  const dayOfWeek = DAYS_OF_WEEK[dowIndex];
  const dateStr = formatDate(date);

  // 최근 날씨 히스토리 (연속성 유지용)
  const recentWeather = (recentHistory || [])
    .slice(-5)
    .map(h => `${h.date}: ${h.weather}`)
    .join(', ');

  try {
    const llm = createHelperModel(vendor, apiKey!, 20);
    const response = await llm.invoke([
      new SystemMessage(`날씨를 결정하는 시뮬레이터입니다.

## 출력 규칙 (엄격)
- 반드시 다음 5개 단어 중 **정확히 하나**만 출력: sunny | cloudy | rainy | hot | cold
- 소문자 영어 단어만. 공백/문장부호/설명/이모지/따옴표/코드블록 전부 금지.
- 추가 문장·머릿말·맺음말 절대 금지. 오직 단어 하나.

## 결정 기준
- 계절·월·최근 날씨 흐름을 고려한 현실적인 연속성
- 같은 날씨가 3일 이상 지속 중이면 다른 날씨로 변경`),
      new HumanMessage(`날짜: ${dateStr} (${dayOfWeek}), 계절: ${season}, 월: ${month}월${recentWeather ? `\n최근 날씨: ${recentWeather}\n같은 날씨가 계속되고 있다면 변화를 주세요.` : ''}\n\n오늘의 날씨는? (단어 하나만)`),
    ]);

    const text = (typeof response.content === 'string' ? response.content : '')
      .trim().toLowerCase();

    // 유효한 날씨인지 확인
    const match = VALID_WEATHER.find(w => text.includes(w));
    if (!match) {
      warnings?.push(`날씨 LLM 응답 형식 오류 → sunny로 폴백 (원본: "${text.slice(0, 80)}")`);
      return { day, dayOfWeek, weather: 'sunny', season, date: dateStr };
    }

    return { day, dayOfWeek, weather: match, season, date: dateStr };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[Weather LLM ERROR]', msg);
    warnings?.push(`날씨 LLM 호출 실패 → 폴백 적용 (${msg.slice(0, 100)})`);
    return {
      day,
      dayOfWeek,
      weather: fallbackWeather(season),
      season,
      date: dateStr,
    };
  }
}

// API 실패 시 폴백
function fallbackWeather(season: Season): Weather {
  const weights: Record<Season, Record<Weather, number>> = {
    spring: { sunny: 35, cloudy: 30, rainy: 25, hot: 5, cold: 5 },
    summer: { sunny: 25, cloudy: 15, rainy: 15, hot: 40, cold: 5 },
    fall:   { sunny: 30, cloudy: 35, rainy: 20, hot: 5, cold: 10 },
    winter: { sunny: 20, cloudy: 25, rainy: 15, hot: 0, cold: 40 },
  };
  const entries = Object.entries(weights[season]) as [Weather, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [weather, weight] of entries) {
    r -= weight;
    if (r <= 0) return weather;
  }
  return 'sunny';
}

// 요일 배수
export function getDayMultiplier(dow: DayOfWeek): number {
  if (dow === 'sat' || dow === 'sun') return 1.3;
  if (dow === 'fri') return 1.1;
  return 0.9;
}

// 계절 배수
export function getSeasonMultiplier(season: Season, category: string): number {
  if (category === 'beverage') {
    if (season === 'summer') return 1.4;
    if (season === 'winter') return 0.7;
  }
  if (category === 'snack') {
    if (season === 'winter') return 1.2;
  }
  return 1.0;
}

// 날씨 배수
export function getWeatherMultiplier(weather: Weather, category: string): number {
  if (category === 'beverage') {
    if (weather === 'hot') return 1.4;
    if (weather === 'sunny') return 1.1;
    if (weather === 'rainy') return 0.7;
    if (weather === 'cold') return 0.6;
  }
  if (category === 'snack') {
    if (weather === 'rainy') return 0.8;
    if (weather === 'cold') return 1.1;
  }
  return 1.0;
}

// 날씨 한국어
export function weatherLabel(w: Weather): string {
  const m: Record<Weather, string> = {
    sunny: '맑음 ☀️', cloudy: '흐림 ☁️', rainy: '비 🌧️',
    hot: '더움 🔥', cold: '추움 ❄️',
  };
  return m[w];
}

export function seasonLabel(s: Season): string {
  const m: Record<Season, string> = {
    spring: '봄 🌸', summer: '여름 🌻', fall: '가을 🍂', winter: '겨울 ⛄',
  };
  return m[s];
}

export function dayOfWeekLabel(d: DayOfWeek): string {
  const m: Record<DayOfWeek, string> = {
    mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일',
  };
  return m[d];
}
