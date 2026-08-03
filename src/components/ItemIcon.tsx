import type { OutfitItems } from '../types';

export type IconId =
  // 아우터
  | 'coat'
  | 'puffer'
  | 'jacket'
  | 'cardigan'
  | 'shacket'
  // 상의
  | 'suit'
  | 'knit'
  | 'shirt'
  | 'tshirt'
  | 'longsleeve'
  // 하의
  | 'pants'
  | 'shorts'
  // 신발
  | 'dress-shoe'
  | 'sneaker'
  | 'boot'
  | 'sandal'
  // 액세서리
  | 'cap'
  | 'bag'
  | 'watch'
  | 'scarf'
  | 'belt'
  | 'glove'
  | 'tie'
  | 'umbrella'
  | 'acc';

/** 액세서리 문구 → 아이콘. 아래 배열 순서가 아니라 "문구에 먼저 나온 것"이 이긴다 */
const ACC_RULES: Array<[IconId, string[]]> = [
  ['cap', ['캡', '햇', '비니', '모자']],
  ['bag', ['백', '토트', '사코슈', '브리프케이스', '크로스']],
  ['watch', ['시계']],
  ['scarf', ['머플러', '스카프']],
  ['umbrella', ['우산']],
  ['tie', ['타이']],
  ['glove', ['장갑']],
  ['belt', ['벨트']],
];

/**
 * 아이템 텍스트 키워드 → 아이콘 매핑 (FR-16).
 * 액세서리가 "없음…"으로 시작하면 표시할 물건이 없다는 뜻이므로 null을 반환한다
 * (QA: "없음 — 비움이 포인트"인데 안경 아이콘이 붙던 문제).
 */
export function pickIcon(field: keyof OutfitItems, text: string): IconId | null {
  const has = (...keys: string[]) => keys.some((k) => text.includes(k));
  switch (field) {
    case 'outer':
      if (has('패딩', '다운', '파카')) return 'puffer';
      if (has('코트', '트렌치', '발마칸', '맥코트', '체스터필드')) return 'coat';
      if (has('가디건')) return 'cardigan';
      if (has('셔켓')) return 'shacket';
      // 니트 베스트처럼 걸쳐 입는 니트류는 가디건 모양이 가장 가깝다
      if (has('니트', '베스트')) return 'cardigan';
      if (has('셔츠')) return 'shacket';
      return 'jacket';
    case 'top':
      // 수트·블레이저가 가장 바깥에 보이는 층이므로 안에 받쳐 입은 셔츠·니트보다 우선한다
      // (QA: "수트 + 니트 타이"가 니트로, "수트 + 셔츠"가 셔츠로 판정되던 문제)
      if (has('수트', '블레이저', '턱시도')) return 'suit';
      // '티셔츠'는 '셔츠'를 포함하므로 셔츠 검사보다 먼저 걸러야 한다 (QA)
      if (has('반팔', '피케 폴로', '티셔츠')) return 'tshirt';
      if (has('니트', '터틀넥', '맨투맨', '후디', '스웻', '가디건')) return 'knit';
      if (has('셔츠')) return 'shirt';
      return 'longsleeve';
    case 'bottom':
      if (has('쇼츠', '버뮤다', '반바지')) return 'shorts';
      return 'pants';
    case 'shoes':
      if (has('부츠')) return 'boot';
      if (has('샌들')) return 'sandal';
      if (has('스니커', '트레이너', '슬립온', '운동화')) return 'sneaker';
      return 'dress-shoe';
    case 'acc': {
      if (text.startsWith('없음')) return null;
      let best: IconId | null = null;
      let bestPos = Infinity;
      for (const [id, keys] of ACC_RULES) {
        for (const k of keys) {
          const pos = text.indexOf(k);
          if (pos >= 0 && pos < bestPos) {
            bestPos = pos;
            best = id;
          }
        }
      }
      return best ?? 'acc';
    }
  }
}

/**
 * 20×20 라인 아이콘 — stroke가 currentColor라 테마 색을 그대로 따른다.
 * 작은 크기에서 서로 뭉개지지 않도록 종류마다 실루엣이나 디테일을 확실히 다르게 둔다
 * (QA: 구두/샌들이 같은 밑그림 + 사선 2개 차이라 18px에서 구분 불가했음).
 */
