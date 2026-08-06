export type TempBand = 'freezing' | 'cold' | 'chilly' | 'mild' | 'warm' | 'hot';

/** 시간별 예보 (오늘 0~23시) */
export interface HourlyForecast {
  /** 각 항목의 시각 (0~23) */
  hours: number[];
  temp: number[];
  feelsLike: number[];
  precipProb: number[];
  weatherCode: number[];
}

export interface WeatherSummary {
  city: string;
  tempNow: number;
  feelsLike: number;
  tempMin: number;
  tempMax: number;
  precipProb: number;
  precipSum: number;
  windSpeed: number;
  weatherCode: number;
  /** 하루 전체 시간 흐름 (FR-17) — 구버전 캐시 등으로 없을 수 있음 */
  hourly?: HourlyForecast;
  /** 오늘 최고 자외선지수 (FR-21) — 대기질 API처럼 별도 실패 가능성이 있어 옵셔널 */
  uvIndex?: number;
  /** 미세먼지 — 별도 API(대기질) 실패 시 없을 수 있음 (FR-21) */
  airQuality?: { pm25: number; pm10: number };
  /** 내일 미리보기 (FR-24) — forecast_days=1로 받은 구버전 캐시 등으로 없을 수 있음 */
  tomorrow?: { tempMin: number; tempMax: number; precipProb: number; weatherCode: number };
  /** 어제 기온 — "어제보다 몇 도" 비교용 (FR-30). past_days 없이 받은 구버전 캐시엔 없음 */
  yesterday?: { tempMin: number; tempMax: number };
  /**
   * 오늘부터 앞으로 며칠치 하루 단위 날씨 (FR-35 "다른 날짜 코디").
   * **0번이 반드시 오늘**이고 시간별 예보까지 들고 있어, 아무 날짜나 골라 오늘과 똑같은
   * 품질의 추천을 만들 수 있다. 구버전 캐시엔 없다.
   */
  days?: DayWeather[];
}

/**
 * 하루치 날씨 (FR-35).
 * 일별 요약(DailyForecast)과 달리 시간별 흐름을 함께 들고 있어, 그날의 활동 시간대
 * 평균 체감으로 기온대를 잡을 수 있다 — 최고/최저 중간값보다 실제에 가깝다.
 */
export interface DayWeather {
  /** YYYY-MM-DD (지역 시간대 기준) */
  date: string;
  tempMin: number;
  tempMax: number;
  precipProb: number;
  precipSum: number;
  weatherCode: number;
  uvIndex?: number;
  /**
   * 그날 최대 풍속 (km/h).
   * 현재 풍속은 **실측이라 다른 날짜에 쓸 수 없다** — 지금 부는 바람으로 닷새 뒤 강풍 조언을
   * 띄우게 된다 (v1.9 QA). 하루 대표값을 따로 받아 온다.
   */
  windMax?: number;
  hourly?: HourlyForecast;
}

/** 일별 요약 한 칸 — 어제·내일 비교(FR-30/24)에 쓴다 */
export interface DailyForecast {
  /** YYYY-MM-DD (지역 시간대 기준) */
  date: string;
  tempMin: number;
  tempMax: number;
  precipProb: number;
  weatherCode: number;
}

export type StyleId = 'oldmoney' | 'casual' | 'formal' | 'minimal';

export interface OutfitItems {
  outer?: string;
  top: string;
  bottom: string;
  shoes: string;
  acc?: string;
}

/** 코디 색 톤 — 쿨톤 위주 서비스지만 웜톤도 병행 제공 (FR-14/15) */
export type Tone = 'cool' | 'warm';

export type ToneFilter = 'all' | Tone;

export interface Outfit {
  id: string;
  style: StyleId;
  tone: Tone;
  bands: TempBand[];
  name: string;
  items: OutfitItems;
  tip: string;
  /** 이 코디의 "조용한 포인트" 한 줄 (FR-14) */
  point: string;
  rainOk: boolean;
  palette: string[];
}

export interface Advice {
  id: string;
  text: string;
  emphasis: boolean;
}

export interface City {
  name: string;
  region?: string;
  latitude: number;
  longitude: number;
}
