import { describe, expect, it } from 'vitest';
import { comparedToTodayLine, dayOptions, weatherForDate } from './dayView';
import { buildAdvice, referenceTemp, tempBand } from './recommend';
import type { DayWeather, WeatherSummary } from '../types';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const flat = (v: number) => Array.from({ length: 24 }, () => v);

function makeDay(date: string, overrides: Partial<DayWeather> = {}): DayWeather {
  return {
    date,
    tempMin: 15,
    tempMax: 25,
    precipProb: 10,
    precipSum: 0,
    weatherCode: 1,
    hourly: { hours: HOURS, temp: flat(20), feelsLike: flat(20), precipProb: flat(0), weatherCode: flat(1) },
    ...overrides,
  };
}

function makeWeather(days: DayWeather[]): WeatherSummary {
  const today = days[0];
  return {
    city: '서울',
    tempNow: 22,
    feelsLike: 21,
    tempMin: today.tempMin,
    tempMax: today.tempMax,
    precipProb: today.precipProb,
    precipSum: today.precipSum,
    windSpeed: 8,
    weatherCode: today.weatherCode,
    hourly: today.hourly,
    airQuality: { pm25: 10, pm10: 20 },
    yesterday: { tempMin: 12, tempMax: 22 },
    tomorrow: { tempMin: 16, tempMax: 26, precipProb: 10, weatherCode: 1 },
    days,
  };
}

describe('dayOptions', () => {
  it('앞의 사흘은 말로, 그 뒤는 날짜로 부른다', () => {
    const w = makeWeather([
      makeDay('2026-08-06'),
      makeDay('2026-08-07'),
      makeDay('2026-08-08'),
      makeDay('2026-08-09'),
    ]);
    expect(dayOptions(w).map((o) => o.label)).toEqual(['오늘', '내일', '모레', '8/9']);
  });

  it('요일과 오늘 여부를 함께 준다', () => {
    const w = makeWeather([makeDay('2026-08-06'), makeDay('2026-08-07')]);
    const [today, tomorrow] = dayOptions(w);
    expect(today.isToday).toBe(true);
    expect(tomorrow.isToday).toBe(false);
    expect(today.weekday).toBe('목'); // 2026-08-06은 목요일
  });

  it('days가 없는 구버전 캐시에서는 빈 목록', () => {
    const w = makeWeather([makeDay('2026-08-06')]);
    delete w.days;
    expect(dayOptions(w)).toEqual([]);
  });
});

