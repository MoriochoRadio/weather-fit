/**
 * Weather Fit — 기상 아틀리에: 날씨의 수치와 옷차림 결정을 한 화면에서 연결한다.
 * Design note: Deep Canopy, editorial spread, tactile imagery, clear action hierarchy.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  CircleCheck,
  CloudRain,
  CloudSun,
  Droplets,
  Download,
  ExternalLink,
  Footprints,
  Layers3,
  MapPin,
  RefreshCw,
  Share2,
  ShieldCheck,
  Shirt,
  SlidersHorizontal,
  SunMedium,
  Thermometer,
  Wind,
} from "lucide-react";

type City = { id: string; name: string; subtitle: string; latitude: number; longitude: number };
type StyleId = "oldmoney" | "casual" | "formal" | "minimal";
type ToneId = "all" | "cool" | "warm";
type ComfortId = "neutral" | "warmer" | "cooler";
type OccasionId = "any" | "work" | "weekend" | "evening";
type LoadState = "loading" | "ready" | "error";

type WeatherData = {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    time: string;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    uv_index_max: number[];
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
  };
};

const CITIES: City[] = [
  { id: "seoul", name: "서울", subtitle: "서울특별시", latitude: 37.5665, longitude: 126.978 },
  { id: "busan", name: "부산", subtitle: "부산광역시", latitude: 35.1796, longitude: 129.0756 },
  { id: "daejeon", name: "대전", subtitle: "대전광역시", latitude: 36.3504, longitude: 127.3845 },
  { id: "gangneung", name: "강릉", subtitle: "강원특별자치도", latitude: 37.7519, longitude: 128.8761 },
  { id: "jeju", name: "제주", subtitle: "제주특별자치도", latitude: 33.4996, longitude: 126.5312 },
];

const STYLE_LABELS: Record<StyleId, string> = {
  oldmoney: "올드머니",
  casual: "캐주얼",
  formal: "포멀",
  minimal: "미니멀",
};

const OUTFIT_LIBRARY: Record<StyleId, Record<"hot" | "mild" | "cool", { name: string; tone: "cool" | "warm"; top: string; bottom: string; shoes: string; accessory: string; note: string; alternate: string }>> = {
  oldmoney: {
    hot: { name: "네이비 피케의 여름", tone: "cool", top: "네이비 피케 폴로", bottom: "라이트그레이 코튼 쇼츠", shoes: "화이트 레더 스니커", accessory: "네이비 캡", note: "깊은 네이비 한 톤이면 더운 날에도 옷차림의 중심이 남습니다.", alternate: "오프화이트 리넨 셔츠" },
    mild: { name: "카멜 레이어의 오후", tone: "warm", top: "크림 코튼 셔츠", bottom: "베이지 치노 팬츠", shoes: "브라운 스웨이드 로퍼", accessory: "다크브라운 벨트", note: "밝은 셔츠와 차분한 카멜이 일교차를 무리 없이 받아줍니다.", alternate: "올리브 코튼 재킷" },
    cool: { name: "울 트윌의 선", tone: "warm", top: "차콜 메리노 니트", bottom: "그레이 울 트라우저", shoes: "블랙 더비 슈즈", accessory: "울 머플러", note: "기온이 떨어질수록 질감이 선명한 니트와 울 소재가 단정함을 만듭니다.", alternate: "네이비 맥 코트" },
  },
  casual: {
    hot: { name: "페일블루 오픈칼라", tone: "cool", top: "페일블루 오픈칼라 셔츠", bottom: "오프화이트 린넨 쇼츠", shoes: "블랙 레더 샌들", accessory: "실버 프레임 선글라스", note: "열이 오르는 낮에는 열린 칼라와 밝은 하의로 공기를 남겨두세요.", alternate: "화이트 티셔츠" },
    mild: { name: "바람을 타는 데님", tone: "cool", top: "화이트 티셔츠와 데님 셔츠", bottom: "인디고 스트레이트 데님", shoes: "캔버스 스니커", accessory: "나일론 캡", note: "가벼운 데님 셔츠는 낮에는 한 겹, 저녁에는 얇은 아우터가 됩니다.", alternate: "올리브 필드 재킷" },
    cool: { name: "소프트 쉘의 하루", tone: "cool", top: "그레이 스웨트와 나일론 재킷", bottom: "차콜 이지 팬츠", shoes: "그레이 러닝 스니커", accessory: "블랙 비니", note: "바람이 체감을 낮출 땐 부피보다 막아주는 한 겹이 우선입니다.", alternate: "라이트 다운 베스트" },
  },
  formal: {
    hot: { name: "섬세한 여름 수트", tone: "cool", top: "스카이블루 반팔 셔츠", bottom: "네이비 쿨울 슬랙스", shoes: "블랙 페니 로퍼", accessory: "실버 시계", note: "통기성 있는 슬랙스와 단정한 로퍼가 더위를 격식으로 정리합니다.", alternate: "오프화이트 리넨 재킷" },
    mild: { name: "잉크 블루의 균형", tone: "cool", top: "화이트 옥스퍼드 셔츠", bottom: "네이비 울 슬랙스", shoes: "블랙 더비 슈즈", accessory: "그레인 레더 벨트", note: "낮과 저녁의 온도 차에는 셔츠 위 재킷을 더할 여백을 남겨두세요.", alternate: "네이비 호프색 재킷" },
    cool: { name: "차콜 레이어", tone: "warm", top: "아이보리 니트와 셔츠", bottom: "차콜 울 슬랙스", shoes: "블랙 첼시 부츠", accessory: "울 코트", note: "보온을 한 번에 두껍게 쌓기보다 셔츠와 니트의 간격으로 조절합니다.", alternate: "다크네이비 더블 코트" },
  },
  minimal: {
    hot: { name: "샌드 톤의 정적", tone: "warm", top: "샌드베이지 반팔 셔츠", bottom: "아이보리 코튼 팬츠", shoes: "브라운 레더 샌들", accessory: "무광 실버 링", note: "색을 줄이면 소재와 실루엣이 더위를 차분하게 보이게 합니다.", alternate: "오프화이트 리넨 셔츠" },
    mild: { name: "블랙 앤 아이보리", tone: "cool", top: "아이보리 롱슬리브 티", bottom: "블랙 와이드 팬츠", shoes: "블랙 레더 스니커", accessory: "미니 숄더백", note: "가벼운 긴소매와 넓은 팬츠는 일교차를 가장 단순하게 해결합니다.", alternate: "차콜 셔츠 재킷" },
    cool: { name: "그래파이트의 온도", tone: "cool", top: "차콜 터틀넥과 울 셔츠", bottom: "블랙 테이퍼드 팬츠", shoes: "블랙 첼시 부츠", accessory: "그래파이트 머플러", note: "온도를 흡수하는 짙은 톤은 레이어의 경계를 줄여 깔끔하게 보입니다.", alternate: "다크그레이 울 재킷" },
  },
};

/**
 * 기상 아틀리에 전용 룩 이미지 매핑. 스타일·체감 기온·강수 조건을 분리해
 * 추천 근거와 같은 실루엣이 카드에서 바로 읽히도록 한다.
 */
