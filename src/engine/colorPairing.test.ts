import { describe, expect, it } from 'vitest';
import {
  SHOE_FAMILIES,
  judgeShoes,
  outfitColors,
  outfitsWithPair,
  pairColors,
  pairMatrix,
  rankBottoms,
  rankShoes,
} from './colorPairing';
import { COLOR_FAMILIES, familyById, nearestFamily } from '../data/colorFamilies';
import { OUTFITS } from '../data/outfits';

const f = (id: string) => {
  const found = familyById(id);
  if (!found) throw new Error(`알 수 없는 색: ${id}`);
  return found;
};

const rate = (topId: string, bottomId: string) => pairColors(f(topId), f(bottomId)).rating;

describe('pairColors — 밝기 차이', () => {
  it('밝은 상의 + 어두운 하의는 잘 어울린다고 본다', () => {
    expect(rate('white', 'charcoal')).toBe('best');
    expect(rate('lightgray', 'navy')).toBe('best');
  });

  it('어두운 색끼리 붙이면 경계가 뭉개져 조심 등급', () => {
    expect(rate('black', 'navy')).toBe('careful');
    expect(rate('navy', 'black')).toBe('careful');
  });

  it('같은 색 위아래는 셋업으로 인정한다', () => {
    const v = pairColors(f('charcoal'), f('charcoal'));
    expect(v.rating).not.toBe('careful');
    expect(v.reasons[0]).toContain('셋업');
  });

  it('같은 계열의 미묘하게 다른 색은 경고한다 (네이비 상의 + 데님 하의)', () => {
    const v = pairColors(f('navy'), f('denim'));
    expect(v.rating).toBe('careful');
    expect(v.reasons.join(' ')).toContain('미묘하게');
  });
});

describe('pairColors — 색의 개수와 계열', () => {
  it('강한 색이 한 곳뿐이면 포인트로 살아난다', () => {
    expect(rate('burgundy', 'lightgray')).toBe('best');
    expect(rate('lightgray', 'burgundy')).toBe('best');
  });

  it('강한 웜톤과 쿨톤을 위아래로 함께 쓰면 조심 등급', () => {
    expect(rate('burgundy', 'navy')).toBe('careful');
    expect(rate('brown', 'denim')).toBe('careful');
  });

  it('같은 계열 톤온톤은 통과시킨다', () => {
    expect(rate('cream', 'olive')).not.toBe('careful');
    expect(rate('iceblue', 'navy')).toBe('best');
  });
});

describe('pairColors — 사람에게 돌려주는 말', () => {
  it('이유와 팁이 항상 채워진다', () => {
    for (const top of COLOR_FAMILIES) {
      for (const bottom of COLOR_FAMILIES) {
        const v = pairColors(top, bottom);
        expect(v.reasons.length).toBeGreaterThan(0);
        expect(v.tip.length).toBeGreaterThan(0);
        expect(v.headline.length).toBeGreaterThan(0);
      }
    }
  });

  it('정석 조합은 조심 등급에 붙지 않는다 (같은 화면에서 서로 다른 말을 하지 않게)', () => {
    for (const row of pairMatrix()) {
      for (const v of row) {
        if (v.classic) expect(v.rating).not.toBe('careful');
      }
    }
  });

  it('아래가 훨씬 밝으면 그 배치를 짚어 준다', () => {
    expect(pairColors(f('charcoal'), f('white')).tip).toContain('아래가 더 밝아');
  });
});

describe('rankBottoms', () => {
  it('모든 색을 등급 좋은 순으로 정렬해 돌려준다', () => {
    const ranked = rankBottoms('white');
    expect(ranked).toHaveLength(COLOR_FAMILIES.length);
    const order = { best: 0, good: 1, careful: 2 };
    for (let i = 1; i < ranked.length; i++) {
      expect(order[ranked[i].rating]).toBeGreaterThanOrEqual(order[ranked[i - 1].rating]);
    }
  });

  it('모르는 색 id는 빈 목록', () => {
    expect(rankBottoms('무지개')).toEqual([]);
  });

  it('어떤 색을 골라도 추천할 하의가 하나는 있다', () => {
    for (const top of COLOR_FAMILIES) {
      const ranked = rankBottoms(top.id);
      expect(ranked.some((v) => v.rating === 'best' || v.rating === 'good')).toBe(true);
    }
  });
});

