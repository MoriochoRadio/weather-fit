import { useState } from 'react';
import type { WeatherSummary } from '../types';
import { BAND_LABELS, tempBand, weatherIcon } from '../engine/recommend';
import { precipWord } from '../engine/weatherCodes';

interface Props {
  weather: WeatherSummary;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function dayLabel(date: string, index: number): string {
  if (index === 0) return '내일';
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return `+${index + 1}일`;
  return `${d.getMonth() + 1}/${d.getDate()} (${WEEKDAYS[d.getDay()]})`;
}

/**
 * 이번 주 미리보기 (FR-31).
 * "이번 주에 뭘 준비해 둬야 하나"에 답하는 게 목적이라, 기온 숫자뿐 아니라
 * 그날이 어느 기온대(한파~더움)인지까지 함께 보여준다.
 */
export default function WeekForecast({ weather }: Props) {
  const [open, setOpen] = useState(false);
  const week = weather.week;
  if (!week || week.length === 0) return null;

  return (
    <section className="week" aria-label="주간 예보">
      <button type="button" className="text-btn" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {open ? '이번 주 예보 접기' : `이번 주 예보 보기 (${week.length}일)`}
      </button>
      {open && (
        <ul className="week-list">
          {week.map((d, i) => {
            // 하루 대표 체감을 알 수 없으므로 최고·최저 중간값으로 기온대를 가늠한다
            const band = tempBand((d.tempMax + d.tempMin) / 2);
            return (
              <li key={d.date || i} className="week-day">
                <span className="week-date">{dayLabel(d.date, i)}</span>
                <span className="week-sky">{weatherIcon(d.weatherCode)}</span>
                <span className="week-temp">
                  <b>{Math.round(d.tempMax)}°</b> / {Math.round(d.tempMin)}°
                </span>
                <span className="week-band">{BAND_LABELS[band]}</span>
                {/* 눈 오는 날을 "비"라고 안내하던 문제 — 그날 날씨 코드로 낱말을 고른다 (QA, tomorrowLine과 동일 규칙) */}
                {d.precipProb >= 50 && (
                  <span className="week-rain">
                    {precipWord(d.weatherCode)} {Math.round(d.precipProb)}%
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
