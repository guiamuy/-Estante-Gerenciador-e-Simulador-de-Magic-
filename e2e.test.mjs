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
  card('Malcolm, Alluring Scoundrel', 'Legendary Creature — Siren Pirate', ['U']),
  // O2 · o Sol Ring tem imagem apontando para fora: o visualizador precisa cair no texto quando ela não carrega
  { ...card('Sol Ring', 'Artifact', [], 1), image_uris: { small: 'https://cards.scryfall.io/small/front/x/sol.jpg', normal: 'https://cards.scryfall.io/normal/front/x/sol.jpg', large: 'https://cards.scryfall.io/large/front/x/sol.jpg' } },
  card('Island', 'Basic Land — Island', ['U'], 0), card('Counterspell', 'Instant', ['U']),
  card('Delver of Secrets', 'Creature — Human Wizard', ['U'], 1), card('Preordain', 'Sorcery', ['U'], 1),
  card('Lurrus of the Dream-Den', 'Legendary Creature — Cat Nightmare', ['W', 'B'], 3), card('Mock Commander', 'Legendary Creature — Human', ['W', 'B'], 2),
  card('Plains', 'Basic Land — Plains', [], 0), card('Mock Ogre', 'Creature — Ogre', ['B'], 4),
  { ...card('Sky Pike', 'Creature — Fish', ['U'], 2), mana_cost: '{1}{U}', keywords: ['Flying'], power: '2', toughness: '1' },
  { ...card('Wall Guard', 'Creature — Wall', ['U'], 2), mana_cost: '{1}{U}', keywords: ['Defender', 'Reach'], power: '0', toughness: '4' },
  { ...card('Lightning Bolt', 'Instant', ['R'], 1), mana_cost: '{R}' },
  { ...card('Grizzly Bear', 'Creature — Bear', ['G'], 2), mana_cost: '{1}{G}', power: '2', toughness: '2' },
  { ...card('Mystery Ritual', 'Sorcery', ['U'], 2), oracle_text: 'Faz algo que o motor ainda não entende.' },
  { ...card('Prodigal Sorcerer', 'Creature — Human Wizard', ['U'], 3), mana_cost: '{2}{U}', power: '1', toughness: '1', oracle_text: '{T}: Prodigal Sorcerer deals 1 damage to any target.' },
  { ...card('Elvish Visionary', 'Creature — Elf Shaman', ['G'], 2), mana_cost: '{1}{G}', power: '1', toughness: '1', oracle_text: 'When Elvish Visionary enters, draw a card.' }
].map(c => [c.name.toLowerCase(), c]));

async function open(t) {
  const srv = await serve();
  const browser = await pw.chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  // recurso de rede que não carrega (imagem sem internet, host fora do alcance) é ambiente, não erro do app
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource: net::ERR_/.test(m.text())) errors.push(m.text()); });
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

test('e2e · B4 jogar contra o bot: escolher o nível e ver a jogada dele no registro', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await createDeck(page, base, 'Delver', PAUPER);
  await page.goto(base + '#/mesa');
  await page.fill('#mesa-seed', '9');
  await page.click('[data-opponent="profissional"]');
  await page.waitForSelector('#mesa-bot-deck');            // a lista do bot aparece
  await page.waitForFunction(() => { const c = document.querySelector('[data-mode="full"]'); return c && !c.disabled; }, null, { timeout: 8000 });
  await page.click('[data-mode="full"]');                  // bot só joga no motor completo
  await page.click('#mesa-start');
  await page.waitForSelector('#tb-keep');
  await page.click('#tb-keep');                            // o bot decide a mão dele sozinho
  await page.waitForSelector('#tb-pass');
  // B7 · com a prioridade na mão e no motor completo, a dica está ali
  await page.waitForSelector('#tb-dicas', { timeout: 8000 });
  await page.click('#tb-dicas');
  await page.waitForFunction(() => /O que eu poderia fazer/.test(document.body.innerText), null, { timeout: 4000 });
  await page.click('text=Fechar');
  for (let i = 0; i < 12; i++) {                           // alguns turnos correndo
    const passar = await page.$('#tb-pass');
    if (!passar) break;
    await passar.click();
    await page.waitForTimeout(60);
  }
  const registro = await page.innerText('.tb');
  assert.match(registro, /Bot profissional/, 'o nome do bot aparece na mesa');
  assert.deepEqual(errors, []);
});

test('e2e · B5 sem lista 100% coberta, os bots ficam bloqueados com o motivo', { skip }, async t => {
  const { page, errors, base } = await open(t);
  // lista com uma carta que o motor não resolve: a cobertura não fecha em 100%
  await createDeck(page, base, 'Meia-boca', '20 Island\n4 Mystery Enchantment\n4 Preordain');
  await page.goto(base + '#/mesa');
  await page.waitForSelector('#mesa-opponent-note');
  await page.waitForFunction(() => /100% coberta/.test(document.querySelector('#mesa-opponent-note')?.innerText || ''), null, { timeout: 8000 });
  assert.equal(await page.locator('[data-opponent="amador"]').isDisabled(), true, 'amador bloqueado');
  assert.equal(await page.locator('[data-opponent="profissional"]').isDisabled(), true, 'profissional bloqueado');
  assert.equal(await page.locator('[data-opponent="goldfish"]').isDisabled(), false, 'goldfish continua livre');
  assert.deepEqual(errors, []);
});

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
  if (await page.locator('#tb-pass').count()) await page.click('#tb-pass');
  // S14: o Preordain tem script e abre a escolha do scry
  await page.waitForSelector('#tb-pick-cards');
  assert.match(await page.innerText('.tb-banner'), /Scry/);
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/mesa-2.png' });
  await page.locator('#tb-pick-cards .tb-card').first().click();
  await page.click('#tb-pick-done');
  await page.waitForFunction(() => !document.querySelector('#tb-pick-cards'));

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
  // o toque duplo depende de tempo entre cliques; sob carga, tenta de novo
  for (let i = 0; i < 3 && !(await page.locator('#cards-results .own-badge').count()); i++) {
    await page.locator('#cards-results .deck-slot .ds-card').first().dblclick();
    await page.waitForTimeout(600);
  }
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

  // C10 · o CSV mora no diálogo de exportação
  await page.click('#col-export');
  await page.waitForSelector('#col-csv-export');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#col-csv-export')]);
  const csv = await (await download.createReadStream()).toArray().then(parts => Buffer.concat(parts).toString('utf8'));
  assert.match(csv, /^Count,Name,Edition,Condition,Language,Foil,Collector Number/);
  assert.match(csv, /2,Sol Ring,cmm,Near Mint,English,foil,400/);
  assert.deepEqual(errors, []);
});

