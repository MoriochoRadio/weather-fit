import type { Outfit } from '../types';
import { OUTFITS } from '../data/outfits';
import { COLOR_FAMILIES, familyById, familyOfText, type ColorFamily } from '../data/colorFamilies';

/**
 * 상하의 색 조합 판정 엔진 (FR-36).
 *
 * "어떤 상의에 어떤 하의 색이 맞나"는 이 앱을 쓰는 사람이 코디를 고를 때가 아니라
 * **자기 옷장을 열었을 때** 던지는 질문이다. 그래서 추천된 코디와 별개로, 색 두 개만
 * 놓고 답할 수 있어야 한다.
 *
 * 조합표를 손으로 적지 않고 규칙으로 만든 이유:
 *   - 15색이면 225칸이고, 색을 하나 늘릴 때마다 31칸이 늘어난다. 손으로는 유지되지 않는다.
 *   - 사람에게 돌려줄 답이 "좋다/나쁘다"가 아니라 **왜 그런지**여야 하는데,
 *     규칙으로 만들면 판정과 이유가 자동으로 같은 근거를 가리킨다.
 *
 * 규칙은 세 가지만 본다 — 이 세 가지가 옷에서 실제로 눈에 띄는 순서다.
 *   1) 명도차: 위아래가 갈라져 보이는가 (가장 크게 작용한다)
 *   2) 색의 개수: 시선을 끄는 색이 몇 군데인가 (한 곳이면 포인트, 두 곳이면 다툰다)
 *   3) 계열: 쿨/웜이 섞였는가
 */

export type PairRating = 'best' | 'good' | 'careful';

export const RATING_LABELS: Record<PairRating, string> = {
  best: '잘 어울려요',
  good: '무난해요',
  careful: '조심해서',
};

export interface PairVerdict {
  top: ColorFamily;
  bottom: ColorFamily;
  rating: PairRating;
  /** 한 줄 결론 */
  headline: string;
  /** 왜 그런지 — 위 세 축 순서대로 */
  reasons: string[];
  /** 이렇게 하면 더 나아진다 */
  tip: string;
  /** 명도차 0~100 */
  contrast: number;
  /** 널리 통하는 정석 조합인지 — 목록에서 먼저 보여준다 */
  classic: boolean;
}

const TONE_WORD: Record<ColorFamily['tone'], string> = { cool: '쿨톤', warm: '웜톤', neutral: '무채색' };

/**
 * 정석 조합 — 규칙만으로는 "맞긴 한데 왜 유명한지"까지 설명되지 않는 조합들.
 * 등급을 끌어올리지는 않고(규칙을 못 믿게 된다) 한 줄 설명만 덧붙인다.
 * 다만 규칙이 careful로 본 조합은 정석에 넣지 않는다 — 서로 다른 말을 하게 된다.
 */
const CLASSICS: Record<string, string> = {
  'white|navy': '흰 셔츠에 네이비 슬랙스 — 가장 오래 통한 기본형입니다.',
  'white|charcoal': '흰 상의에 차콜 하의 — 어디에 입고 가도 실패하지 않습니다.',
  'lightgray|navy': '밝은 회색 니트에 네이비 팬츠 — 정장 아닌 자리의 기본형.',
  'navy|gray': '네이비 위에 회색 아래 — 남성복에서 가장 많이 쓰이는 조합입니다.',
  'iceblue|navy': '옅은 하늘색에 네이비 — 같은 파랑 계열로 깊이만 다르게 준 배치.',
  'white|denim': '흰 상의에 청바지 — 계절을 안 타는 조합입니다.',
  'oatmeal|charcoal': '미색 니트에 차콜 팬츠 — 겨울에 가장 편한 조합.',
  'camel|navy': '캐멀 니트에 네이비 팬츠 — 웜톤 하나만 위에 얹는 정석 배치.',
  'burgundy|gray': '버건디 니트에 회색 팬츠 — 강한 색을 한 곳으로 끝내는 방법.',
  'cream|olive': '크림에 올리브 — 둘 다 가라앉은 색이라 조용하게 맞습니다.',
  'black|lightgray': '검정 위에 밝은 회색 아래 — 대비가 확실해 또렷합니다.',
};

