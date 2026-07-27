import { describe, expect, it } from 'vitest';
import { extractColor } from './colors';
import { OUTFITS } from './outfits';
import type { OutfitItems } from '../types';

const FALLBACK = '#999999';

describe('extractColor', () => {
  it('색 키워드를 찾아 hex를 반환한다', () => {
    expect(extractColor('차콜 캐시미어 블렌드 코트', FALLBACK)).toBe('#3c3f45');
    expect(extractColor('블랙 레더 부츠', FALLBACK)).toBe('#15171b');
  });

  it('구체적인 키워드가 일반 키워드보다 먼저 매칭된다', () => {
    expect(extractColor('라이트그레이 슬랙스', FALLBACK)).not.toBe(extractColor('그레이 슬랙스', FALLBACK));
    expect(extractColor('다크네이비 치노', FALLBACK)).not.toBe(extractColor('네이비 치노', FALLBACK));
    expect(extractColor('다크브라운 로퍼', FALLBACK)).not.toBe(extractColor('브라운 로퍼', FALLBACK));
    expect(extractColor('오프화이트 티', FALLBACK)).not.toBe(extractColor('화이트 티', FALLBACK));
  });

  it('색 키워드가 없으면 지정한 기본색으로 대체한다', () => {
    expect(extractColor('동일 톤 린넨 팬츠(발목 기장)', FALLBACK)).toBe(FALLBACK);
  });

  it('색 이름이 없는 특수 문구도 합리적인 색으로 해석한다', () => {
    expect(extractColor('저먼 트레이너', FALLBACK)).not.toBe(FALLBACK);
    expect(extractColor('고무창 로퍼 또는 스니커', FALLBACK)).not.toBe(FALLBACK);
    expect(extractColor('워시드 데님', FALLBACK)).not.toBe(FALLBACK);
    expect(extractColor('미디엄 워시 데님', FALLBACK)).not.toBe(FALLBACK);
  });

  it('반환값은 항상 유효한 hex 형식이다', () => {
    const samples = ['차콜 코트', '동일 톤 팬츠', '저먼 트레이너', '알수없는아이템'];
    for (const s of samples) {
      expect(extractColor(s, FALLBACK)).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe('데이터 커버리지 — 코디 아이템의 색상 인식률 (FR-19)', () => {
  // 앞선 아이템과 "같은 톤"이라 색 이름이 없는 의도적 예외
  const NO_KEYWORD_EXCEPTIONS = new Set([
    '동일 톤 밴딩 팬츠(발목 기장)',
    '동일 원단 린넨 버뮤다 팬츠',
    '동일 톤 린넨 팬츠(발목 기장)',
  ]);

  it('outer/top/bottom/shoes는 예외를 제외하고 모두 색 키워드를 포함한다', () => {
    const fields: (keyof OutfitItems)[] = ['outer', 'top', 'bottom', 'shoes'];
    const SENTINEL = '#__none__';
    for (const o of OUTFITS) {
      for (const field of fields) {
        const text = o.items[field];
        if (!text || NO_KEYWORD_EXCEPTIONS.has(text)) continue;
        const resolved = extractColor(text, SENTINEL);
        expect(resolved, `${o.id} ${field}: "${text}"`).not.toBe(SENTINEL);
      }
    }
  });
});
