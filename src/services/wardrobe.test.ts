import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadMissingTerms, toggleMissingTerm } from './wardrobe';

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

describe('wardrobe — 가진 옷 체크 (FR-33)', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMockStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('처음엔 비어 있다', () => {
    expect(loadMissingTerms()).toEqual([]);
  });

  it('없다고 표시했다 취소하면 원래대로 돌아온다', () => {
    const a = toggleMissingTerm('발마칸 코트', []);
    expect(a).toEqual(['발마칸 코트']);
    expect(loadMissingTerms()).toEqual(['발마칸 코트']);

    const b = toggleMissingTerm('발마칸 코트', a);
    expect(b).toEqual([]);
    expect(loadMissingTerms()).toEqual([]);
  });

  it('여러 개를 담을 수 있다', () => {
    let terms = toggleMissingTerm('발마칸 코트', []);
    terms = toggleMissingTerm('시어서커', terms);
    expect(terms).toHaveLength(2);
  });

  it('깨진 값이 저장돼 있어도 빈 배열로 회복한다', () => {
    localStorage.setItem('weatherfit.missingItems', '{not json');
    expect(loadMissingTerms()).toEqual([]);
    localStorage.setItem('weatherfit.missingItems', JSON.stringify(['ok', 3, null]));
    expect(loadMissingTerms()).toEqual(['ok']);
  });
});
