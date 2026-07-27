import type { City } from '../types';

export const DEFAULT_CITY: City = { name: '서울', region: '서울', latitude: 37.57, longitude: 126.98 };

const STORAGE_KEY = 'weatherfit.city';

export function loadSavedCity(): City | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as City;
    if (typeof c.latitude !== 'number' || typeof c.longitude !== 'number' || !c.name) return null;
    // v1.1 이전(지오코딩 시절) 저장분: region이 "경상남도, 대한민국" 같은 형태 → 표시에서 제외
    if (c.region && (c.region.includes(',') || c.region.length > 4)) c.region = undefined;
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

