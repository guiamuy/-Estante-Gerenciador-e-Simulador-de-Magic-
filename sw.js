/* Service worker. A lógica de decisão vive em strategy.js e é testada lá. */
/* =====================================================================
   W1 · ESTRATÉGIA DE CACHE
   Isolada do service worker para poder ser testada como função pura.
   O worker só executa o que esta função decide.
   ===================================================================== */
const CACHES = { shell: 'estante-shell-v1', api: 'estante-api-v1', img: 'estante-img-v1' };

/** Decide como tratar uma requisição. Nunca lança. */
function pickStrategy(request) {
  const url = String(request.url || request || '');
  const method = (request.method || 'GET').toUpperCase();
  let u;
  try { u = new URL(url); } catch (e) { return { strategy: 'passthrough' }; }

  // Escrita nunca é cacheada.
  if (method !== 'GET' && method !== 'POST') return { strategy: 'passthrough' };

  if (u.hostname === 'api.scryfall.com') {
    // POST /cards/collection é consulta disfarçada de escrita: a resposta
    // é cacheável por chave derivada do corpo, feita no worker.
    return { strategy: 'network-first', cache: CACHES.api, ttlMs: 7 * 24 * 3600 * 1000 };
  }
  if (/(^|\.)scryfall\.io$/.test(u.hostname) || /(^|\.)scryfall\.com$/.test(u.hostname)) {
    return { strategy: 'cache-first', cache: CACHES.img };
  }
  if (request.mode === 'navigate' || u.pathname === '/' || u.pathname.endsWith('.html')) {
    return { strategy: 'network-first', cache: CACHES.shell };
  }
  if (u.origin === selfOrigin()) return { strategy: 'stale-while-revalidate', cache: CACHES.shell };
  return { strategy: 'passthrough' };
}

function selfOrigin() {
  try { return self.location.origin; } catch (e) { return null; }
}

/** Arquivos que precisam existir antes do primeiro uso offline. */
const PRECACHE = ['./', './index.html', './manifest.webmanifest', './icon-512.png', './icon.svg'];


self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHES.shell).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  const keep = new Set(Object.values(CACHES));
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('estante-') && !keep.has(k)).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function cacheKey(request) {
  if (request.method !== 'POST') return request;
  const body = await request.clone().text();
  return new Request(request.url + '#' + hash(body), { method: 'GET' });
}
function hash(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }

self.addEventListener('fetch', event => {
  const plan = pickStrategy(event.request);
  if (plan.strategy === 'passthrough') return;

  event.respondWith((async () => {
    const cache = await caches.open(plan.cache);
    const key = await cacheKey(event.request);

    if (plan.strategy === 'cache-first') {
      const hit = await cache.match(key);
      if (hit) return hit;
      try { const res = await fetch(event.request); if (res.ok) cache.put(key, res.clone()); return res; }
      catch (e) { return new Response('', { status: 504 }); }
    }

    if (plan.strategy === 'network-first') {
      try {
        const res = await fetch(event.request);
        if (res.ok) cache.put(key, res.clone());
        return res;
      } catch (e) {
        const hit = await cache.match(key);
        if (hit) { const h = new Headers(hit.headers); h.set('X-Estante-Cache', 'hit'); return new Response(await hit.blob(), { status: hit.status, headers: h }); }
        return new Response(JSON.stringify({ object: 'error', details: 'offline e sem cópia local' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // stale-while-revalidate
    const hit = await cache.match(key);
    const net = fetch(event.request).then(res => { if (res.ok) cache.put(key, res.clone()); return res; }).catch(() => null);
    return hit || (await net) || new Response('', { status: 504 });
  })());
});
