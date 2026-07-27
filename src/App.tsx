import { useCallback, useEffect, useMemo, useState } from 'react';
import type { City, StyleId, WeatherSummary } from './types';
import { DEFAULT_CITY, getCurrentPosition, loadSavedCity, saveCity } from './services/geo';
import { fetchWeather } from './services/weather';
import { buildAdvice, recommend, recommendAlternates } from './engine/recommend';
import { STYLE_LABELS } from './data/outfits';
import WeatherCard from './components/WeatherCard';
import AdviceList from './components/AdviceList';
import StyleTabs from './components/StyleTabs';
import OutfitCard from './components/OutfitCard';
import RegionPicker from './components/RegionPicker';

function todayKey(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function formatDate(): string {
  return new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
}

type LoadState = 'loading' | 'ready' | 'error';

export default function App() {
  const [city, setCity] = useState<City | null>(null);
  const [weather, setWeather] = useState<WeatherSummary | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [style, setStyle] = useState<StyleId>('oldmoney');
  const [searchOpen, setSearchOpen] = useState(false);
  const [showAlternates, setShowAlternates] = useState(false);

  const load = useCallback(async (target: City) => {
    setState('loading');
    try {
      const w = await fetchWeather(target.latitude, target.longitude, target.name);
      setCity(target);
      setWeather(w);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    (async () => {
      const saved = loadSavedCity();
      if (saved) {
        void load(saved);
        return;
      }
      const here = await getCurrentPosition();
      void load(here ?? DEFAULT_CITY);
    })();
  }, [load]);

  const handleSelectCity = (c: City) => {
    saveCity(c);
    setSearchOpen(false);
    void load(c);
  };

  const dateKey = todayKey();
  const recs = useMemo(() => (weather ? recommend(style, weather, dateKey) : []), [style, weather, dateKey]);
  const alternates = useMemo(
    () => (weather ? recommendAlternates(style, weather, dateKey) : { cooler: [], warmer: [] }),
    [style, weather, dateKey],
  );
  const advice = useMemo(() => (weather ? buildAdvice(weather) : []), [weather]);
  const hasAlternates = alternates.cooler.length > 0 || alternates.warmer.length > 0;

  return (
    <div className="page">
      <header className="masthead">
        <div className="masthead-top">
          <h1 className="brand">WeatherFit</h1>
          <div className="masthead-actions">
            <button type="button" className="text-btn" onClick={() => setSearchOpen((v) => !v)}>
              지역 변경
            </button>
            <button type="button" className="text-btn" onClick={() => city && load(city)} disabled={!city}>
              새로고침
            </button>
          </div>
        </div>
        <p className="dateline">
          {formatDate()} · {city ? `${city.name}${city.region && city.region !== city.name ? ` (${city.region})` : ''}` : '위치 확인 중'}
        </p>
      </header>

      <RegionPicker open={searchOpen} current={city} onSelect={handleSelectCity} onClose={() => setSearchOpen(false)} />

      <main>
        {state === 'loading' && (
          <p className="status loading" role="status">
            오늘 날씨를 불러오는 중…
          </p>
        )}
        {state === 'error' && (
          <div className="status error">
            <p>날씨를 불러오지 못했어요. 네트워크 연결을 확인해 주세요.</p>
            <button type="button" className="text-btn" onClick={() => load(city ?? DEFAULT_CITY)}>
              다시 시도
            </button>
          </div>
        )}
        {state === 'ready' && weather && (
          <>
            <WeatherCard weather={weather} />
            <AdviceList advice={advice} />

            <section aria-label="코디 추천">
              <div className="section-head">
                <h2>오늘의 코디</h2>
                <StyleTabs active={style} onChange={setStyle} />
              </div>
              {recs.length > 0 ? (
                <div className="outfit-list">
                  {recs.map((rec, i) => (
                    <OutfitCard key={rec.outfit.id} rec={rec} index={i} />
                  ))}
                </div>
              ) : (
                <p className="status">{STYLE_LABELS[style]} 스타일에서 오늘 기온에 맞는 코디를 찾지 못했어요.</p>
              )}

              {hasAlternates && (
                <div className="alternates">
                  <button
                    type="button"
                    className="text-btn"
                    aria-expanded={showAlternates}
                    onClick={() => setShowAlternates((v) => !v)}
                  >
                    {showAlternates ? '대안 코디 접기' : '대안 코디 더 보기'}
                  </button>
                  {showAlternates && (
                    <div className="alternates-body">
                      {alternates.cooler.length > 0 && (
                        <>
                          <h3 className="alt-title">더 시원하게 입고 싶다면</h3>
                          <div className="outfit-list">
                            {alternates.cooler.map((rec, i) => (
                              <OutfitCard key={rec.outfit.id} rec={rec} index={i} prefix="ALT" />
                            ))}
                          </div>
                        </>
                      )}
                      {alternates.warmer.length > 0 && (
                        <>
                          <h3 className="alt-title">쌀쌀하게 느껴진다면</h3>
                          <div className="outfit-list">
                            {alternates.warmer.map((rec, i) => (
                              <OutfitCard
                                key={rec.outfit.id}
                                rec={rec}
                                index={alternates.cooler.length + i}
                                prefix="ALT"
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <footer className="foot">
        <p>날씨 데이터: Open-Meteo · 매일 새로운 순서로 코디를 제안합니다</p>
      </footer>
    </div>
  );
}
