/**
 * 아이템 텍스트 → 실제 색상(hex) 추출 (FR-19).
 * "차콜 캐시미어 코트"처럼 색 이름이 포함된 아이템 문구에서 대표 색을 뽑아
 * 코디 실루엣에 그대로 칠하기 위한 매핑. 글자로만 있던 색을 눈으로 보이게 한다.
 */
export interface ColorEntry {
  keyword: string;
  hex: string;
}

const COLOR_ENTRIES: ColorEntry[] = [
  { keyword: '라이트그레이', hex: '#c8ccd2' },
  { keyword: '미디엄그레이', hex: '#9aa0aa' },
  { keyword: '페일그레이', hex: '#d9dde2' },
  { keyword: '오프화이트', hex: '#f1f3f2' },
  { keyword: '다크네이비', hex: '#1f2636' },
  { keyword: '아이스블루', hex: '#cfdce8' },
  { keyword: '페일블루', hex: '#d7e3ec' },
  { keyword: '스카이블루', hex: '#a9c4dc' },
  { keyword: '다크브라운', hex: '#3f2f22' },
  { keyword: '저먼 트레이너', hex: '#f1f3f2' },
  { keyword: '고무창', hex: '#e7eaee' },
  { keyword: '차콜', hex: '#3c3f45' },
  { keyword: '그레이', hex: '#8b8f98' },
  { keyword: '네이비', hex: '#232f49' },
  { keyword: '블랙', hex: '#15171b' },
  { keyword: '화이트', hex: '#f6f8f9' },
  { keyword: '크림', hex: '#efe6cf' },
  { keyword: '아이보리', hex: '#f1ead8' },
  { keyword: '에크루', hex: '#e8dfc9' },
  { keyword: '오트밀', hex: '#ded6c4' },
  { keyword: '캐멀', hex: '#b5915f' },
  { keyword: '버건디', hex: '#6d2734' },
  { keyword: '브라운', hex: '#6b5138' },
  { keyword: '올리브', hex: '#5a5f46' },
  { keyword: '베이지', hex: '#d8c9a3' },
  { keyword: '진청', hex: '#1f2636' },
  { keyword: '인디고', hex: '#2c3a55' },
  { keyword: '데님', hex: '#41546e' },
];

/** 긴 키워드부터 먼저 검사 (예: '다크네이비'가 '네이비'보다 먼저 매칭되도록) */
const SORTED_ENTRIES = [...COLOR_ENTRIES].sort((a, b) => b.keyword.length - a.keyword.length);

/**
 * 텍스트에서 색 키워드를 찾아 hex를 반환. 못 찾으면(예: "동일 톤 팬츠"처럼
 * 앞선 아이템 색을 참조하는 문구) 호출 측이 지정한 기본색으로 대체한다.
 */
export function extractColor(text: string, fallback: string): string {
  for (const entry of SORTED_ENTRIES) {
    if (text.includes(entry.keyword)) return entry.hex;
  }
  return fallback;
}