// O1/O3 · portão offline: prepara com rede, corta a rede e prova que o app inteiro
// continua servindo do aparelho: listas, mesa com bot, coleção (exportar, importar),
// busca pela base local e scanner. Só o que é API externa (edição pela Scryfall,
// imagens ainda não vistas) fica de fora — e sem erro na tela.
test('e2e · O1 tudo sem internet: preparar uma vez e usar listas, mesa, bot, coleção, busca e scanner offline', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(FAKE_DEVICE(false));          // câmera e OCR falsos: o scanner não precisa do CDN
  await createDeck(page, base, 'Delver', PAUPER);
  await page.goto(base + '#/colecao');
  await page.waitForSelector('#col-import'); await page.click('#col-import');
  await page.waitForSelector('#col-import-text'); await page.fill('#col-import-text', '2 Sol Ring\n1 Grizzly Bear');
  await page.click('#col-import-check'); await page.waitForSelector('#col-import-run'); await page.click('#col-import-run');
  await page.waitForSelector('.col-row[data-name="Sol Ring"]');

  // com rede: o painel diz o que falta e "Preparar tudo" resolve
  await page.goto(base + '#/');
  await page.waitForSelector('#home-offline-prep');
  await page.click('#home-offline-prep');
  await page.waitForFunction(() => /Tudo pronto/.test((document.querySelector('#home-offline-state') || {}).innerText || ''), null, { timeout: 15000 });
  const linhas = await page.innerText('#home-offline-lines');
  assert.match(linhas, /✓ Listas: 1 de 1 prontas/); assert.match(linhas, /✓ Coleção: 2 de 2/);
  assert.match(linhas, /✓ Base de nomes/); assert.match(linhas, /✓ Leitor de texto/);
  // O3 · o painel mostra o espaço usado pelo app (gatilho G1)
  assert.match(await page.innerText('#home-offline-space'), /Espaço usado: [\d,]+ (KB|MB|GB) de [\d,]+ (KB|MB|GB)/);

  // a partir daqui, sem internet: nenhuma requisição sai do aparelho. `setOffline` derruba
  // navigator.onLine, mas as rotas falsas ainda responderiam — por isso elas passam a abortar.
  await page.route('https://api.scryfall.com/**', r => r.abort('internetdisconnected'));
  await page.route('https://**.scryfall.io/**', r => r.abort('internetdisconnected'));
  await page.context().setOffline(true);
  await page.goto(base + '#/listas'); await page.goto(base + '#/');   // sai e volta: o painel é pintado de novo
  await page.waitForFunction(() => /sem internet agora/.test((document.querySelector('#home-offline-state') || {}).innerText || ''));

  // listas: a lista abre com os dados das cartas
  await page.goto(base + '#/listas');
  await page.click('text=Delver');
  await page.waitForSelector('.deck-summary');
  assert.match(await page.innerText('body'), /Delver of Secrets/);

  // mesa: bot liberado (cobertura sai do que está guardado) e a partida roda
  await page.goto(base + '#/mesa');
  await page.fill('#mesa-seed', '9');
  await page.waitForFunction(() => { const c = document.querySelector('[data-opponent="amador"]'); return c && !c.disabled; }, null, { timeout: 8000 });
  await page.click('[data-opponent="amador"]');
  await page.waitForSelector('#mesa-bot-deck');
  await page.waitForFunction(() => { const c = document.querySelector('[data-mode="full"]'); return c && !c.disabled; }, null, { timeout: 8000 });
  await page.click('[data-mode="full"]');
  await page.click('#mesa-start');
  await page.waitForSelector('#tb-keep'); await page.click('#tb-keep');
  await page.waitForSelector('#tb-pass');
  for (let i = 0; i < 8; i++) { const p = await page.$('#tb-pass'); if (!p) break; await p.click(); await page.waitForTimeout(60); }
  assert.match(await page.innerText('.tb'), /Bot amador/, 'o bot joga sem internet');

  // coleção: exportar e importar por lista continuam funcionando (conferência pela base de nomes)
  await page.goto(base + '#/colecao');
  await page.waitForSelector('.col-row[data-name="Sol Ring"]');
  await page.click('#col-export'); await page.waitForSelector('#col-export-text');
  assert.match(await page.inputValue('#col-export-text'), /2 Sol Ring/);
  await page.click('.ds-dialog button:has-text("Fechar")');
  await page.click('#col-import'); await page.waitForSelector('#col-import-text');
  await page.fill('#col-import-text', '1 Sol Ring\n1 Counterspell');
  await page.click('#col-import-check'); await page.waitForSelector('#col-import-run');
  assert.match(await page.innerText('#col-import-summary'), /1 carta\(s\) nova\(s\) \(1 cópia\(s\)\) · 1 que você já tem/, 'a base de nomes confere sem rede');
  assert.equal(await page.locator('#col-import-problems').count(), 0, 'nada pendente');
  await page.click('#col-import-run');
  await page.waitForSelector('.col-row[data-name="Counterspell"]');

  // C12 · filtros trabalham com os dados guardados: sem rede, filtrar por tipo funciona
  await page.click('#col-filters'); await page.waitForSelector('#col-filters-body');
  await page.click('[data-tipo="Creature"]');
  await page.waitForFunction(() => /1 carta\(s\) · 1 cópia\(s\)/.test(document.querySelector('#col-filters-count').innerText));
  await page.click('#col-filters-reset');

  // busca: cai para a base local com o que já passou pelo app
  await page.goto(base + '#/cartas');
  await page.waitForSelector('#cards-q');
  await page.fill('#cards-q', 'sol'); await page.press('#cards-q', 'Enter');
  await page.waitForSelector('#cards-results .deck-slot', { timeout: 8000 });
  // a imagem do Sol Ring não carrega sem rede: o cartão mostra o nome no lugar (CardFace)
  await page.waitForFunction(() => /Sol Ring/.test(document.querySelector('#cards-results').innerText), null, { timeout: 8000 });
  assert.equal(await page.locator('#cards-results .ds-card__fallback').count(), 1, 'imagem quebrada vira nome');

  // scanner: base de nomes e leitor já no aparelho; a edição avisa que fica para depois
  await page.goto(base + '#/scanner');
  await page.waitForSelector('#scan-read:not([disabled])', { timeout: 10000 });
  await page.evaluate(() => window.__ocrQueue.push('Sol Ring', ''));
  await page.click('#scan-read');
  await page.waitForFunction(() => /Lote: 1/.test((document.querySelector('#scan-lot') || {}).innerText || ''));
  await page.waitForSelector('#scan-edition');
  assert.match(await page.innerText('#scan-edition'), /Sem internet: a cópia entra sem edição/);

  // O2 · a barra avisa, e cada tela que batia na rede tem o seu caminho sem ela
  assert.equal(await page.locator('#nav-offline').isVisible(), true, 'chip "Sem internet" na barra');
  // coleção: adicionar pelo nome confere pela base de nomes
  await page.goto(base + '#/colecao');
  await page.waitForSelector('#col-add');
  await page.fill('#col-add', 'Preordain'); await page.click('#col-add-btn');
  await page.waitForSelector('.col-row[data-name="Preordain"]');
  await page.fill('#col-add', 'Xyzzy'); await page.click('#col-add-btn');
  await page.waitForFunction(() => /Não achei "Xyzzy"/.test(document.body.innerText));
  await page.fill('#col-add', 'Counterspel'); await page.click('#col-add-btn');
  await page.waitForFunction(() => /Parecido: Counterspell/.test(document.body.innerText));
  // visualizador: imagem não guardada vira texto, não ícone quebrado
  await page.click('.col-row[data-name="Sol Ring"] .col-row__thumb');
  await page.waitForSelector('#card-viewer [data-sem-imagem]', { timeout: 8000 });
  assert.match(await page.innerText('#card-viewer'), /Imagem ainda não guardada/);
  await page.keyboard.press('Escape');
  // lista editada sem rede: carta nunca vista fica "não conferida", não "não reconhecida"
  await page.goto(base + '#/listas');
  await page.click('text=Delver');
  await page.waitForSelector('.deck-summary');
  await page.click('#deck-edit');
  await page.waitForSelector('#deck-text');
  await page.fill('#deck-text', PAUPER + '\n1 Lightning Bolt');
  await page.click('#deck-save');
  await page.waitForSelector('.deck-summary');
  const corpo = await page.innerText('body');
  assert.match(corpo, /1 carta\(s\) ainda não conferida\(s\) \(sem internet/, 'aviso, não erro');
  assert.doesNotMatch(corpo, /não reconhecida/);
  // busca: sem rede vai direto à base local, sem mensagem de falha
  await page.goto(base + '#/cartas');
  await page.waitForSelector('#cards-q');
  await page.fill('#cards-q', 'counter'); await page.press('#cards-q', 'Enter');
  await page.waitForSelector('#cards-results .deck-slot', { timeout: 8000 });
  assert.doesNotMatch(await page.innerText('#cards-status'), /Sem resposta da Scryfall|Verifique a conexão/);

  // a internet volta: o chip some
  await page.unroute('https://api.scryfall.com/**'); await page.unroute('https://**.scryfall.io/**');
  await page.context().setOffline(false);
  await page.waitForFunction(() => document.querySelector('#nav-offline').classList.contains('ds-hidden'));
  assert.deepEqual(errors, []);
});

