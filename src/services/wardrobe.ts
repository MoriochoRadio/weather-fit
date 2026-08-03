// 가진 옷 체크 (FR-33).
// 용어 풀이에 이미 "없으면 ○○로 대체" 데이터가 있으므로, 사용자가 "이건 없어요"를 눌러 두면
// 다음부터 그 아이템은 대체제를 앞세워 보여준다 — 패션 용어에 익숙하지 않은 사용자가
// 매번 풀이를 펼쳐 대체제를 찾아 읽지 않아도 되게 하는 것이 목적이다.
const STORAGE_KEY = 'weatherfit.missingItems';

export function loadMissingTerms(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as unknown;
    if (!Array.isArray(list)) return [];
    return list.filter((t): t is string => typeof t === 'string');
  } catch {
    return [];
  }
}

function save(terms: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(terms));
  } catch {
    // 저장 실패는 치명적이지 않음
  }
}

/** "이 아이템 없음" 표시를 켜고 끈다 (저장까지 수행) */
export function toggleMissingTerm(term: string, terms: string[]): string[] {
  const next = terms.includes(term) ? terms.filter((t) => t !== term) : [...terms, term];
  save(next);
  return next;
}
