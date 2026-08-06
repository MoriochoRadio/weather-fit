import type { OutfitItems } from '../types';
import { SILHOUETTE_VIEWBOX, buildSilhouette, detailStroke, type SilhouettePiece } from '../engine/silhouette';

interface Props {
  items: OutfitItems;
  className?: string;
}

function Piece({ asset, color, x, y, width, height, flip }: SilhouettePiece) {
  const inner = (
    <>
      {/*
        외곽선은 채움색이 아니라 "글자색"을 옅게 쓴다 — 화이트 스니커·오프화이트 슬랙스처럼
        배경과 밝기가 비슷한 아이템이 통째로 사라지던 문제를 테마(라이트/다크) 양쪽에서 함께 해결한다.
        에셋마다 축척이 달라도 선 두께가 같아 보이도록 non-scaling-stroke를 쓴다.
      */}
      <path
        d={asset.body}
        fill={color}
        fillRule="evenodd"
        stroke="currentColor"
        strokeOpacity="0.28"
        strokeWidth="1.1"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {asset.details && (
        <path
          d={asset.details}
          fill="none"
          stroke={detailStroke(color)}
          strokeWidth="1.1"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </>
  );
  return (
    <svg x={x} y={y} width={width} height={height} viewBox={asset.viewBox}>
      {flip ? <g transform="translate(100,0) scale(-1,1)">{inner}</g> : inner}
    </svg>
  );
}

/**
 * 조각 목록을 그대로 그리는 실루엣.
 * 코디(아이템 문구 기반)와 색 조합 미리보기(색만 기반)가 같은 그림을 공유하도록 열어 둔다 (FR-36).
 */
export function PieceSilhouette({ pieces, className = 'silhouette' }: { pieces: SilhouettePiece[]; className?: string }) {
  // 순수 색상 미리보기라 스크린리더에 전달할 정보가 없고, 바로 옆 아이템 목록이 같은 내용을 텍스트로 이미 제공한다.
  // role="img"+aria-label을 쓰면 색 정보 없이 문구만 중복으로 다시 읽혀 오히려 혼란스러우므로 장식으로 숨긴다.
  return (
    <svg
      className={className}
      viewBox={`0 0 ${SILHOUETTE_VIEWBOX.width} ${SILHOUETTE_VIEWBOX.height}`}
      aria-hidden="true"
    >
      {pieces.map((piece, i) => (
        <Piece key={i} {...piece} />
      ))}
    </svg>
  );
}

/**
 * 코디를 실제 색으로 칠한 미니 실루엣 (FR-19).
 * 상의·하의 색이 글자로만 표시돼 "입어보기 전엔 느낌이 안 온다"는 피드백에 대한 응답 —
 * 각 아이템 문구에 맞는 실제 의류 모양에 색을 입혀 한눈에 보이게 한다.
 */
export default function OutfitSilhouette({ items, className }: Props) {
  return <PieceSilhouette pieces={buildSilhouette(items)} className={className} />;
}
