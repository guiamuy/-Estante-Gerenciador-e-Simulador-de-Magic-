/* Service worker. A lógica de decisão vive em strategy.js e é testada lá. */
/* =====================================================================
   W1 · ESTRATÉGIA DE CACHE
   Isolada do service worker para poder ser testada como função pura.
   O worker só executa o que esta função decide.
   ===================================================================== */
const CACHES = { shell: 'estante-shell-v1', api: 'estante-api-v1', img: 'estante-img-v1', ocr: 'estante-ocr-v1' };

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
  // X6 · motor de OCR: arquivos versionados e imutáveis, guardados para o scanner funcionar offline
  if ((u.hostname === 'cdn.jsdelivr.net' && /\/npm\/(tesseract|@tesseract)/.test(u.pathname)) || u.hostname === 'tessdata.projectnaptha.com') {
    return { strategy: 'cache-first', cache: CACHES.ocr, opaque: true };
  }
  // O2 · imagens de carta: pede com CORS primeiro (resposta normal, sem o
  // acolchoamento de cota que o Chrome aplica a resposta opaca) e só cai para a
  // opaca se o CDN não permitir. Guardada de qualquer jeito: sem imagem a coleção
  // e a mesa ficam cegas sem internet.
  if (/(^|\.)scryfall\.io$/.test(u.hostname) || /(^|\.)scryfall\.com$/.test(u.hostname)) {
    return { strategy: 'cache-first', cache: CACHES.img, opaque: true, cors: true };
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

/** O2 · a mesma URL pedida em modo CORS: resposta legível e sem acolchoamento de cota. */
function corsRequest(request, cache = 'default') {
  try { return new Request(request.url, { mode: 'cors', credentials: 'omit', cache, headers: { Accept: 'image/*,*/*;q=0.8' } }); }
  catch (e) { return request; }
}
/** H7 · a imagem chegou inteira? Download cortado no meio (sinal fraco) deixa a carta pintada só numa tira do topo,
    e uma resposta cortada guardada no cache repetiria o defeito para sempre. Confere o tamanho anunciado e o fecho do
    formato: JPEG termina em FFD9, PNG em IEND, WebP tem o tamanho no cabeçalho. Formato desconhecido passa. */
function imagemInteira(bytes, { tamanho = null } = {}) {
  const n = bytes ? bytes.length : 0;
  if (!n) return false;
  if (tamanho != null && tamanho > 0 && n !== tamanho) return false;
  const fim = bytes.subarray(Math.max(0, n - 64));
  const tem = seq => { for (let i = fim.length - seq.length; i >= 0; i--) { let ok = true; for (let j = 0; j < seq.length; j++) if (fim[i + j] !== seq[j]) { ok = false; break; } if (ok) return true; } return false; };
  if (bytes[0] === 0xFF && bytes[1] === 0xD8) return tem([0xFF, 0xD9]);
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return tem([0x49, 0x45, 0x4E, 0x44]);
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && n >= 12) return n >= ((bytes[4] | bytes[5] << 8 | bytes[6] << 16 | bytes[7] << 24) >>> 0) + 8;
  return true;
}
/** H7 · lê o corpo e devolve uma resposta nova com ele se veio inteiro; null se veio cortado. Opaca não dá para ler: passa. */
async function corpoConferido(res) {
  if (!res || res.type === 'opaque') return res;
  let buf; try { buf = await res.arrayBuffer(); } catch (e) { return null; }
  const tamanho = !res.headers.get('content-encoding') ? Number(res.headers.get('content-length')) || null : null;
  if (!imagemInteira(new Uint8Array(buf), { tamanho })) return null;
  return new Response(buf, { status: res.status, statusText: res.statusText, headers: new Headers(res.headers) });
}
/** O2 · busca a imagem: CORS primeiro; se falhar (CDN sem CORS), a requisição original (opaca).
    H7 · a resposta CORS só vale inteira: cortada, pede de novo sem o cache do navegador; cortada outra vez,
    entrega o que der e NÃO guarda (`guardar: false`), para a próxima tentativa buscar de novo. */
async function fetchImagem(request, plan) {
  let cortada = false;
  if (plan.cors) {
    for (const modo of ['default', 'reload']) {
      try {
        const r = await fetch(corsRequest(request, modo)); if (!r.ok) break;
        const inteira = await corpoConferido(r); if (inteira) return { res: inteira, guardar: true };
        cortada = true;
      } catch (e) { break; /* tenta opaca */ }
    }
  }
  return { res: await fetch(request), guardar: !cortada };
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
      // H7 · cópia guardada cortada (de antes desta conferência) é apagada e buscada de novo: o defeito não fica para sempre
      if (hit && plan.cors && hit.type !== 'opaque') { const inteira = await corpoConferido(hit); if (inteira) return inteira; await cache.delete(key); }
      else if (hit) return hit;
      try { const { res, guardar } = await fetchImagem(event.request, plan); if (guardar && (res.ok || (plan.opaque && res.type === 'opaque'))) event.waitUntil(cache.put(key, res.clone()).catch(() => {})); return res; }
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
        // Q10 · sem rede e sem cópia: o app trata como falha de rede (sem retentar), não como erro do servidor
        return new Response(JSON.stringify({ object: 'error', details: 'offline e sem cópia local' }),
          { status: 503, headers: { 'Content-Type': 'application/json', 'X-Estante-Offline': '1' } });
      }
    }

    // stale-while-revalidate
    const hit = await cache.match(key);
    const net = fetch(event.request).then(res => { if (res.ok) cache.put(key, res.clone()); return res; }).catch(() => null);
    return hit || (await net) || new Response('', { status: 504 });
  })());
});
