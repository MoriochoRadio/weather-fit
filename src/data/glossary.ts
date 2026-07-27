import type { OutfitItems } from '../types';

export interface GlossaryEntry {
  term: string;
  /** 지정 시 해당 아이템 칸에서만 매칭 (동음이의어 구분용) */
  fields?: (keyof OutfitItems)[];
  meaning: string;
  sub: string;
}

/**
 * 코디 아이템에 쓰인 패션 용어를 일반인 눈높이로 풀이한 사전.
 * sub = "이 옷이 없다면" 대체제 안내.
 */
export const GLOSSARY: GlossaryEntry[] = [
  // ── 아우터 ──
  {
    term: '발마칸 코트',
    meaning: '어깨 재봉선 없이 소매가 목둘레에서 바로 이어져 낙낙하게 떨어지는 기본 코트',
    sub: '여유 있는 핏의 무난한 싱글 코트나 트렌치 코트',
  },
  {
    term: '체스터필드 코트',
    meaning: '무릎 길이의 가장 기본적인 정장용 코트 (양복 위에 입는 그 코트)',
    sub: '어두운 색의 단정한 롱코트 아무거나',
  },
  {
    term: '더블브레스티드',
    meaning: '단추가 두 줄로 달려 앞판이 겹쳐 잠기는 디자인 — 좀 더 격식 있고 클래식한 느낌',
    sub: '단추 한 줄짜리(싱글) 코트로도 충분',
  },
  {
    term: '맥코트',
    meaning: '셔츠 카라처럼 생긴 깃에 단추가 가려지는, 장식이 거의 없는 미니멀한 싱글 코트',
    sub: '깔끔한 싱글 코트',
  },
  {
    term: '트렌치 코트',
    meaning: '허리 벨트가 달린 바바리코트 (형사 드라마의 그 코트)',
    sub: '봄가을용 얇은 롱코트',
  },
  {
    term: '블루종',
    meaning: '밑단과 소매 끝이 조여지는 허리 길이의 짧은 점퍼',
    sub: '항공점퍼(MA-1)나 야구잠바처럼 기장이 짧은 점퍼',
  },
  {
    term: '셔켓',
    meaning: '셔츠+재킷 합성어. 두꺼운 셔츠를 겉옷처럼 걸쳐 입는 옷',
    sub: '두꺼운 체크 셔츠나 청재킷을 겉옷처럼',
  },
  {
    term: '숏패딩',
    meaning: '허리 길이의 짧은 패딩',
    sub: '기장이 긴 패딩이면 하의를 슬림하게 입어 균형을 맞추기',
  },
  {
    term: '구스다운',
    meaning: '거위털을 채운 고급 패딩 — 가볍고 따뜻함',
    sub: '오리털(덕다운) 패딩도 충분히 따뜻함',
  },
  {
    term: '블레이저',
    meaning: '정장 상의만 단품으로 입는 재킷',
    sub: '정장 세트의 자켓만 꺼내 입어도 됨 (단, 세트 바지와 같이 두면 무난)',
  },
  {
    term: '스포츠 자켓',
    meaning: '정장 자켓보다 캐주얼한 단품 재킷 — 체크나 트위드 같은 질감 있는 원단이 많음',
    sub: '네이비 블레이저',
  },
  {
    term: '가디건',
    meaning: '앞을 단추로 여미는 니트',
    sub: '집업 니트나 얇은 니트를 어깨에 걸치기',
  },
  {
    term: '트위드',
    meaning: '표면이 거칠고 도톰한 모직 원단 — 클래식하고 따뜻한 느낌',
    sub: '질감이 있는 울 자켓이면 비슷한 분위기',
  },
  {
    term: '헤링본',
    meaning: '청어 뼈 모양(V자가 반복되는) 패턴의 원단',
    sub: '무늬 없는 같은 색 원단으로도 무방',
  },

  // ── 상의 ──
  {
    term: '터틀넥',
    meaning: '목폴라 — 목을 덮는 니트',
    sub: '반목(하프넥) 니트나 니트 + 머플러 조합',
  },
  {
    term: '옥스포드 셔츠',
    meaning: '도톰하고 살짝 캐주얼한 면 셔츠 — 카라 끝에 단추가 달린 경우가 많음',
    sub: '아무 단정한 면 셔츠',
  },
  {
    term: '포플린',
    meaning: '얇고 매끈한 정장 셔츠용 원단',
    sub: '다림질 잘 된 일반 와이셔츠',
  },
  {
    term: '니트 폴로',
    meaning: '카라가 달린 니트 — 스웨터 소재로 된 카라티라고 생각하면 됨',
    sub: '얇은 니트, 또는 단정한 무지 카라티',
  },
  {
    term: '피케 폴로',
    meaning: '흔히 아는 카라티(폴로셔츠) — 표면이 오돌토돌한 면 소재',
    sub: '무지 카라티 아무거나',
  },
  {
    term: '오픈카라',
    meaning: '카라가 넓게 젖혀지는 여름 셔츠 (볼링 셔츠 같은 깃)',
    sub: '일반 반팔 셔츠의 첫 단추를 풀어 입기',
  },
  {
    term: '케이블 니트',
    meaning: '꽈배기 무늬가 들어간 니트',
    sub: '무늬 없는 도톰한 니트',
  },
  {
    term: '크루넥',
    meaning: '목선이 둥근 가장 기본형',
    sub: '기본 라운드넥이면 동일',
  },
  {
    term: '보트넥',
    meaning: '목선이 옆으로 넓게 파인 형태 — 프랑스 선원 셔츠 느낌',
    sub: '기본 라운드넥 스트라이프 티',
  },
  {
    term: '램스울',
    meaning: '어린 양의 털 — 부드럽고 합리적인 가격의 니트 소재',
    sub: '울 혼방 니트',
  },
  {
    term: '캐시미어',
    meaning: '캐시미어 산양의 털 — 가볍고 아주 부드러운 고급 소재',
    sub: '울 혼방으로도 충분 (캐시미어 10~30% 혼방이 가성비)',
  },
  {
    term: '미드게이지',
    meaning: '실 굵기가 중간인 니트 — 너무 얇지도 두껍지도 않은 스웨터',
    sub: '적당한 두께의 스웨터면 동일',
  },
  {
    term: '니트 베스트',
    meaning: '니트로 된 조끼 — 셔츠나 티 위에 겹쳐 입는 용도',
    sub: '얇은 니트를 셔츠 위에 겹쳐 입기',
  },
  {
    term: '헤비코튼',
    meaning: '두껍고 탄탄한 면 — 비치지 않고 형태가 잘 유지되는 티셔츠 원단',
    sub: '두께감 있는 무지 티셔츠',
  },
  {
    term: '수피마',
    meaning: '섬유가 길고 고운 고급 면 — 부드럽고 늘어짐이 적음',
    sub: '두께감 있는 무지 티셔츠',
  },
  {
    term: '기모',
    meaning: '안쪽에 보풀을 일으켜 공기를 품게 만든 따뜻한 원단',
    sub: '두꺼운 맨투맨/후디',
  },
  {
    term: '스웻셔츠',
    meaning: '맨투맨과 같은 말',
    sub: '기본 맨투맨',
  },

  // ── 하의 ──
  {
    term: '슬랙스',
    meaning: '정장 바지처럼 부드럽게 떨어지는 천 바지',
    sub: '어두운 색 단정한 면바지',
  },
  {
    term: '치노',
    meaning: '면바지 — 청바지보다 단정하고 슬랙스보다 캐주얼함',
    sub: '무난한 면바지 아무거나',
  },
  {
    term: '플란넬',
    meaning: '표면에 살짝 기모가 있는 부드러운 모직 — 겨울 정장 원단',
    sub: '도톰한 울 슬랙스',
  },
  {
    term: '코듀로이',
    meaning: '골덴 — 세로 골이 파인 원단',
    sub: '도톰한 면바지',
  },
  {
    term: '테이퍼드',
    meaning: '아래로 갈수록 통이 좁아지는 핏 — 단정해 보임',
    sub: '일자핏 바지',
  },
  {
    term: '와이드',
    meaning: '통이 넓은 핏 — 요즘 유행하는 여유 있는 실루엣',
    sub: '통이 여유 있는 일자핏',
  },
  {
    term: '플리츠',
    meaning: '허리 아래에 주름을 잡아 여유를 준 바지 — 클래식한 느낌',
    sub: '주름 없는(노턱) 슬랙스',
  },
  {
    term: '밴딩',
    meaning: '허리가 고무줄로 된 편한 바지',
    sub: '벨트 없이 편한 바지',
  },
  {
    term: '버뮤다',
    meaning: '무릎 길이의 반바지',
    sub: '무릎 근처 기장의 단정한 반바지',
  },
  {
    term: '트로피컬',
    meaning: '여름용으로 얇고 성글게 짠 정장 모직 — 보기보다 시원함',
    sub: '얇은 여름 슬랙스',
  },
  {
    term: '시어서커',
    meaning: '표면이 우글우글한 여름 원단 — 피부에 붙지 않아 시원함',
    sub: '린넨이나 얇은 면 소재',
  },
  {
    term: '린넨',
    meaning: '마 소재 — 시원하지만 잘 구겨짐 (구김이 자연스러운 멋)',
    sub: '얇은 면, 또는 린넨 혼방',
  },
  {
    term: '워시드',
    meaning: '여러 번 빨아 색이 자연스럽게 바랜 가공',
    sub: '너무 새것 느낌이 아닌 청바지',
  },

  // ── 신발 ──
  {
    term: '페니 로퍼',
    fields: ['shoes'],
    meaning: '앞부분에 가로 밴드(동전을 끼우던 홈)가 있는, 끈 없이 신는 단화',
    sub: '끈 없는 단정한 구두 아무거나',
  },
  {
    term: '태슬 로퍼',
    fields: ['shoes'],
    meaning: '앞에 술 장식이 달린 로퍼',
    sub: '기본 로퍼',
  },
  {
    term: '로퍼',
    fields: ['shoes'],
    meaning: '끈 없이 신는 단화 — 구두보다 편하고 운동화보다 격식 있음',
    sub: '깔끔한 가죽 스니커',
  },
  {
    term: '더비',
    fields: ['shoes'],
    meaning: '끈을 매는 단정한 구두 중 발등이 여유로운 타입 — 옥스포드보다 살짝 캐주얼',
    sub: '끈 매는 검정/갈색 구두',
  },
  {
    term: '옥스포드',
    fields: ['shoes'],
    meaning: '끈을 매는 구두 중 가장 격식 있는 타입',
    sub: '끈 매는 단정한 검정 구두',
  },
  {
    term: '플레인토',
    fields: ['shoes'],
    meaning: '앞코에 장식이나 절개선이 없는 매끈한 구두',
    sub: '장식 적은 단정한 구두',
  },
  {
    term: '첼시 부츠',
    fields: ['shoes'],
    meaning: '옆에 고무 밴드가 있어 끈 없이 신고 벗는 발목 부츠',
    sub: '목이 짧은 단정한 부츠',
  },
  {
    term: '데저트 부츠',
    fields: ['shoes'],
    meaning: '스웨이드로 된 심플한 발목 부츠 — 캐주얼용',
    sub: '가벼운 갈색 계열 부츠나 스니커',
  },
  {
    term: '저먼 트레이너',
    fields: ['shoes'],
    meaning: "'독일군 스니커'로 불리는 장식 없는 흰 운동화",
    sub: '깔끔한 흰색 운동화',
  },
  {
    term: '스웨이드',
    meaning: '가죽의 안쪽 면을 보풀려 만든 소재 — 부드럽지만 비에 약함',
    sub: '매끈한 일반 가죽 제품 (비 오는 날 특히)',
  },
  {
    term: '슬립온',
    fields: ['shoes'],
    meaning: '끈 없이 신는 운동화',
    sub: '끈이 있는 캔버스 스니커',
  },

  // ── 액세서리 ──
  {
    term: '사코슈',
    meaning: '끈으로 매는 납작하고 작은 크로스백',
    sub: '작은 크로스백 아무거나',
  },
  {
    term: '포켓스퀘어',
    meaning: '자켓 가슴 주머니에 꽂는 장식용 손수건. TV폴드는 일자로 접어 끝만 살짝 보이게 꽂는 방법',
    sub: '없어도 됨 — 있으면 격식이 한 단계 올라감',
  },
  {
    term: '타이바',
    meaning: '넥타이가 흔들리지 않게 셔츠에 고정하는 금속 핀',
    sub: '없어도 무방',
  },
  {
    term: '니트 타이',
    meaning: '니트로 짠 넥타이 — 일반 넥타이보다 부드럽고 덜 딱딱한 인상',
    sub: '무지 어두운 색 넥타이',
  },
  {
    term: '파나마햇',
    meaning: '밀짚 느낌의 여름용 챙 모자',
    sub: '없어도 됨 — 야외가 길면 아무 챙 모자',
  },
  {
    term: '버킷햇',
    meaning: '챙이 아래로 둘러진 벙거지 모자',
    sub: '야구모자(볼캡), 또는 없어도 됨',
  },

  // ── 색 이름 ──
  {
    term: '에크루',
    meaning: '표백하지 않은 자연스러운 미색 — 아이보리보다 살짝 누런빛',
    sub: '아이보리/크림색',
  },
  {
    term: '오트밀',
    meaning: '오트밀죽 색 — 베이지가 섞인 밝은 회색',
    sub: '밝은 베이지나 라이트 그레이',
  },
  {
    term: '캐멀',
    meaning: '낙타색 — 노란기가 도는 밝은 갈색',
    sub: '밝은 갈색/베이지 계열',
  },
  {
    term: '버건디',
    meaning: '와인색 — 어두운 자줏빛 빨강',
    sub: '어두운 빨강 계열',
  },
  {
    term: '세이지',
    meaning: '회색빛이 도는 차분한 연녹색',
    sub: '카키나 올리브 계열',
  },
  {
    term: '그레이지',
    meaning: '그레이와 베이지의 중간색',
    sub: '라이트 그레이',
  },
  {
    term: '인디고',
    meaning: '청바지 특유의 진한 남색',
    sub: '진청 데님',
  },
];

export interface GlossaryMatch extends GlossaryEntry {
  /** 매칭된 아이템 칸 (아우터/상의 등) */
  field: keyof OutfitItems;
}

/** 긴 용어 우선 매칭, 이미 매칭된 텍스트 구간은 중복 매칭하지 않음 */
const SORTED = [...GLOSSARY].sort((a, b) => b.term.length - a.term.length);

export function findGlossary(items: OutfitItems): GlossaryMatch[] {
  const matches: GlossaryMatch[] = [];
  const fields = Object.keys(items) as (keyof OutfitItems)[];
  for (const field of fields) {
    const text = items[field];
    if (!text) continue;
    const consumed: Array<[number, number]> = [];
    for (const entry of SORTED) {
      if (entry.fields && !entry.fields.includes(field)) continue;
      const idx = text.indexOf(entry.term);
      if (idx === -1) continue;
      const end = idx + entry.term.length;
      if (consumed.some(([s, e]) => idx < e && end > s)) continue;
      consumed.push([idx, end]);
      if (!matches.some((m) => m.term === entry.term)) {
        matches.push({ ...entry, field });
      }
    }
  }
  return matches;
}