const PATHS: Record<IconId, JSX.Element> = {
  coat: (
    <>
      <path d="M7.4 2.2 5.8 3.9 4.3 5v12.6h2.9V8.2h5.6v9.4h2.9V5l-1.5-1.1-1.6-1.7Z" />
      <path d="M7.4 2.2 10 6.4l2.6-4.2" />
      <path d="M10 6.4v11.2" />
    </>
  ),
  puffer: (
    <>
      <path d="M7.5 2.2 6 3.9 4.4 5.1v11.7h4.2V9.1h2.8v7.7h4.2V5.1L14 3.9l-1.5-1.7Z" />
      <path d="M7.5 2.2 10 4.4l2.5-2.2" />
      <path d="M4.4 7.6h4.2m2.8 0h4.2M4.4 10.8h4.2m2.8 0h4.2M4.4 14h4.2m2.8 0h4.2" />
    </>
  ),
  jacket: (
    <>
      <path d="M7.5 2.2 6 3.9 4.2 5.1v6.6h2.8v3.6h6v-3.6h2.8V5.1L14 3.9l-1.5-1.7Z" />
      <path d="M7.5 2.2 10 4.4l2.5-2.2" />
      <path d="M7 13.6h6" />
      <path d="M10 4.4v10.9" />
    </>
  ),
  cardigan: (
    <>
      <path d="M7.2 2.4 5.6 4 4.2 5.2v11.2h3V8.6h5.6v7.8h3V5.2L14.4 4l-1.6-1.6Z" />
      <path d="M7.2 2.4 10 5.9l2.8-3.5" />
      <path d="M10 5.9v10.5" />
      <circle cx="10" cy="9.2" r=".6" fill="currentColor" stroke="none" />
      <circle cx="10" cy="12.4" r=".6" fill="currentColor" stroke="none" />
    </>
  ),
  shacket: (
    <>
      <path d="M7.2 2.4 5.6 4 4.2 5.2v11.2h3V8.6h5.6v7.8h3V5.2L14.4 4l-1.6-1.6Z" />
      <path d="M7.2 2.4 10 4.9l2.8-2.5" />
      <path d="M10 4.9v11.5" />
      <path d="M5.9 7.6h2.3v2.2H5.9Zm5.9 0h2.3v2.2h-2.3Z" />
    </>
  ),
  suit: (
    <>
      <path d="M7 2.5h6l2.4 1.8v6.6h-2.6v6.6H7.2v-6.6H4.6V4.3Z" />
      <path d="M7 2.5 10 7l3-4.5" />
      <path d="M10 7v10.5" />
      <path d="M6.6 11.4h2.6" />
    </>
  ),
  knit: (
    <>
      <path d="M7 2.6h6l2.4 1.8v5.2h-2.6v7.9H7.2V9.6H4.6V4.4Z" />
      <path d="M8 2.6c0 1.2.9 2.1 2 2.1s2-.9 2-2.1" />
      <path d="M4.6 8.6h2.6m5.6 0h2.6" />
      <path d="M7.2 15.2h5.6" />
    </>
  ),
  shirt: (
    <>
      <path d="M7 2.6h6l2.4 1.8v4.8h-2.6V17H7.2V9.2H4.6V4.4Z" />
      <path d="M7 2.6l3 3 3-3" />
      <path d="M10 5.6v11" />
      <circle cx="10" cy="9" r=".55" fill="currentColor" stroke="none" />
      <circle cx="10" cy="12" r=".55" fill="currentColor" stroke="none" />
    </>
  ),
  tshirt: (
    <>
      <path d="M7 2.8h6l3.4 2.6-1.7 2.7L12 7v10H8V7L5.3 8.1 3.6 5.4Z" />
      <path d="M8 2.8c0 1.1.9 2 2 2s2-.9 2-2" />
    </>
  ),
  longsleeve: (
    <>
      <path d="M7 2.6h6l2.4 1.8v6.6h-2.6V17H7.2v-6H4.6V4.4Z" />
      <path d="M8 2.6c0 1.2.9 2.1 2 2.1s2-.9 2-2.1" />
    </>
  ),
  // 바지·반바지는 같은 작도법(허리 → 밑단 → 가랑이)으로 그려 길이만 다르게 둔다
  pants: (
    <>
      <path d="M5.8 2.8h8.4l1.2 14.6h-3.7L10 8.4l-1.7 9H4.6Z" />
      <path d="M5.9 4.8h8.2" />
    </>
  ),
  shorts: (
    <>
      <path d="M5.6 3.6h8.8l1 9.4h-3.6L10 8.6l-1.8 4.4H4.6Z" />
      <path d="M5.7 5.7h8.6" />
    </>
  ),
  'dress-shoe': (
    <>
      <path d="M3.4 15c.1-1.4.5-3 .5-5.4h3.4l1.1 2c2.6.5 7.6.9 8.2 2.6.2.6-.1 1.2-.8 1.2H3.6c-.2 0-.3-.2-.2-.4Z" />
      <path d="M4.3 11.4h3.6M6 9.6l1.4 2" />
    </>
  ),
  sneaker: (
    <>
      <path d="M3.4 15c0-1.4.5-3.4.5-5.6l3.3.3 2 2.1c2.6.4 7.7.6 8.2 2.4.2.6-.1 1.3-.8 1.3H3.6c-.2 0-.3-.2-.2-.5Z" />
      <path d="m7.6 10.3-1.1 1.7M10 10.9l-1.1 1.7M3.9 9.5l3.3.4" />
      <path d="M3.5 15h13.6" />
    </>
  ),
  boot: (
    <>
      <path d="M7 2.4h5.4v6.7c1.1.3 4.8 1.1 4.8 3.5v3.4H7.4L7 14.3l1-1.7V2.4Z" />
      <path d="M7 15.4H4.6c-.9 0-1.6-.6-1.6-1.4s.7-1.4 1.6-1.4H7" />
      <path d="M7 9.1h5.4" />
    </>
  ),
  // 발등이 트인 밑창 + 스트랩 — 구두와 실루엣 자체가 다르다
  sandal: (
    <>
      <path d="M3.4 15.6h13.2a1.3 1.3 0 0 0 0-2.6H3.4a1.3 1.3 0 0 0 0 2.6Z" />
      <path d="M6.4 13 9.6 8l3.2 5" />
      <path d="M5.4 13 5.9 10.6" />
    </>
  ),
  cap: (
    <>
      <path d="M4 11.4a6 6 0 0 1 12 0v1H4Z" />
      <path d="M16 12c1.8.1 3 .9 3 2 0 .8-.7 1.3-1.6 1.3H8" />
      <path d="M10 5V3.5" />
      <circle cx="10" cy="2.4" r=".7" fill="currentColor" stroke="none" />
    </>
  ),
  bag: (
    <>
      <rect x="3.6" y="7.6" width="12.8" height="9.6" rx="1.2" />
      <path d="M6.8 7.6V5.8a3.2 3.2 0 0 1 6.4 0v1.8" />
      <path d="M3.6 11.2h12.8" />
    </>
  ),
  watch: (
    <>
      <circle cx="10" cy="10" r="4.6" />
      <path d="M10 7.4V10l2 1.3" />
      <path d="M8.3 5.4 8.6 2h2.8l.3 3.4M8.3 14.6l.3 3.4h2.8l.3-3.4" />
    </>
  ),
  scarf: (
    <>
      <path d="M5 5.6c0-1.9 2.2-3.2 5-3.2s5 1.3 5 3.2-2.2 3.2-5 3.2" />
      <path d="M10 8.8c-2.8 0-5 1.3-5 3.2v5.2l3-2 2 2 2-2 3 2v-5.2" />
    </>
  ),
  acc: (
    <>
      <circle cx="7.2" cy="10" r="3.4" />
      <circle cx="12.8" cy="10" r="3.4" />
      <path d="M9.6 10h.8" />
    </>
  ),
  belt: (
    <>
      <path d="M2.6 10h4.6M12.8 10h4.6" />
      <rect x="7.2" y="7.3" width="5.6" height="5.4" rx="0.8" />
      <path d="M10 7.3V5.6" />
    </>
  ),
  glove: (
    <>
      <path d="M6.2 18v-6.8a1.9 1.9 0 0 1 1.9-1.9h.2V6.1a1.2 1.2 0 1 1 2.4 0v3.2h.3V4.9a1.2 1.2 0 1 1 2.4 0v4.4h.3a1.9 1.9 0 0 1 1.9 1.9V18Z" />
      <path d="M6.2 12.5c-1.5 0-2.6.9-2.6 2.4V18h2.6" />
    </>
  ),
  tie: (
    <>
      <path d="M7.6 3.4h4.8l-1 3.4-1.4 1-1.4-1Z" />
      <path d="M8.6 7.8h2.8l1.3 8-2.7 2.6-2.7-2.6Z" />
    </>
  ),
  umbrella: (
    <>
      <path d="M3 10.4a7 7 0 0 1 14 0Z" />
      <path d="M3 10.4h14M6.5 10.4a3.5 5 0 0 1 7 0M10 3.4v1.4" />
      <path d="M10 10.4V16a1.6 1.6 0 0 1-1.6 1.6" />
    </>
  ),
};

interface Props {
  field: keyof OutfitItems;
  text: string;
}

export default function ItemIcon({ field, text }: Props) {
  const id = pickIcon(field, text);
  if (!id) return null;
  return (
    <svg
      className="item-icon"
      viewBox="0 0 20 20"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[id]}
    </svg>
  );
}
