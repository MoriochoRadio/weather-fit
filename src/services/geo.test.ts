import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isFavorite, loadFavorites, saveFavorites, toggleFavorite } from './geo';
import type { City } from '../types';

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

const YANGPYEONG: City = { name: '양평역', region: '영등포', latitude: 37.52556, longitude: 126.88611 };

describe('geo favorites', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMockStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('저장된 적 없으면 기본 즐겨찾기 3곳으로 시작한다', () => {
    const favs = loadFavorites();
    expect(favs.length).toBe(3);
    expect(favs.map((f) => f.name)).toEqual(['양평역', '병점', '관저동']);
  });

  it('저장된 목록이 있으면 그걸 반환한다', () => {
    saveFavorites([YANGPYEONG]);
    expect(loadFavorites()).toEqual([YANGPYEONG]);
  });

  it('손상된 JSON이면 기본값으로 폴백한다', () => {
    localStorage.setItem('weatherfit.favorites', '{ 이상한 데이터');
    expect(loadFavorites().length).toBe(3);
  });

  it('배열이 아니면 기본값으로 폴백한다', () => {
    localStorage.setItem('weatherfit.favorites', JSON.stringify({ not: 'an array' }));
    expect(loadFavorites().length).toBe(3);
  });

  it('배열 안에 유효하지 않은 항목은 걸러낸다', () => {
    localStorage.setItem('weatherfit.favorites', JSON.stringify([YANGPYEONG, { name: '이름만있음' }, null]));
    expect(loadFavorites()).toEqual([YANGPYEONG]);
  });

  it('isFavorite: 이름·지역이 같으면 true', () => {
    expect(isFavorite(YANGPYEONG, [YANGPYEONG])).toBe(true);
    expect(isFavorite({ ...YANGPYEONG, name: '다른역' }, [YANGPYEONG])).toBe(false);
  });

  it('toggleFavorite: 없으면 추가하고 저장한다', () => {
    const next = toggleFavorite(YANGPYEONG, []);
    expect(next).toEqual([YANGPYEONG]);
    expect(loadFavorites()).toEqual([YANGPYEONG]);
  });

  it('toggleFavorite: 있으면 제거하고 저장한다', () => {
    const next = toggleFavorite(YANGPYEONG, [YANGPYEONG]);
    expect(next).toEqual([]);
    expect(loadFavorites()).toEqual([]);
  });
});
