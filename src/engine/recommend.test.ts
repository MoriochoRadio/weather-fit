import { describe, expect, it } from 'vitest';
import { buildAdvice, isRainy, recommend, recommendAlternates, referenceTemp, tempBand } from './recommend';
import { OUTFITS, STYLE_ORDER } from '../data/outfits';
import type { TempBand, WeatherSummary } from '../types';

function makeWeather(overrides: Partial<WeatherSummary> = {}): WeatherSummary {
  return {
    city: '서울',
    tempNow: 20,
    feelsLike: 20,
    tempMin: 15,
    tempMax: 22,
    precipProb: 10,
    precipSum: 0,
    windSpeed: 8,
    weatherCode: 1,
    ...overrides,
  };
}

describe('tempBand 경계값', () => {
  it.each<[number, TempBand]>([
    [-5, 'freezing'],
    [-0.1, 'freezing'],
    [0, 'cold'],
    [8.9, 'cold'],
    [9, 'chilly'],
    [16.9, 'chilly'],
    [17, 'mild'],
    [22.9, 'mild'],
    [23, 'warm'],
    [27.9, 'warm'],
    [28, 'hot'],
    [35, 'hot'],
  ])('%f℃ → %s', (temp, band) => {
    expect(tempBand(temp)).toBe(band);
  });
});

describe('referenceTemp', () => {
  it('최고기온과 체감온도의 평균이다', () => {
    expect(referenceTemp(makeWeather({ tempMax: 30, feelsLike: 20 }))).toBe(25);
  });
});