function key(topId: string, bottomId: string): string {
  return `${topId}|${bottomId}`;
}

/** 색 두 개를 놓고 판정한다. 상의·하의 순서가 결과에 영향을 준다(밝기 배치가 다르므로) */
export function pairColors(top: ColorFamily, bottom: ColorFamily): PairVerdict {
  const contrast = Math.abs(top.value - bottom.value);
  const reasons: string[] = [];
  let score = 0;

  // ── 1) 명도차 ──
  if (top.id === bottom.id) {
    score += 1;
    reasons.push('위아래가 같은 색이라 한 벌(셋업)처럼 정돈돼 보여요.');
  } else if (contrast >= 40) {
    score += 3;
    reasons.push(`밝기 차이가 크게 나서(${contrast}단계) 위아래가 또렷하게 갈립니다.`);
  } else if (contrast >= 20) {
    score += 2;
    reasons.push(`밝기 차이가 적당해서(${contrast}단계) 자연스럽게 나뉘어요.`);
  } else if (contrast >= 10) {
    score += 1;
    reasons.push('밝기 차이가 크진 않아 차분하게 이어집니다.');
  } else {
    score -= 2;
    reasons.push('밝기가 거의 같아 위아래 경계가 뭉개져 보입니다.');
  }

  // ── 2) 색의 개수 · 3) 계열 ──
  const colored = [top, bottom].filter((c) => c.chroma !== 'none');
  const strong = colored.filter((c) => c.chroma === 'mid').length;
  const sameTone = top.tone === bottom.tone;

  if (colored.length === 0) {
    score += 1;
    reasons.push('둘 다 무채색이라 실패할 일이 거의 없습니다.');
  } else if (colored.length === 1) {
    score += 2;
    reasons.push(`${colored[0].label} 한 곳만 색이 있어 그 자리가 자연스러운 포인트가 됩니다.`);
  } else if (sameTone) {
    score += strong === 2 ? 0 : 1;
    reasons.push(
      strong === 2
        ? `둘 다 ${TONE_WORD[top.tone]}이지만 색이 센 편이라, 밝기 차이를 확실히 둬야 묶입니다.`
        : `둘 다 ${TONE_WORD[top.tone]} 계열이라 톤이 어긋나지 않습니다.`,
    );
  } else {
    score += strong >= 2 ? -3 : -1;
    reasons.push(
      strong >= 2
        ? '쿨톤과 웜톤이 섞인 데다 둘 다 색이 세서 서로 시선을 뺏습니다.'
        : '쿨톤과 웜톤이 섞여 있어 다른 아이템으로 중재가 필요합니다.',
    );
  }

  // 같은 계열의 다른 색을 비슷한 밝기로 붙이면 "맞춘 게 아니라 잘못 맞춘 것"처럼 보인다
  if (colored.length === 2 && top.id !== bottom.id && sameTone && contrast < 18) {
    score -= 2;
    reasons.push('같은 계열인데 색이 미묘하게 달라, 맞추려다 어긋난 것처럼 보이기 쉽습니다.');
  }

  const rating: PairRating = score >= 4 ? 'best' : score >= 2 ? 'good' : 'careful';
  const classic = rating !== 'careful' && key(top.id, bottom.id) in CLASSICS;

  return {
    top,
    bottom,
    rating,
    headline: classic ? CLASSICS[key(top.id, bottom.id)] : headlineFor(rating, colored, sameTone, contrast, top),
    reasons,
    tip: tipFor(top, bottom, contrast, colored, rating),
    contrast,
    classic,
  };
}

