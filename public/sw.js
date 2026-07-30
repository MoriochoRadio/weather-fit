// 오프라인 지원 (FR-25) — 별도 빌드 도구 없이 손으로 작성.
// Vite 빌드 산출물의 JS/CSS 파일명은 해시가 매번 바뀌어 미리 목록을 알 수 없으므로,
// 고정 프리캐시 목록 대신 "네트워크 우선, 실패 시 캐시" 런타임 캐싱을 쓴다 —
// 처음 성공한 요청부터 그 URL 그대로 캐시되므로 해시 변경에 영향받지 않는다.
const CACHE_NAME = 'weatherfit-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isWeatherApi = url.hostname.endsWith('open-meteo.com');
  const isSameOrigin = url.origin === self.location.origin;
  if (!isWeatherApi && !isSameOrigin) return; // 폰트 등 그 외 외부 리소스는 그대로 통과

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const fresh = await fetch(request);
        if (fresh.ok) cache.put(request, fresh.clone());
        return fresh;
      } catch {
        const cached = await cache.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') {
          const shell = await cache.match('./');
          if (shell) return shell;
        }
        throw new Error('오프라인이고 캐시된 응답도 없음');
      }
    })(),
  );
});
