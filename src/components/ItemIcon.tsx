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
      return 'acc';
  }
}

/** 20×20 라인 아이콘 — stroke가 currentColor라 테마 색을 그대로 따른다 */
const PATHS: Record<IconId, JSX.Element> = {
  coat: (
    <>
      <path d="M7 3h6l3 2v12h-4V9M7 3 4 5v12h4V9m2 8h0" />
      <path d="M10 3v6" />
    </>
  ),
  puffer: (
    <>
      <path d="M7 3h6l3 2.5V17h-4.5V8h-3v9H4V5.5L7 3Z" />
      <path d="M4.5 9h4m3 0h4M4.5 13h4m3 0h4" />
    </>
  ),
  jacket: (
    <>
      <path d="M7 3h6l3 2v7h-3v5H7v-5H4V5l3-2Z" />
      <path d="M10 3v7" />
    </>
  ),
  knit: (
    <>
      <path d="M7 3h6l3 2v5h-3v7H7v-7H4V5l3-2Z" />
      <path d="M8 3c0 1 .9 2 2 2s2-1 2-2" />
    </>
  ),
  shirt: (
    <>
      <path d="M7 3h6l3 2v5h-3v7H7v-7H4V5l3-2Z" />
      <path d="M7 3l3 3 3-3" />
      <path d="M10 6v11" />
    </>
  ),
  tshirt: (
    <>
      <path d="M7 3h6l4 3-2 3-2-1v9H7V8L5 9 3 6l4-3Z" />
      <path d="M8 3c0 1 .9 2 2 2s2-1 2-2" />
    </>
  ),
  longsleeve: (
    <>
      <path d="M7 3h6l3 2v8h-3v4H7v-4H4V5l3-2Z" />
      <path d="M8 3c0 1 .9 2 2 2s2-1 2-2" />
    </>
  ),
  pants: <path d="M6 3h8l1 14h-4l-1-8-1 8H5L6 3Zm0 3h8" />,
  shorts: <path d="M6 4h8l1 7h-4.5L10 8l-.5 3H5L6 4Zm0 2h8" />,
  'dress-shoe': <path d="M3 14c0-1 .5-4 .5-6h4L9 10c3 1 8 1.5 8 4v1H3v-1Zm0-1h14" />,
  sneaker: (
    <>
      <path d="M3 14c0-1 .5-3.5.5-5.5L7 9l2.5 2c3 1 7.5.8 7.5 3v1H3v-1Z" />
      <path d="m8 10-1 1.5M10.5 11l-1 1.5M3 13.5h14" />
    </>
  ),
  boot: <path d="M6 3h6v7c3 .8 5 1.5 5 4v3H6.5L6 14l1-2V3Zm0 14H4.5c-.8 0-1.5-.7-1.5-1.5S3.7 14 4.5 14H6" />,
  sandal: (
    <>
      <path d="M3 14c0-1 .5-4 .5-6h4L9 10c3 1 8 1.5 8 4v1H3v-1Z" />
      <path d="m6 8 2 4m-3.5-2.5L8 8.5" />
    </>
  ),
  cap: (
    <>
      <path d="M4 11a6 6 0 0 1 12 0v1H4v-1Z" />
      <path d="M16 12c1.5 0 2.5.7 2.5 1.8 0 .7-.6 1.2-1.4 1.2H8" />
      <path d="M10 5V3.5" />
    </>
  ),
  bag: (
    <>
      <rect x="4" y="8" width="12" height="9" rx="1" />
      <path d="M7 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  watch: (
    <>
      <circle cx="10" cy="10" r="4.5" />
      <path d="M10 7.5V10l2 1.5M8 5.5 8.5 2h3L12 5.5M8 14.5 8.5 18h3l.5-3.5" />
    </>
  ),
  scarf: (
    <>
      <path d="M5 6c0-1.7 2.2-3 5-3s5 1.3 5 3-2.2 3-5 3" />
      <path d="M10 9c-2.8 0-5 1.3-5 3v5l3-2 2 2 2-2 3 2v-5" />
    </>
  ),
  acc: (
    <>
      <circle cx="7" cy="10" r="3.5" />
      <circle cx="13" cy="10" r="3.5" />
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
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[id]}
    </svg>
  );
}
