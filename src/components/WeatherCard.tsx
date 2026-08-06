import type { WeatherSummary } from '../types';
import { BAND_LABELS, aqiLabel, aqiLevel, referenceTemp, tempBand, weatherIcon } from '../engine/recommend';

interface Props {
  weather: WeatherSummary;
  /**
   * 지금 시각(0~23). 아래 코디 추천과 같은 기준으로 기온대를 잡기 위해 받는다 (FR-28).
   * 이걸 넘기지 않던 시절엔 저녁 7시에 열어도 카드는 한낮 기준 "선선"이라고 하면서
   * 바로 아래엔 "추움" 코디가 깔려 같은 화면이 서로 다른 말을 했다 (QA).
   */
  nowHour?: number;
  /** 오늘이 아닌 날짜를 보고 있으면 false — 실측값(현재 기온·바람)을 예보처럼 보여주지 않기 위해 (FR-35) */
  isToday?: boolean;
  /** '내일' · '8/9' 등 지금 보고 있는 날짜 이름 */
  dayLabel?: string;
}

export default function WeatherCard({ weather, nowHour, isToday = true, dayLabel = '오늘' }: Props) {
  const band = tempBand(referenceTemp(weather, isToday ? nowHour : undefined));
  return (
    <section className="weather" aria-label={`${dayLabel} 날씨`}>
      <div className="weather-main">
        <span className="weather-temp">{Math.round(isToday ? weather.tempNow : weather.tempMax)}°</span>
        <div className="weather-desc">
          <span className="weather-sky">{weatherIcon(weather.weatherCode)}</span>
          <span className="weather-band">
            {dayLabel}의 체감 — {BAND_LABELS[band]}
          </span>
          {/* 예보 날짜에서 큰 숫자가 "지금 기온"으로 오해되지 않게 무엇을 띄운 건지 밝힌다 */}
          {!isToday && <span className="weather-note">낮 최고 기준</span>}
        </div>
      </div>
      <dl className="weather-detail">
        <div>
          <dt>최저 / 최고</dt>
          <dd>
            {Math.round(weather.tempMin)}° / {Math.round(weather.tempMax)}°
          </dd>
        </div>
        <div>
          <dt>{isToday ? '체감' : '낮 평균 체감'}</dt>
          <dd>{Math.round(weather.feelsLike)}°</dd>
        </div>
        <div>
          <dt>강수확률</dt>
          <dd>{Math.round(weather.precipProb)}%</dd>
        </div>
        {/* 예보에 그날 최대 풍속이 없으면(구버전 응답 등) NaN이 들어오므로 항목째 빼야 "NaNkm/h"가 안 뜬다 */}
        {Number.isFinite(weather.windSpeed) && (
          <div>
            <dt>{isToday ? '바람' : '최대 바람'}</dt>
            <dd>{Math.round(weather.windSpeed)}km/h</dd>
          </div>
        )}
        {weather.airQuality && (
          <div>
            <dt>미세먼지</dt>
            <dd>{aqiLabel(aqiLevel(weather.airQuality.pm25, weather.airQuality.pm10))}</dd>
          </div>
        )}
        {weather.uvIndex !== undefined && (
          <div>
            <dt>자외선</dt>
            <dd>{Math.round(weather.uvIndex)}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}
