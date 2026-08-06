/**
 * 색 계열 사전 (FR-36 "색 조합 보기").
 *
 * colors.ts가 "아이템 문구 → hex"를 담당한다면 이쪽은 그 hex들을 **사람이 고를 수 있는 단위**로
 * 묶는다. 조합 판정은 색 이름이 아니라 아래 세 축(명도·채도·톤)만 보고 이뤄지므로,
 * 색을 추가해도 규칙을 고칠 필요가 없다.
 *
 * - value(명도): hex에서 계산한다. 손으로 적으면 색을 바꿨을 때 조용히 어긋난다.
 * - chroma(채도): 'none' 무채색 · 'low' 차분한 색 · 'mid' 존재감 있는 색.
 *   이 서비스는 강렬한 원색을 다루지 않으므로 'high'는 없다 (FR-14).
 * - tone: 쿨/웜/무채색. 무채색은 어느 쪽과도 섞인다.
 */
import { extractColor } from './colors';

export type Chroma = 'none' | 'low' | 'mid';
export type FamilyTone = 'cool' | 'warm' | 'neutral';

export interface ColorFamily {
  id: string;
  label: string;
  hex: string;
  tone: FamilyTone;
  chroma: Chroma;
  /** 0(가장 어두움) ~ 100(가장 밝음) — hex에서 계산한 체감 밝기 */
  value: number;
  /** 일반인 눈높이 한 줄 — "이게 무슨 색이더라"를 없앤다 */
  note: string;
}

/** 사람이 느끼는 밝기 (ITU-R BT.601) — 실루엣 디테일 선 색과 같은 기준을 쓴다 */
export function lightnessOf(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return 50;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return Math.round(((0.299 * r + 0.587 * g + 0.114 * b) / 255) * 100);
}

type FamilySeed = Omit<ColorFamily, 'value'>;

const SEEDS: FamilySeed[] = [
  // ── 무채색 ──
  { id: 'white', label: '화이트', hex: '#f6f8f9', tone: 'neutral', chroma: 'none', note: '가장 밝은 기본색. 어디에 붙여도 받아 줍니다.' },
  { id: 'lightgray', label: '라이트그레이', hex: '#c8ccd2', tone: 'neutral', chroma: 'none', note: '흰색보다 부드럽고 때가 덜 타 보이는 밝은 회색.' },
  { id: 'gray', label: '미디엄그레이', hex: '#8b8f98', tone: 'neutral', chroma: 'none', note: '딱 중간 밝기의 회색. 위아래 어디에 써도 무난합니다.' },
  { id: 'charcoal', label: '차콜', hex: '#3c3f45', tone: 'neutral', chroma: 'none', note: '검정보다 부드러운 진회색. 이 앱에서 가장 쓰기 쉬운 어두운 색.' },
  { id: 'black', label: '블랙', hex: '#15171b', tone: 'neutral', chroma: 'none', note: '가장 어두운 색. 다른 어두운 색과 붙이면 서로 죽습니다.' },

  // ── 쿨톤 ──
  { id: 'iceblue', label: '아이스블루', hex: '#cfdce8', tone: 'cool', chroma: 'low', note: '아주 옅은 하늘색. 흰색 대신 쓰면 얼굴이 시원해 보입니다.' },
  { id: 'denim', label: '데님블루', hex: '#41546e', tone: 'cool', chroma: 'low', note: '청바지의 중간 파랑. 하의로 가장 많이 쓰입니다.' },
  { id: 'navy', label: '네이비', hex: '#232f49', tone: 'cool', chroma: 'low', note: '어두운 남색. 검정보다 단정하고 얼굴이 덜 어두워 보입니다.' },

  // ── 웜톤 ──
  { id: 'cream', label: '크림', hex: '#efe6cf', tone: 'warm', chroma: 'low', note: '노란기가 도는 흰색. 흰색보다 따뜻하고 부드럽습니다.' },
  { id: 'oatmeal', label: '오트밀', hex: '#ded6c4', tone: 'warm', chroma: 'low', note: '크림보다 한 톤 가라앉은 미색. 니트에 잘 어울립니다.' },
  { id: 'beige', label: '베이지', hex: '#d8c9a3', tone: 'warm', chroma: 'low', note: '밝은 모래색. 치노 팬츠의 대표 색입니다.' },
  { id: 'camel', label: '캐멀', hex: '#b5915f', tone: 'warm', chroma: 'mid', note: '낙타털 색. 존재감이 있어 한 곳에만 쓰는 편이 좋습니다.' },
  { id: 'olive', label: '올리브', hex: '#5a5f46', tone: 'warm', chroma: 'low', note: '군용 느낌의 가라앉은 초록. 생각보다 조용한 색입니다.' },
  { id: 'brown', label: '브라운', hex: '#6b5138', tone: 'warm', chroma: 'mid', note: '진한 갈색. 어두운 편이라 위쪽보다 아래·신발에 쓰기 좋습니다.' },
  { id: 'burgundy', label: '버건디', hex: '#6d2734', tone: 'warm', chroma: 'mid', note: '와인색. 이 앱에서 가장 강한 색이라 한 곳으로 끝냅니다.' },
];

export const COLOR_FAMILIES: ColorFamily[] = SEEDS.map((s) => ({ ...s, value: lightnessOf(s.hex) }));

const BY_ID = new Map(COLOR_FAMILIES.map((f) => [f.id, f]));

export function familyById(id: string): ColorFamily | undefined {
  return BY_ID.get(id);
}

function rgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return [128, 128, 128];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** 색기(色氣)의 세기 — RGB 최대·최소 차. 0이면 완전한 무채색 */
function colorfulness(hex: string): number {
  const [r, g, b] = rgb(hex);
  return Math.max(r, g, b) - Math.min(r, g, b);
}

/**
 * 무채색인지 아닌지가 RGB 거리보다 중요해서 얹는 가중치.
 * 이게 없으면 #d9dde2(페일그레이)가 라이트그레이(거리 834)보다 아이스블루(137)에 가깝다고
 * 나온다 — 눈으로는 명백히 회색인데 파랑 칸에 들어가 버린다.
 */
const COLORFULNESS_WEIGHT = 3;

/**
 * 임의의 hex를 가장 가까운 계열로 접는다.
 *
 * colors.ts의 색 이름은 28개인데 여기 계열은 15개다 — '오프화이트'·'페일그레이'처럼
 * 실질적으로 같은 칸에 들어가는 색들을 하나로 묶어야 "이 조합을 쓴 코디" 연결이 성립한다.
 * 이름 대응표를 손으로 관리하면 색을 추가할 때마다 빠뜨리므로 자동 매칭한다.
 */
export function nearestFamily(hex: string): ColorFamily {
  const [r, g, b] = rgb(hex);
  const c = colorfulness(hex);
  let best = COLOR_FAMILIES[0];
  let bestDist = Infinity;
  for (const f of COLOR_FAMILIES) {
    const [fr, fg, fb] = rgb(f.hex);
    const dist =
      (r - fr) ** 2 + (g - fg) ** 2 + (b - fb) ** 2 + COLORFULNESS_WEIGHT * (c - colorfulness(f.hex)) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = f;
    }
  }
  return best;
}

/** 아이템 문구("차콜 캐시미어 코트") → 색 계열. 색 이름이 없으면 fallback hex로 판단한다 */
export function familyOfText(text: string, fallbackHex: string): ColorFamily {
  return nearestFamily(extractColor(text, fallbackHex));
}
