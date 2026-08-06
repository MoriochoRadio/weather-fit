import type { DayWeather, WeatherSummary } from '../types';
import { LAYERING_MAX_TEMP, daytimeFeels } from './briefing';
import { precipWord } from './weatherCodes';

/**
 * 날짜 전환 엔진 (FR-35 "다른 날짜의 코디").
 *
 * 화면과 추천 엔진 전체가 이미 `WeatherSummary` 하나를 기준으로 돌아가고 있으므로,
 * "선택한 날짜를 WeatherSummary로 다시 포장한다"는 한 지점만 만들면 코디 추천·조언·
 * 브리핑·기온대 판정이 오늘과 **똑같은 규칙 그대로** 다른 날짜에도 적용된다.
 * 컴포넌트마다 날짜 분기를 심는 것보다 어긋날 여지가 훨씬 적다.
 */

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export interface DayOption {
  /** YYYY-MM-DD */
  date: string;
  /** '오늘' · '내일' · '모레' · '8/9' */
  label: string;
  /** '수' — 라벨 아래 작게 붙이는 요일 */
  weekday: string;
  isToday: boolean;
  tempMin: number;
  tempMax: number;
  precipProb: number;
  weatherCode: number;
}

function parseDate(date: string): Date | null {
  const d = new Date(`${date}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 앞의 사흘만 말로 부르고 그 뒤는 날짜로 — "4일 뒤"는 세어 봐야 알 수 있어 오히려 불친절하다 */
function labelFor(date: string, index: number): string {
  if (index === 0) return '오늘';
  if (index === 1) return '내일';
  if (index === 2) return '모레';
  const d = parseDate(date);
  return d ? `${d.getMonth() + 1}/${d.getDate()}` : `+${index}일`;
}

function weekdayFor(date: string): string {
  const d = parseDate(date);
  return d ? WEEKDAYS[d.getDay()] : '';
}

/** 날짜 선택 스트립에 뿌릴 목록. days가 없는 구버전 캐시에선 빈 배열 → 호출 측이 오늘만 보여준다 */
export function dayOptions(w: WeatherSummary): DayOption[] {
  if (!w.days || w.days.length === 0) return [];
  return w.days.map((d, i) => ({
    date: d.date,
    label: labelFor(d.date, i),
    weekday: weekdayFor(d.date),
    isToday: i === 0,
    tempMin: d.tempMin,
    tempMax: d.tempMax,
    precipProb: d.precipProb,
    weatherCode: d.weatherCode,
  }));
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** 활동 시간대(9~21시) 평균 기온 — 그날의 "대표 기온"으로 카드 상단에 크게 띄운다 */
function daytimeTemp(day: DayWeather): number | null {
  const h = day.hourly;
  if (!h || h.hours.length === 0) return null;
  return mean(h.temp.filter((_, i) => h.hours[i] >= 9 && h.hours[i] < 21));
}

/**
 * 선택한 날짜를 기준으로 다시 포장한 날씨.
 *
 * - 오늘을 고르면 원본을 그대로 돌려준다 (현재 기온·미세먼지·어제 비교가 살아 있어야 한다)
 * - 다른 날은 **오늘 전용 정보를 일부러 떨어뜨린다** — 실측인 현재 대기질을 사흘 뒤 카드에
 *   그대로 붙여 두면 예보처럼 읽혀서 잘못된 정보가 된다 (미세먼지·어제 대비·내일 미리보기)
 *
 * @returns days가 없거나 모르는 날짜면 null — 호출 측이 오늘로 되돌린다
 */
export function weatherForDate(base: WeatherSummary, date: string): WeatherSummary | null {
  const days = base.days;
  if (!days || days.length === 0) return null;
  const index = days.findIndex((d) => d.date === date);
  if (index < 0) return null;
  if (index === 0) return base;

  const day = days[index];
  // 시간별 예보가 있으면 활동 시간대 평균을, 없으면 최저·최고 중간값을 대표값으로 쓴다
  const feels = daytimeFeels(day) ?? (day.tempMin + day.tempMax) / 2;
  const temp = daytimeTemp(day) ?? (day.tempMin + day.tempMax) / 2;

  return {
    city: base.city,
    tempNow: temp,
    feelsLike: feels,
    tempMin: day.tempMin,
    tempMax: day.tempMax,
    precipProb: day.precipProb,
    precipSum: day.precipSum,
    /*
      바람은 **그날 최대 풍속**을 쓴다. 현재 실측값을 그대로 이어받았더니 지금 부는 바람으로
      닷새 뒤 카드에 "바람 35km/h — 챙 모자가 날릴 수 있어요" 조언이 붙었다 (v1.9 QA).
      예보에 최대 풍속이 없으면 NaN — buildAdvice의 `>= 30` 비교와 화면 표시가 모두
      비유한값에서 조용히 빠진다(이 앱이 이상값을 다루는 기존 방식과 같다).
    */
    windSpeed: day.windMax ?? Number.NaN,
    weatherCode: day.weatherCode,
    hourly: day.hourly,
    uvIndex: day.uvIndex,
    airQuality: undefined,
    tomorrow: undefined,
    yesterday: undefined,
    days,
  };
}

/**
 * 선택한 날짜가 오늘과 얼마나 다른지 한 줄 (FR-35).
 * 사람은 절대 기온보다 "오늘 입은 것" 기준으로 옷을 고른다 — yesterdayLine과 같은 화법.
 */
export function comparedToTodayLine(base: WeatherSummary, date: string): string | null {
  const days = base.days;
  if (!days || days.length === 0) return null;
  const index = days.findIndex((d) => d.date === date);
  if (index <= 0) return null;

  const day = days[index];
  const diff = Math.round(day.tempMax - days[0].tempMax);
  // 떨어졌어도 여전히 더운 날에 "겉옷을 하나 더"라고 하지 않는다 (v1.9 QA) — yesterdayLine과 같은 기준
  const stillHot = day.tempMax >= LAYERING_MAX_TEMP;
  let line: string;
  if (diff >= 5) line = `오늘보다 ${diff}° 높아요 — 오늘 입은 것보다 한 겹 덜어도 됩니다`;
  else if (diff >= 3) line = `오늘보다 ${diff}° 높아요 — 겉옷을 가볍게`;
  else if (diff <= -5)
    line = stillHot
      ? `오늘보다 ${Math.abs(diff)}° 낮지만 여전히 더운 편이에요`
      : `오늘보다 ${Math.abs(diff)}° 낮아요 — 오늘 입은 것보다 한 겹 더 챙기세요`;
  else if (diff <= -3)
    line = stillHot ? `오늘보다 ${Math.abs(diff)}° 낮아요` : `오늘보다 ${Math.abs(diff)}° 낮아요 — 겉옷을 하나 더`;
  else line = '오늘과 비슷한 날씨예요';

  if (Number.isFinite(day.precipProb) && day.precipProb >= 50) {
    line += ` · ${precipWord(day.weatherCode)} 소식이 있어요`;
  }
  return line;
}
