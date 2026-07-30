import type { OutfitItems } from '../types';
import { extractColor } from '../data/colors';
import { CLOTHING_PATHS } from '../data/clothingPaths';
import { pickIcon } from './ItemIcon';

interface Props {
  items: OutfitItems;
}

/** 아이템 문구 → 실제 의류 실루엣 에셋 매핑 (game-icons.net, CC BY 3.0 — delapouite, lorc 작) */
function topPath(text: string) {
  const id = pickIcon('top', text);
  if (id === 'shirt') return CLOTHING_PATHS.shirtButton;
  if (id === 'knit') return CLOTHING_PATHS.hoodie;
  return CLOTHING_PATHS.tshirt;
}
function bottomPath(text: string) {
  return pickIcon('bottom', text) === 'shorts' ? CLOTHING_PATHS.shorts : CLOTHING_PATHS.trousers;
}
function shoesPath(text: string) {
  const id = pickIcon('shoes', text);
  if (id === 'sandal') return CLOTHING_PATHS.sandal;
  if (id === 'sneaker') return CLOTHING_PATHS.runningShoe;
  // 로퍼·더비·옥스포드 같은 낮은 정장화는 발목까지 오는 첼시 부츠와 모양이 달라 구분한다 (QA: 로퍼가 부츠로 보이던 문제)
  if (id === 'dress-shoe') return CLOTHING_PATHS.loafer;
  return CLOTHING_PATHS.chelseaBoot;
}

/**
 * 코디를 실제 색으로 칠한 미니 실루엣 (FR-19).
 * 상의·하의 색이 글자로만 표시돼 "입어보기 전엔 느낌이 안 온다"는 피드백에 대한 응답 —
 * 각 아이템 문구에 맞는 실제 의류 모양(오픈소스 벡터 에셋)에 색을 입혀 한눈에 보이게 한다.
 */
export default function OutfitSilhouette({ items }: Props) {
  const topColor = extractColor(items.top, '#c8ccd2');
  const outerColor = items.outer ? extractColor(items.outer, '#8b8f98') : null;
  // "동일 톤/원단" 문구는 색 이름이 없는 대신 상의와 같은 색이라는 뜻이므로 상의 색을 이어받는다
  const bottomFallback = items.bottom.includes('동일') ? topColor : '#8b8f98';
  const bottomColor = extractColor(items.bottom, bottomFallback);
  const shoesColor = extractColor(items.shoes, '#3c3f45');

  // 순수 색상 미리보기라 스크린리더에 전달할 정보가 없고, 바로 옆 아이템 목록이 같은 내용을 텍스트로 이미 제공한다.
  // role="img"+aria-label을 쓰면 색 정보 없이 문구만 중복으로 다시 읽혀 오히려 혼란스러우므로 장식으로 숨긴다.
  return (
    <svg className="silhouette" viewBox="0 0 100 132" aria-hidden="true">
      {/* 아우터가 있으면 상의 대신 아우터만 크게 보여준다 (겉에서 보이는 실제 모습에 가깝게) */}
      {outerColor ? (
        <svg x="14" y="2" width="72" height="64" viewBox="0 0 512 512">
          <path d={CLOTHING_PATHS.jacket} fill={outerColor} />
        </svg>
      ) : (
        <svg x="18" y="4" width="64" height="62" viewBox="0 0 512 512">
          <path d={topPath(items.top)} fill={topColor} />
        </svg>
      )}

      <svg x="26" y="64" width="48" height="52" viewBox="0 0 512 512">
        <path d={bottomPath(items.bottom)} fill={bottomColor} />
      </svg>

      <svg x="14" y="110" width="36" height="20" viewBox="0 0 512 512">
        <path d={shoesPath(items.shoes)} fill={shoesColor} />
      </svg>
      <svg x="50" y="110" width="36" height="20" viewBox="0 0 512 512">
        <g transform="translate(36,0) scale(-1,1)">
          <path d={shoesPath(items.shoes)} fill={shoesColor} />
        </g>
      </svg>
    </svg>
  );
}
