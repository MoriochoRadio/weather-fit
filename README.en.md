# WeatherFit — Today's Outfit

🇰🇷 [한국어](README.md) · 🇬🇧 English

A web app that recommends men's outfits (in Korean) matched to today's weather. Four styles — **Old Money · Casual · Formal · Minimal** —
centered on calm cool tones, with warm-tone options suggested as well.

**▶ https://moriochoradio.github.io/weather-fit/**

Open it in Safari on iPhone and tap **Share → Add to Home Screen** to use it like an app.
It's a static web app that needs no server or API keys — pushing to `main` makes GitHub Actions run the tests and deploy automatically.

---

## What It Does for You

### What to wear today
- **Outfit recommendations** that factor in the weather — 6 temperature bands × 4 styles, with 2+ outfits per combination (75 outfits built in)
- Whether you check in the morning or the evening, recommendations are based on the **hours remaining in the day** (it won't suggest clothes for the midday high at night)
- **See other outfits** — reshuffles the order within the same day to widen your options
- **Alternative outfits** — suggestions from adjacent temperature bands "if it feels warmer / chillier to you"
- **Response advice** for rain, snow, heat waves, cold snaps, large diurnal ranges, and strong winds, plus warnings about rain-vulnerable fabrics

### See what each garment is, at a glance
- A **mini silhouette with each item's actual color painted onto the garment shape** — so the color combination clicks before you try it on
- A **line icon for every item** — 25 distinct types including coats, puffers, cardigans, shackets, suits, short sleeves, shorts, boots, and sandals
- **Plain-language glossary** — terms like balmacaan coat and seersucker explained at a layperson's level + **substitute suggestions** (75 terms)

### Weather
- Current location or **nationwide city/county selection** (17 provinces/metros, 161 regions built in — works without a geocoding API)
- Temperature, feels-like, low/high, precipitation probability, wind + **fine dust (PM) and UV index**, with mask/UV advice at dangerous levels
- **Daily briefing** — "24° in the morning → 31° at midday → 27° in the evening" + a temperature sparkline + "Rain from 2 PM to 6 PM — bring an umbrella"
- **Compared with yesterday** — "6° colder than yesterday; bring an extra layer"
- **Tomorrow preview** and **this week's forecast** (6 days of highs/lows, temperature bands, and rain news)

### Make it yours
- Save multiple **favorite regions** — including spots finer-grained than city/county (stations, neighborhoods, etc.)
- Save **favorite outfits** — revisit them anytime, regardless of filters
- **Worn log** — tap "I wore this today" and recently worn outfits move to the back of future recommendations
- **Wardrobe check** — tap "I don't have this" and substitutes are shown first from then on
- Remembers your last-chosen **style and tone filters**

### And more
- **Share as an image** — a single PNG containing the silhouette, items, tips, and color palette (falls back to text → clipboard in unsupported environments)
- **Offline support** — caches the last-viewed weather and outfit, with an offline-state notice
- Responsive on iPhone Safari and PC, automatic dark mode, and a dedicated app icon when added to the home screen

---

## Running It

```bash
npm install
npm run dev      # dev server (http://localhost:5173)
npm test         # unit tests (283)
npm run build    # production build → dist/
npm run preview  # preview the build output
```

## Tech Stack

Vite + React 18 + TypeScript · pure CSS · Vitest · [Open-Meteo](https://open-meteo.com)

**Dependencies are deliberately kept to a minimum.** The only runtime dependencies are React/ReactDOM,
because the app must run on static hosting alone, with no server, database, or API keys. That's why there is
no state-management library, CSS framework, chart library, or icon package — I built those parts myself.

- The garment shapes for outfit silhouettes and item icons: all hand-drawn SVGs (no external assets, no license obligations)
- The temperature sparkline, share-image (PNG) generation, and service worker: implemented without libraries

## Why I Built It This Way — Technical Choices Q&A

**Q. Why no server or API keys?**
A. For weather, [Open-Meteo](https://open-meteo.com) allows direct browser calls without a key, and for region search I embedded coordinates for 161 regions nationwide instead of using a geocoding API. As a result, it runs at zero operating cost on GitHub Pages static hosting alone, with no key leaks, server outages, or billing to worry about — by construction.

**Q. Why a PWA?**
A. As a tool you "glance at every morning," the core experience is opening it with one tap on a home-screen icon, and a PWA is the way to get that without app-store distribution. I wrote the `manifest.json` and service worker (`sw.js`) by hand so it shows the last weather and outfit even offline.

**Q. Why TypeScript?**
A. The recommendation engine is a pile of combination rules like 6 temperature bands × 4 styles, so `TempBand` and `StyleId` union types can block invalid combinations at compile time. The built-in data — 75 outfits, 75 glossary terms — must also pass type checking for the build to succeed.

**Q. How is weather data obtained, and why that way?**
A. The Open-Meteo forecast API is called directly from the browser. Among free APIs that allow CORS without a key, it's one that provides hourly temperature, feels-like, precipitation probability, and even UV — which is why I chose it — and for fine dust I use the same service's Air Quality API to keep the integration to a single provider.

**Q. Why build the 75-outfit dataset yourself?**
A. Guaranteeing 2+ outfits for every combination of 6 temperature bands × 4 styles meant designing the data structure myself from the start, and to avoid depending on external fashion APIs or image copyrights I hand-drew the silhouette SVGs too. As a result, the code, data, and assets all live in one repository and can be distributed under MIT.

**Q. Why separate the recommendation logic into pure functions in `engine/`?**
A. The recommendation rules, briefing copy, and silhouette layout are logic that only needs input→output verification with no DOM, so I split them into pure functions. That's why the 283 unit tests run fast without a browser, and the screen and the share image reuse the same layout calculations.

## Structure

```
src/
├── engine/          pure functions — where the tests are concentrated
│   ├── recommend.ts     recommendation rules (temperature-band classification, tone filters, precipitation sorting, weather advice)
│   ├── briefing.ts      daily-flow briefing, yesterday/tomorrow comparison copy
│   ├── silhouette.ts    silhouette layout calculation (shared by the screen and the share image)
│   └── weatherCodes.ts  WMO weather code classification
├── data/            built-in data
│   ├── outfits.ts       75 outfits
│   ├── regions.ts       161 cities/counties nationwide
│   ├── glossary.ts      75 fashion terms + substitutes
│   ├── colors.ts        color name → hex
│   └── clothingPaths.ts clothing silhouette SVG paths
├── services/        external integrations · browser storage
│   ├── weather.ts       Open-Meteo forecasts
│   ├── airQuality.ts    fine dust
│   ├── geo.ts           location permission · region storage · favorites
│   ├── shareImage.ts    outfit card → PNG
│   └── prefs · savedOutfits · wornLog · wardrobe
└── components/      screens
```

## Project Documents

Stage-by-stage documents from planning to testing are kept in [`docs/`](docs).

| Document | Contents |
|---|---|
| [00-development-plan.md](docs/00-development-plan.md) | Development methodology, technology selection, configuration-management rules |
| [01-requirements.md](docs/01-requirements.md) | Functional/non-functional requirements (FR-01–34), use cases, acceptance criteria |
| [02-design.md](docs/02-design.md) | Architecture, data model, recommendation rule engine, UI design |
| [03-test-report.md](docs/03-test-report.md) | Per-version test results and a record of defects found and fixed |

## License

[MIT](LICENSE) — feel free to use and modify it.

The outfit silhouette and item icon SVGs were also drawn from scratch in this repository, so they're available under the same terms.
Weather data comes from [Open-Meteo](https://open-meteo.com); its own terms of use apply as provided by that service.