function headlineFor(
  rating: PairRating,
  colored: ColorFamily[],
  sameTone: boolean,
  contrast: number,
  top: ColorFamily,
): string {
  if (rating === 'best') {
    if (colored.length === 0) return '무채색 대비만으로 딱 떨어지는 조합입니다.';
    if (colored.length === 1) return `${colored[0].label}가 혼자 포인트를 맡아 또렷한 조합입니다.`;
    return '같은 계열끼리 깊이만 달리 준, 차분하면서 심심하지 않은 조합입니다.';
  }
  if (rating === 'good') {
    if (contrast < 12) return '한 벌처럼 이어지는 조합 — 소재나 신발로 변화를 주면 좋습니다.';
    return '튀지 않고 무난하게 굴러가는 조합입니다.';
  }
  if (contrast < 10) return '밝기가 붙어 밋밋해지기 쉬운 조합입니다.';
  if (!sameTone && colored.length === 2) return '계열이 어긋나 손이 많이 가는 조합입니다.';
  return `${top.label} 상의 쪽을 다른 색으로 바꾸는 편이 쉽습니다.`;
}

function tipFor(
  top: ColorFamily,
  bottom: ColorFamily,
  contrast: number,
  colored: ColorFamily[],
  rating: PairRating,
): string {
  if (rating === 'careful' && contrast < 10) {
    return '둘 중 한쪽을 두세 단계 밝거나 어두운 색으로 바꾸면 바로 정리됩니다. 벨트나 셔츠 깃으로 선을 하나 넣어도 됩니다.';
  }
  if (rating === 'careful' && colored.length === 2) {
    return '한쪽을 무채색(화이트·그레이·차콜)으로 바꾸면 나머지 색이 살아납니다. 그대로 가려면 신발·가방을 무채색으로 통일하세요.';
  }
  if (bottom.value - top.value >= 25) {
    return '아래가 더 밝아 시선이 아래로 갑니다 — 신발을 하의와 비슷한 밝기로 맞추면 정리돼요.';
  }
  if (top.value - bottom.value >= 25) {
    return '위가 밝고 아래가 어두운 가장 안정적인 배치입니다. 신발은 하의보다 어둡게 가면 깔끔해요.';
  }
  if (colored.length === 1) {
    return `${colored[0].label}가 유일한 색이니 신발·가방은 무채색으로 두세요.`;
  }
  return '밝기 차이가 크지 않으니 소재를 다르게(니트 + 매끈한 슬랙스) 가면 경계가 살아납니다.';
}

/** 상의 색 하나에 대한 하의 색 전체 판정 — 등급 높은 순, 같은 등급이면 정석 조합 먼저 */
export function rankBottoms(topId: string): PairVerdict[] {
  const top = familyById(topId);
  if (!top) return [];
  const order: Record<PairRating, number> = { best: 0, good: 1, careful: 2 };
  return COLOR_FAMILIES.map((bottom) => pairColors(top, bottom)).sort(
    (a, b) =>
      order[a.rating] - order[b.rating] ||
      Number(b.classic) - Number(a.classic) ||
      b.contrast - a.contrast,
  );
}

/** 전체 조합표 — 행이 상의, 열이 하의 */
export function pairMatrix(): PairVerdict[][] {
  return COLOR_FAMILIES.map((top) => COLOR_FAMILIES.map((bottom) => pairColors(top, bottom)));
}

/** 코디의 상·하의·신발이 각각 어느 색 계열인지 (실루엣과 같은 색 추출 규칙을 쓴다) */
export function outfitColors(outfit: Outfit): { top: ColorFamily; bottom: ColorFamily; shoes: ColorFamily } {
  const top = familyOfText(outfit.items.top, '#c8ccd2');
  // "동일 톤 팬츠"는 색 이름 대신 상의 색을 이어받는다는 뜻 — silhouette.ts와 같은 규칙
  const bottomFallback = outfit.items.bottom.includes('동일') ? top.hex : '#8b8f98';
  return {
    top,
    bottom: familyOfText(outfit.items.bottom, bottomFallback),
    shoes: familyOfText(outfit.items.shoes, '#3c3f45'),
  };
}

/** 이 색 조합을 실제로 쓰고 있는 내장 코디 — "그래서 뭘 입으라는 건지"로 이어 준다 */
export function outfitsWithPair(topId: string, bottomId: string): Outfit[] {
  return OUTFITS.filter((o) => {
    const p = outfitColors(o);
    return p.top.id === topId && p.bottom.id === bottomId;
  });
}

