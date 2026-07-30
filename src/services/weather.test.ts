import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWeather } from './weather';

function validResponse() {
  return {
    current: { temperature_2m: 20, apparent_temperature: 19, weather_code: 1, wind_speed_10m: 5 },
    daily: {
      temperature_2m_max: [22],
      temperature_2m_min: [15],
      precipitation_probability_max: [30],
      precipitation_sum: [0],
      weather_code: [1],
    },
    hourly: {
      time: ['2026-07-27T00:00'],
      temperature_2m: [18],
      apparent_temperature: [17],
      precipitation_probability: [20],
      weather_code: [1],
    },
  };
}

function jsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => body } as Response;
}

describe('fetchWeather', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('정상 응답을 WeatherSummary로 변환한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(validResponse())));
    const w = await fetchWeather(37.5, 127, '서울');
    expect(w.city).toBe('서울');
    expect(w.tempNow).toBe(20);
    expect(w.hourly?.hours).toEqual([0]);
    expect(w.tomorrow).toBeUndefined();
  });

  it('daily 배열에 이틀치가 있으면 내일 미리보기를 채운다 (FR-24)', async () => {
    const body = validResponse();
    body.daily.temperature_2m_max = [22, 27];
    body.daily.temperature_2m_min = [15, 18];
    body.daily.precipitation_probability_max = [30, 70];
    body.daily.weather_code = [1, 61];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(body)));
    const w = await fetchWeather(37.5, 127, '서울');
    expect(w.tomorrow).toEqual({ tempMin: 18, tempMax: 27, precipProb: 70, weatherCode: 61 });
  });

  it('hourly 배열에 내일치(이틀분 48개)가 섞여 와도 오늘 24개만 사용한다 (QA: 오늘/내일 혼합 회귀)', async () => {
    const body = validResponse();
    // 오늘 0~23시(temp 10~33) 뒤에 내일 0~23시(temp 100~123, 확연히 다른 값)를 이어붙인다
    const todayTimes = Array.from({ length: 24 }, (_, h) => `2026-07-27T${String(h).padStart(2, '0')}:00`);
    const tomorrowTimes = Array.from({ length: 24 }, (_, h) => `2026-07-28T${String(h).padStart(2, '0')}:00`);
    body.hourly.time = [...todayTimes, ...tomorrowTimes];
    body.hourly.temperature_2m = [
      ...Array.from({ length: 24 }, (_, h) => 10 + h),
      ...Array.from({ length: 24 }, (_, h) => 100 + h),
    ];
    body.hourly.apparent_temperature = body.hourly.temperature_2m;
    body.hourly.precipitation_probability = [...Array.from({ length: 24 }, () => 5), ...Array.from({ length: 24 }, () => 90)];
    body.hourly.weather_code = [...Array.from({ length: 24 }, () => 1), ...Array.from({ length: 24 }, () => 61)];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(body)));
    const w = await fetchWeather(37.5, 127, '서울');
    expect(w.hourly?.hours).toHaveLength(24);
    expect(w.hourly?.temp).toEqual(Array.from({ length: 24 }, (_, h) => 10 + h));
    expect(w.hourly?.precipProb.every((p) => p === 5)).toBe(true);
  });

  it('HTTP 오류 상태면 에러를 던진다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, false)));
    await expect(fetchWeather(37.5, 127, '서울')).rejects.toThrow(/날씨 API 오류/);
  });

  it('필수 필드가 없는 응답이면 명확한 에러를 던진다 (스키마 방어)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ current: {} })));
    await expect(fetchWeather(37.5, 127, '서울')).rejects.toThrow(/형식이 올바르지 않습니다/);
  });

  it('daily 배열이 비어 있으면 명확한 에러를 던진다', async () => {
    const body = validResponse();
    body.daily.temperature_2m_max = [];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(body)));
    await expect(fetchWeather(37.5, 127, '서울')).rejects.toThrow(/형식이 올바르지 않습니다/);
  });

  it('응답이 10초 넘게 걸리면 TimeoutError로 중단한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        (_url: string, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(init.signal!.reason));
          }),
      ),
    );
    const promise = fetchWeather(37.5, 127, '서울');
    const assertion = expect(promise).rejects.toMatchObject({ name: 'TimeoutError' });
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;
  });

  it('외부 signal로 취소하면 그 이유가 그대로 전달된다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        (_url: string, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(init.signal!.reason));
          }),
      ),
    );
    const controller = new AbortController();
    const promise = fetchWeather(37.5, 127, '서울', controller.signal);
    controller.abort(new DOMException('superseded', 'AbortError'));
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });
});
