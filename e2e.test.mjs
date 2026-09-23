// Camada 4 · integração em navegador headless: fluxos do usuário ponta a
// ponta, com a Scryfall simulada. Pula localmente se o Playwright não estiver
// instalado; no CI a ausência é falha.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { ROOT } from './_load.mjs';

let pw = null;
try { pw = await import('playwright'); } catch (e) { if (process.env.CI) throw new Error('Playwright ausente no CI'); }
const skip = pw ? false : 'Playwright não instalado (npm i -D playwright && npx playwright install chromium)';

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
function serve() {
  const srv = createServer((req, res) => {
    const p = join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html'));
    if (!p.startsWith(ROOT) || !existsSync(p)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[extname(p)] || 'application/octet-stream' }); res.end(readFileSync(p));
  });
  return new Promise(r => srv.listen(0, () => r(srv)));
}
const card = (name, type_line, ci, cmc = 2) => ({ object: 'card', id: name, name, type_line, color_identity: ci, colors: ci, cmc, oracle_text: name === 'Preordain' ? 'Scry 2, then draw a card.' : name.startsWith('Lurrus') ? 'Companion — Each permanent card in your starting deck has mana value 2 or less.\nLifelink' : '', power: /Creature/.test(type_line) ? '1' : undefined, toughness: /Creature/.test(type_line) ? '1' : undefined, legalities: { commander: 'legal', pauper: 'legal' }, set: 'tst', set_name: 'Teste', collector_number: '1', rarity: 'common' });
const DB = Object.fromEntries([
  card('Malcolm, Alluring Scoundrel', 'Legendary Creature — Siren Pirate', ['U']), card('Sol Ring', 'Artifact', [], 1),
  card('Island', 'Basic Land — Island', ['U'], 0), card('Counterspell', 'Instant', ['U']),
  card('Delver of Secrets', 'Creature — Human Wizard', ['U'], 1), card('Preordain', 'Sorcery', ['U'], 1),
  card('Lurrus of the Dream-Den', 'Legendary Creature — Cat Nightmare', ['W', 'B'], 3), card('Mock Commander', 'Legendary Creature — Human', ['W', 'B'], 2),
  card('Plains', 'Basic Land — Plains', [], 0), card('Mock Ogre', 'Creature — Ogre', ['B'], 4),
  { ...card('Sky Pike', 'Creature — Fish', ['U'], 2), mana_cost: '{1}{U}', keywords: ['Flying'], power: '2', toughness: '1' },
  { ...card('Wall Guard', 'Creature — Wall', ['U'], 2), mana_cost: '{1}{U}', keywords: ['Defender', 'Reach'], power: '0', toughness: '4' },
  { ...card('Lightning Bolt', 'Instant', ['R'], 1), mana_cost: '{R}' },
  { ...card('Grizzly Bear', 'Creature — Bear', ['G'], 2), mana_cost: '{1}{G}', power: '2', toughness: '2' }
].map(c => [c.name.toLowerCase(), c]));