const OUTFIT_IMAGE_MAP: Partial<Record<`${StyleId}-${"hot" | "mild" | "cool"}`, { src: string; alt: string }>> = {};
const RAIN_OUTFIT_IMAGE_MAP: Partial<Record<StyleId, { src: string; alt: string }>> = {};

const STORAGE_KEYS = {
  city: "weatherfit-studio-city",
  style: "weatherfit-studio-style",
  tone: "weatherfit-studio-tone",
  saved: "weatherfit-studio-saved",
  worn: "weatherfit-studio-worn",
  missing: "weatherfit-studio-missing",
  snapshot: "weatherfit-studio-snapshot",
  comfort: "weatherfit-studio-comfort",
  occasion: "weatherfit-studio-occasion",
  checklist: "weatherfit-studio-checklist",
};

function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 브라우저 저장소 사용 불가 상태에서도 핵심 날씨 조회는 계속 가능하다.
  }
}

function weatherLabel(code: number) {
  if ([0].includes(code)) return "맑음";
  if ([1, 2].includes(code)) return "대체로 맑음";
  if ([3].includes(code)) return "흐림";
  if ([45, 48].includes(code)) return "안개";
  if ([51, 53, 55, 56, 57].includes(code)) return "이슬비";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "비";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "눈";
  if ([95, 96, 99].includes(code)) return "뇌우";
  return "변화무쌍";
}

function weatherIcon(code: number) {
  return [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code) ? CloudRain : CloudSun;
}

function periodFromTemp(temp: number): "hot" | "mild" | "cool" {
  if (temp >= 25) return "hot";
  if (temp >= 15) return "mild";
  return "cool";
}

function dayName(date: string, short = false) {
  return new Intl.DateTimeFormat("ko-KR", { weekday: short ? "short" : "long" }).format(new Date(`${date}T12:00:00`));
}

function formatKoreanDate() {
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "long" }).format(new Date());
}

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

