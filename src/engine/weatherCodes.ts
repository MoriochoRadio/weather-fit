/**
 * WMO 기상 코드 분류 (Open-Meteo weather_code).
 *
 * recommend.ts와 briefing.ts가 모두 필요로 하는데, 한쪽에 두면 서로 import하며 순환 참조가 되므로
 * 별도 모듈로 분리한다.
 */
export const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);
export const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);

export function isSnowCode(code: number): boolean {
  return SNOW_CODES.has(code);
}

export function isRainCode(code: number): boolean {
  return RAIN_CODES.has(code);
}

/**
 * 강수를 가리키는 낱말 — 눈이 오는 날 "비 소식이 있어요"라고 안내하던 문제 때문 (QA).
 * 코드를 모르면(구버전 캐시 등) 더 일반적인 '비'로 둔다.
 */
export function precipWord(code?: number): '비' | '눈' {
  return code !== undefined && isSnowCode(code) ? '눈' : '비';
}