async function open(t) {
  const srv = await serve();
  const browser = await pw.chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.route('https://api.scryfall.com/**', async r => {
    if (r.request().url().includes('/cards/collection')) {
      const ids = JSON.parse(r.request().postData()).identifiers;
      return r.fulfill({ json: { data: ids.map(i => DB[i.name.toLowerCase()]).filter(Boolean), not_found: ids.filter(i => !DB[i.name.toLowerCase()]) } });
    }
    if (r.request().url().includes('/catalog/card-names')) return r.fulfill({ json: { object: 'catalog', data: Object.values(DB).map(c => c.name) } });
    if (r.request().url().includes('/cards/search')) {
      const q = decodeURIComponent(new URL(r.request().url()).searchParams.get('q') || '').toLowerCase();
      const exact = q.match(/^!"(.+)"$/);
      const words = q.split(/[\s:()"=<>]+/).filter(w => w.length > 2);
      const data = exact
        ? [DB[exact[1]], DB[exact[1]] && { ...DB[exact[1]], id: exact[1] + '-2', set: 'mh2', set_name: 'Modern Horizons 2', collector_number: '267' }].filter(Boolean)
        : Object.values(DB).filter(c => words.some(w => c.name.toLowerCase().includes(w)));
      return r.fulfill({ json: { object: 'list', data, has_more: false } });
    }
    return r.fulfill({ json: { object: 'card' } });
  });
  t.after(async () => { await browser.close(); srv.close(); });
  return { page, errors, base: `http://localhost:${srv.address().port}/index.html` };
}

test('e2e · criar lista, ver galeria, marcar coleção e exportar faltantes', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.goto(base + '#/listas');
  await page.click('#deck-new');
  await page.fill('#deck-name', 'Commander Malcolm v3');
  await page.fill('#deck-text', 'Commander\n1 Malcolm, Alluring Scoundrel\n\nDeck\n1 Sol Ring\n30 Island\n1 Counterspell\n1 Carta Inexistente');
  await page.click('#deck-save');
  await page.waitForSelector('.deck-summary');
  const body = await page.innerText('main');
  assert.match(body, /1 carta\(s\) não reconhecida\(s\): Carta Inexistente/);
  assert.match(body, /Terrenos/);
  assert.match(await page.innerText('.deck-summary'), /0\/34/);

  await page.click('text=Marcar o que tenho');
  await page.locator('.deck-slot').first().click();
  await page.waitForFunction(() => document.querySelector('.deck-summary').innerText.includes('1/34'));

  await page.click('text=Marcar o que tenho');
  await page.click('text=Exportar');
  await page.click('text=Só o que falta');
  const out = await page.inputValue('.ds-dialog textarea');
  assert.doesNotMatch(out, /Malcolm/, 'comandante marcado não aparece nos faltantes');
  assert.match(out, /30 Island/);
  assert.deepEqual(errors, []);
});

test('e2e · lista sobrevive a recarregar a página', { skip }, async t => {
  const { page, base } = await open(t);
  await page.goto(base + '#/listas/editar');
  await page.fill('#deck-name', 'Persistente');
  await page.fill('#deck-text', '1 Sol Ring');
  await page.click('#deck-save');
  await page.waitForSelector('.deck-summary');
  await page.goto(base + '#/listas');
  await page.reload();
  await page.waitForSelector('#decks-list .ds-list__item');
  assert.match(await page.innerText('#decks-list'), /Persistente/);
});

test('e2e · todo botão visível tem ao menos 44px de altura no celular', { skip }, async t => {
  const { page, base } = await open(t);
  for (const route of ['#/', '#/listas', '#/cartas']) {
    await page.goto(base + route); await page.waitForTimeout(300);
    const small = await page.$$eval('button', bs => bs.filter(b => b.offsetParent && b.getBoundingClientRect().height < 44)
      .map(b => `${b.id || b.textContent.trim().slice(0, 20)}: ${Math.round(b.getBoundingClientRect().height)}px`));
    assert.deepEqual(small, [], route);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 0, `${route}: página rola ${overflow}px para o lado`);
  }
});

async function createDeck(page, base, name, text, format = 'pauper') {
  await page.goto(base + '#/listas/editar');
  await page.fill('#deck-name', name);
  await page.selectOption('#deck-format', format);
  await page.fill('#deck-text', text);
  await page.click('#deck-save');
  await page.waitForSelector('.deck-summary');
}
const PAUPER = '20 Island\n4 Delver of Secrets\n4 Preordain\n4 Counterspell';
const tapHand = async (page, name) => { await page.locator('.tb-hand .tb-card', { hasText: name }).first().click(); };
const handCardByImgless = name => `.tb-hand .tb-card[aria-label^="${name}"]`;

test('e2e · goldfish: mão, terreno, criatura, adjudicação, desfazer, retomar e vitória', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await createDeck(page, base, 'Delver', PAUPER);
  await page.goto(base + '#/mesa');
  await page.fill('#mesa-seed', '4');
  await page.click('#mesa-start');
  await page.waitForSelector('#tb-keep');
  await page.click('#tb-keep');
  await page.waitForSelector('#tb-pass');
  // chega à própria principal 1 (se o goldfish começou, a mesa já passou o turno dele sozinha)
  for (let i = 0; i < 6 && !(await page.innerText('.tb-banner')).includes('Principal 1'); i++) await page.click('#tb-pass');
  assert.match(await page.innerText('.tb-banner'), /Principal 1/);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'mesa sem rolagem lateral');
  const tiny = await page.$$eval('.tb button', bs => bs.filter(b => b.offsetParent && b.getBoundingClientRect().height < 44).map(b => b.id || b.getAttribute('aria-label') || b.textContent.trim()));
  assert.deepEqual(tiny, [], 'alvos de toque da mesa');

  // A3: jogar terreno pela folha de ações, que só oferece o que é legal
  const island = page.locator(handCardByImgless('Island')).first();
  assert.ok(await island.count(), 'semente 4 precisa dar Island na mão inicial');
  await island.click();
  await page.click('text=Jogar terreno');
  await page.waitForSelector('.tb-side--me [data-zone="lands"] .tb-card');

  // A7: desfazer tira o terreno de volta para a mão
  await page.click('#tb-undo');
  await page.waitForFunction(() => !document.querySelector('.tb-side--me [data-zone="lands"] .tb-card'));
  await island.click(); await page.click('text=Jogar terreno');

  // A5: mágica sem script resolve e abre a adjudicação com o oracle
  const pre = page.locator(handCardByImgless('Preordain')).first();
  for (let i = 0; i < 15 && !(await pre.count()); i++) { await page.click('#tb-lib-me'); await page.click('.ds-dialog >> text=Comprar 1'); }
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/mesa-1.png', fullPage: true });
  await pre.click(); await page.click('text=Conjurar');
  await page.waitForSelector('#tb-adj');
  assert.match(await page.innerText('#tb-adj'), /Scry 2/);
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/mesa-2.png' });
  await page.click('#tb-adj-done');
  await page.waitForFunction(() => !document.querySelector('#tb-adj'));

  // A8: recarregar mantém a partida
  const lands = await page.locator('.tb-side--me [data-zone="lands"] .tb-card').count();
  await page.reload();
  await page.waitForSelector('#tb-pass');
  assert.equal(await page.locator('.tb-side--me [data-zone="lands"] .tb-card').count(), lands);

  // registro legível
  await page.click('#tb-log');
  assert.match(await page.innerText('.ds-dialog'), /Você jogou Island/);
  await page.keyboard.press('Escape');

  // vitória: 20 de dano no goldfish pelo contador de vida
  for (let i = 0; i < 4; i++) { await page.click('#tb-life-opp'); await page.click('.tb-lifepad button:has-text("−5")'); }
  await page.waitForSelector('#tb-new');
  assert.match(await page.innerText('.tb-banner'), /Você venceu/);
  assert.deepEqual(errors, []);
});

