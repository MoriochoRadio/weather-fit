import type { WeatherSummary } from '../types';

interface ForecastResponse {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  daily: {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: (number | null)[];
    precipitation_sum: number[];
    weather_code: number[];
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    apparent_temperature: number[];
    precipitation_probability: (number | null)[];
    weather_code: number[];
  };
}

export async function fetchWeather(latitude: number, longitude: number, cityName: string): Promise<WeatherSummary> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('current', 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m');
  url.searchParams.set(
    'daily',
    'temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,weather_code',
  );
  url.searchParams.set('hourly', 'temperature_2m,apparent_temperature,precipitation_probability,weather_code');
  url.searchParams.set('forecast_days', '1');
  url.searchParams.set('timezone', 'auto');

  const res = await fetch(url);
  if (!res.ok) throw new Error(`날씨 API 오류 (${res.status})`);
  const data: ForecastResponse = await res.json();

  return {
    city: cityName,
    tempNow: data.current.temperature_2m,
    feelsLike: data.current.apparent_temperature,
    tempMin: data.daily.temperature_2m_min[0],
    tempMax: data.daily.temperature_2m_max[0],
    precipProb: data.daily.precipitation_probability_max[0] ?? 0,
    precipSum: data.daily.precipitation_sum[0] ?? 0,
    windSpeed: data.current.wind_speed_10m,
    weatherCode: data.current.weather_code,
    hourly: {
      hours: data.hourly.time.map((t) => new Date(t).getHours()),
      temp: data.hourly.temperature_2m,
      feelsLike: data.hourly.apparent_temperature,
      precipProb: data.hourly.precipitation_probability.map((p) => p ?? 0),
      weatherCode: data.hourly.weather_code,
    },
  };
}
