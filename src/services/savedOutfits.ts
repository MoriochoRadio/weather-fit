// 마음에 든 코디를 지역처럼 즐겨찾기에 담아 톤/기온 필터와 무관하게 다시 볼 수 있게 한다 (FR-26)
const STORAGE_KEY = 'weatherfit.savedOutfits';

export function loadSavedOutfitIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as unknown;
    if (!Array.isArray(list)) return [];
    return list.filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}

function saveOutfitIds(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // 저장 실패는 치명적이지 않음
  }
}

/** 즐겨찾기에 있으면 빼고, 없으면 더한 새 목록을 반환 (저장까지 수행) */
export function toggleSavedOutfit(outfitId: string, ids: string[]): string[] {
  const next = ids.includes(outfitId) ? ids.filter((id) => id !== outfitId) : [...ids, outfitId];
  saveOutfitIds(next);
  return next;
}
