import type { HourlyForecast, WeatherSummary } from '../types';
import { precipWord } from './weatherCodes';

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

/** 이 시간 이상 이어지는 강수 구간은 시각 범위 대신 "하루 종일"로 표현한다 */
const ALL_DAY_HOURS = 18;

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
  // 비 구간의 끝시각은 24가 될 수 있다(23시까지 비) — 24를 그냥 두면 "저녁 12시"가 되므로 자정으로 접는다 (QA)
  const n = ((h % 24) + 24) % 24;
  if (n === 12) return '낮 12시';
  if (n === 0) return '밤 12시';
  if (n < 6) return `새벽 ${n}시`;
  if (n < 12) return `오전 ${n}시`;
  if (n < 18) return `오후 ${n - 12}시`;
  if (n < 21) return `저녁 ${n - 12}시`;
  return `밤 ${n - 12}시`;
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
  const word = precipWord(w.weatherCode);
  const activeRain = rainWindows.filter((r) => r.endHour > 9 && r.startHour < 21);
  if (activeRain.length > 0) {
    const first = activeRain[0];
    const span =
      // 장마처럼 하루를 거의 다 덮으면 "밤 12시~밤 12시"처럼 같은 시각이 반복돼 읽히지 않는다 (QA)
      first.endHour - first.startHour >= ALL_DAY_HOURS
        ? '하루 종일'
        : first.startHour === first.endHour - 1
          ? `${formatHour(first.startHour)}쯤`
          : `${formatHour(first.startHour)}~${formatHour(first.endHour)}`;
    lines.push(`${span} ${word} 예보(최대 ${Math.round(first.maxProb)}%) — 외출 시 우산을 챙기세요.`);
  } else if (rainWindows.length > 0) {
    const first = rainWindows[0];
    lines.push(`${formatHour(first.startHour)}대 ${word} 소식이 있지만 활동 시간대는 대체로 괜찮아요.`);
  }

  return { segments, rainWindows, lines };
}

/**
 * 이 온도 위로는 "한 겹 더 / 겉옷을 하나 더"가 성립하지 않는다.
 *
 * 기온이 떨어졌다는 사실만 보고 겹 조언을 붙였더니, 35°에서 31°로 떨어진 한여름 날에
 * "오늘보다 4° 낮아요 — 겉옷을 하나 더"라고 안내했다 (v1.9 QA). 떨어졌어도 여전히 더운 날엔
 * 차이만 말하고 겹 이야기는 하지 않는다.
 *
 * recommend.ts의 tempBand를 쓰지 않는 이유: recommend가 이 파일을 import하므로 순환이 된다.
 * 값은 tempBand의 warm 하한(23℃)보다 한 칸 위로 두어, 애매한 경계에서는 조언을 남긴다.
 */
export const LAYERING_MAX_TEMP = 25;

/**
 * 어제 대비 한 줄 (FR-30).
 * 사람은 절대 기온보다 "어제 입은 것"을 기준으로 옷을 고르므로, 몇 도 차이인지와
 * 한 겹을 더할지 뺄지를 함께 알려 준다. 차이가 작으면 굳이 말하지 않는다(잡음).
 */
export function yesterdayLine(today: WeatherSummary, yesterday: NonNullable<WeatherSummary['yesterday']>): string | null {
  const diff = Math.round(today.tempMax - yesterday.tempMax);
  if (Math.abs(diff) < 3) return null;
  if (diff >= 5) return `어제보다 ${diff}° 높아요 — 어제 입은 것보다 한 겹 덜어도 됩니다`;
  if (diff > 0) return `어제보다 ${diff}° 높아요 — 어제와 비슷하게 입되 겉옷은 가볍게`;

  const stillHot = today.tempMax >= LAYERING_MAX_TEMP;
  if (diff <= -5) {
    return stillHot
      ? `어제보다 ${Math.abs(diff)}° 낮지만 여전히 더운 편이에요`
      : `어제보다 ${Math.abs(diff)}° 낮아요 — 어제 입은 것보다 한 겹 더 챙기세요`;
  }
  return stillHot
    ? `어제보다 ${Math.abs(diff)}° 낮아요`
    : `어제보다 ${Math.abs(diff)}° 낮아요 — 어제와 비슷하게 입되 겉옷을 하나 더`;
}

/** 내일 미리보기 한 줄 — 오늘 최고기온 대비 몇 도 차이인지, 비 소식이 있는지 (FR-24) */
export function tomorrowLine(today: WeatherSummary, tomorrow: NonNullable<WeatherSummary['tomorrow']>): string {
  const diff = Math.round(tomorrow.tempMax - today.tempMax);
  let line: string;
  if (diff <= -3) line = `내일은 오늘보다 ${Math.abs(diff)}° 낮아요`;
  else if (diff >= 3) line = `내일은 오늘보다 ${diff}° 높아요`;
  else line = '내일도 오늘과 비슷해요';
  // 눈 오는 날 "비 소식이 있어요"라고 안내하던 문제 — 내일 날씨 코드로 낱말을 고른다 (QA)
  if (Number.isFinite(tomorrow.precipProb) && tomorrow.precipProb >= 50) {
    line += ` — ${precipWord(tomorrow.weatherCode)} 소식이 있어요`;
  }
  return line;
}

/**
 * 추천 기준이 될 평균 체감 (FR-17, FR-28).
 *
 * 기본은 활동 시간대(9~21시)지만, 이미 그 시간이 지나가고 있으면 "앞으로 남은 시간"만 본다 —
 * 저녁 9시에 열었는데 한낮 최고기온 기준으로 옷을 추천하던 문제 때문 (QA).
 * 밤 9시를 넘겨 오늘 남은 시간이 거의 없으면 마지막 3시간으로 버틴다.
 *
 * @param w 시간별 예보만 있으면 되므로 WeatherSummary 전체를 요구하지 않는다 —
 *   오늘이 아닌 날짜(FR-35)는 하루치 시간 예보만 들고 이 함수를 부른다.
 * @param nowHour 지금 시각(0~23). 넘기지 않으면 하루 전체(9~21시) 기준 — 순수 함수로 테스트하기 위해 주입식으로 둔다.
 */
export function daytimeFeels(w: { hourly?: HourlyForecast }, nowHour?: number): number | null {
  const h = w.hourly;
  if (!h || h.hours.length === 0) return null;
  if (nowHour === undefined) return mean(inRange(h.hours, h.feelsLike, 9, 21));

  const from = Math.min(Math.max(nowHour, 9), 21);
  const remaining = mean(inRange(h.hours, h.feelsLike, from, 21));
  if (remaining !== null) return remaining;
  // 21시 이후 — 남은 밤 시간대로
  const night = mean(inRange(h.hours, h.feelsLike, Math.max(nowHour, 21), 24));
  return night ?? mean(inRange(h.hours, h.feelsLike, 9, 21));
}
