// 빌드할 때 vite.config.ts의 serviceWorkerCacheVersion 플러그인이 빌드 내용의 해시로 바꾼다.
// 배포마다 캐시 이름이 달라져야 파일명이 같은 이미지·manifest도 새로 받고,
// 지난 배포의 해시 청크가 캐시에 쌓이지 않는다.
const CACHE_VERSION = "__BUILD_HASH__";
const CACHE_PREFIX = "weather-fit-pages-";
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;
const APP_SHELL = [
  "./",
  "./manifest.webmanifest",
  "./assets/weather-fit-logo.webp",
  "./assets/weather-fit-hero.webp",
  "./assets/weather-fit-closet.webp",
  "./assets/weather-fit-weather-moods.webp",
];

self.addEventListener("install", (event) => {
  // 브라우저 HTTP 캐시에 남은 옛 파일을 새 캐시에 담지 않도록 네트워크에서 다시 받는다.
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: "reload" })))));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // 캐시 저장소는 출처(origin) 단위라 같은 github.io 아래 다른 앱과 공유된다 — 이 앱의 캐시만 지운다.
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // 없는 경로의 404나 서버 오류 페이지로 오프라인용 첫 화면을 덮어쓰지 않는다.
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put("./", copy));
          }
          return response;
        })
        .catch(() => caches.match("./")),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    }),
  );
});