/* ───────────────────────── 신발 색 (FR-38) ───────────────────────── */

/**
 * 신발로 고를 수 있는 색.
 *
 * 15색 전부를 신발로 내놓으면 "아이스블루 구두" 같은 현실에 없는 선택지가 생긴다.
 * 내장 코디 75벌이 실제로 쓰는 색(블랙 34 · 브라운 17 · 화이트 15 · 네이비 6 · 그레이 3)에
 * 남성 구두·스니커에서 흔한 캐멀·버건디·베이지·올리브를 더한 범위로 좁혔다.
 */
export const SHOE_FAMILY_IDS = [
  'black',
  'charcoal',
  'gray',
  'lightgray',
  'white',
  'navy',
  'brown',
  'camel',
  'burgundy',
  'beige',
  'olive',
];

export const SHOE_FAMILIES: ColorFamily[] = SHOE_FAMILY_IDS.map((id) => familyById(id)).filter(
  (f): f is ColorFamily => !!f,
);

/**
 * 신발에서는 무채색처럼 취급하는 가죽 색.
 *
 * 상하의였다면 캐멀·브라운·버건디는 "존재감 있는 웜톤"이라 쿨톤과 부딪힌다고 봐야 하지만,
 * 신발에서는 그렇지 않다 — 남성 구두의 기본 가죽 색이라 눈이 이것들을 색으로 읽지 않는다.
 * 이 예외가 없으면 "네이비 슬랙스 + 브라운 구두"라는 가장 오래 통한 조합이 '조심해서'로 떨어진다.
 */
const LEATHER_NEUTRALS = new Set(['brown', 'camel', 'burgundy']);

/** 신발이 하의보다 이만큼 밝아지면 시선이 발로 몰린다 */
const SHOE_LIFT_LIMIT = 25;

/** 흰색 대신 쓰는 밝은 저채색 — 크림·오트밀·베이지·아이스블루. 눈이 색으로 세지 않는다 */
function isOffWhite(c: ColorFamily): boolean {
  return c.chroma === 'low' && c.value >= 78;
}

export interface ShoeVerdict {
  shoes: ColorFamily;
  rating: PairRating;
  headline: string;
  reasons: string[];
  tip: string;
  /** 널리 통하는 발끝 조합인지 */
  classic: boolean;
}

/** 정석 발끝 — 규칙이 통과시킨 조합에만 설명을 덧붙인다 (상하의 CLASSICS와 같은 방침) */
const CLASSIC_SHOES: Record<string, string> = {
  'navy|brown': '네이비 슬랙스에 브라운 구두 — 남성복에서 가장 오래 통한 발끝입니다.',
  'charcoal|black': '차콜 팬츠에 블랙 구두 — 격식이 필요한 자리의 기본형.',
  'navy|white': '네이비 팬츠에 흰 스니커 — 계절을 안 타는 캐주얼 기본형.',
  'beige|brown': '베이지 치노에 브라운 구두 — 같은 계열로 아래를 눌러 준 배치.',
  'gray|black': '회색 팬츠에 블랙 구두 — 무채색만으로 딱 떨어집니다.',
  'denim|white': '청바지에 흰 스니커 — 더 설명할 게 없는 조합.',
  'olive|brown': '올리브 팬츠에 브라운 구두 — 둘 다 가라앉은 색이라 조용히 맞습니다.',
};

/**
 * 상하의가 정해진 상태에서 신발 색을 판정한다 (FR-38).
 *
 * 상하의 판정(pairColors)과 규칙을 나눈 이유: 신발은 **면적이 작고 맨 아래에 있다**.
 * 같은 밝기 차이라도 상하의에서는 "갈라 보이는가"의 문제지만 신발에서는 "아래가 잡히는가"의
 * 문제이고, 색이 하나 더 붙는다는 점에서 개수 계산도 달라진다. 한 함수에 욱여넣으면
 * 두 규칙이 서로를 갉아먹는다.
 */
