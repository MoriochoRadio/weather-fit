import { describe, expect, it } from 'vitest';
import { pickIcon, type IconId } from './ItemIcon';
import { OUTFITS } from '../data/outfits';
import type { OutfitItems } from '../types';

describe('pickIcon (FR-16)', () => {
  it.each<[keyof OutfitItems, string, IconId]>([
    ['outer', '블랙 무광 숏패딩', 'puffer'],
    ['outer', '네이비 구스다운 파카', 'puffer'],
    ['outer', '캐멀 캐시미어 블렌드 코트', 'coat'],
    ['outer', '베이지 트렌치 코트', 'coat'],
    ['outer', '네이비 울 블레이저', 'jacket'],
    ['outer', '인디고 데님 자켓', 'jacket'],
    ['outer', '네이비 미드게이지 가디건', 'cardigan'],
    ['outer', '베이지 니트 베스트', 'cardigan'],
    ['outer', '차콜 코듀로이 셔켓', 'shacket'],
    ['outer', '스카이블루 옥스포드 셔츠(오픈)', 'shacket'],
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
    ['acc', '블랙 가죽 벨트', 'belt'],
    ['acc', '블랙 가죽 장갑', 'glove'],
    ['acc', '네이비 니트 타이(선택)', 'tie'],
    ['acc', '장우산(블랙) · 가죽 벨트', 'umbrella'],
  ])('%s "%s" → %s', (field, text, expected) => {
    expect(pickIcon(field, text)).toBe(expected);
  });

  // v1.8 QA 회귀 방지 — 아래는 전부 실제로 잘못된 그림이 나오던 케이스다
  describe('v1.8에서 고친 오판정', () => {
    it.each<[string, IconId]>([
      // 수트·블레이저가 가장 바깥 층인데 안에 받쳐 입은 셔츠·니트로 판정되던 문제
      ['네이비 수트 자켓 + 화이트 셔츠', 'suit'],
      ['미디엄그레이 수트 + 블랙 터틀넥', 'suit'],
      ['그레이 플란넬 수트 + 아이스블루 셔츠 + 네이비 니트 타이', 'suit'],
      ['페일그레이 린넨 블레이저 + 네이비 니트 폴로', 'suit'],
      ['라이트그레이 트로피컬 울 수트 + 아이스블루 셔츠', 'suit'],
      // '티셔츠'가 '셔츠'를 포함해 정장 셔츠로 판정되던 문제
      ['화이트 티셔츠', 'tshirt'],
    ])('top "%s" → %s', (text, expected) => {
      expect(pickIcon('top', text)).toBe(expected);
    });

    it.each<[string, IconId]>([
      // 고정 우선순위 탓에 문구에 먼저 나온 아이템이 아닌 것이 뽑히던 문제
      ['블랙 가죽 장갑 · 실버 시계', 'glove'],
      ['블랙 가죽 벨트 · 미니멀 시계', 'belt'],
      ['브라운 가죽 벨트 · 실버 타이바(타이 착용 시)', 'belt'],
      ['라이트그레이 캐시미어 머플러 · 블랙 가죽 장갑', 'scarf'],
    ])('acc "%s" → 문구에 먼저 나온 %s', (text, expected) => {
      expect(pickIcon('acc', text)).toBe(expected);
    });

    it.each(['없음', '없음 — 비움이 포인트', '없음 — 실버 프레임 선글라스 정도만', '없음 — 가벼운 손목시계 정도만'])(
      'acc "%s" → 아이콘 없음',
      (text) => {
        expect(pickIcon('acc', text)).toBeNull();
      },
    );
  });

  it('모든 코디의 모든 아이템이 아이콘을 갖는다 (acc "없음" 제외)', () => {
    const fields: (keyof OutfitItems)[] = ['outer', 'top', 'bottom', 'shoes', 'acc'];
    for (const o of OUTFITS) {
      for (const field of fields) {
        const text = o.items[field];
        if (!text) continue;
        if (field === 'acc' && text.startsWith('없음')) {
          expect(pickIcon(field, text), `${o.id} ${field}`).toBeNull();
          continue;
        }
        expect(pickIcon(field, text), `${o.id} ${field}`).toBeTruthy();
      }
    }
  });
});