describe('nearestFamily', () => {
  it('계열에 없는 색 이름도 가장 가까운 칸으로 접는다', () => {
    expect(nearestFamily('#f1f3f2').id).toBe('white'); // 오프화이트
    expect(nearestFamily('#1f2636').id).toBe('navy'); // 다크네이비 · 진청
    expect(nearestFamily('#e8dfc9').id).toBe('cream'); // 에크루
    expect(nearestFamily('#d9dde2').id).toBe('lightgray'); // 페일그레이
    expect(nearestFamily('#2c3a55').id).toBe('navy'); // 인디고
  });
});

describe('judgeShoes — 아래가 잡히는가 (FR-38)', () => {
  const shoe = (topId: string, bottomId: string, shoesId: string) =>
    judgeShoes(f(topId), f(bottomId), f(shoesId));

  it('하의보다 어두운 신발은 아래를 잡아 준다', () => {
    expect(shoe('white', 'gray', 'black').rating).toBe('best');
    expect(shoe('white', 'beige', 'brown').rating).toBe('best');
  });

  it('하의보다 훨씬 밝은 유채색 신발은 시선을 발로 끌어간다', () => {
    const v = shoe('white', 'navy', 'beige');
    expect(v.rating).toBe('careful');
    expect(v.reasons.join(' ')).toContain('발끝으로 몰립니다');
  });

  // 흰 스니커는 하의보다 훨씬 밝지만 무채색이라 예외다 — 규칙이 이걸 못 잡으면 쓸모가 없다
  it('밝아도 무채색 신발은 통과시킨다', () => {
    expect(shoe('white', 'navy', 'white').rating).not.toBe('careful');
    expect(shoe('lightgray', 'denim', 'white').rating).not.toBe('careful');
  });
});

describe('judgeShoes — 색의 개수와 계열', () => {
  const shoe = (topId: string, bottomId: string, shoesId: string) =>
    judgeShoes(f(topId), f(bottomId), f(shoesId));

  it('상하의가 무채색이면 신발 색이 포인트가 된다', () => {
    expect(shoe('white', 'charcoal', 'burgundy').rating).toBe('best');
  });

  it('상·하의에 이미 색이 둘이면 유채색 신발은 셋째 색이 된다', () => {
    const v = shoe('camel', 'navy', 'olive');
    expect(v.rating).toBe('careful');
    expect(v.reasons.join(' ')).toContain('셋이 됩니다');
  });

  it('상의 색을 신발에서 반복하면 위아래가 묶인다', () => {
    const v = shoe('burgundy', 'lightgray', 'burgundy');
    expect(v.reasons.join(' ')).toContain('한 번 더 반복');
    expect(v.rating).toBe('best');
  });

  it('하의와 같은 계열인데 미묘하게 다른 색은 경고한다', () => {
    const v = shoe('white', 'brown', 'olive');
    expect(v.reasons.join(' ')).toContain('미묘하게');
    expect(v.rating).toBe('careful');
  });

  // 가죽 신발은 소재가 이미 달라 "잘못 맞춘 것"으로 읽히지 않는다 — 정석 조합이 여기 걸리면 안 된다
  it('가죽 색 신발은 미묘한 어긋남에서 면제한다', () => {
    const v = shoe('white', 'olive', 'brown');
    expect(v.reasons.join(' ')).not.toContain('미묘하게');
    expect(v.rating).not.toBe('careful');
  });
});

