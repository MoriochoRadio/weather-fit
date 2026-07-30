import type { StyleId, ToneFilter } from '../types';

const STYLE_KEY = 'weatherfit.style';
const TONE_KEY = 'weatherfit.tone';

const VALID_STYLES: StyleId[] = ['oldmoney', 'casual', 'formal', 'minimal'];
const VALID_TONES: ToneFilter[] = ['all', 'cool', 'warm'];

export function loadSavedStyle(): StyleId | null {
  try {
    const raw = localStorage.getItem(STYLE_KEY);
    return VALID_STYLES.includes(raw as StyleId) ? (raw as StyleId) : null;
  } catch {
    return null;
  }
}

export function saveStyle(style: StyleId): void {
  try {
    localStorage.setItem(STYLE_KEY, style);
  } catch {
    // 저장 실패는 치명적이지 않음
  }
}

export function loadSavedTone(): ToneFilter | null {
  try {
    const raw = localStorage.getItem(TONE_KEY);
    return VALID_TONES.includes(raw as ToneFilter) ? (raw as ToneFilter) : null;
  } catch {
    return null;
  }
}

export function saveTone(tone: ToneFilter): void {
  try {
    localStorage.setItem(TONE_KEY, tone);
  } catch {
    // 저장 실패는 치명적이지 않음
  }
}
