import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { City, StyleId, ToneFilter, WeatherSummary } from './types';
import { DEFAULT_CITY, getCurrentPosition, loadFavorites, loadSavedCity, saveCity, toggleFavorite } from './services/geo';
import { loadSavedStyle, loadSavedTone, saveStyle, saveTone } from './services/prefs';
import { fetchWeather } from './services/weather';
import { fetchAirQuality } from './services/airQuality';
import { buildAdvice, recommend, recommendAlternates } from './engine/recommend';
import { OUTFITS, STYLE_LABELS } from './data/outfits';
import { loadSavedOutfitIds, toggleSavedOutfit } from './services/savedOutfits';
import WeatherCard from './components/WeatherCard';
import DayBrief from './components/DayBrief';
import TomorrowPreview from './components/TomorrowPreview';
import AdviceList from './components/AdviceList';
import StyleTabs, { styleTabId } from './components/StyleTabs';
import OutfitCard from './components/OutfitCard';
import RegionPicker, { REGION_PICKER_ID } from './components/RegionPicker';
import FavoriteBar from './components/FavoriteBar';

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
  const [errorMessage, setErrorMessage] = useState('날씨를 불러오지 못했어요. 네트워크 연결을 확인해 주세요.');
  const [style, setStyleState] = useState<StyleId>(() => loadSavedStyle() ?? 'oldmoney');
  const [tone, setToneState] = useState<ToneFilter>(() => loadSavedTone() ?? 'all');
  const setStyle = useCallback((s: StyleId) => {
    setStyleState(s);
    saveStyle(s);
  }, []);
  const setTone = useCallback((t: ToneFilter) => {
    setToneState(t);
    saveTone(t);
  }, []);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showAlternates, setShowAlternates] = useState(false);
  const [favorites, setFavorites] = useState<City[]>(() => loadFavorites());
  const [savedOutfitIds, setSavedOutfitIds] = useState<string[]>(() => loadSavedOutfitIds());
  const [showSaved, setShowSaved] = useState(false);
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);
  const abortRef = useRef<AbortController | null>(null);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    searchTriggerRef.current?.focus();
  }, []);

  const load = useCallback(async (target: City) => {
    // 이전 요청이 아직 진행 중이면 취소 — 지역을 빠르게 바꿀 때 늦게 도착한 응답이 최신 화면을 덮어쓰는 것을 방지
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState('loading');
    try {
      const [w, aq] = await Promise.all([
        fetchWeather(target.latitude, target.longitude, target.name, controller.signal),
        fetchAirQuality(target.latitude, target.longitude, controller.signal),
      ]);
      if (controller.signal.aborted) return;
      setCity(target);
      setWeather(aq ? { ...w, airQuality: aq } : w);
      setState('ready');
    } catch (err) {
      if (controller.signal.aborted) return; // 더 최신 요청으로 대체됨 — 조용히 무시
      setErrorMessage(
        err instanceof DOMException && err.name === 'TimeoutError'
          ? '날씨를 불러오는 데 시간이 너무 오래 걸려요. 네트워크 상태를 확인하고 다시 시도해 주세요.'
          : '날씨를 불러오지 못했어요. 네트워크 연결을 확인해 주세요.',
      );
      setState('error');
    }
  }, []);

  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
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

  const selectCity = useCallback(
    (c: City) => {
      saveCity(c);
      void load(c);
    },
    [load],
  );

  const handleSelectCity = (c: City) => {
    selectCity(c);
    closeSearch();
  };

  const handleToggleFavorite = () => {
    if (!city) return;
    setFavorites((prev) => toggleFavorite(city, prev));
  };

  const handleToggleSaveOutfit = useCallback((outfitId: string) => {
    setSavedOutfitIds((prev) => toggleSavedOutfit(outfitId, prev));
  }, []);

  const dateKey = todayKey();
  const recs = useMemo(
    () => (weather ? recommend(style, weather, dateKey, tone) : []),
    [style, weather, dateKey, tone],
  );
  const alternates = useMemo(
    () => (weather ? recommendAlternates(style, weather, dateKey, tone) : { cooler: [], warmer: [] }),
    [style, weather, dateKey, tone],
  );
  const advice = useMemo(() => (weather ? buildAdvice(weather) : []), [weather]);
  const hasAlternates = alternates.cooler.length > 0 || alternates.warmer.length > 0;
  const savedOutfits = useMemo(
    () => savedOutfitIds.map((id) => OUTFITS.find((o) => o.id === id)).filter((o): o is (typeof OUTFITS)[number] => !!o),
    [savedOutfitIds],
  );

  return (
    <div className="page">
      <header className="masthead">
        <div className="masthead-top">
          <h1 className="brand">WeatherFit</h1>
          <div className="masthead-actions">
            <button
              ref={searchTriggerRef}
              type="button"
              className="text-btn"
              aria-expanded={searchOpen}
              aria-controls={REGION_PICKER_ID}
              onClick={() => setSearchOpen((v) => !v)}
            >
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
        <FavoriteBar favorites={favorites} current={city} onSelect={selectCity} onToggleCurrent={handleToggleFavorite} />
      </header>

      <RegionPicker open={searchOpen} current={city} onSelect={handleSelectCity} onClose={closeSearch} />

      <main>
        {isOffline && state === 'ready' && (
          <p className="offline-banner" role="status">
            오프라인 — 마지막으로 본 정보예요
          </p>
        )}
        {state === 'loading' && (
          <p className="status loading" role="status">
            오늘 날씨를 불러오는 중…
          </p>
        )}
        {state === 'error' && (
          <div className="status error" role="alert">
            <p>{errorMessage}</p>
            <button type="button" className="text-btn" onClick={() => load(city ?? DEFAULT_CITY)}>
              다시 시도
            </button>
          </div>
        )}
        {state === 'ready' && weather && (
          <>
            <WeatherCard weather={weather} />
            <DayBrief weather={weather} />
            <TomorrowPreview weather={weather} />
            <AdviceList advice={advice} />

            {savedOutfits.length > 0 && (
              <section className="saved-outfits" aria-label="즐겨찾는 코디">
                <button
                  type="button"
                  className="text-btn"
                  aria-expanded={showSaved}
                  onClick={() => setShowSaved((v) => !v)}
                >
                  {showSaved ? '즐겨찾는 코디 접기' : `즐겨찾는 코디 보기 (${savedOutfits.length})`}
                </button>
                {showSaved && (
                  <div className="outfit-list">
                    {savedOutfits.map((outfit, i) => (
                      <OutfitCard
                        key={outfit.id}
                        rec={{ outfit, rainWarning: false }}
                        index={i}
                        prefix="SAVED"
                        saved
                        onToggleSave={handleToggleSaveOutfit}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            <section aria-label="코디 추천">
              <div className="section-head">
                <h2>오늘의 코디</h2>
                <div className="filters">
                  <StyleTabs active={style} onChange={setStyle} />
                  <div className="tabs tone-tabs" role="group" aria-label="톤 필터">
                    {(
                      [
                        ['all', '전체'],
                        ['cool', '쿨톤'],
                        ['warm', '웜톤'],
                      ] as Array<[ToneFilter, string]>
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={tone === id}
                        className={tone === id ? 'tab active' : 'tab'}
                        onClick={() => setTone(id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div id="outfit-panel" role="tabpanel" aria-labelledby={styleTabId(style)} tabIndex={-1}>
              {recs.length > 0 ? (
                <div className="outfit-list">
                  {recs.map((rec, i) => (
                    <OutfitCard
                      key={rec.outfit.id}
                      rec={rec}
                      index={i}
                      saved={savedOutfitIds.includes(rec.outfit.id)}
                      onToggleSave={handleToggleSaveOutfit}
                    />
                  ))}
                </div>
              ) : (
                <p className="status">
                  {STYLE_LABELS[style]} 스타일{tone !== 'all' ? `의 ${tone === 'cool' ? '쿨톤' : '웜톤'}` : ''}에서
                  오늘 기온에 맞는 코디를 찾지 못했어요.
                  {tone !== 'all' && ' 톤 필터를 "전체"로 바꿔 보세요.'}
                </p>
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
                              <OutfitCard
                                key={rec.outfit.id}
                                rec={rec}
                                index={i}
                                prefix="ALT"
                                saved={savedOutfitIds.includes(rec.outfit.id)}
                                onToggleSave={handleToggleSaveOutfit}
                              />
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
                                saved={savedOutfitIds.includes(rec.outfit.id)}
                                onToggleSave={handleToggleSaveOutfit}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
              </div>
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