test('e2e · hot-seat esconde a mão até o próximo jogador confirmar', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await createDeck(page, base, 'Delver', PAUPER);
  await page.goto(base + '#/mesa');
  await page.click('[data-opponent="hotseat"]');
  await page.fill('#mesa-me', 'Ana'); await page.fill('#mesa-them', 'Bia');
  await page.click('#mesa-start');
  await page.waitForSelector('#tb-keep');
  await page.click('#tb-keep');
  await page.waitForSelector('#tb-handoff');
  assert.match(await page.innerText('#tb-handoff'), /Bia/);
  assert.equal(await page.locator('.tb-hand').count(), 0, 'mão escondida durante a passagem');
  await page.click('#tb-reveal');
  await page.waitForSelector('.tb-hand');
  assert.deepEqual(errors, []);
});

const MALCOLM = 'Commander\n1 Malcolm, Alluring Scoundrel\n\nDeck\n1 Sol Ring\n30 Island\n1 Counterspell';

test('e2e · C8 lista já possuída e C7 toque duplo na galeria', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.goto(base + '#/listas/editar');
  await page.fill('#deck-name', 'Malcolm v3');
  await page.fill('#deck-text', MALCOLM);
  await page.click('[data-ownall]');
  await page.click('#deck-save');
  await page.waitForSelector('.deck-summary');
  assert.match(await page.innerText('.deck-summary'), /33\/33/);

  const sol = page.locator('.deck-slot[data-name="Sol Ring"] .ds-card');
  await sol.dblclick();
  await page.waitForFunction(() => document.querySelector('.deck-summary').innerText.includes('32/33'));
  assert.equal(await page.locator('.ds-dialog').count(), 0, 'toque duplo não abre a carta');
  await sol.dblclick();
  await page.waitForFunction(() => document.querySelector('.deck-summary').innerText.includes('33/33'));

  await sol.click();
  await page.waitForSelector('.ds-dialog');
  assert.match(await page.innerText('.ds-dialog'), /Sol Ring/, 'um toque abre a carta');
  assert.deepEqual(errors, []);
});

test('e2e · C2/C9 coleção: somar, editar quantidade, remover, adicionar e filtrar', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.goto(base + '#/listas/editar');
  await page.fill('#deck-name', 'Malcolm v3');
  await page.fill('#deck-text', MALCOLM);
  await page.click('[data-ownall]');
  await page.click('#deck-save');
  await page.waitForSelector('.deck-summary');

  await page.goto(base + '#/colecao');
  await page.waitForSelector('.col-row');
  assert.equal(await page.locator('.col-row').count(), 4);
  assert.match(await page.innerText('#col-summary'), /4 carta\(s\) · 33 cópia\(s\)/);
  assert.match(await page.innerText('.col-row[data-name="Island"]'), /em Malcolm v3/);

  const cs = page.locator('.col-row[data-name="Counterspell"]');
  await cs.locator('button[aria-label^="Uma cópia a mais"]').click();
  await page.waitForFunction(() => document.querySelector('.col-row[data-name="Counterspell"] .col-row__n').textContent === '2');

  await cs.locator('.col-row__n').click();
  await page.fill('#col-qty-input', '5');
  await page.click('#col-qty-save');
  await page.waitForFunction(() => document.querySelector('.col-row[data-name="Counterspell"] .col-row__n').textContent === '5');

  const tiny = await page.$$eval('#col-list button', bs => bs.filter(b => b.getBoundingClientRect().height < 44).length);
  assert.equal(tiny, 0, 'controles da coleção com 44px');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'coleção sem rolagem lateral');

  await page.locator('.col-row[data-name="Sol Ring"] button[aria-label="Remover Sol Ring"]').click();
  assert.match(await page.innerText('.ds-dialog'), /Malcolm v3/, 'avisa quais listas usam a carta');
  await page.click('#col-remove-confirm');
  await page.waitForFunction(() => !document.querySelector('.col-row[data-name="Sol Ring"]'));

  await page.fill('#col-add', 'sol ring');
  await page.click('#col-add-btn');
  await page.waitForSelector('.col-row[data-name="Sol Ring"]');
  assert.equal(await page.locator('.col-row[data-name="Sol Ring"] .col-row__n').innerText(), '1');

  await page.fill('#col-filter', 'isl');
  await page.waitForFunction(() => document.querySelectorAll('.col-row').length === 1);

  // a lista reflete a coleção: Sol Ring voltou, Counterspell sobra
  await page.goto(base + '#/listas');
  await page.waitForSelector('#decks-list .ds-list__item');
  assert.match(await page.innerText('#decks-list'), /tenho 33 de 33/);
  assert.deepEqual(errors, []);
});