export function judgeShoes(top: ColorFamily, bottom: ColorFamily, shoes: ColorFamily): ShoeVerdict {
  const reasons: string[] = [];
  let score = 0;

  /** 신발이 하의보다 얼마나 밝은가 (양수면 신발이 더 밝다) */
  const lift = shoes.value - bottom.value;
  const achromatic = shoes.chroma === 'none';
  /**
   * 가죽 예외는 **계열 판단에만** 건다.
   * 처음엔 "색 개수" 계산에도 걸었더니 버건디 구두가 색으로 세어지지 않아, 무채색 상하의에
   * 버건디를 신어도 "신발만 색을 갖는다"는 판단이 나오지 않았다 (QA). 눈이 계열로 안 읽는 것과
   * 색이 아닌 것은 다르다.
   */
  const leather = LEATHER_NEUTRALS.has(shoes.id);

  // ── 1) 아래가 잡히는가 ──
  if (achromatic && lift > 0 && shoes.value >= 80) {
    score += 1;
    reasons.push('밝은 무채색 신발이라 전체가 가벼워집니다 — 캐주얼 쪽으로 기웁니다.');
  } else if (lift <= -5) {
    score += 2;
    reasons.push('하의보다 어두워서 아래가 안정적으로 잡힙니다.');
  } else if (lift < SHOE_LIFT_LIMIT) {
    score += 1;
    reasons.push('하의와 밝기가 비슷해 다리에서 신발로 자연스럽게 이어집니다.');
  } else if (achromatic) {
    score += 1;
    reasons.push('하의보다 밝지만 무채색이라 튀지 않습니다.');
  } else {
    score -= 2;
    reasons.push('하의보다 밝은 색 신발이라 시선이 발끝으로 몰립니다.');
  }

  // ── 2) 색이 몇 개가 되는가 ──
  /**
   * 이미 위에 쓰인 색들. 여기서 두 가지를 세지 않는다.
   *   - **밝은 저채색**(크림·오트밀·베이지·아이스블루): 눈은 이걸 색이 아니라 "흰색의 변주"로 읽는다.
   *     세었더니 "크림 니트 + 네이비 팬츠 + 브라운 구두"처럼 지극히 평범한 조합이 "색이 셋"으로
   *     걸려, 내장 코디 75벌 중 6벌이 자기 신발에 경고를 받았다 (QA).
   *   - **이미 쓴 색과 같은 색**: 신발이 상·하의 색을 되받는 건 색을 늘리는 게 아니라 반복이다.
   */
  const paletteAbove = new Set(
    [top, bottom].filter((c) => c.chroma !== 'none' && !isOffWhite(c)).map((c) => c.id),
  );
  if (achromatic || isOffWhite(shoes)) {
    score += 1;
    reasons.push('색은 상하의에서 끝나고 신발이 정리해 주는 자리입니다.');
  } else if (paletteAbove.has(shoes.id)) {
    score += 1;
    reasons.push('이미 위에 쓴 색이라 색이 늘지 않습니다.');
  } else if (paletteAbove.size === 0) {
    score += 2;
    reasons.push('상하의가 무채색이라 신발만 색을 갖고, 그 자리가 포인트가 됩니다.');
  } else if (paletteAbove.size === 1) {
    score += 1;
    reasons.push('색이 둘까지는 감당되지만, 가방·벨트는 무채색으로 두세요.');
  } else {
    score -= 2;
    reasons.push('상·하의에 이미 색이 둘인데 신발까지 색이 있어 셋이 됩니다.');
  }

  // ── 3) 위와 호응하는가 ──
  if (shoes.id === top.id) {
    score += 1;
    reasons.push(`${shoes.label}를 발에서 한 번 더 반복해 위아래가 하나로 묶입니다.`);
  } else if (!achromatic && shoes.tone !== 'neutral' && shoes.tone === top.tone && top.chroma !== 'none') {
    score += 1;
    reasons.push('상의와 같은 계열이라 위아래가 이어져 보입니다.');
  }

  // ── 4) 하의와 미묘하게 어긋나는가 ──
  // 가죽 신발은 면제한다 — 소재가 이미 다르므로 "맞추려다 어긋난" 것으로 읽히지 않는다
  // (브라운 구두 + 올리브 팬츠가 여기 걸리면 정석 조합이 경고로 떨어진다)
  if (
    !achromatic &&
    !leather &&
    bottom.chroma !== 'none' &&
    shoes.id !== bottom.id &&
    shoes.tone === bottom.tone &&
    Math.abs(lift) < 12
  ) {
    score -= 2;
    reasons.push('하의와 같은 계열인데 색이 미묘하게 달라, 맞추려다 어긋난 것처럼 보입니다.');
  }

  // ── 5) 계열이 부딪히는가 (가죽 색은 면제) ──
  if (!achromatic && !leather && bottom.tone !== 'neutral' && shoes.tone !== bottom.tone) {
    score -= 2;
    reasons.push('하의와 쿨웜 계열이 어긋나는데, 가죽 본연의 색도 아니라 눈에 걸립니다.');
  }

  const rating: PairRating = score >= 3 ? 'best' : score >= 1 ? 'good' : 'careful';
  const classicKey = `${bottom.id}|${shoes.id}`;
  const classic = rating !== 'careful' && classicKey in CLASSIC_SHOES;

  return {
    shoes,
    rating,
    headline: classic ? CLASSIC_SHOES[classicKey] : shoeHeadline(rating, shoes, bottom, lift, achromatic),
    reasons,
    tip: shoeTip(top, bottom, shoes, lift, achromatic),
    classic,
  };
}

