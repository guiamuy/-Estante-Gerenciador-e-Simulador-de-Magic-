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
  // U12 · o Delver tem imagem (pequena e grande): o guardião precisa baixá-las com rede e contá-las no painel
  { ...card('Delver of Secrets', 'Creature — Human Wizard', ['U'], 1), image_uris: { small: 'https://cards.scryfall.io/small/front/x/delver.png', normal: 'https://cards.scryfall.io/normal/front/x/delver.png' } },
  card('Preordain', 'Sorcery', ['U'], 1),
  card('Lurrus of the Dream-Den', 'Legendary Creature — Cat Nightmare', ['W', 'B'], 3), card('Mock Commander', 'Legendary Creature — Human', ['W', 'B'], 2),
  card('Plains', 'Basic Land — Plains', [], 0), card('Mock Ogre', 'Creature — Ogre', ['B'], 4),
  { ...card('Sky Pike', 'Creature — Fish', ['U'], 2), mana_cost: '{1}{U}', keywords: ['Flying'], power: '2', toughness: '1' },
  { ...card('Wall Guard', 'Creature — Wall', ['U'], 2), mana_cost: '{1}{U}', keywords: ['Defender', 'Reach'], power: '0', toughness: '4' },
  { ...card('Lightning Bolt', 'Instant', ['R'], 1), mana_cost: '{R}' },
  { ...card('Grizzly Bear', 'Creature — Bear', ['G'], 2), mana_cost: '{1}{G}', power: '2', toughness: '2' },
  { ...card('Mystery Ritual', 'Sorcery', ['U'], 2), oracle_text: 'Faz algo que o motor ainda não entende.' },
  { ...card('Prodigal Sorcerer', 'Creature — Human Wizard', ['U'], 3), mana_cost: '{2}{U}', power: '1', toughness: '1', oracle_text: '{T}: Prodigal Sorcerer deals 1 damage to any target.' },
  { ...card('Elvish Visionary', 'Creature — Elf Shaman', ['G'], 2), mana_cost: '{1}{G}', power: '1', toughness: '1', oracle_text: 'When Elvish Visionary enters, draw a card.' },
  // E50 P3 · carta que cria ficha, e a ficha como a Scryfall a guarda (tipo "Token", com imagem)
  { ...card('Thraben Inspector', 'Creature — Human Soldier', ['W'], 1), mana_cost: '{W}', power: '1', toughness: '2', oracle_text: 'When Thraben Inspector enters, investigate.' },
  // Leva 104 · textos oficiais conferidos em 30/09/2026 (Jaspera: playgroup.gg e EchoMTG; Hydra: Scryfall MH3 164)
  { ...card('Jaspera Sentinel', 'Creature — Elf Rogue', ['G'], 1), mana_cost: '{G}', keywords: ['Reach'], power: '1', toughness: '2', oracle_text: 'Reach\n{T}, Tap an untapped creature you control: Add one mana of any color.' },
  { ...card('Nyxborn Hydra', 'Enchantment Creature — Hydra', ['G'], 1), mana_cost: '{X}{G}', keywords: ['Bestow', 'Reach', 'Trample'], power: '0', toughness: '0',
    oracle_text: "Bestow {X}{G}{G} (If you cast this card for its bestow cost, it's an Aura spell with enchant creature. It becomes a creature again if it's not attached.)\nReach, trample\nNyxborn Hydra enters with X +1/+1 counters on it.\nEnchanted creature gets +1/+1 for each +1/+1 counter on Nyxborn Hydra and has reach and trample." },
  card('Forest', 'Basic Land — Forest', [], 0),
  // Leva 107 · texto oficial conferido em 30/09/2026 (Scryfall/.listas/oficiais.json)
  { ...card('Duress', 'Sorcery', ['B'], 1), mana_cost: '{B}', oracle_text: 'Target opponent reveals their hand. You choose a noncreature, nonland card from it. That player discards that card.' },
  { ...card('Clue', 'Token Artifact — Clue', [], 0), id: 'tok-clue', oracle_text: '{2}, Sacrifice this artifact: Draw a card.', image_uris: { small: 'https://cards.scryfall.io/small/front/x/clue.png', normal: 'https://cards.scryfall.io/normal/front/x/clue.png' } }
].map(c => [c.name.toLowerCase(), c]));

async function open(t) {
  const srv = await serve();
  const browser = await pw.chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
  // capturas de tela nas outras medidas e no tema escuro (ROADMAP §4): SHOT_W=360 SHOT_TEMA=dark
  const ctx = await browser.newContext({ viewport: { width: +(process.env.SHOT_W || 390), height: process.env.SHOT_W === '360' ? 780 : 844 }, serviceWorkers: 'block',
    ...(process.env.SHOT_TEMA ? { colorScheme: process.env.SHOT_TEMA } : {}) });
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
      // E50 P3 · busca de ficha: !"nome" t:token (com pow/tou) devolve só cartas de tipo Token
      const ficha = q.match(/^!"(.+)" t:token/);
      if (ficha) return r.fulfill({ json: { object: 'list', data: Object.values(DB).filter(c => c.name.toLowerCase() === ficha[1] && /token/i.test(c.type_line)), has_more: false } });
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

  // U2 (leva 93) · o chip virou "Marcar as minhas" (≤ 3 palavras); o teste passa a usar o id
  await page.click('#deck-mark');
  await page.locator('.deck-slot').first().click();
  await page.waitForFunction(() => document.querySelector('.deck-summary').innerText.includes('1/34'));

  await page.click('#deck-mark');
  await page.click('#deck-export');
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

test('e2e · B4/U10 jogar contra o Shark: três oponentes, um bot só, e a jogada dele no registro', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await createDeck(page, base, 'Delver', PAUPER);
  await page.goto(base + '#/mesa');
  await page.fill('#mesa-seed', '9');
  // U10 · Goldfish, Shark e outra pessoa; o amador não aparece mais
  await page.waitForSelector('[data-opponent="shark"]');
  assert.deepEqual(await page.locator('[data-opponent]').evaluateAll(cs => cs.map(c => c.dataset.opponent)), ['goldfish', 'shark', 'hotseat']);
  assert.doesNotMatch(await page.innerText('body'), /amador|profissional/i, 'nenhum nível antigo na tela');
  await page.waitForFunction(() => { const c = document.querySelector('[data-opponent="shark"]'); return c && !c.disabled; }, null, { timeout: 8000 });
  await page.click('[data-opponent="shark"]');
  await page.waitForSelector('#mesa-bot-deck');            // a lista do bot aparece
  await page.waitForFunction(() => { const c = document.querySelector('[data-mode="full"]'); return c && !c.disabled; }, null, { timeout: 8000 });
  await page.click('[data-mode="full"]');                  // bot só joga no motor completo
  await page.click('#mesa-start');
  await page.waitForSelector('#tb-keep');
  await page.click('#tb-keep');                            // o bot decide a mão dele sozinho
  await page.waitForSelector('#tb-pass');
  // U6b · "O que eu poderia fazer?" saiu da bandeja a pedido do usuário (espaço para a mesa)
  assert.equal(await page.locator('#tb-dicas').count(), 0);
  assert.doesNotMatch(await page.innerText('.tb-dock'), /O que eu poderia fazer/);
  for (let i = 0; i < 12; i++) {                           // alguns turnos correndo
    const passar = await page.$('#tb-pass');
    if (!passar) break;
    await passar.click();
    await page.waitForTimeout(60);
  }
  const registro = await page.innerText('.tb');
  assert.match(registro, /Shark/, 'o nome do bot aparece na mesa');
  assert.doesNotMatch(registro, /Bot profissional|Bot amador/);
  assert.deepEqual(errors, []);
});

test('e2e · B5 sem lista 100% coberta, o Shark fica bloqueado com o motivo', { skip }, async t => {
  const { page, errors, base } = await open(t);
  // lista com uma carta que o motor não resolve: a cobertura não fecha em 100%
  await createDeck(page, base, 'Meia-boca', '20 Island\n4 Mystery Enchantment\n4 Preordain');
  await page.goto(base + '#/mesa');
  await page.waitForSelector('#mesa-opponent-note');
  await page.waitForFunction(() => /100% coberta/.test(document.querySelector('#mesa-opponent-note')?.innerText || ''), null, { timeout: 8000 });
  assert.equal(await page.locator('[data-opponent="shark"]').isDisabled(), true, 'Shark bloqueado');
  assert.match(await page.innerText('#mesa-opponent-note'), /O Shark joga só com lista 100% coberta/);
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
test('e2e · U1 tema em dois estados: um toque alterna, a escolha sobrevive à recarga, "auto" antigo migra', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.goto(base + '#/'); await page.waitForSelector('#theme-toggle');
  const tema = () => page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  const inicial = await tema();
  assert.ok(['dark', 'light'].includes(inicial), 'nunca fica sem tema definido');
  // o ícone nasce certo, antes de qualquer toque (antes nascia ☾ mesmo no tema claro)
  // U2 · expectativa mudou: agora são dois SVGs no botão e só o do tema atual aparece
  const iconeVisivel = () => page.$$eval('#theme-toggle .ds-icon', els => els.filter(e => getComputedStyle(e).display !== 'none').map(e => e.dataset.icone));
  assert.deepEqual(await iconeVisivel(), [inicial === 'light' ? 'sol' : 'lua']);
  assert.equal((await page.innerText('#theme-toggle')).trim(), '', 'sem caractere de emoji no botão');
  await page.click('#theme-toggle');
  await page.waitForFunction(t0 => document.documentElement.getAttribute('data-theme') !== t0, inicial);
  const depois = await tema();
  assert.notEqual(depois, inicial);
  assert.match(await page.getAttribute('#theme-toggle', 'aria-label'), depois === 'light' ? /claro · toque para o escuro/ : /escuro · toque para o claro/);
  await page.reload(); await page.waitForSelector('#theme-toggle');
  assert.equal(await tema(), depois, 'a escolha ficou guardada');
  assert.deepEqual(await iconeVisivel(), [depois === 'light' ? 'sol' : 'lua'], 'ícone certo depois de recarregar');
  await page.click('#theme-toggle');
  await page.waitForFunction(t0 => document.documentElement.getAttribute('data-theme') === t0, inicial);
  // versão antiga guardou "auto": abre no tema do sistema, sem estado morto
  await page.evaluate(() => new Promise((res, rej) => {
    const r = indexedDB.open('mtg', 1);
    r.onsuccess = () => { const t = r.result.transaction('kv', 'readwrite'); t.objectStore('kv').put('auto', 'ui.theme'); t.oncomplete = res; t.onerror = rej; };
    r.onerror = rej;
  }));
  await page.reload(); await page.waitForSelector('#theme-toggle');
  assert.ok(['dark', 'light'].includes(await tema()));
  assert.deepEqual(errors, []);
});

test('e2e · U12 imagens do jogo baixam sozinhas: ao salvar a lista e quando a internet volta, sem tocar em nada', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  let cdnNoAr = true;
  await page.route('https://**.scryfall.io/**', r => cdnNoAr ? r.fulfill({ status: 200, contentType: 'image/png', body: PNG, headers: { 'access-control-allow-origin': '*' } }) : r.abort('internetdisconnected'));
  const temNoCache = () => page.evaluate(async () => { const c = await caches.open('estante-img-v1'); return !!(await c.match('https://cards.scryfall.io/small/front/x/delver.png')); });
  await createDeck(page, base, 'Delver', '4 Delver of Secrets\n16 Island');
  let salvou = false;
  for (let i = 0; i < 50 && !salvou; i++) { salvou = await temNoCache(); if (!salvou) await page.waitForTimeout(200); }
  assert.equal(salvou, true, 'salvar a lista já baixou a imagem pequena');
  // o navegador limpou as imagens e a internet caiu: nada é tentado
  await page.evaluate(() => caches.delete('estante-img-v1'));
  cdnNoAr = false;
  await page.context().setOffline(true);
  await page.waitForTimeout(300);
  assert.equal(await temNoCache(), false);
  // a internet volta: o app baixa sozinho o que faltava
  cdnNoAr = true;
  await page.context().setOffline(false);
  let voltou = false;
  for (let i = 0; i < 50 && !voltou; i++) { voltou = await temNoCache(); if (!voltou) await page.waitForTimeout(200); }
  assert.equal(voltou, true, 'a internet voltou: o app baixou sozinho');
  // e o painel conta
  await page.goto(base + '#/');
  await page.waitForFunction(() => /Imagens do jogo\s+2 de 2/.test((document.querySelector('#home-offline-lines') || {}).innerText || ''), null, { timeout: 8000 });
  // Q10 · começar uma partida também guarda as imagens das listas em jogo (o cache tinha sido apagado)
  await page.evaluate(() => caches.delete('estante-img-v1'));
  await page.goto(base + '#/mesa'); await page.waitForSelector('#mesa-start');
  await page.fill('#mesa-seed', '3'); await page.click('#mesa-start');
  await page.waitForSelector('#tb-keep');
  let guardou = false;
  for (let i = 0; i < 40 && !guardou; i++) { guardou = await temNoCache(); if (!guardou) await page.waitForTimeout(200); }
  assert.equal(guardou, true, 'iniciar a partida aqueceu a imagem pequena da lista (e no cache de verdade, não num cache fantasma apagado pelo navegador)');
  assert.deepEqual(errors, []);
});

