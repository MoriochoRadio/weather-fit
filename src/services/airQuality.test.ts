import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAirQuality } from './airQuality';

function jsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => body } as Response;
}

describe('fetchAirQuality', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('정상 응답에서 pm2.5/pm10을 반환한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ current: { pm10: 40, pm2_5: 20 } })));
    const aq = await fetchAirQuality(37.5, 127);
    expect(aq).toEqual({ pm25: 20, pm10: 40 });
  });

  it('부가 정보라 실패해도 예외를 던지지 않고 null을 반환한다 (HTTP 오류)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, false)));
    await expect(fetchAirQuality(37.5, 127)).resolves.toBeNull();
  });

  it('스키마가 어긋난 응답이면 null을 반환한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ current: {} })));
    await expect(fetchAirQuality(37.5, 127)).resolves.toBeNull();
  });

  it('타임아웃돼도 null로 조용히 폴백한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        (_url: string, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(init.signal!.reason));
          }),
      ),
    );
    const promise = fetchAirQuality(37.5, 127);
    const assertion = expect(promise).resolves.toBeNull();
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;
  });
});
