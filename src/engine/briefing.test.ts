import { describe, expect, it } from 'vitest';
import { buildBriefing, daytimeFeels, findRainWindows, formatHour, tomorrowLine } from './briefing';
import { referenceTemp } from './recommend';
import type { WeatherSummary } from '../types';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function makeHourlyWeather(overrides: {
  temp?: number[];
  feelsLike?: number[];
  precipProb?: number[];
}): WeatherSummary {
  const flat = (v: number) => Array.from({ length: 24 }, () => v);
  return {
    city: '서울',
    tempNow: 20,
    feelsLike: 20,
    tempMin: 15,
    tempMax: 25,
    precipProb: 10,
    precipSum: 0,
    windSpeed: 5,
    weatherCode: 1,
    hourly: {
      hours: HOURS,
      temp: overrides.temp ?? flat(20),
      feelsLike: overrides.feelsLike ?? overrides.temp ?? flat(20),
      precipProb: overrides.precipProb ?? flat(0),
      weatherCode: flat(1),
    },
  };
}

describe('findRainWindows', () => {
  it('연속된 강수 시간대를 하나의 구간으로 묶는다', () => {
    const probs = Array.from({ length: 24 }, (_, h) => (h >= 14 && h <= 17 ? 80 : 10));
    const windows = findRainWindows(HOURS, probs);
    expect(windows).toEqual([{ startHour: 14, endHour: 18, maxProb: 80 }]);
  });

  it('떨어져 있는 구간은 분리된다', () => {
    const probs = Array.from({ length: 24 }, (_, h) => (h === 8 || h === 20 ? 60 : 0));
    const windows = findRainWindows(HOURS, probs);
    expect(windows).toHaveLength(2);
    expect(windows[0].startHour).toBe(8);
    expect(windows[1].startHour).toBe(20);
  });

  it('임계값 미만이면 구간이 없다', () => {
    expect(findRainWindows(HOURS, Array.from({ length: 24 }, () => 40))).toEqual([]);
  });
});

describe('buildBriefing (FR-17)', () => {
  it('시간별 데이터가 없으면 null', () => {
    const w = makeHourlyWeather({});
    delete w.hourly;
    expect(buildBriefing(w)).toBeNull();
  });

  it('아침→낮→저녁 기온 흐름 문장을 만든다', () => {
    // 아침 20°, 낮 30°, 저녁 24°
    const temp = HOURS.map((h) => (h < 11 ? 20 : h < 17 ? 30 : 24));
    const brief = buildBriefing(makeHourlyWeather({ temp }))!;
    expect(brief.segments.map((s) => s.label)).toEqual(['아침', '낮', '저녁']);
    expect(brief.lines[0]).toContain('아침 20°');
    expect(brief.lines[0]).toContain('낮 30°');
    expect(brief.lines.some((l) => l.includes('겉옷'))).toBe(true); // 하루 내 10° 차
  });

  it('활동 시간대의 비 구간은 우산 조언이 붙는다', () => {
    const precipProb = HOURS.map((h) => (h >= 14 && h < 18 ? 85 : 5));
    const brief = buildBriefing(makeHourlyWeather({ precipProb }))!;
    expect(brief.lines.some((l) => l.includes('우산') && l.includes('오후 2시'))).toBe(true);
  });

  it('새벽에만 오는 비는 완화된 문구로 안내한다', () => {
    const precipProb = HOURS.map((h) => (h < 5 ? 90 : 0));
    const brief = buildBriefing(makeHourlyWeather({ precipProb }))!;
    expect(brief.lines.some((l) => l.includes('활동 시간대는 대체로 괜찮'))).toBe(true);
  });
});

describe('daytimeFeels · referenceTemp 보정 (FR-17)', () => {
  it('활동 시간대(9~21시) 평균 체감을 계산한다', () => {
    const feelsLike = HOURS.map((h) => (h >= 9 && h < 21 ? 30 : 10));
    expect(daytimeFeels(makeHourlyWeather({ feelsLike }))).toBe(30);
  });

  it('시간별 데이터가 있으면 referenceTemp가 하루 전체 기준으로 계산된다', () => {
    const feelsLike = HOURS.map(() => 20);
    const w = makeHourlyWeather({ feelsLike }); // tempMax 25
    expect(referenceTemp(w)).toBe(22.5); // (20 + 25) / 2
  });

  it('시간별 데이터가 없으면 기존 산식으로 폴백한다', () => {
    const w = makeHourlyWeather({});
    delete w.hourly;
    expect(referenceTemp(w)).toBe((w.tempMax + w.feelsLike) / 2);
  });
});

describe('formatHour', () => {
  it.each<[number, string]>([
    [3, '새벽 3시'],
    [8, '오전 8시'],
    [12, '낮 12시'],
    [15, '오후 3시'],
    [20, '저녁 8시'],
    [0, '밤 12시'],
  ])('%i시 → %s', (h, label) => {
    expect(formatHour(h)).toBe(label);
  });
});

describe('tomorrowLine (FR-24)', () => {
  const today = makeHourlyWeather({});
  it('3도 이상 낮으면 낮다고 안내한다', () => {
    expect(tomorrowLine(today, { tempMin: 10, tempMax: 20, precipProb: 10, weatherCode: 1 })).toBe(
      '내일은 오늘보다 5° 낮아요',
    );
  });
  it('3도 이상 높으면 높다고 안내한다', () => {
    expect(tomorrowLine(today, { tempMin: 20, tempMax: 30, precipProb: 10, weatherCode: 1 })).toBe(
      '내일은 오늘보다 5° 높아요',
    );
  });
  it('차이가 작으면 비슷하다고 안내한다', () => {
    expect(tomorrowLine(today, { tempMin: 15, tempMax: 26, precipProb: 10, weatherCode: 1 })).toBe(
      '내일도 오늘과 비슷해요',
    );
  });
  it('강수확률이 높으면 비 소식을 덧붙인다', () => {
    expect(tomorrowLine(today, { tempMin: 15, tempMax: 25, precipProb: 70, weatherCode: 61 })).toBe(
      '내일도 오늘과 비슷해요 — 비 소식이 있어요',
    );
  });
});