test('e2e · O1 tudo sem internet: preparar uma vez e usar listas, mesa, bot, coleção, busca e scanner offline', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(FAKE_DEVICE(false));          // câmera e OCR falsos: o scanner não precisa do CDN
  await page.addInitScript(() => { window.__MTG_TEST = true; }); // E36 · passo do Commander usa o acesso de teste da mesa
  await createDeck(page, base, 'Delver', PAUPER);
  await createDeck(page, base, 'Cmd', 'Commander\n1 Mock Commander\n\nDeck\n99 Plains', 'commander');
  await page.goto(base + '#/colecao');
  await page.waitForSelector('#col-import'); await page.click('#col-import');
  await page.waitForSelector('#col-import-text'); await page.fill('#col-import-text', '2 Sol Ring\n1 Grizzly Bear');
  await page.click('#col-import-check'); await page.waitForSelector('#col-import-run'); await page.click('#col-import-run');
  await page.waitForSelector('.col-row[data-name="Sol Ring"]');

  // U12 · o CDN de imagens responde com um PNG mínimo enquanto há rede
  const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  const pedidasAoCdn = [];
  await page.route('https://**.scryfall.io/**', r => { pedidasAoCdn.push(r.request().url()); return r.fulfill({ status: 200, contentType: 'image/png', body: PNG, headers: { 'access-control-allow-origin': '*' } }); });
  // com rede: o painel diz o que falta e "Preparar tudo" resolve
  await page.goto(base + '#/');
  await page.waitForSelector('#home-offline-prep');
  await page.click('#home-offline-prep');
  await page.waitForFunction(() => /Tudo pronto/.test((document.querySelector('#home-offline-state') || {}).innerText || ''), null, { timeout: 15000 });
  // U4 (leva 97) · expectativa mudou: o "✓ Listas: …" em texto virou uma linha por item com ícone e estado desenhado;
  // o teste lê o estado de cada linha (data-estado) e o texto dela
  const linhas = await page.innerText('#home-offline-lines');
  const estados = await page.$$eval('#home-offline-lines [data-item]', ls => Object.fromEntries(ls.map(l => [l.dataset.item, l.dataset.estado])));
  assert.deepEqual(estados, { listas: 'pronto', colecao: 'pronto', nomes: 'pronto', leitor: 'pronto', imagens: 'pronto' });
  assert.match(linhas, /Listas\s+2 de 2 prontas/); // E36: a lista de Commander também
  assert.match(linhas, /Coleção\s+2 de 2/);           // Q10 · esta asserção tinha virado comentário
  assert.match(linhas, /Base de nomes/); assert.match(linhas, /Leitor de texto/);
  // U12 · imagens do jogo: a pequena do Delver (a do campo da mesa) está no aparelho, e a grande também
  assert.match(linhas, /Imagens do jogo\s+2 de 2/); // Q10 · pequena e grande do Delver
  // U4 · o anel fecha em 100% e fica verde; cada estado tem nome falado
  assert.equal(await page.getAttribute('#home-offline-ring', 'data-pct'), '100');
  assert.match(await page.getAttribute('#home-offline-ring', 'aria-label'), /100% guardado/);
  assert.equal(await page.locator('#home-offline-lines [data-item="listas"] .ds-offline__estado').getAttribute('aria-label'), 'pronto');
  const noCache = await page.evaluate(async () => { const c = await caches.open('estante-img-v1'); return [!!(await c.match('https://cards.scryfall.io/small/front/x/delver.png')), !!(await c.match('https://cards.scryfall.io/normal/front/x/delver.png'))]; });
  assert.deepEqual(noCache, [true, true], 'pequena e grande no cache de imagens');
  // Q10 · a ordem "pequena primeiro" é do guardião e está no teste de unidade; aqui a tela da lista também pede a grande ao abrir
  assert.ok(pedidasAoCdn.includes('https://cards.scryfall.io/small/front/x/delver.png') && pedidasAoCdn.includes('https://cards.scryfall.io/normal/front/x/delver.png'), 'as duas foram pedidas ao CDN');
  // Q10 · o navegador apagou o cache do leitor: o painel diz, e ao voltar para a tela inicial com rede o app baixa de novo sozinho
  await page.evaluate(() => caches.delete('estante-ocr-v1'));
  await page.reload(); await page.waitForSelector('#home-offline-lines');
  await page.waitForFunction(() => (document.querySelector('#home-offline-lines [data-item="leitor"]') || {}).dataset?.estado === 'falta', null, { timeout: 8000 });
  assert.ok(Number(await page.getAttribute('#home-offline-ring', 'data-pct')) < 100, 'anel abaixo de 100 com o leitor faltando');
  // a manutenção silenciosa roda 4 s depois de abrir o app; ao voltar à tela inicial, o painel já diz ✓
  // (waitForFunction não espera função assíncrona: o laço abaixo consulta o cache pelo Node)
  for (let i = 0; i < 40; i++) { if (await page.evaluate(async () => { try { return (await (await caches.open('estante-ocr-v1')).keys()).length >= 2; } catch (e) { return false; } })) break; await page.waitForTimeout(300); }
  await page.goto(base + '#/listas'); await page.goto(base + '#/');
  await page.waitForSelector('#home-offline-lines');
  await page.waitForFunction(() => (document.querySelector('#home-offline-lines [data-item="leitor"]') || {}).dataset?.estado === 'pronto', null, { timeout: 8000 });
  await page.unroute('https://**.scryfall.io/**');
  // O3 · o painel mostra o espaço usado pelo app (gatilho G1)
  assert.match(await page.innerText('#home-offline-space'), /Espaço usado: [\d,]+ (KB|MB|GB) de [\d,]+ (KB|MB|GB)/);

  // a partir daqui, sem internet: nenhuma requisição sai do aparelho. `setOffline` derruba
  // navigator.onLine, mas as rotas falsas ainda responderiam — por isso elas passam a abortar.
  await page.route('https://api.scryfall.com/**', r => r.abort('internetdisconnected'));
  await page.route('https://**.scryfall.io/**', r => r.abort('internetdisconnected'));
  await page.context().setOffline(true);
  await page.goto(base + '#/listas'); await page.goto(base + '#/');   // sai e volta: o painel é pintado de novo
  await page.waitForFunction(() => /sem internet agora/.test((document.querySelector('#home-offline-state') || {}).innerText || ''));
  // U4 · sem internet: o estado geral tem o ícone da nuvem cortada, o aviso é uma linha só, o chip da barra pulsa
  assert.equal(await page.locator('#home-offline-state svg').count(), 1);
  assert.equal(await page.locator('#home-offline-aviso svg').count(), 1);
  assert.ok((await page.locator('#home-offline-aviso').boundingBox()).height <= 64, 'aviso curto');
  assert.equal(await page.locator('#nav-offline').isVisible(), true);
  assert.notEqual(await page.$eval('#nav-offline', el => getComputedStyle(el, '::before').animationName), 'none', 'o ponto do chip pulsa');

  // listas: a lista abre com os dados das cartas
  await page.goto(base + '#/listas');
  // U2 parte 2 · sem internet as ações das listas continuam com ícone (SVG do próprio arquivo)
  assert.equal(await page.locator('#deck-new svg').count(), 1, 'Nova com ícone sem internet');
  await page.click('text=Delver');
  await page.waitForSelector('.deck-summary');
  assert.equal(await page.locator('#deck-edit svg, #deck-export svg, #deck-delete svg').count(), 3, 'ações da lista com ícone sem internet');
  // U12 · o Delver agora tem imagem; sem service worker no teste, ela falha e a carta cai para o nome (O2) — espera a troca
  await page.waitForFunction(() => /Delver of Secrets/.test(document.body.innerText), null, { timeout: 8000 }).catch(() => {});
  assert.match(await page.innerText('body'), /Delver of Secrets/);

  // mesa: bot liberado (cobertura sai do que está guardado) e a partida roda
  await page.goto(base + '#/mesa');
  await page.fill('#mesa-seed', '9');
  await page.waitForFunction(() => { const c = document.querySelector('[data-opponent="shark"]'); return c && !c.disabled; }, null, { timeout: 8000 });
  await page.click('[data-opponent="shark"]');
  await page.waitForSelector('#mesa-bot-deck');
  await page.waitForFunction(() => { const c = document.querySelector('[data-mode="full"]'); return c && !c.disabled; }, null, { timeout: 8000 });
  await page.click('[data-mode="full"]');
  await page.click('#mesa-start');
  await page.waitForSelector('#tb-keep'); await page.click('#tb-keep');
  await page.waitForSelector('#tb-pass');
  for (let i = 0; i < 8; i++) { const p = await page.$('#tb-pass'); if (!p) break; await p.click(); await page.waitForTimeout(60); }
  assert.match(await page.innerText('.tb'), /Shark/, 'o Shark joga sem internet');

  // E36 · M13 · Commander sem rede: o comandante que sai do campo volta para a zona de comando
  await page.goto(base + '#/mesa');
  await page.click('[data-table-format="commander"]').catch(() => {});
  await page.click('[data-opponent="hotseat"]');
  await page.fill('#mesa-seed', '3');
  await page.click('#mesa-start');
  await page.waitForSelector('#tb-keep'); await page.click('#tb-keep');
  await reveal(page); await page.click('#tb-keep'); await reveal(page);
  for (let i = 0; i < 6 && !(await page.locator('#tb-pass').count()); i++) await reveal(page);
  const cmdOid = await page.evaluate(() => {
    const M = window.__estanteMesa, s = M.estado(), p = s.turn.priority;
    const c = Object.values(s.objects).find(o => o.commander && o.owner === p);
    M.act({ t: 'move', p, oid: c.oid, to: 'battlefield' }); M.act({ t: 'move', p, oid: c.oid, to: 'exile' });
    return c.oid;
  });
  for (let i = 0; i < 3 && !(await page.locator('#tb-cmd-home').count()); i++) await reveal(page);
  assert.match(await page.innerText('#tb-cmd-stay'), /Deixar no exílio/);
  await page.click('#tb-cmd-home');
  await page.waitForFunction(o => window.__estanteMesa.estado().objects[o].zone === 'command', cmdOid);
  // U5 · o leque também sem rede: duas Planícies no campo viram uma pilha só
  await page.evaluate(() => {
    const M = window.__estanteMesa, s = M.estado(), p = s.turn.priority;
    Object.values(s.objects).filter(o => o.owner === p && o.name === 'Plains' && o.zone === 'hand').slice(0, 2).forEach(o => M.act({ t: 'move', p, oid: o.oid, to: 'battlefield' }));
  });
  await page.waitForSelector('[data-zone="lands"] .tb-leque[data-leque="2"]');
  // U7 · a faixa de quem joga também sem rede
  assert.equal(await page.getAttribute('#tb-vez', 'data-papel'), 'eu');
  assert.equal(await page.getAttribute('.tb-side--me', 'data-ativo'), 'true');
  // U6 · recolher a mão também funciona sem rede (preferência local)
  await page.click('#tb-hand-toggle');
  assert.equal(await page.getAttribute('#tb-hand', 'data-recolhida'), 'true');
  await page.click('#tb-hand-toggle');

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
  // U4 · o aviso de rede é uma linha com ícone; busca sem resultado na base local mostra o estado vazio com ícone
  if (await page.locator('#cards-sem-rede').count()) assert.equal(await page.locator('#cards-sem-rede svg').count(), 1);
  await page.fill('#cards-q', 'zzzz inexistente'); await page.press('#cards-q', 'Enter');
  await page.waitForSelector('#cards-results .ds-empty', { timeout: 8000 });
  assert.equal(await page.locator('#cards-results .ds-empty--icone svg').count(), 1, 'vazio sem rede com ícone');
  assert.match(await page.innerText('#cards-results .ds-empty'), /Nada na base do aparelho/);

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
  // U2 · sem internet os ícones continuam desenhados (SVG no próprio arquivo, nada de fonte externa)
  assert.equal(await page.locator('#nav-offline svg').count(), 1, 'chip com o ícone de nuvem cortada');
  assert.match(await page.getAttribute('#nav-offline', 'aria-label'), /Sem internet/);
  const desenhados = await page.$$eval('.ds-appbar button:not(.ds-hidden) .ds-icon', s => s.filter(x => getComputedStyle(x).display !== 'none').map(x => x.getBoundingClientRect().width > 0 && !!x.querySelector('path, rect, circle')));
  assert.ok(desenhados.length >= 5 && desenhados.every(Boolean), 'ícones da barra desenhados: ' + JSON.stringify(desenhados));
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
  // Q10 · imagem GUARDADA aparece sem rede: o visualizador pede a "normal" (a que o guardião guarda), não a "large"
  await page.evaluate(async () => { const c = await caches.open('estante-img-v1'); const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='), c2 => c2.charCodeAt(0));
    for (const t of ['small', 'normal']) await c.put('https://cards.scryfall.io/' + t + '/front/x/sol.jpg', new Response(png, { headers: { 'Content-Type': 'image/png' } })); });
  await page.route('https://**.scryfall.io/**', async r => { const hit = await page.evaluate(async u => { const c = await caches.open('estante-img-v1'); const m = await c.match(u); return m ? Array.from(new Uint8Array(await m.arrayBuffer())) : null; }, r.request().url()); return hit ? r.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from(hit) }) : r.abort('internetdisconnected'); });
  await page.click('.col-row[data-name="Sol Ring"] .col-row__thumb');
  await page.waitForSelector('#card-viewer img[src*="/normal/"]', { timeout: 8000 });
  // leva 102 · com srcset, a largura natural é dividida pela densidade: o PNG de 1 px do teste dá 0. Vale o evento de carga.
  await page.waitForFunction(() => { const i = document.querySelector('#card-viewer img'); return i && i.dataset.carregada === 'true'; }, null, { timeout: 8000 });
  assert.equal(await page.locator('#card-viewer [data-sem-imagem]').count(), 0, 'com a normal no aparelho, o visualizador mostra a carta');
  await page.keyboard.press('Escape');
  // Q10 · galeria e pilhas da coleção mostram a miniatura guardada; a que não está vira o nome, nunca um quadro vazio
  await page.click('[data-visao="galeria"]');
  await page.waitForSelector('.col-card[data-name="Sol Ring"] img');
  await page.waitForFunction(() => { const i = document.querySelector('.col-card[data-name="Sol Ring"] img'); return i && i.dataset.carregada === 'true'; }, null, { timeout: 8000 });
  // leva 102 · expectativa mudou: a galeria pede o tamanho nítido pela densidade da tela (srcset), começando pela "normal"
  assert.match(await page.$eval('.col-card[data-name="Sol Ring"] img', i => i.currentSrc), /\/(normal|small)\/front\/x\/sol\.jpg$/, 'a galeria mostra uma imagem guardada');
  assert.match(await page.getAttribute('.col-card[data-name="Sol Ring"] img', 'srcset'), /small\/front\/x\/sol\.jpg 146w, .*normal\/front\/x\/sol\.jpg 488w/);
  await page.click('[data-visao="pilhas"]');
  await page.waitForSelector('.col-pile', { timeout: 8000 });
  await page.waitForFunction(() => document.querySelectorAll('.col-pile .ds-card__fallback').length > 0 || document.querySelectorAll('.col-pile img').length > 0, null, { timeout: 8000 });
  await page.waitForTimeout(400);                                   // a imagem que falha vira nome
  assert.equal(await page.locator('.col-pile .col-pile__card:empty').count(), 0, 'nenhuma carta da pilha fica em branco');
  await page.click('[data-visao="lista"]');
  await page.unroute('https://**.scryfall.io/**');
  await page.route('https://**.scryfall.io/**', r => r.abort('internetdisconnected'));
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
  // U2 (leva 93) · expectativa mudou: o texto "Filtros (3)" virou rótulo + selo com o número (o ícone fica)
  assert.equal((await page.innerText('#col-filters .ds-btn__conta')).trim(), '3', '3 filtro(s) ativo(s)'); assert.match(await page.getAttribute('#col-filters', 'aria-label'), /Filtros, 3 ativo/);
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
  // H2 · o filtro vai codificado num parâmetro só (antes ia cru e só o primeiro critério sobrevivia)
  assert.match(await page.evaluate(() => location.hash), /^#\/colecao\?f=e%3Dcmm$/, 'link do recorte');
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
  // U2 (leva 93) · expectativa mudou: o texto "Filtros (1)" virou rótulo + selo com o número (o ícone fica)
  assert.equal((await page.innerText('#deck-filters .ds-btn__conta')).trim(), '1', '1 filtro(s) ativo(s)'); assert.match(await page.getAttribute('#deck-filters', 'aria-label'), /Filtros, 1 ativo/);
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
  // aciona o botão sem rolar: rolar até ele dispara o carregamento sozinho (rolagem infinita) e troca o botão no meio do clique
  await page.$eval('#col-more', b => b.click());
  await page.waitForFunction(() => document.querySelectorAll('.col-row').length === 240);
  await page.$eval('#col-more', b => b.click());
  await page.waitForFunction(() => document.querySelectorAll('.col-row').length === 303 && !document.querySelector('#col-more'));
  await page.waitForFunction(() => /Creature/.test(document.querySelector('.col-row[data-name="Grizzly Bear"]').innerText), null, { timeout: 8000 }); // dados chegaram

  // ordenar por mais cópias: as conhecidas sobem para o primeiro lote
  await page.selectOption('#col-sort', 'qtd');
  await page.waitForFunction(() => { const r = document.querySelectorAll('.col-row'); return r.length === 120 && r[0].dataset.name === 'Grizzly Bear' && r[1].dataset.name === 'Sol Ring'; });

  // galeria: arte + quantidade; um toque abre as impressões
  await page.click('[data-visao="galeria"]');
  await page.waitForSelector('.col-card[data-name="Sol Ring"]');
  assert.match(await page.innerText('.col-card[data-name="Sol Ring"]'), /×2/);
  // leva 102 · expectativa mudou: o toque na galeria abre a carta grande; as impressões ficam no botão dentro dela
  await page.click('.col-card[data-name="Sol Ring"] .ds-card');
  await page.waitForSelector('#card-viewer'); await page.click('#col-viewer-prints');
  await page.waitForSelector('#col-add-print'); assert.match(await page.innerText('.ds-dialog'), /CMM/); await page.keyboard.press('Escape');

  // densa: uma linha por carta, com tipo e edições (o filtro de texto traz a Counterspell para a tela)
  await page.click('[data-visao="densa"]');
  await page.fill('#col-filter', 'counter');
  await page.waitForSelector('.col-dense__row[data-name="Counterspell"]');
  assert.match(await page.innerText('.col-dense__row[data-name="Counterspell"]'), /Instant · MH2\s+1/);
  await page.fill('#col-filter', '');

  // agrupar por edição com cabeçalho e contagem (os lotes valem dentro dos grupos)
  await page.selectOption('#col-group', 'edicao');
  await page.waitForSelector('[data-group="cmm"]');
  for (let i = 0; i < 4 && (await page.locator('#col-more').count()); i++) { await page.$eval('#col-more', b => b.click()).catch(() => {}); await page.waitForTimeout(150); } // sem rolar (mesma corrida da rolagem infinita)
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

test('e2e · C14 painel da coleção: números, barra que filtra, curva, recolher lembrado e o que falta para montar', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await createDeck(page, base, 'Delver', PAUPER);          // 20 Island, 4 Delver, 4 Preordain, 4 Counterspell
  await page.goto(base + '#/colecao');
  await page.waitForSelector('#col-import'); await page.click('#col-import');
  await page.waitForSelector('#col-import-text'); await page.fill('#col-import-text', '12 Island\n4 Counterspell\n2 Sol Ring (CMM) 400\n4 Grizzly Bear');
  await page.click('#col-import-check'); await page.waitForSelector('#col-import-run'); await page.click('#col-import-run');
  await page.waitForSelector('.col-row[data-name="Sol Ring"]');
  await page.waitForFunction(() => /Creature/.test(document.querySelector('.col-row[data-name="Grizzly Bear"]').innerText), null, { timeout: 8000 });

  // números e distribuições
  await page.waitForFunction(() => document.querySelector('#col-dash-cartas') && document.querySelector('#col-dash-cartas').innerText.startsWith('4'));
  assert.match(await page.innerText('#col-dash-copias'), /^22/); assert.match(await page.innerText('#col-dash-edicoes'), /^1/);
  assert.match(await page.getAttribute('[data-dash="cor:G"]', 'aria-label'), /Verde: 1 carta\(s\), 4 cópia\(s\)/);
  assert.match(await page.getAttribute('[data-dash="custo:0"]', 'aria-label'), /Custo 0: 12 cópia\(s\)/);
  assert.match(await page.getAttribute('[data-dash="tipo:Instant"]', 'aria-label'), /Instantânea: 1 carta\(s\), 4 cópia\(s\)/);

  // tocar em "verde" filtra; o painel passa a mostrar o recorte; tocar de novo desliga
  await page.click('[data-dash="cor:G"]');
  await page.waitForFunction(() => document.querySelectorAll('.col-row').length === 1);
  assert.match(await page.innerText('.col-row'), /Grizzly Bear/);
  assert.equal(await page.getAttribute('[data-dash="cor:G"]', 'aria-pressed'), 'true');
  assert.match(await page.innerText('#col-dash-cartas'), /^1/);
  // U2 (leva 93) · expectativa mudou: o texto "Filtros (1)" virou rótulo + selo com o número (o ícone fica)
  assert.equal((await page.innerText('#col-filters .ds-btn__conta')).trim(), '1', '1 filtro(s) ativo(s)'); assert.match(await page.getAttribute('#col-filters', 'aria-label'), /Filtros, 1 ativo/);
  await page.click('[data-dash="cor:G"]');
  await page.waitForFunction(() => document.querySelectorAll('.col-row').length === 4);
  // a curva também filtra (custo 2 → Counterspell e Grizzly Bear)
  await page.click('[data-dash="custo:2"]');
  await page.waitForFunction(() => document.querySelectorAll('.col-row').length === 2);
  assert.match(await page.innerText('#col-count-desc'), /custo 2/);
  await page.click('#col-filters-clear');
  await page.waitForFunction(() => document.querySelectorAll('.col-row').length === 4);

  // o que falta para montar a Delver
  await page.selectOption('#col-build-deck', { label: 'Delver' });
  await page.waitForSelector('#col-build-result');
  const falta = await page.innerText('#col-build-result');
  assert.match(falta, /16 de 32/); assert.match(falta, /faltam 16 carta\(s\) · 50% na sua coleção/);
  assert.match(falta, /8 Island · 4 Delver of Secrets · 4 Preordain/, 'o que falta, mais falta primeiro');

  // recolher fica lembrado
  await page.click('#col-dash-toggle');
  await page.waitForFunction(() => !document.querySelector('#col-dash-cartas'));
  await page.goto(base + '#/listas'); await page.goto(base + '#/colecao');
  await page.waitForSelector('#col-dash-toggle');
  assert.equal(await page.locator('#col-dash-cartas').count(), 0, 'continua recolhido');
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

  // H7 · desfazer tira só o que a importação somou: a Counterspell resolvida depois fica (antes: apagava tudo)
  await page.click('#col-undo-btn');
  await page.waitForFunction(() => !document.querySelector('.col-row[data-name="Sol Ring"]') && !document.querySelector('.col-row[data-name="Grizzly Bear"]'));
  assert.equal(await page.locator('.col-row[data-name="Counterspell"]').count(), 1, 'o que você resolveu depois continua');
  assert.equal(await page.locator('#col-undo button').count(), 0, 'a barra de desfazer some');
  await page.click('.col-row[data-name="Counterspell"] button[aria-label^="Remover"]'); await page.click('#col-remove-confirm');
  await page.waitForFunction(() => /Sua coleção está vazia/.test(document.querySelector('#col-list').innerText));
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
  // Q10 · o leitor falso deixa no cache o que o service worker deixaria ao baixar o leitor de verdade
  window.Tesseract = { createWorker: async () => {
    try { const c = await caches.open('estante-ocr-v1'); await c.put('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js', new Response('')); await c.put('https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz', new Response('')); } catch (e) {}
    return { setParameters: async () => {}, terminate: async () => {},
      recognize: async () => ({ data: { text: window.__ocrQueue.length ? window.__ocrQueue.shift() : '' } }) };
  } };
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
  // Q10 · o leitor falso deixa no cache o que o service worker deixaria ao baixar o leitor de verdade
  window.Tesseract = { createWorker: async () => {
    try { const c = await caches.open('estante-ocr-v1'); await c.put('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js', new Response('')); await c.put('https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz', new Response('')); } catch (e) {}
    return { setParameters: async () => {}, terminate: async () => {},
      recognize: async () => ({ data: { text: window.__ocrQueue.length ? window.__ocrQueue.shift() : '' } }) };
  } };
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
  // U2 parte 3 · expectativa mudou: +, − e × viraram ícones desenhados; o teste acha o botão pelo nome falado
  await cartao.locator('button[aria-label^="Uma a mais"]').first().click();
  await page.waitForFunction(() => /Na pilha: 2 carta/.test(document.querySelector('#scan-pile').innerText));
  await cartao.locator('button[aria-label^="Tirar"]').first().click();
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
    // U6b · a fase e o dono do turno ficam na linha de apoio da bandeja (escondida quando recolhida): lê o texto todo
    const b = await page.textContent('.tb-banner');
    if (/Principal 1/.test(b) && /seu turno/i.test(b)) return;
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
  // U3 · o custo aparece em símbolos: um genérico e um azul, com nome falado; o texto "{1}{U}" continua lá para copiar e buscar
  const conjurar = page.locator('.ds-dialog button', { hasText: 'Conjurar ·' }).first();
  assert.deepEqual(await conjurar.locator('.ds-sym').evaluateAll(els => els.map(e => [e.dataset.sym, e.getAttribute('aria-label')])), [['1', '1 genérico'], ['U', 'azul']]);
  assert.match(await conjurar.innerText(), /Conjurar · \{1\}\{U\}/);
  const simb = await conjurar.locator('.ds-sym').first().boundingBox();
  assert.ok(simb.width >= 14 && Math.abs(simb.width - simb.height) < 1, `símbolo redondo e legível (${simb.width}×${simb.height})`);
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/simbolos-folha.png' });
  await page.click('.ds-dialog >> text=/Conjurar · \\{1\\}\\{U\\}/');
  await page.waitForSelector('.tb-side--me [data-zone="permanents"] .tb-card[aria-label*="Sky Pike"]');
  // A13 · terrenos iguais são uma pilha: "×2" e as duas viradas para pagar (antes eram dois cartões)
  const pilha = page.locator('.tb-side--me [data-zone="lands"] .tb-card').first();
  assert.equal(await page.locator('.tb-side--me [data-zone="lands"] .tb-card').count(), 1, 'uma pilha de Island');
  assert.equal(await pilha.getAttribute('data-pilha-total'), '2'); assert.equal(await pilha.getAttribute('data-pilha-viradas'), '2');
  assert.equal(await pilha.getAttribute('data-tapped'), 'true', 'todas viradas: a pilha aparece virada');
  assert.match(await page.innerText('.tb-side--me [data-zone="lands"] .tb-zone__label'), /Terrenos · 2/, 'a zona conta cartas, não pilhas');
  // A13 · a criatura recém-chegada mostra P/T e enjoo sem toque
  const pike = page.locator('.tb-side--me [data-zone="permanents"] .tb-card[aria-label*="Sky Pike"]').first();
  assert.equal(await pike.locator('.tb-card__pt').innerText(), '2/1');
  assert.equal(await pike.getAttribute('data-sick'), 'true');
  assert.match(await pike.getAttribute('aria-label'), /Sky Pike, com enjoo, 2\/1/);
  assert.ok(await pike.evaluate(el => el.classList.contains('tb-card--entrou')), 'quem acabou de entrar recebe o movimento curto');
  if (await page.locator('#tb-adj-done').count()) await page.click('#tb-adj-done');

  // próximo turno: declarar ataque com a criatura sem enjoo
  await page.click('#tb-pass-turn');
  for (let i = 0; i < 8 && !(await page.locator('#tb-attack').count()); i++) { await reveal(page); if (await page.locator('#tb-pass').count()) await page.click('#tb-pass'); }
  assert.match(await page.innerText('.tb-banner'), /Declarar atacantes/);
  assert.equal(await pike.getAttribute('data-sick'), 'false', 'no turno seguinte o enjoo passou');
  await page.locator('.tb-side--me .tb-card[data-eligible="true"]').first().click();
  // A13 · atacante escolhido já ganha o anel antes de confirmar
  assert.equal(await page.locator('.tb-side--me .tb-card[data-estado="ataca"]').count(), 1, 'anel de ataque no planejamento');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/atk.png' });
  // A16 · contra o goldfish a prévia do ataque já diz a vida resultante
  assert.match(await page.innerText('.tb-banner'), /Se ninguém bloquear: Goldfish 20 → 18 · ninguém morre\./);
  await page.click('#tb-attack');
  await page.waitForFunction(() => /18/.test(document.querySelector('#tb-life-opp').innerText));
  // A16 · passado o turno, o resumo dele aparece na mesa: vida e o que entrou; some com OK
  await page.click('#tb-pass-turn');
  await page.waitForSelector('#tb-resumo', { timeout: 8000 });
  const resumoTurno = await page.innerText('#tb-resumo');
  assert.match(resumoTurno, /Turno \d+ · Você/, 'o seu turno aparece mesmo com o goldfish jogando logo depois');
  assert.match(resumoTurno, /Vida: Goldfish 20 → 18/);
  await page.click('#tb-resumo-ok');
  await page.waitForFunction(() => !document.querySelector('#tb-resumo'));
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
  assert.match(await page.innerText('.tb-banner'), /Toque nas criaturas que vão atacar/, 'sem atacante escolhido, sem prévia');
  await page.locator('.tb-side--me .tb-card[data-eligible="true"][aria-label*="Sky Pike"]').click();
  // A16 · prévia do ataque a cada toque: dano que passa e vida resultante, se ninguém bloquear
  assert.match(await page.innerText('.tb-banner'), /Se ninguém bloquear: (Ana|Bia) 20 → 18 · ninguém morre\./);
  await page.click('#tb-attack');
  await page.waitForSelector('#tb-handoff');
  assert.match(await page.innerText('#tb-handoff'), /declarar bloqueadores/);
  await page.click('#tb-reveal');
  const defLife = await page.innerText('#tb-life-me');
  // A16 · a prévia do bloqueio agora diz a vida resultante e quem morre de cada lado (antes: "você perde 2 de vida")
  assert.match(await page.innerText('.tb-banner'), /Prévia: (Ana|Bia) 20 → 18 · ninguém morre\./);
  await page.locator('.tb-side--me .tb-card[data-eligible="true"][aria-label*="Wall Guard"]').click();
  await page.click('.ds-dialog >> text=Bloquear Sky Pike');
  assert.match(await page.innerText('.tb-banner'), /Prévia: ninguém perde vida · ninguém morre\./);
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

test('e2e · U5 cópias iguais em leque: terrenos e criaturas, toque na da frente, cabe na tela, combate separa quem ataca', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await createDeck(page, base, 'Peixes', '30 Island\n20 Sky Pike', 'livre');
  await page.goto(base + '#/mesa');
  await page.fill('#mesa-seed', '4');
  await page.click('#mesa-start');
  await page.waitForSelector('#tb-keep'); await page.click('#tb-keep');
  await toMyMain(page);
  // 4 Ilhas e 3 Sky Pike direto no campo (ajuste da mesa assistida), sem depender da sorte da compra
  await page.evaluate(() => {
    const M = window.__estanteMesa, s = M.estado(), p = s.turn.priority;
    const meus = n => Object.values(s.objects).filter(o => o.owner === p && o.name === n && o.zone !== 'battlefield').map(o => o.oid);
    meus('Island').slice(0, 4).forEach(oid => M.act({ t: 'move', p, oid, to: 'battlefield' }));
    meus('Sky Pike').slice(0, 3).forEach(oid => M.act({ t: 'move', p, oid, to: 'battlefield' }));
  });
  const terras = page.locator('.tb-side--me [data-zone="lands"] .tb-leque');
  await terras.first().waitFor();
  assert.equal(await terras.count(), 1, 'as quatro Ilhas são um leque só');
  assert.equal(await terras.getAttribute('data-leque'), '4');
  if (process.env.SHOTS) { await page.waitForTimeout(400); await page.screenshot({ path: process.env.SHOTS + '/leque.png' }); }
  assert.equal(await terras.locator('.tb-leque__camada').count(), 3, 'três cartas aparecem atrás');
  assert.match(await page.innerText('.tb-side--me [data-zone="lands"] .tb-zone__label'), /Terrenos · 4/);
  const bTerra = await terras.boundingBox(), bFrente = await terras.locator('.tb-card').boundingBox();
  assert.ok(bTerra.width < bFrente.width * 2, `o leque de 4 ocupa menos que 2 cartas (${bTerra.width} × ${bFrente.width})`);
  const desloc = await terras.locator('.tb-leque__camada').nth(2).evaluate(el => el.getBoundingClientRect().left - el.parentElement.getBoundingClientRect().left);
  assert.ok(Math.abs(desloc - 42) <= 1, `a terceira de trás está 3 passos à direita (${desloc})`);
  assert.ok(bFrente.height >= 44 && bFrente.width >= 44, 'alvo de toque');
  const peixes = page.locator('.tb-side--me [data-zone="permanents"] .tb-leque');
  assert.equal(await peixes.count(), 1, 'as três Sky Pike com enjoo são um leque');
  assert.match(await peixes.locator('.tb-card').getAttribute('aria-label'), /Sky Pike, 3 cópias, com enjoo/);
  // o toque é da carta da frente: abre a folha dela
  await terras.locator('.tb-card').click();
  await page.waitForSelector('.ds-dialog');
  assert.match(await page.innerText('.ds-dialog'), /Island/);
  await page.keyboard.press('Escape');
  const larguraDaPagina = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  assert.ok(larguraDaPagina, 'sem rolagem horizontal');
  // próximo turno, combate: cada atacante possível ganha o seu próprio toque
  if (await page.locator('#tb-adj-done').count()) await page.click('#tb-adj-done');
  await page.click('#tb-pass-turn');
  for (let i = 0; i < 10 && !(await page.locator('#tb-attack').count()); i++) { await reveal(page); if (await page.locator('#tb-pass').count()) await page.click('#tb-pass'); }
  await page.waitForSelector('#tb-attack');
  assert.equal(await page.locator('.tb-side--me [data-zone="permanents"] .tb-card[data-eligible="true"]').count(), 3, 'no combate o leque abre em três');
  await page.locator('.tb-side--me .tb-card[data-eligible="true"]').first().click();
  assert.equal(await page.locator('.tb-side--me .tb-card[data-estado="ataca"]').count(), 1, 'só a escolhida ataca');
  assert.deepEqual(errors, []);
});

test('e2e · U6 mão recolhível: recolhe em um toque, a mesa ganha espaço, a escolha fica, mulligan e descarte abrem sozinhos', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await createDeck(page, base, 'Peixes', '30 Island\n20 Sky Pike', 'livre');
  await page.goto(base + '#/mesa');
  await page.fill('#mesa-seed', '4');
  await page.click('#mesa-start');
  await page.waitForSelector('#tb-keep'); await page.click('#tb-keep');
  await toMyMain(page);
  const toggle = page.locator('#tb-hand-toggle');
  assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
  // U6b · ícone do app (SVG), não emoji; a contagem continua ao lado
  assert.doesNotMatch(await toggle.innerText(), /✋/);
  assert.equal(await toggle.locator('svg').count() >= 1, true, 'ícone desenhado');
  assert.match(await toggle.innerText(), /^\s*\d+\s*$/);
  const bt = await toggle.boundingBox(); assert.ok(bt.height >= 44, 'puxador com alvo de toque');
  const docaAntes = (await page.locator('.tb-dock').boundingBox()).height;
  await toggle.click();
  assert.equal(await page.getAttribute('#tb-hand', 'data-recolhida'), 'true');
  assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
  await page.waitForTimeout(300);                                   // a animação de 200 ms termina
  const corpo = await page.locator('#tb-hand-body').boundingBox();
  assert.ok(corpo.height < 2, `corpo recolhido (${corpo.height})`);
  const docaDepois = (await page.locator('.tb-dock').boundingBox()).height;
  assert.ok(docaAntes - docaDepois > 100, `a mesa ganha espaço (${docaAntes} → ${docaDepois})`);
  // U6b · recolhida, a bandeja é uma linha só: no máximo 80 px num 390×844 (antes: 169 px)
  assert.ok(docaDepois <= 80, `bandeja recolhida fina: ${docaDepois} px`);
  // as ações continuam alcançáveis e com alvo de toque, sem quebrar linha
  const passar = await page.locator('#tb-pass').boundingBox(), pular = await page.locator('#tb-pass-turn').boundingBox();
  assert.ok(passar.height >= 44 && pular.height >= 44 && pular.width >= 44);
  assert.ok(Math.abs(passar.y - pular.y) < 2, 'na mesma linha');
  assert.equal(await page.getAttribute('#tb-pass-turn', 'aria-label'), 'Passar o turno', 'ícone com nome acessível');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/mao-recolhida.png' });
  assert.equal(await page.locator('.tb-hand .tb-card').first().isVisible(), false, 'cartas da mão escondidas');
  // a escolha sobrevive à recarga (a partida continua de onde parou)
  await page.reload();
  await page.waitForSelector('#tb-hand-toggle');
  await page.waitForFunction(() => document.querySelector('#tb-hand').dataset.recolhida === 'true');
  // expandir de novo mostra as cartas
  await page.click('#tb-hand-toggle');
  await page.waitForTimeout(300);
  assert.equal(await page.locator('.tb-hand .tb-card').first().isVisible(), true);
  await page.click('#tb-hand-toggle');                            // deixa recolhida para o resto do teste
  // descarte na limpeza: 5 cartas a mais e passar o turno obriga a descartar → a mão abre sozinha
  await page.evaluate(() => { const M = window.__estanteMesa, s = M.estado(); M.act({ t: 'draw', p: s.turn.priority, target: s.turn.priority, n: 5 }); });
  await page.click('#tb-pass-turn');
  await page.waitForFunction(() => document.querySelector('#tb-hand') && document.querySelector('#tb-hand').dataset.forcada === 'true', null, { timeout: 5000 });
  assert.equal(await page.getAttribute('#tb-hand', 'data-recolhida'), 'false');
  assert.match(await page.innerText('#tb-hand-aviso'), /Escolha o que descartar/);
  assert.match(await page.getAttribute('#tb-hand-toggle', 'aria-label'), /aberta para descarte/);
  assert.equal(await page.locator('#tb-hand-toggle').isDisabled(), true, 'não dá para recolher no meio do descarte');
  while (await page.evaluate(() => { const s = window.__estanteMesa.estado(); return !!(s.pending && s.pending.kind === 'discard'); })) {
    await page.locator('.tb-hand .tb-card').first().click();
  }
  await page.waitForFunction(() => document.querySelector('#tb-hand').dataset.recolhida === 'true', null, { timeout: 5000 });
  // partida nova: a mão inicial abre sozinha mesmo com a preferência de recolher
  await page.evaluate(() => { const M = window.__estanteMesa, s = M.estado(); M.act({ t: 'concede', p: s.turn.priority }); });
  await page.click('#tb-new');
  await page.fill('#mesa-seed', '5');
  await page.click('#mesa-start');
  await page.waitForSelector('#tb-keep');
  assert.equal(await page.getAttribute('#tb-hand', 'data-forcada'), 'true');
  assert.match(await page.innerText('#tb-hand-aviso'), /Decida a mão inicial/);
  await page.click('#tb-keep');
  // leva 102 · expectativa mudou (bug relatado no celular): ao sair da mão inicial a mão fica ABERTA no 1º turno,
  // mesmo que a partida anterior tenha terminado com ela recolhida; antes ela voltava a recolher e o jogador não via as cartas
  await page.waitForFunction(() => document.querySelector('#tb-hand').dataset.recolhida === 'false');
  assert.equal(await page.locator('.tb-hand .tb-card').first().isVisible(), true);
  assert.deepEqual(errors, []);
});

