import type { Outfit, StyleId, TempBand, ToneFilter } from "../types";
import { OUTFITS } from "../data/outfits";

export const BAND_LABELS: Record<TempBand, string> = {
  freezing: "한파",
  cold: "추움",
  chilly: "쌀쌀",
  mild: "선선",
  warm: "따뜻",
  hot: "더움",
};

export const BAND_ORDER: TempBand[] = ["freezing", "cold", "chilly", "mild", "warm", "hot"];

/**
 * 체감 기온을 6단계 기온대로 나눈다.
 * 날씨 API가 이상값(NaN/Infinity)을 주면 모든 비교가 false가 되어 조용히 'hot'(가장 더운 극단)으로
 * 새는 것을 막는다 — 어느 쪽에도 치우치지 않은 중간값(mild)으로 안전하게 폴백한다.
 */
export function tempBand(refTemp: number): TempBand {
  if (!Number.isFinite(refTemp)) return "mild";
  if (refTemp < 0) return "freezing";
  if (refTemp < 9) return "cold";
  if (refTemp < 17) return "chilly";
  if (refTemp < 23) return "mild";
  if (refTemp < 28) return "warm";
  return "hot";
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

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

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function seedOf(dateKey: string, ...parts: string[]): number {
  return hashString([dateKey, ...parts].join(":"));
}

/**
 * 같은 날·같은 조건이면 같은 결과가 나오도록 날짜 시드로 섞은 뒤 기준을 하나씩 얹는다.
 * 아래 sort는 모두 안정 정렬이라 직전 단계의 순서를 유지한다.
 */
function orderCandidates(candidates: Outfit[], seed: number, rainy: boolean, tone: ToneFilter): Outfit[] {
  let sorted = seededShuffle(candidates, seed);
  if (rainy) sorted = [...sorted].sort((a, b) => Number(b.rainOk) - Number(a.rainOk));
  if (tone === "all") {
    // 쿨톤 우선 서비스지만 웜톤도 병행 제공한다.
    sorted = [...sorted].sort((a, b) => Number(a.tone === "warm") - Number(b.tone === "warm"));
    if (rainy) sorted = [...sorted].sort((a, b) => Number(b.rainOk) - Number(a.rainOk));
  }
  return sorted;
}

/** 해당 스타일·기온대·톤에 맞는 코디 후보를 우선순위 순으로 돌려준다. */
export function recommendOutfits(
  style: StyleId,
  band: TempBand,
  tone: ToneFilter,
  rainy: boolean,
  dateKey: string,
): Outfit[] {
  const candidates = OUTFITS.filter(
    (o) => o.style === style && o.bands.includes(band) && (tone === "all" || o.tone === tone),
  );
  // 톤 필터가 너무 좁아 후보가 없으면 톤을 풀어 최소 한 벌은 제안한다.
  const sameBand = candidates.length
    ? candidates
    : OUTFITS.filter((o) => o.style === style && o.bands.includes(band));
  // 그래도 비면 가장 가까운 기온대로 넓힌다. 화면이 빈손으로 남는 상황을 만들지 않는다.
  const pool = sameBand.length ? sameBand : nearestBandFallback(style, band);
  return orderCandidates(pool, seedOf(dateKey, style, band, tone), rainy, tone);
}

function nearestBandFallback(style: StyleId, band: TempBand): Outfit[] {
  const idx = BAND_ORDER.indexOf(band);
  for (let distance = 1; distance < BAND_ORDER.length; distance++) {
    for (const target of [BAND_ORDER[idx - distance], BAND_ORDER[idx + distance]]) {
      if (!target) continue;
      const found = OUTFITS.filter((o) => o.style === style && o.bands.includes(target));
      if (found.length) return found;
    }
  }
  return OUTFITS.filter((o) => o.style === style);
}

/** 한 단계 더 덥거나 추운 기온대의 대안 코디 (현재 기온대와 겹치지 않는 것만). */
export function alternateOutfit(
  style: StyleId,
  band: TempBand,
  tone: ToneFilter,
  rainy: boolean,
  dateKey: string,
  direction: "warmer" | "cooler",
): Outfit | null {
  const idx = BAND_ORDER.indexOf(band);
  const target = BAND_ORDER[direction === "cooler" ? idx + 1 : idx - 1];
  if (!target) return null;
  const candidates = OUTFITS.filter(
    (o) =>
      o.style === style &&
      o.bands.includes(target) &&
      !o.bands.includes(band) &&
      (tone === "all" || o.tone === tone),
  );
  if (!candidates.length) return null;
  return orderCandidates(candidates, seedOf(dateKey, style, target, tone, "alt"), rainy, tone)[0] ?? null;
}
