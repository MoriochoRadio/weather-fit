import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isWornOn, lastWornDate, loadWornLog, recentlyWornIds, toggleWorn, type WornEntry } from './wornLog';

function createMockStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

describe('wornLog (FR-32)', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMockStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('기록이 없으면 빈 배열', () => {
    expect(loadWornLog()).toEqual([]);
  });

  it('토글로 담고 빼며 localStorage에 남는다', () => {
    const a = toggleWorn('om-01', '2026-08-03', []);
    expect(isWornOn('om-01', '2026-08-03', a)).toBe(true);
    expect(loadWornLog()).toEqual(a);

    const b = toggleWorn('om-01', '2026-08-03', a);
    expect(isWornOn('om-01', '2026-08-03', b)).toBe(false);
    expect(loadWornLog()).toEqual([]);
  });

  it('같은 코디라도 날짜가 다르면 별개 기록', () => {
    let log = toggleWorn('om-01', '2026-08-01', []);
    log = toggleWorn('om-01', '2026-08-03', log);
    expect(log).toHaveLength(2);
    expect(isWornOn('om-01', '2026-08-02', log)).toBe(false);
  });

  it('깨진 JSON이 저장돼 있어도 빈 배열로 회복한다', () => {
    localStorage.setItem('weatherfit.worn', '{not json');
    expect(loadWornLog()).toEqual([]);
  });

  it('배열이 아닌 값이나 형식이 어긋난 항목은 걸러낸다', () => {
    localStorage.setItem('weatherfit.worn', JSON.stringify([{ outfitId: 'om-01', date: '2026-08-03' }, 42, {}]));
    expect(loadWornLog()).toEqual([{ outfitId: 'om-01', date: '2026-08-03' }]);
  });

  describe('recentlyWornIds', () => {
    const log: WornEntry[] = [
      { outfitId: 'recent', date: '2026-08-01' }, // 2일 전
      { outfitId: 'old', date: '2026-07-20' }, // 14일 전
      { outfitId: 'today', date: '2026-08-03' }, // 오늘
    ];

    it('최근 N일 안에 입은 것만 모은다', () => {
      const ids = recentlyWornIds(log, '2026-08-03', 5);
      expect(ids.has('recent')).toBe(true);
      expect(ids.has('old')).toBe(false);
    });

    it('오늘 기록은 "최근에 입음"으로 치지 않는다 (오늘 고른 코디가 뒤로 밀리면 안 됨)', () => {
      expect(recentlyWornIds(log, '2026-08-03', 5).has('today')).toBe(false);
    });

    it('날짜 문자열이 깨져 있어도 죽지 않는다', () => {
      expect(recentlyWornIds([{ outfitId: 'x', date: 'oops' }], '2026-08-03').size).toBe(0);
      expect(recentlyWornIds(log, 'oops').size).toBe(0);
    });
  });

  it('lastWornDate는 가장 최근 날짜를 준다', () => {
    const log: WornEntry[] = [
      { outfitId: 'om-01', date: '2026-07-30' },
      { outfitId: 'om-01', date: '2026-08-02' },
      { outfitId: 'om-02', date: '2026-08-03' },
    ];
    expect(lastWornDate('om-01', log)).toBe('2026-08-02');
    expect(lastWornDate('없는코디', log)).toBeNull();
  });
});