describe('weatherForDate', () => {
  it('오늘을 고르면 원본을 그대로 준다 (현재 기온·대기질 유지)', () => {
    const w = makeWeather([makeDay('2026-08-06'), makeDay('2026-08-07')]);
    expect(weatherForDate(w, '2026-08-06')).toBe(w);
  });

  it('다른 날은 그날 최고/최저와 시간별 예보로 바뀐다', () => {
    const w = makeWeather([
      makeDay('2026-08-06'),
      makeDay('2026-08-07', {
        tempMin: 2,
        tempMax: 9,
        weatherCode: 71,
        hourly: { hours: HOURS, temp: flat(5), feelsLike: flat(4), precipProb: flat(80), weatherCode: flat(71) },
      }),
    ]);
    const next = weatherForDate(w, '2026-08-07')!;
    expect(next.tempMax).toBe(9);
    expect(next.tempMin).toBe(2);
    expect(next.weatherCode).toBe(71);
    expect(next.hourly?.feelsLike[12]).toBe(4);
  });

  it('실측·오늘 전용 정보는 떨어뜨린다 (예보 카드에 오늘 미세먼지가 남지 않게)', () => {
    const w = makeWeather([makeDay('2026-08-06'), makeDay('2026-08-07')]);
    const next = weatherForDate(w, '2026-08-07')!;
    expect(next.airQuality).toBeUndefined();
    expect(next.yesterday).toBeUndefined();
    expect(next.tomorrow).toBeUndefined();
  });

  // v1.9 QA: 현재 실측 풍속을 그대로 이어받아, 지금 부는 바람으로 닷새 뒤 강풍 조언이 붙었다.
  it('바람은 현재 실측이 아니라 그날 최대 풍속을 쓴다', () => {
    const w = makeWeather([makeDay('2026-08-06'), makeDay('2026-08-07', { windMax: 8 })]);
    w.windSpeed = 45; // 지금 강풍
    const next = weatherForDate(w, '2026-08-07')!;
    expect(next.windSpeed).toBe(8);
    expect(buildAdvice(next).some((a) => a.id === 'wind')).toBe(false);
    expect(buildAdvice(w).some((a) => a.id === 'wind')).toBe(true);
  });

  it('그날 최대 풍속을 모르면 강풍 조언도 바람 표시도 하지 않는다', () => {
    const w = makeWeather([makeDay('2026-08-06'), makeDay('2026-08-07')]);
    w.windSpeed = 45;
    const next = weatherForDate(w, '2026-08-07')!;
    expect(Number.isFinite(next.windSpeed)).toBe(false);
    expect(buildAdvice(next).some((a) => a.id === 'wind')).toBe(false);
  });

  it('그날 자외선·강수량은 그날 값을 쓴다 (조언이 오늘 것을 따라가지 않게)', () => {
    const w = makeWeather([
      makeDay('2026-08-06', { uvIndex: 1, precipSum: 0 }),
      makeDay('2026-08-07', { uvIndex: 10, precipSum: 12, precipProb: 90, weatherCode: 61 }),
    ]);
    const next = weatherForDate(w, '2026-08-07')!;
    expect(next.uvIndex).toBe(10);
    expect(buildAdvice(next).some((a) => a.id === 'uv')).toBe(true);
    expect(buildAdvice(next).some((a) => a.id === 'rain')).toBe(true);
    expect(buildAdvice(w).some((a) => a.id === 'rain')).toBe(false);
  });

  it('추천 기준온도가 그날 활동 시간대 체감을 따라간다', () => {
    const w = makeWeather([
      makeDay('2026-08-06'),
      makeDay('2026-08-07', {
        tempMin: -4,
        tempMax: 3,
        hourly: { hours: HOURS, temp: flat(0), feelsLike: flat(-2), precipProb: flat(0), weatherCode: flat(1) },
      }),
    ]);
    const next = weatherForDate(w, '2026-08-07')!;
    // 체감 -2와 최고 3의 평균 0.5 → 'cold'. 오늘(20°)의 'mild'와 확실히 갈린다
    expect(tempBand(referenceTemp(next))).toBe('cold');
    expect(tempBand(referenceTemp(w))).toBe('mild');
  });

  it('모르는 날짜나 days 없는 캐시는 null', () => {
    const w = makeWeather([makeDay('2026-08-06')]);
    expect(weatherForDate(w, '2030-01-01')).toBeNull();
    delete w.days;
    expect(weatherForDate(w, '2026-08-06')).toBeNull();
  });
});

describe('comparedToTodayLine', () => {
  it('오늘보다 크게 추우면 한 겹 더 챙기라고 한다', () => {
    const w = makeWeather([makeDay('2026-08-06', { tempMax: 25 }), makeDay('2026-08-07', { tempMax: 17 })]);
    expect(comparedToTodayLine(w, '2026-08-07')).toContain('오늘보다 8° 낮아요');
    expect(comparedToTodayLine(w, '2026-08-07')).toContain('한 겹 더');
  });

  // v1.9 QA: 35°→31°인 한여름 날에도 "겉옷을 하나 더"라고 안내했다
  it('떨어졌어도 여전히 더운 날엔 겹 조언을 하지 않는다', () => {
    const w = makeWeather([makeDay('2026-08-06', { tempMax: 35 }), makeDay('2026-08-07', { tempMax: 31 })]);
    expect(comparedToTodayLine(w, '2026-08-07')).toBe('오늘보다 4° 낮아요');

    const big = makeWeather([makeDay('2026-08-06', { tempMax: 35 }), makeDay('2026-08-07', { tempMax: 28 })]);
    expect(comparedToTodayLine(big, '2026-08-07')).toContain('여전히 더운');
    expect(comparedToTodayLine(big, '2026-08-07')).not.toContain('한 겹 더');
  });

  it('차이가 작으면 비슷하다고만 한다', () => {
    const w = makeWeather([makeDay('2026-08-06', { tempMax: 25 }), makeDay('2026-08-07', { tempMax: 26 })]);
    expect(comparedToTodayLine(w, '2026-08-07')).toBe('오늘과 비슷한 날씨예요');
  });

  it('눈 오는 날을 비라고 하지 않는다', () => {
    const w = makeWeather([
      makeDay('2026-08-06', { tempMax: 25 }),
      makeDay('2026-08-07', { tempMax: 25, precipProb: 80, weatherCode: 73 }),
    ]);
    expect(comparedToTodayLine(w, '2026-08-07')).toContain('눈 소식');
  });

  it('오늘에 대해서는 비교 문구가 없다', () => {
    const w = makeWeather([makeDay('2026-08-06'), makeDay('2026-08-07')]);
    expect(comparedToTodayLine(w, '2026-08-06')).toBeNull();
  });
});