function occasionLine(occasion: OccasionId) {
  if (occasion === "work") return "출근·미팅 기준으로, 실루엣은 단정하게 두고 소재에서 여유를 만드세요.";
  if (occasion === "weekend") return "주말에는 움직임을 우선해, 같은 기온대에서도 신발과 가방의 무게를 줄여보세요.";
  if (occasion === "evening") return "저녁 일정이 있다면 실내 냉방과 해 진 뒤의 체감을 고려해 얇은 한 겹을 남겨두세요.";
  return "오늘의 일정에 맞춰 한 가지 요소만 바꾸면, 같은 룩도 훨씬 실용적으로 입을 수 있어요.";
}

function reasonFor(weather: WeatherData) {
  const feels = Math.round(weather.current.apparent_temperature);
  const rain = weather.daily.precipitation_probability_max[0] ?? 0;
  if (rain >= 50) return `강수 확률 ${rain}%예요. 물에 강한 신발과 우산을 우선하세요.`;
  if (feels >= 30) return `체감 ${feels}°예요. 통기성과 땀 자국 관리가 오늘의 기준입니다.`;
  if (feels <= 12) return `체감 ${feels}°예요. 목과 손목을 덮는 얇은 레이어가 필요합니다.`;
  return `체감 ${feels}°와 바람 ${Math.round(weather.current.wind_speed_10m)}km/h를 기준으로 한 겹을 조절하세요.`;
}

function getPreparedness(weather: WeatherData) {
  const rain = weather.daily.precipitation_probability_max[0] ?? 0;
  const uv = weather.daily.uv_index_max[0] ?? 0;
  if (rain >= 50) return { label: "우산", detail: "발등이 덮이는 신발", icon: CloudRain };
  if (uv >= 6) return { label: "차양", detail: "모자 또는 자외선 차단제", icon: SunMedium };
  if (weather.current.wind_speed_10m >= 20) return { label: "바람막이", detail: "가벼운 겉옷", icon: Wind };
  return { label: "가벼운 겉옷", detail: "실내외 온도 차 대비", icon: Shirt };
}

function nextRainWindow(weather: WeatherData) {
  const currentIndex = Math.max(0, weather.hourly.time.findIndex((time) => time >= weather.current.time));
  const nextIndex = weather.hourly.precipitation_probability.findIndex((chance, index) => index >= currentIndex && chance >= 40);
  if (nextIndex < 0) return null;
  return weather.hourly.time[nextIndex]?.slice(11, 16) ?? null;
}