test('e2e · C7 toque duplo na busca marca a carta na coleção', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.goto(base + '#/cartas');
  await page.fill('#cards-q', 'sol');
  await page.press('#cards-q', 'Enter');
  await page.waitForSelector('#cards-results .deck-slot');
  await page.locator('#cards-results .deck-slot .ds-card').first().dblclick();
  await page.waitForSelector('#cards-results .own-badge');
  assert.match(await page.innerText('#cards-results .own-badge'), /tenho 1/);
  await page.goto(base + '#/colecao');
  await page.waitForSelector('.col-row[data-name="Sol Ring"]');
  assert.deepEqual(errors, []);
});

const MANABOX = 'Name,Set code,Set name,Collector number,Foil,Rarity,Quantity,ManaBox ID,Scryfall ID,Purchase price,Misprint,Altered,Condition,Language,Purchase price currency\n' +
  'Sol Ring,CMM,Commander Masters,400,foil,uncommon,2,1,abc,1.5,false,false,near_mint,en,USD\n' +
  'Counterspell,MH2,Modern Horizons 2,267,normal,uncommon,1,2,def,1,false,false,lightly_played,pt,USD\n' +
  ',,,,,,1,,,,,,,,\n';

test('e2e · C3 importar CSV do ManaBox, ver impressões e exportar CSV', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.goto(base + '#/colecao');
  await page.waitForSelector('#col-csv-import');
  await page.setInputFiles('#col-csv-file', { name: 'manabox.csv', mimeType: 'text/csv', buffer: Buffer.from(MANABOX) });
  await page.waitForSelector('#col-csv-add');
  const preview = await page.innerText('.ds-dialog');
  assert.match(preview, /Formato: ManaBox/);
  assert.match(preview, /2 linha\(s\) · 3 cópia\(s\)/);
  assert.match(preview, /1 linha\(s\) ignorada\(s\)/);
  await page.click('#col-csv-add');
  await page.waitForSelector('.col-row[data-name="Sol Ring"]');
  assert.match(await page.innerText('.col-row[data-name="Sol Ring"]'), /CMM · #400 · foil ×2/);
  assert.match(await page.innerText('.col-row[data-name="Counterspell"]'), /MH2 · #267 · PT · LP ×1/);

  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#col-csv-export')]);
  const csv = await (await download.createReadStream()).toArray().then(parts => Buffer.concat(parts).toString('utf8'));
  assert.match(csv, /^Count,Name,Edition,Condition,Language,Foil,Collector Number/);
  assert.match(csv, /2,Sol Ring,cmm,Near Mint,English,foil,400/);
  assert.deepEqual(errors, []);
});

test('e2e · C1 adicionar impressão, editar acabamento e ajustar por impressão', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.goto(base + '#/colecao');
  await page.fill('#col-add', 'Counterspell');
  await page.click('#col-add-btn');
  await page.waitForSelector('.col-row[data-name="Counterspell"]');
  await page.click('.col-row[data-name="Counterspell"] .col-row__info');
  await page.click('#col-add-print');
  await page.waitForSelector('#col-print-set');
  await page.selectOption('#col-print-set', '1'); // Modern Horizons 2 #267
  await page.selectOption('#col-print-finish', 'foil');
  await page.selectOption('#col-print-lang', 'ja');
  await page.fill('#col-print-qty', '2');
  await page.click('#col-print-save');
  await page.waitForSelector('#col-prints');
  const prints = await page.innerText('#col-prints');
  assert.match(prints, /sem edição definida/);
  assert.match(prints, /MH2 · #267 · foil · JA/);

  await page.locator('.col-print', { hasText: 'MH2' }).locator('text=Editar').click();
  await page.selectOption('#col-edit-finish', '');
  await page.click('#col-edit-save');
  await page.waitForFunction(() => { const el = document.querySelector('#col-prints'); return el && /MH2 · #267 · JA/.test(el.innerText) && !/foil/.test(el.innerText); });

  await page.locator('.col-print', { hasText: 'sem edição' }).locator('button[aria-label^="Uma cópia a menos"]').click();
  await page.waitForFunction(() => { const el = document.querySelector('#col-prints'); return el && !/sem edição/.test(el.innerText); });
  await page.keyboard.press('Escape');
  assert.match(await page.innerText('#col-summary'), /1 carta\(s\) · 2 cópia\(s\)/);
  assert.deepEqual(errors, []);
});

test('e2e · C5 aviso de backup e de armazenamento desprotegido', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.goto(base + '#/colecao');
  await page.fill('#col-add', 'Sol Ring');
  await page.click('#col-add-btn');
  await page.waitForSelector('#col-backup');
  assert.match(await page.innerText('#col-care'), /Sem backup ainda/);
  await Promise.all([page.waitForEvent('download'), page.click('#col-backup')]);
  await page.waitForFunction(() => !/backup/.test(document.querySelector('#col-care').innerText));
  assert.deepEqual(errors, []);
});

// Câmera e OCR simulados: o teste controla o texto que o "leitor" devolve.
const FAKE_DEVICE = deny => `
  window.__ocrQueue = [];
  window.Tesseract = { createWorker: async () => ({ setParameters: async () => {}, terminate: async () => {},
    recognize: async () => ({ data: { text: window.__ocrQueue.length ? window.__ocrQueue.shift() : '' } }) }) };
  const gum = async () => {
    if (${deny}) { const e = new Error('Permission denied'); e.name = 'NotAllowedError'; throw e; }
    const c = document.createElement('canvas'); c.width = 640; c.height = 480;
    const g = c.getContext('2d'); setInterval(() => { g.fillStyle = '#777'; g.fillRect(0, 0, 640, 480); }, 100);
    return c.captureStream(10);
  };
  if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = gum;
  else Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: gum } });
`;

test('e2e · X1/X2/X4 scanner: ler, leitura automática, candidatos, desfazer, corrigir e mandar para a coleção', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(FAKE_DEVICE(false));
  await page.goto(base + '#/scanner');
  await page.waitForSelector('#scan-read:not([disabled])');
  assert.match(await page.innerText('#scan-status'), /Base: \d+ nomes/);

  await page.click('[data-edition]'); // este teste cobre só o nome; a edição tem teste próprio
  await page.evaluate(() => window.__ocrQueue.push('S0l Rinq @®'));
  await page.click('#scan-read');
  await page.waitForFunction(() => /Sol Ring/.test(document.querySelector('#scan-result').innerText));
  await page.waitForFunction(() => /Lote: 1/.test(document.querySelector('#scan-lot').innerText));

  // automática: mesma carta parada soma uma vez; sumiu e voltou, soma de novo
  await page.evaluate(() => window.__ocrQueue.push('Island', 'Island', '', 'Island'));
  await page.click('[data-auto]');
  await page.waitForFunction(() => /(\d+)/.exec(document.querySelector('#scan-lot').innerText)[1] === '3', null, { timeout: 12000 });
  await page.click('[data-auto]');

  await page.click('[data-candidate="Island"]');
  await page.waitForFunction(() => /Lote: 4/.test(document.querySelector('#scan-lot').innerText));
  await page.click('#scan-undo');
  await page.waitForFunction(() => /Lote: 3/.test(document.querySelector('#scan-lot').innerText));

  await page.click('#scan-lot');
  assert.match(await page.innerText('#scan-lot-list'), /Island[\s\S]*2/);
  await page.locator('#scan-lot-list .col-print', { hasText: 'Sol Ring' }).locator('text=Corrigir').click();
  await page.fill('#scan-fix-input', 'Counterspel');
  await page.locator('#scan-fix-list button', { hasText: 'Counterspell' }).click();
  await page.waitForSelector('#scan-commit');
  assert.match(await page.innerText('#scan-lot-list'), /Counterspell/);
  await page.click('#scan-commit');
  await page.waitForFunction(() => /Lote: 0/.test(document.querySelector('#scan-lot').innerText));

  await page.goto(base + '#/colecao');
  await page.waitForSelector('.col-row[data-name="Island"]');
  assert.equal(await page.locator('.col-row[data-name="Island"] .col-row__n').innerText(), '2');
  assert.equal(await page.locator('.col-row[data-name="Counterspell"] .col-row__n').innerText(), '1');
  assert.deepEqual(errors, []);
});

test('e2e · X1 câmera bloqueada: explica e deixa montar o lote digitando', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(FAKE_DEVICE(true));
  await page.goto(base + '#/scanner');
  await page.waitForFunction(() => /câmera foi bloqueada/.test(document.querySelector('#scan-status').innerText));
  assert.equal(await page.locator('#scan-read').isDisabled(), true);
  await page.fill('#scan-manual', 'Countrspell');
  await page.click('[data-manual="Counterspell"]');
  await page.waitForFunction(() => /Lote: 1/.test(document.querySelector('#scan-lot').innerText));
  assert.deepEqual(errors, []);
});

