// 입은 코디 기록 (FR-32).
// "오늘 이거 입었어요"를 눌러 두면 같은 옷을 연달아 입는 걸 피할 수 있고,
// 자주 입는 스타일을 앞으로 끌어올리는 데도 쓸 수 있다.
const STORAGE_KEY = 'weatherfit.worn';
/** 기록 보관 개수 상한 — localStorage를 무한정 불리지 않기 위한 안전장치 */
const MAX_ENTRIES = 200;

export interface WornEntry {
  outfitId: string;
  /** YYYY-MM-DD */
  date: string;
}

function isEntry(v: unknown): v is WornEntry {
  const e = v as Partial<WornEntry> | null;
  return !!e && typeof e.outfitId === 'string' && typeof e.date === 'string';
}

export function loadWornLog(): WornEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as unknown;
    if (!Array.isArray(list)) return [];
    return list.filter(isEntry);
  } catch {
    return [];
  }
}

function save(entries: WornEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    // 저장 실패는 치명적이지 않음
  }
}

/** 오늘 이 코디를 입었다고 기록했는지 */
export function isWornOn(outfitId: string, date: string, log: WornEntry[]): boolean {
  return log.some((e) => e.outfitId === outfitId && e.date === date);
}

/** 같은 날 같은 코디 기록을 켜고 끈다 (저장까지 수행) */
export function toggleWorn(outfitId: string, date: string, log: WornEntry[]): WornEntry[] {
  const next = isWornOn(outfitId, date, log)
    ? log.filter((e) => !(e.outfitId === outfitId && e.date === date))
    : [...log, { outfitId, date }];
  save(next);
  return next;
}

/**
 * 최근 며칠 안에 입은 코디 id 집합 — 오늘 추천에서 뒤로 미는 데 쓴다.
 * `date`(오늘) 기준으로 `days`일 이내(오늘 제외)를 센다.
 */
export function recentlyWornIds(log: WornEntry[], date: string, days = 5): Set<string> {
  const today = Date.parse(`${date}T00:00:00`);
  if (Number.isNaN(today)) return new Set();
  const ids = new Set<string>();
  for (const e of log) {
    if (e.date === date) continue; // 오늘 기록은 "최근에 입음"으로 치지 않는다
    const t = Date.parse(`${e.date}T00:00:00`);
    if (Number.isNaN(t)) continue;
    const gap = (today - t) / 86_400_000;
    if (gap > 0 && gap <= days) ids.add(e.outfitId);
  }
  return ids;
}

/** 이 코디를 마지막으로 입은 날 (기록이 없으면 null) */
export function lastWornDate(outfitId: string, log: WornEntry[]): string | null {
  let last: string | null = null;
  for (const e of log) {
    if (e.outfitId !== outfitId) continue;
    if (last === null || e.date > last) last = e.date;
  }
  return last;
}