test('e2e · C12 filtros de verdade: cor, tipo, acabamento, edição, texto, contagem viva, limpar e exportar o recorte', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.goto(base + '#/colecao');
  await page.waitForSelector('#col-csv-import');
  await page.setInputFiles('#col-csv-file', { name: 'manabox.csv', mimeType: 'text/csv', buffer: Buffer.from(MANABOX) });
  await page.waitForSelector('#col-csv-add'); await page.click('#col-csv-add');
  await page.waitForSelector('.col-row[data-name="Sol Ring"]');
  await page.click('#col-import'); await page.waitForSelector('#col-import-text');
  await page.fill('#col-import-text', '4 Grizzly Bear\n1 Preordain\n20 Island');
  await page.click('#col-import-check'); await page.waitForSelector('#col-import-run'); await page.click('#col-import-run');
  await page.waitForSelector('.col-row[data-name="Grizzly Bear"]');
  await page.waitForFunction(() => /Creature/.test(document.querySelector('.col-row[data-name="Grizzly Bear"]').innerText), null, { timeout: 8000 }); // dados das cartas chegaram

  await page.click('#col-filters');
  await page.waitForSelector('#col-filters-body');
  assert.match(await page.innerText('#col-filters-count'), /5 carta\(s\) · 28 cópia\(s\)/, 'contagem viva começa com tudo');
  await page.click('[data-cor="U"]');
  await page.waitForFunction(() => /3 carta\(s\)/.test(document.querySelector('#col-filters-count').innerText));
  await page.click('[data-tipo="Instant"]');
  await page.waitForFunction(() => /1 carta\(s\) · 1 cópia\(s\)/.test(document.querySelector('#col-filters-count').innerText));
  await page.click('[data-acabamento="foil"]');
  await page.waitForFunction(() => /0 carta\(s\)/.test(document.querySelector('#col-filters-count').innerText), null, { timeout: 4000 });
  await page.click('#col-filters-apply');
  assert.match(await page.innerText('#col-list'), /Nenhuma carta passa/);
  assert.match(await page.innerText('#col-filters'), /Filtros \(3\)/);
  assert.match(await page.innerText('#col-count-desc'), /azul · instantânea · foil/);
  await page.click('#col-filters-clear');
  await page.waitForSelector('.col-row[data-name="Island"]');
  assert.equal((await page.innerText('#col-filters')).trim(), 'Filtros');

  // texto procura no nome e no texto da carta; edição filtra as impressões
  await page.fill('#col-filter', 'scry');
  await page.waitForFunction(() => document.querySelectorAll('.col-row').length === 1);
  assert.match(await page.innerText('.col-row'), /Preordain/, 'achou pelo texto de regras');
  await page.fill('#col-filter', '');
  await page.click('#col-filters'); await page.waitForSelector('#col-filters-body');
  await page.click('[data-edicao="cmm"]');
  await page.click('#col-filters-apply');
  await page.waitForFunction(() => document.querySelectorAll('.col-row').length === 1);
  assert.match(await page.innerText('#col-count-text'), /1 carta\(s\) · 2 cópia\(s\)/);

  // o recorte do filtro exporta só o que passou
  await page.click('#col-export'); await page.waitForSelector('#col-export-text');
  await page.click('[data-escopo="filtro"]');
  const texto = await page.inputValue('#col-export-text');
  assert.match(texto, /recorte: CMM · 1 carta\(s\) · 2 cópia\(s\)/);
  assert.ok(/2 Sol Ring/.test(texto) && !/Island|Grizzly/.test(texto));
  await page.click('.ds-dialog button:has-text("Fechar")');

  // C12b · o recorte está no link, e uma visão salva o traz de volta com um toque
  assert.match(await page.evaluate(() => location.hash), /^#\/colecao\?f=e=cmm$/, 'link do recorte');
  await page.click('#col-view-save'); await page.waitForSelector('#col-view-name');
  await page.fill('#col-view-name', 'Só CMM'); await page.click('#col-view-save-confirm');
  await page.waitForSelector('#col-views [data-view]');
  assert.equal(await page.getAttribute('#col-views .ds-chip', 'aria-pressed'), 'true', 'a visão salva aparece ligada');
  await page.click('#col-filters-clear');
  await page.waitForSelector('.col-row[data-name="Island"]');
  assert.equal(await page.getAttribute('#col-views .ds-chip', 'aria-pressed'), 'false');
  await page.click('#col-views .ds-chip');
  await page.waitForFunction(() => document.querySelectorAll('.col-row').length === 1);
  assert.match(await page.innerText('.col-row'), /Sol Ring/, 'a visão aplicou o filtro');
  // abrir o link direto reaplica o recorte
  await page.goto(base + '#/listas'); await page.goto(base + '#/colecao?f=t=scry');
  await page.waitForFunction(() => document.querySelectorAll('.col-row').length === 1 && /Preordain/.test(document.querySelector('.col-row').innerText));
  assert.equal(await page.inputValue('#col-filter'), 'scry');
  // apagar a visão
  await page.click('#col-views [data-view-remove]'); await page.click('#col-view-remove-confirm');
  await page.waitForFunction(() => !document.querySelector('#col-views [data-view]'));

  // C12b · o mesmo motor na lista
  await createDeck(page, base, 'Delver', PAUPER);
  await page.fill('#deck-filter', 'counter');
  await page.waitForFunction(() => document.querySelectorAll('.deck-slot').length === 1);
  assert.match(await page.innerText('#deck-count'), /1 carta\(s\) · 4 cópia\(s\) · "counter"/);
  await page.click('#deck-filters-clear');
  await page.waitForFunction(() => document.querySelectorAll('.deck-slot').length === 4);
  await page.click('#deck-filters'); await page.waitForSelector('#col-filters-body');
  assert.equal(await page.locator('[data-edicao]').count(), 0, 'lista não tem impressões: sem seção de edição');
  await page.click('[data-tipo="Instant"]');
  await page.waitForFunction(() => /1 carta\(s\) · 4 cópia\(s\)/.test(document.querySelector('#col-filters-count').innerText));
  await page.click('#col-filters-apply');
  await page.waitForFunction(() => document.querySelectorAll('.deck-slot').length === 1);
  assert.match(await page.innerText('#deck-filters'), /Filtros \(1\)/);
  assert.deepEqual(errors, []);
});