test('e2e · L11 companheiro fora das 100 e condição do Lurrus', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.goto(base + '#/listas/editar');
  await page.fill('#deck-name', 'Lurrus WB');
  await page.fill('#deck-text', 'Commander\n1 Mock Commander\n\nDeck\n1 Lurrus of the Dream-Den\n99 Plains');
  await page.click('#deck-save');
  await page.waitForSelector('.deck-summary');
  assert.match(await page.innerText('main'), /101 de 100/, 'antes: Lurrus conta como carta do deck');

  await page.locator('.deck-slot[data-name="Lurrus of the Dream-Den"] .ds-card').click();
  await page.click('#deck-set-companion');
  await page.waitForFunction(() => /\+ companheiro/.test(document.querySelector('#deck-counts').innerText));
  assert.match(await page.innerText('#deck-counts'), /100 no deck/);
  const body = await page.innerText('main');
  assert.match(body, /Companheiro/);
  assert.match(body, /Lista válida para Commander/);

  // condição quebrada: permanente de valor 4 no deck
  await page.goto(base + '#/listas');
  await page.locator('#decks-list .ds-list__item').first().click();
  await page.click('text=Editar');
  await page.fill('#deck-text', 'Commander\n1 Mock Commander\n\nCompanion\n1 Lurrus of the Dream-Den\n\nDeck\n98 Plains\n1 Mock Ogre');
  await page.click('#deck-save');
  await page.waitForSelector('.deck-summary');
  assert.match(await page.innerText('main'), /Condição de Lurrus of the Dream-Den .* Mock Ogre/);
  assert.deepEqual(errors, []);
});

