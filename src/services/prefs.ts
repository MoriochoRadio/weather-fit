import type { StyleId, ToneFilter } from '../types';
import { familyById } from '../data/colorFamilies';

const STYLE_KEY = 'weatherfit.style';
const TONE_KEY = 'weatherfit.tone';
const COMBO_TOP_KEY = 'weatherfit.comboTop';

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

/** 색 조합 화면에서 마지막으로 본 상의 색 (FR-36) — 자기 옷장 색은 잘 바뀌지 않는다 */
export function loadSavedComboTop(): string | null {
  try {
    const raw = localStorage.getItem(COMBO_TOP_KEY);
    // 색 목록에서 빠진 id가 저장돼 있으면(버전 차이) 무시하고 기본값으로 돌아간다
    return raw && familyById(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function saveComboTop(id: string): void {
  try {
    localStorage.setItem(COMBO_TOP_KEY, id);
  } catch {
    // 저장 실패는 치명적이지 않음
  }
}