test('e2e · U7 de quem é a vez: faixa na cor do jogador, lado ativo aceso, prioridade separada, cortina diz o turno', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await createDeck(page, base, 'Peixes', '30 Island\n10 Sky Pike\n10 Wall Guard', 'livre');
  await page.goto(base + '#/mesa');
  await page.click('[data-opponent="hotseat"]');
  await page.fill('#mesa-me', 'Ana'); await page.fill('#mesa-them', 'Bia');
  await page.fill('#mesa-seed', '4');
  await page.click('#mesa-start');
  await page.waitForSelector('#tb-keep');
  assert.equal(await page.getAttribute('#tb-vez', 'data-papel'), 'mulligan');
  assert.match(await page.innerText('#tb-vez'), /Mão inicial/);
  await page.click('#tb-keep'); await reveal(page); await page.click('#tb-keep'); await reveal(page);
  const quem = () => page.evaluate(() => { const s = window.__estanteMesa.estado(); return { ativo: s.players[s.turn.active].name, prio: s.players[s.turn.priority].name }; });
  // quem está com o aparelho é quem tem a prioridade; no começo é o do turno
  let q = await quem();
  await page.waitForSelector('#tb-vez[data-papel="eu"]');
  assert.match(await page.innerText('#tb-vez'), /Seu turno/);
  assert.equal(await page.innerText('#tb-vez .tb-vez__avatar'), q.ativo.slice(0, 1));
  assert.equal(await page.getAttribute('.tb-side--me', 'data-ativo'), 'true', 'o seu lado acende');
  assert.equal(await page.getAttribute('.tb-side--opp', 'data-ativo'), 'false');
  assert.equal(await page.locator('#tb-vez-prio').count(), 0, 'prioridade com quem joga: sem selo extra');
  const corEu = await page.$eval('#tb-vez', el => getComputedStyle(el).backgroundColor);
  const bordaEu = await page.$eval('.tb-side--me', el => getComputedStyle(el).borderTopColor);
  await page.waitForTimeout(350);                                   // a faixa anima (escala .98) ao trocar o turno
  const hVez = (await page.locator('#tb-vez').boundingBox()).height; assert.ok(hVez >= 44, 'faixa alta o bastante: ' + hVez + ' ' + await page.$eval('#tb-vez', el => getComputedStyle(el).minHeight));
  // passar o turno: a cortina diz de quem é o turno para quem recebe o aparelho
  await page.click('#tb-pass-turn');
  await page.waitForSelector('#tb-handoff');
  q = await quem();
  assert.match(await page.innerText('#tb-handoff'), new RegExp(q.prio));
  assert.match(await page.innerText('#tb-vez-cortina'), q.ativo === q.prio ? /Seu turno/ : new RegExp(`Turno de ${q.ativo}`));
  await reveal(page);
  await page.waitForSelector('#tb-vez');
  assert.equal(await page.getAttribute('#tb-vez', 'data-papel'), 'eu', 'agora é o turno de quem pegou o aparelho');
  assert.ok(await page.$eval('#tb-vez', el => el.classList.contains('tb-vez--troca')), 'a faixa anima quando o turno troca');
  // o outro lado vê o turno na cor do oponente: quem joga agora ataca, e o outro decide os bloqueios
  const atacante = await page.evaluate(() => {
    const M = window.__estanteMesa; let s = M.estado(); const p = s.turn.active;
    const pike = Object.values(s.objects).find(o => o.owner === p && o.name === 'Sky Pike' && o.zone !== 'battlefield');
    M.act({ t: 'move', p, oid: pike.oid, to: 'battlefield' });
    // o outro tem uma Wall Guard (alcance): pode bloquear o voador, então a decisão é dele
    const d = 1 - p, muro = Object.values(s.objects).find(o => o.owner === d && o.name === 'Wall Guard' && o.zone !== 'battlefield');
    M.act({ t: 'move', p, oid: muro.oid, to: 'battlefield' });
    return { p, oid: pike.oid, nome: s.players[p].name };
  });
  // dois turnos depois o Sky Pike já não tem enjoo: o motor avança (sem ataque no turno do outro) até o dono poder atacar
  await page.evaluate(({ p, oid }) => {
    const M = window.__estanteMesa; const t0 = M.estado().turn.number;
    for (let i = 0; i < 80; i++) {
      const s = M.estado(), pd = s.pending;
      if (pd && pd.kind === 'attackers' && s.turn.active === p && s.turn.number >= t0 + 2) break;
      if (pd && pd.kind === 'attackers') M.act({ t: 'attack', p: pd.p, attackers: [] });
      else if (pd && pd.kind === 'blockers') M.act({ t: 'block', p: pd.p, blocks: [] });
      else if (pd && pd.kind === 'discard') M.act({ t: 'discard', p: pd.p, oid: s.zones[pd.p].hand[0] });
      else M.act({ t: 'pass', p: s.turn.priority });
    }
    M.act({ t: 'attack', p, attackers: [oid] });
  }, atacante);
  assert.equal(await page.evaluate(() => window.__estanteMesa.estado().pending.kind), 'blockers', 'o defensor precisa decidir');
  await reveal(page);
  await page.waitForSelector('#tb-vez[data-papel="oponente"]');
  assert.match(await page.innerText('#tb-vez'), new RegExp(`Turno de ${atacante.nome}`));
  assert.match(await page.innerText('#tb-vez-prio'), /você responde/, 'prioridade separada do turno');
  assert.notEqual(await page.$eval('#tb-vez', el => getComputedStyle(el).backgroundColor), corEu, 'cor do oponente é outra');
  assert.equal(await page.getAttribute('.tb-side--opp', 'data-ativo'), 'true', 'o lado de quem joga acende');
  assert.equal(await page.getAttribute('.tb-side--me', 'data-ativo'), 'false');
  assert.notEqual(await page.$eval('.tb-side--opp', el => getComputedStyle(el).borderTopColor), bordaEu, 'borda na cor do oponente');
  // U2 · com o selo de prioridade, a faixa divide a linha com as ferramentas e nada fica cortado, mesmo em 360
  await page.setViewportSize({ width: 360, height: 780 }); await page.waitForTimeout(350);
  const corte = await page.evaluate(() => [...document.querySelectorAll('#tb-vez .tb-vez__rotulo, #tb-vez-prio')].map(e => e.scrollWidth - e.clientWidth));
  assert.deepEqual(corte, [0, 0], 'rótulo e selo inteiros');
  const [fx, fr] = [await page.locator('#tb-vez').boundingBox(), await page.locator('#tb-concede').boundingBox()];
  assert.ok(fr.y < fx.y + fx.height && fr.y + fr.height > fx.y, 'ferramentas na linha da faixa');
  if (process.env.SHOTS) { await page.screenshot({ path: process.env.SHOTS + '/vez-oponente.png' }); }
  assert.deepEqual(errors, []);
});

test('e2e · U6b arrastar a borda de cima da bandeja: para baixo recolhe, para cima abre, arrasto curto não muda nada, toque nos botões continua funcionando', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await createDeck(page, base, 'Peixes', '30 Island\n20 Sky Pike', 'livre');
  await page.goto(base + '#/mesa');
  await page.fill('#mesa-seed', '4');
  await page.click('#mesa-start');
  await page.waitForSelector('#tb-keep'); await page.click('#tb-keep');
  await toMyMain(page);
  const estado = () => page.getAttribute('#tb-dock', 'data-recolhida');
  const grip = await page.locator('.tb-dock__grip').boundingBox();
  const arrasta = async (dy, { passos = 8, x = grip.x + grip.width / 2, y = grip.y + grip.height / 2 } = {}) => {
    await page.mouse.move(x, y); await page.mouse.down();
    for (let i = 1; i <= passos; i++) { await page.mouse.move(x, y + (dy * i) / passos); await page.waitForTimeout(12); }
    await page.mouse.up(); await page.waitForTimeout(300);
  };
  assert.equal(await estado(), 'false');
  await arrasta(20);                                                 // curto e devagar: nada
  assert.equal(await estado(), 'false', 'arrasto curto não recolhe');
  await arrasta(90);                                                 // para baixo: recolhe
  assert.equal(await estado(), 'true', 'arrastar para baixo recolhe');
  const g2 = await page.locator('.tb-dock__grip').boundingBox();
  await arrasta(-90, { x: g2.x + g2.width / 2, y: g2.y + g2.height / 2 });   // para cima: abre
  assert.equal(await estado(), 'false', 'arrastar para cima abre');
  // o gesto também vale na linha de ações (perímetro de cima), sem disparar o botão por baixo do dedo
  const turno = await page.evaluate(() => document.querySelector('#tb-vez') && document.querySelector('#tb-vez').dataset.turno);
  const barra = await page.locator('#tb-pass').boundingBox();
  await arrasta(90, { x: barra.x + barra.width / 2, y: barra.y + barra.height / 2 });
  assert.equal(await estado(), 'true', 'arrastar a partir do botão recolhe');
  assert.equal(await page.evaluate(() => document.querySelector('#tb-vez').dataset.turno), turno, 'e não passou a prioridade sem querer');
  assert.equal((await page.locator('#tb-pass').count()), 1);
  // um toque normal logo depois do gesto continua funcionando (o bloqueio do clique do arrasto não come o próximo toque)
  await page.waitForTimeout(400);
  await page.click('#tb-hand-toggle');
  assert.equal(await estado(), 'false');
  const antes = await page.textContent('.tb-dock');
  await page.click('#tb-pass');
  await page.waitForFunction(t0 => document.querySelector('.tb-dock') && document.querySelector('.tb-dock').textContent !== t0, antes, { timeout: 5000 });
  assert.deepEqual(errors, []);
});

test('e2e · U3 símbolos: reserva de mana com símbolo e contagem, texto da carta na espiada, catálogo, e campo de texto intocado', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await createDeck(page, base, 'Magos', '20 Island\n10 Prodigal Sorcerer', 'livre');
  await page.goto(base + '#/mesa');
  await page.fill('#mesa-seed', '4');
  await page.click('#mesa-start');
  await page.waitForSelector('#tb-keep'); await page.click('#tb-keep');
  await toMyMain(page);
  // três Ilhas no campo, viradas para mana: a reserva mostra {U} ×3
  await page.evaluate(() => {
    const M = window.__estanteMesa, s = M.estado(), p = s.turn.priority;
    const ilhas = Object.values(s.objects).filter(o => o.owner === p && o.name === 'Island' && o.zone !== 'battlefield').slice(0, 3);
    ilhas.forEach(o => M.act({ t: 'move', p, oid: o.oid, to: 'battlefield' }));
    ilhas.forEach(o => M.act({ t: 'tap_mana', p, oid: o.oid, option: 0 }));
  });
  await page.waitForSelector('.tb-pool .ds-sym[data-sym="U"]');
  assert.equal(await page.locator('.tb-pool .ds-sym').count(), 1, 'um símbolo por cor');
  assert.match(await page.innerText('.tb-pool'), /×3/);
  assert.equal(await page.getAttribute('.tb-pool', 'aria-label'), 'reserva de mana: 3');
  // a espiada mostra o texto da carta com {T} em símbolo
  const pid = await page.evaluate(() => { const M = window.__estanteMesa, s = M.estado(), p = s.turn.priority;
    const o = Object.values(s.objects).find(x => x.owner === p && x.name === 'Prodigal Sorcerer' && x.zone !== 'battlefield'); M.act({ t: 'move', p, oid: o.oid, to: 'battlefield' }); return o.oid; });
  const carta = page.locator(`.tb-side--me .tb-card[data-oid="${pid}"]`);
  await carta.waitFor(); await carta.evaluate(el => el.scrollIntoView({ block: 'center' })); await page.waitForTimeout(300);
  const b = await carta.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
  await page.waitForSelector('#tb-peek .ds-sym[data-sym="T"]', { timeout: 3000 });
  assert.match(await page.innerText('#tb-peek'), /\{T\}: Prodigal Sorcerer deals 1 damage/);
  await page.mouse.up();
  // catálogo do design system: a referência dos símbolos
  await page.goto(base + '#/ds'); await page.waitForSelector('#ds-simbolos');
  assert.equal(await page.locator('#ds-simbolos .ds-sym').count(), 22);
  assert.equal(await page.innerText('#ds-simbolos-texto'), '{T}: Add {G}. {1}{U}{U}, sacrifique: compre duas cartas. Pague {W/P} ou 2 de vida.', 'texto lido idêntico ao original');
  // campo de texto nunca é transformado: colar uma lista com "{G}" continua texto puro
  await page.goto(base + '#/listas'); await page.waitForSelector('#decks-new, #decks-starter-empty, #decks-list', { timeout: 5000 }).catch(() => {});
  await page.goto(base + '#/colecao'); await page.waitForSelector('#col-import'); await page.click('#col-import');
  await page.waitForSelector('#col-import-text'); await page.fill('#col-import-text', '1 Carta {G}');
  assert.equal(await page.inputValue('#col-import-text'), '1 Carta {G}');
  assert.equal(await page.locator('#col-import-text .ds-sym').count(), 0);
  assert.deepEqual(errors, []);
});

