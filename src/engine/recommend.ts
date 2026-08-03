import type { Advice, Outfit, StyleId, TempBand, ToneFilter, WeatherSummary } from '../types';
import { OUTFITS } from '../data/outfits';
import { daytimeFeels } from './briefing';
import { RAIN_CODES, SNOW_CODES } from './weatherCodes';

export const BAND_LABELS: Record<TempBand, string> = {
  freezing: '한파',
  cold: '추움',
  chilly: '쌀쌀',
  mild: '선선',
  warm: '따뜻',
  hot: '더움',
};

/**
 * 추천 기준 온도.
 * 시간별 예보가 있으면 활동 시간대 평균 체감으로 하루에 맞추고 (FR-17),
 * 없으면 최고기온·현재 체감 평균으로 폴백.
 *
 * @param nowHour 지금 시각(0~23)을 주면 "앞으로 남은 시간" 기준으로 좁혀 계산한다 (FR-28).
 */
export function referenceTemp(w: WeatherSummary, nowHour?: number): number {
  const daytime = daytimeFeels(w, nowHour);
  if (daytime === null) return (w.tempMax + w.feelsLike) / 2;
  // 저녁(17시) 이후엔 이미 지나간 한낮 최고기온을 섞으면 실제보다 얇게 입히게 된다 (QA)
  if (nowHour !== undefined && nowHour >= 17) return daytime;
  return (daytime + w.tempMax) / 2;
}

export function tempBand(refTemp: number): TempBand {
  // 날씨 API가 이상값(NaN/Infinity)을 주면 모든 비교가 false가 되어 조용히 'hot'(가장 더운 극단)으로
  // 새는 것을 막는다 — 실제로 어느 쪽에도 치우치지 않은 중간값(mild)으로 안전하게 폴백.
  if (!Number.isFinite(refTemp)) return 'mild';
  if (refTemp < 0) return 'freezing';
  if (refTemp < 9) return 'cold';
  if (refTemp < 17) return 'chilly';
  if (refTemp < 23) return 'mild';
  if (refTemp < 28) return 'warm';
  return 'hot';
}

export function isRainy(w: WeatherSummary): boolean {
  return w.precipProb >= 60 || w.precipSum >= 1 || RAIN_CODES.has(w.weatherCode);
}

export function isSnowy(w: WeatherSummary): boolean {
  return SNOW_CODES.has(w.weatherCode);
}

export type AqiLevel = 'good' | 'moderate' | 'bad' | 'veryBad';

const AQI_LABELS: Record<AqiLevel, string> = { good: '좋음', moderate: '보통', bad: '나쁨', veryBad: '매우나쁨' };
const AQI_RANK: Record<AqiLevel, number> = { good: 0, moderate: 1, bad: 2, veryBad: 3 };

/** 한국 대기환경기준(㎍/㎥) 구간 */
function pm25Level(pm25: number): AqiLevel {
  if (!Number.isFinite(pm25)) return 'good';
  if (pm25 >= 76) return 'veryBad';
  if (pm25 >= 36) return 'bad';
  if (pm25 >= 16) return 'moderate';
  return 'good';
}

function pm10Level(pm10: number): AqiLevel {
  if (!Number.isFinite(pm10)) return 'good';
  if (pm10 >= 151) return 'veryBad';
  if (pm10 >= 81) return 'bad';
  if (pm10 >= 31) return 'moderate';
  return 'good';
}

/** PM2.5·PM10 중 더 나쁜 쪽 등급을 대표값으로 사용 */
export function aqiLevel(pm25: number, pm10: number): AqiLevel {
  const a = pm25Level(pm25);
  const b = pm10Level(pm10);
  return AQI_RANK[a] >= AQI_RANK[b] ? a : b;
}

export function aqiLabel(level: AqiLevel): string {
  return AQI_LABELS[level];
}

export type UvLevel = 'low' | 'moderate' | 'high' | 'veryHigh' | 'extreme';

/** WHO 자외선지수 구간 */
export function uvLevel(uv: number): UvLevel {
  if (!Number.isFinite(uv)) return 'low';
  if (uv >= 11) return 'extreme';
  if (uv >= 8) return 'veryHigh';
  if (uv >= 6) return 'high';
  if (uv >= 3) return 'moderate';
  return 'low';
}