test('e2e · X3/X5 scanner identifica a edição e manda o lote para uma lista e para a coleção', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.goto(base + '#/listas/editar');
  await page.fill('#deck-name', 'Azul');
  await page.selectOption('#deck-format', 'livre');
  await page.fill('#deck-text', '10 Island');
  await page.click('#deck-save');
  await page.waitForSelector('.deck-summary');

  await page.addInitScript(FAKE_DEVICE(false));
  await page.goto(base + '#/scanner');
  await page.reload();
  await page.waitForSelector('#scan-read:not([disabled])');
  await page.evaluate(() => window.__ocrQueue.push('Counterspell', '267/303 U\nMH2 • EN'));
  await page.click('#scan-read');
  await page.waitForSelector('#scan-edition');
  assert.match(await page.innerText('#scan-edition'), /Edição: MH2 #267 · Modern Horizons 2/);

  await page.evaluate(() => window.__ocrQueue.push('Island', ''));
  await page.click('#scan-read');
  await page.waitForFunction(() => /não identificada/.test((document.querySelector('#scan-edition') || {}).innerText || ''));

  await page.click('#scan-lot');
  assert.match(await page.innerText('#scan-lot-list'), /MH2 #267/);
  const opts = await page.$$eval('#scan-dest option', os => os.map(o => o.textContent));
  const azul = opts.findIndex(o => /Azul/.test(o));
  await page.selectOption('#scan-dest', { index: azul });
  await page.waitForSelector('[data-also]');
  await page.click('#scan-commit');
  await page.waitForFunction(() => /Lote: 0/.test(document.querySelector('#scan-lot').innerText));

  await page.goto(base + '#/listas');
  await page.waitForSelector('#decks-list .ds-list__item');
  await page.locator('#decks-list .ds-list__item', { hasText: 'Azul' }).click();
  await page.waitForSelector('.deck-summary');
  assert.match(await page.innerText('#deck-counts'), /12 no deck/, '10 Island + 1 Island + 1 Counterspell');
  await page.goto(base + '#/colecao');
  await page.waitForSelector('.col-row[data-name="Counterspell"]');
  assert.match(await page.innerText('.col-row[data-name="Counterspell"]'), /MH2 · #267/);
  assert.deepEqual(errors, []);
});

/* ---------------- E7 · combate e mana na mesa ---------------- */
const reveal = async page => { if (await page.locator('#tb-reveal').count()) await page.click('#tb-reveal'); };
async function drawUntil(page, name, max = 25) {
  for (let i = 0; i < max && !(await page.locator(`.tb-hand .tb-card[aria-label^="${name}"]`).count()); i++) {
    await page.click('#tb-lib-me'); await page.click('.ds-dialog >> text=Comprar 1');
  }
  assert.ok(await page.locator(`.tb-hand .tb-card[aria-label^="${name}"]`).count(), `sem ${name} na mão`);
}
const handCard = (page, name) => page.locator(`.tb-hand .tb-card[aria-label^="${name}"]`).first();
async function toMyMain(page) {
  for (let i = 0; i < 12; i++) {
    await reveal(page);
    const b = await page.innerText('.tb-banner');
    if (/Principal 1/.test(b) && /Seu turno/.test(b)) return;
    if (await page.locator('#tb-no-attack').count()) { await page.click('#tb-no-attack'); continue; }
    if (await page.locator('#tb-pass-turn').count()) await page.click('#tb-pass-turn'); else await page.click('#tb-pass');
  }
  throw new Error('não chegou à principal 1');
}

test('e2e · M7/M6/A6 goldfish: mana paga sozinha, falta de mana, ataque e dano', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await createDeck(page, base, 'Peixes', '30 Island\n20 Sky Pike', 'livre');
  await page.goto(base + '#/mesa');
  await page.fill('#mesa-seed', '4');
  await page.click('#mesa-start');
  await page.waitForSelector('#tb-keep'); await page.click('#tb-keep');
  await page.waitForSelector('.tb-banner');
  await toMyMain(page);
  await drawUntil(page, 'Island'); await handCard(page, 'Island').click(); await page.click('text=Jogar terreno');
  await drawUntil(page, 'Sky Pike');
  await handCard(page, 'Sky Pike').click();
  assert.match(await page.innerText('.ds-dialog'), /mana insuficiente/, 'com um terreno só, não paga {1}{U}');
  assert.match(await page.innerText('.ds-dialog'), /Conjurar sem pagar/);
  await page.keyboard.press('Escape');

  await page.click('#tb-pass-turn');
  await toMyMain(page);
  await drawUntil(page, 'Island'); await handCard(page, 'Island').click(); await page.click('text=Jogar terreno');
  await handCard(page, 'Sky Pike').click();
  await page.click('.ds-dialog >> text=/Conjurar · \\{1\\}\\{U\\}/');
  await page.waitForSelector('.tb-side--me [data-zone="permanents"] .tb-card[aria-label*="Sky Pike"]');
  assert.equal(await page.locator('.tb-side--me [data-zone="lands"] .tb-card[data-tapped="true"]').count(), 2, 'os dois terrenos viraram para pagar');
  if (await page.locator('#tb-adj-done').count()) await page.click('#tb-adj-done');

  // próximo turno: declarar ataque com a criatura sem enjoo
  await page.click('#tb-pass-turn');
  for (let i = 0; i < 8 && !(await page.locator('#tb-attack').count()); i++) { await reveal(page); if (await page.locator('#tb-pass').count()) await page.click('#tb-pass'); }
  assert.match(await page.innerText('.tb-banner'), /Declarar atacantes/);
  await page.locator('.tb-side--me .tb-card[data-eligible="true"]').first().click();
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/atk.png' });
  await page.click('#tb-attack');
  await page.waitForFunction(() => /18/.test(document.querySelector('#tb-life-opp').innerText));
  await page.click('#tb-log');
  const log = await page.innerText('.ds-dialog');
  assert.match(log, /Você atacou com Sky Pike/);
  assert.match(log, /Goldfish: vida 20 → 18/);
  assert.match(log, /Você gerou|conjurou Sky Pike/);
  assert.deepEqual(errors, []);
});

test('e2e · A6 hot-seat: bloqueio com prévia de dano e alcance contra voar', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await createDeck(page, base, 'Mar', '30 Island\n10 Sky Pike\n10 Wall Guard', 'livre');
  await page.goto(base + '#/mesa');
  await page.click('[data-opponent="hotseat"]');
  await page.fill('#mesa-me', 'Ana'); await page.fill('#mesa-them', 'Bia');
  await page.click('[data-mana]'); // mana livre: o foco aqui é o combate
  await page.fill('#mesa-seed', '2');
  await page.click('#mesa-start');
  await page.waitForSelector('#tb-keep'); await page.click('#tb-keep');
  await reveal(page); await page.click('#tb-keep');
  const put = async name => { await drawUntil(page, name); await handCard(page, name).click(); await page.click('.ds-dialog >> text=Conjurar'); for (let i = 0; i < 4 && await page.locator('.tb-stack').count(); i++) { await reveal(page); if (await page.locator('#tb-pass').count()) await page.click('#tb-pass'); } if (await page.locator('#tb-adj-done').count()) await page.click('#tb-adj-done'); };
  await reveal(page); await toMyMain(page);
  const first = (await page.innerText('#tb-life-me')).includes('Ana') ? 'Ana' : 'Bia';
  await put(first === 'Ana' ? 'Sky Pike' : 'Wall Guard');
  await page.click('#tb-pass-turn'); await reveal(page); await toMyMain(page);
  await put(first === 'Ana' ? 'Wall Guard' : 'Sky Pike');
  // volta ao dono do Sky Pike, que ataca
  for (let i = 0; i < 16 && !(await page.locator('#tb-attack').count()); i++) {
    await reveal(page);
    if (await page.locator('#tb-no-attack').count() && !(await page.locator('.tb-side--me .tb-card[aria-label*="Sky Pike"]').count())) { await page.click('#tb-no-attack'); continue; }
    if (await page.locator('#tb-pass-turn').count()) await page.click('#tb-pass-turn'); else if (await page.locator('#tb-pass').count()) await page.click('#tb-pass');
  }
  await page.locator('.tb-side--me .tb-card[data-eligible="true"][aria-label*="Sky Pike"]').click();
  await page.click('#tb-attack');
  await page.waitForSelector('#tb-handoff');
  assert.match(await page.innerText('#tb-handoff'), /declarar bloqueadores/);
  await page.click('#tb-reveal');
  const defLife = await page.innerText('#tb-life-me');
  assert.match(await page.innerText('.tb-banner'), /Prévia: você perde 2 de vida/);
  await page.locator('.tb-side--me .tb-card[data-eligible="true"][aria-label*="Wall Guard"]').click();
  await page.click('.ds-dialog >> text=Bloquear Sky Pike');
  assert.match(await page.innerText('.tb-banner'), /Prévia: você não perde de vida/);
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/blk.png' });
  await page.click('#tb-block');
  await page.waitForSelector('#tb-reveal'); // o combate se resolve sozinho e a vez volta para o atacante
  await page.click('#tb-reveal');
  await page.click('#tb-log');
  const log = await page.innerText('.ds-dialog');
  assert.match(log, /bloqueou: Wall Guard → Sky Pike/);
  assert.doesNotMatch(log, /vida 20 → 18/);
  assert.deepEqual(errors, []);
});

