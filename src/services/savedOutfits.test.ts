import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadSavedOutfitIds, toggleSavedOutfit } from './savedOutfits';

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

describe('savedOutfits', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMockStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('저장된 적 없으면 빈 배열', () => {
    expect(loadSavedOutfitIds()).toEqual([]);
  });

  it('toggleSavedOutfit: 없으면 추가하고 저장한다', () => {
    const next = toggleSavedOutfit('om-01', []);
    expect(next).toEqual(['om-01']);
    expect(loadSavedOutfitIds()).toEqual(['om-01']);
  });

  it('toggleSavedOutfit: 있으면 제거하고 저장한다', () => {
    const next = toggleSavedOutfit('om-01', ['om-01', 'om-02']);
    expect(next).toEqual(['om-02']);
    expect(loadSavedOutfitIds()).toEqual(['om-02']);
  });

  it('배열이 아니면 빈 배열로 폴백한다', () => {
    localStorage.setItem('weatherfit.savedOutfits', JSON.stringify({ not: 'an array' }));
    expect(loadSavedOutfitIds()).toEqual([]);
  });

  it('배열 안에 문자열이 아닌 항목은 걸러낸다', () => {
    localStorage.setItem('weatherfit.savedOutfits', JSON.stringify(['om-01', 42, null]));
    expect(loadSavedOutfitIds()).toEqual(['om-01']);
  });

  it('손상된 JSON이면 빈 배열로 폴백한다', () => {
    localStorage.setItem('weatherfit.savedOutfits', '{ 이상한 데이터');
    expect(loadSavedOutfitIds()).toEqual([]);
  });
});
