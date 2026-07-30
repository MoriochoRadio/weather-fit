// 오프라인 지원 (FR-25) — 별도 빌드 도구 없이 손으로 작성.
// Vite 빌드 산출물의 JS/CSS 파일명은 해시가 매번 바뀌어 미리 목록을 알 수 없으므로,
// 고정 프리캐시 목록 대신 "네트워크 우선, 실패 시 캐시" 런타임 캐싱을 쓴다 —
// 처음 성공한 요청부터 그 URL 그대로 캐시되므로 해시 변경에 영향받지 않는다.
// CACHE_NAME은 배포마다 바뀌어야 activate 단계에서 이전 캐시(오래된 JS/CSS 번들 포함)가 실제로
// 삭제된다 — 버전이 그대로면 activate의 정리 로직이 죽은 코드가 되어 캐시가 무한히 쌓인다 (QA).
// 수동으로 올리는 걸 잊는 사고를 막기 위해 __BUILD_ID__는 scripts/stamp-sw.mjs가 `npm run build`
// 후 커밋 해시로 자동 치환한다 (dev 서버·이 파일을 직접 열었을 때는 리터럴 그대로 남아있어도 무해함).
const CACHE_NAME = 'weatherfit-__BUILD_ID__';

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
