import type { OutfitItems } from '../types';
import { extractColor } from '../data/colors';
import { CLOTHING, type ClothingAsset } from '../data/clothingPaths';
import { pickIcon } from '../components/ItemIcon';

/**
 * 코디 실루엣의 배치 계산 (FR-19).
 *
 * 화면용 React 컴포넌트(OutfitSilhouette)와 공유 이미지용 PNG 렌더러(shareImage)가
 * 같은 그림을 그려야 하므로, "무엇을 어디에 어떤 색으로" 부분만 순수 함수로 떼어 둔다.
 * 한쪽만 고쳐서 화면과 공유 이미지가 달라지는 일을 막기 위한 분리다.
 */
export interface SilhouettePiece {
  asset: ClothingAsset;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  flip?: boolean;
}

/** 실루엣 전체 좌표계 */
export const SILHOUETTE_VIEWBOX = { width: 100, height: 132 };

function outerAsset(text: string): ClothingAsset {
  switch (pickIcon('outer', text)) {
    case 'coat':
      return CLOTHING.coat;
    case 'puffer':
      return CLOTHING.puffer;
    case 'cardigan':
      return CLOTHING.cardigan;
    case 'shacket':
      return CLOTHING.shacket;
    default:
      return CLOTHING.jacket;
  }
}

function topAsset(text: string): ClothingAsset {
  switch (pickIcon('top', text)) {
    case 'suit':
      return CLOTHING.suit;
    case 'knit':
      return CLOTHING.knit;
    case 'shirt':
      return CLOTHING.shirt;
    case 'tshirt':
      return CLOTHING.tshirt;
    default:
      return CLOTHING.longsleeve;
  }
}

function bottomAsset(text: string): ClothingAsset {
  return pickIcon('bottom', text) === 'shorts' ? CLOTHING.shorts : CLOTHING.trousers;
}

function shoesAsset(text: string): ClothingAsset {
  switch (pickIcon('shoes', text)) {
    case 'sandal':
      return CLOTHING.sandal;
    case 'sneaker':
      return CLOTHING.sneaker;
    case 'boot':
      return CLOTHING.boot;
    default:
      return CLOTHING.dressShoe;
  }
}

/**
 * 디테일 선(라펠·누빔·단추 등) 색.
 * 코디 색이 블랙이면 검은 선이 안 보이고 화이트면 흰 선이 안 보이므로,
 * 채움색의 밝기를 재서 반대 방향 선을 얹는다.
 */
export function detailStroke(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return 'rgba(0,0,0,0.34)';
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  // ITU-R BT.601 근사 — 사람 눈이 느끼는 밝기
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luma > 0.55 ? 'rgba(0,0,0,0.34)' : 'rgba(255,255,255,0.4)';
}

export function buildSilhouette(items: OutfitItems): SilhouettePiece[] {
  const topColor = extractColor(items.top, '#c8ccd2');
  // "동일 톤/원단" 문구는 색 이름이 없는 대신 상의와 같은 색이라는 뜻이므로 상의 색을 이어받는다
  const bottomFallback = items.bottom.includes('동일') ? topColor : '#8b8f98';
  const bottomColor = extractColor(items.bottom, bottomFallback);
  const shoesColor = extractColor(items.shoes, '#3c3f45');
  const shoes = shoesAsset(items.shoes);

  // 아우터가 있으면 상의 대신 아우터만 보여준다 (겉에서 보이는 실제 모습에 가깝게)
  const upper: SilhouettePiece = items.outer
    ? { asset: outerAsset(items.outer), color: extractColor(items.outer, '#8b8f98'), x: 14, y: 2, width: 72, height: 68 }
    : { asset: topAsset(items.top), color: topColor, x: 14, y: 2, width: 72, height: 68 };

  return [
    upper,
    { asset: bottomAsset(items.bottom), color: bottomColor, x: 26, y: 64, width: 48, height: 52 },
    { asset: shoes, color: shoesColor, x: 13, y: 110, width: 36, height: 20 },
    { asset: shoes, color: shoesColor, x: 51, y: 110, width: 36, height: 20, flip: true },
  ];
}
