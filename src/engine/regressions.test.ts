import { describe, expect, it } from 'vitest';
import type { StyleId, TempBand, WeatherSummary } from '../types';
import { buildBriefing, formatHour, tomorrowLine, yesterdayLine } from './briefing';
import { recommend, recommendAlternates, referenceTemp, tempBand } from './recommend';
import { OUTFITS, STYLE_ORDER } from '../data/outfits';

/** 하루 종일 서늘하다가 낮에만 확 더워지는 날 — 시간대별 추천 차이를 드러내기 좋은 형태 */
function weatherWithHourly(temps: number[]): WeatherSummary {
  return {
    city: '서울',
    tempNow: temps[12],
    feelsLike: temps[12],
    tempMin: Math.min(...temps),
    tempMax: Math.max(...temps),
    precipProb: 0,
    precipSum: 0,
    windSpeed: 2,
    weatherCode: 0,
    hourly: {
      hours: Array.from({ length: 24 }, (_, h) => h),
      temp: temps,
      feelsLike: temps,
      precipProb: Array.from({ length: 24 }, () => 0),
      weatherCode: Array.from({ length: 24 }, () => 0),
    },
  };
}

describe('formatHour — 자정 처리 (v1.8 QA)', () => {
  it('비 구간 끝이 24시로 넘어가도 "저녁 12시"가 되지 않는다', () => {
    expect(formatHour(24)).toBe('밤 12시');
  });

  it.each<[number, string]>([
    [0, '밤 12시'],
    [3, '새벽 3시'],
    [9, '오전 9시'],
    [12, '낮 12시'],
    [15, '오후 3시'],
    [19, '저녁 7시'],
    [22, '밤 10시'],
  ])('%i시 → %s', (h, expected) => {
    expect(formatHour(h)).toBe(expected);
  });
});

describe('yesterdayLine (FR-30)', () => {
  const today = (tempMax: number) => ({ tempMax }) as WeatherSummary;

  it('차이가 3도 미만이면 굳이 말하지 않는다', () => {
    expect(yesterdayLine(today(20), { tempMin: 10, tempMax: 22 })).toBeNull();
    expect(yesterdayLine(today(20), { tempMin: 10, tempMax: 20 })).toBeNull();
  });

  it('크게 떨어지면 한 겹 더 챙기라고 말한다', () => {
    expect(yesterdayLine(today(15), { tempMin: 12, tempMax: 23 })).toMatch(/8° 낮아요.*한 겹 더/);
  });

  it('크게 오르면 한 겹 덜라고 말한다', () => {
    expect(yesterdayLine(today(25), { tempMin: 8, tempMax: 17 })).toMatch(/8° 높아요.*한 겹 덜어도/);
  });
});

describe('강수 문구 (v1.8 QA)', () => {
  it('내일이 눈이면 "비 소식"이 아니라 "눈 소식"이라고 한다', () => {
    const today = { tempMax: -4 } as WeatherSummary;
    expect(tomorrowLine(today, { tempMin: -14, tempMax: -4, precipProb: 80, weatherCode: 73 })).toContain('눈 소식');
    expect(tomorrowLine(today, { tempMin: 10, tempMax: 18, precipProb: 80, weatherCode: 61 })).toContain('비 소식');
  });

  it('강수확률이 낮으면 강수 문구를 붙이지 않는다', () => {
    const today = { tempMax: 20 } as WeatherSummary;
    expect(tomorrowLine(today, { tempMin: 10, tempMax: 20, precipProb: 20, weatherCode: 61 })).not.toContain('소식');
  });

  it('하루 종일 비가 오면 "밤 12시~밤 12시"가 아니라 "하루 종일"로 안내한다', () => {
    const temps = Array.from({ length: 24 }, () => 18);
    const w = weatherWithHourly(temps);
    w.weatherCode = 61;
    w.hourly!.precipProb = Array.from({ length: 24 }, () => 80);
    const line = buildBriefing(w)!.lines.find((l) => l.includes('예보'))!;
    expect(line).toContain('하루 종일');
    expect(line).not.toContain('밤 12시~밤 12시');
  });

  it('눈 오는 날 브리핑도 "비 예보"가 아니라 "눈 예보"라고 한다', () => {
    const w = weatherWithHourly(Array.from({ length: 24 }, () => -5));
    w.weatherCode = 73;
    w.hourly!.precipProb = Array.from({ length: 24 }, (_, h) => (h >= 13 && h < 18 ? 80 : 0));
    const line = buildBriefing(w)!.lines.find((l) => l.includes('예보'))!;
    expect(line).toContain('눈 예보');
  });
});

describe('referenceTemp — 시간대 인식 (FR-28)', () => {
  // 아침 12도 → 낮 30도 → 밤 13도로 식는 날
  const temps = Array.from({ length: 24 }, (_, h) => (h >= 11 && h < 17 ? 30 : h >= 17 ? 15 : 12));
  const w = weatherWithHourly(temps);

  it('nowHour를 안 주면 기존대로 하루 전체(9~21시) 기준', () => {
    const base = referenceTemp(w);
    expect(base).toBe(referenceTemp(w, undefined));
  });

  it('저녁에 열면 이미 지나간 한낮 최고기온을 섞지 않는다', () => {
    const noon = referenceTemp(w, 12);
    const evening = referenceTemp(w, 19);
    expect(evening).toBeLessThan(noon);
    // 저녁 시간대 실제 기온(15도)에 가깝게 나와야 한다 — 한낮 30도가 섞이면 훨씬 높아진다
    expect(evening).toBeLessThanOrEqual(16);
  });

  it('21시가 넘어 남은 낮 시간이 없어도 값을 낸다', () => {
    expect(Number.isFinite(referenceTemp(w, 23))).toBe(true);
  });

  it('시간별 예보가 없으면 최고기온·체감 평균으로 폴백', () => {
    const noHourly = { ...w, hourly: undefined };
    expect(referenceTemp(noHourly, 19)).toBe((noHourly.tempMax + noHourly.feelsLike) / 2);
  });
});