test('e2e · U3 parte 2 · símbolos no acervo: carta sem imagem vira texto com custo, coleção com custo, filtro de cor por símbolo, busca', { skip }, async t => {
  const { page, errors, base } = await open(t);
  const foto = async nome => { if (process.env.SHOTS) { await page.waitForTimeout(250); await page.screenshot({ path: `${process.env.SHOTS}/${nome}.png` }); } };
  const custo = loc => loc.locator('.ds-sym').evaluateAll(els => els.map(e => e.dataset.sym));
  await createDeck(page, base, 'Símbolos', '4 Sky Pike\n4 Lightning Bolt\n4 Grizzly Bear\n2 Prodigal Sorcerer\n10 Island', 'livre');
  // lista: sem imagem, a carta vira texto com nome, custo em símbolos e tipo
  const pike = page.locator('.deck-slot[data-name="Sky Pike"] .ds-card__fallback');
  await pike.waitFor();
  assert.deepEqual(await custo(pike.locator('.ds-card__custo')), ['1', 'U']);
  assert.match(await pike.locator('.ds-card__tipo').innerText(), /Creature — Fish/);
  assert.deepEqual(await custo(page.locator('.deck-slot[data-name="Prodigal Sorcerer"] .ds-card__custo')), ['2', 'U']);
  assert.equal(await page.locator('.deck-slot[data-name="Island"] .ds-card__custo').count(), 0, 'terreno sem custo não mostra linha vazia');
  await foto('u3-lista');
  // coleção: custo ao lado do nome na linha e na densa; carta em texto na galeria
  await page.goto(base + '#/colecao'); await page.waitForSelector('#col-import'); await page.click('#col-import');
  await page.waitForSelector('#col-import-text'); await page.fill('#col-import-text', '2 Sky Pike\n1 Lightning Bolt\n3 Grizzly Bear\n1 Prodigal Sorcerer');
  await page.click('#col-import-check'); await page.waitForSelector('#col-import-run'); await page.click('#col-import-run');
  await page.waitForSelector('.col-row[data-name="Sky Pike"] .col-row__custo');
  assert.deepEqual(await custo(page.locator('.col-row[data-name="Sky Pike"] .col-row__custo')), ['1', 'U']);
  assert.deepEqual(await custo(page.locator('.col-row[data-name="Lightning Bolt"] .col-row__custo')), ['R']);
  assert.match(await page.innerText('.col-row[data-name="Sky Pike"] .col-row__info'), /Sky Pike\s*\{1\}\{U\}/, 'o texto lido continua trazendo o custo');
  await foto('u3-colecao-lista');
  if (process.env.SHOTS) { const r = page.locator('.col-row[data-name="Sky Pike"]'); await r.scrollIntoViewIfNeeded(); await r.screenshot({ path: `${process.env.SHOTS}/u3-colecao-linha.png` }); }
  await page.click('[data-visao="densa"]'); await page.waitForSelector('.col-dense__row[data-name="Grizzly Bear"] .col-dense__custo');
  assert.deepEqual(await custo(page.locator('.col-dense__row[data-name="Grizzly Bear"] .col-dense__custo')), ['1', 'G']);
  await foto('u3-colecao-densa');
  await page.click('[data-visao="galeria"]'); await page.waitForSelector('.col-card[data-name="Prodigal Sorcerer"] .ds-card__custo');
  await foto('u3-colecao-galeria');
  await page.click('[data-visao="lista"]');
  // filtro de cor: chip redondo com o símbolo, nome falado, alvo de toque, e funciona
  await page.click('#col-filters'); await page.waitForSelector('#col-filters-body');
  const chipAzul = page.locator('[data-cor="U"]');
  assert.equal(await chipAzul.getAttribute('aria-label'), 'Azul');
  assert.equal(await chipAzul.locator('.ds-sym[data-sym="U"]').count(), 1);
  assert.doesNotMatch((await chipAzul.innerText()).replace(/\{U\}/, ''), /Azul/, 'sem a palavra na tela');
  await page.waitForTimeout(350);                                   // o painel entra com animação de escala
  const bb = await chipAzul.boundingBox(); assert.ok(bb.width >= 44 && bb.height >= 44, `alvo de toque (${bb.width}×${bb.height})`);
  assert.deepEqual(await page.locator('#col-filters-body [data-cor]').evaluateAll(cs => cs.map(c => c.dataset.cor)), ['W', 'U', 'B', 'R', 'G', 'C']);
  await chipAzul.click();
  assert.equal(await chipAzul.getAttribute('aria-pressed'), 'true');
  await page.waitForFunction(() => /2 carta\(s\)/.test((document.querySelector('#col-filters-count') || {}).innerText || ''));
  await foto('u3-filtro');
  await page.click('#col-filters-reset');
  await page.keyboard.press('Escape');
  // busca: resultado sem imagem mostra custo e tipo
  await page.goto(base + '#/cartas'); await page.waitForSelector('#cards-q');
  await page.fill('#cards-q', 'sorcerer'); await page.press('#cards-q', 'Enter');
  await page.waitForSelector('#cards-results .ds-card__custo');
  assert.deepEqual(await custo(page.locator('#cards-results .ds-card__custo').first()), ['2', 'U']);
  await foto('u3-busca');
  assert.deepEqual(errors, []);
});

test('e2e · A15 segurar a carta espia texto, P/T e ações; soltar fecha sem abrir a folha; toque curto abre a folha', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await createDeck(page, base, 'Peixes', '30 Island\n20 Sky Pike', 'livre');
  await page.goto(base + '#/mesa');
  await page.click('[data-mana]');
  await page.fill('#mesa-seed', '4');
  await page.click('#mesa-start');
  await page.waitForSelector('#tb-keep'); await page.click('#tb-keep');
  await toMyMain(page);
  await drawUntil(page, 'Sky Pike');
  // segurar uma carta da mão
  const carta = handCard(page, 'Sky Pike');
  const box = await carta.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForSelector('#tb-peek', { state: 'attached', timeout: 3000 });
  const peek = await page.innerText('#tb-peek');
  assert.match(peek, /Sky Pike/); assert.match(peek, /2\/1/, 'P/T no espiar');
  assert.match(peek, /Creature/); assert.match(peek, /mão/);
  assert.match(peek, /Pode agora:/); assert.match(peek, /Conjurar/, 'a ação legal aparece como chip');
  assert.equal(await page.locator('.ds-dialog').count(), 0, 'espiar não abre a folha');
  await page.mouse.up();
  await page.waitForFunction(() => !document.querySelector('#tb-peek'));
  await page.waitForTimeout(150);
  assert.equal(await page.locator('.ds-dialog').count(), 0, 'soltar não vira toque simples');
  // toque curto: a folha com os mesmos botões
  await carta.click();
  await page.waitForSelector('.ds-dialog');
  assert.match(await page.innerText('.ds-dialog'), /Conjurar/);
  await page.keyboard.press('Escape');
  // no campo: segurar mostra P/T, estado e o texto
  await drawUntil(page, 'Island'); await handCard(page, 'Island').click(); await page.click('text=Jogar terreno');
  await handCard(page, 'Sky Pike').click(); await page.click('.ds-dialog >> text=Conjurar');
  for (let i = 0; i < 4 && await page.locator('#tb-stack').count(); i++) await page.click('#tb-pass');
  if (await page.locator('#tb-adj-done').count()) await page.click('#tb-adj-done');
  const campo = page.locator('.tb-side--me [data-zone="permanents"] .tb-card[aria-label^="Sky Pike"]').first();
  await page.waitForTimeout(300);                                  // deixa o movimento de entrada terminar
  // U7 · a faixa de quem joga desce o campo ~50px: num 390×844 a carta cai atrás da doca da mão; a pessoa rola, o teste também
  await campo.evaluate(el => el.scrollIntoView({ block: 'center' }));
  const b2 = await campo.boundingBox();
  await page.mouse.move(b2.x + b2.width / 2, b2.y + b2.height / 2); await page.mouse.down();
  await page.waitForSelector('#tb-peek', { state: 'attached', timeout: 3000 });
  const peek2 = await page.innerText('#tb-peek');
  assert.match(peek2, /campo/); assert.match(peek2, /enjoo/, 'o estado aparece no espiar');
  await page.mouse.up();
  await page.waitForFunction(() => !document.querySelector('#tb-peek'));
  // a pilha de terrenos também espia
  const ilha = page.locator('.tb-side--me [data-zone="lands"] .tb-card').first();
  await ilha.evaluate(el => el.scrollIntoView({ block: 'center' }));   // a faixa de terrenos fica atrás do painel fixo de baixo
  const b3 = await ilha.boundingBox();
  await page.mouse.move(b3.x + b3.width / 2, b3.y + b3.height / 2); await page.mouse.down();
  await page.waitForSelector('#tb-peek', { state: 'attached', timeout: 3000 });
  assert.match(await page.innerText('#tb-peek'), /Island/);
  await page.mouse.up();
  await page.waitForFunction(() => !document.querySelector('#tb-peek'));
  assert.deepEqual(errors, []);
});

test('e2e · A14 a pilha explicada: cartões com quem, o que faz e alvo; prioridade; recusa com motivo; registro em linha do tempo', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  // Counterspell na mão do outro faz a pilha esperar: com resposta possível, ninguém passa sozinho
  await createDeck(page, base, 'Magos', '10 Island\n10 Prodigal Sorcerer\n20 Counterspell', 'livre');
  await page.goto(base + '#/mesa');
  await page.click('[data-opponent="hotseat"]');
  await page.fill('#mesa-me', 'Ana'); await page.fill('#mesa-them', 'Bia');
  await page.click('[data-mana]');
  await page.fill('#mesa-seed', '4');
  await page.click('#mesa-start');
  await page.waitForSelector('#tb-keep'); await page.click('#tb-keep');
  await reveal(page); await page.click('#tb-keep');
  await reveal(page); await toMyMain(page);
  await drawUntil(page, 'Island'); await handCard(page, 'Island').click(); await page.click('text=Jogar terreno');

  // a criatura conjurada aparece na pilha explicada, com prioridade dita
  await drawUntil(page, 'Prodigal Sorcerer');
  await handCard(page, 'Prodigal Sorcerer').click();
  await page.click('.ds-dialog >> text=Conjurar');
  // quem conjurou é "eu" daqui em diante (o estado diz, sem depender de quem segura o aparelho)
  const eu = await page.evaluate(() => { const s = window.__estanteMesa.estado(); const oid = s.stack.find(o => s.objects[o].name === 'Prodigal Sorcerer'); return s.players[s.objects[oid].controller].name; });
  const outro = eu === 'Ana' ? 'Bia' : 'Ana';
  const meuIndice = () => page.evaluate(nome => window.__estanteMesa.estado().players.findIndex(p => p.name === nome), eu);
  await reveal(page);                                             // a prioridade foi para o outro (que tem Counterspell na mão): ele vê a pilha
  await page.waitForSelector('#tb-stack');
  const pilha = await page.innerText('#tb-stack');
  assert.match(pilha, /Pilha · 1/); assert.match(pilha, /Prodigal Sorcerer/); assert.match(pilha, new RegExp(`de ${eu}`)); assert.match(pilha, /entra no campo de batalha/); assert.match(pilha, /resolve a seguir/);
  assert.match(await page.innerText('#tb-stack-prio'), /Prioridade: (Ana|Bia)/);
  const resolve = async () => { for (let i = 0; i < 8 && await page.locator('#tb-stack').count(); i++) { await reveal(page); if (await page.locator('#tb-pass').count()) await page.click('#tb-pass'); } await reveal(page); if (await page.locator('#tb-adj-done').count()) await page.click('#tb-adj-done'); };
  await resolve();
  const minhaVez = async () => { for (let i = 0; i < 6 && !(await page.innerText('#tb-life-me')).includes(eu); i++) { await reveal(page); if (await page.locator('#tb-pass').count()) await page.click('#tb-pass'); await reveal(page); } };
  await minhaVez();
  await page.waitForSelector(`.tb-side--me [data-zone="permanents"] .tb-card[aria-label^="Prodigal Sorcerer"]`);

  // ação recusada que a folha nunca oferece: segundo terreno no turno — o motivo fica na mesa, em uma frase
  await drawUntil(page, 'Island');
  const p = await meuIndice();
  await page.evaluate(p => { const s = window.__estanteMesa.estado(); const oid = s.zones[p].hand.find(o => s.objects[o].name === 'Island'); window.__estanteMesa.act({ t: 'play_land', p, oid }); }, p);
  await page.waitForSelector('#tb-recusa');
  const recusa = await page.innerText('#tb-recusa');
  assert.match(recusa, /Não dá para jogar o terreno Island agora\./); assert.match(recusa, /Já jogou terreno neste turno\./);

  // a próxima ação válida limpa a recusa; depois o turno vai e volta, para o Prodigal perder o enjoo
  await page.click('#tb-pass-turn');
  await page.waitForFunction(() => !document.querySelector('#tb-recusa'), null, { timeout: 8000 });
  for (let i = 0; i < 120; i++) {
    await reveal(page);
    if (await page.locator(`.tb-side--me .tb-card[aria-label^="Prodigal Sorcerer"]:not([data-sick="true"])`).count() && (await page.innerText('.tb-banner')).includes('Principal 1') && (await page.innerText('#tb-life-me')).includes(eu)) break;
    if ((await page.innerText('.tb-banner')).includes('Descarte')) { await page.locator('.tb-hand .tb-card').first().click(); continue; }   // mão acima de 7 na limpeza
    if (await page.locator('#tb-no-attack').count()) await page.click('#tb-no-attack');
    else if (await page.locator('#tb-pass-turn').count()) await page.click('#tb-pass-turn');
    else if (await page.locator('#tb-pass').count()) await page.click('#tb-pass');
  }
  await page.locator('.tb-side--me .tb-card[aria-label^="Prodigal Sorcerer"]').click();
  await page.click(`.ds-dialog >> text=/Ativar \\({T}\\) → ${outro}/`);
  // E50 P6 · a habilidade não pode ser respondida por Counterspell, então ela resolve sem parar na tela; o painel
  // da pilha com ela é montado aqui com o estado real da mesa (a habilidade que acabou de ser ativada) e conferido:
  // mostra a carta de origem (não um cartão "hab.") e a linha oficial em inglês
  const painel = await page.evaluate(() => {
    const s = JSON.parse(JSON.stringify(window.__estanteMesa.estado()));
    const src = Object.values(s.objects).find(o => o.name === 'Prodigal Sorcerer' && o.zone === 'battlefield');
    s.objects.abx = { oid: 'abx', ability: true, name: 'Prodigal Sorcerer', source: src.oid, effects: s.facts['Prodigal Sorcerer'].script.abilities[0].effects, controller: src.controller, targets: [{ player: 1 - src.controller }], zone: 'stack' };
    s.stack = ['abx'];
    const p = __m18.explicaPilha(s, { oracleDe: n => n === 'Prodigal Sorcerer' ? '{T}: Prodigal Sorcerer deals 1 damage to any target.' : '' });
    const el = __m17.StackPanel({ itens: p.itens, prioridade: p.prioridade, imgOf: n => n === 'Prodigal Sorcerer' ? 'https://cards.scryfall.io/small/front/x/prodigal.png' : null });
    const it = el.querySelector('.tb-stack__card');
    return { hab: (it.querySelector('.tb-stack__hab') || {}).textContent, texto: it.textContent, img: (it.querySelector('.tb-card__face img') || {}).getAttribute ? it.querySelector('.tb-card__face img').getAttribute('src') : null, what: it.querySelector('.tb-stack__what').textContent, lang: it.querySelector('.tb-stack__what').getAttribute('lang') };
  });
  assert.equal(painel.hab, 'habilidade');
  assert.doesNotMatch(painel.texto, /hab\./);
  assert.match(String(painel.img), /prodigal\.png$/, 'a carta de origem na pilha');
  assert.match(painel.what, /deals 1 damage to any target/, 'linha oficial em inglês');
  assert.equal(painel.lang, 'en');
  assert.doesNotMatch(painel.what, /causa|dano a|-you-control/);
  await resolve();
  await page.waitForFunction(() => /19/.test(document.querySelector('#tb-life-opp').innerText + document.querySelector('#tb-life-me').innerText), null, { timeout: 8000 });

  // registro em linha do tempo: turno mais recente primeiro, fases nomeadas
  await reveal(page);
  await page.click('#tb-log');
  await page.waitForSelector('#tb-timeline');
  const turnos = await page.locator('#tb-timeline .tb-log__turn').allInnerTexts();
  assert.ok(turnos.length >= 3, 'vários turnos');
  assert.match(turnos[0], /^Turno \d+ · (Ana|Bia)/);
  assert.match(turnos.join('\n'), /Principal 1/);
  assert.match(turnos.join('\n'), /vida 20 → 19/);
  const ordem = await page.locator('#tb-timeline .tb-log__turn').evaluateAll(ts => Number(ts[0].dataset.turn) > Number(ts[1].dataset.turn));
  assert.ok(ordem, 'o mais recente vem primeiro');
  assert.doesNotMatch(await page.innerText('#tb-timeline'), /— Turno/, 'sem separadores soltos');
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
  // a lista repinta depois do toque: espera a contagem assentar antes de conferir (falha intermitente na leva 84)
  const itens = n => page.waitForFunction(k => document.querySelectorAll('#starter-list .ds-list__item').length === k, n, { timeout: 5000 }).catch(() => {});
  await page.click('[data-starter-format="commander"]'); await itens(2);
  assert.equal(await page.locator('#starter-list .ds-list__item').count(), 2, 'duas listas de Commander');
  await page.click('[data-starter-format="pauper"]'); await itens(7);
  assert.equal(await page.locator('#starter-list .ds-list__item').count(), 7, 'sete listas de Pauper');

  await page.click('[data-starter-add="Pauper Elves"]');
  await page.waitForSelector('text=já na sua estante');
  assert.equal(await page.locator('[data-starter-add="Pauper Elves"]').count(), 0, 'não oferece adicionar de novo');

  await page.click('#starter-back');
  await page.waitForSelector('#decks-list .ds-list__item');   // espera a lista pintar (antes lia enquanto ainda carregava)
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
  await page.waitForFunction(() => /\d+ de \d+ cartas guardadas/.test((document.querySelector('#mesa-offline-falta') || {}).innerText || ''), null, { timeout: 8000 }).catch(() => {});
  const falta = await page.innerText('#mesa-offline-falta');
  const m = falta.match(/(\d+) de (\d+) cartas guardadas/);
  assert.ok(m && Number(m[1]) < Number(m[2]), 'lista parcialmente guardada: ' + falta);
  await page.click('#mesa-offline-pin');
  await page.waitForFunction(() => /\d+ de \d+ cartas guardadas/.test((document.querySelector('#mesa-offline-falta') || {}).innerText || ''), null, { timeout: 10000 });
  assert.equal(await page.locator('#mesa-offline-ok').count(), 0, 'tentar de novo sem a rede saber não inventa carta');
  assert.deepEqual(errors, []);
});

/* =====================================================================
   HOMOLOGAÇÃO (28/09/2026) · bateria que cruza os épicos como uma pessoa usaria,
   em tela de celular (390×844), nos dois temas. Achados da revisão: H1…H15.
   ===================================================================== */
/** O que toda tela precisa cumprir: sem rolagem lateral, alvo de toque ≥ 44px, sem erro no console. */
async function auditaTela(page, nome) {
  await page.waitForTimeout(350);   // deixa terminar a animação de entrada de diálogos e cartas
  const r = await page.evaluate(() => {
    const vis = el => { const b = el.getBoundingClientRect(); const st = getComputedStyle(el); return b.width > 0 && b.height > 0 && st.visibility !== 'hidden' && st.display !== 'none'; };
    const pequenos = [...document.querySelectorAll('button, [role="button"], a[href], input:not([type="hidden"]):not([type="file"]):not(.ds-hidden), select, textarea, .ds-chip')]
      .filter(el => vis(el) && !el.closest('.tb-card__pills') && !el.closest('.tb-peek') && !el.classList.contains('tb-peek__acao'))
      .filter(el => el.getBoundingClientRect().height < 43.5)
      .map(el => (el.id ? '#' + el.id : '') + '.' + String(el.className).split(' ')[0] + ' «' + (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24) + '» ' + Math.round(el.getBoundingClientRect().height) + 'px');
    const larguraDoc = document.documentElement.scrollWidth, larguraTela = window.innerWidth;
    const vazou = [...document.querySelectorAll('body *')].filter(el => { if (!vis(el)) return false; const b = el.getBoundingClientRect(); if (b.right <= larguraTela + 1) return false; let p = el.parentElement; while (p) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return false; p = p.parentElement; } return true; })
      .slice(0, 5).map(el => el.tagName + '.' + String(el.className).split(' ')[0] + ' → ' + Math.round(el.getBoundingClientRect().right));
    return { pequenos, larguraDoc, larguraTela, vazou };
  });
  assert.ok(r.larguraDoc <= r.larguraTela, `${nome}: rolagem lateral (${r.larguraDoc} > ${r.larguraTela}): ${r.vazou.join(' | ')}`);
  assert.deepEqual(r.pequenos, [], `${nome}: alvos de toque abaixo de 44px`);
  assert.deepEqual(await sobreposicoes(page), [], `${nome}: texto por cima de texto ou de selo/botão`);
}

/** Leva 100 · guarda-corpo de sobreposição: nenhum texto visível pode cair por cima de outro texto nem de um selo,
    chip ou botão que não o contém. Mede o retângulo de cada linha de texto (Range), recortado pelos ancestrais com
    overflow (texto com reticências não "vaza"), e só compara o que está na mesma camada (fixa, grudada ou página).
    Sobreposição de design fica de fora pelo seletor abaixo ou por `data-sobrepoe` no elemento. */
