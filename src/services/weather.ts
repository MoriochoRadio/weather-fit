import type { DailyForecast, WeatherSummary } from '../types';

interface ForecastResponse {
  /** timezone=auto로 정해진 조회 지역의 UTC 오프셋(초) — 응답에 없을 수도 있어 옵셔널 */
  utc_offset_seconds?: number;
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  daily: {
    /** YYYY-MM-DD 배열 — 오늘이 몇 번째인지 찾는 데 쓴다 */
    time?: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: (number | null)[];
    precipitation_sum: number[];
    weather_code: number[];
    uv_index_max?: (number | null)[];
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    apparent_temperature: number[];
    precipitation_probability: (number | null)[];
    weather_code: number[];
  };
}

const TIMEOUT_MS = 10_000;
const HOURS_PER_DAY = 24;
/** 오늘 이후 며칠까지 주간 예보로 보여줄지 (FR-31) */
const WEEK_DAYS = 6;

/** 필수 필드가 있는지 확인 — API가 부분 장애로 스키마가 어긋난 응답을 주면 조용히 죽지 않고 명확한 에러를 던진다 */
function assertValidResponse(data: unknown): asserts data is ForecastResponse {
  const d = data as Partial<ForecastResponse> | null | undefined;
  const ok =
    d != null &&
    typeof d.current?.temperature_2m === 'number' &&
    typeof d.current?.apparent_temperature === 'number' &&
    typeof d.current?.weather_code === 'number' &&
    Array.isArray(d.daily?.temperature_2m_max) &&
    d.daily!.temperature_2m_max.length > 0 &&
    Array.isArray(d.daily?.temperature_2m_min) &&
    Array.isArray(d.daily?.precipitation_probability_max) &&
    Array.isArray(d.daily?.precipitation_sum) &&
    Array.isArray(d.daily?.weather_code) &&
    Array.isArray(d.hourly?.time) &&
    Array.isArray(d.hourly?.temperature_2m) &&
    Array.isArray(d.hourly?.apparent_temperature) &&
    Array.isArray(d.hourly?.precipitation_probability) &&
    Array.isArray(d.hourly?.weather_code);
  if (!ok) throw new Error('날씨 응답 형식이 올바르지 않습니다');
}

/**
 * 응답에서 "오늘"을 찾을 때 쓸 날짜 문자열.
 *
 * timezone=auto로 받은 응답의 시각은 조회 지역(한국) 기준인데, 기준 날짜를 기기 로컬 날짜로 잡으면
 * 기기 시간대가 KST가 아닐 때(해외에서 열람, 시간대를 바꿔 둔 기기 등) 날짜가 어긋난다. 그러면
 * findDayStart가 오늘을 못 찾고 폴백 인덱스(=어제)로 떨어져 어제 날씨를 오늘로 표시하게 된다 (QA).
 * 응답이 알려 주는 UTC 오프셋이 있으면 그걸로 지역 기준 날짜를 계산한다.
 *
 * @param utcOffsetSeconds 없으면(구버전 응답 등) 기기 로컬 날짜로 폴백
 */
