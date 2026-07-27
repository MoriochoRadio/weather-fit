import type { WeatherSummary } from '../types';

/**
 * 하루 시간 흐름 브리핑 엔진 (FR-17).
 *
 * LLM 미사용 결정: LLM API는 키·서버가 필요해 "키 없는 정적 앱" 원칙(NFR-03)과
 * 충돌한다. 같은 사용자 가치(하루 요약 + 행동 조언)를 룰 기반으로 생성하고,
 * 출력을 문자열 배열로 분리해 두어 추후 서버리스 프록시 경유 LLM 요약으로
 * 교체할 수 있게 한다.
 */

export interface DaySegment {
  label: '아침' | '낮' | '저녁';
  /** 구간 대표(평균) 기온 ℃ — 해당 구간 데이터가 없으면 null */
  temp: number | null;
}

export interface RainWindow {
  startHour: number;
  endHour: number;
  maxProb: number;
}

export interface DayBriefing {
  segments: DaySegment[];
  rainWindows: RainWindow[];
  /** 자연어 브리핑 문장들 */
  lines: string[];
}

const SEGMENT_RANGES: Array<[DaySegment['label'], number, number]> = [
  ['아침', 6, 11],
  ['낮', 11, 17],
  ['저녁', 17, 22],
];

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function inRange(hours: number[], values: number[], from: number, to: number): number[] {
  return values.filter((_, i) => hours[i] >= from && hours[i] < to);
}

export function formatHour(h: number): string {
  if (h === 12) return '낮 12시';
  if (h === 0) return '밤 12시';
  if (h < 6) return `새벽 ${h}시`;
  if (h < 12) return `오전 ${h}시`;
  if (h < 18) return `오후 ${h - 12}시`;
  return `저녁 ${h - 12}시`;
}

/** 강수확률 ≥ threshold가 연속되는 시간 구간 탐지 */
export function findRainWindows(hours: number[], probs: number[], threshold = 50): RainWindow[] {
  const windows: RainWindow[] = [];
  let current: RainWindow | null = null;
  for (let i = 0; i < hours.length; i++) {
    if (probs[i] >= threshold) {
      if (current && hours[i] === current.endHour) {
        current.endHour = hours[i] + 1;
        current.maxProb = Math.max(current.maxProb, probs[i]);
      } else {
        current = { startHour: hours[i], endHour: hours[i] + 1, maxProb: probs[i] };
        windows.push(current);
      }
    } else if (current && hours[i] >= current.endHour) {
      current = null;
    }
  }
  return windows;
}

export function buildBriefing(w: WeatherSummary): DayBriefing | null {
  const h = w.hourly;
  if (!h || h.hours.length === 0) return null;

  const segments: DaySegment[] = SEGMENT_RANGES.map(([label, from, to]) => ({
    label,
    temp: mean(inRange(h.hours, h.temp, from, to)),
  }));

  const rainWindows = findRainWindows(h.hours, h.precipProb);
  const lines: string[] = [];

  const [morning, day, evening] = segments;
  if (morning.temp !== null && day.temp !== null && evening.temp !== null) {
    lines.push(
      `아침 ${Math.round(morning.temp)}° → 낮 ${Math.round(day.temp)}° → 저녁 ${Math.round(evening.temp)}° 흐름입니다.`,
    );
    const swing = Math.max(morning.temp, day.temp, evening.temp) - Math.min(morning.temp, day.temp, evening.temp);
    if (swing >= 7) {
      lines.push(`하루 안에 ${Math.round(swing)}° 차이 — 걸치고 벗기 쉬운 겉옷이 하루 전체를 커버합니다.`);
    }
  }

  // 활동 시간대(9~21시)와 겹치는 비 구간만 행동 조언으로
  const activeRain = rainWindows.filter((r) => r.endHour > 9 && r.startHour < 21);
  if (activeRain.length > 0) {
    const first = activeRain[0];
    const span =
      first.startHour === first.endHour - 1
        ? `${formatHour(first.startHour)}쯤`
        : `${formatHour(first.startHour)}~${formatHour(first.endHour)}`;
    lines.push(`${span} 비 예보(최대 ${Math.round(first.maxProb)}%) — 외출 시 우산을 챙기세요.`);
  } else if (rainWindows.length > 0) {
    const first = rainWindows[0];
    lines.push(`${formatHour(first.startHour)}대 비 소식이 있지만 활동 시간대는 대체로 괜찮아요.`);
  }

  return { segments, rainWindows, lines };
}

/** 활동 시간대(9~21시) 평균 체감 — 하루 전체에 적합한 추천 기준 (FR-17) */
export function daytimeFeels(w: WeatherSummary): number | null {
  const h = w.hourly;
  if (!h || h.hours.length === 0) return null;
  return mean(inRange(h.hours, h.feelsLike, 9, 21));
}