// 가죽 예외가 없으면 남성복에서 가장 오래 통한 조합이 '조심해서'로 떨어진다
describe('judgeShoes — 가죽 색 예외', () => {
  it('네이비 하의 + 브라운 구두를 통과시킨다', () => {
    const v = judgeShoes(f('white'), f('navy'), f('brown'));
    expect(v.rating).not.toBe('careful');
    expect(v.classic).toBe(true);
    expect(v.headline).toContain('가장 오래 통한');
  });

  it('같은 웜톤이라도 가죽 색이 아니면 계열 충돌을 잡아낸다', () => {
    expect(judgeShoes(f('white'), f('navy'), f('brown')).rating).not.toBe('careful');
    expect(judgeShoes(f('white'), f('navy'), f('olive')).rating).toBe('careful');
  });
});

describe('rankShoes', () => {
  it('신발로 쓰는 색만 등급순으로 돌려준다', () => {
    const ranked = rankShoes('white', 'navy');
    expect(ranked).toHaveLength(SHOE_FAMILIES.length);
    expect(ranked.map((v) => v.shoes.id)).not.toContain('iceblue'); // 아이스블루 구두는 없다
    const order = { best: 0, good: 1, careful: 2 };
    for (let i = 1; i < ranked.length; i++) {
      expect(order[ranked[i].rating]).toBeGreaterThanOrEqual(order[ranked[i - 1].rating]);
    }
  });

  it('어떤 상하의 조합에도 신을 만한 신발이 하나는 있다', () => {
    for (const top of COLOR_FAMILIES) {
      for (const bottom of COLOR_FAMILIES) {
        const ranked = rankShoes(top.id, bottom.id);
        expect(ranked.some((v) => v.rating !== 'careful')).toBe(true);
      }
    }
  });

  it('모르는 색 id는 빈 목록', () => {
    expect(rankShoes('무지개', 'navy')).toEqual([]);
    expect(rankShoes('white', '무지개')).toEqual([]);
  });

  /*
    엔진과 코디 데이터를 맞대 보는 가장 강한 검증.
    처음엔 75벌 중 9벌이 자기 신발에 경고를 받았고, 여섯이 "밝은 저채색 상의 + 네이비 하의 +
    브라운 구두"라는 같은 패턴이었다 — 데이터가 아니라 규칙이 틀렸다는 신호였다 (QA).
  */
  it('내장 코디 75벌은 자기 신발 색에 경고를 받지 않는다', () => {
    const flagged = OUTFITS.filter((o) => {
      const c = outfitColors(o);
      return judgeShoes(c.top, c.bottom, c.shoes).rating === 'careful';
    }).map((o) => o.id);
    expect(flagged).toEqual([]);
  });

  it('225조합 × 신발 전부에 이유와 팁이 채워진다', () => {
    for (const top of COLOR_FAMILIES) {
      for (const bottom of COLOR_FAMILIES) {
        for (const v of rankShoes(top.id, bottom.id)) {
          expect(v.reasons.length).toBeGreaterThan(0);
          expect(v.tip.length).toBeGreaterThan(0);
          expect(v.headline.length).toBeGreaterThan(0);
          if (v.classic) expect(v.rating).not.toBe('careful');
        }
      }
    }
  });
});

describe('outfitsWithPair', () => {
  it('내장 코디의 상·하의 색을 계열로 판정한다', () => {
    const om01 = OUTFITS.find((o) => o.id === 'om-01')!;
    const pair = outfitColors(om01);
    expect(pair.top.id).toBe('lightgray'); // 라이트그레이 터틀넥
    expect(pair.bottom.id).toBe('navy'); // 다크네이비 울 슬랙스
  });

  it('그 조합을 쓰는 코디만 골라낸다', () => {
    const found = outfitsWithPair('lightgray', 'navy');
    expect(found.map((o) => o.id)).toContain('om-01');
    for (const o of found) {
      const p = outfitColors(o);
      expect([p.top.id, p.bottom.id]).toEqual(['lightgray', 'navy']);
    }
  });

  it('75벌 전부가 어떤 조합으로든 분류된다', () => {
    for (const o of OUTFITS) {
      const p = outfitColors(o);
      expect(familyById(p.top.id)).toBeDefined();
      expect(familyById(p.bottom.id)).toBeDefined();
    }
  });
});