/** 같은 날짜에는 항상 같은 순서가 나오도록 날짜 기반 시드 셔플 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface Recommendation {
  outfit: Outfit;
  rainWarning: boolean;
}

/** 추천 계산에 영향을 주는 부가 조건 — 기존 호출부를 깨지 않으려고 선택적 객체로 둔다 */
export interface RecommendOptions {
  /** 지금 시각(0~23) — 주면 남은 시간 기준으로 기온대를 잡는다 (FR-28) */
  nowHour?: number;
  /** 같은 날 안에서 다른 순서를 보고 싶을 때 증가시키는 값 (FR-29 "다른 코디 보기") */
  variant?: number;
  /** 최근에 입은 코디 id — 목록에서 빼지는 않고 뒤로 민다 (FR-32) */
  deprioritize?: ReadonlySet<string>;
}

function seedOf(dateKey: string, variant: number | undefined, ...parts: string[]): number {
  return hashString([dateKey, ...parts, variant ? `v${variant}` : ''].join(':'));
}

/**
 * 스타일 × 날씨에 맞는 코디 목록.
 * - 기온대가 맞는 코디만 후보로 선정
 * - 톤 필터(전체/쿨톤/웜톤) 적용, '전체'는 쿨톤 우선 정렬 (FR-15)
 * - 강수 시 rainOk=false 코디는 뒤로 밀고 경고 표시 (제거하지 않음)
 * - dateKey(YYYY-MM-DD) 기반 시드로 매일 순서가 바뀜
 */
export function recommend(
  style: StyleId,
  weather: WeatherSummary,
  dateKey: string,
  tone: ToneFilter = 'all',
  opts: RecommendOptions = {},
): Recommendation[] {
  const band = tempBand(referenceTemp(weather, opts.nowHour));
  const rainy = isRainy(weather) || isSnowy(weather);
  const candidates = OUTFITS.filter(
    (o) => o.style === style && o.bands.includes(band) && (tone === 'all' || o.tone === tone),
  );
  const shuffled = seededShuffle(candidates, seedOf(dateKey, opts.variant, style, band));
  let sorted = rainy ? [...shuffled].sort((a, b) => Number(b.rainOk) - Number(a.rainOk)) : shuffled;
  if (tone === 'all') {
    // 안정 정렬이라 시드 순서·강수 순서를 유지한 채 쿨톤만 앞으로
    sorted = [...sorted].sort((a, b) => Number(a.tone === 'warm') - Number(b.tone === 'warm'));
    if (rainy) sorted = [...sorted].sort((a, b) => Number(b.rainOk) - Number(a.rainOk));
  }
  // 최근에 입은 코디는 맨 뒤로 — 며칠 연달아 같은 옷을 제안받는 걸 피한다 (FR-32).
  // 마지막에 한 번만 적용해 위의 강수·톤 정렬 결과를 뒤집지 않는다.
  const recent = opts.deprioritize;
  if (recent && recent.size > 0) {
    sorted = [...sorted].sort((a, b) => Number(recent.has(a.id)) - Number(recent.has(b.id)));
  }
  return sorted.map((outfit) => ({ outfit, rainWarning: rainy && !outfit.rainOk }));
}

const BAND_ORDER: TempBand[] = ['freezing', 'cold', 'chilly', 'mild', 'warm', 'hot'];

export interface Alternates {
  /** 더운 쪽 인접 기온대 코디 — "더 시원하게 입고 싶다면" */
  cooler: Recommendation[];
  /** 추운 쪽 인접 기온대 코디 — "쌀쌀하게 느껴진다면" */
  warmer: Recommendation[];
}

/**
 * 인접 기온대(±1)의 대안 코디 (FR-12).
 * 본 추천(현재 밴드)에 이미 포함된 코디는 제외한다.
 */
