import type { City } from '../types';
import { cityKey } from '../data/regions';

export const DEFAULT_CITY: City = { name: '서울', region: '서울', latitude: 37.57, longitude: 126.98 };

const STORAGE_KEY = 'weatherfit.city';
const FAVORITES_KEY = 'weatherfit.favorites';

/**
 * 기본 즐겨찾기 지역 — 시·군 단위인 PROVINCES 데이터보다 세밀한 실생활 지점 3곳
 * (좌표는 위키백과·OpenStreetMap 기준 확인값).
 */
const DEFAULT_FAVORITES: City[] = [
  { name: '양평역', region: '영등포', latitude: 37.52556, longitude: 126.88611 },
  { name: '병점', region: '화성', latitude: 37.206806, longitude: 127.033111 },
  { name: '관저동', region: '대전', latitude: 36.2966447, longitude: 127.3371044 },
];

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

function isValidCity(c: unknown): c is City {
  const city = c as Partial<City> | null;
  return !!city && typeof city.latitude === 'number' && typeof city.longitude === 'number' && !!city.name;
}

/** 즐겨찾는 지역 목록 — 저장된 적 없으면 기본 3곳으로 시작 */
export function loadFavorites(): City[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return DEFAULT_FAVORITES;
    const list = JSON.parse(raw) as unknown;
    if (!Array.isArray(list)) return DEFAULT_FAVORITES;
    return list.filter(isValidCity);
  } catch {
    return DEFAULT_FAVORITES;
  }
}

export function saveFavorites(cities: City[]): void {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(cities));
  } catch {
    // 저장 실패는 치명적이지 않음
  }
}

export function isFavorite(city: City, favorites: City[]): boolean {
  const key = cityKey(city);
  return favorites.some((f) => cityKey(f) === key);
}

/** 즐겨찾기에 있으면 빼고, 없으면 더한 새 목록을 반환 (저장까지 수행) */
export function toggleFavorite(city: City, favorites: City[]): City[] {
  const next = isFavorite(city, favorites)
    ? favorites.filter((f) => cityKey(f) !== cityKey(city))
    : [...favorites, city];
  saveFavorites(next);
  return next;
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