test('e2e · C13 a coleção como coleção: galeria, densa, pilhas, agrupar, ordenar, lembrar e rolar em lotes', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.goto(base + '#/colecao');
  await page.waitForSelector('#col-csv-import');
  // 300 cartas inventadas (o CSV não confere nome) + 3 conhecidas, para agrupar e rolar em lotes
  const linhas = ['Count,Name,Edition,Condition,Language,Foil,Collector Number', '2,Sol Ring,cmm,Near Mint,English,foil,400', '4,Grizzly Bear,,,,,', '1,Counterspell,mh2,Near Mint,Portuguese,,267'];
  for (let i = 0; i < 300; i++) linhas.push(`1,Carta Inventada ${String(i).padStart(3, '0')},${i % 2 ? 'abc' : ''},Near Mint,English,,${i}`);
  await page.setInputFiles('#col-csv-file', { name: 'muitas.csv', mimeType: 'text/csv', buffer: Buffer.from(linhas.join('\n') + '\n') });
  await page.waitForSelector('#col-csv-add'); await page.click('#col-csv-add');
  await page.waitForSelector('.col-row[data-name="Carta Inventada 000"]');
  await page.waitForFunction(() => /303 carta\(s\)/.test(document.querySelector('#col-summary').innerText));

  // lista em lotes: 120 primeiro, "mostrar mais" traz o resto (as conhecidas vêm depois de "Carta Inventada…")
  assert.equal(await page.locator('.col-row').count(), 120, 'primeiro lote');
  assert.match(await page.innerText('#col-more'), /Mostrar mais \(183 restantes\)/);
  await page.click('#col-more');
  await page.waitForFunction(() => document.querySelectorAll('.col-row').length === 240);
  await page.click('#col-more');
  await page.waitForFunction(() => document.querySelectorAll('.col-row').length === 303 && !document.querySelector('#col-more'));
  await page.waitForFunction(() => /Creature/.test(document.querySelector('.col-row[data-name="Grizzly Bear"]').innerText), null, { timeout: 8000 }); // dados chegaram

  // ordenar por mais cópias: as conhecidas sobem para o primeiro lote
  await page.selectOption('#col-sort', 'qtd');
  await page.waitForFunction(() => { const r = document.querySelectorAll('.col-row'); return r.length === 120 && r[0].dataset.name === 'Grizzly Bear' && r[1].dataset.name === 'Sol Ring'; });

  // galeria: arte + quantidade; um toque abre as impressões
  await page.click('[data-visao="galeria"]');
  await page.waitForSelector('.col-card[data-name="Sol Ring"]');
  assert.match(await page.innerText('.col-card[data-name="Sol Ring"]'), /×2/);
  await page.click('.col-card[data-name="Sol Ring"] .ds-card');
  await page.waitForSelector('.ds-dialog'); assert.match(await page.innerText('.ds-dialog'), /CMM/); await page.keyboard.press('Escape');

  // densa: uma linha por carta, com tipo e edições (o filtro de texto traz a Counterspell para a tela)
  await page.click('[data-visao="densa"]');
  await page.fill('#col-filter', 'counter');
  await page.waitForSelector('.col-dense__row[data-name="Counterspell"]');
  assert.match(await page.innerText('.col-dense__row[data-name="Counterspell"]'), /Instant · MH2\s+1/);
  await page.fill('#col-filter', '');

  // agrupar por edição com cabeçalho e contagem (os lotes valem dentro dos grupos)
  await page.selectOption('#col-group', 'edicao');
  await page.waitForSelector('[data-group="cmm"]');
  for (let i = 0; i < 4 && (await page.locator('#col-more').count()); i++) { await page.click('#col-more'); await page.waitForTimeout(150); }
  assert.match(await page.innerText('[data-group="cmm"]'), /CMM\s+1 carta\(s\) · 2 cópia\(s\)/);
  assert.match(await page.innerText('[data-group="~"]'), /Sem edição\s+151 carta\(s\)/);
  assert.equal(await page.evaluate(() => document.querySelector('[data-group="~"] + .col-dense .col-dense__row').dataset.name), 'Grizzly Bear', 'dentro do grupo, mais cópias primeiro');

  // pilhas: uma por grupo; um toque abre a pilha
  await page.click('[data-visao="pilhas"]');
  await page.waitForSelector('.col-pile[data-pile="cmm"]');
  assert.match(await page.getAttribute('.col-pile[data-pile="cmm"]', 'aria-label'), /Abrir CMM: 1 carta/);
  await page.click('.col-pile[data-pile="cmm"]');
  await page.waitForSelector('.col-card[data-name="Sol Ring"]');
  assert.equal(await page.locator('.col-pile').count(), 3, 'as outras pilhas continuam fechadas');
  await page.click('[data-pile-close="cmm"]');
  await page.waitForSelector('.col-pile[data-pile="cmm"]');

  // a escolha fica lembrada ao voltar
  await page.goto(base + '#/listas'); await page.goto(base + '#/colecao');
  await page.waitForSelector('.col-pile');
  assert.equal(await page.getAttribute('[data-visao="pilhas"]', 'aria-pressed'), 'true');
  assert.equal(await page.inputValue('#col-group'), 'edicao');
  assert.equal(await page.inputValue('#col-sort'), 'qtd');
  assert.deepEqual(errors, []);
});

