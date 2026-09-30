import { describe, expect, it } from "vitest";
import { weatherFromUnknown } from "./weatherSnapshot";

function sample() {
  return {
    current: { temperature_2m: 22, apparent_temperature: 23.5, relative_humidity_2m: 58, weather_code: 0, wind_speed_10m: 9, time: "2026-09-30T14:00" },
    daily: {
      time: ["2026-09-30", "2026-10-01"],
      weather_code: [51, 1],
      temperature_2m_max: [24, 20],
      temperature_2m_min: [17, 12],
      precipitation_probability_max: [84, 2],
      precipitation_sum: [1.7, 0],
      uv_index_max: [5.1, 5.5],
    },
    hourly: { time: ["2026-09-30T00:00"], temperature_2m: [18], precipitation_probability: [10] },
  };
}

describe("weatherFromUnknown — 저장 스냅샷 최소 형태 검증", () => {
  it("Open-Meteo 응답 모양이면 그대로 쓴다", () => {
    const data = sample();
    expect(weatherFromUnknown(data)).toEqual(data);
  });

  it("강수량 필드가 없는 구버전 스냅샷도 쓴다", () => {
    const { precipitation_sum: _omit, ...daily } = sample().daily;
    const result = weatherFromUnknown({ ...sample(), daily });
    expect(result).not.toBeNull();
    expect(result?.daily.precipitation_sum).toBeUndefined();
  });

  it("선택 필드만 모양이 틀리면 그 필드만 버린다", () => {
    const data = sample();
    const result = weatherFromUnknown({ ...data, daily: { ...data.daily, precipitation_sum: "1.7" } });
    expect(result?.daily.precipitation_sum).toBeUndefined();
    expect(result?.daily.time).toEqual(data.daily.time);
  });

  it("다른 모양·손상된 값은 무시한다 (첫 렌더 TypeError 재현 케이스)", () => {
    // 예전 앱이 남긴 요약형 스냅샷 — current가 없어 weather.current.* 접근이 터진다.
    expect(weatherFromUnknown({ city: "서울", tempNow: 22, feelsLike: 23, precipProb: 84 })).toBeNull();
    expect(weatherFromUnknown(null)).toBeNull();
    expect(weatherFromUnknown("snapshot")).toBeNull();
    expect(weatherFromUnknown([])).toBeNull();

    const data = sample();
    const { uv_index_max: _uv, ...dailyWithoutUv } = data.daily;
    expect(weatherFromUnknown({ ...data, daily: dailyWithoutUv })).toBeNull();
    expect(weatherFromUnknown({ ...data, daily: { ...data.daily, time: [] } })).toBeNull();
    expect(weatherFromUnknown({ ...data, current: { ...data.current, apparent_temperature: "23" } })).toBeNull();
    expect(weatherFromUnknown({ ...data, current: { ...data.current, time: undefined } })).toBeNull();
    expect(weatherFromUnknown({ ...data, hourly: null })).toBeNull();
  });
});
