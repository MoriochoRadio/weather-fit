import { describe, expect, it } from 'vitest';
import { GLOSSARY, findGlossary, isOwnableItem } from './glossary';
import { OUTFITS } from './outfits';

describe('GLOSSARY 데이터', () => {
  it('용어가 중복되지 않는다', () => {
    const terms = GLOSSARY.map((g) => g.term);
    expect(new Set(terms).size).toBe(terms.length);
  });

  it('모든 항목에 설명과 대체제가 있다', () => {
    for (const g of GLOSSARY) {
      expect(g.meaning.length).toBeGreaterThan(5);
      expect(g.sub.length).toBeGreaterThan(2);
    }
  });
});

describe('findGlossary 매칭 규칙', () => {
  it('아이템 텍스트에서 용어를 찾는다', () => {
    const matches = findGlossary({
      outer: '브라운 헤링본 트위드 자켓',
      top: '크림 옥스포드 셔츠',
      bottom: '다크브라운 코듀로이 팬츠',
      shoes: '브라운 태슬 로퍼',
    });
    const terms = matches.map((m) => m.term);
    expect(terms).toContain('헤링본');
    expect(terms).toContain('트위드');
    expect(terms).toContain('옥스포드 셔츠');
    expect(terms).toContain('코듀로이');
    expect(terms).toContain('태슬 로퍼');
  });

  it("동음이의어: '옥스포드'는 신발 칸에서만 구두로 해석된다 (FR-10)", () => {
    const shoeMatch = findGlossary({ top: '화이트 티', bottom: '슬랙스', shoes: '다크브라운 옥스포드' });
    expect(shoeMatch.some((m) => m.term === '옥스포드' && m.field === 'shoes')).toBe(true);

    const shirtMatch = findGlossary({ top: '크림 옥스포드 셔츠', bottom: '치노', shoes: '스니커' });
    expect(shirtMatch.some((m) => m.term === '옥스포드 셔츠')).toBe(true);
    expect(shirtMatch.some((m) => m.term === '옥스포드' && m.field === 'top')).toBe(false);
  });

  it("긴 용어 우선: '페니 로퍼'가 매칭되면 같은 구간의 '로퍼'는 중복 매칭되지 않는다", () => {
    const matches = findGlossary({ top: '셔츠', bottom: '슬랙스', shoes: '블랙 페니 로퍼' });
    expect(matches.some((m) => m.term === '페니 로퍼')).toBe(true);
    expect(matches.some((m) => m.term === '로퍼')).toBe(false);
  });

  it('모든 코디가 최소 1개 이상의 용어 풀이를 가진다 (커버리지)', () => {
    for (const o of OUTFITS) {
      const matches = findGlossary(o.items);
      expect(matches.length, `${o.id} (${o.name})`).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('isOwnableItem (FR-33)', () => {
  it('색·핏·디테일 용어에는 "없어요" 토글을 달지 않는다', () => {
    for (const term of ['차콜', '캐멀', '무광', '테이퍼드', '크루넥', '더블브레스티드']) {
      expect(isOwnableItem(term), term).toBe(false);
    }
  });

  it('실제 옷·원단 용어에는 토글을 단다', () => {
    for (const term of ['발마칸 코트', '페니 로퍼', '시어서커', '첼시 부츠', '가디건']) {
      expect(isOwnableItem(term), term).toBe(true);
    }
  });

  it('사전에 없는 용어는 기본적으로 허용한다', () => {
    expect(isOwnableItem('알 수 없는 용어')).toBe(true);
  });
});
