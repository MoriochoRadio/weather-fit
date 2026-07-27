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

## 7. 테스트 전략

- **단위 테스트 (Vitest)**: `engine/recommend.ts` — 기온대 판정 경계값, 강수 필터, 조언 규칙, 데이터 커버리지(모든 스타일×기온대 조합에 코디 ≥ 2개).
- **수동 테스트**: 반응형(375/768/1280px), 위치 거부 흐름, API 실패 흐름 → 결과는 `docs/03-test-report.md`에 기록.
