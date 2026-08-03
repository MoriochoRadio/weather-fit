// 오프라인 지원 (FR-25) — 별도 빌드 도구 없이 손으로 작성.
// CACHE_NAME은 배포마다 바뀌어야 activate 단계에서 이전 캐시(오래된 JS/CSS 번들 포함)가 실제로
// 삭제된다 — 버전이 그대로면 activate의 정리 로직이 죽은 코드가 되어 캐시가 무한히 쌓인다 (QA).
// 수동으로 올리는 걸 잊는 사고를 막기 위해 __BUILD_ID__는 scripts/stamp-sw.mjs가 `npm run build`
// 후 커밋 해시로 자동 치환한다 (dev 서버·이 파일을 직접 열었을 때는 리터럴 그대로 남아있어도 무해함).
const CACHE_NAME = 'weatherfit-__BUILD_ID__';

const WEATHER_HOSTS = ['open-meteo.com'];
// 브랜드 서체(Cormorant Garamond)는 외부 CDN에서 온다. 캐싱 대상에서 빼 두면 오프라인에서
// 서체가 통째로 깨진다 (QA) — 내용이 바뀌지 않는 리소스라 캐시 우선으로 다룬다.
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

const isHost = (url, hosts) => hosts.some((h) => url.hostname === h || url.hostname.endsWith('.' + h));

/**
 * 내용이 절대 바뀌지 않는 리소스인가?
 * Vite가 파일명에 해시를 박아 주므로 /assets/의 번들과 아이콘·폰트는 URL이 같으면 내용도 같다.
 * 이런 건 캐시 우선으로 줘야 재방문 때마다 네트워크를 기다리지 않는다 (QA: 항상 network-first라 느렸음).
 */
function isImmutable(url, sameOrigin) {
  if (isHost(url, FONT_HOSTS)) return true;
  if (!sameOrigin) return false;
  return url.pathname.includes('/assets/') || url.pathname.startsWith('/icons/') || url.pathname.includes('/icons/');
}

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
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !isHost(url, WEATHER_HOSTS) && !isHost(url, FONT_HOSTS)) return;

  // 해시가 박힌 정적 리소스: 캐시 우선 (있으면 즉시 반환하고 네트워크는 건드리지 않는다)
  if (isImmutable(url, sameOrigin)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) return cached;
        const fresh = await fetch(request);
        // 폰트 CDN은 CORS 응답이라 ok로 판정된다. 불투명(opaque) 응답은 저장해도 재사용이 어려워 거른다.
        if (fresh.ok) cache.put(request, fresh.clone());
        return fresh;
      })(),
    );
    return;
  }

  // HTML·날씨 API: 네트워크 우선, 실패 시 캐시 (최신 정보가 우선이지만 오프라인에선 마지막 값이라도)
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