test('e2e · S2/A10 cobertura do motor na lista e na preparação', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await createDeck(page, base, 'Cobertura', '2 Lightning Bolt\n1 Preordain\n1 Island', 'livre');
  await page.waitForSelector('#deck-coverage');
  assert.match(await page.innerText('#deck-coverage'), /Motor: 75% completo/);
  assert.match(await page.innerText('#deck-coverage'), /Preordain/);
  assert.equal(await page.locator('.deck-slot[data-name="Lightning Bolt"][data-coverage="completo"]').count(), 1);
  assert.equal(await page.locator('.deck-slot[data-name="Preordain"][data-coverage="manual"]').count(), 1);
  await page.goto(base + '#/mesa');
  await page.waitForSelector('#mesa-coverage .ds-text');
  assert.match(await page.innerText('#mesa-coverage'), /Motor: 75% completo/);
  assert.deepEqual(errors, []);
});

test('e2e · S4/S5 mágica com script resolve sozinha e o registro conta o efeito', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await createDeck(page, base, 'Bolts', '30 Island\n20 Lightning Bolt', 'livre');
  await page.goto(base + '#/mesa');
  await page.click('[data-mana]'); // sem cobrar mana: o foco é o script
  await page.fill('#mesa-seed', '4');
  await page.click('#mesa-start');
  await page.waitForSelector('#tb-keep'); await page.click('#tb-keep');
  await toMyMain(page);
  await drawUntil(page, 'Lightning Bolt');
  await handCard(page, 'Lightning Bolt').click();
  await page.click('.ds-dialog >> text=/Conjurar → Goldfish/');
  if (await page.locator('#tb-pass').count()) await page.click('#tb-pass'); // a mágica resolve quando todos passam
  await page.waitForFunction(() => /17/.test(document.querySelector('#tb-life-opp').innerText));
  assert.equal(await page.locator('#tb-adj').count(), 0, 'com script não há adjudicação');
  await page.click('#tb-log');
  const log = await page.innerText('.ds-dialog');
  assert.match(log, /conjurou Lightning Bolt → Goldfish/);
  assert.match(log, /Lightning Bolt causou 3 de dano a Goldfish/);
  assert.deepEqual(errors, []);
});

