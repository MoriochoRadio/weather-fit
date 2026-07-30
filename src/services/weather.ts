import type { WeatherSummary } from '../types';

interface ForecastResponse {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  daily: {
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
    Array.isArray(d.hourly?.time) &&
    Array.isArray(d.hourly?.temperature_2m) &&
    Array.isArray(d.hourly?.apparent_temperature) &&
    Array.isArray(d.hourly?.precipitation_probability) &&
    Array.isArray(d.hourly?.weather_code);
  if (!ok) throw new Error('날씨 응답 형식이 올바르지 않습니다');
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
  url.searchParams.set('forecast_days', '2');
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

  return {
    city: cityName,
    tempNow: data.current.temperature_2m,
    feelsLike: data.current.apparent_temperature,
    tempMin: data.daily.temperature_2m_min[0],
    tempMax: data.daily.temperature_2m_max[0],
    precipProb: data.daily.precipitation_probability_max[0] ?? 0,
    precipSum: data.daily.precipitation_sum[0] ?? 0,
    windSpeed: data.current.wind_speed_10m,
    weatherCode: data.current.weather_code,
    uvIndex: data.daily.uv_index_max?.[0] ?? undefined,
    tomorrow:
      data.daily.temperature_2m_max.length > 1
        ? {
            tempMin: data.daily.temperature_2m_min[1],
            tempMax: data.daily.temperature_2m_max[1],
            precipProb: data.daily.precipitation_probability_max[1] ?? 0,
            weatherCode: data.daily.weather_code[1],
          }
        : undefined,
    hourly: {
      hours: data.hourly.time.map((t) => new Date(t).getHours()),
      temp: data.hourly.temperature_2m,
      feelsLike: data.hourly.apparent_temperature,
      precipProb: data.hourly.precipitation_probability.map((p) => p ?? 0),
      weatherCode: data.hourly.weather_code,
    },
  };
}
