# WeatherFit — 오늘의 코디

오늘 날씨에 맞춰 남성 패션 코디를 추천하는 웹앱.
20대 후반 남성, **올드머니 · 캐주얼 · 포멀 · 미니멀** 스타일 기준.

**▶ 사용하기: https://moriochoradio.github.io/weather-fit/**
(아이폰 Safari에서 열고 공유 → "홈 화면에 추가"하면 앱처럼 쓸 수 있어요.
`main`에 푸시하면 GitHub Actions가 테스트 후 자동 배포합니다.)

## 주요 기능

- 현재 위치(권한 허용 시) 또는 **전국 시·군 선택**(17개 시·도, 161개 지역 내장)으로 오늘 날씨 표시 — 기온·체감·최저/최고·강수확률·바람. 한국 전용이라 지오코딩 API 의존이 없다
- **즐겨찾는 지역**을 여러 곳 저장해 원클릭으로 전환 — 시·군보다 세밀한 지점(역·동 등)도 등록 가능
- 코디는 **차분한 쿨톤**(네이비·차콜·그레이·아이스블루) 위주 + **웜톤**(캐멀·버건디·베이지)도 병행 — `전체/쿨톤/웜톤` 필터로 골라 볼 수 있고, 코디마다 "조용한 포인트" 한 곳을 명시
- **일일 브리핑**: 시간별 예보로 하루 흐름을 분석 — "아침 24° → 낮 31° → 저녁 27°" + 기온 스파크라인 + "오후 2시~6시 비 — 우산 챙기세요" 같은 행동 조언
- 아이템마다 **아이콘**(반팔/긴팔/코트/패딩/반바지/부츠/샌들 등)으로 어떤 옷인지 한눈에 구분
- 상의·하의·아우터·신발의 **실제 색을 옷 모양에 칠한 미니 실루엣**으로, 입어보기 전에도 색 조합이 한눈에 와닿게 표시
- 날씨를 종합한 **코디 추천**: 기온대 6단계 × 스타일 4종, 조합마다 2벌 이상
- 비·눈·폭염·한파·일교차·강풍에 대한 **날씨 대응 조언**과 우천 취약 소재 경고
- 매일 날짜 기반으로 **추천 순서가 바뀜** (같은 날은 새로고침해도 고정)
- **쉽게 풀이**: 발마칸 코트, 시어서커 같은 패션 용어를 일반인 눈높이로 설명하고, 옷장에 없을 때의 **대체제**까지 안내
- **대안 코디 더 보기**: 현재 기온대 근처("더 시원하게 / 쌀쌀하게 느껴진다면")의 코디도 추가로 제공
- iPhone Safari · PC 반응형, 다크모드 자동 대응
- 서버·API 키 불필요 (Open-Meteo 무료 API)

## 실행 방법

```bash
npm install
npm run dev      # 개발 서버 (http://localhost:5173)
npm test         # 단위 테스트
npm run build    # 프로덕션 빌드 → dist/
npm run preview  # 빌드 결과 미리보기
```

아이폰에서 쓰려면: 빌드 결과(`dist/`)를 아무 정적 호스팅(Vercel, Netlify, GitHub Pages 등)에 올리고
Safari에서 열어 **공유 → 홈 화면에 추가**하면 앱처럼 사용할 수 있습니다.

## 기술 스택

Vite + React 18 + TypeScript · 순수 CSS · Vitest · [Open-Meteo](https://open-meteo.com) (날씨/지오코딩)

코디 실루엣의 옷 모양 아이콘은 [game-icons.net](https://game-icons.net) (CC BY 3.0) 에셋을 사용했습니다 —
저작자 [Delapouite](https://delapouite.com/), [Lorc](http://lorcblog.blogspot.com/). 색상만 코디에 맞게 재적용했습니다.

## 프로젝트 문서

정석적인 단계별 개발 문서는 [`docs/`](docs)에 있습니다.

| 문서 | 내용 |
|---|---|
| [00-development-plan.md](docs/00-development-plan.md) | 개발 방법론·기술 선정·형상관리 규칙 |
| [01-requirements.md](docs/01-requirements.md) | 기능/비기능 요구사항, 유스케이스, 수용 기준 |
| [02-design.md](docs/02-design.md) | 아키텍처·데이터 모델·추천 룰 엔진·UI 설계 |
| [03-test-report.md](docs/03-test-report.md) | 단위/수동 테스트 결과, 결함 기록 |

## 구조

```
src/
├── engine/recommend.ts   # 추천 룰 엔진 (순수 함수, 테스트 대상)
├── data/outfits.ts       # 코디 데이터 43벌
├── services/weather.ts   # Open-Meteo 날씨 API
├── services/geo.ts       # 위치 권한 · 도시 검색 · 저장
└── components/           # WeatherCard, StyleTabs, OutfitCard, CitySearch …
```
