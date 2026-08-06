import { describe, expect, it } from 'vitest';
import { SILHOUETTE_VIEWBOX, buildPairSilhouette, buildSilhouette, detailStroke } from './silhouette';
import { CLOTHING } from '../data/clothingPaths';
import { OUTFITS } from '../data/outfits';

/**
 * v1.9에서 조각 배치 좌표를 SLOT 상수로 뽑아내며 화면·공유 이미지가 함께 쓰는 코드를 건드렸다.
 * 좌표가 한 픽셀이라도 밀리면 PNG 공유 이미지에서 옷이 어긋나는데 눈으로 볼 방법이 없으므로
 * 숫자를 그대로 못 박아 둔다.
 */
describe('buildSilhouette 배치 (공유 이미지와 공유하는 좌표)', () => {
  const items = {
    outer: '차콜 캐시미어 블렌드 코트',
    top: '라이트그레이 터틀넥 니트',
    bottom: '다크네이비 울 슬랙스',
    shoes: '블랙 레더 부츠',
  };

  it('상의·하의·좌우 신발 네 조각을 정해진 자리에 놓는다', () => {
    const pieces = buildSilhouette(items).map(({ x, y, width, height, flip }) => ({ x, y, width, height, flip }));
    expect(pieces).toEqual([
      { x: 14, y: 2, width: 72, height: 68, flip: undefined },
      { x: 26, y: 64, width: 48, height: 52, flip: undefined },
      { x: 13, y: 110, width: 36, height: 20, flip: undefined },
      { x: 51, y: 110, width: 36, height: 20, flip: true },
    ]);
  });

  it('모든 조각이 좌표계 안에 들어온다', () => {
    for (const o of OUTFITS) {
      for (const p of buildSilhouette(o.items)) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.x + p.width).toBeLessThanOrEqual(SILHOUETTE_VIEWBOX.width);
        expect(p.y + p.height).toBeLessThanOrEqual(SILHOUETTE_VIEWBOX.height);
      }
    }
  });

  it('아우터가 있으면 상의 대신 아우터를 그린다', () => {
    expect(buildSilhouette(items)[0].asset).toBe(CLOTHING.coat);
    const noOuter = { ...items, outer: undefined };
    expect(buildSilhouette(noOuter)[0].asset).toBe(CLOTHING.knit);
  });

  it('75벌 전부 에셋이 채워진다 (undefined 조각 없음)', () => {
    for (const o of OUTFITS) {
      for (const p of buildSilhouette(o.items)) {
        expect(p.asset?.body).toBeTruthy();
        expect(p.color).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });
});

describe('buildPairSilhouette (색 조합 미리보기, FR-36)', () => {
  it('코디 실루엣과 같은 자리에 기본 옷을 놓는다', () => {
    const pair = buildPairSilhouette('#232f49', '#8b8f98', '#3c3f45');
    const outfit = buildSilhouette({
      top: '네이비 니트',
      bottom: '미디엄그레이 슬랙스',
      shoes: '차콜 더비',
    });
    expect(pair.map((p) => [p.x, p.y, p.width, p.height])).toEqual(
      outfit.map((p) => [p.x, p.y, p.width, p.height]),
    );
  });

  it('넘긴 색을 그대로 칠한다', () => {
    const [top, bottom, shoeL, shoeR] = buildPairSilhouette('#111111', '#222222', '#333333');
    expect([top.color, bottom.color, shoeL.color, shoeR.color]).toEqual([
      '#111111',
      '#222222',
      '#333333',
      '#333333',
    ]);
    expect(shoeR.flip).toBe(true);
  });
});

describe('detailStroke', () => {
  it('밝은 옷엔 어두운 선, 어두운 옷엔 밝은 선을 얹는다', () => {
    expect(detailStroke('#f6f8f9')).toContain('0,0,0');
    expect(detailStroke('#15171b')).toContain('255,255,255');
  });
});