async function sobreposicoes(page) {
  return page.evaluate(() => {
    const INTENCIONAL = '.tb-card, .tb-leque, .ds-anel, .ds-sym, .ds-card, .tb-balao, .ds-toast, [data-sobrepoe]';
    const SOLIDO = '.ds-badge, .ds-chip, .ds-btn, .ds-nav, .tb-chip, .tb-pill, .ds-btn__conta';
    const camada = el => { for (let p = el; p && p !== document.body; p = p.parentElement) { const pos = getComputedStyle(p).position; if (pos === 'fixed' || pos === 'sticky') return p; } return document.body; };
    const recorte = el => {
      let c = { l: -1e9, t: -1e9, r: 1e9, b: 1e9 };
      for (let p = el; p && p !== document.documentElement; p = p.parentElement) {
        const st = getComputedStyle(p);
        if (st.overflowX !== 'visible' || st.overflowY !== 'visible' || st.clip !== 'auto' && st.clip !== '') {
          const b = p.getBoundingClientRect(); c = { l: Math.max(c.l, b.left), t: Math.max(c.t, b.top), r: Math.min(c.r, b.right), b: Math.min(c.b, b.bottom) };
        }
      }
      return c;
    };
    const corta = (a, c) => ({ l: Math.max(a.left ?? a.l, c.l), t: Math.max(a.top ?? a.t, c.t), r: Math.min(a.right ?? a.r, c.r), b: Math.min(a.bottom ?? a.b, c.b) });
    const area = x => Math.max(0, x.r - x.l) * Math.max(0, x.b - x.t);
    const inter = (a, b) => area({ l: Math.max(a.l, b.l), t: Math.max(a.t, b.t), r: Math.min(a.r, b.r), b: Math.min(a.b, b.b) });
    const visivel = el => { for (let p = el; p; p = p.parentElement) { const st = getComputedStyle(p); if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) return false; } return el.getClientRects().length > 0; };
    const textos = [];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
      const t = w.currentNode; const el = t.parentElement;
      if (!el || !t.textContent.trim() || el.closest(INTENCIONAL) || ['SCRIPT', 'STYLE', 'OPTION', 'TEXTAREA'].includes(el.tagName) || !visivel(el)) continue;
      const c = recorte(el); const r = document.createRange(); r.selectNodeContents(t);
      // a caixa da linha inclui o espaço de ascendente e descendente da fonte: com entrelinha justa (1.05) as caixas de
      // duas linhas se tocam sem que as letras se toquem. Compara a faixa central (60%) da linha, onde fica a tinta.
      for (const rc of r.getClientRects()) { const d = rc.height * .2; const x = corta({ left: rc.left, right: rc.right, top: rc.top + d, bottom: rc.bottom - d }, c); if (area(x) > 6) textos.push({ el, x, cam: camada(el), txt: t.textContent.trim().slice(0, 24) }); }
    }
    const solidos = [...document.querySelectorAll(SOLIDO)].filter(el => !el.closest(INTENCIONAL) && visivel(el)).map(el => ({ el, x: corta(el.getBoundingClientRect(), recorte(el.parentElement || el)), cam: camada(el) }));
    // caixa do bloco de texto (independe da fonte: no aparelho a fonte é mais larga que no teste, e a caixa que
    // o layout reservou já dizia que o nome ia invadir o selo)
    const blocos = [...new Set(textos.map(t => t.el))].map(el => ({ el, x: corta(el.getBoundingClientRect(), recorte(el.parentElement || el)), cam: camada(el), txt: el.textContent.trim().slice(0, 24) }));
    const ruins = new Set();
    for (const a of blocos) for (const s of solidos) {
      if (s.cam !== a.cam || s.el.contains(a.el) || a.el.contains(s.el)) continue;
      if (inter(a.x, s.x) > 4) ruins.add(`caixa «${a.txt}» × ${s.el.className.split(' ')[0]} «${(s.el.textContent || '').trim().slice(0, 18)}»`);
    }
    for (let i = 0; i < textos.length; i++) {
      const a = textos[i];
      for (let j = i + 1; j < textos.length; j++) {
        const b = textos[j];
        if (a.cam !== b.cam || a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue;
        if (inter(a.x, b.x) > 4) ruins.add(`«${a.txt}» × «${b.txt}»`);
      }
      for (const s of solidos) {
        if (s.cam !== a.cam || s.el.contains(a.el) || a.el.contains(s.el)) continue;
        if (inter(a.x, s.x) > 4) ruins.add(`«${a.txt}» × ${s.el.className.split(' ')[0]} «${(s.el.textContent || '').trim().slice(0, 18)}»`);
      }
    }
    return [...ruins].slice(0, 12);
  });
}

test('e2e · HOMOLOGAÇÃO 1 · todas as telas, nos dois temas: sem rolagem lateral, alvos ≥ 44px e sem erro no console', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(FAKE_DEVICE(false));
  // dados para cada tela ter conteúdo de verdade
  await createDeck(page, base, 'Delver', PAUPER);
  const deckUrl = await page.evaluate(() => location.hash);
  await page.goto(base + '#/colecao'); await page.waitForSelector('#col-csv-import');
  await page.setInputFiles('#col-csv-file', { name: 'manabox.csv', mimeType: 'text/csv', buffer: Buffer.from(MANABOX) });
  await page.waitForSelector('#col-csv-add'); await page.click('#col-csv-add');
  await page.waitForSelector('.col-row[data-name="Sol Ring"]');
  const telas = [
    ['início', '#/', '#home-offline'], ['listas', '#/listas', '#decks-list'], ['listas prontas', '#/listas/prontas', '#starter-list'],
    ['editor de lista', '#/listas/editar', '#deck-text'], ['lista', deckUrl, '.deck-summary'], ['coleção · lista', '#/colecao', '.col-row'],
    ['cartas', '#/cartas', '#cards-q'], ['scanner', '#/scanner', '#scan-read'], ['preparar partida', '#/mesa', '#mesa-start'], ['catálogo', '#/ds', 'h1']
  ];
  for (const tema of ['dark', 'light']) {
    await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), tema);
    for (const [nome, url, sel] of telas) {
      await page.goto(base + url); await page.waitForSelector(sel, { timeout: 10000 });
      await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), tema);
      await page.waitForTimeout(150);
      await auditaTela(page, `${nome} (${tema})`);
    }
    // as outras visões da coleção e o painel
    await page.goto(base + '#/colecao'); await page.waitForSelector('.col-row');
    await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), tema);
    for (const v of ['galeria', 'densa', 'pilhas']) { await page.click(`[data-visao="${v}"]`); await page.waitForTimeout(150); await auditaTela(page, `coleção · ${v} (${tema})`); }
    await page.click('[data-visao="lista"]');
    await page.click('#col-filters'); await page.waitForSelector('#col-filters-body'); await auditaTela(page, `filtros (${tema})`); await page.click('#col-filters-apply');
    await page.click('#col-export'); await page.waitForSelector('#col-export-text'); await auditaTela(page, `exportar (${tema})`); await page.click('.ds-dialog button:has-text("Fechar")');
    await page.click('#col-import'); await page.waitForSelector('#col-import-text'); await auditaTela(page, `importar (${tema})`); await page.keyboard.press('Escape');
    // a mesa em andamento
    await page.goto(base + '#/mesa'); await page.fill('#mesa-seed', '4'); await page.click('#mesa-start');
    await page.waitForSelector('#tb-keep'); await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), tema);
    await auditaTela(page, `mesa · mão inicial (${tema})`);
    await page.click('#tb-keep'); await page.waitForSelector('#tb-pass');
    await auditaTela(page, `mesa · jogando (${tema})`);
    await page.click('#tb-log'); await page.waitForSelector('.ds-dialog'); await auditaTela(page, `mesa · registro (${tema})`); await page.keyboard.press('Escape');
  }
  assert.deepEqual(errors, []);
});

test('e2e · HOMOLOGAÇÃO 2 · H5 vida no Commander abre com o dano de comandante', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await createDeck(page, base, 'Cmd', 'Commander\n1 Mock Commander\n\nDeck\n99 Plains', 'commander');
  await page.goto(base + '#/mesa');
  await page.click('[data-table-format="commander"]').catch(() => {});
  await page.click('[data-opponent="hotseat"]');
  await page.fill('#mesa-seed', '3');
  await page.click('#mesa-start');
  await page.waitForSelector('#tb-keep'); await page.click('#tb-keep');
  await reveal(page); await page.click('#tb-keep');
  await reveal(page); await page.waitForSelector('#tb-life-opp');
  for (let i = 0; i < 6 && !(await page.locator('#tb-pass').count()); i++) await reveal(page);
  await page.click('#tb-life-opp');
  await page.waitForSelector('.ds-dialog', { timeout: 4000 });
  assert.match(await page.innerText('.ds-dialog'), /\+1 de dano de comandante \(Mock Commander\)/, 'o diálogo abre (antes: TypeError)');
  await page.click('.ds-dialog >> text=/\\+1 de dano de comandante/');
  await page.waitForFunction(() => !document.querySelector('.ds-dialog'));
  assert.deepEqual(errors, []);
});

test('e2e · M13 comandante que sai do campo: a mesa pergunta e leva para a zona de comando', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await createDeck(page, base, 'Cmd', 'Commander\n1 Mock Commander\n\nDeck\n99 Plains', 'commander');
  await page.goto(base + '#/mesa');
  await page.click('[data-table-format="commander"]').catch(() => {});
  await page.click('[data-opponent="hotseat"]');
  await page.fill('#mesa-seed', '3');
  await page.click('#mesa-start');
  await page.waitForSelector('#tb-keep'); await page.click('#tb-keep');
  await reveal(page); await page.click('#tb-keep');
  await reveal(page);
  for (let i = 0; i < 6 && !(await page.locator('#tb-pass').count()); i++) await reveal(page);
  // o comandante de quem tem a prioridade entra e morre (ajuste da mesa assistida)
  const oid = await page.evaluate(() => {
    const M = window.__estanteMesa, s = M.estado(), p = s.turn.priority;
    const c = Object.values(s.objects).find(o => o.commander && o.owner === p);
    M.act({ t: 'move', p, oid: c.oid, to: 'battlefield' });
    M.act({ t: 'move', p, oid: c.oid, to: 'graveyard' });
    return c.oid;
  });
  for (let i = 0; i < 3 && !(await page.locator('#tb-cmd-home').count()); i++) await reveal(page);
  await page.waitForSelector('#tb-cmd-home', { timeout: 4000 });
  assert.match(await page.innerText('body'), /Mock Commander saiu do campo/);
  assert.match(await page.innerText('#tb-cmd-stay'), /Deixar no cemitério/);
  const alvo = await page.locator('#tb-cmd-home').boundingBox();
  assert.ok(alvo.height >= 44, 'alvo de toque');
  await page.click('#tb-cmd-home');
  await page.waitForFunction(o => window.__estanteMesa.estado().objects[o].zone === 'command', oid);
  assert.equal(await page.locator('#tb-cmd-home').count(), 0, 'a pergunta some');
  assert.equal(await page.evaluate(() => window.__estanteMesa.estado().pending), null);
  assert.deepEqual(errors, []);
});

test('e2e · HOMOLOGAÇÃO 3 · H2 link com vários critérios e "&" sobrevive a recarregar; H6 sair da coleção não sequestra o endereço', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.goto(base + '#/colecao'); await page.waitForSelector('#col-csv-import');
  await page.setInputFiles('#col-csv-file', { name: 'manabox.csv', mimeType: 'text/csv', buffer: Buffer.from(MANABOX) });
  await page.waitForSelector('#col-csv-add'); await page.click('#col-csv-add');
  await page.waitForSelector('.col-row[data-name="Sol Ring"]');
  await page.fill('#col-filter', 'Sol & Co');
  await page.fill('#col-filter', 'sol');
  await page.click('#col-filters'); await page.waitForSelector('#col-filters-body');
  await page.click('[data-edicao="cmm"]'); await page.click('[data-acabamento="foil"]'); await page.click('#col-filters-apply');
  await page.waitForFunction(() => document.querySelectorAll('.col-row').length === 1);
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('.col-row').length === 1);
  assert.equal(await page.inputValue('#col-filter'), 'sol', 'texto volta');
  // U2 (leva 93) · expectativa mudou: o texto "Filtros (2)" virou rótulo + selo com o número (o ícone fica)
  assert.equal((await page.innerText('#col-filters .ds-btn__conta')).trim(), '2', 'edição e acabamento voltam (antes: só o primeiro critério)'); assert.match(await page.getAttribute('#col-filters', 'aria-label'), /Filtros, 2 ativo/);
  // texto com & no link
  await page.fill('#col-filter', 'a & b');
  await page.reload(); await page.waitForSelector('#col-filter');
  assert.equal(await page.inputValue('#col-filter'), 'a & b');

  // H6 · a coleção demora a buscar os dados; a pessoa sai antes; o endereço continua o da tela nova
  await page.route('https://api.scryfall.com/cards/collection', async r => { await new Promise(x => setTimeout(x, 1500)); r.fallback(); });
  await page.evaluate(() => { localStorage.clear(); });
  await page.goto(base + '#/colecao');
  await page.waitForSelector('#col-summary');
  await page.click('#nav-decks');
  await page.waitForTimeout(2200);
  assert.match(await page.evaluate(() => location.hash), /^#\/listas/, 'o endereço é o da tela aberta');
  await page.click('#nav-collection');
  await page.waitForSelector('#col-summary', { timeout: 4000 });
  assert.deepEqual(errors, []);
});

test('e2e · HOMOLOGAÇÃO 4 · H7 desfazer a importação mantém o que você mudou depois; H8 toque duplo não duplica', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(FAKE_DEVICE(true));            // a base de nomes (baixada pelo scanner) dá as sugestões das pendências
  await page.goto(base + '#/scanner');
  await page.waitForFunction(() => /Base: \d+ nomes/.test((document.querySelector('#scan-status') || {}).innerText || ''));
  await page.goto(base + '#/colecao'); await page.waitForSelector('#col-import');
  await page.click('#col-import'); await page.waitForSelector('#col-import-text');
  await page.fill('#col-import-text', '2 Island');
  await page.click('#col-import-check'); await page.waitForSelector('#col-import-run'); await page.click('#col-import-run');
  await page.waitForSelector('.col-row[data-name="Island"]');
  await page.click('#col-undo-ok');
  // segunda importação, com um nome desconhecido e um que soma
  await page.click('#col-import'); await page.waitForSelector('#col-import-text');
  await page.fill('#col-import-text', '3 Island\n1 Counterspel\n1 Xyzzy');
  await page.click('#col-import-check'); await page.waitForSelector('#col-import-run');
  await page.dblclick('#col-import-run');                                       // H8 · toque duplo
  await page.waitForFunction(() => /5/.test(document.querySelector('.col-row[data-name="Island"] .col-row__n').innerText));
  await page.waitForTimeout(300);
  assert.equal(await page.innerText('.col-row[data-name="Island"] .col-row__n'), '5', 'somou uma vez só');
  // edição depois da importação: +1 na Island e resolver a pendência com toque duplo
  await page.click('.col-row[data-name="Island"] button[aria-label^="Uma cópia a mais"]');
  await page.waitForFunction(() => document.querySelector('.col-row[data-name="Island"] .col-row__n').innerText === '6');
  await page.click('#col-pending-open'); await page.waitForSelector('#col-pending-list');
  await page.click('[data-pending="0"] [data-sugestao="Counterspell"]');
  await page.dblclick('[data-resolve="0"]');
  await page.waitForSelector('.col-row[data-name="Counterspell"]');
  await page.waitForTimeout(300);
  assert.equal(await page.innerText('.col-row[data-name="Counterspell"] .col-row__n'), '1', 'resolveu uma vez só');
  assert.match(await page.innerText('.ds-dialog'), /Pendências · 1/, 'a outra pendência (Xyzzy) não foi apagada junto');
  await page.keyboard.press('Escape');
  // desfazer: tira só as 3 Island da importação; o +1 e a Counterspell resolvida ficam
  await page.click('#col-undo-btn');
  await page.waitForFunction(() => document.querySelector('.col-row[data-name="Island"] .col-row__n').innerText === '3');
  assert.equal(await page.locator('.col-row[data-name="Counterspell"]').count(), 1, 'a pendência resolvida depois continua');
  assert.equal((await page.innerText('#col-pending')).trim(), '', 'a pendência que veio da importação saiu junto');
  assert.deepEqual(errors, []);
});

test('e2e · HOMOLOGAÇÃO 5 · partida inteira contra o Shark até o fim, sem travar nem erro', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await createDeck(page, base, 'Delver', PAUPER);
  await page.goto(base + '#/mesa');
  await page.fill('#mesa-seed', '31');
  await page.click('[data-opponent="shark"]');
  await page.waitForSelector('#mesa-bot-deck');
  await page.waitForFunction(() => { const c = document.querySelector('[data-mode="full"]'); return c && !c.disabled; }, null, { timeout: 8000 });
  await page.click('[data-mode="full"]');
  await page.click('#mesa-start');
  await page.waitForSelector('#tb-keep'); await page.click('#tb-keep');
  let turnoMax = 0;
  for (let i = 0; i < 900; i++) {
    if (await page.locator('#tb-new').count()) break;                              // partida acabou
    const b = await page.innerText('.tb-banner').catch(() => '');
    const m = (await page.innerText('.tb-steps__head').catch(() => '')).match(/Turno (\d+)/); if (m) turnoMax = Math.max(turnoMax, +m[1]);
    if (/Descarte/.test(b)) { await page.locator('.tb-hand .tb-card').first().click(); continue; }
    if (await page.locator('#tb-no-block').count()) { await page.click('#tb-no-block'); continue; }
    if (await page.locator('#tb-attack:not([disabled])').count() && await page.locator('.tb-side--me .tb-card[data-eligible="true"]').count()) {
      await page.locator('.tb-side--me .tb-card[data-eligible="true"]').first().click(); await page.click('#tb-attack'); continue;
    }
    if (await page.locator('#tb-no-attack').count()) { await page.click('#tb-no-attack'); continue; }
    // joga um terreno quando dá, para a partida andar
    const terreno = page.locator('.tb-hand .tb-card[aria-label^="Island"]').first();
    if (/Principal 1/.test(b) && await terreno.count() && !(await page.evaluate(() => window.__jogouTerreno === document.querySelector('.tb-steps__head').innerText))) {
      await page.evaluate(() => { window.__jogouTerreno = document.querySelector('.tb-steps__head').innerText; });
      await terreno.click(); if (await page.locator('.ds-dialog >> text=Jogar terreno').count()) { await page.click('.ds-dialog >> text=Jogar terreno'); continue; } await page.keyboard.press('Escape');
    }
    if (await page.locator('#tb-pass-turn').count()) { await page.click('#tb-pass-turn'); continue; }
    if (await page.locator('#tb-pass').count()) { await page.click('#tb-pass'); continue; }
    if (await page.locator('#tb-pay').count()) { await page.click('#tb-decline').catch(() => page.click('#tb-pay')); continue; }
    if (await page.locator('#tb-adj-done').count()) { await page.click('#tb-adj-done'); continue; }
    await page.waitForTimeout(50);
  }
  assert.ok(turnoMax >= 6, `a partida andou (turno ${turnoMax})`);
  await page.click('#tb-log'); await page.waitForSelector('#tb-timeline');
  assert.match(await page.innerText('#tb-timeline'), /Shark/);
  assert.deepEqual(errors, []);
});

