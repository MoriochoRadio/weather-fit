import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { City, Outfit, StyleId, ToneFilter, WeatherSummary } from './types';
import { DEFAULT_CITY, getCurrentPosition, loadFavorites, loadSavedCity, saveCity, toggleFavorite } from './services/geo';
import { loadSavedStyle, loadSavedTone, saveStyle, saveTone } from './services/prefs';
import { fetchWeather } from './services/weather';
import { fetchAirQuality } from './services/airQuality';
import { buildAdvice, recommend, recommendAlternates, type Recommendation } from './engine/recommend';
import { comparedToTodayLine, dayOptions, weatherForDate } from './engine/dayView';
import { OUTFITS, STYLE_LABELS } from './data/outfits';
import { loadSavedOutfitIds, toggleSavedOutfit } from './services/savedOutfits';
import { loadWornLog, lastWornDate, recentlyWornIds, toggleWorn } from './services/wornLog';
import { loadMissingTerms, toggleMissingTerm } from './services/wardrobe';
import WeatherCard from './components/WeatherCard';
import DayBrief from './components/DayBrief';
import DayPicker from './components/DayPicker';
import YesterdayLine from './components/YesterdayLine';
import TomorrowPreview from './components/TomorrowPreview';
import AdviceList from './components/AdviceList';
import StyleTabs, { styleTabId } from './components/StyleTabs';
import OutfitCard from './components/OutfitCard';
import OutfitDetail from './components/OutfitDetail';
import ColorCombos from './components/ColorCombos';
import RegionPicker, { REGION_PICKER_ID } from './components/RegionPicker';
import FavoriteBar from './components/FavoriteBar';

function todayKey(d = new Date()): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
}

/**
 * 분 단위로 현재 시각을 따라간다.
 * 앱을 켜 둔 채 자정을 넘기면 날짜·추천이 어제 것으로 굳어 있었고 (QA), 저녁이 되어도
 * 한낮 기준 추천이 유지됐다 — 날짜와 "시(hour)"가 바뀔 때만 아래 useMemo들이 다시 계산된다.
 */
function useClock(): { dateKey: string; nowHour: number; date: Date } {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => {
      setNow((prev) => {
        const next = new Date();
        // 같은 분이라도 상태를 새로 넣으면 매분 리렌더가 나므로, 시/날짜가 바뀔 때만 교체한다
        return next.getHours() !== prev.getHours() || next.getDate() !== prev.getDate() ? next : prev;
      });
    }, 60_000);
    return () => clearInterval(id);
  }, []);
  return { dateKey: todayKey(now), nowHour: now.getHours(), date: now };
}

type LoadState = 'loading' | 'ready' | 'error';
/** 화면 모드 — 날씨 기반 추천과, 날씨와 무관한 색 조합 도구 (FR-36) */
type ViewMode = 'outfits' | 'colors';

