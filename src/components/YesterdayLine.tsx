import type { WeatherSummary } from '../types';
import { yesterdayLine } from '../engine/briefing';

interface Props {
  weather: WeatherSummary;
}

/** 어제 대비 한 줄 (FR-30) — 사람은 절대 기온보다 "어제 입은 것"을 기준으로 옷을 고른다 */
export default function YesterdayLine({ weather }: Props) {
  if (!weather.yesterday) return null;
  const line = yesterdayLine(weather, weather.yesterday);
  if (!line) return null;
  return <p className="yesterday-line">{line}</p>;
}