test('e2e · C11 importar por lista: conferir, importar, pendências com sugestão e desfazer', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(FAKE_DEVICE(true));            // sem câmera: só a base de nomes interessa
  await page.goto(base + '#/scanner');
  await page.waitForFunction(() => /Base: \d+ nomes/.test((document.querySelector('#scan-status') || {}).innerText || ''));
  await page.goto(base + '#/colecao');
  await page.waitForSelector('#col-import');
  await page.click('#col-import');
  await page.waitForSelector('#col-import-text');
  await page.fill('#col-import-text', '// minha lista\n2 Sol Ring\n1 Counterspel\n1 Grizzly Bear (M21) 999 *F*\n0 Nada\n1 Xyzzy\n');
  await page.click('#col-import-check');
  await page.waitForSelector('#col-import-run');
  assert.match(await page.innerText('#col-import-total'), /3 cópia\(s\) para importar/);
  assert.match(await page.innerText('#col-import-summary'), /2 carta\(s\) nova\(s\) \(3 cópia\(s\)\) · 0 que você já tem/);
  const problemas = await page.innerText('#col-import-problems');
  assert.match(problemas, /0 Nada[\s\S]*linha 5 · quantidade zero/);
  assert.match(problemas, /1 Counterspel[\s\S]*nome não encontrado · parecido: Counterspell/);
  assert.match(problemas, /1 Xyzzy[\s\S]*nome não encontrado/);
  await page.click('#col-import-run');
  await page.waitForSelector('.col-row[data-name="Sol Ring"]');
  assert.match(await page.innerText('.col-row[data-name="Sol Ring"] .col-row__n'), /2/);
  assert.match(await page.innerText('.col-row[data-name="Grizzly Bear"]'), /M21 · #999 · foil ×1/, 'edição e foil da linha entram na coleção');
  assert.match(await page.innerText('#col-undo'), /3 cópia\(s\) · 2 pendente\(s\)/);
  assert.match(await page.innerText('#col-pending'), /2 linha\(s\) da importação ficaram pendentes/);

  // pendências: a sugestão resolve com um toque; o resto se descarta
  await page.click('#col-pending-open');
  await page.waitForSelector('#col-pending-list');
  await page.click('[data-pending="0"] [data-sugestao="Counterspell"]');
  await page.click('[data-resolve="0"]');
  await page.waitForSelector('.col-row[data-name="Counterspell"]');
  await page.waitForFunction(() => /Pendências · 1/.test((document.querySelector('.ds-dialog') || {}).innerText || ''));
  await page.click('[data-discard="0"]');
  await page.waitForFunction(() => !document.querySelector('.ds-dialog'));
  assert.equal((await page.innerText('#col-pending')).trim(), '', 'sem pendências');

  // desfazer volta a coleção ao que era antes da importação (inclusive o que foi resolvido depois)
  await page.click('#col-undo-btn');
  await page.waitForFunction(() => /Sua coleção está vazia/.test(document.querySelector('#col-list').innerText));
  assert.equal(await page.locator('#col-undo button').count(), 0, 'a barra de desfazer some');
  // a mesma lista importada de novo soma ao que já existe
  await page.click('.ds-empty button:has-text("Importar lista"), #col-import');
  await page.waitForSelector('#col-import-text');
  await page.fill('#col-import-text', '1 Sol Ring');
  await page.click('#col-import-check'); await page.waitForSelector('#col-import-run'); await page.click('#col-import-run');
  await page.waitForSelector('.col-row[data-name="Sol Ring"]');
  await page.click('#col-import');
  await page.waitForSelector('#col-import-text');
  await page.fill('#col-import-text', '2 Sol Ring');
  await page.click('#col-import-check'); await page.waitForSelector('#col-import-run');
  assert.match(await page.innerText('#col-import-summary'), /0 carta\(s\) nova\(s\) \(0 cópia\(s\)\) · 1 que você já tem \(2 cópia\(s\) a somar\)/);
  await page.click('#col-import-run');
  await page.waitForFunction(() => /3/.test(document.querySelector('.col-row[data-name="Sol Ring"] .col-row__n').innerText));
  assert.deepEqual(errors, []);
});