function localDateKey(utcOffsetSeconds?: number): string {
  const now = new Date();
  if (utcOffsetSeconds === undefined) {
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${mm}-${dd}`;
  }
  // UTC 기준 시각을 지역 오프셋만큼 민 뒤 UTC 필드를 읽으면 기기 시간대와 무관하게 지역 날짜가 나온다
  const shifted = new Date(now.getTime() + utcOffsetSeconds * 1000);
  const mm = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(shifted.getUTCDate()).padStart(2, '0');
  return `${shifted.getUTCFullYear()}-${mm}-${dd}`;
}

/**
 * 배열에서 오늘 날짜가 시작되는 위치를 찾는다.
 *
 * past_days를 붙이면 응답 앞쪽에 어제가 끼어들어 인덱스가 통째로 밀린다. "0번이 오늘"이라고
 * 가정하면 파라미터를 바꿀 때마다 조용히 어긋나므로(QA), 고정 오프셋 대신 날짜 문자열로 찾는다.
 * 날짜 배열이 없으면(구버전 응답·테스트 목) fallback을 쓴다.
 */
function findDayStart(times: string[] | undefined, date: string, fallback: number): number {
  if (!times) return fallback;
  const i = times.findIndex((t) => t.startsWith(date));
  return i >= 0 ? i : fallback;
}

/**
 * @param signal 호출 측(App)이 요청을 취소하고 싶을 때 넘기는 시그널 (예: 더 최신 요청으로 대체될 때)
 */
export async function fetchWeather(
  latitude: number,
  longitude: number,
  cityName: string,
  signal?: AbortSignal,
): Promise<WeatherSummary> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('current', 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m');
  url.searchParams.set(
    'daily',
    'temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,weather_code,uv_index_max',
  );
  url.searchParams.set('hourly', 'temperature_2m,apparent_temperature,precipitation_probability,weather_code');
  // 어제 비교(FR-30)용 1일 + 오늘/주간 예보(FR-31)용 7일
  url.searchParams.set('past_days', '1');
  url.searchParams.set('forecast_days', '7');
  url.searchParams.set('timezone', 'auto');

  const controller = new AbortController();
  const onExternalAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', onExternalAbort, { once: true });
  const timeoutId = setTimeout(
    () => controller.abort(new DOMException('요청 시간이 초과됐어요', 'TimeoutError')),
    TIMEOUT_MS,
  );

  let res: Response;
  try {
    res = await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', onExternalAbort);
  }
  if (!res.ok) throw new Error(`날씨 API 오류 (${res.status})`);
  const data: unknown = await res.json();
  assertValidResponse(data);

  const today = localDateKey(data.utc_offset_seconds);
  const d = data.daily;
  // past_days=1이면 0번이 어제고 1번이 오늘 — 날짜로 직접 찾는다
  const di = findDayStart(d.time, today, 0);
  const day = (offset: number): DailyForecast | undefined => {
    const i = di + offset;
    if (i < 0 || i >= d.temperature_2m_max.length || d.temperature_2m_max[i] === undefined) return undefined;
    return {
      date: d.time?.[i] ?? '',
      tempMin: d.temperature_2m_min[i],
      tempMax: d.temperature_2m_max[i],
      precipProb: d.precipitation_probability_max[i] ?? 0,
      weatherCode: d.weather_code[i],
    };
  };

  const yesterday = day(-1);
  const tomorrow = day(1);
  const week: DailyForecast[] = [];
  for (let n = 1; n <= WEEK_DAYS; n++) {
    const f = day(n);
    if (f) week.push(f);
  }

  // hourly는 요청한 날짜 수만큼 이어져 온다. 시각(0~23)만 저장하므로 오늘 24개만 잘라 쓰지 않으면
  // 어제 09시·오늘 09시·내일 09시가 같은 "9"로 뭉개져 브리핑·추천 기준온도가 오염된다 (QA).
  const hi = findDayStart(data.hourly.time, today, 0);
  const slice = <T>(arr: T[]): T[] => arr.slice(hi, hi + HOURS_PER_DAY);

  return {
    city: cityName,
    tempNow: data.current.temperature_2m,
    feelsLike: data.current.apparent_temperature,
    tempMin: d.temperature_2m_min[di],
    tempMax: d.temperature_2m_max[di],
    precipProb: d.precipitation_probability_max[di] ?? 0,
    precipSum: d.precipitation_sum[di] ?? 0,
    windSpeed: data.current.wind_speed_10m,
    weatherCode: data.current.weather_code,
    uvIndex: d.uv_index_max?.[di] ?? undefined,
    tomorrow: tomorrow
      ? {
          tempMin: tomorrow.tempMin,
          tempMax: tomorrow.tempMax,
          precipProb: tomorrow.precipProb,
          weatherCode: tomorrow.weatherCode,
        }
      : undefined,
    yesterday: yesterday ? { tempMin: yesterday.tempMin, tempMax: yesterday.tempMax } : undefined,
    week: week.length > 0 ? week : undefined,
    hourly: {
      hours: slice(data.hourly.time).map((t) => new Date(t).getHours()),
      temp: slice(data.hourly.temperature_2m),
      feelsLike: slice(data.hourly.apparent_temperature),
      precipProb: slice(data.hourly.precipitation_probability).map((p) => p ?? 0),
      weatherCode: slice(data.hourly.weather_code),
    },
  };
}
