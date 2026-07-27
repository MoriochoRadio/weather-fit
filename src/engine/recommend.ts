import type { Advice, Outfit, StyleId, TempBand, ToneFilter, WeatherSummary } from '../types';
import { OUTFITS } from '../data/outfits';
import { daytimeFeels } from './briefing';

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
 * 시간별 예보가 있으면 활동 시간대(9~21시) 평균 체감으로 하루 전체에 맞추고 (FR-17),
 * 없으면 최고기온·현재 체감 평균으로 폴백.
 */
export function referenceTemp(w: WeatherSummary): number {
  const daytime = daytimeFeels(w);
  if (daytime !== null) return (daytime + w.tempMax) / 2;
  return (w.tempMax + w.feelsLike) / 2;
}

export function tempBand(refTemp: number): TempBand {
  if (refTemp < 0) return 'freezing';
  if (refTemp < 9) return 'cold';
  if (refTemp < 17) return 'chilly';
  if (refTemp < 23) return 'mild';
  if (refTemp < 28) return 'warm';
  return 'hot';
}

const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);

export function isRainy(w: WeatherSummary): boolean {
  return w.precipProb >= 60 || w.precipSum >= 1 || RAIN_CODES.has(w.weatherCode);
}

export function isSnowy(w: WeatherSummary): boolean {
  return SNOW_CODES.has(w.weatherCode);
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
): Recommendation[] {
  const band = tempBand(referenceTemp(weather));
  const rainy = isRainy(weather) || isSnowy(weather);
  const candidates = OUTFITS.filter(
    (o) => o.style === style && o.bands.includes(band) && (tone === 'all' || o.tone === tone),
  );
  const shuffled = seededShuffle(candidates, hashString(`${dateKey}:${style}:${band}`));
  let sorted = rainy ? [...shuffled].sort((a, b) => Number(b.rainOk) - Number(a.rainOk)) : shuffled;
  if (tone === 'all') {
    // 안정 정렬이라 시드 순서·강수 순서를 유지한 채 쿨톤만 앞으로
    sorted = [...sorted].sort((a, b) => Number(a.tone === 'warm') - Number(b.tone === 'warm'));
    if (rainy) sorted = [...sorted].sort((a, b) => Number(b.rainOk) - Number(a.rainOk));
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
): Alternates {
  const band = tempBand(referenceTemp(weather));
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
    const shuffled = seededShuffle(candidates, hashString(`${dateKey}:${style}:${target}:alt`));
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
    advice.push({ id: 'rain', text: `강수확률 ${Math.round(w.precipProb)}% — 우산을 챙기고 스웨이드 소재는 피하세요`, emphasis: true });
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