function shoeHeadline(
  rating: PairRating,
  shoes: ColorFamily,
  bottom: ColorFamily,
  lift: number,
  achromatic: boolean,
): string {
  if (rating === 'best') {
    if (lift <= -10) return `${bottom.label} 하의를 ${shoes.label} 신발이 아래에서 눌러 주는 조합입니다.`;
    if (!achromatic) return `${shoes.label}가 발끝에서 유일한 색을 맡는 조합입니다.`;
    return '위아래를 건드리지 않고 깔끔하게 마무리되는 신발입니다.';
  }
  if (rating === 'good') return '무난하게 신을 수 있는 색입니다.';
  if (lift >= SHOE_LIFT_LIMIT) return '발끝이 하의보다 밝아 시선을 끌어가는 조합입니다.';
  return '이 상하의에는 손이 많이 가는 신발 색입니다.';
}

function shoeTip(
  top: ColorFamily,
  bottom: ColorFamily,
  shoes: ColorFamily,
  lift: number,
  achromatic: boolean,
): string {
  if (lift >= SHOE_LIFT_LIMIT && !achromatic) {
    return `${bottom.label}보다 어두운 색(블랙·차콜·브라운)으로 바꾸면 바로 정리됩니다. 그대로 가려면 상의에 같은 색을 한 번 더 넣어 주세요.`;
  }
  if (!achromatic && [top, bottom].filter((c) => c.chroma !== 'none').length >= 2) {
    return '가방·벨트·양말은 전부 무채색으로 두세요. 색이 넷이 되면 수습이 어렵습니다.';
  }
  if (shoes.id === bottom.id) {
    return '하의와 같은 색이라 다리가 길어 보입니다. 양말도 같은 색으로 맞추면 선이 더 이어져요.';
  }
  if (shoes.value >= 80) {
    return '밝은 신발은 때가 바로 보입니다 — 비 오는 날이나 흙길에는 피하는 편이 낫습니다.';
  }
  return '양말은 하의 색에 맞추면 다리에서 신발까지 선이 끊기지 않습니다.';
}

/** 상하의가 정해진 상태에서 신발 색 전체를 등급순으로 (같은 등급이면 정석 먼저) */
export function rankShoes(topId: string, bottomId: string): ShoeVerdict[] {
  const top = familyById(topId);
  const bottom = familyById(bottomId);
  if (!top || !bottom) return [];
  const order: Record<PairRating, number> = { best: 0, good: 1, careful: 2 };
  return SHOE_FAMILIES.map((shoes) => judgeShoes(top, bottom, shoes)).sort(
    (a, b) => order[a.rating] - order[b.rating] || Number(b.classic) - Number(a.classic),
  );
}