// U2 (leva 92) · ícones do app, botões com profundidade e CTAs enxutos. Mede o que foi prometido:
// nenhum emoji em botão, todo ícone é SVG escondido do leitor de tela com nome acessível no botão,
// rótulos de até 3 palavras fora de diálogos, alvos ≥ 44px, botão afunda ao toque (e não se mexe com
// movimento reduzido), a barra marca onde você está, e as ferramentas da mesa dividem a linha com a vez.
test('e2e · U2 ícones, profundidade e CTAs enxutos: barra, início e topo da mesa', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await page.setViewportSize({ width: 360, height: 780 });
  const EMOJI = /[\p{Extended_Pictographic}☀-➿\u{1F300}-\u{1FAFF}]/u;
  const audita = sel => page.$$eval(sel, (els, rx) => {
    const EM = new RegExp(rx, 'u');
    const vis = el => { const b = el.getBoundingClientRect(); const st = getComputedStyle(el); return b.width > 0 && b.height > 0 && st.visibility !== 'hidden' && st.display !== 'none'; };
    return els.filter(vis).map(el => {
      const rot = [...el.querySelectorAll('.ds-btn__rotulo, .ds-nav__rotulo, .ds-atalho__rotulo')].map(x => x.textContent.trim()).join(' ') || (el.querySelector('svg') ? '' : el.textContent.trim());
      const svgs = [...el.querySelectorAll('svg')];
      return { id: el.id, nome: (el.getAttribute('aria-label') || el.textContent).trim(), palavras: rot ? rot.split(/\s+/).length : 0, emoji: EM.test(el.textContent),
        svgOculto: svgs.every(s => s.closest('[aria-hidden="true"]')), svgs: svgs.length, alto: Math.round(el.getBoundingClientRect().height), largo: Math.round(el.getBoundingClientRect().width) };
    });
  }, EMOJI.source);
  const confere = (lista, onde, { maxPalavras = 3 } = {}) => {
    assert.ok(lista.length, `${onde}: nada para auditar`);
    for (const b of lista) {
      assert.ok(b.nome, `${onde}: botão sem nome acessível (${b.id})`);
      assert.equal(b.emoji, false, `${onde}: emoji em botão (${b.id} «${b.nome}»)`);
      assert.ok(b.svgOculto, `${onde}: ícone exposto ao leitor de tela (${b.id})`);
      assert.ok(b.palavras <= maxPalavras, `${onde}: rótulo longo (${b.id}: ${b.palavras} palavras)`);
      assert.ok(b.alto >= 44 && b.largo >= 44, `${onde}: alvo pequeno (${b.id} ${b.largo}×${b.alto})`);
    }
  };
  // início: barra e atalhos, todos com ícone
  await page.goto(base + '#/'); await page.waitForSelector('#home-atalhos');
  const barra = await audita('.ds-appbar button'); confere(barra, 'barra');
  assert.ok(barra.filter(b => ['nav-play', 'nav-decks', 'nav-collection', 'theme-toggle'].includes(b.id)).every(b => b.svgs >= 1), 'destinos da barra têm ícone');
  const atalhos = await audita('#home-atalhos button'); confere(atalhos, 'atalhos', { maxPalavras: 1 });
  assert.deepEqual(atalhos.map(a => a.id), ['go-play', 'go-decks', 'go-collection', 'go-scanner', 'go-cards']);
  assert.ok(atalhos.every(a => a.svgs === 1), 'cada atalho tem um ícone');
  confere(await audita('#home button'), 'início inteiro');
  // atalho principal ocupa a largura toda; os outros, duas colunas lado a lado
  const caixa = id => page.locator(id).boundingBox();
  const [jogar, listas, colecao] = [await caixa('#go-play'), await caixa('#go-decks'), await caixa('#go-collection')];
  assert.ok(jogar.width > listas.width * 1.8, 'Jogar em destaque, largura toda');
  assert.ok(Math.abs(listas.y - colecao.y) < 2 && colecao.x > listas.x + listas.width - 1, 'Listas e Coleção na mesma linha');
  // nada marcado na barra no início; marcado ao entrar
  assert.equal(await page.locator('.ds-appbar [aria-current="page"]').count(), 0);
  // profundidade: em repouso tem sombra; pressionado afunda (encolhe e sombra interna); solto, volta
  const estilo = sel => page.$eval(sel, el => ({ sombra: getComputedStyle(el).boxShadow, transf: getComputedStyle(el).transform }));
  const repouso = await estilo('#go-decks');
  assert.notEqual(repouso.sombra, 'none', 'botão em repouso tem sombra'); assert.equal(repouso.transf, 'none');
  const bx = await caixa('#go-decks');
  await page.mouse.move(bx.x + 20, bx.y + 20); await page.mouse.down(); await page.waitForTimeout(200);
  const apertado = await estilo('#go-decks');
  assert.match(apertado.sombra, /inset/, 'pressionado: sombra interna');
  const escala = Number((apertado.transf.match(/matrix\(([^,]+)/) || [])[1]);
  assert.ok(escala > 0.9 && escala < 1, 'pressionado: encolhe um pouco (' + apertado.transf + ')');
  await page.mouse.move(bx.x - 40, bx.y - 40); await page.mouse.up(); await page.waitForTimeout(200);
  assert.equal((await estilo('#go-decks')).transf, 'none', 'solto: volta');
  // movimento reduzido: afunda só na sombra, sem se mexer
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.mouse.move(bx.x + 20, bx.y + 20); await page.mouse.down();
  const reduzido = await estilo('#go-decks');
  assert.equal(reduzido.transf, 'none', 'movimento reduzido: sem deslocamento'); assert.match(reduzido.sombra, /inset/);
  await page.mouse.move(bx.x - 40, bx.y - 40); await page.mouse.up();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  // fantasma não tem sombra (não compete com a ação principal)
  assert.equal((await estilo('#go-ds')).sombra, 'none');
  // barra marca o destino atual
  await page.click('#nav-collection'); await page.waitForSelector('#nav-collection[aria-current="page"]');
  assert.equal(await page.locator('.ds-appbar [aria-current="page"]').count(), 1);
  await page.click('#nav-decks'); await page.waitForSelector('#nav-decks[aria-current="page"]');
  // mesa: prepara uma partida contra o goldfish
  await page.goto(base + '#/listas/prontas'); await page.waitForSelector('#starter-list');
  await page.click('[data-starter-format="pauper"]'); await page.click('[data-starter-add="Pauper Elves"]');
  await page.waitForFunction(() => !document.querySelector('[data-starter-add="Pauper Elves"]'));
  await page.goto(base + '#/mesa'); await page.waitForSelector('#mesa-start');
  assert.equal(await page.getAttribute('#nav-play', 'aria-current'), 'page', 'preparar partida conta como Jogar');
  await page.fill('#mesa-seed', '7'); await page.click('#mesa-start'); await page.waitForSelector('#tb-keep');
  // mão inicial: a faixa usa o ícone da mão, não o emoji
  assert.equal(await page.locator('#tb-vez .tb-vez__avatar svg').count(), 1);
  assert.equal(EMOJI.test(await page.innerText('#tb-vez')), false, 'faixa sem emoji');
  await page.click('#tb-keep'); await page.waitForSelector('#tb-pass');
  assert.equal(await page.getAttribute('#nav-play', 'aria-current'), 'page', 'a partida também conta como Jogar');
  const ferramentas = await audita('.tb-top__actions button'); confere(ferramentas, 'topo da mesa', { maxPalavras: 0 });
  assert.deepEqual(ferramentas.map(f => f.id), ['tb-undo', 'tb-log', 'tb-concede']);
  assert.deepEqual(ferramentas.map(f => f.nome), ['Desfazer', 'Registro da partida', 'Desistir']);
  await page.waitForTimeout(400); // a faixa entra com animação de 300ms
  const [vez, desistir] = [await caixa('#tb-vez'), await caixa('#tb-concede')];
  assert.ok(Math.abs((vez.y + vez.height / 2) - (desistir.y + desistir.height / 2)) < 4, 'ferramentas na mesma linha da faixa de vez');
  assert.ok(desistir.x + desistir.width <= 360, 'cabem na tela de 360');
  // desistir continua pedindo confirmação; cancelar não encerra a partida
  await page.click('#tb-concede'); await page.waitForSelector('.ds-dialog');
  assert.match(await page.innerText('.ds-dialog'), /Desistir da partida\?/);
  await page.click('.ds-dialog >> text=Cancelar'); await page.waitForSelector('.ds-dialog', { state: 'detached' });
  assert.notEqual(await page.evaluate(() => window.__estanteMesa.estado().status), 'over');
  await page.click('#tb-log'); await page.waitForSelector('#tb-timeline'); await page.keyboard.press('Escape');
  assert.deepEqual(errors, []);
});

// U2 parte 2 (leva 93) · listas, listas prontas, lista, editor e coleção: ícones, ações enxutas e tudo cabendo em 360.
test('e2e · U2 parte 2 listas e coleção: ícones, rótulos curtos, cabeçalhos numa linha, segmentado e selo de filtros', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await page.setViewportSize({ width: 360, height: 780 });
  const EMOJI = /[\p{Extended_Pictographic}☀-➿]/u;
  // conteúdo (item de lista, carta) não é chamada para ação: fica fora da contagem de palavras
  const audita = async onde => {
    await page.waitForTimeout(350);
    const r = await page.evaluate(rx => {
      const EM = new RegExp(rx, 'u');
      const vis = el => { const b = el.getBoundingClientRect(); const st = getComputedStyle(el); return b.width > 0 && b.height > 0 && st.visibility !== 'hidden' && st.display !== 'none'; };
      const botoes = [...document.querySelectorAll('main button')].filter(el => vis(el) && !el.closest('.ds-dialog'));
      return {
        largura: document.documentElement.scrollWidth,
        ruins: botoes.map(el => {
          const conteudo = el.matches('.ds-list__item, .col-row__nome, .col-row__n, .deck-slot button, .ds-card, [data-dash], .deck-curve__col');
          const rot = [...el.querySelectorAll('.ds-btn__rotulo, .ds-chip__rotulo, .ds-atalho__rotulo')].map(x => x.textContent.trim()).join(' ') || (el.querySelector('svg') ? '' : el.textContent.trim());
          const nome = (el.getAttribute('aria-label') || el.textContent).trim();
          const probs = [];
          if (!nome) probs.push('sem nome');
          if (EM.test(el.textContent)) probs.push('emoji');
          if (!conteudo && rot && rot.split(/\s+/).length > 3) probs.push('rótulo longo');
          if (![...el.querySelectorAll('svg')].every(s => s.closest('[aria-hidden="true"]'))) probs.push('ícone exposto');
          if (el.getBoundingClientRect().height < 43.5) probs.push('alvo ' + Math.round(el.getBoundingClientRect().height));
          return probs.length ? `${el.id || el.className.split(' ')[0]} «${nome.slice(0, 30)}»: ${probs.join(', ')}` : null;
        }).filter(Boolean)
      };
    }, EMOJI.source);
    assert.ok(r.largura <= 360, `${onde}: rolagem lateral (${r.largura})`);
    assert.deepEqual(r.ruins, [], onde);
  };
  const temIcone = async sel => assert.equal(await page.locator(`${sel} svg`).count(), 1, `${sel} com ícone`);
  const caixa = sel => page.locator(sel).first().boundingBox();
  const mesmaLinha = async (a, b, msg) => { const [x, y] = [await caixa(a), await caixa(b)]; assert.ok(y.y < x.y + x.height && y.y + y.height > x.y, msg); };

  // listas vazia
  await page.goto(base + '#/listas'); await page.waitForSelector('#decks-starter-empty');
  await temIcone('#decks-starter-empty'); await audita('listas vazia');
  // prontas: voltar acima do título
  await page.goto(base + '#/listas/prontas'); await page.waitForSelector('#starter-list');
  assert.ok((await caixa('#starter-back')).y + 20 < (await caixa('main h1')).y, 'voltar acima do título');
  await temIcone('#starter-back'); await audita('listas prontas');
  await page.click('[data-starter-format="pauper"]'); await page.click('[data-starter-add="Pauper Elves"]');
  await page.waitForFunction(() => !document.querySelector('[data-starter-add="Pauper Elves"]'));
  // listas: Prontas e Nova na linha do título, com ícone; item com seta
  await page.goto(base + '#/listas'); await page.waitForSelector('#decks-list .ds-list__item');
  await temIcone('#deck-starter'); await temIcone('#deck-new'); await temIcone('#decks-backup-export'); await temIcone('#decks-backup-restore');
  await mesmaLinha('main h1', '#deck-new', 'Nova na linha do título');
  assert.equal(await page.locator('#decks-list .ds-list__item .ds-list__seta svg').count(), 1);
  await audita('listas');
  // lista: editar, exportar e excluir (ícone) na mesma linha; excluir confirma; marcar alterna
  await page.click('#decks-list .ds-list__item'); await page.waitForSelector('.deck-summary');
  await temIcone('#deck-edit'); await temIcone('#deck-export'); await temIcone('#deck-delete');
  await mesmaLinha('#deck-edit', '#deck-delete', 'excluir ao lado de editar');
  assert.equal(await page.getAttribute('#deck-delete', 'aria-label'), 'Excluir lista');
  await page.click('#deck-delete'); await page.waitForSelector('.ds-dialog');
  await page.click('.ds-dialog >> text=Cancelar'); await page.waitForSelector('.ds-dialog', { state: 'detached' });
  assert.equal(await page.locator('.deck-summary').count(), 1, 'cancelar não exclui');
  await page.click('#deck-mark'); await page.waitForSelector('#deck-mark[aria-pressed="true"]');
  await temIcone('#deck-mark'); await audita('lista (marcando)');
  await page.click('#deck-mark');
  // editor
  await page.goto(base + '#/listas/editar'); await page.waitForSelector('#deck-text');
  assert.equal(await page.getAttribute('[data-ownall]', 'aria-label'), 'Já tenho todas as cartas desta lista', 'nome falado completo');
  await audita('editor');
  // coleção vazia e com cartas
  await page.goto(base + '#/colecao'); await page.waitForSelector('#col-import');
  await audita('coleção vazia');
  await page.click('#col-import'); await page.fill('#col-import-text', '1 Sol Ring\n2 Counterspell');
  await page.click('#col-import-check'); await page.waitForSelector('#col-import-run'); await page.click('#col-import-run');
  await page.waitForSelector('.col-row[data-name="Counterspell"]'); await page.waitForTimeout(300);
  await mesmaLinha('main h1', '#col-scan', 'Escanear na linha do título'); await mesmaLinha('main h1', '#col-search', 'Buscar na linha do título');
  assert.equal(await page.getAttribute('#col-search', 'aria-label'), 'Buscar cartas');
  assert.equal(await page.locator('#col-summary .ds-nowrap').count(), 2, 'contagens sem quebra no meio');
  for (const id of ['#col-import', '#col-csv-import', '#col-export', '#col-select', '#col-filters', '#col-add-btn']) await temIcone(id);
  // as quatro ações em duas colunas
  await mesmaLinha('#col-import', '#col-csv-import', 'Colar lista e Abrir CSV lado a lado');
  await mesmaLinha('#col-export', '#col-select', 'Exportar e Selecionar lado a lado');
  // visões: segmentado numa linha só, com ícone em cada parte
  const visoes = await page.$$eval('.ds-segmentado [data-visao]', els => els.map(e => ({ y: Math.round(e.getBoundingClientRect().y), svg: !!e.querySelector('svg'), dir: Math.round(e.getBoundingClientRect().right) })));
  assert.equal(visoes.length, 4); assert.ok(visoes.every(v => v.y === visoes[0].y && v.svg && v.dir <= 360), 'quatro visões numa linha: ' + JSON.stringify(visoes));
  // − e + viraram ícones; a lixeira tem nome falado com a carta
  const linha = '.col-row[data-name="Counterspell"]';
  assert.equal(await page.locator(`${linha} button[aria-label^="Uma cópia a"] svg`).count(), 2);
  assert.equal(await page.locator(`${linha} button[aria-label="Remover Counterspell"] svg`).count(), 1);
  await page.click(`${linha} button[aria-label^="Uma cópia a mais"]`);
  await page.waitForFunction(() => document.querySelector('.col-row[data-name="Counterspell"] .col-row__n').textContent.trim() === '3');
  await audita('coleção');
  // selo de filtros: o ícone fica e o número aparece ao lado
  assert.equal(await page.isHidden('#col-filters .ds-btn__conta'), true, 'sem filtro, sem selo');
  await page.click('#col-filters'); await page.waitForSelector('#col-filters-body');
  await page.locator('#col-filters-body [data-tipo]').first().click(); await page.click('#col-filters-apply');
  await page.waitForSelector('.ds-dialog', { state: 'detached' });
  assert.equal((await page.innerText('#col-filters .ds-btn__conta')).trim(), '1');
  await temIcone('#col-filters');
  assert.match(await page.getAttribute('#col-filters', 'aria-label'), /Filtros, 1 ativo/);
  // seleção: sair é ícone com nome falado
  await page.click('#col-select'); await page.waitForSelector('#col-select-off');
  assert.equal(await page.getAttribute('#col-select-off', 'aria-label'), 'Sair da seleção');
  await temIcone('#col-select-all'); await audita('coleção (selecionando)');
  await page.click('#col-select-off');
  assert.deepEqual(errors, []);
});

// E50 (leva 94) · todo diálogo tem um X fixo no topo; o ícone do app na barra é um ladrilho com relevo.
test('e2e · E50 X no topo de todo diálogo (fixo ao rolar, fecha, foco não vai para ele) e ícone da barra com relevo', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(base + '#/'); await page.waitForSelector('#home-atalhos');
  // ícone da barra: ladrilho com sombra em repouso, afunda no toque
  const tile = await page.$eval('.ds-appbar .brand-tile', el => ({ sombra: getComputedStyle(el).boxShadow, svg: !!el.querySelector('svg'), h: el.getBoundingClientRect().height }));
  assert.ok(tile.svg && tile.sombra !== 'none' && tile.h >= 30, JSON.stringify(tile));
  assert.match(await page.$eval('link[rel="icon"]', l => l.href), /^data:image\/svg\+xml,/);
  // diálogo longo: a folha de uma carta na lista
  await createDeck(page, base, 'Longa', PAUPER);
  await page.setViewportSize({ width: 360, height: 380 }); // tela baixa: a folha da carta precisa rolar
  await page.locator('.deck-slot').first().click(); await page.waitForSelector('.ds-dialog'); await page.waitForTimeout(350); // animação de entrada
  assert.ok(await page.$eval('.ds-dialog', el => el.scrollHeight > el.clientHeight + 40), 'o diálogo rola nesta tela');
  const x = page.locator('#ds-dialog-close');
  assert.equal(await x.getAttribute('aria-label'), 'Fechar');
  assert.equal(await x.locator('svg').count(), 1, 'X desenhado');
  const cx = await x.boundingBox(); assert.ok(cx.height >= 44 && cx.width >= 44, 'alvo de 44px');
  const topo = await page.locator('.ds-dialog').boundingBox();
  assert.ok(cx.y < topo.y + 70, 'X no topo do diálogo');
  assert.equal(await page.evaluate(() => document.activeElement.id), '', 'o foco inicial não vai para o X');
  assert.notEqual(await page.evaluate(() => document.activeElement.id), 'ds-dialog-close');
  // rola o diálogo: o X continua visível, na mesma posição da tela
  await page.$eval('.ds-dialog', el => { el.scrollTop = 400; el.dispatchEvent(new Event('scroll')); });
  await page.waitForTimeout(100);
  const cx2 = await x.boundingBox();
  assert.ok(Math.abs(cx2.y - cx.y) < 2, 'X fixo ao rolar: ' + cx.y + ' → ' + cx2.y);
  assert.equal(await page.getAttribute('.ds-dialog__head', 'data-rolou'), 'true', 'cabeçalho marca que rolou');
  await x.click(); await page.waitForSelector('.ds-dialog', { state: 'detached' });
  // diálogo curto de confirmação também tem o X, e ele não confirma nada
  await page.click('#deck-delete'); await page.waitForSelector('.ds-dialog');
  await page.click('#ds-dialog-close'); await page.waitForSelector('.ds-dialog', { state: 'detached' });
  assert.equal(await page.locator('.deck-summary').count(), 1, 'fechar pelo X não exclui');
  assert.deepEqual(errors, []);
});

// E50 P4 · o momento e a dica da bandeja: cortados em 360, viram botão que abre um balão com o texto inteiro.
test('e2e · E50 balão da bandeja: texto cortado marca, um toque abre o balão inteiro por cima, X ou toque fora fecham', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(base + '#/listas/prontas'); await page.waitForSelector('#starter-list');
  await page.click('[data-starter-format="pauper"]'); await page.click('[data-starter-add="Pauper Elves"]');
  await page.waitForFunction(() => !document.querySelector('[data-starter-add="Pauper Elves"]'));
  await page.goto(base + '#/mesa'); await page.waitForSelector('#mesa-start'); await page.fill('#mesa-seed', '7'); await page.click('#mesa-start');
  await page.waitForSelector('#tb-keep'); await page.waitForTimeout(400);
  const texto = page.locator('.tb-dock__bar .tb-banner__text');
  assert.equal(await texto.getAttribute('data-cortado'), 'true', 'em 360 a dica da mão inicial não cabe');
  assert.equal(await texto.getAttribute('aria-expanded'), 'false');
  assert.ok((await texto.boundingBox()).height >= 44, 'o texto é um alvo de toque');
  assert.equal(await page.locator('.tb-dock__bar .tb-banner__mais').isVisible(), true, 'indicador de que há mais');
  await texto.click();
  const balao = page.locator('.tb-dock__bar .tb-balao');
  await balao.waitFor({ state: 'visible' });
  assert.equal(await texto.getAttribute('aria-expanded'), 'true');
  const tb = await balao.innerText();
  assert.match(tb, /mão inicial/i); assert.match(tb, /Manter ou embaralhar e comprar 7 de novo\./, 'a dica inteira');
  const [bb, db] = [await balao.boundingBox(), await page.locator('#tb-dock').boundingBox()];
  assert.ok(bb.y + bb.height <= db.y + 60, 'o balão abre por cima da bandeja');
  assert.ok(bb.x >= 0 && bb.x + bb.width <= 360, 'cabe na tela');
  await balao.locator('button[aria-label="Fechar"]').click();
  await balao.waitFor({ state: 'hidden' });
  assert.equal(await texto.getAttribute('aria-expanded'), 'false');
  // toque fora também fecha
  await texto.click(); await balao.waitFor({ state: 'visible' }); await page.waitForTimeout(150);
  await page.locator('#tb-vez').click(); await balao.waitFor({ state: 'hidden' });
  // os botões da barra continuam funcionando com o balão fechado
  await page.click('#tb-keep'); await page.waitForSelector('#tb-pass');
  assert.deepEqual(errors, []);
});

// E50 P3 · ficha com imagem: a carta que cria a ficha traz os dados dela (Scryfall, tipo Token) ao preparar a partida,
// a mesa mostra a imagem da ficha e o guardião guarda ficha e imagem junto com a lista.
test('e2e · E50 fichas têm imagem: dados vêm ao preparar, a mesa mostra a ficha com figura, e ficam guardados para jogar sem internet', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  const pedidas = [];
  page.on('request', r => { if (r.url().includes('/cards/search')) pedidas.push(decodeURIComponent(new URL(r.url()).searchParams.get('q'))); });
  await createDeck(page, base, 'Pistas', '20 Plains\n10 Thraben Inspector', 'livre');
  await page.goto(base + '#/mesa');
  await page.click('[data-opponent="hotseat"]');
  await page.fill('#mesa-me', 'Ana'); await page.fill('#mesa-them', 'Bia');
  await page.click('[data-mana]');
  await page.fill('#mesa-seed', '2');
  await page.click('#mesa-start');
  await page.waitForSelector('#tb-keep');
  assert.ok(pedidas.some(q => /^!"Clue" t:token/.test(q)), 'ao preparar, a ficha foi pedida à Scryfall como token: ' + JSON.stringify(pedidas));
  await page.click('#tb-keep'); await reveal(page); await page.click('#tb-keep');
  await reveal(page); await toMyMain(page);
  await drawUntil(page, 'Thraben Inspector'); await handCard(page, 'Thraben Inspector').click(); await page.click('.ds-dialog >> text=Conjurar');
  for (let i = 0; i < 6 && await page.locator('.tb-stack').count(); i++) { await reveal(page); if (await page.locator('#tb-pass').count()) await page.click('#tb-pass'); }
  if (await page.locator('#tb-adj-done').count()) await page.click('#tb-adj-done');
  const ficha = page.locator('.tb-side--me .tb-card[aria-label^="Clue"]').first();
  await ficha.waitFor({ timeout: 8000 });
  const img = await ficha.locator('img').first().getAttribute('src');
  assert.match(String(img), /clue\.png$/, 'a ficha na mesa tem a imagem da Scryfall');
  assert.match(await ficha.getAttribute('aria-label'), /ficha/, 'continua marcada como ficha');
  // a folha da ficha abre com o texto oficial dela
  await ficha.click(); await page.waitForSelector('.ds-dialog');
  assert.match(await page.innerText('.ds-dialog'), /Sacrifice this artifact: Draw a card/);
  await page.keyboard.press('Escape');
  // a ficha ficou guardada: sem rede, o repositório responde do cache
  const guardada = await page.evaluate(async () => { const r = new Promise((res, rej) => { const q = indexedDB.open('mtg', 1); q.onsuccess = () => { const tx = q.result.transaction('kv'); const g = tx.objectStore('kv').get('card.ficha:clue'); g.onsuccess = () => res(g.result); g.onerror = rej; }; q.onerror = rej; }); return r; });
  assert.ok(guardada && guardada.card && guardada.pin, 'ficha fixada no aparelho: ' + JSON.stringify(guardada && Object.keys(guardada)));
  assert.deepEqual(errors, []);
});

