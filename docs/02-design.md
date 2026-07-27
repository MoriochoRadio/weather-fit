# 02. 설계서 (Design Document)

- **작성일**: 2026-07-27
- **버전**: 1.0

## 1. 시스템 아키텍처

서버 없는 **정적 SPA**. 외부 의존은 Open-Meteo API 두 개뿐이며 API 키가 없다.

```
┌─────────────────────────────────────────────┐
│  브라우저 (React SPA)                        │
│                                             │
│  App ─┬─ services/geo.ts     ── Geolocation │──▶ Open-Meteo Geocoding API
│       ├─ services/weather.ts ── fetch       │──▶ Open-Meteo Forecast API
│       ├─ engine/recommend.ts (룰 엔진, 순수) │
│       ├─ data/outfits.ts     (코디 데이터)   │
│       └─ components/* (WeatherCard, Tabs,   │
│                        OutfitCard, Search)  │
│  localStorage: 마지막 선택 도시              │
└─────────────────────────────────────────────┘
```

- **룰 엔진은 순수 함수**로 작성해 UI와 완전 분리 → 단위 테스트 대상.
- 날씨 API 실패 시: 에러 배너 + 재시도 버튼 (NFR-05).

## 2. 외부 API

### 2.1 Open-Meteo Forecast
`GET https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,weather_code&timezone=auto`

### 2.2 Open-Meteo Geocoding (도시 검색)
`GET https://geocoding-api.open-meteo.com/v1/search?name={query}&count=5&language=ko`

### 2.3 WMO weather_code 매핑
| 코드 | 상태 | 아이콘 |
|---|---|---|
| 0 | 맑음 | ☀️ |
| 1–2 | 대체로 맑음/구름 조금 | 🌤️ |
| 3 | 흐림 | ☁️ |
| 45,48 | 안개 | 🌫️ |
| 51–57, 61–67, 80–82 | 비 | 🌧️ |
| 71–77, 85–86 | 눈 | 🌨️ |
| 95–99 | 뇌우 | ⛈️ |

## 3. 데이터 모델

```ts
type TempBand = 'freezing' | 'cold' | 'chilly' | 'mild' | 'warm' | 'hot';

interface WeatherSummary {
  city: string;
  tempNow: number;        // 현재 기온 ℃
  feelsLike: number;      // 체감 온도 ℃
  tempMin: number;
  tempMax: number;
  precipProb: number;     // 강수확률 최대 %
  precipSum: number;      // 일 강수량 mm
  windSpeed: number;      // km/h
  weatherCode: number;    // WMO code
}

type StyleId = 'oldmoney' | 'casual' | 'formal' | 'minimal';

interface Outfit {
  id: string;
  style: StyleId;
  bands: TempBand[];      // 이 코디가 적합한 기온대
  name: string;           // 코디 이름 (예: "네이비 블레이저 클래식")
  items: {                // 아이템 구성
    outer?: string;
    top: string;
    bottom: string;
    shoes: string;
    acc?: string;
  };
  tip: string;            // 스타일링 팁
  rainOk: boolean;        // 강수 시에도 무난한가 (스웨이드 등 취약 소재 여부)
  palette: string[];      // 코디 대표 색 3~4개 (hex) — 카드에 색 견본으로 표시
}
```

## 4. 추천 룰 엔진 설계

### 4.1 기온대(TempBand) 판정
기준 온도 = `(오늘 최고기온 + 체감온도) / 2` — 아침에 봐도 낮 기준으로 입도록 최고기온에 가중.

| Band | 기준 온도 |
|---|---|
| freezing | < 0℃ |
| cold | 0 ~ 8℃ |
| chilly | 9 ~ 16℃ |
| mild | 17 ~ 22℃ |
| warm | 23 ~ 27℃ |
| hot | ≥ 28℃ |

### 4.2 필터링·정렬 규칙
1. 카테고리·기온대가 일치하는 코디를 후보로 뽑는다.
2. **강수 규칙**: 강수확률 ≥ 60% 또는 강수량 ≥ 1mm면 `rainOk: false` 코디는 후순위로 밀고 경고 뱃지를 단다(제거하지 않음 — 선택지는 유지).
3. 날짜 기반 시드로 섞어 **매일 다른 순서**로 보여준다 (같은 날은 순서 고정 → 새로고침해도 안 바뀜).
4. 대표 추천 = 기본 카테고리(올드머니) 후보 1순위.

### 4.3 날씨 조언(Advice) 규칙
| 조건 | 조언 |
|---|---|
| 강수확률 ≥ 60% 또는 비/뇌우 코드 | "우산 챙기세요" + 방수 신발 권장 |
| 눈 코드 | 미끄럼 주의, 방한 부츠 |
| 일교차(최고-최저) ≥ 10℃ | 레이어링(겉옷 탈착) 권장 |
| 체감 ≤ -10℃ | 한파: 목도리·장갑·히트텍 |
| 체감 ≥ 33℃ | 폭염: 통기성 소재, 밝은 색 |
| 풍속 ≥ 30km/h | 강풍: 모자·가벼운 아이템 주의 |

