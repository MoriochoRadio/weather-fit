import { describe, expect, it } from 'vitest';
import { PROVINCES, cityKey, findCityByKey } from './regions';

describe('한국 지역 데이터 (FR-13)', () => {
  const allCities = PROVINCES.flatMap((p) => p.cities);

  it('17개 시·도를 모두 포함한다', () => {
    const regions = new Set(allCities.map((c) => c.region));
    const expected = [
      '서울', '인천', '부산', '대구', '광주', '대전', '울산', '세종',
      '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
    ];
    for (const r of expected) {
      expect(regions.has(r), `시·도 누락: ${r}`).toBe(true);
    }
    expect(regions.size).toBe(17);
  });

  it('시·군 단위로 세분화되어 있다 (160개 이상)', () => {
    expect(allCities.length).toBeGreaterThanOrEqual(160);
  });

  it('모든 좌표가 대한민국 범위 안에 있다', () => {
    for (const c of allCities) {
      expect(c.latitude, `${c.name} 위도`).toBeGreaterThanOrEqual(33);
      expect(c.latitude, `${c.name} 위도`).toBeLessThanOrEqual(38.7);
      expect(c.longitude, `${c.name} 경도`).toBeGreaterThanOrEqual(124);
      expect(c.longitude, `${c.name} 경도`).toBeLessThanOrEqual(131);
    }
  });

  it('지역 키가 고유하다', () => {
    const keys = allCities.map(cityKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('findCityByKey로 왕복 조회가 된다', () => {
    const 수원 = allCities.find((c) => c.name === '수원')!;
    expect(findCityByKey(cityKey(수원))).toEqual(수원);
    expect(findCityByKey('없는곳|어디')).toBeNull();
  });

  it('동명 지역(고성)이 도별로 구분된다', () => {
    expect(findCityByKey('고성(강원)|강원')).not.toBeNull();
    expect(findCityByKey('고성(경남)|경남')).not.toBeNull();
  });
});