// E50 P2 · a janela depois dos bloqueios: o atacante vê quem bloqueou quem, responde (remoção no bloqueador) e só
// então o dano acontece; a defensora também tem a vez de responder. Antes, o passo era pulado direto para o dano.
test('e2e · E50 janela do atacante depois dos bloqueios: quadro dos bloqueios, marcas nas cartas, resposta antes do dano', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await createDeck(page, base, 'Raios', '20 Island\n10 Sky Pike\n10 Wall Guard\n10 Lightning Bolt', 'livre');
  await page.goto(base + '#/mesa');
  await page.click('[data-opponent="hotseat"]');
  await page.fill('#mesa-me', 'Ana'); await page.fill('#mesa-them', 'Bia');
  await page.click('[data-mana]'); // mana livre
  await page.fill('#mesa-seed', '2');
  await page.click('#mesa-start');
  await page.waitForSelector('#tb-keep'); await page.click('#tb-keep');
  await reveal(page); await page.click('#tb-keep');
  const put = async name => { await drawUntil(page, name); await handCard(page, name).click(); await page.click('.ds-dialog >> text=Conjurar'); for (let i = 0; i < 4 && await page.locator('.tb-stack').count(); i++) { await reveal(page); if (await page.locator('#tb-pass').count()) await page.click('#tb-pass'); } if (await page.locator('#tb-adj-done').count()) await page.click('#tb-adj-done'); };
  await reveal(page); await toMyMain(page);
  const first = (await page.innerText('#tb-life-me')).includes('Ana') ? 'Ana' : 'Bia';
  await put(first === 'Ana' ? 'Sky Pike' : 'Wall Guard');
  // com Raios nos dois grimórios, a outra jogadora ganha paradas para responder: passa até chegar à principal da outra
  for (let i = 0; i < 12 && !(await page.locator('#tb-pass-turn').count()); i++) { await reveal(page); if (await page.locator('#tb-pass').count()) await page.click('#tb-pass'); }
  await page.click('#tb-pass-turn'); await reveal(page); await toMyMain(page);
  await put(first === 'Ana' ? 'Wall Guard' : 'Sky Pike');
  for (let i = 0; i < 16 && !(await page.locator('#tb-attack').count()); i++) {
    await reveal(page);
    if (await page.locator('#tb-no-attack').count() && !(await page.locator('.tb-side--me .tb-card[aria-label*="Sky Pike"]').count())) { await page.click('#tb-no-attack'); continue; }
    if (await page.locator('#tb-pass-turn').count()) await page.click('#tb-pass-turn'); else if (await page.locator('#tb-pass').count()) await page.click('#tb-pass');
  }
  // o atacante garante um Raio na mão antes de atacar (vai responder ao bloqueio)
  await drawUntil(page, 'Lightning Bolt');
  await page.locator('.tb-side--me .tb-card[data-eligible="true"][aria-label*="Sky Pike"]').click();
  await page.click('#tb-attack');
  // com o Raio na mão, a atacante ganha uma parada logo depois de declarar: passa; a cortina leva à defensora
  const ate = async re => { for (let i = 0; i < 10; i++) { await reveal(page); if (re.test(await page.textContent('.tb-banner'))) return; if (await page.locator('#tb-pass').count()) await page.click('#tb-pass'); else await page.waitForTimeout(100); } throw new Error('não chegou a ' + re); };
  await ate(/Declarar bloqueadores/);
  await page.locator('.tb-side--me .tb-card[data-eligible="true"][aria-label*="Wall Guard"]').click();
  await page.click('.ds-dialog >> text=Bloquear Sky Pike');
  await page.click('#tb-block');
  // a vez passa para o atacante ANTES do dano: cortina, depois o quadro dos bloqueios
  await page.waitForSelector('#tb-handoff'); await page.click('#tb-reveal');
  await page.waitForSelector('.tb-banner'); await page.waitForTimeout(200);
  const faixa = await page.textContent('.tb-banner');
  assert.match(faixa, /Bloqueios declarados/, 'o atacante vê o quadro: ' + faixa);
  assert.match(faixa, /Sky Pike ← Wall Guard/);
  assert.match(faixa, /Sua janela/);
  assert.equal(await page.locator('#tb-pass').innerText(), 'Ir ao dano');
  if (process.env.SHOTS) { await page.setViewportSize({ width: 360, height: 780 }); await page.waitForTimeout(300); await page.screenshot({ path: process.env.SHOTS + '/janela-bloqueios.png' }); await page.click('.tb-dock__bar .tb-banner__text'); await page.waitForTimeout(300); await page.screenshot({ path: process.env.SHOTS + '/janela-balao.png' }); await page.click('.tb-dock__bar .tb-banner__text'); }
  // marcas: o atacante mostra o bloqueador; o bloqueador mostra quem bloqueia
  assert.match(await page.locator('.tb-side--me .tb-card[aria-label*="Sky Pike"]').first().getAttribute('aria-label'), /← Wall Guard/);
  assert.match(await page.locator('.tb-side--opp .tb-card[aria-label*="Wall Guard"]').first().getAttribute('aria-label'), /→ Sky Pike/);
  const vidaAntes = await page.innerText('#tb-life-opp');
  // resposta: Raio no bloqueador
  await handCard(page, 'Lightning Bolt').click();
  await page.click('.ds-dialog >> text=/Conjurar → Wall Guard/');
  await page.waitForSelector('#tb-stack, #tb-handoff');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/janela-pos-raio.png' });
  await reveal(page); await page.waitForSelector('.tb-banner, #tb-resumo', { timeout: 8000 });
  if (await page.locator('#tb-resumo-ok').count()) await page.click('#tb-resumo-ok');
  const dep = await page.textContent('.tb-banner');
  assert.ok(/Pilha: Lightning Bolt|Bloqueios/.test(dep), 'depois do Raio: ' + dep);
  // a defensora responde ou passa; depois o Raio resolve e o dano de combate vem em seguida
  for (let i = 0; i < 8; i++) {
    await reveal(page);
    if (await page.locator('#tb-resumo-ok').count()) await page.click('#tb-resumo-ok');
    const b = (await page.locator('.tb-banner').count()) ? await page.textContent('.tb-banner') : '';
    if (!(await page.locator('.tb-stack').count()) && !/Bloqueios/.test(b)) break;
    if (await page.locator('#tb-pass').count()) await page.click('#tb-pass'); else await page.waitForTimeout(100);
  }
  await reveal(page);
  await page.click('#tb-log'); await page.waitForSelector('#tb-timeline');
  const log = await page.innerText('.ds-dialog');
  assert.match(log, /bloqueou: Wall Guard → Sky Pike/);
  assert.match(log, /conjurou Lightning Bolt/);
  assert.match(log, /Wall Guard morreu/, 'o bloqueador morreu (3 do Raio + 2 de combate ≥ 4)');
  assert.doesNotMatch(log, /vida 20 → 18/, 'o Sky Pike continuou bloqueado: nada passou');
  assert.equal(await page.innerText('#tb-life-opp'), vidaAntes);
  assert.deepEqual(errors, []);
});

// U2 parte 3 (leva 96) · busca de cartas, scanner, preparar partida, mesa e marcas de cobertura com ícones.
test('e2e · U2 parte 3 cartas, scanner, preparar partida e mesa: ícones, rótulos curtos, oponentes em segmentado, marcas desenhadas', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await page.setViewportSize({ width: 360, height: 780 });
  const EMOJI = /[\p{Extended_Pictographic}☀-➿×−]/u;
  const audita = async (onde, escopo = 'main button, #tb-dock button') => {
    await page.waitForTimeout(350);
    const r = await page.evaluate(([rx, sel]) => {
      const EM = new RegExp(rx, 'u');
      const vis = el => { const b = el.getBoundingClientRect(); const st = getComputedStyle(el); return b.width > 0 && b.height > 0 && st.visibility !== 'hidden' && st.display !== 'none'; };
      return { largura: document.documentElement.scrollWidth, ruins: [...document.querySelectorAll(sel)].filter(el => vis(el) && !el.closest('.ds-dialog')).map(el => {
        const conteudo = el.matches('.ds-list__item, .col-row__nome, .col-row__n, .ds-card, .tb-card, .tb-stack__card, .tb-banner__text, .tb-hand__toggle, [data-dash], .deck-curve__col, .tb-lifec, .tb-chip, .tb-zone button');
        const rot = [...el.querySelectorAll('.ds-btn__rotulo, .ds-chip__rotulo')].map(x => x.textContent.trim()).join(' ') || (el.querySelector('svg') ? '' : el.textContent.trim());
        const nome = (el.getAttribute('aria-label') || el.textContent).trim(); const probs = [];
        if (!nome) probs.push('sem nome');
        if (!conteudo && EM.test(el.textContent)) probs.push('emoji/caractere');
        if (!conteudo && rot && rot.split(/\s+/).length > 3) probs.push('rótulo longo');
        if (el.getBoundingClientRect().height < 43.5) probs.push('alvo ' + Math.round(el.getBoundingClientRect().height));
        return probs.length ? `${el.id || el.className.split(' ')[0]} «${nome.slice(0, 30)}»: ${probs.join(', ')}` : null;
      }).filter(Boolean) };
    }, [EMOJI.source, escopo]);
    assert.ok(r.largura <= 360, `${onde}: rolagem lateral (${r.largura})`);
    assert.deepEqual(r.ruins, [], onde);
  };
  const temIcone = async sel => assert.ok(await page.locator(`${sel} svg`).count() >= 1, `${sel} com ícone`);
  // busca de cartas: ações com ícone, cores em símbolo com nome falado
  await page.goto(base + '#/cartas'); await page.waitForSelector('#cards-q');
  for (const id of ['#local-import', '#local-export', '#local-clear', '#cards-search', '#cards-clear']) await temIcone(id);
  assert.deepEqual(await page.$$eval('#cards-colors [data-color]', cs => cs.map(c => [c.dataset.color, c.getAttribute('aria-label'), !!c.querySelector('.ds-sym')])),
    [['W', 'Branco', true], ['U', 'Azul', true], ['B', 'Preto', true], ['R', 'Vermelho', true], ['G', 'Verde', true]]);
  await page.click('#cards-colors [data-color="U"]'); assert.equal(await page.getAttribute('#cards-colors [data-color="U"]', 'aria-pressed'), 'true');
  await audita('cartas');
  // scanner
  await page.goto(base + '#/scanner'); await page.waitForSelector('#scan-read');
  for (const id of ['#scan-read', '#scan-lot', '#scan-undo', '#scan-colecao']) await temIcone(id);
  assert.match(await page.innerText('#scan-lot'), /Lote: 0/);
  await audita('scanner');
  // lista pronta: marcas de cobertura desenhadas, com nome falado
  await page.goto(base + '#/listas/prontas'); await page.waitForSelector('#starter-list');
  await page.click('[data-starter-format="pauper"]'); await page.click('[data-starter-add="Pauper Elves"]');
  await page.waitForFunction(() => !document.querySelector('[data-starter-add="Pauper Elves"]'));
  await page.goto(base + '#/listas'); await page.waitForSelector('#decks-list .ds-list__item'); await page.click('#decks-list .ds-list__item');
  await page.waitForSelector('.deck-slot');
  const marcas = await page.$$eval('.deck-slot__cov', els => els.map(e => ({ svg: !!e.querySelector('svg'), txt: e.textContent.trim(), nome: e.getAttribute('aria-label') })));
  assert.ok(marcas.length > 10 && marcas.every(m => m.svg && !m.txt && /^Motor: /.test(m.nome)), 'marcas desenhadas: ' + JSON.stringify(marcas.slice(0, 3)));
  assert.equal(EMOJI.test(await page.innerText('#deck-coverage')), false, 'selos de cobertura sem ✓ ◐ ✎');
  assert.ok(await page.locator('#deck-coverage .ds-badge svg').count() >= 1);
  // preparar partida
  await page.goto(base + '#/mesa'); await page.waitForSelector('#mesa-start');
  await temIcone('#mesa-start');
  const oponentes = await page.$$eval('.ds-segmentado [data-opponent]', cs => cs.map(c => ({ k: c.dataset.opponent, rot: c.querySelector('.ds-chip__rotulo').textContent, svg: !!c.querySelector('svg'), nome: c.getAttribute('aria-label'), y: Math.round(c.getBoundingClientRect().y), dir: Math.round(c.getBoundingClientRect().right) })));
  assert.deepEqual(oponentes.map(o => [o.k, o.rot]), [['goldfish', 'Goldfish'], ['shark', 'Shark'], ['hotseat', 'A dois']]);
  assert.ok(oponentes.every(o => o.svg && o.y === oponentes[0].y && o.dir <= 360), 'três oponentes numa linha, com ícone');
  assert.equal(oponentes[2].nome, 'Outra pessoa neste aparelho', 'nome falado completo');
  assert.equal(await page.getAttribute('[data-stopall]', 'aria-label'), 'Parar em todos os passos');
  await page.click('[data-opponent="hotseat"]'); await page.waitForSelector('#mesa-them');
  await page.click('[data-opponent="goldfish"]');
  await audita('preparar partida');
  // mesa
  await page.fill('#mesa-seed', '7'); await page.click('#mesa-start');
  await page.waitForSelector('#tb-keep'); await page.click('#tb-keep'); await page.waitForSelector('#tb-pass');
  await audita('mesa', 'main button');
  assert.deepEqual(errors, []);
});

// E51 · listas salvas no aparelho antes da separação da reserva: ao abrir o app, a lista pronta ganha a reserva sozinha;
// lista editada mostra o aviso com "Separar reserva"; a carta pode ir e voltar entre deck e reserva; a partida só usa o deck.
test('e2e · E51 reserva nas listas já salvas: migração ao abrir, aviso com sugestão, mover carta, partida sem a reserva', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await page.goto(base + '#/listas/prontas'); await page.waitForSelector('#starter-list');
  // grava duas listas "antigas" direto no banco: a Elves igual à pronta (75 no principal) e a Boros com uma carta a mais
  const textos = await page.evaluate(() => Object.fromEntries(__m24.STARTER_DECKS.map(d => [d.name, d.text])));
  const antiga = (nome, extra) => { const es = []; for (const l of textos[nome].split('\n')) { const m = l.match(/^(\d+) (.+)$/); if (m) es.push({ name: m[2], qty: Number(m[1]), zone: 'main' }); } if (extra) es.push(extra); return es; };
  await page.evaluate(async ([elves, boros]) => {
    const db = await new Promise((res, rej) => { const r = indexedDB.open('mtg', 1); r.onsuccess = () => res(r.result); r.onerror = rej; });
    await new Promise((res, rej) => { const tx = db.transaction('kv', 'readwrite'); const kv = tx.objectStore('kv');
      kv.put({ id: 'velha1', name: 'Pauper Elves', format: 'pauper', entries: elves, created: 1, updated: 2 }, 'deck.velha1');
      kv.put({ id: 'velha2', name: 'Pauper Boros Bully', format: 'pauper', entries: boros, created: 1, updated: 1 }, 'deck.velha2');
      kv.put(['velha1', 'velha2'], 'deck.__ids'); tx.oncomplete = res; tx.onerror = rej; });
  }, [antiga('Pauper Elves'), antiga('Pauper Boros Bully', { name: 'Plains', qty: 1, zone: 'main' })]);
  await page.goto(base + '#/listas'); await page.reload();
  await page.waitForSelector('#decks-list .ds-list__item');
  await page.waitForFunction(() => /Reserva separada em Pauper Elves/.test((document.querySelector('#ds-toast') || {}).textContent || ''));
  // Elves: a lista mostra 60 no deck e 15 na reserva, com o grupo Reserva separado
  await page.locator('#decks-list .ds-list__item', { hasText: 'Pauper Elves' }).click(); await page.waitForSelector('.deck-summary');
  assert.match(await page.innerText('#deck-counts'), /60 no deck · 15 na reserva/);
  assert.equal(await page.locator('.deck-group--reserva').count(), 1);
  assert.equal(await page.locator('#deck-reserva-aviso').count(), 0);
  // uma carta vai para o deck e volta (uma cópia)
  await page.locator('.deck-group--reserva .deck-slot[data-name="Hydroblast"] .ds-card, .deck-group--reserva .deck-slot[data-name="Hydroblast"]').first().click();
  await page.waitForSelector('.ds-dialog'); await page.click('#deck-one-to-main');
  await page.waitForFunction(() => /61 no deck · 14 na reserva/.test(document.querySelector('#deck-counts').innerText));
  await page.locator('.deck-slot[data-name="Hydroblast"]').first().click(); await page.waitForSelector('.ds-dialog');
  await page.click('#deck-to-side');
  await page.waitForFunction(() => /60 no deck · 15 na reserva/.test(document.querySelector('#deck-counts').innerText));
  // Boros editada: não migrou sozinha; o aviso oferece separar pela lista pronta
  await page.goto(base + '#/listas'); await page.waitForSelector('#decks-list .ds-list__item');
  await page.locator('#decks-list .ds-list__item', { hasText: 'Pauper Boros Bully' }).click(); await page.waitForSelector('#deck-reserva-aviso');
  if (process.env.SHOTS) { await page.setViewportSize({ width: 360, height: 780 }); await page.locator('#deck-reserva-aviso').scrollIntoViewIfNeeded(); await page.waitForTimeout(300); await page.screenshot({ path: process.env.SHOTS + '/reserva-aviso.png' }); }
  assert.match(await page.innerText('#deck-reserva-aviso'), /76 cartas no deck e nenhuma na reserva\. A lista pronta Pauper Boros Bully tem 15 delas na reserva\./);
  await page.click('#deck-reserva-separar');
  await page.waitForFunction(() => /61 no deck · 15 na reserva/.test(document.querySelector('#deck-counts').innerText));
  assert.equal(await page.locator('#deck-reserva-aviso').count(), 0);
  // reabrir o app não mexe de novo
  await page.reload(); await page.waitForSelector('.deck-summary');
  assert.match(await page.innerText('#deck-counts'), /61 no deck · 15 na reserva/);
  // a partida carrega só o deck: 60 cartas da Elves
  await page.goto(base + '#/mesa'); await page.waitForSelector('#mesa-start');
  await page.selectOption('#mesa-mine', 'velha1');
  assert.match(await page.innerText('#mesa-reserva'), /Reserva: 15 carta/);
  await page.fill('#mesa-seed', '3'); await page.click('#mesa-start'); await page.waitForSelector('#tb-keep');
  const n = await page.evaluate(() => { const s = window.__estanteMesa.estado(); return Object.values(s.objects).filter(o => o.owner === 0 && !o.token && !o.ability).length; });
  assert.equal(n, 60, 'grimório + mão = 60, sem a reserva');
  assert.deepEqual(errors, []);
});

// U8 (leva 99) · disposições por aparelho. Medidas em CSS px conferidas em 30/09/2026 (yesviz.com):
// Galaxy S23/S24/S25 360×780; Galaxy S25+ e S25 Ultra 412×891; iPhone de referência 390×844; S+ com zoom 384×832.
test('e2e · U8 disposições por aparelho: Galaxy S, S+, Ultra e iPhone sem rolagem lateral, alvos ≥ 44px, carta e zonas por faixa', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await createDeck(page, base, 'Delver', PAUPER);
  const deckUrl = await page.evaluate(() => location.hash);
  const MEDIDAS = [['Galaxy S', 360, 780, '76px'], ['Galaxy S+ (zoom)', 384, 832, '84px'], ['iPhone', 390, 844, '84px'], ['Galaxy S+/Ultra', 412, 891, '92px']];
  for (const [nome, w, h, campo] of MEDIDAS) {
    await page.setViewportSize({ width: w, height: h });
    for (const [tela, rota, espera] of [['início', '#/', '#home-atalhos'], ['listas', '#/listas', '#decks-list'], ['lista', deckUrl, '.deck-summary'], ['coleção', '#/colecao', '#col-import'], ['preparar', '#/mesa', '#mesa-start']]) {
      await page.goto(base + rota); await page.waitForSelector(espera);
      await auditaTela(page, `${nome} · ${tela}`);
    }
    await page.fill('#mesa-seed', '4'); await page.click('#mesa-start'); await page.waitForSelector('#tb-keep'); await page.click('#tb-keep');
    await page.waitForSelector('#tb-pass');
    await page.evaluate(() => { const M = window.__estanteMesa; const s = M.estado(); const p = s.turn.active; for (const nm of ['Island', 'Island', 'Delver of Secrets']) { const o = Object.values(s.objects).find(x => x.owner === p && x.name === nm && x.zone !== 'battlefield'); if (o) M.act({ t: 'move', p, oid: o.oid, to: 'battlefield' }); } });
    await auditaTela(page, `${nome} · mesa`);
    const m = await page.evaluate(() => ({
      campo: getComputedStyle(document.documentElement).getPropertyValue('--carta-campo').trim(),
      carta: Math.round(document.querySelector('.tb-side--me .tb-card').getBoundingClientRect().width),
      passosCortados: [...document.querySelectorAll('.tb-steps__list li')].filter(l => l.scrollWidth > l.clientWidth + 1).length,
      chipsY: [...document.querySelectorAll('.tb-side--me .tb-chip')].map(c => Math.round(c.getBoundingClientRect().y)),
      cabecalho: getComputedStyle(document.querySelector('.tb-steps__head')).position }));
    assert.equal(m.campo, campo, `${nome}: carta do campo`);
    assert.equal(m.carta, parseInt(campo), `${nome}: carta desenhada no tamanho da faixa`);
    assert.equal(m.passosCortados, 0, `${nome}: nomes das fases inteiros`);
    if (w < 400) assert.equal(new Set(m.chipsY).size, 1, `${nome}: contadores de zona numa linha só: ${m.chipsY}`);
    assert.equal(m.cabecalho === 'absolute', w < 375, `${nome}: a linha repetida do turno sai só na tela estreita`);
    // leva 102 · sai da partida apagando o salvamento direto no banco e recarregando (o caminho pela tela de desistir
    // ficava instável com a máquina carregada: diálogo de fim de partida por cima da próxima navegação)
    await page.evaluate(k => new Promise(res => { const r = indexedDB.open('mtg', 1); r.onsuccess = () => { const tx = r.result.transaction('kv', 'readwrite'); tx.objectStore('kv').delete(k); tx.oncomplete = res; }; }), await page.evaluate(() => __m18.SAVE_KEY));
    await page.goto(base + '#/'); await page.reload();
  }
  assert.deepEqual(errors, []);
});

