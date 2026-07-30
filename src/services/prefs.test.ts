import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadSavedStyle, loadSavedTone, saveStyle, saveTone } from './prefs';

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

describe('prefs', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMockStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('저장된 적 없으면 null', () => {
    expect(loadSavedStyle()).toBeNull();
    expect(loadSavedTone()).toBeNull();
  });

  it('저장한 스타일·톤을 그대로 불러온다', () => {
    saveStyle('casual');
    saveTone('warm');
    expect(loadSavedStyle()).toBe('casual');
    expect(loadSavedTone()).toBe('warm');
  });

  it('유효하지 않은 값은 null로 폴백한다', () => {
    localStorage.setItem('weatherfit.style', '이상한값');
    localStorage.setItem('weatherfit.tone', '이상한값');
    expect(loadSavedStyle()).toBeNull();
    expect(loadSavedTone()).toBeNull();
  });
});
