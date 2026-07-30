interface AirQualityResponse {
  current: {
    pm10: number;
    pm2_5: number;
  };
}

const TIMEOUT_MS = 10_000;

function isValidResponse(data: unknown): data is AirQualityResponse {
  const d = data as Partial<AirQualityResponse> | null | undefined;
  return typeof d?.current?.pm10 === 'number' && typeof d?.current?.pm2_5 === 'number';
}

/**
 * 대기질(미세먼지)은 부가 정보라 실패해도 날씨 표시 자체를 막지 않는다 —
 * 어떤 이유로든 실패하면 null을 반환하고 예외를 던지지 않는다.
 */
export async function fetchAirQuality(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<{ pm25: number; pm10: number } | null> {
  const url = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('current', 'pm10,pm2_5');
  url.searchParams.set('timezone', 'auto');

  const controller = new AbortController();
  const onExternalAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', onExternalAbort, { once: true });
  const timeoutId = setTimeout(() => controller.abort(new DOMException('요청 시간이 초과됐어요', 'TimeoutError')), TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!isValidResponse(data)) return null;
    return { pm25: data.current.pm2_5, pm10: data.current.pm10 };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', onExternalAbort);
  }
}