describe('recommend — variant / deprioritize (FR-29, FR-32)', () => {
  const w = weatherWithHourly(Array.from({ length: 24 }, () => 20));
  const DATE = '2026-08-03';

  it('variant를 바꾸면 같은 날에도 순서가 달라진다', () => {
    const a = recommend('oldmoney', w, DATE).map((r) => r.outfit.id);
    const b = recommend('oldmoney', w, DATE, 'all', { variant: 1 }).map((r) => r.outfit.id);
    expect(b).toHaveLength(a.length);
    expect([...b].sort()).toEqual([...a].sort()); // 구성은 같고
    expect(b).not.toEqual(a); // 순서만 다르다
  });

  it('같은 variant면 결과가 항상 같다 (결정성 유지)', () => {
    const a = recommend('casual', w, DATE, 'all', { variant: 3 }).map((r) => r.outfit.id);
    const b = recommend('casual', w, DATE, 'all', { variant: 3 }).map((r) => r.outfit.id);
    expect(a).toEqual(b);
  });

  it('최근에 입은 코디는 목록에서 빠지지 않고 뒤로만 밀린다', () => {
    const base = recommend('oldmoney', w, DATE).map((r) => r.outfit.id);
    const first = base[0];
    const moved = recommend('oldmoney', w, DATE, 'all', { deprioritize: new Set([first]) }).map((r) => r.outfit.id);
    expect([...moved].sort()).toEqual([...base].sort());
    expect(moved[moved.length - 1]).toBe(first);
  });

  it('후보가 전부 최근에 입은 것이어도 목록이 비지 않는다', () => {
    const base = recommend('oldmoney', w, DATE).map((r) => r.outfit.id);
    const all = recommend('oldmoney', w, DATE, 'all', { deprioritize: new Set(base) });
    expect(all).toHaveLength(base.length);
  });
});

describe('대안 코디 정렬 — 본 추천과 같은 규칙 (v1.8.3 QA)', () => {
  // 20도 근처 = mild. 인접 기온대(warm/chilly) 대안이 양쪽 다 나온다
  const w = weatherWithHourly(Array.from({ length: 24 }, () => 20));
  const DATE = '2026-08-05';

  it("톤 '전체'면 대안 코디도 쿨톤이 먼저 온다 (FR-15)", () => {
    const { cooler, warmer } = recommendAlternates('oldmoney', w, DATE);
    for (const list of [cooler, warmer]) {
      const tones = list.map((r) => r.outfit.tone);
      if (!tones.includes('warm') || !tones.includes('cool')) continue;
      expect(tones.indexOf('warm')).toBeGreaterThan(tones.lastIndexOf('cool'));
    }
  });

  it('최근에 입은 코디는 대안 목록에서도 뒤로 밀린다 (FR-32)', () => {
    const base = recommendAlternates('oldmoney', w, DATE).cooler.map((r) => r.outfit.id);
    expect(base.length).toBeGreaterThan(1);
    const moved = recommendAlternates('oldmoney', w, DATE, 'all', {
      deprioritize: new Set([base[0]]),
    }).cooler.map((r) => r.outfit.id);
    expect([...moved].sort()).toEqual([...base].sort()); // 빠지지 않고
    expect(moved[moved.length - 1]).toBe(base[0]); // 뒤로만 밀린다
  });

  it('비 오는 날엔 대안 코디도 비에 강한 것이 먼저 온다', () => {
    const rainy = { ...w, precipProb: 90, weatherCode: 63 };
    const { cooler, warmer } = recommendAlternates('casual', rainy, DATE);
    for (const list of [cooler, warmer]) {
      const flags = list.map((r) => r.outfit.rainOk);
      const firstNotOk = flags.indexOf(false);
      if (firstNotOk === -1) continue;
      expect(firstNotOk).toBeGreaterThan(flags.lastIndexOf(true));
    }
  });
});

describe('날씨 카드와 추천이 같은 기온대를 가리킨다 (v1.8.3 QA)', () => {
  // 낮 22도 → 저녁 6도로 급락하는 날: 카드가 한낮 기준이면 아래 추천과 어긋난다
  const temps = Array.from({ length: 24 }, (_, h) => (h >= 10 && h < 17 ? 22 : 6));
  const w = weatherWithHourly(temps);

  it.each([9, 12, 15, 17, 19, 21, 23])('%i시에 카드 기온대 = 추천 기온대', (hour) => {
    // WeatherCard가 쓰는 값과 recommend가 쓰는 값이 같은 인자로 계산되는지 확인
    const cardBand = tempBand(referenceTemp(w, hour));
    const recBand = recommend('oldmoney', w, '2026-08-05', 'all', { nowHour: hour })[0].outfit.bands;
    expect(recBand).toContain(cardBand);
  });
});

describe('데이터 커버리지 — 비 오는 날 (v1.8 QA)', () => {
  const BANDS: TempBand[] = ['freezing', 'cold', 'chilly', 'mild', 'warm', 'hot'];

  it('모든 스타일 × 기온대에 비에 강한 코디가 최소 1벌 있다', () => {
    const holes: string[] = [];
    for (const style of STYLE_ORDER as StyleId[]) {
      for (const band of BANDS) {
        const candidates = OUTFITS.filter((o) => o.style === style && o.bands.includes(band));
        if (candidates.length > 0 && !candidates.some((o) => o.rainOk)) holes.push(`${style}/${band}`);
      }
    }
    expect(holes).toEqual([]);
  });
});
