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

  // v1.8: past_days=1을 붙이면서 응답 앞에 어제가 끼어든다. "0번이 오늘"이라고 가정하면
  // 어제 날씨를 오늘로 표시하게 되므로, 날짜 문자열로 오늘 위치를 찾는지 확인한다.
  describe('past_days로 앞에 어제가 끼어든 응답 (FR-30/31)', () => {
    function withPastDay() {
      const now = new Date();
      const key = (offset: number) => {
        const d = new Date(now);
        d.setDate(d.getDate() + offset);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      };
      const body = validResponse() as ReturnType<typeof validResponse> & {
        daily: { time: string[] };
      };
      body.daily.time = [key(-1), key(0), key(1), key(2)];
      body.daily.temperature_2m_max = [10, 22, 27, 25];
      body.daily.temperature_2m_min = [3, 15, 18, 16];
      body.daily.precipitation_probability_max = [80, 30, 70, 10];
      body.daily.precipitation_sum = [12, 0, 3, 0];
      body.daily.weather_code = [61, 1, 61, 2];
      body.hourly.time = [
        ...Array.from({ length: 24 }, (_, h) => `${key(-1)}T${String(h).padStart(2, '0')}:00`),
        ...Array.from({ length: 24 }, (_, h) => `${key(0)}T${String(h).padStart(2, '0')}:00`),
      ];
      // 어제는 -100대, 오늘은 10~33 — 섞이면 바로 드러난다
      body.hourly.temperature_2m = [
        ...Array.from({ length: 24 }, (_, h) => -100 - h),
        ...Array.from({ length: 24 }, (_, h) => 10 + h),
      ];
      body.hourly.apparent_temperature = body.hourly.temperature_2m;
      body.hourly.precipitation_probability = [
        ...Array.from({ length: 24 }, () => 99),
        ...Array.from({ length: 24 }, () => 5),
      ];
      body.hourly.weather_code = [...Array.from({ length: 24 }, () => 61), ...Array.from({ length: 24 }, () => 1)];
      return body;
    }

    it('어제가 아니라 오늘 값을 대표 날씨로 쓴다', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(withPastDay())));
      const w = await fetchWeather(37.5, 127, '서울');
      expect(w.tempMax).toBe(22);
      expect(w.tempMin).toBe(15);
      expect(w.precipProb).toBe(30);
    });

    it('hourly도 어제 24개를 건너뛰고 오늘치만 쓴다', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(withPastDay())));
      const w = await fetchWeather(37.5, 127, '서울');
      expect(w.hourly?.temp).toEqual(Array.from({ length: 24 }, (_, h) => 10 + h));
      expect(w.hourly?.precipProb.every((p) => p === 5)).toBe(true);
    });

    it('어제·내일·주간 예보를 채운다', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(withPastDay())));
      const w = await fetchWeather(37.5, 127, '서울');
      expect(w.yesterday).toEqual({ tempMin: 3, tempMax: 10 });
      expect(w.tomorrow).toMatchObject({ tempMax: 27, precipProb: 70 });
      expect(w.week?.map((d) => d.tempMax)).toEqual([27, 25]);
    });
  });

  // v1.8.3: 기준 날짜를 기기 로컬 날짜로 잡으면 기기 시간대가 조회 지역과 다를 때 "오늘"을 못 찾고
  // 폴백(=어제)으로 떨어져 어제 날씨를 오늘로 표시했다 (QA).
  it('기기 시간대가 달라도 응답의 UTC 오프셋 기준으로 오늘을 찾는다', async () => {
    // 2026-08-05 13:00Z — UTC에서도 KST(+9)에서도 날짜는 8/5지만, +14 지역은 이미 8/6이다.
    // 테스트 러너의 시간대(로컬 KST / CI UTC)와 무관하게 결과가 갈리는 시점을 골랐다.
    vi.setSystemTime(new Date('2026-08-05T13:00:00Z'));
    const body = validResponse() as ReturnType<typeof validResponse> & {
      utc_offset_seconds: number;
      daily: { time: string[] };
    };
    body.utc_offset_seconds = 14 * 3600;
    body.daily.time = ['2026-08-05', '2026-08-06', '2026-08-07'];
    body.daily.temperature_2m_max = [10, 22, 27];
    body.daily.temperature_2m_min = [3, 15, 18];
    body.daily.precipitation_probability_max = [80, 30, 70];
    body.daily.precipitation_sum = [12, 0, 3];
    body.daily.weather_code = [61, 1, 61];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(body)));

    const w = await fetchWeather(-1.3, 172.9, '타라와');
    expect(w.tempMax).toBe(22); // 8/6(그 지역의 오늘) — 8/5의 10이 아니다
    expect(w.yesterday).toEqual({ tempMin: 3, tempMax: 10 });
  });

  it('UTC 오프셋이 없는 응답은 기기 로컬 날짜로 폴백한다', async () => {
    const body = validResponse() as ReturnType<typeof validResponse> & { daily: { time: string[] } };
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    body.daily.time = [key];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(body)));
    const w = await fetchWeather(37.5, 127, '서울');
    expect(w.tempMax).toBe(22);
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