/** "크게 보기"로 열린 코디 — 어느 목록의 몇 번째인지 (FR-37) */
interface DetailTarget {
  list: Recommendation[];
  index: number;
  /**
   * "오늘 입었어요"를 달아도 되는 목록인지.
   * 날짜 추천 목록은 오늘일 때만 허용하지만, 색 조합 화면의 코디는 날짜와 무관해 항상 허용한다 —
   * 목록마다 판단이 다르므로 열 때 함께 들고 온다 (v1.9 QA).
   */
  allowWorn: boolean;
}

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
  const [view, setView] = useState<ViewMode>('outfits');
  const [searchOpen, setSearchOpen] = useState(false);
  const [showAlternates, setShowAlternates] = useState(false);
  const [favorites, setFavorites] = useState<City[]>(() => loadFavorites());
  const [savedOutfitIds, setSavedOutfitIds] = useState<string[]>(() => loadSavedOutfitIds());
  const [showSaved, setShowSaved] = useState(false);
  const [wornLog, setWornLog] = useState(() => loadWornLog());
  const [missingTerms, setMissingTerms] = useState(() => loadMissingTerms());
  /** "다른 코디 보기"를 누른 횟수 — 시드에 섞어 같은 날에도 다른 순서를 만든다 (FR-29) */
  const [variant, setVariant] = useState(0);
  /** 사용자가 고른 날짜 (YYYY-MM-DD). null이면 오늘 (FR-35) */
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailTarget | null>(null);
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);
  const abortRef = useRef<AbortController | null>(null);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const savedToggleRef = useRef<HTMLButtonElement>(null);
  const outfitPanelRef = useRef<HTMLDivElement>(null);

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
      const w = await fetchWeather(target.latitude, target.longitude, target.name, controller.signal);
      if (controller.signal.aborted) return;
      setCity(target);
      setWeather(w);
      setState('ready');

      // 대기질은 부가 정보라 날씨 표시를 기다리게 하지 않고 도착하는 대로 병합한다 (QA: 대기질 API가
      // 느리면 날씨까지 함께 지연되던 문제)
      void fetchAirQuality(target.latitude, target.longitude, controller.signal).then((aq) => {
        if (!aq || controller.signal.aborted) return;
        setWeather((prev) => (prev ? { ...prev, airQuality: aq } : prev));
      });
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

  const handleToggleMissingTerm = useCallback((term: string) => {
    setMissingTerms((prev) => toggleMissingTerm(term, prev));
  }, []);

  const savedOutfits = useMemo(
    () => savedOutfitIds.map((id) => OUTFITS.find((o) => o.id === id)).filter((o): o is (typeof OUTFITS)[number] => !!o),
    [savedOutfitIds],
  );

  // 즐겨찾는 코디 목록 안에서 별을 눌러 뺄 때는 카드 자체가 사라져 포커스를 잃으므로,
  // 사라지기 전에 목록 토글 버튼으로 포커스를 미리 옮겨둔다 (QA: 포커스 유실).
  // 단, 마지막 1개를 빼는 경우엔 그 토글 버튼째 섹션이 통째로 사라지므로 대신 코디 추천 영역으로 옮긴다 (QA)
  const handleUnsaveFromSavedList = useCallback(
    (outfitId: string) => {
      if (savedOutfits.length <= 1) {
        outfitPanelRef.current?.focus();
      } else {
        savedToggleRef.current?.focus();
      }
      setSavedOutfitIds((prev) => toggleSavedOutfit(outfitId, prev));
    },
    [savedOutfits.length],
  );

  const { dateKey, nowHour, date } = useClock();

  // ── 날짜 선택 (FR-35) ──
  const days = useMemo(() => (weather ? dayOptions(weather) : []), [weather]);
  /**
   * 실제로 보고 있는 날짜. 고른 날짜가 새로 받은 예보 범위에 없으면(자정을 넘겼거나 지역을 바꿔
   * 예보가 갱신된 경우) 조용히 오늘로 되돌린다 — 존재하지 않는 날짜에 빈 화면이 뜨는 것보다 낫다.
   */
  const activeDate = useMemo(() => {
    if (pickedDate && days.some((d) => d.date === pickedDate)) return pickedDate;
    return days[0]?.date ?? null;
  }, [pickedDate, days]);
  const isToday = !activeDate || activeDate === days[0]?.date;
  const dayLabel = days.find((d) => d.date === activeDate)?.label ?? '오늘';
  /** 선택한 날짜 기준으로 다시 포장한 날씨 — 아래 추천·조언·브리핑이 전부 이걸 본다 */
  const dayWeather = useMemo(() => {
    if (!weather) return null;
    if (!activeDate) return weather;
    return weatherForDate(weather, activeDate) ?? weather;
  }, [weather, activeDate]);
  const compareLine = useMemo(
    () => (weather && activeDate ? comparedToTodayLine(weather, activeDate) : null),
    [weather, activeDate],
  );
  /** 추천 시드로 쓸 날짜 — 날짜마다 순서가 달라야 "다른 날을 보고 있다"가 느껴진다 */
  const seedKey = activeDate ?? dateKey;

  const recentIds = useMemo(() => recentlyWornIds(wornLog, dateKey), [wornLog, dateKey]);
  const recOpts = useMemo(
    // "앞으로 남은 시간" 보정(FR-28)은 오늘에만 의미가 있다 — 모레 코디를 지금 시각으로 좁히면 안 된다
    () => ({ nowHour: isToday ? nowHour : undefined, variant, deprioritize: recentIds }),
    [isToday, nowHour, variant, recentIds],
  );
  const recs = useMemo(
    () => (dayWeather ? recommend(style, dayWeather, seedKey, tone, recOpts) : []),
    [style, dayWeather, seedKey, tone, recOpts],
  );
  const alternates = useMemo(
    () => (dayWeather ? recommendAlternates(style, dayWeather, seedKey, tone, recOpts) : { cooler: [], warmer: [] }),
    [style, dayWeather, seedKey, tone, recOpts],
  );
  const advice = useMemo(() => (dayWeather ? buildAdvice(dayWeather) : []), [dayWeather]);
  const hasAlternates = alternates.cooler.length > 0 || alternates.warmer.length > 0;

  useEffect(() => {
    // 목록이 비면 섹션 자체가 접혀 사라지므로, 나중에 다시 채워졌을 때 안 눌러도 펼쳐진 채로
    // 나타나는 걸 방지 (QA: showSaved 상태 잔류)
    if (savedOutfits.length === 0) setShowSaved(false);
  }, [savedOutfits.length]);

  const handleToggleWorn = useCallback(
    (outfitId: string) => {
      setWornLog((prev) => toggleWorn(outfitId, dateKey, prev));
    },
    [dateKey],
  );

  const openDetail = useCallback((list: Recommendation[], outfitId: string, allowWorn: boolean) => {
    const index = list.findIndex((r) => r.outfit.id === outfitId);
    if (index >= 0) setDetail({ list, index, allowWorn });
  }, []);
  const closeDetail = useCallback(() => setDetail(null), []);

  const isWorn = useCallback(
    (outfitId: string) => wornLog.some((e) => e.outfitId === outfitId && e.date === dateKey),
    [wornLog, dateKey],
  );

  /**
   * 카드마다 반복되는 기록/옷장 관련 props — 목록 네 군데(추천·대안·즐겨찾기·색 조합)에서 같이 쓴다.
   * "오늘 입었어요"는 오늘을 보고 있을 때만 단다 — 모레 카드에 오늘 기록을 남기게 되면 기록이 뒤엉킨다.
   */
  const cardProps = useCallback(
    (outfitId: string) => ({
      worn: isWorn(outfitId),
      onToggleWorn: isToday ? handleToggleWorn : undefined,
      lastWorn: lastWornDate(outfitId, wornLog),
      missingTerms,
      onToggleMissingTerm: handleToggleMissingTerm,
    }),
    [isWorn, isToday, handleToggleWorn, wornLog, missingTerms, handleToggleMissingTerm],
  );

  /**
   * 색 조합 화면이 "이 조합을 쓰는 코디"를 카드로 그릴 때 쓰는 렌더러.
   * 이 화면은 **날짜와 무관**하므로 cardProps를 쓰지 않는다 — 다른 탭에서 모레를 골라 뒀다고
   * 여기 카드의 "오늘 입었어요"가 사라지면 안 된다 (v1.9 QA).
   */
  const renderComboOutfits = useCallback(
    (outfits: Outfit[]) => {
      const list: Recommendation[] = outfits.map((outfit) => ({ outfit, rainWarning: false }));
      return (
        <div className="outfit-list">
          {list.map((rec, i) => (
            <OutfitCard
              key={rec.outfit.id}
              rec={rec}
              index={i}
              prefix="COLOR"
              saved={savedOutfitIds.includes(rec.outfit.id)}
              onToggleSave={handleToggleSaveOutfit}
              onOpen={(id) => openDetail(list, id, true)}
              worn={isWorn(rec.outfit.id)}
              onToggleWorn={handleToggleWorn}
              lastWorn={lastWornDate(rec.outfit.id, wornLog)}
              missingTerms={missingTerms}
              onToggleMissingTerm={handleToggleMissingTerm}
            />
          ))}
        </div>
      );
    },
    [
      savedOutfitIds,
      handleToggleSaveOutfit,
      openDetail,
      isWorn,
      handleToggleWorn,
      wornLog,
      missingTerms,
      handleToggleMissingTerm,
    ],
  );

  const savedList: Recommendation[] = useMemo(
    () => savedOutfits.map((outfit) => ({ outfit, rainWarning: false })),
    [savedOutfits],
  );
  const alternateList = useMemo(
    () => [...alternates.cooler, ...alternates.warmer],
    [alternates.cooler, alternates.warmer],
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
              // 닫혀 있을 땐 RegionPicker가 null을 반환해 그 id가 DOM에 없다 —
              // 없는 요소를 가리키는 aria-controls는 스크린리더에서 무효 참조가 되므로 열렸을 때만 건다 (QA)
              aria-controls={searchOpen ? REGION_PICKER_ID : undefined}
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
          {formatDate(date)} · {city ? `${city.name}${city.region && city.region !== city.name ? ` (${city.region})` : ''}` : '위치 확인 중'}
        </p>
        <FavoriteBar favorites={favorites} current={city} onSelect={selectCity} onToggleCurrent={handleToggleFavorite} />
        <nav className="viewnav" aria-label="화면 선택">
          {(
            [
              ['outfits', '날씨별 코디'],
              ['colors', '색 조합'],
            ] as Array<[ViewMode, string]>
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={view === id ? 'viewnav-btn active' : 'viewnav-btn'}
              aria-pressed={view === id}
              onClick={() => setView(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <RegionPicker open={searchOpen} current={city} onSelect={handleSelectCity} onClose={closeSearch} />

      <main>
        {view === 'colors' ? (
          <ColorCombos renderOutfits={renderComboOutfits} />
        ) : (
          <>
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
            {state === 'ready' && dayWeather && (
              <>
                <DayPicker days={days} selected={activeDate ?? ''} onSelect={setPickedDate} />
                <WeatherCard weather={dayWeather} nowHour={nowHour} isToday={isToday} dayLabel={dayLabel} />
                {!isToday && compareLine && <p className="daycompare">{compareLine}</p>}
                <DayBrief weather={dayWeather} isToday={isToday} dayLabel={dayLabel} />
                <YesterdayLine weather={dayWeather} />
                <TomorrowPreview weather={dayWeather} />
                <AdviceList advice={advice} />

                {savedOutfits.length > 0 && (
                  <section className="saved-outfits" aria-label="즐겨찾는 코디">
                    <button
                      ref={savedToggleRef}
                      type="button"
                      className="text-btn"
                      aria-expanded={showSaved}
                      onClick={() => setShowSaved((v) => !v)}
                    >
                      {showSaved ? '즐겨찾는 코디 접기' : `즐겨찾는 코디 보기 (${savedOutfits.length})`}
                    </button>
                    {showSaved && (
                      <div className="outfit-list">
                        {savedList.map((rec, i) => (
                          <OutfitCard
                            key={rec.outfit.id}
                            rec={rec}
                            index={i}
                            prefix="SAVED"
                            saved
                            onToggleSave={handleUnsaveFromSavedList}
                            onOpen={(id) => openDetail(savedList, id, isToday)}
                            {...cardProps(rec.outfit.id)}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                )}

                <section aria-label="코디 추천">
                  <div className="section-head">
                    <h2>{dayLabel}의 코디</h2>
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
                  <div id="outfit-panel" ref={outfitPanelRef} role="tabpanel" aria-labelledby={styleTabId(style)} tabIndex={-1}>
                    {recs.length > 0 ? (
                      <>
                        <div className="outfit-list">
                          {recs.map((rec, i) => (
                            <OutfitCard
                              key={rec.outfit.id}
                              rec={rec}
                              index={i}
                              saved={savedOutfitIds.includes(rec.outfit.id)}
                              onToggleSave={handleToggleSaveOutfit}
                              onOpen={(id) => openDetail(recs, id, isToday)}
                              {...cardProps(rec.outfit.id)}
                            />
                          ))}
                        </div>
                        {recs.length > 1 && (
                          <button type="button" className="text-btn reshuffle" onClick={() => setVariant((v) => v + 1)}>
                            다른 코디 보기
                          </button>
                        )}
                      </>
                    ) : (
                      <p className="status">
                        {STYLE_LABELS[style]} 스타일{tone !== 'all' ? `의 ${tone === 'cool' ? '쿨톤' : '웜톤'}` : ''}에서
                        {dayLabel} 기온에 맞는 코디를 찾지 못했어요.
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
                                      onOpen={(id) => openDetail(alternateList, id, isToday)}
                                      {...cardProps(rec.outfit.id)}
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
                                      onOpen={(id) => openDetail(alternateList, id, isToday)}
                                      {...cardProps(rec.outfit.id)}
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
          </>
        )}
      </main>

      {detail && (
        <OutfitDetail
          recs={detail.list}
          index={detail.index}
          onIndexChange={(index) => setDetail((prev) => (prev ? { ...prev, index } : prev))}
          onClose={closeDetail}
          savedIds={savedOutfitIds}
          onToggleSave={handleToggleSaveOutfit}
          worn={isWorn}
          onToggleWorn={detail.allowWorn ? handleToggleWorn : undefined}
          missingTerms={missingTerms}
          onToggleMissingTerm={handleToggleMissingTerm}
        />
      )}

      <footer className="foot">
        <p>날씨 데이터: Open-Meteo · 매일 새로운 순서로 코디를 제안합니다</p>
      </footer>
    </div>
  );
}
