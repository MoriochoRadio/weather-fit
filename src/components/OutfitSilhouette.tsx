import type { OutfitItems } from '../types';
import { extractColor } from '../data/colors';

interface Props {
  items: OutfitItems;
}

/**
 * 코디를 실제 색으로 칠한 미니 실루엣 (FR-19).
 * 상의·하의 색이 글자로만 표시돼 "입어보기 전엔 느낌이 안 온다"는 피드백에 대한 응답 —
 * 셔츠·아우터·바지·신발 모양에 각 아이템의 실제 색을 입혀 한눈에 보이게 한다.
 * 아우터가 있으면 앞이 열린 코트처럼 두 옆판을 덧그려, 가운데로 상의 색이 비치게 한다.
 */
export default function OutfitSilhouette({ items }: Props) {
  const topColor = extractColor(items.top, '#c8ccd2');
  const outerColor = items.outer ? extractColor(items.outer, '#8b8f98') : null;
  // "동일 톤/원단" 문구는 색 이름이 없는 대신 상의와 같은 색이라는 뜻이므로 상의 색을 이어받는다
  const bottomFallback = items.bottom.includes('동일') ? topColor : '#8b8f98';
  const bottomColor = extractColor(items.bottom, bottomFallback);
  const shoesColor = extractColor(items.shoes, '#3c3f45');

  return (
    <svg
      className="silhouette"
      viewBox="0 0 100 132"
      role="img"
      aria-label={`상의 ${items.top}${items.outer ? `, 아우터 ${items.outer}` : ''}, 하의 ${items.bottom}, 신발 ${items.shoes} 색상 미리보기`}
    >
      {/* 상의: 몸판 + 소매 */}
      <rect className="sil-shape" x="22" y="8" width="56" height="54" rx="10" fill={topColor} />
      <rect className="sil-shape" x="10" y="12" width="14" height="28" rx="6" fill={topColor} />
      <rect className="sil-shape" x="76" y="12" width="14" height="28" rx="6" fill={topColor} />

      {/* 아우터: 앞이 열린 코트처럼 양옆 패널만 덮어 가운데로 상의색이 비치게 */}
      {outerColor && (
        <>
          <rect className="sil-shape" x="14" y="6" width="20" height="58" rx="8" fill={outerColor} />
          <rect className="sil-shape" x="66" y="6" width="20" height="58" rx="8" fill={outerColor} />
        </>
      )}

      {/* 하의 */}
      <rect className="sil-shape" x="28" y="68" width="18" height="46" rx="6" fill={bottomColor} />
      <rect className="sil-shape" x="54" y="68" width="18" height="46" rx="6" fill={bottomColor} />

      {/* 신발 */}
      <rect className="sil-shape" x="22" y="112" width="28" height="14" rx="7" fill={shoesColor} />
      <rect className="sil-shape" x="50" y="112" width="28" height="14" rx="7" fill={shoesColor} />
    </svg>
  );
}
