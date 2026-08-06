import type { WeatherSummary } from '../types';
import { buildBriefing } from '../engine/briefing';

interface Props {
  weather: WeatherSummary;
  /**
   * 오늘이 아니면 "지금 여기" 점을 찍지 않는다 (FR-35).
   * 현재 시각 점은 오늘 그래프에서만 뜻이 있는데, 날짜를 바꿔도 그대로 찍혀 사흘 뒤 그래프에
   * "지금"이 표시됐다 (v1.9 QA).
   */
  isToday?: boolean;
  /** '오늘' · '모레' 등 — 스크린리더가 어느 날 그래프인지 알 수 있게 */
  dayLabel?: string;
}

const W = 240;
const H = 56;
const PAD_X = 4;
const PAD_TOP = 14;
const PAD_BOTTOM = 12;

/**
 * 24시간 기온 스파크라인 + 강수 시간대 밴드 (FR-17).
 * 단일 시리즈라 범례 없음, 수치는 텍스트 토큰으로 표기.
 * 강수확률은 별도 축 대신 배경 밴드로 표시해 이중 축을 피한다.
 */
export default function DayBrief({ weather, isToday = true, dayLabel = '오늘' }: Props) {
  const brief = buildBriefing(weather);
  const h = weather.hourly;
  if (!brief || !h || h.temp.length < 2) return null;

  const n = h.temp.length;
  const min = Math.min(...h.temp);
  const max = Math.max(...h.temp);
  const span = Math.max(max - min, 1);
  const x = (i: number) => PAD_X + (i / (n - 1)) * (W - PAD_X * 2);
  const y = (t: number) => PAD_TOP + (1 - (t - min) / span) * (H - PAD_TOP - PAD_BOTTOM);
  const path = h.temp.map((t, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(t).toFixed(1)}`).join(' ');

  const minIdx = h.temp.indexOf(min);
  const maxIdx = h.temp.indexOf(max);
  const nowIdx = isToday ? h.hours.indexOf(new Date().getHours()) : -1;

  return (
    <section className="daybrief" aria-label={`${dayLabel} 하루 날씨 흐름`}>
      <div className="daybrief-top">
        <dl className="daybrief-segments">
          {brief.segments.map((s) => (
            <div key={s.label}>
              <dt>{s.label}</dt>
              <dd>{s.temp === null ? '–' : `${Math.round(s.temp)}°`}</dd>
            </div>
          ))}
        </dl>
        <svg
          className="sparkline"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`${dayLabel} 0시부터 23시까지 기온 흐름, 최저 ${Math.round(min)}도 최고 ${Math.round(max)}도`}
        >
          {brief.rainWindows.map((r) => {
            const i0 = h.hours.indexOf(r.startHour);
            const i1 = h.hours.indexOf(r.endHour - 1);
            if (i0 === -1 || i1 === -1) return null;
            return (
              <rect
                key={r.startHour}
                className="spark-rain"
                x={x(i0)}
                y={0}
                width={Math.max(x(i1) - x(i0), 2)}
                height={H}
              />
            );
          })}
          <path className="spark-line" d={path} />
          {nowIdx >= 0 && <circle className="spark-now" cx={x(nowIdx)} cy={y(h.temp[nowIdx])} r={3} />}
          <text className="spark-label" x={x(maxIdx)} y={y(max) - 4} textAnchor="middle">
            {Math.round(max)}°
          </text>
          <text className="spark-label" x={x(minIdx)} y={y(min) + 10} textAnchor="middle">
            {Math.round(min)}°
          </text>
        </svg>
      </div>
      {brief.lines.length > 0 && (
        <ul className="daybrief-lines">
          {brief.lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