// Leva 100 · guarda-corpo de sobreposição com as listas reais (nomes longos + selos), nas quatro medidas.
// Antes, em 360, o "Blue" de "Pauper Mono Blue Faeries" passava por cima do selo "Pauper".
test('e2e · sem sobreposição: todas as listas prontas na estante, listas e prontas nas quatro medidas', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await page.goto(base + '#/listas/prontas'); await page.waitForSelector('#starter-list');
  for (const nome of await page.$$eval('[data-starter-add]', bs => bs.map(b => b.dataset.starterAdd))) {
    await page.click(`[data-starter-add="${nome}"]`);
    await page.waitForFunction(n => !document.querySelector(`[data-starter-add="${n}"]`), nome);
  }
  for (const [nome, w, h] of [['Galaxy S', 360, 780], ['S+ zoom', 384, 832], ['iPhone', 390, 844], ['S+/Ultra', 412, 891]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(base + '#/listas'); await page.waitForSelector('#decks-list .ds-list__item');
    assert.equal(await page.locator('#decks-list .ds-list__item').count(), 9);
    await auditaTela(page, `${nome} · listas com as nove prontas`);
    await page.goto(base + '#/listas/prontas'); await page.waitForSelector('#starter-list');
    await auditaTela(page, `${nome} · listas prontas`);
    await page.goto(base + '#/mesa'); await page.waitForSelector('#mesa-start');
    await auditaTela(page, `${nome} · preparar partida`);
  }
  // a reserva de cada lista de Pauper aparece como 60 + 15
  await page.goto(base + '#/listas'); await page.waitForSelector('#decks-list .ds-list__item');
  const reservas = await page.$$eval('#decks-list .deck-item__reserva', els => els.map(e => e.textContent));
  assert.deepEqual(reservas, Array(7).fill('60 cartas + 15 na reserva'));
  assert.deepEqual(errors, []);
});

// Leva 100 · a lista que o aparelho guardou com o corte errado da leva 95 (Mono Blue 62/13) vira 60/15 ao abrir o app.
test('e2e · E51 corte errado da leva 95 corrigido ao abrir: Mono Blue Faeries passa de 62/13 para 60/15', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await page.goto(base + '#/listas/prontas'); await page.waitForSelector('#starter-list');
  const velha = await page.evaluate(() => {
    const sd = __m24.STARTER_DECKS.find(d => d.name === 'Pauper Mono Blue Faeries');
    const total = {}; for (const e of __m14.parseDeckText(sd.text).entries) total[e.name] = (total[e.name] || 0) + e.qty;
    const errada = __m24.CORTES_ERRADOS_L95['Pauper Mono Blue Faeries'];
    return [...Object.entries(total).map(([name, q]) => ({ name, qty: q - (errada[name] || 0), zone: 'main' })).filter(e => e.qty > 0), ...Object.entries(errada).map(([name, qty]) => ({ name, qty, zone: 'side' }))];
  });
  await page.evaluate(async es => {
    const db = await new Promise((res, rej) => { const r = indexedDB.open('mtg', 1); r.onsuccess = () => res(r.result); r.onerror = rej; });
    await new Promise((res, rej) => { const tx = db.transaction('kv', 'readwrite'); const kv = tx.objectStore('kv');
      kv.put({ id: 'mb', name: 'Pauper Mono Blue Faeries', format: 'pauper', entries: es, created: 1, updated: 1 }, 'deck.mb');
      kv.put(['mb'], 'deck.__ids'); kv.put(['mb'], 'decks.reservaVista'); tx.oncomplete = res; tx.onerror = rej; });
  }, velha);
  await page.goto(base + '#/lista?id=mb'); await page.reload(); await page.waitForSelector('.deck-summary');
  await page.waitForFunction(() => /60 no deck · 15 na reserva/.test(document.querySelector('#deck-counts').innerText));
  const reserva = await page.$$eval('.deck-group--reserva .deck-slot', ss => ss.map(s => s.dataset.name).sort());
  assert.deepEqual(reserva, ['Annul', 'Blue Elemental Blast', 'Cryoshatter', 'Dispel', 'Hydroblast', 'Relic of Progenitus', 'Steel Sabotage']);
  assert.deepEqual(errors, []);
});

// Leva 102 · bug do celular: quem tinha recolhido a mão numa partida anterior começava o 1º turno sem ver as cartas.
test('e2e · leva 102 mão aberta no 1º turno mesmo com a bandeja recolhida da partida anterior; dentro da partida, recolher continua valendo', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await page.setViewportSize({ width: 360, height: 700 });
  await createDeck(page, base, 'Delver', PAUPER);
  await page.goto(base + '#/mesa'); await page.waitForSelector('#mesa-start');
  await page.evaluate(() => new Promise(res => { const r = indexedDB.open('mtg', 1); r.onsuccess = () => { const tx = r.result.transaction('kv', 'readwrite'); tx.objectStore('kv').put(true, 'mesa.maoRecolhida'); tx.oncomplete = res; }; }));
  await page.reload(); await page.waitForSelector('#mesa-start');
  await page.fill('#mesa-seed', '4'); await page.click('#mesa-start'); await page.waitForSelector('#tb-keep');
  await page.waitForTimeout(300);
  await page.click('#tb-keep'); await page.waitForSelector('#tb-pass'); await page.waitForTimeout(400);
  const ver = () => page.evaluate(() => { const c = document.querySelector('#tb-hand .tb-card'); const r = c.getBoundingClientRect(); return { recolhida: document.querySelector('#tb-dock').dataset.recolhida, vis: getComputedStyle(c).visibility, dentro: r.top >= 0 && r.bottom <= innerHeight + 1, turno: window.__estanteMesa.estado().turn.number }; });
  const v1 = await ver();
  assert.deepEqual(v1, { recolhida: 'false', vis: 'visible', dentro: true, turno: v1.turno }, '1º turno: mão à vista');
  // o jogador recolhe de propósito: continua recolhida na mesma partida, depois de repintar
  await page.click('#tb-hand-toggle'); await page.waitForFunction(() => document.querySelector('#tb-dock').dataset.recolhida === 'true');
  // uma jogada repinta a mesa (terreno), sem descarte forçado no meio
  await page.evaluate(() => { const M = window.__estanteMesa; const s = M.estado(); const p = s.turn.active; const o = s.zones[p].hand.find(x => s.objects[x].name === 'Island'); if (o) M.act({ t: 'play_land', p, oid: o }); });
  await page.waitForTimeout(400);
  assert.equal(await page.getAttribute('#tb-dock', 'data-recolhida'), 'true', 'a escolha dentro da partida vale: ' + JSON.stringify(await page.evaluate(() => { const s = window.__estanteMesa.estado(); return { forcada: document.querySelector('#tb-dock').dataset.forcada, status: s.status, pend: s.pending && s.pending.kind, passo: s.turn.step, t: s.turn.number, mao: s.zones[0].hand.length }; })));
  assert.deepEqual(errors, []);
});

// Leva 102 · coleção: miniaturas nítidas (srcset pela densidade da tela) e um toque abre a carta grande com o texto.
test('e2e · leva 102 coleção com imagens nítidas e visor da carta: grande, texto embaixo, X no topo, atalho para impressões', { skip }, async t => {
  const { page, errors, base } = await open(t);
  const ctx = await page.context().browser().newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 3, serviceWorkers: 'block' });
  const p3 = await ctx.newPage(); t.after(() => ctx.close());
  const erros3 = []; p3.on('pageerror', e => erros3.push(String(e)));
  const pedidas = [];
  await p3.route('https://api.scryfall.com/**', async r => { const ids = r.request().postData() ? JSON.parse(r.request().postData()).identifiers : []; return r.fulfill({ json: { data: ids.map(i => DB[i.name.toLowerCase()]).filter(Boolean), not_found: [] } }); });
  const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await p3.route('https://**.scryfall.io/**', r => { pedidas.push(r.request().url()); return r.fulfill({ status: 200, contentType: 'image/png', body: PNG }); });
  await p3.addInitScript(() => { window.__MTG_TEST = true; });
  await p3.goto(base + '#/colecao'); await p3.waitForSelector('#col-import');
  await p3.click('#col-import'); await p3.fill('#col-import-text', '2 Sol Ring');
  await p3.click('#col-import-check'); await p3.waitForSelector('#col-import-run'); await p3.click('#col-import-run');
  await p3.waitForSelector('.col-row[data-name="Sol Ring"] .col-row__thumb img');
  // miniatura da linha: srcset com todos os tamanhos; numa tela 3× o navegador não pede a "small"
  const linha = await p3.$eval('.col-row[data-name="Sol Ring"] .col-row__thumb img', i => ({ srcset: i.getAttribute('srcset'), sizes: i.getAttribute('sizes') }));
  assert.match(linha.srcset, /146w.*488w.*672w/); assert.equal(linha.sizes, '64px');
  await p3.waitForFunction(() => { const i = document.querySelector('.col-row[data-name="Sol Ring"] .col-row__thumb img'); return i && i.complete && i.currentSrc; });
  assert.doesNotMatch(await p3.$eval('.col-row[data-name="Sol Ring"] .col-row__thumb img', i => i.currentSrc), /\/small\//, 'tela 3×: a miniatura não é a borrada');
  // galeria: toque na carta abre o visor
  await p3.click('[data-visao="galeria"]'); await p3.waitForSelector('.col-card[data-name="Sol Ring"] img');
  await p3.waitForFunction(() => { const i = document.querySelector('.col-card[data-name="Sol Ring"] img'); return i && i.complete && i.currentSrc; });
  assert.doesNotMatch(await p3.$eval('.col-card[data-name="Sol Ring"] img', i => i.currentSrc), /\/small\//, 'galeria nítida');
  await p3.click('.col-card[data-name="Sol Ring"] .ds-card');
  await p3.waitForSelector('#card-viewer .ds-visor__moldura img'); await p3.waitForTimeout(400);
  const visor = await p3.evaluate(() => {
    const m = document.querySelector('#card-viewer .ds-visor__moldura'), i = m.querySelector('img'), o = document.querySelector('#card-viewer .ds-visor__oracle') || document.querySelector('#card-viewer .ds-visor__texto');
    return { w: Math.round(m.getBoundingClientRect().width), prop: +(m.getBoundingClientRect().height / m.getBoundingClientRect().width).toFixed(2), src: i.currentSrc, sizes: i.getAttribute('sizes'),
      textoAbaixo: o.getBoundingClientRect().top >= m.getBoundingClientRect().bottom - 1, qtd: document.querySelector('#card-viewer').innerText.includes('você tem 2'), x: !!document.querySelector('#ds-dialog-close svg') };
  });
  assert.ok(visor.w >= 280, 'carta grande: ' + visor.w); assert.equal(visor.prop, 1.39, 'proporção da carta');
  assert.match(visor.src, /\/(large|png|normal)\//, 'a imagem grande e nítida'); assert.doesNotMatch(visor.src, /\/small\//);
  assert.ok(visor.textoAbaixo, 'texto embaixo da carta'); assert.ok(visor.qtd, 'quantas você tem'); assert.ok(visor.x, 'X no topo');
  await auditaTela(p3, 'visor da carta na coleção');
  if (process.env.SHOTS) await p3.screenshot({ path: process.env.SHOTS + '/visor-colecao.png' });
  // o X fecha; o atalho leva às impressões
  await p3.click('#ds-dialog-close'); await p3.waitForSelector('.ds-dialog', { state: 'detached' });
  await p3.click('.col-card[data-name="Sol Ring"] .ds-card'); await p3.waitForSelector('#col-viewer-prints');
  await p3.click('#col-viewer-prints'); await p3.waitForSelector('#col-add-print');
  assert.deepEqual(erros3, []);
  assert.deepEqual(errors, []);
});

test('e2e · leva 104 escolhas de quem paga: Jaspera vira a criatura escolhida, Nyxborn Hydra pergunta o X', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await createDeck(page, base, 'Hidras', '24 Forest\n8 Jaspera Sentinel\n8 Grizzly Bear\n8 Elvish Visionary\n12 Nyxborn Hydra', 'livre');
  await page.goto(base + '#/mesa');
  await page.fill('#mesa-seed', '4');
  await page.click('#mesa-start');
  await page.waitForSelector('#tb-keep'); await page.click('#tb-keep');
  await toMyMain(page);
  // campo montado pela mesa assistida: Jaspera, um Urso, um Visionary e cinco Florestas; uma Hydra na mão
  await page.evaluate(() => {
    const M = window.__estanteMesa, s = M.estado(), p = s.turn.priority;
    const fora = n => Object.values(s.objects).filter(o => o.owner === p && o.name === n && o.zone !== 'battlefield' && o.zone !== 'hand').map(o => o.oid);
    const mover = (n, k, to = 'battlefield') => fora(n).slice(0, k).forEach(oid => M.act({ t: 'move', p, oid, to }));
    for (const oid of Object.values(s.objects).filter(o => o.owner === p && o.zone === 'hand').map(o => o.oid)) M.act({ t: 'move', p, oid, to: 'library', top: false });
    mover('Jaspera Sentinel', 1); mover('Grizzly Bear', 1); mover('Elvish Visionary', 1); mover('Forest', 5); mover('Nyxborn Hydra', 1, 'hand');
  });
  // um turno inteiro para passar o enjoo
  await page.click('#tb-pass-turn'); await toMyMain(page);
  const eu = await page.evaluate(() => window.__estanteMesa.estado().turn.active);
  const oidDe = nome => page.evaluate(([n, p]) => Object.values(window.__estanteMesa.estado().objects).find(o => o.name === n && o.owner === p && o.zone === 'battlefield').oid, [nome, eu]);
  const [urso, vis] = [await oidDe('Grizzly Bear'), await oidDe('Elvish Visionary')];

  // Jaspera: "Gerar verde" abre a pergunta; a criatura virada é a escolhida
  await page.locator('.tb-side--me .tb-card[aria-label^="Jaspera Sentinel"]').click();
  await page.waitForSelector('.ds-dialog');
  const gerar = page.locator('.ds-dialog .ds-btn', { hasText: 'Gerar' });
  assert.equal(await gerar.count(), 5, 'um botão por cor, não um por cor × criatura');
  await gerar.nth(4).click();
  await page.waitForSelector('#tb-escolha');
  assert.match(await page.innerText('#tb-escolha-pergunta'), /Qual criatura vira para pagar/);
  const opcoes = await page.locator('#tb-escolha .ds-btn').allInnerTexts();
  assert.deepEqual(opcoes.slice().sort(), ['Virar Elvish Visionary', 'Virar Grizzly Bear']);
  await auditaTela(page, 'escolha do custo');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/escolha-custo.png' });
  await page.click('#tb-escolha >> text=Virar Elvish Visionary');
  await page.waitForFunction(o => window.__estanteMesa.estado().objects[o].tapped, vis);
  const depois = await page.evaluate(([u, p]) => { const s = window.__estanteMesa.estado(); return { urso: s.objects[u].tapped, verde: s.players[p].pool.G }; }, [urso, eu]);
  assert.equal(depois.urso, false, 'o Urso, que eu não escolhi, continua desvirado');
  assert.equal(depois.verde, 1);

  // Nyxborn Hydra: "Conjurar" abre o seletor de X com o intervalo pagável
  const maxX = await page.evaluate(p => {
    const s = window.__estanteMesa.estado(); const h = s.zones[p].hand.find(o => s.objects[o].name === 'Nyxborn Hydra');
    return Math.max(...__m16.legalActions(s, p).filter(a => a.t === 'cast' && a.oid === h && !a.bestow).map(a => a.x));
  }, eu);
  assert.equal(maxX, 5, 'cinco Florestas e o verde da Jaspera: {X}{G} com X até 5');
  await handCard(page, 'Nyxborn Hydra').click();
  await page.click('.ds-dialog .ds-btn:has-text("Conjurar")');
  await page.waitForSelector('#tb-x-valor');
  assert.equal(await page.innerText('#tb-x-valor'), '1', 'começa em 1');
  assert.match(await page.innerText('.ds-dialog'), /de 0 a 5/);
  for (let i = 0; i < 6; i++) await page.click('#tb-x-mais', { force: true });
  assert.equal(await page.innerText('#tb-x-valor'), '5', 'não passa do que dá para pagar');
  assert.equal(await page.locator('#tb-x-mais').isDisabled(), true);
  await page.click('#tb-x-menos'); await page.click('#tb-x-menos');
  assert.equal(await page.innerText('#tb-x-valor'), '3');
  assert.equal(await page.locator('#tb-x-total .ds-sym').count(), 2, 'o total em símbolos: {3}{G} — ' + await page.innerHTML('#tb-x-total'));
  await auditaTela(page, 'seletor de X');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/seletor-x.png' });
  await page.click('.tb-x__ok');
  await page.waitForFunction(p => Object.values(window.__estanteMesa.estado().objects).some(o => o.name === 'Nyxborn Hydra' && o.owner === p && ['stack', 'battlefield'].includes(o.zone)), eu, { timeout: 4000 })
    .catch(async () => assert.fail('a Hydra não foi conjurada: ' + (await page.locator('#tb-recusa').count() ? await page.innerText('#tb-recusa') : 'sem recusa na tela')));
  const hidra = await page.evaluate(p => Object.values(window.__estanteMesa.estado().objects).find(o => o.name === 'Nyxborn Hydra' && o.owner === p && ['stack', 'battlefield'].includes(o.zone)).oid, eu);
  for (let i = 0; i < 6 && await page.evaluate(o => window.__estanteMesa.estado().objects[o].zone !== 'battlefield', hidra); i++) {
    if (await page.locator('#tb-pass').count()) await page.click('#tb-pass'); else await page.waitForTimeout(200);
  }
  const h = await page.evaluate(o => { const x = window.__estanteMesa.estado().objects[o]; return { zona: x.zone, marcadores: x.counters.p1p1 }; }, hidra);
  assert.deepEqual(h, { zona: 'battlefield', marcadores: 3 }, 'entrou com os 3 marcadores escolhidos');
  await reveal(page);
  await page.click('#tb-log'); await page.waitForSelector('#tb-timeline');
  assert.match(await page.innerText('#tb-timeline'), /conjurou Nyxborn Hydra com X = 3/);
  assert.deepEqual(errors, []);
});

test('e2e · leva 107 Duress mostra a mão inteira: terrenos e criaturas apagados, só a que serve pode ser escolhida', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await createDeck(page, base, 'Discard', '24 Island\n12 Duress\n12 Counterspell\n12 Sky Pike', 'livre');
  await page.goto(base + '#/mesa');
  await page.click('[data-opponent="hotseat"]');
  await page.fill('#mesa-me', 'Ana'); await page.fill('#mesa-them', 'Bia');
  await page.fill('#mesa-seed', '4');
  await page.click('#mesa-start');
  await page.waitForSelector('#tb-keep');
  await page.click('#tb-keep'); await reveal(page); await page.click('#tb-keep'); await reveal(page);
  const p = await page.evaluate(() => {
    const M = window.__estanteMesa, s = M.estado(), p = s.turn.priority, o = 1 - p;
    const de = (q, n) => Object.values(s.objects).find(x => x.owner === q && x.name === n && x.zone === 'library');
    // a mão do oponente com um de cada: terreno, criatura e a mágica que o Duress pode pegar
    for (const n of ['Island', 'Sky Pike', 'Counterspell']) M.act({ t: 'move', p, oid: de(o, n).oid, to: 'hand' });
    const d = de(p, 'Duress'); M.act({ t: 'move', p, oid: d.oid, to: 'hand' });
    M.act({ t: 'cast', p, oid: d.oid, targets: [{ player: o }], free: true });
    return p;
  });
  for (let i = 0; i < 6 && !(await page.locator('#tb-pick-cards').count()); i++) {
    await reveal(page);
    const vez = await page.evaluate(() => { const s = window.__estanteMesa.estado(); return s.pending ? null : s.turn.priority; });
    if (vez != null) await page.evaluate(v => window.__estanteMesa.act({ t: 'pass', p: v }), vez);
    await page.waitForTimeout(150);
  }
  await reveal(page);
  await page.waitForSelector('#tb-pick-cards');
  const info = await page.evaluate(() => {
    const s = window.__estanteMesa.estado(), pk = s.pending;
    return { mostrar: pk.mostrar.length, from: pk.from.length, apagadas: document.querySelectorAll('#tb-pick-cards .tb-card--fora').length, total: document.querySelectorAll('#tb-pick-cards .tb-card').length };
  });
  assert.ok(info.mostrar > info.from, 'mostra mais do que dá para escolher');
  assert.equal(info.total, info.mostrar, 'a mão inteira aparece');
  assert.equal(info.apagadas, info.mostrar - info.from, 'terrenos e criaturas apagados');
  assert.match(await page.innerText(".tb-banner"), /Escolha o descarte do oponente/);
  await auditaTela(page, 'Duress com a mão revelada');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/duress.png' });
  // tocar numa apagada não faz nada; na que serve, descarta
  // aria-disabled: o Playwright não clica sozinho numa carta desabilitada; força o toque para provar que nada acontece
  await page.locator('#tb-pick-cards .tb-card--fora').first().click({ force: true });
  assert.equal(await page.evaluate(() => window.__estanteMesa.estado().pending.picked.length), 0);
  await page.locator('#tb-pick-cards .tb-card:not(.tb-card--fora)').first().click();
  await page.waitForFunction(o => Object.values(window.__estanteMesa.estado().objects).some(x => x.owner === o && x.name === 'Counterspell' && x.zone === 'graveyard'), 1 - p);
  assert.deepEqual(errors, []);
});
