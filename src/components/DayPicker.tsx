import type { DayOption } from '../engine/dayView';
import { BAND_LABELS, tempBand, weatherIcon } from '../engine/recommend';
import { precipWord } from '../engine/weatherCodes';

interface Props {
  days: DayOption[];
  selected: string;
  onSelect: (date: string) => void;
}

/**
 * 날짜 선택 스트립 (FR-35).
 *
 * 접혀 있던 "이번 주 예보" 목록을 대체한다 — 예보를 읽는 것과 그날 코디를 보는 것이
 * 원래 같은 행동("모레 뭐 입지")인데 화면이 나뉘어 있었다. 날짜 자체를 누르는 물건으로
 * 만들고, 그 안에 예보(날씨·최고/최저·기온대)를 함께 넣어 하나로 합쳤다.
 */
export default function DayPicker({ days, selected, onSelect }: Props) {
  if (days.length <= 1) return null;

  return (
    <section className="daypicker" aria-label="날짜 선택">
      <div className="daypicker-strip" role="group" aria-label="코디를 볼 날짜">
        {days.map((d) => {
          // 하루 대표 체감을 직접 알 수 없는 칩 단계에선 최고·최저 중간값으로 기온대를 가늠한다
          const band = tempBand((d.tempMax + d.tempMin) / 2);
          const active = d.date === selected;
          const rainy = d.precipProb >= 50;
          /*
            칩 안의 숫자들만 읽히면 "35도 26도"가 되어 어느 쪽이 최고인지 알 수 없다 —
            보이는 것과 같은 정보를 문장으로 다시 적는다.
          */
          const label = [
            d.label,
            d.weekday && !d.isToday ? `${d.weekday}요일` : '',
            weatherIcon(d.weatherCode),
            `최고 ${Math.round(d.tempMax)}도 최저 ${Math.round(d.tempMin)}도`,
            BAND_LABELS[band],
            rainy ? `${precipWord(d.weatherCode)} 올 확률 ${Math.round(d.precipProb)}퍼센트` : '',
          ]
            .filter(Boolean)
            .join(', ');
          return (
            <button
              key={d.date}
              type="button"
              className={active ? 'daychip active' : 'daychip'}
              aria-pressed={active}
              aria-label={label}
              onClick={() => onSelect(d.date)}
            >
              <span className="daychip-label">
                {d.label}
                {!d.isToday && d.weekday && <span className="daychip-weekday">{d.weekday}</span>}
              </span>
              <span className="daychip-sky">{weatherIcon(d.weatherCode)}</span>
              <span className="daychip-temp">
                <b>{Math.round(d.tempMax)}°</b>
                <span className="daychip-min">{Math.round(d.tempMin)}°</span>
              </span>
              <span className="daychip-band">{BAND_LABELS[band]}</span>
              {/* 눈 오는 날을 "비"라고 하지 않도록 그날 날씨 코드로 낱말을 고른다 (다른 예보 표시와 동일 규칙) */}
              {rainy && (
                <span className="daychip-rain">
                  {precipWord(d.weatherCode)} {Math.round(d.precipProb)}%
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
