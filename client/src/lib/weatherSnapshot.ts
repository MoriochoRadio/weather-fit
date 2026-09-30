/**
 * Open-Meteo 응답과, 오프라인 대비로 localStorage에 저장해 둔 그 스냅샷의 모양.
 *
 * 저장된 스냅샷은 예전 버전의 앱이 다른 모양으로 남겼을 수도 있고 손상됐을 수도 있다.
 * 모양을 확인하지 않고 쓰면 첫 렌더에서 `weather.current.apparent_temperature` 같은
 * 접근이 TypeError를 내며 화면 전체가 죽는다. 화면이 읽는 최소 형태만 확인하고,
 * 맞지 않으면 스냅샷이 없는 것처럼 다룬다.
 */
export type WeatherData = {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    time: string;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    /** 예상 강수량(mm). 이 필드를 받기 전에 저장된 스냅샷에는 없다. */
    precipitation_sum?: number[];
    uv_index_max: number[];
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
  };
};

const CURRENT_NUMBERS = ["temperature_2m", "apparent_temperature", "relative_humidity_2m", "weather_code", "wind_speed_10m"] as const;
const DAILY_ARRAYS = ["time", "weather_code", "temperature_2m_max", "temperature_2m_min", "precipitation_probability_max", "uv_index_max"] as const;
const HOURLY_ARRAYS = ["time", "temperature_2m", "precipitation_probability"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 화면이 읽는 최소 형태를 갖췄으면 WeatherData로, 아니면 null. */
export function weatherFromUnknown(value: unknown): WeatherData | null {
  if (!isRecord(value)) return null;
  const { current, daily, hourly } = value;
  if (!isRecord(current) || !isRecord(daily) || !isRecord(hourly)) return null;
  if (typeof current.time !== "string" || !CURRENT_NUMBERS.every((key) => typeof current[key] === "number")) return null;
  if (!DAILY_ARRAYS.every((key) => Array.isArray(daily[key])) || !HOURLY_ARRAYS.every((key) => Array.isArray(hourly[key]))) return null;
  if ((daily.time as unknown[]).length === 0 || typeof (daily.time as unknown[])[0] !== "string") return null;

  const snapshot = value as WeatherData;
  // 선택 필드가 배열이 아니면 없는 것으로 본다 — 스냅샷 전체를 버릴 이유는 아니다.
  if (daily.precipitation_sum !== undefined && !Array.isArray(daily.precipitation_sum)) {
    return { ...snapshot, daily: { ...snapshot.daily, precipitation_sum: undefined } };
  }
  return snapshot;
}
