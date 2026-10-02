/* CPX 추출기 서비스 워커 — 오프라인 캐시 */
const CACHE = 'cpx-extractor-v17';
const NAV_TIMEOUT_MS = 4000;   // 신호가 약하면 이 시간 뒤 저장된 화면으로 연다
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png'
];

// 정상 응답만 저장한다 — 404·서버 오류·공용 와이파이 로그인 페이지 등이 캐시에 들어가지 않게
function cacheable(res) {
  return !!res && res.ok && res.type === 'basic' && !res.redirected;
}

// GitHub Pages는 파일을 10분간 브라우저에 캐시하게 한다(max-age=600).
// 그 캐시를 거치면 배포 직후 옛 파일이 저장·표시되므로, 서버에서 직접 받는다.
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function handleNavigate(req) {
  const saved = await caches.match('./index.html') || await caches.match('./');
  // 화면은 매번 서버에 최신인지 확인한다 (바뀐 게 없으면 짧은 304 응답만 오간다)
  const network = fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then((res) => {
    if (cacheable(res)) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put('./index.html', copy)).catch(() => {});
    }
    return res;
  });

  // 처음 여는 경우(저장본 없음)는 네트워크를 끝까지 기다린다
  if (!saved) return network;

  // 저장본이 있으면: 최신 화면을 우선하되, 느리거나 실패하거나 오류 응답이면 저장본으로
  try {
    const res = await Promise.race([
      network,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), NAV_TIMEOUT_MS))
    ]);
    return res.ok ? res : saved;
  } catch (err) {
    return saved;
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  if (req.mode === 'navigate') {
    e.respondWith(handleNavigate(req));
    return;
  }

  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (cacheable(res)) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
