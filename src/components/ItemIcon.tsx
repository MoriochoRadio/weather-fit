import type { OutfitItems } from '../types';

export type IconId =
  | 'coat'
  | 'puffer'
  | 'jacket'
  | 'knit'
  | 'shirt'
  | 'tshirt'
  | 'longsleeve'
  | 'pants'
  | 'shorts'
  | 'dress-shoe'
  | 'sneaker'
  | 'boot'
  | 'sandal'
  | 'cap'
  | 'bag'
  | 'watch'
  | 'scarf'
  | 'belt'
  | 'glove'
  | 'tie'
  | 'umbrella'
  | 'acc';

/**
 * 아이템 텍스트 키워드 → 아이콘 매핑 (FR-16).
 * 먼저 매칭되는 규칙이 이긴다 — 구체적인 키워드를 앞에 둘 것.
 */
export function pickIcon(field: keyof OutfitItems, text: string): IconId {
  const has = (...keys: string[]) => keys.some((k) => text.includes(k));
  switch (field) {
    case 'outer':
      if (has('패딩', '다운')) return 'puffer';
      if (has('코트', '트렌치', '발마칸', '맥코트', '체스터필드')) return 'coat';
      if (has('가디건', '니트')) return 'knit';
      if (has('셔츠', '셔켓')) return 'shirt';
      return 'jacket';
    case 'top':
      if (has('반팔', '피케 폴로')) return 'tshirt';
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
    case 'acc':
      if (has('캡', '햇', '비니', '모자')) return 'cap';
      if (has('백', '토트', '사코슈', '브리프케이스', '크로스')) return 'bag';
      if (has('시계')) return 'watch';
      if (has('머플러', '스카프')) return 'scarf';
      // QA: 벨트·장갑·타이·우산이 전부 뭉뚱그려 안경 모양(기본 acc)으로 나오던 것을 세분화
      if (has('우산')) return 'umbrella';
      if (has('타이')) return 'tie';
      if (has('장갑')) return 'glove';
      if (has('벨트')) return 'belt';
      return 'acc';
  }
}

/** 20×20 라인 아이콘 — stroke가 currentColor라 테마 색을 그대로 따른다 */
const PATHS: Record<IconId, JSX.Element> = {
  coat: (
    <>
      <path d="M7.5 2.2 6 4l-1.5 1v11.5H7V8.5l.9 9H12l.9-9v8h2.6V5l-1.5-1-1.5-1.8Z" />
      <path d="M7.5 2.2 10 5l2.5-2.8" />
      <path d="M10 5v10.5" />
    </>
  ),
  puffer: (
    <>
      <path d="M7.5 2.2 6 4l-1.7 1.1V17.8h4.4V9.3h2.6v8.5h4.4V5.1L14 4l-1.5-1.8Z" />
      <path d="M7.5 2.2 10 4.6l2.5-2.4" />
      <path d="M4.6 8.4h4.1m2.6 0h4.1M4.6 12h4.1m2.6 0h4.1" />
    </>
  ),
  jacket: (
    <>
      <path d="M7.5 2.2 6 4l-2 1.1v7.2h2.7V17h6.6v-4.7H16V5.1L14 4l-1.5-1.8Z" />
      <path d="M7.5 2.2 10 4.6l2.5-2.4" />
      <path d="M10 4.6v6.6" />
    </>
  ),
  knit: (
    <>
      <path d="M7 2.6h6l2.4 1.8v4.8h-2.6V17H7.2V9.2H4.6V4.4Z" />
      <path d="M8 2.6c0 1.2.9 2.1 2 2.1s2-.9 2-2.1" />
      <path d="M4.6 9.2h2.6m5.8 0h2.6" />
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
  pants: <path d="M6.2 2.6h7.6l.6 6.6.9 8.2h-3.4L10.6 9l-.6 8.4H6.6l.9-8.2Z M6.2 5.4h7.6" />,
  shorts: <path d="M6.4 3.2h7.2l.7 5.6h-3.7l-.6 2.6-.6-2.6H5.7Z M6.4 5.6h7.2" />,
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
  sandal: (
    <>
      <path d="M3.4 15c.1-1.4.5-3 .5-5.4h3.4l1.1 2c2.6.5 7.6.9 8.2 2.6.2.6-.1 1.2-.8 1.2H3.6c-.2 0-.3-.2-.2-.4Z" />
      <path d="m6 8 2 4m-3.5-2.5L8 8.5" />
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
  return (
    <svg
      className="item-icon"
      viewBox="0 0 20 20"
      width="18"
      height="18"
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
