import type { City } from '../types';

export const DEFAULT_CITY: City = { name: '서울', latitude: 37.5665, longitude: 126.978 };

const STORAGE_KEY = 'weatherfit.city';

export function loadSavedCity(): City | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as City;
    if (typeof c.latitude !== 'number' || typeof c.longitude !== 'number' || !c.name) return null;
    return c;
  } catch {
    return null;
  }
}

export function saveCity(city: City): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(city));
  } catch {
    // 저장 실패는 치명적이지 않음
  }
}

/** 브라우저 위치 권한 시도. 거부/타임아웃 시 null */
export function getCurrentPosition(timeoutMs = 6000): Promise<City | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ name: '현재 위치', latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { timeout: timeoutMs, maximumAge: 30 * 60 * 1000 },
    );
  });
}

interface GeocodingResult {
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

export async function searchCities(query: string): Promise<City[]> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', query);
  url.searchParams.set('count', '5');
  url.searchParams.set('language', 'ko');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`도시 검색 오류 (${res.status})`);
  const data: { results?: GeocodingResult[] } = await res.json();
  return (data.results ?? []).map((r) => ({
    name: r.name,
    region: [r.admin1, r.country].filter(Boolean).join(', '),
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}