test('e2e · C10 exportar a coleção por lista: formatos, seleção manual, copiar e baixar', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(base + '#/colecao');
  await page.waitForSelector('#col-csv-import');
  await page.setInputFiles('#col-csv-file', { name: 'manabox.csv', mimeType: 'text/csv', buffer: Buffer.from(MANABOX) });
  await page.waitForSelector('#col-csv-add'); await page.click('#col-csv-add');
  await page.waitForSelector('.col-row[data-name="Sol Ring"]');
  // mais uma cópia genérica de Sol Ring, para o cabeçalho ter o que declarar
  await page.click('.col-row[data-name="Sol Ring"] button[aria-label^="Uma cópia a mais"]');
  await page.waitForFunction(() => /3/.test(document.querySelector('.col-row[data-name="Sol Ring"] .col-row__n').innerText));

  await page.click('#col-export');
  await page.waitForSelector('#col-export-text');
  let texto = await page.inputValue('#col-export-text');
  assert.match(texto, /^\/\/ Estante · coleção · 2 carta\(s\) · 4 cópia\(s\)/, 'cabeçalho do formato simples');
  assert.match(texto, /\n1 Counterspell\n3 Sol Ring\n$/, 'uma linha por nome, somando as impressões');
  await page.selectOption('#col-export-format', 'completo');
  texto = await page.inputValue('#col-export-text');
  assert.match(texto, /\/\/ 1 cópia\(s\) sem edição definida saem só com o nome/);
  assert.match(texto, /2 Sol Ring \(CMM\) 400 \*F\*/, 'foil marcado');
  assert.match(texto, /\n1 Sol Ring\n/, 'a genérica sai só com o nome');
  await page.selectOption('#col-export-format', 'arena');
  texto = await page.inputValue('#col-export-text');
  assert.ok(!texto.includes('//') && /2 Sol Ring \(CMM\) 400\n/.test(texto), 'arena: sem comentários nem marca de foil');
  await page.click('#col-export-copy');
  await page.waitForFunction(() => /copiada/i.test(document.body.innerText));
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), texto, 'o que foi copiado é o que está na tela');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#col-export-download')]);
  assert.equal(download.suggestedFilename(), 'estante-colecao.txt');
  await page.click('.ds-dialog button:has-text("Fechar")');

  // seleção manual: só Counterspell
  await page.click('#col-select');
  await page.waitForSelector('#col-selection-count');
  await page.click('.col-row[data-name="Counterspell"] .col-row__check');
  assert.match(await page.innerText('#col-selection-count'), /1 carta\(s\) selecionada/);
  assert.equal(await page.getAttribute('.col-row[data-name="Counterspell"] .col-row__check', 'aria-checked'), 'true');
  await page.click('#col-export-selection');
  await page.waitForSelector('#col-export-text');
  await page.selectOption('#col-export-format', 'simples');
  texto = await page.inputValue('#col-export-text');
  assert.match(texto, /seleção da coleção · 1 carta\(s\) · 1 cópia\(s\)/);
  assert.ok(texto.includes('1 Counterspell') && !texto.includes('Sol Ring'), 'só a seleção');
  // e dá para trocar para a coleção inteira sem sair do diálogo
  await page.click('[data-escopo="tudo"]');
  assert.match(await page.inputValue('#col-export-text'), /Sol Ring/);
  await page.click('.ds-dialog button:has-text("Fechar")');
  await page.click('#col-select-off');
  assert.equal(await page.locator('.col-row__check').count(), 0, 'sair da seleção esconde as caixas');
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

// X7 · câmera falsa que mostra uma carta de verdade no quadro: fundo escuro e um
// retângulo claro com textura, na proporção da carta.
const FAKE_CARD_CAM = `
  window.__ocrQueue = [];
  window.Tesseract = { createWorker: async () => ({ setParameters: async () => {}, terminate: async () => {},
    recognize: async () => ({ data: { text: window.__ocrQueue.length ? window.__ocrQueue.shift() : '' } }) }) };
  const gum = async () => {
    const c = document.createElement('canvas'); c.width = 640; c.height = 480;
    const g = c.getContext('2d');
    const pinta = () => {
      g.fillStyle = '#101010'; g.fillRect(0, 0, 640, 480);
      const x = 220, y = 90, w = 200, h = 280;
      g.fillStyle = '#d8d8d8'; g.fillRect(x, y, w, h);
      g.fillStyle = '#707070';
      for (let i = 0; i < 40; i++) g.fillRect(x + 8 + (i * 13) % (w - 20), y + 10 + (i * 29) % (h - 24), 8, 6);
    };
    pinta(); setInterval(pinta, 100);
    return c.captureStream(10);
  };
  if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = gum;
  else Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: gum } });
`;

