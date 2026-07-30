import type { WeatherSummary } from '../types';
import { weatherIcon } from '../engine/recommend';
import { tomorrowLine } from '../engine/briefing';

interface Props {
  weather: WeatherSummary;
}

/** 내일 미리보기 한 줄 (FR-24) — 자기 전에 다음날 준비를 가늠할 수 있게 */
export default function TomorrowPreview({ weather }: Props) {
  if (!weather.tomorrow) return null;
  return (
    <p className="tomorrow-preview">
      {tomorrowLine(weather, weather.tomorrow)} · {weatherIcon(weather.tomorrow.weatherCode)}{' '}
      {Math.round(weather.tomorrow.tempMin)}° / {Math.round(weather.tomorrow.tempMax)}°
    </p>
  );
}