## 5. 코디 데이터 설계

- 4개 스타일 × 6개 기온대를 모두 커버, **기온대·카테고리 조합마다 최소 2개** (FR-05).
- 코디는 `bands`에 인접 기온대를 복수 지정 가능 (예: 니트 코디 = cold+chilly).
- 총 40여 개 코디를 `data/outfits.ts`에 정적 데이터로 작성.
- 페르소나(20대 후반 남성, 깔끔함 선호)에 맞게 색은 뉴트럴 중심.

## 6. UI 설계

### 6.1 화면 구성 (단일 페이지)
```
┌──────────────────────────────┐
│ 헤더: 로고 · 위치명 · 도시검색/새로고침 │
│ 날씨 카드: 아이콘·현재기온·최고/최저·  │
│           강수확률·바람 (한 줄 요약)   │
│ 조언 칩: [☔ 우산] [🧥 레이어링] …    │
│ 카테고리 탭: 올드머니|캐주얼|포멀|미니멀 │
│ 코디 카드 목록 (모바일: 가로 스와이프,  │
│   PC: 그리드) — 카드: 코디명·아이템·   │
│   색 팔레트·팁·(우천 경고 뱃지)        │
└──────────────────────────────┘
```

### 6.2 반응형 기준
- `< 720px`: 코디 카드 가로 스크롤(스냅), 날씨 카드 컴팩트
- `≥ 720px`: 코디 카드 2~3열 그리드

### 6.3 디자인 방향
- 올드머니 무드: 크림/아이보리 배경, 딥그린·네이비 포인트, 세리프 헤딩
- 다크모드: `prefers-color-scheme` 대응 (권장 수준)

## 7. 용어 풀이 · 대체제 설계 (v1.1, FR-10/11)

```ts
interface GlossaryEntry {
  term: string;        // 아이템 텍스트에서 부분 일치로 찾는 용어
  fields?: (keyof OutfitItems)[]; // 동음이의어 구분 (예: '옥스포드'는 shoes에서만 구두)
  meaning: string;     // 일반인 눈높이 설명
  sub: string;         // 없을 때 대체제 안내
}
```

- `src/data/glossary.ts`에 정적 데이터로 관리. 매칭은 **긴 용어 우선**(예: '옥스포드 셔츠'가 '옥스포드'보다 먼저), 이미 매칭된 구간은 중복 매칭하지 않는다 (`findGlossary()` 순수 함수 — 테스트 대상).
- UI: 코디 카드 하단 "쉽게 풀이 · 대체 아이템" 토글 → 각주 스타일 패널에 `용어 — 설명 (없으면: 대체제)` 목록 표시. 호버 툴팁은 iPhone에서 쓸 수 없으므로 탭 토글 방식.

## 8. 대안 코디 규칙 (v1.1, FR-12)

- 현재 기온대의 **인접 기온대(±1)** 코디를 대안으로 제공한다.
  - 더운 쪽 인접 밴드 → "더 시원하게 입고 싶다면"
  - 추운 쪽 인접 밴드 → "쌀쌀하게 느껴진다면"
- 본 추천에 이미 나온 코디(밴드가 겹치는 코디)는 대안에서 제외한다.
- 최저/최고 밴드(freezing/hot)에서는 한쪽 대안만 존재한다.
- UI: 본 추천 아래 "대안 코디 더 보기" 토글 섹션. 카드 번호는 `ALT 01…`로 구분.

## 9. 한국 지역 데이터 설계 (v1.2, FR-13)

- `src/data/regions.ts`에 **대한민국 전역 시/군 좌표를 정적 내장** — 외부 지오코딩 API 의존 제거.
- 구조: `{ province: string; cities: { name; latitude; longitude }[] }[]` — 17개 시·도.
- 광역시(서울·부산·대구·인천·광주·대전·울산·세종)는 단일 지점: 도심 구 단위는 기상 차이가 무의미하고 좌표 오류 위험만 커짐.
- 도 단위는 전 시/군 수록 (경기 31, 강원 18, 충북 11, 충남 15, 전북 14, 전남 22, 경북 22, 경남 18, 제주 2).
- UI: 네이티브 `<select>` + `<optgroup>` 2단 구조 한 개 — iPhone에서 휠 피커로 열려 접근성·모바일 UX가 커스텀 드롭다운보다 낫다.
- 기존 Open-Meteo 지오코딩 검색(해외 포함)은 제거. Forecast API 호출은 동일.

## 10. 쿨톤 스타일 방침 (v1.2, FR-14)