test('e2e · X7 scanner acha a carta sozinho, sem moldura, e dispara a leitura', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(FAKE_CARD_CAM);
  await page.goto(base + '#/scanner');
  await page.waitForSelector('#scan-read:not([disabled])');
  // a moldura começa escondida: ela virou ajuda opcional
  assert.equal(await page.locator('.scan-frame').isVisible(), false, 'sem moldura obrigatória');
  await page.click('[data-edition]');                     // este teste é só do nome
  await page.evaluate(() => window.__ocrQueue.push('Sol Ring', 'Sol Ring', 'Sol Ring'));
  await page.click('[data-auto]');
  // o contorno aparece em cima da carta encontrada
  await page.waitForFunction(() => {
    const el = document.querySelector('#scan-outline');
    return el && el.style.display === 'block' && parseFloat(el.style.width) > 20;
  }, null, { timeout: 12000 });
  // e a leitura acontece sozinha, sem ninguém tocar em "Ler agora"
  await page.waitForFunction(() => /Sol Ring/.test(document.querySelector('#scan-result').innerText), null, { timeout: 12000 });
  await page.waitForFunction(() => /Lote: [1-9]/.test((document.querySelector('#scan-lot') || {}).innerText || ''), null, { timeout: 12000 });
  await page.click('[data-auto]');
  // X8 · a pilha aparece na própria tela, com a carta lida e a confiança
  await page.waitForSelector('#scan-pile .scan-pile__card');
  const cartao = page.locator('#scan-pile .scan-pile__card').first();
  assert.match(await cartao.innerText(), /Sol Ring/, 'a carta lida está na pilha');
  assert.match(await cartao.innerText(), /\d+%/, 'com a confiança da leitura');
  assert.match(await page.innerText('#scan-pile'), /Na pilha: \d+ carta/, 'e o total');
  // dá para ajustar a quantidade e tirar da pilha sem sair da câmera
  await cartao.locator('button', { hasText: '+' }).first().click();
  await page.waitForFunction(() => /Na pilha: 2 carta/.test(document.querySelector('#scan-pile').innerText));
  await cartao.locator('button', { hasText: '×' }).first().click();
  await page.waitForFunction(() => !document.querySelector('#scan-pile .scan-pile__card'), null, { timeout: 4000 });
  // a moldura volta quando o usuário quer
  await page.click('[data-moldura]');
  assert.equal(await page.locator('.scan-frame').isVisible(), true, 'a moldura é opcional, não proibida');
  assert.deepEqual(errors, []);
});

test('e2e · X9 leitura de confiança média fica "confira" e se resolve com um toque', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(FAKE_DEVICE(false));
  await page.goto(base + '#/scanner');
  await page.waitForSelector('#scan-read:not([disabled])');
  await page.click('[data-edition]');
  // 87% de confiança: entra na pilha, mas marcada
  await page.evaluate(() => window.__ocrQueue.push('S0l Rinq @®'));
  await page.click('#scan-read');
  await page.waitForSelector('#scan-pile [data-conferir]');
  const cartao = page.locator('#scan-pile .scan-pile__card').first();
  assert.match(await cartao.innerText(), /Confira/, 'a pilha avisa que a leitura precisa de conferência');
  // o lote também avisa e o botão principal não esconde o que falta conferir
  await page.click('#scan-pile-commit');
  await page.waitForSelector('#scan-lot-aviso');
  assert.match(await page.innerText('#scan-lot-aviso'), /1 leitura\(s\) ainda não conferida/);
  assert.match(await page.innerText('#scan-commit'), /\(1 a conferir\)/);
  assert.equal(await page.locator('#scan-lot-list [data-conferir]').count(), 1);
  await page.click('.ds-dialog button:has-text("Fechar")');
  // "É essa" confirma na hora: marca some da pilha e do lote
  await page.click('#scan-pile [data-confirm]');
  await page.waitForFunction(() => !document.querySelector('#scan-pile [data-conferir]'));
  assert.doesNotMatch(await page.innerText('#scan-pile'), /Confira/);
  await page.click('#scan-pile-commit');
  await page.waitForSelector('#scan-commit');
  assert.equal(await page.locator('#scan-lot-aviso').count(), 0, 'sem aviso quando tudo está conferido');
  assert.doesNotMatch(await page.innerText('#scan-commit'), /a conferir/);
  await page.click('.ds-dialog button:has-text("Fechar")');
  // leitura de confiança alta entra confirmada de cara
  await page.evaluate(() => window.__ocrQueue.push('Grizzly Bear'));
  await page.click('#scan-read');
  await page.waitForFunction(() => /Grizzly Bear/.test(document.querySelector('#scan-pile').innerText));
  assert.equal(await page.locator('#scan-pile [data-conferir]').count(), 0, '100% não pede conferência');
  // e a segunda leitura média resolve pelo caminho "Corrigir", voltando para a pilha
  await page.evaluate(() => window.__ocrQueue.push('Sol Rimg'));
  await page.click('#scan-read');
  await page.waitForSelector('#scan-pile [data-conferir]');
  await page.click('#scan-pile [data-fix]');
  await page.waitForSelector('#scan-fix-input');
  await page.fill('#scan-fix-input', 'Sol Ring');
  await page.click('#scan-fix-list button:has-text("Sol Ring")');
  await page.waitForFunction(() => !document.querySelector('.ds-dialog') && !document.querySelector('#scan-pile [data-conferir]'));
  assert.deepEqual(errors, []);
});

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
  await page.waitForFunction(() => { const el = document.querySelector('#scan-lot'); return el && /Lote: 1/.test(el.innerText); });

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
  await page.waitForFunction(() => { const el = document.querySelector('#scan-status'); return el && /câmera foi bloqueada/.test(el.innerText); });
  assert.equal(await page.locator('#scan-read').isDisabled(), true);
  await page.fill('#scan-manual', 'Countrspell');
  await page.click('[data-manual="Counterspell"]');
  await page.waitForFunction(() => { const el = document.querySelector('#scan-lot'); return el && /Lote: 1/.test(el.innerText); });
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
  await createDeck(page, base, 'Cobertura', '2 Lightning Bolt\n1 Mystery Ritual\n1 Island', 'livre');
  await page.waitForSelector('#deck-coverage');
  assert.match(await page.innerText('#deck-coverage'), /Motor: 75% completo/);
  assert.match(await page.innerText('#deck-coverage'), /Mystery Ritual/);
  assert.equal(await page.locator('.deck-slot[data-name="Lightning Bolt"][data-coverage="completo"]').count(), 1);
  assert.equal(await page.locator('.deck-slot[data-name="Mystery Ritual"][data-coverage="manual"]').count(), 1);
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
  await createDeck(page, base, 'Com carta manual', '30 Island\n10 Mystery Ritual\n10 Lightning Bolt', 'livre');
  await createDeck(page, base, 'Coberta', '30 Island\n20 Lightning Bolt', 'livre');
  await page.goto(base + '#/mesa');
  await page.waitForSelector('#mesa-mode [data-mode="full"]');
  const opts = await page.$$eval('#mesa-mine option', os => os.map(o => o.textContent));
  await page.selectOption('#mesa-mine', { index: opts.findIndex(o => /Com carta manual/.test(o)) });
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

