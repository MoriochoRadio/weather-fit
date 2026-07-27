import { describe, expect, it } from 'vitest';
import { pickIcon } from './ItemIcon';
import { OUTFITS } from '../data/outfits';
import type { OutfitItems } from '../types';

describe('pickIcon (FR-16)', () => {
  it.each<[keyof OutfitItems, string, string]>([
    ['outer', '블랙 무광 숏패딩', 'puffer'],
    ['outer', '캐멀 캐시미어 블렌드 코트', 'coat'],
    ['outer', '베이지 트렌치 코트', 'coat'],
    ['outer', '네이비 울 블레이저', 'jacket'],
    ['outer', '네이비 미드게이지 가디건', 'knit'],
    ['outer', '차콜 코듀로이 셔켓', 'shirt'],
    ['top', '페일블루 오픈카라 반팔 셔츠', 'tshirt'],
    ['top', '네이비 피케 폴로', 'tshirt'],
    ['top', '화이트 옥스포드 셔츠', 'shirt'],
    ['top', '라이트그레이 터틀넥 니트', 'knit'],
    ['top', '네이비 스트라이프 보트넥 티', 'longsleeve'],
    ['bottom', '라이트그레이 코튼 쇼츠(무릎 위 기장)', 'shorts'],
    ['bottom', '동일 원단 린넨 버뮤다 팬츠', 'shorts'],
    ['bottom', '다크네이비 울 슬랙스', 'pants'],
    ['shoes', '블랙 레더 부츠', 'boot'],
    ['shoes', '브라운 레더 샌들', 'sandal'],
    ['shoes', '화이트 레더 스니커', 'sneaker'],
    ['shoes', '저먼 트레이너', 'sneaker'],
    ['shoes', '블랙 페니 로퍼', 'dress-shoe'],
    ['acc', '네이비 캡', 'cap'],
    ['acc', '네이비 토트백 · 실버 프레임 선글라스', 'bag'],
    ['acc', '실버 시계', 'watch'],
    ['acc', '라이트그레이 캐시미어 머플러', 'scarf'],
  ])('%s "%s" → %s', (field, text, expected) => {
    expect(pickIcon(field, text)).toBe(expected);
  });

  it('모든 코디의 모든 아이템이 아이콘을 갖는다 (전수 커버리지)', () => {
    const fields: (keyof OutfitItems)[] = ['outer', 'top', 'bottom', 'shoes', 'acc'];
    for (const o of OUTFITS) {
      for (const field of fields) {
        const text = o.items[field];
        if (!text) continue;
        expect(pickIcon(field, text), `${o.id} ${field}`).toBeTruthy();
      }
    }
  });
});