describe('데이터 커버리지 (FR-05)', () => {
  const BANDS: TempBand[] = ['freezing', 'cold', 'chilly', 'mild', 'warm', 'hot'];
  for (const style of STYLE_ORDER) {
    for (const band of BANDS) {
      it(`${style} × ${band} 코디가 2개 이상`, () => {
        const count = OUTFITS.filter((o) => o.style === style && o.bands.includes(band)).length;
        expect(count).toBeGreaterThanOrEqual(2);
      });
    }
  }

  it('모든 코디 id가 고유하다', () => {
    const ids = OUTFITS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('모든 팔레트는 유효한 hex 색상이다', () => {
    for (const o of OUTFITS) {
      for (const c of o.palette) {
        expect(c).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it('모든 코디에 조용한 포인트가 명시돼 있다 (FR-14)', () => {
    for (const o of OUTFITS) {
      expect(o.point.length, o.id).toBeGreaterThan(5);
    }
  });

  it('팔레트 톤 원칙 (FR-14) — 쿨톤은 붉은기 금지, 웜톤 포함 전체는 고채도 원색 금지', () => {
    for (const o of OUTFITS) {
      for (const hex of o.palette) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        if (o.tone === 'cool') {
          // 쿨톤: 빨강이 파랑보다 뚜렷하게 큰 색(웜톤 주조) 금지
          expect(r - b, `${o.id} ${hex}`).toBeLessThanOrEqual(10);
          expect(Math.max(r, g, b) - Math.min(r, g, b), `${o.id} ${hex}`).toBeLessThanOrEqual(60);
        } else {
          // 웜톤: 차분한 범위 내에서 허용, 강렬한 원색만 금지
          expect(r - b, `${o.id} ${hex}`).toBeLessThanOrEqual(100);
          expect(Math.max(r, g, b) - Math.min(r, g, b), `${o.id} ${hex}`).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it('쿨톤만으로도 모든 스타일×기온대에 코디가 2개 이상 (FR-15 기본 노출 보장)', () => {
    const BANDS: TempBand[] = ['freezing', 'cold', 'chilly', 'mild', 'warm', 'hot'];
    for (const style of STYLE_ORDER) {
      for (const band of BANDS) {
        const count = OUTFITS.filter(
          (o) => o.style === style && o.tone === 'cool' && o.bands.includes(band),
        ).length;
        expect(count, `${style} × ${band}`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('웜톤 코디도 존재한다 (FR-14 개정)', () => {
    expect(OUTFITS.filter((o) => o.tone === 'warm').length).toBeGreaterThanOrEqual(10);
  });
});

describe('recommend', () => {
  it('선택한 스타일·기온대의 코디만 반환한다', () => {
    const w = makeWeather({ tempMax: 24, feelsLike: 26 }); // ref 25 → warm
    const recs = recommend('casual', w, '2026-07-27');
    expect(recs.length).toBeGreaterThanOrEqual(2);
    for (const r of recs) {
      expect(r.outfit.style).toBe('casual');
      expect(r.outfit.bands).toContain('warm');
    }
  });

  it('비 오는 날 rainOk=false 코디는 뒤로 밀리고 경고가 붙는다', () => {
    const rainy = makeWeather({ precipProb: 90, weatherCode: 63, tempMax: 20, feelsLike: 20 });
    const recs = recommend('oldmoney', rainy, '2026-07-27');
    const firstNotOk = recs.findIndex((r) => !r.outfit.rainOk);
    const lastOk = recs.map((r) => r.outfit.rainOk).lastIndexOf(true);
    if (firstNotOk !== -1) {
      expect(firstNotOk).toBeGreaterThan(lastOk);
      expect(recs[firstNotOk].rainWarning).toBe(true);
    }
    for (const r of recs.filter((x) => x.outfit.rainOk)) {
      expect(r.rainWarning).toBe(false);
    }
  });

  it('같은 날짜·조건이면 순서가 동일하다 (결정적)', () => {
    const w = makeWeather();
    const a = recommend('minimal', w, '2026-07-27').map((r) => r.outfit.id);
    const b = recommend('minimal', w, '2026-07-27').map((r) => r.outfit.id);
    expect(a).toEqual(b);
  });

  it('날짜가 다르면 순서가 달라질 수 있다 (여러 날짜 중 한 번 이상)', () => {
    const w = makeWeather();
    const base = recommend('casual', w, '2026-07-27').map((r) => r.outfit.id);
    const days = ['2026-07-28', '2026-07-29', '2026-07-30', '2026-07-31'];
    const anyDifferent = days.some(
      (d) => recommend('casual', w, d).map((r) => r.outfit.id).join() !== base.join(),
    );
    expect(anyDifferent).toBe(true);
  });
});

describe('톤 필터 (FR-15)', () => {
  const w = () => makeWeather({ tempMax: 4, feelsLike: 2, tempMin: -1 }); // ref 3 → cold

  it("'warm' 필터는 웜톤 코디만 반환한다", () => {
    const recs = recommend('oldmoney', w(), '2026-07-27', 'warm');
    expect(recs.length).toBeGreaterThan(0);
    for (const r of recs) expect(r.outfit.tone).toBe('warm');
  });

  it("'cool' 필터는 쿨톤 코디만 반환한다", () => {
    const recs = recommend('oldmoney', w(), '2026-07-27', 'cool');
    expect(recs.length).toBeGreaterThanOrEqual(2);
    for (const r of recs) expect(r.outfit.tone).toBe('cool');
  });

  it("'all'(기본)은 둘 다 포함하되 쿨톤이 먼저 온다", () => {
    const recs = recommend('oldmoney', w(), '2026-07-27');
    const tones = recs.map((r) => r.outfit.tone);
    expect(tones).toContain('cool');
    expect(tones).toContain('warm');
    const firstWarm = tones.indexOf('warm');
    const lastCool = tones.lastIndexOf('cool');
    expect(firstWarm).toBeGreaterThan(lastCool);
  });
});

describe('recommendAlternates (FR-12)', () => {
  it('인접 기온대 코디를 반환하고, 본 추천과 겹치지 않는다', () => {
    const w = makeWeather({ tempMax: 20, feelsLike: 20 }); // ref 20 → mild
    const main = recommend('oldmoney', w, '2026-07-27').map((r) => r.outfit.id);
    const { cooler, warmer } = recommendAlternates('oldmoney', w, '2026-07-27');

    for (const r of [...cooler, ...warmer]) {
      expect(main).not.toContain(r.outfit.id);
      expect(r.outfit.bands).not.toContain('mild');
    }
    for (const r of cooler) expect(r.outfit.bands).toContain('warm');
    for (const r of warmer) expect(r.outfit.bands).toContain('chilly');
    expect(cooler.length + warmer.length).toBeGreaterThan(0);
  });

  it('최저 기온대(freezing)에서는 추운 쪽 대안이 없다', () => {
    const w = makeWeather({ tempMax: -5, feelsLike: -9, tempMin: -12 });
    const { cooler, warmer } = recommendAlternates('casual', w, '2026-07-27');
    expect(warmer).toEqual([]);
    for (const r of cooler) expect(r.outfit.bands).toContain('cold');
  });

  it('최고 기온대(hot)에서는 더운 쪽 대안이 없다', () => {
    const w = makeWeather({ tempMax: 33, feelsLike: 33, tempMin: 26 });
    const { cooler } = recommendAlternates('formal', w, '2026-07-27');
    expect(cooler).toEqual([]);
  });

  it('같은 날짜면 대안 순서도 동일하다', () => {
    const w = makeWeather();
    const a = recommendAlternates('minimal', w, '2026-07-27');
    const b = recommendAlternates('minimal', w, '2026-07-27');
    expect(a.cooler.map((r) => r.outfit.id)).toEqual(b.cooler.map((r) => r.outfit.id));
    expect(a.warmer.map((r) => r.outfit.id)).toEqual(b.warmer.map((r) => r.outfit.id));
  });
});

describe('isRainy', () => {
  it('강수확률 60% 이상이면 비 취급', () => {
    expect(isRainy(makeWeather({ precipProb: 60 }))).toBe(true);
    expect(isRainy(makeWeather({ precipProb: 59 }))).toBe(false);
  });
  it('강수량 1mm 이상이면 비 취급', () => {
    expect(isRainy(makeWeather({ precipSum: 1.2 }))).toBe(true);
  });
  it('WMO 비 코드면 비 취급', () => {
    expect(isRainy(makeWeather({ weatherCode: 61 }))).toBe(true);
  });
});

describe('buildAdvice', () => {
  it('비 예보 시 우산 조언 (FR-07)', () => {
    const advice = buildAdvice(makeWeather({ precipProb: 80 }));
    expect(advice.some((a) => a.id === 'rain')).toBe(true);
  });
  it('일교차 10℃ 이상이면 레이어링 조언', () => {
    const advice = buildAdvice(makeWeather({ tempMin: 10, tempMax: 21 }));
    expect(advice.some((a) => a.id === 'gap')).toBe(true);
  });
  it('한파 조언', () => {
    const advice = buildAdvice(makeWeather({ feelsLike: -12 }));
    expect(advice.some((a) => a.id === 'coldwave')).toBe(true);
  });
  it('폭염 조언', () => {
    const advice = buildAdvice(makeWeather({ feelsLike: 35 }));
    expect(advice.some((a) => a.id === 'heatwave')).toBe(true);
  });
  it('강풍 조언', () => {
    const advice = buildAdvice(makeWeather({ windSpeed: 35 }));
    expect(advice.some((a) => a.id === 'wind')).toBe(true);
  });
  it('눈 오는 날은 눈 조언이 비 조언을 대체한다', () => {
    const advice = buildAdvice(makeWeather({ weatherCode: 73 }));
    expect(advice.some((a) => a.id === 'snow')).toBe(true);
    expect(advice.some((a) => a.id === 'rain')).toBe(false);
  });
  it('평온한 날씨엔 조언 없음', () => {
    expect(buildAdvice(makeWeather())).toEqual([]);
  });
});