test('e2e · S9 motor completo: libera só com 100% de cobertura e não aceita ajuste manual', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await createDeck(page, base, 'Com Preordain', '30 Island\n10 Preordain\n10 Lightning Bolt', 'livre');
  await createDeck(page, base, 'Coberta', '30 Island\n20 Lightning Bolt', 'livre');
  await page.goto(base + '#/mesa');
  await page.waitForSelector('#mesa-mode [data-mode="full"]');
  const opts = await page.$$eval('#mesa-mine option', os => os.map(o => o.textContent));
  await page.selectOption('#mesa-mine', { index: opts.findIndex(o => /Com Preordain/.test(o)) });
  await page.waitForFunction(() => /75% completo|% completo/.test(document.querySelector('#mesa-coverage').innerText));
  assert.equal(await page.locator('#mesa-mode [data-mode="full"]').isDisabled(), true, 'lista com carta manual não libera o motor completo');

  await page.selectOption('#mesa-mine', { index: opts.findIndex(o => /Coberta/.test(o)) });
  await page.waitForFunction(() => /100% completo/.test(document.querySelector('#mesa-coverage').innerText));
  await page.click('#mesa-mode [data-mode="full"]');
  await page.fill('#mesa-seed', '4');
  await page.click('#mesa-start');
  await page.waitForSelector('#tb-keep'); await page.click('#tb-keep');
  await toMyMain(page);
  // no motor completo a carta só oferece as ações de regra
  await drawUntil(page, 'Island');
  await handCard(page, 'Island').click();
  const sheet = await page.innerText('.ds-dialog');
  assert.match(sheet, /Jogar terreno/);
  assert.doesNotMatch(sheet, /Mover para|sem pagar/, 'sem controles de adjudicação');
  await page.keyboard.press('Escape');
  await page.click('#tb-life-opp');
  assert.match(await page.innerText('.ds-toast, .ds-dialog').catch(() => ''), /motor completo|de vida/);
  assert.deepEqual(errors, []);
});