export function recommendAlternates(
  style: StyleId,
  weather: WeatherSummary,
  dateKey: string,
  tone: ToneFilter = 'all',
  opts: RecommendOptions = {},
): Alternates {
  const band = tempBand(referenceTemp(weather, opts.nowHour));
  const rainy = isRainy(weather) || isSnowy(weather);
  const idx = BAND_ORDER.indexOf(band);

  const pick = (target: TempBand | undefined): Recommendation[] => {
    if (!target) return [];
    const candidates = OUTFITS.filter(
      (o) =>
        o.style === style &&
        o.bands.includes(target) &&
        !o.bands.includes(band) &&
        (tone === 'all' || o.tone === tone),
    );
    const shuffled = seededShuffle(candidates, seedOf(dateKey, opts.variant, style, target, 'alt'));
    const sorted = rainy ? [...shuffled].sort((a, b) => Number(b.rainOk) - Number(a.rainOk)) : shuffled;
    return sorted.map((outfit) => ({ outfit, rainWarning: rainy && !outfit.rainOk }));
  };

  return {
    cooler: pick(BAND_ORDER[idx + 1]),
    warmer: pick(BAND_ORDER[idx - 1]),
  };
}

export function buildAdvice(w: WeatherSummary): Advice[] {
  const advice: Advice[] = [];
  if (isSnowy(w)) {
    advice.push({ id: 'snow', text: '눈 예보 — 접지력 좋은 방한 부츠를 신고, 밑단이 긴 바지는 피하세요', emphasis: true });
  } else if (isRainy(w)) {
    // precipProb가 결측/NaN이어도(예: weatherCode만으로 강수 판정된 경우) "강수확률 NaN%"가 노출되지 않게 방어
    const probText = Number.isFinite(w.precipProb) ? `강수확률 ${Math.round(w.precipProb)}%` : '비 예보';
    advice.push({ id: 'rain', text: `${probText} — 우산을 챙기고 스웨이드 소재는 피하세요`, emphasis: true });
  }
  if (w.tempMax - w.tempMin >= 10) {
    advice.push({ id: 'gap', text: `일교차 ${Math.round(w.tempMax - w.tempMin)}℃ — 걸치고 벗기 쉬운 겉옷으로 레이어링하세요`, emphasis: false });
  }
  if (w.feelsLike <= -10) {
    advice.push({ id: 'coldwave', text: '체감 영하 10℃ 이하 — 목도리·장갑·발열 이너까지 갖추세요', emphasis: true });
  }
  if (w.feelsLike >= 33) {
    advice.push({ id: 'heatwave', text: '폭염 — 통기성 좋은 린넨·시어서커와 밝은 색을 고르세요', emphasis: true });
  }
  if (w.windSpeed >= 30) {
    advice.push({ id: 'wind', text: `바람 ${Math.round(w.windSpeed)}km/h — 챙 모자나 가벼운 겉옷은 날릴 수 있어요`, emphasis: false });
  }
  if (w.airQuality) {
    const level = aqiLevel(w.airQuality.pm25, w.airQuality.pm10);
    if (level === 'veryBad') {
      advice.push({ id: 'aqi', text: '미세먼지 매우 나쁨 — 마스크를 챙기고, 밝은 색 겉옷은 세탁 부담을 고려하세요', emphasis: true });
    } else if (level === 'bad') {
      advice.push({ id: 'aqi', text: '미세먼지 나쁨 — 마스크를 챙기세요', emphasis: false });
    }
  }
  if (w.uvIndex !== undefined) {
    const level = uvLevel(w.uvIndex);
    if (level === 'veryHigh' || level === 'extreme') {
      advice.push({ id: 'uv', text: '자외선지수 매우 높음 — 모자·선글라스·자외선 차단제를 꼭 챙기세요', emphasis: true });
    } else if (level === 'high') {
      advice.push({ id: 'uv', text: '자외선지수 높음 — 모자나 자외선 차단제를 챙기면 좋아요', emphasis: false });
    }
  }
  return advice;
}

export function weatherIcon(code: number): string {
  if (code === 0) return '맑음';
  if (code <= 2) return '구름 조금';
  if (code === 3) return '흐림';
  if (code === 45 || code === 48) return '안개';
  if (SNOW_CODES.has(code)) return '눈';
  if (code >= 95) return '뇌우';
  if (RAIN_CODES.has(code)) return '비';
  return '흐림';
}