test('e2e · M9 gatilho de entrada e habilidade ativada na mesa', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await createDeck(page, base, 'Magos', '20 Island\n10 Prodigal Sorcerer\n10 Elvish Visionary', 'livre');
  await page.waitForSelector('#deck-coverage');
  assert.match(await page.innerText('#deck-coverage'), /100% completo/, 'cartas com habilidade agora contam como cobertas');
  await page.goto(base + '#/mesa');
  await page.click('[data-mana]'); // mana livre: o foco é a habilidade
  await page.fill('#mesa-seed', '4');
  await page.click('#mesa-start');
  await page.waitForSelector('#tb-keep'); await page.click('#tb-keep');
  await toMyMain(page);

  // gatilho de entrada: a criatura entra e o gatilho compra
  await drawUntil(page, 'Elvish Visionary');
  const hand = await page.locator('.tb-hand .tb-card').count();
  await handCard(page, 'Elvish Visionary').click();
  await page.click('.ds-dialog >> text=Conjurar');
  for (let i = 0; i < 4 && await page.locator('#tb-pass').count(); i++) {
    if (await page.locator('.tb-side--me [data-zone="permanents"] .tb-card').count() && !(await page.locator('.tb-stack').count())) break;
    await page.click('#tb-pass');
  }
  await page.waitForFunction(n => document.querySelectorAll('.tb-hand .tb-card').length === n, hand, { timeout: 8000 });
  await page.click('#tb-log');
  assert.match(await page.innerText('.ds-dialog'), /Gatilho de Elvish Visionary/);
  await page.keyboard.press('Escape');

  // habilidade ativada: sem enjoo só no turno seguinte
  await drawUntil(page, 'Prodigal Sorcerer');
  await handCard(page, 'Prodigal Sorcerer').click();
  await page.click('.ds-dialog >> text=Conjurar');
  for (let i = 0; i < 4 && await page.locator('.tb-stack').count(); i++) await page.click('#tb-pass');
  await page.click('#tb-pass-turn');
  await toMyMain(page);
  await page.locator('.tb-side--me .tb-card[aria-label^="Prodigal Sorcerer"]').click();
  await page.click('.ds-dialog >> text=/Ativar \\({T}\\) → Goldfish/');
  if (await page.locator('#tb-pass').count()) await page.click('#tb-pass');
  await page.waitForFunction(() => /19/.test(document.querySelector('#tb-life-opp').innerText));
  assert.deepEqual(errors, []);
});

test('e2e · A12 listas prontas: filtrar, adicionar e escolher o modo na tela de jogar', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.goto(base + '#/listas');
  await page.click('#decks-starter-empty'); // o estado vazio leva às listas prontas
  await page.waitForSelector('#starter-list');
  await page.click('[data-starter-format="commander"]');
  assert.equal(await page.locator('#starter-list .ds-list__item').count(), 2, 'duas listas de Commander');
  await page.click('[data-starter-format="pauper"]');
  assert.equal(await page.locator('#starter-list .ds-list__item').count(), 7, 'sete listas de Pauper');

  await page.click('[data-starter-add="Pauper Elves"]');
  await page.waitForSelector('text=já na sua estante');
  assert.equal(await page.locator('[data-starter-add="Pauper Elves"]').count(), 0, 'não oferece adicionar de novo');

  await page.click('#starter-back');
  await page.waitForSelector('#decks-list');
  const listas = await page.innerText('#decks-list');
  assert.match(listas, /Pauper Elves/);
  assert.match(listas, /Pauper/);

  await page.goto(base + '#/mesa');
  await page.waitForSelector('#mesa-format');
  assert.match(await page.innerText('#mesa-format'), /Pauper/, 'o modo Pauper aparece na tela de jogar');
  await page.click('[data-table-format="pauper"]');
  await page.waitForSelector('#mesa-mine');
  assert.match(await page.innerText('#mesa-mine'), /Pauper Elves/, 'a lista do modo escolhido é selecionável');

  // S58 · lista pronta com todas as cartas escritas: 100% e motor completo liberado
  // mesmo sem a Scryfall responder (aqui ela não conhece nenhuma dessas cartas).
  // Antes desta leva os terrenos básicos entravam como "carta desconhecida" e a
  // mesma lista aparecia com 85%, trancando o modo motor completo.
  await page.goto(base + '#/listas/prontas');
  await page.waitForSelector('#starter-list');
  await page.click('[data-starter-format="pauper"]');
  await page.click('[data-starter-add="Pauper Boros Bully"]');
  await page.waitForFunction(() => !document.querySelector('[data-starter-add="Pauper Boros Bully"]'), null, { timeout: 8000 });
  await page.goto(base + '#/mesa');
  await page.click('[data-table-format="pauper"]');
  await page.waitForSelector('#mesa-mine');
  const opt = await page.locator('#mesa-mine option').evaluateAll(os => os.map(o => ({ v: o.value, t: o.textContent })));
  const boros = opt.find(o => /Boros Bully/.test(o.t));
  assert.ok(boros, 'a lista adicionada aparece na tela de jogar: ' + JSON.stringify(opt));
  await page.selectOption('#mesa-mine', boros.v);
  await page.waitForFunction(() => /100% completo/.test(document.querySelector('#mesa-coverage')?.innerText || ''), null, { timeout: 8000 });
  assert.match(await page.innerText('#mesa-engine-version'), /motor v\d+/, 'a tela mostra a versão do motor');
  assert.equal(await page.locator('[data-mode="full"]').isDisabled(), false, 'motor completo liberado');

  // S64 · aqui a Scryfall falsa não conhece as cartas desta lista: só os básicos embutidos
  // ficam guardados (sozinhos, pelo guardião offline da leva 70 — antes começava em "0 de N"),
  // a tela diz quantos faltam e o botão continua lá para tentar de novo quando a rede souber
  await page.waitForSelector('#mesa-offline-falta');
  const falta = await page.innerText('#mesa-offline-falta');
  const m = falta.match(/(\d+) de (\d+) cartas guardadas/);
  assert.ok(m && Number(m[1]) < Number(m[2]), 'lista parcialmente guardada: ' + falta);
  await page.click('#mesa-offline-pin');
  await page.waitForFunction(() => /\d+ de \d+ cartas guardadas/.test((document.querySelector('#mesa-offline-falta') || {}).innerText || ''), null, { timeout: 10000 });
  assert.equal(await page.locator('#mesa-offline-ok').count(), 0, 'tentar de novo sem a rede saber não inventa carta');
  assert.deepEqual(errors, []);
});
