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
}

export default function WeatherCard({ weather, nowHour }: Props) {
  const band = tempBand(referenceTemp(weather, nowHour));
  return (
    <section className="weather" aria-label="오늘 날씨">
      <div className="weather-main">
        <span className="weather-temp">{Math.round(weather.tempNow)}°</span>
        <div className="weather-desc">
          <span className="weather-sky">{weatherIcon(weather.weatherCode)}</span>
          <span className="weather-band">오늘의 체감 — {BAND_LABELS[band]}</span>
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
          <dt>체감</dt>
          <dd>{Math.round(weather.feelsLike)}°</dd>
        </div>
        <div>
          <dt>강수확률</dt>
          <dd>{Math.round(weather.precipProb)}%</dd>
        </div>
        <div>
          <dt>바람</dt>
          <dd>{Math.round(weather.windSpeed)}km/h</dd>
        </div>
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