export default function Home() {
  const [city, setCity] = useState<City>(() => readStorage(STORAGE_KEYS.city, CITIES[0]));
  const [weather, setWeather] = useState<WeatherData | null>(() => readStorage<WeatherData | null>(STORAGE_KEYS.snapshot, null));
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [style, setStyle] = useState<StyleId>(() => readStorage<StyleId>(STORAGE_KEYS.style, "oldmoney"));
  const [tone, setTone] = useState<ToneId>(() => readStorage<ToneId>(STORAGE_KEYS.tone, "all"));
  const [saved, setSaved] = useState<string[]>(() => readStorage<string[]>(STORAGE_KEYS.saved, []));
  const [worn, setWorn] = useState<string[]>(() => readStorage<string[]>(STORAGE_KEYS.worn, []));
  const [missing, setMissing] = useState<string[]>(() => readStorage<string[]>(STORAGE_KEYS.missing, []));
  const [comfort, setComfort] = useState<ComfortId>(() => readStorage<ComfortId>(STORAGE_KEYS.comfort, "neutral"));
  const [occasion, setOccasion] = useState<OccasionId>(() => readStorage<OccasionId>(STORAGE_KEYS.occasion, "any"));
  const [checkedSteps, setCheckedSteps] = useState<string[]>(() => readStorage<string[]>(`${STORAGE_KEYS.checklist}-${todayKey()}`, []));
  const [cityOpen, setCityOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [errorText, setErrorText] = useState("");

  const loadWeather = useCallback(async (target: City, silent = false) => {
    if (!silent) setLoadState("loading");
    setErrorText("");
    try {
      const params = new URLSearchParams({
        latitude: String(target.latitude),
        longitude: String(target.longitude),
        current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
        hourly: "temperature_2m,precipitation_probability",
        daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max",
        forecast_days: "7",
        timezone: "auto",
      });
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
      if (!response.ok) throw new Error("weather response failed");
      const data = (await response.json()) as WeatherData;
      setWeather(data);
      writeStorage(STORAGE_KEYS.snapshot, data);
      setLoadState("ready");
    } catch {
      setLoadState(weather ? "ready" : "error");
      setErrorText(weather ? "최신 날씨를 가져오지 못해 마지막으로 확인한 정보를 표시하고 있어요." : "날씨 정보를 불러오지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.");
    }
  }, [weather]);

  useEffect(() => {
    void loadWeather(city);
    // 최초 진입과 도시 변경 시에만 요청한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city.id]);

  useEffect(() => writeStorage(STORAGE_KEYS.city, city), [city]);
  useEffect(() => writeStorage(STORAGE_KEYS.style, style), [style]);
  useEffect(() => writeStorage(STORAGE_KEYS.tone, tone), [tone]);
  useEffect(() => writeStorage(STORAGE_KEYS.saved, saved), [saved]);
  useEffect(() => writeStorage(STORAGE_KEYS.worn, worn), [worn]);
  useEffect(() => writeStorage(STORAGE_KEYS.missing, missing), [missing]);
  useEffect(() => writeStorage(STORAGE_KEYS.comfort, comfort), [comfort]);
  useEffect(() => writeStorage(STORAGE_KEYS.occasion, occasion), [occasion]);
  useEffect(() => writeStorage(`${STORAGE_KEYS.checklist}-${todayKey()}`, checkedSteps), [checkedSteps]);

  useEffect(() => {
    if (!cityOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCityOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [cityOpen]);

  const outfit = useMemo(() => {
    const comfortOffset = comfort === "warmer" ? -3 : comfort === "cooler" ? 3 : 0;
    const temperature = (weather?.current.apparent_temperature ?? 20) + comfortOffset;
    const current = OUTFIT_LIBRARY[style][periodFromTemp(temperature)];
    const toneAdjusted = tone === "all" || current.tone === tone
      ? current
      : OUTFIT_LIBRARY[style][periodFromTemp(temperature === 20 ? temperature + 2 : temperature)];
    const rainChance = weather?.daily.precipitation_probability_max[0] ?? 0;

    // 강수 위험이 높은데도 샌들·캔버스화가 그대로 추천되던 모순을 막는다.
    // 실루엣과 스타일의 핵심은 보존하되, 발등과 소지품을 우선 보호하도록 한 항목만 교체한다.
    if (rainChance >= 50) {
      return {
        ...toneAdjusted,
        shoes: "방수 레더 더비 슈즈",
        accessory: "접이식 우산",
        note: `${toneAdjusted.note} 비가 예상되므로 발등을 덮는 방수 신발과 접이식 우산으로 마무리하세요.`,
        alternate: "발수 가공 셔츠 재킷",
      };
    }
    return toneAdjusted;
  }, [style, tone, weather, comfort]);

  const comfortOffset = comfort === "warmer" ? -3 : comfort === "cooler" ? 3 : 0;
  const weatherBand = periodFromTemp((weather?.current.apparent_temperature ?? 20) + comfortOffset);
  const outfitId = `${style}-${weatherBand}-${occasion}`;
  const isSaved = saved.includes(outfitId);
  const isWorn = worn.includes(outfitId);
  const rainRisk = (weather?.daily.precipitation_probability_max[0] ?? 0) >= 50;
  // 생성 완료 자산만 이 매핑에 등록한다. 실패한 생성 작업은 기존 옷장 비주얼로 안전하게 대체한다.
  const outfitImage = rainRisk ? RAIN_OUTFIT_IMAGE_MAP[style] : OUTFIT_IMAGE_MAP[`${style}-${weatherBand}`];
  const PreparednessIcon = weather ? getPreparedness(weather).icon : Shirt;
  const WeatherIcon = weather ? weatherIcon(weather.current.weather_code) : CloudSun;
  const missingPieces = [outfit.top, outfit.bottom, outfit.shoes, outfit.accessory].filter((item) => missing.includes(item));
  const rainWindow = weather ? nextRainWindow(weather) : null;
  const fitSignals = weather ? [
    { label: "체감 기준", value: `${Math.round(weather.current.apparent_temperature)}°`, detail: comfort === "warmer" ? "추위를 타는 기준으로 한 단계 보온" : comfort === "cooler" ? "더위를 타는 기준으로 한 단계 가볍게" : "현재 체감을 그대로 반영" },
    { label: "강수 대응", value: `${weather.daily.precipitation_probability_max[0] ?? 0}%`, detail: (weather.daily.precipitation_probability_max[0] ?? 0) >= 50 ? `${rainWindow ? `${rainWindow} 이후` : "오늘"} 비 대비로 자동 보정` : "가벼운 외출 기준" },
    { label: "옷장 준비", value: missingPieces.length ? `${missingPieces.length}개 결품` : "모두 준비", detail: missingPieces.length ? `${missingPieces.slice(0, 2).join(" · ")} 확인 필요` : "바로 입을 수 있는 조합" },
  ] : [];
  const checklist = weather ? [
    { id: "weather", label: getPreparedness(weather).label, detail: getPreparedness(weather).detail, icon: PreparednessIcon },
    { id: "layers", label: weather.current.apparent_temperature >= 28 ? "여벌 이너" : "겉옷 점검", detail: weather.current.apparent_temperature >= 28 ? "땀 자국과 실내 냉방 대비" : "저녁 체감 변화 대비", icon: Layers3 },
    { id: "occasion", label: occasion === "any" ? "일정 확인" : occasion === "work" ? "출근 준비" : occasion === "weekend" ? "주말 동선" : "저녁 일정", detail: occasionLine(occasion), icon: ShieldCheck },
  ] : [];
  const weekPrep = useMemo(() => {
    if (!weather) return [];
    const days = weather.daily.time.slice(0, 5);
    const rainDays = days.filter((_, index) => (weather.daily.precipitation_probability_max[index] ?? 0) >= 50).length;
    const highUvDays = days.filter((_, index) => (weather.daily.uv_index_max[index] ?? 0) >= 6).length;
    const hotDays = days.filter((_, index) => (weather.daily.temperature_2m_max[index] ?? 0) >= 28).length;
    const prep = [] as { id: string; label: string; detail: string }[];
    if (rainDays) prep.push({ id: "rain", label: "방수 신발", detail: `앞으로 5일 중 ${rainDays}일은 강수 대비가 필요해요.` });
    if (highUvDays) prep.push({ id: "sun", label: "차양 아이템", detail: `자외선이 높은 날이 ${highUvDays}일 있어요.` });
    if (hotDays) prep.push({ id: "heat", label: "여벌 이너", detail: `최고 ${Math.max(...weather.daily.temperature_2m_max.slice(0, 5).map(Math.round))}°까지 올라가요.` });
    return prep.length ? prep : [{ id: "base", label: "기본 레이어", detail: "이번 주는 오늘의 베이스 룩을 중심으로 준비해도 좋아요." }];
  }, [weather]);

  const selectCity = (next: City) => {
    setCity(next);
    setCityOpen(false);
  };

  const useLocation = () => {
    if (!navigator.geolocation) {
      setNotice("이 브라우저에서는 현재 위치를 사용할 수 없어요.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const current: City = { id: "current", name: "현재 위치", subtitle: "브라우저 위치", latitude: position.coords.latitude, longitude: position.coords.longitude };
        setCity(current);
        setCityOpen(false);
        setNotice("현재 위치 기준으로 날씨를 새로 확인했어요.");
      },
      () => setNotice("현재 위치 권한을 받지 못했어요. 도시를 직접 선택해 주세요."),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  };

  const toggleSaved = () => {
    setSaved((items) => (items.includes(outfitId) ? items.filter((id) => id !== outfitId) : [...items, outfitId]));
    setNotice(isSaved ? "저장한 룩에서 뺐어요." : "나중에 볼 룩으로 저장했어요.");
  };

  const toggleWorn = () => {
    setWorn((items) => (items.includes(outfitId) ? items.filter((id) => id !== outfitId) : [...items, outfitId]));
    setNotice(isWorn ? "오늘 착용 기록을 지웠어요." : "오늘 입은 룩으로 기록했어요.");
  };

  const toggleMissing = (item: string) => {
    setMissing((items) => (items.includes(item) ? items.filter((value) => value !== item) : [...items, item]));
  };

  const shareOutfit = async () => {
    const text = `${city.name} ${weather ? `${Math.round(weather.current.apparent_temperature)}°` : "오늘"} · ${outfit.name}\n${outfit.top}, ${outfit.bottom}, ${outfit.shoes}`;
    try {
      if (navigator.share) await navigator.share({ title: "Weather Fit 오늘의 코디", text });
      else {
        await navigator.clipboard.writeText(text);
        setNotice("코디 요약을 클립보드에 복사했어요.");
      }
    } catch {
      // 공유 창 취소는 오류가 아니라 사용자의 의도된 종료다.
    }
  };

  const exportArchive = () => {
    const archive = {
      version: 1,
      exportedAt: new Date().toISOString(),
      preferences: { city, style, tone, comfort, occasion },
      savedLooks: saved,
      wornLooks: worn,
      missingItems: missing,
    };
    const blob = new Blob([JSON.stringify(archive, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `weather-fit-archive-${todayKey()}.json`;
    link.click();
    URL.revokeObjectURL(href);
    setNotice("내 코디 기록 파일을 내려받았어요.");
  };

  return (
    <div className="weather-fit-app">
      <header className="app-header">
        <a className="brand-lockup" href="#today" aria-label="Weather Fit 홈으로">
          <img src="/weather-fit/assets/weather-fit-logo.webp" alt="" className="brand-mark" />
          <span>
            <strong>Weather Fit</strong>
            <small>daily dressing index</small>
          </span>
        </a>
        <div className="header-meta">
          <span className="today-date">{formatKoreanDate()}</span>
          <button type="button" className="city-trigger" onClick={() => setCityOpen((open) => !open)} aria-expanded={cityOpen}>
            <MapPin size={15} strokeWidth={1.9} /> {city.name} <ChevronDown size={14} />
          </button>
          <button type="button" className="icon-button" onClick={() => void loadWeather(city)} aria-label="날씨 새로고침" title="날씨 새로고침">
            <RefreshCw size={17} strokeWidth={1.8} />
          </button>
        </div>
        {cityOpen && (
          <div className="city-menu" role="dialog" aria-label="지역 선택">
            <div className="city-menu-head"><span>어디의 날씨를 볼까요?</span><button type="button" onClick={useLocation}>현재 위치 사용</button></div>
            {CITIES.map((item) => (
              <button key={item.id} type="button" className={city.id === item.id ? "city-option is-active" : "city-option"} onClick={() => selectCity(item)}>
                <span><strong>{item.name}</strong><small>{item.subtitle}</small></span>{city.id === item.id && <Check size={16} />}
              </button>
            ))}
          </div>
        )}
      </header>

      {notice && <button type="button" className="notice" onClick={() => setNotice("")} role="status" aria-live="polite">{notice}<span>닫기</span></button>}

      <main id="today" className="content-shell">
        {errorText && <div className="connection-note" role="status"><CloudRain size={16} /> {errorText}<button type="button" onClick={() => void loadWeather(city)}>다시 시도</button></div>}

        <section className="weather-hero" aria-label="오늘의 날씨">
          <div className="hero-image" aria-hidden="true" />
          <div className="hero-copy">
            <p className="eyebrow">{city.subtitle} · {weather ? dayName(weather.daily.time[0]) : "기상 연결 중"}</p>
            {loadState === "loading" && !weather ? (
              <div className="hero-loading"><span className="loading-line long" /><span className="loading-line short" /></div>
            ) : weather ? (
              <>
                <div className="temperature-monolith"><span>{Math.round(weather.current.temperature_2m)}</span><sup>°</sup><div><WeatherIcon size={22} strokeWidth={1.4} /><strong>{weatherLabel(weather.current.weather_code)}</strong></div></div>
                <p className="hero-summary">오늘의 체감은 <strong>{weather.current.apparent_temperature >= 28 ? "더움" : weather.current.apparent_temperature <= 12 ? "쌀쌀함" : "가벼움"}</strong>에 가까워요. 옷의 공기층을 조절해 보세요.</p>
              </>
            ) : (
              <div className="hero-empty"><p>기상 정보를 연결하지 못했어요.</p><button type="button" onClick={() => void loadWeather(city)}>날씨 다시 불러오기</button></div>
            )}
          </div>
          {weather && <dl className="weather-facts">
            <div><dt>체감</dt><dd>{Math.round(weather.current.apparent_temperature)}°</dd></div>
            <div><dt>강수</dt><dd>{weather.daily.precipitation_probability_max[0] ?? 0}%</dd></div>
            <div><dt>바람</dt><dd>{Math.round(weather.current.wind_speed_10m)}<small>km/h</small></dd></div>
            <div><dt>습도</dt><dd>{weather.current.relative_humidity_2m}%</dd></div>
            <div><dt>UV</dt><dd>{Math.round(weather.daily.uv_index_max[0] ?? 0)}</dd></div>
          </dl>}
        </section>

        {weather && <section className="temperature-strip" aria-label="오늘 시간대별 온도">
          <div className="strip-label"><Thermometer size={17} /><span>오늘의 온도 흐름</span><strong>{Math.round(weather.daily.temperature_2m_min[0])}° <i /> {Math.round(weather.daily.temperature_2m_max[0])}°</strong></div>
          <div className="temperature-line" aria-hidden="true"><span className="temp-dot start" /><span className="temp-path" /><span className="temp-dot peak" /><span className="temp-path end" /></div>
          <div className="time-legend"><span>아침</span><span>낮</span><span>저녁</span></div>
        </section>}

        <section className="decision-intro" aria-label="오늘의 준비물">
          <div className="decision-copy"><span className="eyebrow">Dressing rationale</span><h1>날씨를 읽고,<br />한 벌을 결정하세요.</h1><p>{weather ? reasonFor(weather) : "날씨를 불러오면 오늘의 가장 실용적인 한 벌을 정리해 드릴게요."}</p></div>
          {weather && <div className="preparedness"><PreparednessIcon size={23} strokeWidth={1.5} /><div><span>오늘의 준비</span><strong>{getPreparedness(weather).label}</strong><small>{getPreparedness(weather).detail}</small></div></div>}
        </section>

        <section className="filter-deck" aria-label="코디 조건 선택">
          <div className="filter-group"><span>스타일</span><div role="tablist" aria-label="스타일 선택">{(Object.keys(STYLE_LABELS) as StyleId[]).map((id) => <button key={id} type="button" role="tab" aria-selected={style === id} className={style === id ? "filter-pill is-active" : "filter-pill"} onClick={() => setStyle(id)}>{STYLE_LABELS[id]}</button>)}</div></div>
          <div className="filter-group tone-group"><span>선호 톤</span><div>{([ ["all", "전체"], ["cool", "쿨톤"], ["warm", "웜톤"] ] as [ToneId, string][]).map(([id, label]) => <button key={id} type="button" aria-pressed={tone === id} className={tone === id ? "tone-button is-active" : "tone-button"} onClick={() => setTone(id)}>{label}</button>)}</div></div>
          <div className="filter-group comfort-group"><span><SlidersHorizontal size={13} /> 체감</span><div>{([ ["neutral", "보통"], ["warmer", "추위 탐"], ["cooler", "더위 탐"] ] as [ComfortId, string][]).map(([id, label]) => <button key={id} type="button" aria-pressed={comfort === id} className={comfort === id ? "comfort-button is-active" : "comfort-button"} onClick={() => setComfort(id)}>{label}</button>)}</div></div>
          <div className="filter-group occasion-group"><span>일정</span><div>{([ ["any", "상관없음"], ["work", "출근"], ["weekend", "주말"], ["evening", "저녁" ] ] as [OccasionId, string][]).map(([id, label]) => <button key={id} type="button" aria-pressed={occasion === id} className={occasion === id ? "occasion-button is-active" : "occasion-button"} onClick={() => setOccasion(id)}>{label}</button>)}</div></div>
        </section>

        <section className="outfit-spread" aria-labelledby="outfit-heading">
          <div className={outfitImage ? "outfit-visual has-look-image" : "outfit-visual"}>
            {outfitImage ? (
              <img src={outfitImage.src} alt={outfitImage.alt} loading="lazy" />
            ) : (
              <>
                <img src="/weather-fit/assets/weather-fit-closet.webp" alt="차분한 색감의 니트와 가죽 소품이 정돈된 옷장" loading="lazy" />
                <span className="image-pending-note">전용 실루엣 준비 중</span>
              </>
            )}
            <div className="visual-caption"><span>LOOK / 01</span><span>{outfit.tone === "cool" ? "COOL TONE" : "WARM TONE"}</span></div>
          </div>
          <article className="outfit-card">
            <div className="outfit-title-row"><div><p className="eyebrow">Today’s outfit</p><h2 id="outfit-heading">{outfit.name}</h2></div><button type="button" className={isSaved ? "round-action is-active" : "round-action"} onClick={toggleSaved} aria-pressed={isSaved} aria-label={isSaved ? "저장한 룩에서 빼기" : "이 룩 저장하기"}><Bookmark size={18} fill={isSaved ? "currentColor" : "none"} /></button></div>
            <p className="outfit-note">{outfit.note}</p>
            <section className="fit-reasons" aria-label="이 룩이 맞는 이유">
              <div className="fit-reasons-head"><span>FIT CHECK</span><strong>이 룩이 맞는 이유</strong></div>
              <div className="signal-list">{fitSignals.map((signal) => <div key={signal.label} className="signal-item"><span>{signal.label}</span><strong>{signal.value}</strong><small>{signal.detail}</small></div>)}</div>
            </section>
            <dl className="outfit-pieces">
              <div><dt>상의</dt><dd>{outfit.top}{missing.includes(outfit.top) && <small>옷장에 없음</small>}</dd><button type="button" onClick={() => toggleMissing(outfit.top)}>{missing.includes(outfit.top) ? "있음으로" : "없음"}</button></div>
              <div><dt>하의</dt><dd>{outfit.bottom}{missing.includes(outfit.bottom) && <small>옷장에 없음</small>}</dd><button type="button" onClick={() => toggleMissing(outfit.bottom)}>{missing.includes(outfit.bottom) ? "있음으로" : "없음"}</button></div>
              <div><dt>신발</dt><dd>{outfit.shoes}{missing.includes(outfit.shoes) && <small>옷장에 없음</small>}</dd><button type="button" onClick={() => toggleMissing(outfit.shoes)}>{missing.includes(outfit.shoes) ? "있음으로" : "없음"}</button></div>
              <div><dt>포인트</dt><dd>{outfit.accessory}{missing.includes(outfit.accessory) && <small>옷장에 없음</small>}</dd><button type="button" onClick={() => toggleMissing(outfit.accessory)}>{missing.includes(outfit.accessory) ? "있음으로" : "없음"}</button></div>
            </dl>
            <div className="outfit-actions"><button type="button" className={isWorn ? "primary-action is-done" : "primary-action"} onClick={toggleWorn}>{isWorn ? <Check size={17} /> : <Footprints size={17} />}{isWorn ? "오늘 착용 기록됨" : "오늘 입은 룩으로 기록"}</button><button type="button" className="text-action" onClick={() => void shareOutfit()}><Share2 size={16} /> 공유</button></div>
            {checklist.length > 0 && <section className="leave-checklist" aria-label="나가기 전 체크리스트"><div><span>LEAVING IN 30 SECONDS</span><strong>나가기 전</strong></div><div className="check-steps">{checklist.map((step) => { const StepIcon = step.icon; const checked = checkedSteps.includes(step.id); return <button key={step.id} type="button" aria-pressed={checked} className={checked ? "check-step is-done" : "check-step"} onClick={() => setCheckedSteps((items) => checked ? items.filter((item) => item !== step.id) : [...items, step.id])}><StepIcon size={16} /><span><b>{step.label}</b><small>{step.detail}</small></span>{checked ? <CircleCheck size={17} /> : <span className="step-marker" />}</button>; })}</div></section>}
          </article>
          <aside className="alternate-note"><span className="eyebrow">When your wardrobe differs</span><p><strong>{outfit.alternate}</strong>으로 바꿔도 오늘의 온도 균형은 유지돼요.</p><span className="alternate-rule">{occasionLine(occasion)}</span></aside>
        </section>

        <section className="lower-grid">
          <article className="tomorrow-card">
            <div className="card-topline"><span className="eyebrow">Tomorrow, at a glance</span><CalendarDays size={18} /></div>
            {weather ? <><h2>{weather.daily.time[1] ? `${dayName(weather.daily.time[1])}도 미리 준비하세요.` : "내일 예보를 준비 중이에요."}</h2><p>{weather.daily.time[1] ? `${Math.round(weather.daily.temperature_2m_min[1])}° / ${Math.round(weather.daily.temperature_2m_max[1])}° · 강수 ${weather.daily.precipitation_probability_max[1] ?? 0}%` : "내일의 온도 흐름을 곧 확인할 수 있어요."}</p><div className="tomorrow-rule">{(weather.daily.precipitation_probability_max[1] ?? 0) >= 40 ? "비가 예보되어 있어요. 오늘 밤 방수 신발을 꺼내두세요." : "온도 변화가 크지 않아요. 오늘의 베이스 룩을 그대로 활용할 수 있어요."}</div></> : <p>날씨 정보를 불러오면 내일의 준비물도 함께 정리해 드려요.</p>}
          </article>
          <article className="week-card">
            <div className="card-topline"><span className="eyebrow">7-day fabric forecast</span><ExternalLink size={17} /></div>
            <div className="week-content"><img src="/weather-fit/assets/weather-fit-weather-moods.webp" alt="맑음과 비, 선선한 날의 옷차림 분위기" />
              <div className="week-list">{weather ? weather.daily.time.slice(0, 5).map((date, index) => <div key={date} className="week-day"><span>{index === 0 ? "오늘" : dayName(date, true)}</span><i className={weather.daily.precipitation_probability_max[index] >= 50 ? "weather-dot rain" : "weather-dot"} /><strong>{Math.round(weather.daily.temperature_2m_max[index])}°</strong><small>{weatherLabel(weather.daily.weather_code[index])}</small></div>) : <p>예보를 준비하고 있어요.</p>}</div>
            </div>
          </article>
        </section>

        <section className="week-prep" aria-label="이번 주 옷장 준비">
          <div><span className="eyebrow">Wardrobe ahead</span><h2>이번 주, 미리 꺼내둘 것.</h2></div>
          <ul>{weekPrep.map((item) => <li key={item.id}><strong>{item.label}</strong><small>{item.detail}</small></li>)}</ul>
        </section>

        <section className="saved-rail" aria-label="나의 Weather Fit 기록">
          <div><span className="eyebrow">Your small archive</span><h2>오늘의 선택을<br />내일의 기준으로.</h2></div>
          <div className="archive-stat"><Bookmark size={20} /><strong>{saved.length}</strong><span>저장한 룩</span></div>
          <div className="archive-stat"><Footprints size={20} /><strong>{worn.length}</strong><span>착용 기록</span></div>
          <div className="archive-detail"><Droplets size={18} /><p>날씨와 함께 남긴 기록은 다음 추천에서 가장 실용적인 출발점이 됩니다.</p><button type="button" className="archive-export" onClick={exportArchive}><Download size={14} /> 내 기록 내려받기</button></div>
        </section>
      </main>

      <footer className="app-footer"><span>WEATHER FIT / DAILY DRESSING INDEX</span><span>기상 데이터: Open-Meteo</span></footer>
    </div>
  );
}