- 코디 색상 원칙: **베이스 = 네이비·차콜·그레이·화이트·블랙**, 포인트는 코디당 1곳(아이스블루·스틸블루·페일그레이 등 차가운 계열, 소재·실루엣 포인트 포함).
- 금지: 강렬한 원색, 웜톤 주조색(캐멀·버건디·머스터드 주조), 화려한 패턴.
- 데이터 반영: `Outfit.point` 필드 신설 — 이 코디의 "조용한 포인트"가 무엇인지 한 줄 명시, 카드에 표시.
- 앱 UI 테마도 웜 크림 → **쿨 포슬린**(한지 느낌의 차가운 회백지 + 딥네이비·스틸블루 잉크)으로 전환.

## 11. v1.3 설계 추가

### 11.1 톤 모델 (FR-14/15)
- `Outfit.tone: 'cool' | 'warm'` 필드 신설. 기존 43벌은 cool, 웜톤 코디를 별도 추가.
- 팔레트 검증 규칙 분리: cool은 기존 규칙(R−B≤10) 유지, warm은 완화(R−B≤100)하되 **고채도 원색 금지(채널차≤100)는 공통**.
- `recommend()`에 톤 필터 인자 추가. '전체'일 때 쿨톤 우선 정렬(안정 정렬로 시드 순서 유지).

### 11.2 아이템 아이콘 (FR-16)
- 사진 대신 **인라인 SVG 라인 아이콘**: 저작권·용량·로딩 문제가 없고 쿨톤 테마 색을 그대로 따른다(`stroke: currentColor`).
- 아이템 텍스트 키워드 → 아이콘 매핑 (`components/ItemIcon.tsx`의 순수 함수 `pickIcon(field, text)` — 테스트 대상):
  - outer: 패딩/다운→패딩, 코트/트렌치/발마칸/맥/체스터필드→코트, 그 외→자켓
  - top: '반팔'·'피케 폴로' 포함→반팔, 셔츠→셔츠, 니트/터틀넥/맨투맨/후디/가디건→니트, 그 외→긴팔
  - bottom: 쇼츠/버뮤다→반바지, 그 외→긴바지
  - shoes: 부츠→부츠, 샌들→샌들, 스니커/트레이너/슬립온→스니커, 그 외→구두
  - acc: 모자/캡/햇→모자, 백/토트/사코슈/브리프→가방, 시계→시계, 머플러→머플러, 그 외→장갑 겸 범용

### 11.3 일일 브리핑 엔진 (FR-17)
- Forecast API에 `hourly=temperature_2m,apparent_temperature,precipitation_probability,weather_code` 추가 (24h).
- `engine/briefing.ts` (순수 함수, 테스트 대상):
  - 시간대 구분: 아침 6–11시 / 낮 11–17시 / 저녁 17–22시 — 각 구간 대표 기온(평균)
  - 강수 구간 탐지: 확률 ≥ 50%가 연속되는 시간 구간 → "오후 2시~6시 비 예보 — 외출 시 우산"
  - 기온 흐름 문장: "아침 24° → 낮 31° → 저녁 27°" + 일교차 시 겉옷 조언
  - 추천 기준 온도도 **활동 시간대(9–21시) 평균 체감**을 반영해 하루 전체에 적합하게 보정
- **LLM 미사용 결정**: LLM API는 키·서버가 필요해 NFR-03(키 없는 정적 앱)과 충돌. 동일한 사용자 가치(하루 요약·행동 조언)를 룰 기반으로 제공. 추후 서버리스 프록시를 두면 LLM 요약으로 교체 가능하도록 브리핑을 문자열 배열 인터페이스로 분리.
- UI: 날씨 카드 아래 `DayBrief` — 아침/낮/저녁 3칸 + 24시간 기온 스파크라인(SVG) + 브리핑 문장.

### 11.4 배포 (FR-18)
- 정적 빌드(`dist/`)를 그대로 올릴 수 있는 호스팅 중 **유지보수 제로** 우선.
- GitHub Pages: Actions 워크플로로 push 시 자동 배포. **private 레포는 유료 플랜 필요** — 무료 플랜이면 레포 공개 전환 또는 대안(Cloudflare/Vercel/Netlify) 중 사용자 결정.
- Vite `base` 설정: Pages 프로젝트 사이트는 `/weather-fit/` 경로 필요.

## 12. 테스트 전략

- **단위 테스트 (Vitest)**: `engine/recommend.ts` — 기온대 판정 경계값, 강수 필터, 조언 규칙, 데이터 커버리지(모든 스타일×기온대 조합에 코디 ≥ 2개).
- **수동 테스트**: 반응형(375/768/1280px), 위치 거부 흐름, API 실패 흐름 → 결과는 `docs/03-test-report.md`에 기록.
