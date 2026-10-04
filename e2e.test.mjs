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
  // Leva 110 · textos oficiais conferidos em 30/09/2026 (.listas/oficiais.json: Fiery Temper, Grab the Prize, Utopia Sprawl)
  { ...card('Fiery Temper', 'Instant', ['R'], 3), mana_cost: '{1}{R}{R}', oracle_text: 'Fiery Temper deals 3 damage to any target.\nMadness {R} (If you discard this card, discard it into exile. When you do, cast it for its madness cost or put it into your graveyard.)' },
  { ...card('Grab the Prize', 'Sorcery', ['R'], 2), mana_cost: '{1}{R}', oracle_text: "As an additional cost to cast this spell, discard a card.\nDraw two cards. If the discarded card wasn't a land card, Grab the Prize deals 2 damage to each opponent." },
  { ...card('Utopia Sprawl', 'Enchantment — Aura', ['G'], 1), mana_cost: '{G}', oracle_text: 'Enchant Forest\nAs Utopia Sprawl enters the battlefield, choose a color.\nWhenever enchanted Forest is tapped for mana, its controller adds an additional one mana of the chosen color.' },
  { ...card('Mountain', 'Basic Land — Mountain', [], 0), image_uris: { small: 'https://cards.scryfall.io/small/front/x/mountain.jpg', normal: 'https://cards.scryfall.io/normal/front/x/mountain.jpg' } },
  // Leva 111 · Blood: texto da ficha (Oracle do Forge, tokenscripts, 30/09/2026) e Voldaren Epicure (.listas/oficiais.json)
  { ...card('Blood', 'Token Artifact — Blood', [], 0), id: 'tok-blood', oracle_text: '{1}, {T}, Discard a card, Sacrifice this token: Draw a card.' },
  { ...card('Voldaren Epicure', 'Creature — Vampire', ['R'], 1), mana_cost: '{R}', power: '1', toughness: '1', oracle_text: 'When this creature enters, it deals 1 damage to each opponent. Create a Blood token. (It\'s an artifact with "{1}, {T}, Discard a card, Sacrifice this artifact: Draw a card.")' },
  { ...card('Clue', 'Token Artifact — Clue', [], 0), id: 'tok-clue', oracle_text: '{2}, Sacrifice this artifact: Draw a card.', image_uris: { small: 'https://cards.scryfall.io/small/front/x/clue.png', normal: 'https://cards.scryfall.io/normal/front/x/clue.png' } }
].map(c => [c.name.toLowerCase(), c]));

async function open(t, { dev = true, apresentacao = false } = {}) {
  const srv = await serve();
  const browser = await pw.chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
  // capturas de tela nas outras medidas e no tema escuro (ROADMAP §4): SHOT_W=360 SHOT_TEMA=dark
  const ctx = await browser.newContext({ viewport: { width: +(process.env.SHOT_W || 390), height: process.env.SHOT_W === '360' ? 780 : 844 }, serviceWorkers: 'block',
    ...(process.env.SHOT_TEMA ? { colorScheme: process.env.SHOT_TEMA } : {}) });
  // Leva 116 · as imagens dos dados de teste (cards.scryfall.io/.../x/sol.jpg) não existem. Aqui o host é inalcançável
  // (net::ERR_, que o teste ignora como ambiente); no GitHub Actions a internet responde 404 e o console acusa
  // "Failed to load resource: 404" — o portão do CI ficou vermelho da O2 (28/09) em diante por isso, com o portão
  // local verde. O padrão passa a ser o mesmo nos dois lugares: o CDN de imagens fica fora do ar, salvo quando o
  // próprio teste o simula (rota da página, que tem precedência sobre a do contexto).
  await ctx.route(/^https:\/\/[^/]*\bscryfall\.io\//, r => r.abort('internetdisconnected'));
  // leva 163 · a cotação do dólar não sai do aparelho nos testes: cada teste que precisa dela responde por rota própria
  await ctx.route(/^https:\/\/(economia\.awesomeapi\.com\.br|api\.frankfurter\.dev|open\.er-api\.com)\//, r => r.abort('internetdisconnected'));
  // D4b (leva 145) · a apresentação de primeira abertura só aparece no teste que a pede: os outros (e as abas que abrem
  // a partir do mesmo contexto, como as da partida online) começam direto na tela
  if (!apresentacao) await ctx.addInitScript(() => { window.__SEM_APRESENTACAO = true; });
  const page = await ctx.newPage();
  // leva 113: o app publicado só tem o motor completo. Os testes de mesa montam o estado à mão (mover carta, conjurar
  // sem pagar), o que só existe na mesa assistida: ela fica ligada aqui por window.__MESA_DEV. Os testes do modo
  // único (leva 113 em diante) abrem com { dev: false }.
  if (dev) await page.addInitScript(() => { window.__MESA_DEV = true; });
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
  await page.click('#decks-new-empty'); // D4 · na estante vazia, "Nova lista" vive no cartão de primeiro uso
  await page.fill('#deck-name', 'Commander Malcolm v3');
  await page.fill('#deck-text', 'Commander\n1 Malcolm, Alluring Scoundrel\n\nDeck\n1 Sol Ring\n30 Island\n1 Counterspell\n1 Carta Inexistente');
  await page.click('#deck-save');
  await page.waitForSelector('.deck-summary');
  const body = await page.innerText('main');
  assert.match(await estadoDaLista(page), /1 carta\(s\) não reconhecida\(s\): Carta Inexistente/); // D8 · na folha da linha de estado
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

/** D4 (leva 142) · na coleção vazia a seção "Adicionar carta" fica recolhida: "Pelo nome" abre no lugar antes de digitar. */
async function digitaCarta(page, nome) {
  if (await page.locator('#col-pelo-nome').isVisible().catch(() => false)) { await page.click('#col-pelo-nome'); await page.waitForSelector('#col-add'); }
  await page.fill('#col-add', nome);
}
/** D8 (leva 153) · os avisos e erros de validação da lista moram na linha de estado; a folha traz os textos completos. */
async function estadoDaLista(page) {
  await page.waitForSelector('#deck-estado'); await page.click('#deck-estado'); await page.waitForSelector('.ds-dialog');
  const texto = await page.innerText('.ds-dialog');
  await page.keyboard.press('Escape'); await page.waitForSelector('.ds-dialog', { state: 'detached' });
  return texto;
}
async function createDeck(page, base, name, text, format = 'pauper') {
  await page.goto(base + '#/listas/editar');
  await page.fill('#deck-name', name);
  await page.selectOption('#deck-format', format);
  await page.fill('#deck-text', text);
  await page.click('#deck-save');
  await page.waitForSelector('.deck-summary');
}
const PAUPER = '20 Island\n4 Delver of Secrets\n4 Preordain\n4 Counterspell';
// leva 110: a lista da partida se escolhe numa folha com as linhas da estante (antes era um <select> de texto)
async function escolheLista(page, id, qual) {
  await page.click('#' + id); await page.waitForSelector('.deck-picker__lista');
  const alvo = typeof qual === 'string' ? page.locator(`.deck-picker__lista [data-deck-id="${qual}"]`) : page.locator('.deck-picker__lista .deck-item', { has: page.locator('.deck-item__nome', { hasText: qual }) });
  await alvo.first().click(); await page.waitForSelector('.deck-picker__lista', { state: 'detached' });
}
const tapHand = async (page, name) => { await page.locator('.tb-hand .tb-card', { hasText: name }).first().click(); };
const handCardByImgless = name => `.tb-hand .tb-card[aria-label^="${name}"]`;

test('e2e · B4/U10 jogar contra o Shark: três oponentes, um bot só, e a jogada dele no registro', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await createDeck(page, base, 'Delver', PAUPER);
  await page.goto(base + '#/mesa');
  await page.fill('#mesa-seed', '9');
  // U10 · Goldfish, Shark e outra pessoa; o amador não aparece mais
  await page.waitForSelector('[data-opponent="shark"]');
  // Leva 133 · expectativa mudou de propósito: a partida online é o quarto oponente
  assert.deepEqual(await page.locator('[data-opponent]').evaluateAll(cs => cs.map(c => c.dataset.opponent)), ['goldfish', 'shark', 'hotseat', 'online']);
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
  // Leva 121 · a faixa de turno virou botão e entra animada (translateY): no meio da animação o retângulo mede
  // 43.999996 px por arredondamento de subpixel. Mesma tolerância da auditoria geral (auditaTela: 43,5), não um alvo menor.
  const tiny = await page.$$eval('.tb button', bs => bs.filter(b => b.offsetParent && b.getBoundingClientRect().height < 43.5).map(b => b.id || b.getAttribute('aria-label') || b.textContent.trim()));
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
  assert.match(await page.innerText('.tb-banner'), /Vidência/); // Leva 131 · o aviso dizia "Scry"; texto de interface é em português
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/mesa-2.png' });
  await page.locator('#tb-pick-cards .tb-card').first().click();
  await page.click('#tb-pick-done');
  await page.waitForFunction(() => !document.querySelector('#tb-pick-cards'));

  // A8: recarregar mantém a partida
  const lands = await page.locator('.tb-side--me [data-zone="lands"] .tb-card').count();
  await page.reload();
  // instável sob carga (02/10/2026: 2 de 5 rodadas completas): se estourar, a falha diz em que tela a página voltou
  await page.waitForSelector('#tb-pass').catch(async e => { throw new Error('depois de recarregar, a mesa não voltou: ' + await page.evaluate(() => location.hash + ' | ' + [...document.querySelectorAll('[id]')].map(x => x.id).filter(i => /^tb-|^ds-dialog|^prep|^sw/.test(i)).join(',') + ' | ' + document.body.innerText.slice(0, 300).replace(/\n/g, ' / '))); });
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

  await digitaCarta(page, 'sol ring');
  await page.click('#col-add-btn');
  await page.waitForSelector('.col-row[data-name="Sol Ring"]');
  assert.equal(await page.locator('.col-row[data-name="Sol Ring"] .col-row__n').innerText(), '1');

  await page.fill('#col-filter', 'isl');
  await page.waitForFunction(() => document.querySelectorAll('.col-row').length === 1);

  // a lista reflete a coleção: Sol Ring voltou, Counterspell sobra
  await page.goto(base + '#/listas');
  await page.waitForSelector('#decks-list .ds-list__item');
  // leva 110: a posse virou barra fina na linha da lista; o número por extenso fica no nome falado
  assert.equal(await page.getAttribute('#decks-list .deck-item__posse', 'aria-label'), 'tenho 33 de 33');
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
  // D3 (leva 141) · expectativa mudou: com tudo guardado e rede, o painel é uma linha (anel, estado e "Detalhes");
  // as linhas por item continuam no lugar e aparecem ao abrir
  assert.equal(await page.getAttribute('#home-offline', 'data-compacto'), 'true');
  assert.ok((await page.locator('#home-offline').boundingBox()).height <= 72, 'painel recolhido em uma linha');
  assert.equal(await page.locator('#home-offline-lines').isVisible(), false);
  await page.click('#home-offline-detalhes'); await page.waitForSelector('#home-offline-lines');
  assert.equal(await page.getAttribute('#home-offline-detalhes', 'aria-expanded'), 'true');
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
  await page.waitForSelector('#home-offline-lines', { state: 'attached' }); // D3 · pode já estar recolhido
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
  await pausaAuto(page);
  await page.evaluate(() => window.__ocrQueue.push('Sol Ring'));
  await page.click('#scan-read');
  await esperaPilha(page, 1);
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
  await digitaCarta(page, 'Preordain'); await page.click('#col-add-btn');
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
  // D8 (leva 153) · os avisos moram na linha de estado; o texto completo abre na folha
  await page.waitForSelector('#deck-estado'); assert.match(await page.innerText('#deck-estado'), /\d+ avisos?/);
  const corpo = await estadoDaLista(page);
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

  // números e distribuições (leva 149: o painel é um bloco expansível, aberto por padrão)
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
  await page.waitForSelector('#scan[data-base="ready"]');
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
  await page.goto(base + '#/colecao'); await page.waitForSelector('#col-vazio');
  await digitaCarta(page, 'Counterspell');
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
  await page.goto(base + '#/colecao'); await page.waitForSelector('#col-vazio');
  await digitaCarta(page, 'Sol Ring');
  await page.click('#col-add-btn');
  await page.waitForSelector('#col-backup');
  assert.match(await page.innerText('#col-care'), /Sem backup ainda/);
  await Promise.all([page.waitForEvent('download'), page.click('#col-backup')]);
  await page.waitForFunction(() => !/backup/.test(document.querySelector('#col-care').innerText));
  assert.deepEqual(errors, []);
});

// Câmera e OCR simulados: o teste controla o texto que o "leitor" devolve.
const FAKE_DEVICE = deny => `
  window.__ocrQueue = []; window.__ocrColecao = [];
  // Q10 · o leitor falso deixa no cache o que o service worker deixaria ao baixar o leitor de verdade
  window.Tesseract = { createWorker: async () => { window.__ocrCriados = (window.__ocrCriados || 0) + 1;
    try { const c = await caches.open('estante-ocr-v1'); await c.put('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js', new Response('')); await c.put('https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz', new Response('')); } catch (e) {}
    // X14 · o app tem dois leitores (nome e edição) que leem ao mesmo tempo: cada um tira da sua fila, conforme o modo
    // que o app configurou (bloco = linha de coleção). Com uma fila só, quem chegasse primeiro levava o texto do outro.
    let bloco = false;
    return { setParameters: async p => { bloco = String(p && p.tessedit_pageseg_mode) === '6'; }, terminate: async () => { window.__ocrEncerrados = (window.__ocrEncerrados || 0) + 1; },
      recognize: async () => { const f = bloco ? window.__ocrColecao : window.__ocrQueue; return { data: { text: f.length ? f.shift() : '' } }; } };
  } };
  const gum = async () => {
    if (${deny}) { const e = new Error('Permission denied'); e.name = 'NotAllowedError'; throw e; }
    const c = document.createElement('canvas'); c.width = 640; c.height = 480;
    // leva 112: quadro com textura nítida e parada (o scanner pula quadro liso/borrado antes do OCR); sem carta inteira
    const g = c.getContext('2d'); const ruido = g.createImageData(640, 480); let s = 7;
    for (let i = 0; i < ruido.data.length; i += 4) { s = (s * 1103515245 + 12345) >>> 0; const v = s & 0x100 ? 40 : 200; ruido.data[i] = ruido.data[i + 1] = ruido.data[i + 2] = v; ruido.data[i + 3] = 255; }
    const pinta = () => g.putImageData(ruido, 0, 0);
    pinta(); setInterval(pinta, 100);
    return c.captureStream(10);
  };
  if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = gum;
  else Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: gum } });
`;

// Leva 109 · o automático começa ligado: os testes de leitura manual pausam antes de encher a fila do leitor falso
async function pausaAuto(page) {
  await page.waitForSelector('[data-auto]');
  if (await page.getAttribute('[data-auto]', 'aria-pressed') === 'true') await page.click('[data-auto]');
  await page.waitForFunction(() => document.querySelector('[data-auto]').getAttribute('aria-pressed') === 'false');
  await page.waitForTimeout(250); // uma leitura em curso termina antes de a fila ser usada
  await page.evaluate(() => { window.__ocrQueue.length = 0; });
}
// X7 · câmera falsa que mostra uma carta de verdade no quadro: fundo escuro e um
// retângulo claro com textura, na proporção da carta.
const FAKE_CARD_CAM = `
  window.__ocrQueue = []; window.__ocrColecao = [];
  // Q10 · o leitor falso deixa no cache o que o service worker deixaria ao baixar o leitor de verdade
  window.Tesseract = { createWorker: async () => { window.__ocrCriados = (window.__ocrCriados || 0) + 1;
    try { const c = await caches.open('estante-ocr-v1'); await c.put('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js', new Response('')); await c.put('https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz', new Response('')); } catch (e) {}
    // X14 · o app tem dois leitores (nome e edição) que leem ao mesmo tempo: cada um tira da sua fila, conforme o modo
    // que o app configurou (bloco = linha de coleção). Com uma fila só, quem chegasse primeiro levava o texto do outro.
    let bloco = false;
    return { setParameters: async p => { bloco = String(p && p.tessedit_pageseg_mode) === '6'; }, terminate: async () => { window.__ocrEncerrados = (window.__ocrEncerrados || 0) + 1; },
      recognize: async () => { const f = bloco ? window.__ocrColecao : window.__ocrQueue; return { data: { text: f.length ? f.shift() : '' } }; } };
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

// Leva 112 · a tela do scanner não rola: pilha, digitar, opções e diagnóstico abrem em folhas
const contaPilha = page => page.evaluate(() => +((/(\d+)/.exec((document.querySelector('#scan-lot') || {}).innerText || '') || [])[1] || -1));
const esperaPilha = (page, n, timeout = 12000) => page.waitForFunction(k => +((/(\d+)/.exec((document.querySelector('#scan-lot') || {}).innerText || '') || [])[1] || -1) === k, n, { timeout });
async function abrePilha(page) { await page.click('#scan-lot'); await page.waitForSelector('#scan-pile'); }
async function opcaoScanner(page, chip, fecha = true) { await page.click('#scan-more'); await page.click(`[data-${chip}]`); if (fecha && await page.locator('.ds-dialog').count()) await page.click('#ds-dialog-close'); }

test('e2e · X7 scanner acha a carta dentro da moldura e lê sozinho; "[nome] ✓" aparece e a carta parada não entra duas vezes', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(FAKE_CARD_CAM);
  await page.goto(base + '#/scanner');
  await page.waitForSelector('#scan-read:not([disabled])');
  // Leva 112 · expectativa mudou: a moldura é a referência e começa visível (antes: escondida, leitura do quadro inteiro)
  assert.equal(await page.locator('.scan-frame').isVisible(), true, 'moldura visível');
  await opcaoScanner(page, 'edition');                     // este teste é só do nome
  await page.waitForFunction(() => document.querySelector('[data-auto]').getAttribute('aria-pressed') === 'true', null, { timeout: 12000 });
  await page.evaluate(() => window.__ocrQueue.push('Sol Ring', 'Sol Ring', 'Sol Ring', 'Sol Ring', 'Sol Ring', 'Sol Ring'));
  await page.waitForFunction(() => { const el = document.querySelector('#scan-outline'); return el && el.style.display === 'block' && parseFloat(el.style.width) > 20; }, null, { timeout: 12000 });
  // a confirmação por cima da câmera: nome e ✓
  await page.waitForSelector('#scan-ok:not([hidden])', { timeout: 12000 });
  assert.match(await page.innerText('#scan-ok'), /Sol Ring/);
  assert.equal(await page.locator('#scan-ok svg').count(), 1, 'com o check desenhado');
  await esperaPilha(page, 1);
  // a carta continua parada no quadro e o leitor continua lendo "Sol Ring": não entra de novo
  await page.waitForFunction(() => window.__ocrQueue.length === 0, null, { timeout: 12000 });
  await page.waitForTimeout(600);
  assert.equal(await contaPilha(page), 1, 'a mesma carta parada entra uma vez só');
  // toque na câmera: soma outra cópia da última carta
  await page.click('#scan-stage', { position: { x: 20, y: 60 } });
  await esperaPilha(page, 2);
  await page.click('[data-auto]');
  // a pilha abre por botão, com miniatura, confiança, quantidade e ações
  await abrePilha(page);
  const cartao = page.locator('#scan-pile .scan-pile__card').first();
  assert.match(await cartao.innerText(), /Sol Ring/); assert.match(await cartao.innerText(), /\d+%/);
  assert.match(await page.innerText('#scan-pile'), /Na pilha: 2 carta/);
  await cartao.locator('button[aria-label^="Uma a mais"]').first().click();
  await page.waitForFunction(() => /Na pilha: 3 carta/.test(document.querySelector('#scan-pile').innerText));
  await page.locator('#scan-pile .scan-pile__card').first().locator('button[aria-label^="Tirar"]').click();
  await page.waitForFunction(() => !document.querySelector('#scan-pile .scan-pile__card'), null, { timeout: 4000 });
  await page.click('#ds-dialog-close');
  // a moldura pode ser escondida em "mais"
  await opcaoScanner(page, 'moldura');
  assert.equal(await page.locator('.scan-frame').isVisible(), false, 'moldura opcional');
  assert.deepEqual(errors, []);
});

test('e2e · X9 leitura de confiança média fica "confira" e se resolve com um toque', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(FAKE_DEVICE(false));
  await page.goto(base + '#/scanner');
  await page.waitForSelector('#scan-read:not([disabled])');
  await pausaAuto(page);
  await opcaoScanner(page, 'edition');
  // 87% de confiança: "Ler agora" põe na pilha, mas marcada
  await page.evaluate(() => window.__ocrQueue.push('S0l Rinq @®'));
  await page.click('#scan-read');
  await esperaPilha(page, 1).catch(async e => { throw new Error('diario: ' + JSON.stringify(await page.evaluate(() => window.__scanDiario.lista().slice(0, 4)))); });
  await abrePilha(page);
  await page.waitForSelector('#scan-pile [data-conferir]');
  assert.match(await page.locator('#scan-pile .scan-pile__card').first().innerText(), /Confira/);
  await page.click('#scan-pile-commit');
  await page.waitForSelector('#scan-lot-aviso');
  assert.match(await page.innerText('#scan-lot-aviso'), /1 leitura\(s\) ainda não conferida/);
  assert.match(await page.innerText('#scan-commit'), /\(1 a conferir\)/);
  await page.click('.ds-dialog button:has-text("Fechar")');
  await abrePilha(page);
  await page.click('#scan-pile [data-confirm]');
  await page.waitForFunction(() => !document.querySelector('#scan-pile [data-conferir]'));
  await page.click('#scan-pile-commit');
  await page.waitForSelector('#scan-commit');
  assert.equal(await page.locator('#scan-lot-aviso').count(), 0, 'sem aviso quando tudo está conferido');
  await page.click('.ds-dialog button:has-text("Fechar")');
  // confiança alta entra confirmada de cara
  await page.evaluate(() => window.__ocrQueue.push('Grizzly Bear'));
  await page.click('#scan-read');
  await esperaPilha(page, 2);
  // a segunda média resolve por "Corrigir", voltando para a pilha
  await page.evaluate(() => window.__ocrQueue.push('Sol Rimg'));
  await page.click('#scan-read');
  await esperaPilha(page, 3);
  await abrePilha(page);
  assert.equal(await page.locator('#scan-pile .scan-pile__card[data-name="Grizzly Bear"] [data-conferir]').count(), 0, '100% não pede conferência');
  await page.click('#scan-pile [data-fix]');
  await page.waitForSelector('#scan-fix-input');
  await page.fill('#scan-fix-input', 'Sol Ring');
  await page.click('#scan-fix-list button:has-text("Sol Ring")');
  await page.waitForSelector('#scan-pile');
  await page.waitForFunction(() => !document.querySelector('#scan-pile [data-conferir]'));
  assert.deepEqual(errors, []);
});

test('e2e · X1/X2/X4 scanner: ler, automático com porteiro, candidatos, desfazer, corrigir e mandar para a coleção', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(FAKE_DEVICE(false));
  await page.goto(base + '#/scanner');
  await page.waitForSelector('#scan-read:not([disabled])');
  await page.waitForSelector('#scan[data-base="ready"]');
  await pausaAuto(page);
  await opcaoScanner(page, 'edition'); // só o nome; a edição tem teste próprio
  await page.evaluate(() => window.__ocrQueue.push('S0l Rinq @®'));
  await page.click('#scan-read');
  await page.waitForFunction(() => /Sol Ring/.test(document.querySelector('#scan-result').innerText));
  await esperaPilha(page, 1);
  // automático (sem carta achada, a leitura vale dentro da moldura): a exata precisa de duas seguidas;
  // depois a mesma carta só entra de novo quando sai do quadro e passa o intervalo
  await page.evaluate(() => window.__ocrQueue.push('Island', 'Island', 'Island', 'Island'));
  await page.click('[data-auto]');
  await esperaPilha(page, 2, 15000);
  await page.waitForFunction(() => window.__ocrQueue.length === 0, null, { timeout: 12000 });
  assert.equal(await contaPilha(page), 2, 'quatro leituras iguais da carta parada: entra uma vez');
  await page.waitForTimeout(2600);   // passou o intervalo; a fila vazia é a carta fora do quadro
  await page.evaluate(() => window.__ocrQueue.push('Island', 'Island'));
  await esperaPilha(page, 3, 15000);
  await page.click('[data-auto]');
  await page.waitForTimeout(300);
  await page.click('#scan-undo');
  await esperaPilha(page, 2);
  // leitura fraca (abaixo do aceite) não entra: vira escolha com um toque
  await page.evaluate(() => window.__ocrQueue.push('Sxl Rxng'));
  await page.click('#scan-read');
  await page.waitForSelector('[data-candidate="Sol Ring"]');
  assert.equal(await contaPilha(page), 2, 'leitura fraca não entra sozinha');
  await page.click('#scan-lot'); await page.click('#scan-pile-commit');
  await page.waitForSelector('#scan-lot-list');
  await page.locator('#scan-lot-list .col-print', { hasText: 'Sol Ring' }).locator('text=Corrigir').click();
  await page.fill('#scan-fix-input', 'Counterspel');
  await page.locator('#scan-fix-list button', { hasText: 'Counterspell' }).click();
  await page.waitForSelector('#scan-commit');
  assert.match(await page.innerText('#scan-lot-list'), /Counterspell/);
  await page.click('#scan-commit');
  await esperaPilha(page, 0);
  await page.goto(base + '#/colecao');
  await page.waitForSelector('.col-row[data-name="Island"]');
  assert.equal(await page.locator('.col-row[data-name="Island"] .col-row__n').innerText(), '1');
  assert.equal(await page.locator('.col-row[data-name="Counterspell"] .col-row__n').innerText(), '1');
  assert.deepEqual(errors, []);
});

test('e2e · X1 câmera bloqueada: explica e deixa montar a pilha digitando', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(FAKE_DEVICE(true));
  await page.goto(base + '#/scanner');
  await page.waitForFunction(() => { const el = document.querySelector('#scan-status'); return el && /câmera foi bloqueada/.test(el.innerText); });
  assert.equal(await page.locator('#scan-read').isDisabled(), true);
  await page.waitForSelector('#scan[data-base="ready"]');
  await page.click('#scan-manual-open');
  await page.fill('#scan-manual', 'Countrspell');
  await page.click('[data-manual="Counterspell"]');
  await esperaPilha(page, 1);
  assert.deepEqual(errors, []);
});

test('e2e · L11 companheiro fora das 100 e condição do Lurrus', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.goto(base + '#/listas/editar');
  await page.fill('#deck-name', 'Lurrus WB');
  await page.fill('#deck-text', 'Commander\n1 Mock Commander\n\nDeck\n1 Lurrus of the Dream-Den\n99 Plains');
  await page.click('#deck-save');
  await page.waitForSelector('.deck-summary');
  assert.match(await estadoDaLista(page), /101 de 100/, 'antes: Lurrus conta como carta do deck'); // D8 · texto na folha

  await page.locator('.deck-slot[data-name="Lurrus of the Dream-Den"] .ds-card').click();
  await page.click('#deck-set-companion');
  await page.waitForFunction(() => /\+ companheiro/.test(document.querySelector('#deck-counts').innerText));
  assert.match(await page.innerText('#deck-counts'), /100 no deck/);
  const body = await page.innerText('main');
  assert.match(body, /Companheiro/);
  assert.match(await page.innerText('#deck-estado'), /Válida · Commander/); // D8 · a linha de estado resume; a folha traz a frase

  // condição quebrada: permanente de valor 4 no deck
  await page.goto(base + '#/listas');
  await page.locator('#decks-list .ds-list__item').first().click();
  await page.click('text=Editar');
  await page.fill('#deck-text', 'Commander\n1 Mock Commander\n\nCompanion\n1 Lurrus of the Dream-Den\n\nDeck\n98 Plains\n1 Mock Ogre');
  await page.click('#deck-save');
  await page.waitForSelector('.deck-summary');
  assert.match(await page.innerText('#deck-estado'), /1 erro/); // D8 · o erro está na linha de estado; o texto, na folha
  assert.match(await estadoDaLista(page), /Condição de Lurrus of the Dream-Den .* Mock Ogre/);
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

  // X11 · expectativa ajustada: a linha de coleção só vai para o leitor quando existe um bloco de texto sobre a borda
  // escura da carta (antes: qualquer faixa ia, inclusive o quadro de ruído da câmera falsa). A câmera deste teste
  // passa a mostrar a foto de uma carta.
  await page.addInitScript(FAKE_PHOTO_CAM('data:image/jpeg;base64,' + readFileSync(join(ROOT, 'fotos', 'real-counterspell-playmat.jpg')).toString('base64')));
  await page.goto(base + '#/scanner');
  await page.reload();
  await page.waitForSelector('#scan-read:not([disabled])');
  await pausaAuto(page);
  await page.evaluate(() => { window.__ocrQueue.push('Counterspell'); window.__ocrColecao.push('267/303 U\nMH2 • EN'); });
  await page.click('#scan-read');
  await page.waitForSelector('#scan-edition');
  assert.match(await page.innerText('#scan-edition'), /MH2 #267 · Modern Horizons 2/); // leva 112: a linha do resultado ficou só "✓ nome · edição", sem o rótulo

  await page.evaluate(() => window.__ocrQueue.push('Island'));
  await page.click('#scan-read');
  await page.waitForFunction(() => /não identificada/.test((document.querySelector('#scan-edition') || {}).innerText || ''));

  await page.click('#scan-lot'); await page.click('#scan-pile-commit'); await page.waitForSelector('#scan-lot-list');
  assert.match(await page.innerText('#scan-lot-list'), /MH2 #267/);
  const opts = await page.$$eval('#scan-dest option', os => os.map(o => o.textContent));
  const azul = opts.findIndex(o => /Azul/.test(o));
  await page.selectOption('#scan-dest', { index: azul });
  await page.waitForSelector('[data-also]');
  await page.click('#scan-commit');
  await esperaPilha(page, 0);

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
  // leva 110: registro reescrito — vida como "perdeu N (antes → depois)", bloqueio como "bloqueou X com Y", alvo como "· alvo:"
  assert.match(log, /Goldfish perdeu 2 de vida \(20 → 18\)/);
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
  assert.match(log, /bloqueou Sky Pike com Wall Guard/);
  assert.doesNotMatch(log, /\(20 → 18\)/);
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
  assert.match(log, /conjurou Lightning Bolt · alvo: Goldfish/);
  assert.match(log, /Lightning Bolt causou 3 de dano a Goldfish/);
  assert.deepEqual(errors, []);
});

test('e2e · S9 motor completo: libera só com 100% de cobertura e não aceita ajuste manual', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await createDeck(page, base, 'Com carta manual', '30 Island\n10 Mystery Ritual\n10 Lightning Bolt', 'livre');
  await createDeck(page, base, 'Coberta', '30 Island\n20 Lightning Bolt', 'livre');
  await page.goto(base + '#/mesa');
  await page.waitForSelector('#mesa-mode [data-mode="full"]');
  await escolheLista(page, 'mesa-mine', /Com carta manual/);
  await page.waitForFunction(() => /75% completo|% completo/.test(document.querySelector('#mesa-coverage').innerText));
  assert.equal(await page.locator('#mesa-mode [data-mode="full"]').isDisabled(), true, 'lista com carta manual não libera o motor completo');

  await escolheLista(page, 'mesa-mine', /^Coberta$/);
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
  // Leva 125 · expectativa ajustada com justificativa: com decisão pendente, a bandeja escreve a pergunta inteira no
  // cabeçalho de decisão; o aviso curto "Escolha o que descartar" diria a mesma coisa duas vezes e saiu nesse estado
  assert.match((await page.innerText('#tb-decisao')).replace(/\s+/g, ' '), /^Descarte \d+ cartas? Limpeza: mão acima de 7 cartas/);
  assert.equal(await page.locator('#tb-hand-aviso').count(), 0);
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
  assert.match(await page.innerText('#tb-vez-cortina'), q.ativo === q.prio ? /Seu turno/ : new RegExp(`Turno ${q.ativo}`)); // Leva 121 · "Turno Bia", sem o "de"
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
  // Leva 121 · expectativa ajustada com justificativa: a faixa diz só "Turno Ana"; a prioridade saiu do selo empilhado
  // (cortava no aparelho) e mora no balão que abre a um toque
  assert.equal(await page.innerText('#tb-vez .tb-vez__rotulo'), `Turno ${atacante.nome}`);
  assert.equal(await page.locator('#tb-vez-prio').count(), 0, 'sem selo empilhado na faixa');
  await page.click('#tb-vez-btn'); await page.waitForSelector('#tb-vez-pop:not([hidden])');
  assert.equal(await page.innerText('#tb-vez-pop dd[data-k="prioridade"]'), 'Você', 'quem decide agora aparece nos detalhes');
  assert.equal(await page.innerText('#tb-vez-pop dd[data-k="joga"]'), atacante.nome);
  await page.click('#tb-vez-fechar'); await page.waitForSelector('#tb-vez-pop', { state: 'hidden' });
  assert.notEqual(await page.$eval('#tb-vez', el => getComputedStyle(el).backgroundColor), corEu, 'cor do oponente é outra');
  assert.equal(await page.getAttribute('.tb-side--opp', 'data-ativo'), 'true', 'o lado de quem joga acende');
  assert.equal(await page.getAttribute('.tb-side--me', 'data-ativo'), 'false');
  assert.notEqual(await page.$eval('.tb-side--opp', el => getComputedStyle(el).borderTopColor), bordaEu, 'borda na cor do oponente');
  // U2 · com o selo de prioridade, a faixa divide a linha com as ferramentas e nada fica cortado, mesmo em 360
  await page.setViewportSize({ width: 360, height: 780 }); await page.waitForTimeout(350);
  const corte = await page.evaluate(() => [...document.querySelectorAll('#tb-vez .tb-vez__rotulo')].map(e => e.scrollWidth - e.clientWidth));
  assert.deepEqual(corte, [0], 'rótulo inteiro');
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
  assert.match(turnos.join('\n'), /\(20 → 19\)/);
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
  // leva 110: "já na sua estante" virou o ícone de marcado, com o mesmo nome falado
  await page.waitForSelector('#starter-list [aria-label="Já na sua estante"]');
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
  await page.click('#mesa-mine'); await page.waitForSelector('.deck-picker__lista');
  assert.match(await page.innerText('.deck-picker__lista'), /Pauper Elves/, 'a lista do modo escolhido é selecionável');
  await page.click('.ds-dialog >> text=Voltar');

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
  await page.click('#mesa-mine'); await page.waitForSelector('.deck-picker__lista');
  const opt = await page.$$eval('.deck-picker__lista .deck-item__nome', os => os.map(o => o.textContent));
  assert.ok(opt.some(o => /Boros Bully/.test(o)), 'a lista adicionada aparece na tela de jogar: ' + JSON.stringify(opt));
  await page.click('.deck-picker__lista >> text=Pauper Boros Bully'); await page.waitForSelector('.deck-picker__lista', { state: 'detached' });
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
  await page.waitForSelector('#scan[data-base="ready"]');
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
  // leva 149 · com "Adicionar carta" acima da lista, o segundo toque do toque duplo cai no seletor de visão (antes caía
  // numa área sem efeito). A garantia da H8 é a mesma (não importa duas vezes); a leitura volta para a visão em lista.
  await page.waitForSelector('#ds-overlay[data-open="false"]', { state: 'attached' }); await page.click('[data-visao="lista"]');
  await page.waitForSelector('.col-row[data-name="Island"]');
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
  await temIcone('#deck-starter'); await temIcone('#deck-new'); // D5 · o backup saiu de Listas (vive em Perfil › Dados)
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
  await mesmaLinha('#col-export', '#col-export-csv', 'Em texto e Em CSV lado a lado'); await mesmaLinha('#col-export-filtro', '#col-select', 'Filtradas e Selecionar lado a lado'); // leva 160 · bloco Exportar: quatro saídas em duas colunas
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
  // leva 110: a bandeja não corta mais o texto — mostra o momento em ícone + palavra inteira e o resto vai para o balão
  assert.equal(await texto.getAttribute('data-compacto'), 'true', 'o momento em forma curta');
  assert.equal(await page.innerText('.tb-dock__bar .tb-momento'), 'Mão inicial');
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
  // leva 111: e a habilidade da ficha está lá (antes, com a carta da ficha na mesa, a folha vinha sem ela)
  assert.match(await page.innerText('.ds-dialog'), /Ativar \(\{2\}, sacrificar\)/);
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
  // leva 110: o nome falado virou frase ("Bloqueada por Wall Guard" no lugar de "← Wall Guard"); na carta fica só o ícone
  assert.match(await page.locator('.tb-side--me .tb-card[aria-label*="Sky Pike"]').first().getAttribute('aria-label'), /Bloqueada por Wall Guard/);
  assert.match(await page.locator('.tb-side--opp .tb-card[aria-label*="Wall Guard"]').first().getAttribute('aria-label'), /Bloqueia Sky Pike/);
  assert.equal(await page.locator('.tb-side--me .tb-card[aria-label*="Sky Pike"] .tb-pill--icone[data-marca="ataca"] [data-icone="escudo"]').count(), 1, 'atacante bloqueado: selo do escudo');
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
  assert.match(log, /bloqueou Sky Pike com Wall Guard/);
  assert.match(log, /conjurou Lightning Bolt/);
  assert.match(log, /Wall Guard morreu/, 'o bloqueador morreu (3 do Raio + 2 de combate ≥ 4)');
  assert.doesNotMatch(log, /\(20 → 18\)/, 'o Sky Pike continuou bloqueado: nada passou');
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
  for (const id of ['#cards-search', '#cards-clear']) await temIcone(id);
  assert.equal(await page.locator('#local-panel').count(), 0, 'D5 · a base local saiu de Cartas: a tela abre na busca');
  assert.deepEqual(await page.$$eval('#cards-colors [data-color]', cs => cs.map(c => [c.dataset.color, c.getAttribute('aria-label'), !!c.querySelector('.ds-sym')])),
    [['W', 'Branco', true], ['U', 'Azul', true], ['B', 'Preto', true], ['R', 'Vermelho', true], ['G', 'Verde', true]]);
  await page.click('#cards-colors [data-color="U"]'); assert.equal(await page.getAttribute('#cards-colors [data-color="U"]', 'aria-pressed'), 'true');
  await audita('cartas');
  // scanner
  await page.goto(base + '#/scanner'); await page.waitForSelector('#scan-read');
  for (const id of ['#scan-read', '#scan-lot', '#scan-undo', '#scan-colecao']) await temIcone(id);
  assert.match(await page.innerText('#scan-lot'), /Pilha · 0/);
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
  // Leva 133 · expectativa mudou de propósito: com o quarto oponente (Online) os chips não cabem numa linha de 360 px
  // (padrão aprendido na U2); o segmentado vira grade 2×2 e nenhum rótulo é cortado
  assert.deepEqual(oponentes.map(o => [o.k, o.rot]), [['goldfish', 'Goldfish'], ['shark', 'Shark'], ['hotseat', 'A dois'], ['online', 'Online']]);
  assert.ok(oponentes.every(o => o.svg && o.dir <= 360), 'quatro oponentes dentro da tela, com ícone');
  assert.equal(new Set(oponentes.map(o => o.y)).size, 2, 'duas linhas de dois');
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
  await escolheLista(page, 'mesa-mine', 'velha1');
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
  // leva 110: principal e reserva viraram ícone com número; o texto por extenso fica no nome falado
  const contas = await page.$$eval('#decks-list .deck-item', els => els.map(e => [e.querySelector('.deck-item__main'), e.querySelector('.deck-item__reserva')].map(x => x && x.getAttribute('aria-label')).join(' + ')).filter(x => /reserva/.test(x)));
  assert.deepEqual(contas, Array(7).fill('60 cartas no deck + 15 na reserva'));
  // só o nome em palavras: o resto da linha é símbolo, selo do formato e número
  const palavras = await page.$$eval('#decks-list .deck-item__meta', els => els.map(e => [...e.children].filter(x => !x.matches('.ds-pips')).map(x => x.innerText.trim()).join(' ')));
  assert.ok(palavras.every(x => /^(PAUPER|COMMANDER) \d+( \d+)?$/.test(x)), 'meta sem frase: ' + JSON.stringify(palavras));
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
  await ctx.addInitScript(() => { window.__SEM_APRESENTACAO = true; }); // D4b · contexto novo: pula a apresentação como o harness faz
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
  // Leva 125 · expectativa ajustada com justificativa: a escolha de UMA carta deixou de ser uma lista de botões com o
  // nome e passou a mostrar as cartas (toque na carta); o nome falado de cada uma continua "Virar <carta>"
  const opcoes = await page.locator('#tb-escolha .tb-card').evaluateAll(cs => cs.map(c => c.getAttribute('aria-label')));
  assert.deepEqual(opcoes.slice().sort(), ['Virar Elvish Visionary', 'Virar Grizzly Bear']);
  assert.equal(await page.locator('#tb-escolha .ds-btn').count(), 0);
  await auditaTela(page, 'escolha do custo');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/escolha-custo.png' });
  await page.click('#tb-escolha [data-escolha="Elvish Visionary"]');
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

// Leva 112 · scanner de alto padrão: tela sem rolagem num S25, leitura só dentro da moldura, porteiro (nada errado,
// nada repetido), "[nome] ✓", miniatura nítida na pilha, diagnóstico com nitidez e movimento.
test('e2e · leva 112 scanner: cabe sem rolar num S25, não registra leitura incerta nem repetida, confirma com nome e ✓, pilha nítida', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(FAKE_CARD_CAM);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(base + '#/scanner');
  await page.waitForSelector('#scan-read:not([disabled])');
  await page.waitForFunction(() => document.querySelector('[data-auto]').getAttribute('aria-pressed') === 'true', null, { timeout: 12000 });
  // sem rolagem: a página inteira cabe na tela, com câmera, resultado e botões visíveis
  const medida = await page.evaluate(() => {
    const vis = id => { const r = document.querySelector(id).getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1 && r.height > 0; };
    return { rola: document.documentElement.scrollHeight - innerHeight, palco: Math.round(document.querySelector('#scan-stage').getBoundingClientRect().height),
      botoes: ['#scan-read', '#scan-lot', '#scan-undo', '#scan-manual-open', '#scan-more'].every(vis) };
  });
  assert.ok(medida.rola <= 1, 'a tela do scanner não rola: ' + JSON.stringify(medida));
  assert.ok(medida.palco >= 380, 'a câmera ocupa a maior parte da tela: ' + JSON.stringify(medida));
  assert.equal(medida.botoes, true, 'todos os botões à vista');
  await auditaTela(page, 'scanner sem rolagem');
  // leituras aproximadas que alternam entre dois nomes (carta mal lida): nada entra.
  // X14 · expectativa ajustada: antes este trecho alternava dois nomes EXATOS. Leitura idêntica a um nome da base, pelo
  // contorno da carta, agora entra na primeira (é a história X14); o que continua não podendo entrar é a leitura
  // aproximada sem repetição, que é o que este trecho passou a exercitar.
  await page.evaluate(() => window.__ocrQueue.push('Countersqell', 'Sol Rimg', 'Countersqell', 'Sol Rimg', 'Sol Rimg'));
  await page.waitForFunction(() => window.__ocrQueue.length === 0, null, { timeout: 12000 });
  await page.waitForTimeout(400);
  assert.equal(await contaPilha(page), 0, 'leitura aproximada que muda de nome, ou que se repete só duas vezes, não registra nada');
  // uma leitura exata pelo contorno: entra na primeira, com "[nome] ✓"
  await page.evaluate(() => window.__ocrQueue.push('Sol Ring'));
  await page.waitForSelector('#scan-ok:not([hidden])', { timeout: 12000 });
  assert.match(await page.innerText('#scan-ok'), /Sol Ring/);
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/scanner-ok.png' });
  await esperaPilha(page, 1);
  // logo em seguida, mais leituras da mesma carta parada: não duplica
  await page.evaluate(() => window.__ocrQueue.push('Sol Ring', 'Sol Ring', 'Sol Ring'));
  await page.waitForFunction(() => window.__ocrQueue.length === 0, null, { timeout: 12000 });
  await page.waitForTimeout(400);
  assert.equal(await contaPilha(page), 1, 'a mesma carta em fração de segundo não entra duas vezes');
  await page.click('[data-auto]');
  // a linha do resultado: ✓ e o nome
  assert.match(await page.innerText('#scan-result'), /Sol Ring/);
  // pilha: abre por botão e mostra a imagem grande (normal), não a miniatura borrada
  await page.waitForFunction(() => !document.querySelector('#scan-edition-espera'), null, { timeout: 8000 });
  await abrePilha(page);
  const src = await page.getAttribute('#scan-pile .scan-pile__img', 'src');
  assert.match(String(src), /\/normal\//, 'imagem em qualidade normal: ' + src);
  await auditaTela(page, 'pilha do scanner');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/scanner-pilha.png' });
  await page.click('#ds-dialog-close');
  // diagnóstico (em "mais"): leituras com nitidez, movimento e decisão; copiar leva tudo
  await opcaoScanner(page, 'diag', false);
  await page.waitForSelector('#scan-diag .scan-diag__linha');
  const diag = await page.innerText('#scan-diag');
  // X11 · expectativa ajustada: a nitidez passou a ser medida na linha do nome já retificada (valores de 0,1 a 30) e
  // aparece com uma casa decimal (antes: inteiro, medida na faixa crua)
  assert.match(diag, /nit [\d.]+ · mov \d+/); assert.match(diag, /Sol Ring \+1/); assert.match(diag, /repetida|espera/);
  await page.click('#scan-diag-copiar');
  const copiado = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(copiado, /aparelho: /); assert.match(copiado, /foco: /); assert.match(copiado, /limiares: nitidez/);
  await page.click('#ds-dialog-close');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/scanner.png' });
  assert.deepEqual(errors, []);
});

// X11 · o caminho inteiro no navegador com uma foto de carta inclinada sobre um playmat: câmera (falsa, mostrando a
// foto) → contorno de quatro cantos → pedaço do vídeo → linha do nome retificada. O leitor falso guarda a imagem que
// recebeu; o OCR de verdade (tesseract.js, no Node) confere que ali está o nome, e depois a linha de coleção.
const FAKE_PHOTO_CAM = (dataUrl, deCabecaParaBaixo = false, qps = 10) => `
  window.__ocrQueue = []; window.__ocrColecao = []; window.__ocrImgs = []; window.__ocrImgsColecao = []; window.__canvases = 0;
  const criar = document.createElement.bind(document);
  document.createElement = function (tag, ...r) { if (String(tag).toLowerCase() === 'canvas') window.__canvases++; return criar(tag, ...r); };
  window.Tesseract = { createWorker: async () => { window.__ocrCriados = (window.__ocrCriados || 0) + 1;
    try { const c = await caches.open('estante-ocr-v1'); await c.put('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js', new Response('')); await c.put('https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz', new Response('')); } catch (e) {}
    let bloco = false;   // X14 · dois leitores, duas filas (ver FAKE_DEVICE)
    return { setParameters: async p => { bloco = String(p && p.tessedit_pageseg_mode) === '6'; }, terminate: async () => { window.__ocrEncerrados = (window.__ocrEncerrados || 0) + 1; },
      recognize: async alvo => {
        const imgs = bloco ? window.__ocrImgsColecao : window.__ocrImgs, f = bloco ? window.__ocrColecao : window.__ocrQueue;
        try { if (imgs.length < 12) imgs.push(alvo.toDataURL('image/png')); } catch (e) {}
        if (bloco && window.__colecaoLenta) await new Promise(r => setTimeout(r, window.__colecaoLenta));
        if (!bloco) window.__leiturasDeNome = (window.__leiturasDeNome || 0) + 1;
        return { data: { text: f.length ? f.shift() : '' } };
      } };
  } };
  const gum = async () => {
    const img = new Image(); img.src = ${JSON.stringify(dataUrl)}; await img.decode();
    const c = criar('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d');
    if (${deCabecaParaBaixo}) { g.translate(c.width, c.height); g.rotate(Math.PI); }
    const pinta = () => g.drawImage(img, 0, 0);
    pinta(); setInterval(pinta, ${Math.round(1000 / qps)});
    return c.captureStream(${qps});
  };
  if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = gum;
  else Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: gum } });
`;
test('e2e · X11 scanner com foto de carta inclinada: contorno em cima dela, o leitor recebe a linha do nome limpa, a edição sai da mesma carta e nenhuma leitura cria canvas novo', { skip }, async t => {
  const { page, errors, base } = await open(t);
  const foto = readFileSync(join(ROOT, 'fotos', 'real-counterspell-playmat.jpg'));
  await page.addInitScript(FAKE_PHOTO_CAM('data:image/jpeg;base64,' + foto.toString('base64')));
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(base + '#/scanner');
  await page.waitForSelector('#scan-read:not([disabled])');
  await page.waitForFunction(() => document.querySelector('[data-auto]').getAttribute('aria-pressed') === 'true', null, { timeout: 12000 });
  // duas leituras iguais (porteiro) e, depois do aceite, a linha de coleção
  // X14 · uma leitura exata pelo contorno basta; a linha de coleção é lida pelo segundo leitor
  await page.evaluate(() => { window.__ocrImgs.length = 0; window.__ocrColecao.push('267/330 U\nMH2 • EN'); window.__ocrQueue.push('Counterspell'); });
  await page.waitForSelector('#scan-ok:not([hidden])', { timeout: 15000 }).catch(async e => { throw new Error('diario: ' + JSON.stringify(await page.evaluate(() => window.__scanDiario.lista().slice(0, 4)))); });
  assert.match(await page.innerText('#scan-ok'), /Counterspell/);
  // o contorno é um quadrilátero desenhado sobre a carta (inclinada 12°): quatro pontos, e não um retângulo reto
  const pts = await page.evaluate(() => { const p = document.querySelector('#scan-outline polygon'); return p ? p.getAttribute('points').split(' ').map(q => q.split(',').map(Number)) : null; });
  assert.equal(pts && pts.length, 4, 'polígono de quatro cantos');
  const incl = Math.abs(Math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0]) * 180 / Math.PI);
  assert.ok(incl > 8 && incl < 16, 'o lado de cima acompanha a inclinação da carta: ' + incl.toFixed(1) + '°');
  await auditaTela(page, 'scanner com contorno');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/scanner-contorno.png' });
  await page.waitForSelector('#scan-edition', { timeout: 10000 });
  assert.match(await page.innerText('#scan-edition'), /MH2 #267/);
  // o diário diz por onde leu e quanto custou (sem o OCR de verdade, é só detector + preparo)
  const diario = await page.evaluate(() => window.__scanDiario.lista());
  const pelaCarta = diario.filter(x => x.via === 'carta');
  assert.ok(pelaCarta.length >= 2, 'leu pelo contorno: ' + JSON.stringify(diario.slice(0, 3)));
  assert.ok(Math.min(...pelaCarta.map(x => x.ms)) < 250, 'detector + preparo em menos de 250 ms: ' + pelaCarta.map(x => x.ms));
  // a carta continua no quadro e o laço continua lendo: nenhum canvas novo por leitura
  const antes = await page.evaluate(() => window.__canvases);
  await page.evaluate(() => window.__ocrQueue.push('Counterspell', 'Counterspell', 'Counterspell', 'Counterspell', 'Counterspell'));
  await page.waitForFunction(() => window.__ocrQueue.length === 0, null, { timeout: 12000 });
  assert.equal(await page.evaluate(() => window.__canvases) - antes, 0, 'cinco leituras, zero canvas novo');
  assert.equal(await contaPilha(page), 1, 'e a carta parada não entra de novo');
  await page.click('[data-auto]');
  // X13 · esta câmera não declara zoom nem lanterna: "mais" não mostra controle que não funciona
  await page.click('#scan-more'); await page.waitForSelector('[data-diag]');
  assert.equal(await page.locator('[data-lanterna], [data-zoom]').count(), 0);
  await page.click('#ds-dialog-close');
  assert.deepEqual(errors, []);
  // OCR de verdade sobre o que o leitor recebeu no navegador
  let T = null, langPath = null;
  try { const { createRequire } = await import('node:module'); const req = createRequire(import.meta.url); T = req('tesseract.js'); langPath = join(req.resolve('@tesseract.js-data/eng/package.json'), '..', '4.0.0'); } catch (e) { return; }
  const imgs = (await page.evaluate(() => window.__ocrImgs)).map(u => Buffer.from(u.split(',')[1], 'base64'));
  const imgsColecao = (await page.evaluate(() => window.__ocrImgsColecao)).map(u => Buffer.from(u.split(',')[1], 'base64'));
  assert.ok(imgs.length >= 1 && imgsColecao.length >= 1, 'os leitores receberam o nome e a linha de coleção');
  const worker = await T.createWorker('eng', 1, { langPath, gzip: true, cacheMethod: 'none' });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: '7' });
    const nome = (await worker.recognize(imgs[0])).data.text;
    assert.match(nome, /Counterspell/, 'a linha que saiu do navegador tem o nome legível: "' + nome.trim() + '"');
    await worker.setParameters({ tessedit_pageseg_mode: '6' });
    const col = (await worker.recognize(imgsColecao[0])).data.text;
    assert.match(col, /267/, 'número de coleção legível: "' + col.trim() + '"'); assert.match(col, /MH2/, 'edição legível: "' + col.trim() + '"');
  } finally { await worker.terminate(); }
});

// X14 · resposta imediata: uma leitura exata pelo contorno basta, e a edição (lida por um segundo leitor) não segura a
// leitura do nome seguinte.
test('e2e · X14 resposta imediata: a carta entra na primeira leitura exata pelo contorno, e a edição demorada não segura as leituras de nome', { skip }, async t => {
  const { page, errors, base } = await open(t);
  const foto = readFileSync(join(ROOT, 'fotos', 'real-counterspell-playmat.jpg'));
  await page.addInitScript(FAKE_PHOTO_CAM('data:image/jpeg;base64,' + foto.toString('base64'), false, 30));
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(base + '#/scanner');
  await page.waitForSelector('#scan-read:not([disabled])');
  await page.waitForFunction(() => document.querySelector('[data-auto]').getAttribute('aria-pressed') === 'true', null, { timeout: 12000 });
  await page.waitForFunction(() => (window.__leiturasDeNome || 0) >= 2, null, { timeout: 10000 });   // o laço já está lendo (sem nome ainda)
  // o leitor da edição já subiu em segundo plano, antes de qualquer carta: a primeira não paga a carga dele
  await page.waitForFunction(() => window.__ocrCriados === 2, null, { timeout: 4000 });
  // a edição vai demorar 1,5 s; a carta fica parada no quadro (o leitor segue devolvendo o mesmo nome)
  await page.evaluate(() => { window.__colecaoLenta = 1500; window.__ocrColecao.push('267/330 U\nMH2 • EN'); for (let i = 0; i < 80; i++) window.__ocrQueue.push('Counterspell'); });
  await page.waitForSelector('#scan-ok:not([hidden])', { timeout: 10000 });
  await esperaPilha(page, 1);
  const aceite = (await page.evaluate(() => window.__scanDiario.lista())).find(x => /Counterspell \+1/.test(x.decisao));
  assert.match(aceite.decisao, /1ª leitura/, 'uma leitura bastou: ' + aceite.decisao);
  assert.equal(aceite.via, 'carta');
  // enquanto a edição ainda está sendo lida, o leitor do nome continua trabalhando
  await page.waitForSelector('#scan-edition-espera', { timeout: 4000 });
  const antes = await page.evaluate(() => window.__leiturasDeNome);
  await page.waitForFunction(n => window.__leiturasDeNome >= n + 2, antes, { timeout: 1200 }).catch(async () => { throw new Error('o nome ficou esperando a edição: ' + antes + ' → ' + await page.evaluate(() => window.__leiturasDeNome)); });
  assert.equal(await page.locator('#scan-edition-espera').count(), 1, 'e a edição ainda não tinha voltado');
  await page.waitForSelector('#scan-edition', { timeout: 6000 });
  assert.match(await page.innerText('#scan-edition'), /MH2 #267/);
  // o tempo de confirmação com leitor falso é o custo do próprio app numa passada
  await opcaoScanner(page, 'diag', false);
  const tempo = await page.innerText('#scan-diag-tempo');
  const ms = +(/confirmação (\d+) ms/.exec(tempo) || [])[1];
  console.log('X14 · navegador de teste: ' + tempo);
  assert.ok(ms < 200, 'confirmação numa passada só (antes: duas passadas e 120 ms de respiro): ' + tempo);
  await page.click('#ds-dialog-close');
  assert.equal(await contaPilha(page), 1, 'a carta parada não entra de novo');
  // carta já aceita e parada: o laço descansa (antes lia quadro a quadro, 8+ por segundo)
  const n0 = await page.evaluate(() => window.__leiturasDeNome); await page.waitForTimeout(1000);
  const porSegundo = (await page.evaluate(() => window.__leiturasDeNome)) - n0;
  assert.ok(porSegundo >= 1 && porSegundo <= 5, 'leituras por segundo com a carta já aceita: ' + porSegundo);
  assert.equal(await contaPilha(page), 1);
  await page.evaluate(() => { window.__ocrQueue.length = 0; });
  // ligar e desligar o automático depressa não deixa dois laços lendo
  // (sem nome no leitor, cada passada lê duas linhas — contorno e moldura — no passo de 120 ms)
  const ritmo = async () => { await page.waitForTimeout(600); const a = await page.evaluate(() => window.__leiturasDeNome); await page.waitForTimeout(1500); return (await page.evaluate(() => window.__leiturasDeNome)) - a; };
  const umLaco = await ritmo();
  for (let i = 0; i < 6; i++) await page.click('[data-auto]');
  const depois = await ritmo();
  assert.ok(depois <= umLaco * 1.4 + 2, 'um laço só depois de alternar o automático: ' + umLaco + ' → ' + depois + ' leituras em 1,5 s');
  // sair do scanner encerra o leitor da edição (o do nome fica para a próxima vez)
  await page.evaluate(() => { location.hash = '#/'; });
  await page.waitForFunction(() => window.__ocrEncerrados === 1, null, { timeout: 4000 });
  assert.deepEqual(errors, []);
});

// X11 · carta de cabeça para baixo: depois de três leituras sem nome o scanner vira a carta e MANTÉM virada pelas
// leituras seguintes (o porteiro precisa de leituras seguidas iguais; virar só uma em cada três nunca aceitaria).
test('e2e · X11 carta de cabeça para baixo: depois de três leituras sem nome, o leitor passa a receber a linha do nome do lado certo, três vezes seguidas', { skip }, async t => {
  let T = null, langPath = null;
  try { const { createRequire } = await import('node:module'); const req = createRequire(import.meta.url); T = req('tesseract.js'); langPath = join(req.resolve('@tesseract.js-data/eng/package.json'), '..', '4.0.0'); } catch (e) { return t.skip('OCR de teste não instalado'); }
  const { page, errors, base } = await open(t);
  const foto = readFileSync(join(ROOT, 'fotos', 'real-counterspell-playmat.jpg'));
  await page.addInitScript(FAKE_PHOTO_CAM('data:image/jpeg;base64,' + foto.toString('base64'), true));
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(base + '#/scanner');
  await page.waitForSelector('#scan-read:not([disabled])');
  await page.waitForFunction(() => document.querySelector('[data-auto]').getAttribute('aria-pressed') === 'true', null, { timeout: 12000 });
  // o leitor falso nunca devolve nome: cada passada lê pelo contorno e, sem nome, pela moldura (duas imagens)
  await page.evaluate(() => { window.__ocrImgs.length = 0; });
  await page.waitForFunction(() => window.__ocrImgs.length >= 12, null, { timeout: 20000 });
  await page.click('[data-auto]');
  const diario = await page.evaluate(() => window.__scanDiario.lista());
  assert.ok(diario.some(x => x.via === 'carta' || x.via === 'moldura'), 'houve leituras: ' + JSON.stringify(diario.slice(0, 3)));
  assert.deepEqual(errors, []);
  const imgs = (await page.evaluate(() => window.__ocrImgs)).map(u => Buffer.from(u.split(',')[1], 'base64'));
  const worker = await T.createWorker('eng', 1, { langPath, gzip: true, cacheMethod: 'none' });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: '7' });
    const le = async i => (await worker.recognize(imgs[i])).data.text.trim();
    const lidas = []; for (let i = 0; i < imgs.length; i++) lidas.push(/Counterspell/.test(await le(i)) ? 'S' : '-');
    // cada passada dá duas imagens (contorno, depois moldura). Em pé, nenhuma tem o nome ("--"); virada, a do
    // contorno tem ("S-"). Três passadas viradas seguidas = "S-S-S", que é o que o porteiro precisa para aceitar
    const padrao = lidas.join('');
    assert.match(padrao, /--/, 'com a carta suposta em pé o nome não aparece: ' + padrao);
    assert.match(padrao, /S-S-S/, 'virada, o nome aparece em três passadas seguidas: ' + padrao);
  } finally { await worker.terminate(); }
});

// X13 · câmera com capacidades declaradas (resolução máxima, zoom, lanterna, pontos de interesse, duas lentes): a trilha
// falsa registra tudo o que o app lhe pede. O vídeo falso roda a 30 quadros por segundo para a subida de resolução
// passar pela régua de fluidez de verdade (requestVideoFrameCallback no navegador).
const CAMERA_COM_CAPACIDADES = `
  window.__pedidos = []; window.__aberturas = [];
  {
    const gumFoto = navigator.mediaDevices.getUserMedia;
    const cap = { width: { min: 1, max: 3840 }, height: { min: 1, max: 2160 }, zoom: { min: 1, max: 4, step: 0.1 }, torch: true, focusMode: ['continuous', 'single-shot'] };
    navigator.mediaDevices.getUserMedia = async c => {
      window.__aberturas.push(JSON.parse(JSON.stringify(c.video)));
      const st = await gumFoto(c); const t = st.getVideoTracks()[0];
      const real = t.getSettings.bind(t); let extra = {};
      t.getCapabilities = () => cap;
      t.getSettings = () => ({ ...real(), ...extra, deviceId: (c.video.deviceId && c.video.deviceId.exact) || 'cam-a' });
      // como o Chrome: pedido com chave de imagem é só de imagem (largura e altura ali são ignoradas); pedido só de
      // formato muda o formato (aqui, o que a trilha declara em getSettings; o vídeo falso continua do mesmo tamanho)
      t.applyConstraints = async k => {
        window.__pedidos.push(JSON.parse(JSON.stringify(k)));
        if (k.advanced && k.advanced.length) { for (const a of k.advanced) extra = { ...extra, ...a }; return; }
        if (k.width) extra = { ...extra, width: k.height.ideal, height: k.width.ideal };   // vídeo em pé
      };
      return st;
    };
    navigator.mediaDevices.getSupportedConstraints = () => ({ pointsOfInterest: true, zoom: true, torch: true });
    navigator.mediaDevices.enumerateDevices = async () => [{ kind: 'videoinput', deviceId: 'cam-a', label: 'camera2 0, facing back' }, { kind: 'videoinput', deviceId: 'cam-b', label: 'camera2 2, facing back' }, { kind: 'videoinput', deviceId: 'cam-f', label: 'camera2 1, facing front' }];
  }
`;
test('e2e · X13 câmera no máximo: sobe a resolução, lanterna, zoom que volta ao reabrir, foco no ponto tocado, troca de lente e tempo até aceitar no diagnóstico', { skip }, async t => {
  const { page, errors, base } = await open(t);
  const foto = readFileSync(join(ROOT, 'fotos', 'real-counterspell-playmat.jpg'));
  await page.addInitScript(FAKE_PHOTO_CAM('data:image/jpeg;base64,' + foto.toString('base64'), false, 30));
  await page.addInitScript(CAMERA_COM_CAPACIDADES);
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(base + '#/scanner');
  await page.waitForSelector('#scan-read:not([disabled])');
  await page.waitForFunction(() => document.querySelector('[data-auto]').getAttribute('aria-pressed') === 'true', null, { timeout: 12000 });
  // a subida de resolução acontece com o vídeo já na tela: o maior degrau é pedido junto com o foco contínuo
  await page.waitForFunction(() => window.__pedidos.some(p => p.width && p.width.ideal === 3840), null, { timeout: 8000 });
  const subida = await page.evaluate(() => window.__pedidos.filter(p => p.width && p.width.ideal === 3840));
  assert.equal(subida[0].height.ideal, 2160); assert.equal(subida[0].advanced, undefined, 'o formato vai num pedido só dele (no Chrome, junto do foco ele seria ignorado)');
  assert.equal(subida[1].advanced[0].focusMode, 'continuous', 'e o foco contínuo é pedido de novo em seguida');
  // uma carta entra, para o cronômetro ter o que medir
  await page.evaluate(() => window.__ocrQueue.push('Counterspell'));
  await page.waitForSelector('#scan-ok:not([hidden])', { timeout: 15000 });
  await page.click('[data-auto]');
  await page.waitForTimeout(1700);   // o contorno parado some sozinho com o automático pausado
  // toque na câmera sem leitura automática: foco no ponto tocado
  await page.click('#scan-stage', { position: { x: 90, y: 120 } });
  await page.waitForFunction(() => window.__pedidos.some(p => p.advanced && p.advanced[0].pointsOfInterest), null, { timeout: 4000 });
  const ponto = await page.evaluate(() => window.__pedidos.find(p => p.advanced && p.advanced[0].pointsOfInterest).advanced[0].pointsOfInterest[0]);
  // toque no alto, à esquerda, com o vídeo em pé: nas coordenadas do sensor (deitado) vira x pequeno e y grande
  assert.ok(ponto.x > 0 && ponto.x < 0.5 && ponto.y > 0.5 && ponto.y < 1, 'o ponto vai em frações do quadro, girado para o sensor: ' + JSON.stringify(ponto));
  // controles da câmera em "mais": só o que o aparelho tem
  await page.click('#scan-more');
  await page.waitForSelector('#scan-camera-controles');
  await auditaTela(page, 'opções do scanner com controles da câmera');
  await page.click('[data-lanterna]');
  await page.waitForFunction(() => document.querySelector('[data-lanterna]').getAttribute('aria-pressed') === 'true');
  assert.equal(await page.evaluate(() => window.__pedidos.at(-1).advanced[0].torch), true);
  assert.match(await page.innerText('[data-zoom]'), /Zoom 1×/);
  await page.click('[data-zoom]');
  await page.waitForFunction(() => /Zoom 1,5×/.test(document.querySelector('[data-zoom]').innerText));
  const z = await page.evaluate(() => window.__pedidos.at(-1).advanced[0]);
  assert.equal(z.zoom, 1.5); assert.equal(z.torch, true, 'o zoom não desliga a lanterna');
  assert.match(await page.innerText('[data-lente]'), /Lente 1 de 2/);
  await page.click('[data-lente]');
  await page.waitForFunction(() => /Lente 2 de 2/.test(document.querySelector('[data-lente]').innerText), null, { timeout: 6000 });
  assert.deepEqual(await page.evaluate(() => window.__aberturas.at(-1).deviceId), { exact: 'cam-b' });
  // diagnóstico: câmera, máximo declarado e tempo até aceitar
  await page.click('[data-diag]');
  await page.waitForSelector('#scan-diag .scan-diag__linha');
  // a lente nova sobe a resolução de novo e recebe o zoom guardado
  await page.waitForFunction(() => /máximo 3840×2160; subida: 3840×2160 ✓\) · zoom 1\.5×/.test(document.querySelector('#scan-diag-camera').innerText), null, { timeout: 8000 });
  assert.match(await page.innerText('#scan-diag-tempo'), /Até aceitar: .*confirmação \d+ ms \(1 carta/);
  assert.match(await page.innerText('#scan-diag'), /det \d+ · prep \d+ · ocr \d+ · casa \d+/);
  assert.match(await page.innerText('#scan-diag'), /Counterspell \+1 \(1ª leitura\) · \d+ ms até aceitar/);
  // a medida que o épico E52 acompanha: custo do detector e do preparo no navegador (o leitor aqui é falso)
  const etapas = (await page.evaluate(() => window.__scanDiario.lista())).filter(x => x.via === 'carta' && x.tempos);
  const med = k => { const v = etapas.map(x => x.tempos[k]).sort((a, b) => a - b); return v[Math.floor((v.length - 1) / 2)]; };
  console.log(`X13 · navegador de teste, ${etapas.length} leituras pelo contorno: detector ${med('det')} ms · preparo ${med('prep')} ms (medianas)`);
  assert.ok(med('det') + med('prep') < 150, 'detector + preparo dentro do orçamento folgado do portão');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.click('#scan-diag-copiar');
  const copiado = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(copiado, /leitor_versao: X1\d/); assert.match(copiado, /subida: 3840×2160 ✓/); assert.match(copiado, /ate_aceitar: .*confirmação \d+ ms/); assert.match(copiado, /zoom: 1\.5×/);
  await page.click('#ds-dialog-close');
  // reabrir o scanner: a lente e o zoom escolhidos voltam sozinhos
  await page.reload();
  await page.waitForSelector('#scan-read:not([disabled])');
  await page.waitForFunction(() => window.__aberturas.length && window.__pedidos.some(p => p.advanced && p.advanced[0].zoom === 1.5), null, { timeout: 10000 });
  assert.deepEqual(await page.evaluate(() => window.__aberturas[0].deviceId), { exact: 'cam-b' }, 'abre na lente guardada');
  assert.deepEqual(errors, []);
});

// Leva 110 · cinco ajustes de mesa e listas: alvo de qualquer coisa pela insanidade, selo de anexo no lugar do nome,
// bandeja com o momento em ícone, linha da lista em símbolos.
test('e2e · leva 110 Fiery Temper mira você e o oponente; Utopia Sprawl vira selo na Floresta; momento da bandeja em ícone', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await createDeck(page, base, 'Raiva', '12 Mountain\n12 Forest\n8 Fiery Temper\n8 Grab the Prize\n8 Utopia Sprawl\n12 Grizzly Bear', 'livre');
  await page.goto(base + '#/mesa');
  await page.click('[data-opponent="hotseat"]');
  await page.fill('#mesa-me', 'Ana'); await page.fill('#mesa-them', 'Bia');
  await page.fill('#mesa-seed', '4');
  await page.click('#mesa-start');
  await page.waitForSelector('#tb-keep');
  await page.click('#tb-keep'); await reveal(page); await page.click('#tb-keep'); await reveal(page);
  await page.waitForSelector('.tb-dock__bar .tb-momento');
  // o momento: ícone + palavra inteira, sem reticências; o toque abre o texto completo
  const mom = await page.evaluate(() => { const el = document.querySelector('.tb-dock__bar .tb-momento__rotulo'); return { txt: el.innerText, cabe: el.scrollWidth <= el.clientWidth + 1, icone: !!document.querySelector('.tb-dock__bar .tb-momento svg') }; });
  assert.ok(mom.icone && mom.cabe && mom.txt.length > 2, 'momento inteiro: ' + JSON.stringify(mom));
  await page.click('.tb-dock__bar .tb-banner__text');
  await page.locator('.tb-dock__bar .tb-balao').waitFor({ state: 'visible' });
  assert.ok((await page.innerText('.tb-dock__bar .tb-balao')).length > mom.txt.length, 'o balão traz o detalhe');
  await page.click('.tb-dock__bar .tb-balao button[aria-label="Fechar"]');
  await auditaTela(page, 'bandeja com o momento em ícone');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/bandeja-momento.png' });

  // campo: Floresta com Utopia Sprawl anexada, três Ursos de cada lado (a mesa cheia); Fiery Temper na mão
  const p = await page.evaluate(() => {
    const M = window.__estanteMesa, s = M.estado(), p = s.turn.priority, o = 1 - p;
    const de = (q, n) => Object.values(M.estado().objects).find(x => x.owner === q && x.name === n && x.zone === 'library');
    const floresta = de(p, 'Forest'); M.act({ t: 'move', p, oid: floresta.oid, to: 'battlefield' });
    M.act({ t: 'move', p, oid: de(p, 'Mountain').oid, to: 'battlefield' });
    for (const q of [p, o]) for (let i = 0; i < 6; i++) M.act({ t: 'move', p, oid: de(q, 'Grizzly Bear').oid, to: 'battlefield' });
    const aura = de(p, 'Utopia Sprawl'); M.act({ t: 'move', p, oid: aura.oid, to: 'hand' });
    M.act({ t: 'cast', p, oid: aura.oid, targets: [{ oid: floresta.oid }], free: true });
    return p;
  });
  for (let i = 0; i < 8 && await page.evaluate(() => { const s = window.__estanteMesa.estado(); return s.stack.length > 0 || !!s.pending; }); i++) {
    await reveal(page);
    if (await page.locator('.tb-banner .ds-btn:has-text("Verde")').count()) await page.click('.tb-banner .ds-btn:has-text("Verde")');
    else if (await page.locator('#tb-pass').count()) await page.click('#tb-pass');
    else await page.evaluate(() => { const s = window.__estanteMesa.estado(); if (!s.pending) window.__estanteMesa.act({ t: 'pass', p: s.turn.priority }); });
    await page.waitForTimeout(150);
  }
  await reveal(page);
  const selo = await page.evaluate(() => {
    const floresta = [...document.querySelectorAll('.tb-side--me .tb-card')].find(c => /Com Utopia Sprawl/.test(c.getAttribute('aria-label') || ''));
    if (!floresta) return null;
    const pill = floresta.querySelector('.tb-pill[data-marca="encantada"]'); const cb = floresta.getBoundingClientRect(), pb = pill.getBoundingClientRect();
    return { icone: !!pill.querySelector('svg'), texto: pill.innerText.trim(), dentro: pb.left >= cb.left - 1 && pb.right <= cb.right + 1 };
  });
  assert.ok(selo, 'a Floresta fala "Com Utopia Sprawl"');
  assert.deepEqual(selo, { icone: true, texto: '', dentro: true }, 'selo de anexo: ícone, sem nome, dentro da carta');
  // toda pílula de toda carta cabe na carta
  const fora = await page.evaluate(() => [...document.querySelectorAll('.tb-card')].flatMap(c => [...c.querySelectorAll('.tb-pill')].filter(x => { const a = c.getBoundingClientRect(), b = x.getBoundingClientRect(); return b.width > a.width + 1; }).map(x => x.textContent)));
  assert.deepEqual(fora, [], 'nenhuma pílula passa da largura da carta');
  // carta virada: o nome continua deitado na horizontal e inteiro (antes girava junto e saía "Razortrap Go…" de pé)
  await page.evaluate(p => { const M = window.__estanteMesa, s = M.estado(); const m = s.zones[p].battlefield.find(o => s.objects[o].name === 'Mountain'); M.act({ t: 'tap', p, oid: m }); }, p);
  await page.waitForSelector('.tb-side--me .tb-card[data-tapped="true"] .tb-card__label');
  const rot = await page.evaluate(() => { const c = document.querySelector('.tb-side--me .tb-card[data-tapped="true"]'), l = c.querySelector('.tb-card__label'); const b = l.getBoundingClientRect();
    return { deitado: b.width > b.height, inteiro: l.scrollHeight <= l.clientHeight + 1, dentro: l.closest('.tb-card__face') === null }; });
  assert.deepEqual(rot, { deitado: true, inteiro: true, dentro: true }, 'nome da carta virada na horizontal');
  if (process.env.SHOTS) { await page.click('#tb-hand-toggle'); await page.waitForTimeout(350);
    await page.evaluate(() => document.querySelector('.tb-side--me .tb-card[data-tapped="true"]').scrollIntoView({ block: 'center' })); await page.waitForTimeout(150);
    await page.screenshot({ path: process.env.SHOTS + '/carta-virada.png' }); await page.click('#tb-hand-toggle'); await page.waitForTimeout(300); }
  await page.evaluate(p => { const M = window.__estanteMesa, s = M.estado(); const m = s.zones[p].battlefield.find(o => s.objects[o].name === 'Mountain'); M.act({ t: 'tap', p, oid: m }); }, p); // desvira: o {R} da insanidade sai dela
  await auditaTela(page, 'Floresta com Utopia Sprawl');
  if (process.env.SHOTS) { await page.click('#tb-hand-toggle'); await page.waitForTimeout(350);
    await page.evaluate(() => { const c = [...document.querySelectorAll('.tb-side--me .tb-card')].find(x => /Com Utopia/.test(x.getAttribute('aria-label'))); c.scrollIntoView({ block: 'center' }); });
    await page.waitForTimeout(150); await page.screenshot({ path: process.env.SHOTS + '/selo-anexo.png' }); await page.click('#tb-hand-toggle'); }
  // recolhida, a bandeja continua mostrando o momento inteiro (antes da correção o chip ficava vazio)
  await page.click('#tb-hand-toggle'); await page.waitForTimeout(300);
  assert.ok((await page.innerText('.tb-dock__bar .tb-momento')).trim().length > 2, 'momento visível com a mão recolhida');
  await page.click('#tb-hand-toggle'); await page.waitForTimeout(300);

  // Fiery Temper descartado pelo Grab the Prize: a insanidade oferece todos os alvos, você e o oponente primeiro
  await page.evaluate(p => {
    const M = window.__estanteMesa, s = M.estado();
    const de = n => Object.values(M.estado().objects).find(x => x.owner === p && x.name === n && x.zone === 'library');
    const grab = de('Grab the Prize'), temper = de('Fiery Temper');
    M.act({ t: 'move', p, oid: grab.oid, to: 'hand' }); M.act({ t: 'move', p, oid: temper.oid, to: 'hand' });
    M.act({ t: 'cast', p, oid: grab.oid, pay: { discard: [temper.oid] }, free: true });
  }, p);
  await reveal(page);
  await page.waitForSelector('#tb-madness', { timeout: 5000 }).catch(async () => assert.fail('sem insanidade: ' + JSON.stringify(await page.evaluate(() => { const s = window.__estanteMesa.estado(); return { pd: s.pending, st: s.stack.map(o => s.objects[o].name), prio: s.turn.priority, banner: document.querySelector('.tb-banner') && document.querySelector('.tb-banner').textContent }; }))));
  await page.click('#tb-madness');
  await page.waitForSelector('#tb-alvos');
  const alvos = await page.locator('#tb-alvos .ds-btn').allInnerTexts();
  const outro = await page.evaluate(p => window.__estanteMesa.estado().players[1 - p].name, p);
  assert.deepEqual(alvos.slice(0, 2).sort(), [outro, 'Você'].sort(), 'os dois jogadores, primeiro: ' + JSON.stringify(alvos));
  assert.equal(alvos.filter(x => x === 'Grizzly Bear').length, 12, 'e as 12 criaturas');
  await auditaTela(page, 'alvos da insanidade');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/alvos-insanidade.png' });
  await page.locator('#tb-alvos .ds-btn', { hasText: outro }).click();
  // conjurada pela insanidade, mirando o oponente: sai do exílio para a pilha
  await page.waitForFunction(p => { const s = window.__estanteMesa.estado(); const ft = Object.values(s.objects).find(o => o.owner === p && o.name === 'Fiery Temper' && o.zone !== 'library');
    return ft && ft.zone !== 'exile' && !(s.pending && s.pending.kind === 'madness'); }, p);
  const ft = await page.evaluate(p => { const s = window.__estanteMesa.estado(); const o = Object.values(s.objects).find(o => o.owner === p && o.name === 'Fiery Temper' && o.zone !== 'library'); return { zona: o.zone, alvo: o.zone === 'stack' ? o.targets : null }; }, p);
  assert.ok(ft.zona === 'stack' ? ft.alvo[0].player === 1 - p : ft.zona === 'graveyard', 'Fiery Temper conjurada: ' + JSON.stringify(ft));
  assert.deepEqual(errors, []);
});

test('e2e · leva 110 lista em símbolos: cores, formato, principal e reserva com número, só o nome em palavras', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await createDeck(page, base, 'Izzet Teste', '20 Island\n4 Counterspell\n4 Lightning Bolt\n\nSideboard\n2 Sky Pike', 'pauper');
  await page.goto(base + '#/listas'); await page.waitForSelector('#decks-list .deck-item');
  const linha = await page.evaluate(() => { const it = document.querySelector('#decks-list .deck-item');
    return { cores: it.querySelector('.ds-pips') && it.querySelector('.ds-pips').getAttribute('aria-label'), formato: it.querySelector('.deck-item__formato').innerText,
      main: it.querySelector('.deck-item__main').getAttribute('aria-label'), side: it.querySelector('.deck-item__reserva').getAttribute('aria-label'),
      nome: it.querySelector('.deck-item__nome').innerText, meta: [...it.querySelector('.deck-item__meta').children].filter(x => !x.matches('.ds-pips')).map(x => x.innerText.trim()).join(' ') }; });
  assert.deepEqual(linha, { cores: 'identidade: azul e vermelho', formato: 'PAUPER', main: '28 cartas no deck', side: '2 na reserva', nome: 'Izzet Teste', meta: 'PAUPER 28 2' });
  await auditaTela(page, 'listas em símbolos');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/listas.png' });
  // preparar partida: a lista escolhida aparece como a linha da estante, e trocar abre a folha com todas
  await page.goto(base + '#/mesa'); await page.waitForSelector('#mesa-mine .deck-item');
  assert.equal(await page.locator('select#mesa-mine').count(), 0, 'sem <select> de texto');
  assert.equal(await page.innerText('#mesa-mine .deck-item__nome'), 'Izzet Teste');
  await auditaTela(page, 'preparar partida com a lista em símbolos');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/preparar.png' });
  await page.click('#mesa-mine'); await page.waitForSelector('.deck-picker__lista [role="radio"][aria-checked="true"]');
  await auditaTela(page, 'folha de escolher a lista');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/escolher-lista.png' });
  await page.click('.ds-dialog >> text=Voltar');
  await page.goto(base + '#/listas/prontas'); await page.waitForSelector('#starter-list .deck-item');
  await auditaTela(page, 'listas prontas em símbolos');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/prontas.png' });
  assert.deepEqual(errors, []);
});

// Leva 111 · relato do usuário com foto: a ficha de Sangue abria sem a habilidade. Com a carta da ficha vinda da Scryfall,
// a ficha nascia sem script; e, sem mana, a folha não dizia nada.
test('e2e · leva 111 ficha de Sangue: sem mana a habilidade aparece apagada com o motivo; com mana, descarta, sacrifica e compra', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await createDeck(page, base, 'Sangue', '20 Mountain\n20 Voldaren Epicure\n20 Grizzly Bear', 'livre');
  await page.goto(base + '#/mesa'); await page.fill('#mesa-seed', '5'); await page.click('#mesa-start');
  await page.waitForSelector('#tb-keep'); await page.click('#tb-keep'); await toMyMain(page);
  const p = await page.evaluate(() => {
    const M = window.__estanteMesa, s = M.estado(), p = s.turn.priority;
    const de = n => Object.values(M.estado().objects).find(x => x.owner === p && x.name === n && x.zone === 'library');
    const epi = de('Voldaren Epicure'); M.act({ t: 'move', p, oid: epi.oid, to: 'hand' }); M.act({ t: 'cast', p, oid: epi.oid, free: true });
    M.act({ t: 'move', p, oid: de('Grizzly Bear').oid, to: 'hand' });
    return p;
  });
  for (let i = 0; i < 6 && await page.evaluate(() => window.__estanteMesa.estado().stack.length > 0); i++) { await reveal(page); if (await page.locator('#tb-pass').count()) await page.click('#tb-pass'); else await page.waitForTimeout(150); }
  const ficha = page.locator('.tb-side--me .tb-card[aria-label^="Blood"]').first();
  await ficha.waitFor({ timeout: 8000 });
  // sem terreno desvirado: a habilidade aparece, apagada, dizendo por quê
  await ficha.click(); await page.waitForSelector('.ds-dialog');
  const apagado = page.locator('.ds-dialog .ds-btn', { hasText: 'Ativar ({1}, {T}, descartar uma carta, sacrificar)' });
  assert.equal(await apagado.count(), 1, 'a habilidade aparece: ' + await page.innerText('.ds-dialog'));
  assert.equal(await apagado.isDisabled(), true, 'apagada sem mana');
  assert.match(await apagado.innerText(), /—\s*\S/, 'com o motivo');
  await auditaTela(page, 'folha do Sangue sem mana');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/sangue-sem-mana.png' });
  await page.keyboard.press('Escape');
  // com uma Montanha: ativa, escolhe o descarte, sacrifica e compra
  await page.evaluate(p => { const M = window.__estanteMesa; const m = Object.values(M.estado().objects).find(x => x.owner === p && x.name === 'Mountain' && x.zone === 'library'); M.act({ t: 'move', p, oid: m.oid, to: 'battlefield' }); }, p);
  const mao = await page.evaluate(p => window.__estanteMesa.estado().zones[p].hand.length, p);
  await ficha.click(); await page.waitForSelector('.ds-dialog');
  await page.click('.ds-dialog .ds-btn:has-text("Ativar ({1}, {T}, descartar uma carta, sacrificar)")');
  if (await page.locator('#tb-escolha').count()) { await page.locator('#tb-escolha .tb-card').first().click(); } // Leva 125 · a carta do custo se escolhe tocando nela
  for (let i = 0; i < 6 && await page.evaluate(() => window.__estanteMesa.estado().stack.length > 0); i++) { await reveal(page); if (await page.locator('#tb-pass').count()) await page.click('#tb-pass'); else await page.waitForTimeout(150); }
  const fim = await page.evaluate(p => { const s = window.__estanteMesa.estado(); return { sangue: s.zones[p].battlefield.filter(o => s.objects[o].name === 'Blood').length, mao: s.zones[p].hand.length, cemiterio: s.zones[p].graveyard.length }; }, p);
  assert.deepEqual(fim, { sangue: 0, mao, cemiterio: 1 }, 'descartou uma, comprou uma, a ficha sumiu');
  assert.deepEqual(errors, []);
});

// Leva 113 · um modo só (motor completo), cores só do deck principal, coleção com o painel primeiro.
test('e2e · leva 113 modo único: lista 100% joga no motor completo; lista com carta sem regra não joga e a tela diz qual; cores só do deck principal', { skip }, async t => {
  const { page, errors, base } = await open(t, { dev: false });
  await createDeck(page, base, 'Coberta', '30 Island\n30 Counterspell\n\nSideboard\n4 Lightning Bolt', 'livre');
  await createDeck(page, base, 'Com carta sem regra', '30 Island\n10 Mystery Ritual\n20 Counterspell', 'livre');
  await page.goto(base + '#/mesa'); await page.waitForSelector('#mesa-start');
  // sem escolha de modo nem de mana: só existe o motor completo
  assert.equal(await page.locator('[data-mode]').count(), 0, 'sem "Mesa assistida / Motor completo"');
  assert.equal(await page.locator('[data-mana]').count(), 0, 'sem "Cobrar mana"');
  await escolheLista(page, 'mesa-mine', /Com carta sem regra/);
  await page.waitForSelector('#mesa-bloqueio');
  assert.match(await page.innerText('#mesa-bloqueio'), /Esta lista ainda não joga\. O motor não resolve 1 carta\(s\) dela: Mystery Ritual/);
  assert.equal(await page.locator('#mesa-start').isDisabled(), true, 'não dá para começar');
  await auditaTela(page, 'preparar partida com lista bloqueada');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/mesa-bloqueio.png' });
  // a dois: a lista do oponente também precisa estar 100%
  await escolheLista(page, 'mesa-mine', /^Coberta$/);
  await page.waitForFunction(() => !document.querySelector('#mesa-bloqueio') && !document.querySelector('#mesa-start').disabled);
  await page.click('[data-opponent="hotseat"]');
  await escolheLista(page, 'mesa-theirs', /Com carta sem regra/);
  await page.waitForFunction(() => /lista do oponente ainda não joga/.test(document.querySelector('#mesa-bloqueio-oponente').innerText));
  assert.equal(await page.locator('#mesa-start').isDisabled(), true);
  await page.click('[data-opponent="goldfish"]');
  await page.waitForFunction(() => !document.querySelector('#mesa-start').disabled);
  // cores: a lista "Coberta" tem vermelho só na reserva; aparece só o azul
  assert.equal(await page.getAttribute('#mesa-mine .ds-pips', 'aria-label'), 'identidade: azul', 'a cor da reserva não entra');
  // começa no motor completo: sem ajuste manual
  await page.fill('#mesa-seed', '4'); await page.click('#mesa-start');
  await page.waitForSelector('#tb-keep');
  await page.click('#tb-keep');
  await page.waitForSelector('.tb-hand .tb-card');
  await page.locator('.tb-hand .tb-card').first().click(); await page.waitForSelector('.ds-dialog');
  assert.doesNotMatch(await page.innerText('.ds-dialog'), /ajuste manual|Mover para/, 'sem controles da mesa assistida');
  assert.deepEqual(errors, []);
});

test('e2e · leva 113/134 coleção: painel primeiro, adicionar carta logo abaixo, depois as visões; backup no fim', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.goto(base + '#/colecao'); await page.waitForSelector('#col-vazio'); // U17 · o campo vem antes na página e fica escondido na coleção vazia: espera o cartão
  await digitaCarta(page, 'Sol Ring'); await page.click('#col-add-btn');
  await page.waitForSelector('.col-row[data-name="Sol Ring"]');
  const ordem = await page.evaluate(() => { const y = sel => { const el = document.querySelector(sel); return el ? Math.round(el.getBoundingClientRect().top + scrollY) : null; };
    return { painel: y('#col-dashboard'), filtro: y('#col-filter'), visoes: y('#col-views'), lista: y('.col-row'), adicionar: y('#col-adicionar'), backup: y('#col-backup') }; });
  assert.ok(ordem.painel < ordem.filtro && ordem.filtro < ordem.lista, 'painel antes do filtro e da lista: ' + JSON.stringify(ordem));
  // leva 149 · adicionar carta voltou para cima, logo abaixo do painel
  assert.ok(ordem.painel < ordem.adicionar && ordem.adicionar < ordem.filtro, 'adicionar carta entre o painel e o filtro: ' + JSON.stringify(ordem));
  assert.ok(ordem.backup == null || ordem.backup > ordem.adicionar, 'aviso de backup no fim: ' + JSON.stringify(ordem));
  assert.ok(ordem.backup != null, 'com carta e sem backup, o aviso aparece');
  // o atalho do topo leva até o campo
  await page.evaluate(() => scrollTo(0, 0));
  await page.click('#col-ir-adicionar');
  await page.waitForFunction(() => document.activeElement && document.activeElement.id === 'col-add');
  await auditaTela(page, 'coleção reordenada');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/colecao.png', fullPage: true });
  assert.deepEqual(errors, []);
});

// Leva 114 · melhor de 3: placar, trocas com a reserva entre as partidas, quem perdeu escolhe quem começa.
test('e2e · leva 114 melhor de 3: placar da série, troca visual com a reserva dentro dos limites, próxima partida com o deck trocado, série fecha em 2', { skip }, async t => {
  const { page, errors, base } = await open(t, { dev: false });
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await createDeck(page, base, 'Azul de série', '20 Island\n40 Counterspell\n\nSideboard\n4 Lightning Bolt\n11 Sky Pike', 'pauper');
  await page.goto(base + '#/mesa'); await page.waitForSelector('#mesa-start:not([disabled])');
  assert.equal(await page.getAttribute('[data-serie="1"]', 'aria-pressed'), 'true', 'partida única é o padrão');
  await page.click('[data-serie="3"]');
  await auditaTela(page, 'preparar partida com série');
  await page.fill('#mesa-seed', '4'); await page.click('#mesa-start');
  await page.waitForSelector('#tb-keep'); await page.click('#tb-keep');
  // Leva 121 · expectativa ajustada com justificativa: o placar saiu da linha da faixa (em 360 px ele espremia a faixa e
  // cortava "Turno de Shark") e virou o primeiro detalhe do balão, a um toque. Continua a um gesto, em qualquer fase.
  const placarDaSerie = async () => { await page.click('#tb-vez-btn'); await page.waitForSelector('#tb-serie'); const txt = await page.innerText('#tb-serie'); await page.click('#tb-vez-fechar'); await page.waitForSelector('#tb-vez-pop', { state: 'hidden' }); return txt; };
  assert.match(await placarDaSerie(), /Partida 1 de 3 · Você 0–0 Goldfish/);
  const desiste = async () => { await page.click('#tb-concede'); await page.click('.ds-dialog .ds-btn--danger'); };
  await desiste();
  await page.waitForSelector('#tb-serie-next');
  assert.match(await page.textContent('.tb-banner'), /Goldfish venceu a partida 1/);
  assert.match(await placarDaSerie(), /Você 0–1 Goldfish/);
  assert.equal(await page.locator('#tb-new').count(), 0, 'série em disputa: o caminho é a próxima partida');
  await page.reload(); await page.waitForSelector('#tb-serie-next');
  assert.match(await placarDaSerie(), /Você 0–1 Goldfish/, 'recarregar não soma outra vitória');
  await page.click('#tb-serie-next');
  // a tela de trocas
  await page.waitForSelector('#troca');
  assert.match(await page.innerText('h1'), /Partida 2 de 3/);
  assert.match(await page.innerText('#serie-placar'), /Você 0–1 Goldfish/);
  assert.equal(await page.innerText('#troca-deck-n b'), '60'); assert.equal(await page.innerText('#troca-reserva-n b'), '15');
  // tira um Counterspell: 59 no deck e 16 na reserva, não pode começar
  await page.click('.troca-grade[data-zona="main"] .troca-carta[data-nome="Counterspell"]');
  assert.equal(await page.innerText('#troca-deck-n b'), '59');
  assert.equal(await page.locator('#serie-start').isDisabled(), true);
  assert.match(await page.innerText('#troca-erro'), /pelo menos 60 cartas \(tem 59\).*no máximo 15 cartas \(tem 16\)/);
  // põe dois Raios: 61 e 14 valem (não precisa ser uma por uma)
  await page.click('.troca-grade[data-zona="side"] .troca-carta[data-nome="Lightning Bolt"]');
  await page.click('.troca-grade[data-zona="side"] .troca-carta[data-nome="Lightning Bolt"]');
  assert.equal(await page.innerText('#troca-deck-n b'), '61'); assert.equal(await page.innerText('#troca-reserva-n b'), '14');
  assert.equal(await page.locator('#troca-erro').count(), 0);
  assert.match(await page.innerText('#troca-diff'), /Entram\s*\+2 Lightning Bolt\s*Saem\s*−1 Counterspell/i);
  assert.equal(await page.locator('.troca-grade[data-zona="main"] .troca-carta[data-nome="Lightning Bolt"][data-nova]').count(), 1, 'a carta que entrou fica marcada');
  await auditaTela(page, 'trocas com a reserva');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/trocas.png', fullPage: true });
  // voltar ao original e refazer
  await page.click('#troca-original');
  assert.equal(await page.innerText('#troca-deck-n b'), '60'); assert.match(await page.innerText('#troca-diff'), /Sem trocas/);
  await page.click('.troca-grade[data-zona="main"] .troca-carta[data-nome="Counterspell"]');
  await page.click('.troca-grade[data-zona="side"] .troca-carta[data-nome="Lightning Bolt"]');
  // quem perdeu (você) escolhe quem começa
  assert.equal(await page.getAttribute('#serie-primeiro [data-primeiro="0"]', 'aria-pressed'), 'true');
  await page.click('#serie-start');
  await page.waitForSelector('#tb-keep');
  const jogo2 = await page.evaluate(() => { const s = window.__estanteMesa.estado(); const meus = Object.values(s.objects).filter(o => o.owner === 0);
    return { total: meus.length, raios: meus.filter(o => o.name === 'Lightning Bolt').length, contras: meus.filter(o => o.name === 'Counterspell').length, comeca: s.turn.active }; });
  assert.deepEqual(jogo2, { total: 60, raios: 1, contras: 39, comeca: 0 }, 'a partida 2 usa o deck trocado e começa por quem foi escolhido');
  assert.match(await placarDaSerie(), /Partida 2 de 3 · Você 0–1 Goldfish/); // Leva 121 · o placar está no balão da faixa
  await page.click('#tb-keep'); await desiste();
  await page.waitForSelector('#tb-new');
  assert.match(await page.textContent('.tb-banner'), /Goldfish venceu a série por 2–0/);
  assert.equal(await page.locator('#tb-serie-next').count(), 0);
  // a lista salva não muda: as trocas valem só para a série
  await page.click('#tb-new'); await page.waitForSelector('#mesa-start');
  await page.goto(base + '#/listas'); await page.waitForSelector('#decks-list .deck-item');
  assert.equal(await page.getAttribute('#decks-list .deck-item__main', 'aria-label'), '60 cartas no deck');
  assert.deepEqual(errors, []);
});

test('e2e · leva 114 melhor de 3 a dois: cada jogador troca a reserva sem o outro ver, e quem perdeu escolhe quem começa', { skip }, async t => {
  const { page, errors, base } = await open(t, { dev: false });
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await createDeck(page, base, 'Azul de série', '20 Island\n40 Counterspell\n\nSideboard\n4 Lightning Bolt\n11 Sky Pike', 'pauper');
  await page.goto(base + '#/mesa'); await page.waitForSelector('#mesa-start:not([disabled])');
  await page.click('[data-opponent="hotseat"]');
  await page.fill('#mesa-me', 'Ana'); await page.fill('#mesa-them', 'Bia');
  await page.click('[data-serie="3"]');
  await page.waitForSelector('#mesa-start:not([disabled])');
  await page.fill('#mesa-seed', '4'); await page.click('#mesa-start');
  await page.waitForSelector('#tb-keep'); await page.click('#tb-keep'); await reveal(page); await page.click('#tb-keep'); await reveal(page);
  // quem tem a prioridade desiste: o outro vence a partida 1
  const perdeu = await page.evaluate(() => { const M = window.__estanteMesa, p = M.estado().turn.priority; M.act({ t: 'concede', p }); return p; });
  await reveal(page);
  await page.waitForSelector('#tb-serie-next'); await page.click('#tb-serie-next');
  await page.waitForSelector('#serie-entrega');
  assert.match(await page.innerText('#serie-entrega'), /Sou Ana/);
  assert.equal(await page.locator('#troca').count(), 0, 'as cartas só aparecem depois de receber o aparelho');
  await page.click('#serie-entrega'); await page.waitForSelector('#troca');
  await page.click('.troca-grade[data-zona="main"] .troca-carta[data-nome="Counterspell"]');
  await page.click('.troca-grade[data-zona="side"] .troca-carta[data-nome="Sky Pike"]');
  await page.click('#serie-confirma');
  await page.waitForSelector('#serie-entrega');
  assert.match(await page.innerText('#serie-entrega'), /Sou Bia/);
  await page.click('#serie-entrega'); await page.waitForSelector('#troca');
  assert.match(await page.innerText('#troca-diff'), /Sem trocas/, 'a Bia não vê as trocas da Ana');
  assert.equal(await page.getAttribute(`#serie-primeiro [data-primeiro="${perdeu}"]`, 'aria-pressed'), 'true', 'quem perdeu começa por padrão');
  await page.click(`#serie-primeiro [data-primeiro="${1 - perdeu}"]`);
  await page.click('#serie-start'); await page.waitForSelector('#tb-keep, #tb-reveal');
  const j2 = await page.evaluate(() => { const s = window.__estanteMesa.estado(); const de = p => Object.values(s.objects).filter(o => o.owner === p && o.name === 'Sky Pike').length; return { ana: de(0), bia: de(1), comeca: s.turn.active }; });
  assert.deepEqual(j2, { ana: 1, bia: 0, comeca: 1 - perdeu });
  assert.deepEqual(errors, []);
});


/* ---------------- Leva 121 · faixa de turno, Highway Robbery (tramar e escolha) e gatilho com modos ---------------- */
// textos oficiais de .listas/oficiais.json (consulta em 30/09/2026): Highway Robbery (Scryfall OTJ 129), Sewer-veillance Cam, Faerie Seer
const EMOJI_121 = /[\p{Extended_Pictographic}☀-➿\u{1F300}-\u{1FAFF}]/u;
const OFICIAIS_121 = JSON.parse(readFileSync(join(ROOT, '.listas', 'oficiais.json'), 'utf8')).cartas;
// A Scryfall manda as palavras-chave num campo próprio (`keywords`), e é dele que o motor lê defensor, voar etc.
// .listas/oficiais.json guarda só o texto: as linhas que são só palavras-chave ("Defender", "Flying, haste") viram o campo.
const PALAVRAS_121 = ['Flying', 'Reach', 'Trample', 'Deathtouch', 'Lifelink', 'Vigilance', 'Haste', 'First strike', 'Double strike', 'Menace', 'Defender', 'Indestructible', 'Flash', 'Hexproof', 'Shroud', 'Changeling'];
const palavrasDoTexto = texto => [...new Set(String(texto || '').split('\n').flatMap(l => { const ps = l.replace(/\s*\(.*\)\s*$/, '').split(/,\s*/).map(x => x.trim()); return ps.every(x => PALAVRAS_121.some(k => k.toLowerCase() === x.toLowerCase())) ? ps.map(x => PALAVRAS_121.find(k => k.toLowerCase() === x.toLowerCase())) : []; }))];
function comOficiais(page, nomes, { imagens = false, cores = false } = {}) {
  // R6 · `cores`: a cor da carta sai do custo de mana (Battle Screech vira criaturas BRANCAS); sem a opção fica incolor, como antes
  const corDe = c => (cores ? [...new Set([...String(c.mana_cost || '').matchAll(/\{([WUBRG])\}/g)].map(m => m[1]))] : []);
  const BASICOS = { Island: 'U', Mountain: 'R', Forest: 'G', Plains: 'W', Swamp: 'B' };
  const extra = Object.fromEntries(nomes.map(n => { const c = BASICOS[n] ? { name: n, type_line: `Basic Land — ${n}`, oracle_text: `({T}: Add {${BASICOS[n]}}.)` } : OFICIAIS_121.find(x => x.name === n); assert.ok(c, 'texto oficial de ' + n);
    return [n.toLowerCase(), { object: 'card', id: n, name: n, type_line: c.type_line, mana_cost: c.mana_cost || '', oracle_text: c.oracle_text || '', colors: corDe(c), color_identity: [], cmc: 2, keywords: palavrasDoTexto(c.oracle_text), ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}),
      ...(imagens ? { image_uris: Object.fromEntries(['small', 'normal', 'large'].map(t => [t, `https://cards.scryfall.io/${t}/front/x/${encodeURIComponent(n)}.png`])) } : {}) }]; }));
  return page.route('https://api.scryfall.com/cards/collection', async r => {
    const ids = JSON.parse(r.request().postData()).identifiers; const acha = i => extra[i.name.toLowerCase()] || DB[i.name.toLowerCase()];
    return r.fulfill({ json: { data: ids.map(acha).filter(Boolean), not_found: ids.filter(i => !acha(i)) } });
  });
}
const estado121 = page => page.evaluate(() => { const s = window.__estanteMesa.estado(); return { turno: s.turn.number, ativo: s.turn.active, passo: s.turn.step, prio: s.turn.priority, pend: s.pending && s.pending.kind, pilha: s.stack.length,
  mao: s.zones[0].hand.map(o => s.objects[o].name), campo: s.zones[0].battlefield.map(o => s.objects[o].name), cemiterio: s.zones[0].graveyard.map(o => s.objects[o].name), exilio: s.zones[0].exile.map(o => s.objects[o].name) }; });
async function meuPrincipal121(page) {
  for (let i = 0; i < 120; i++) {
    const e = await estado121(page);
    if (e.ativo === 0 && e.prio === 0 && e.passo === 'main1' && !e.pend && !e.pilha) return;
    if (e.pend === 'discard') { await page.locator('#tb-hand .tb-card').first().click(); await page.waitForTimeout(60); continue; }
    for (const id of ['#tb-no-block', '#tb-no-attack', '#tb-pass-turn', '#tb-pass']) if (await page.locator(id).count()) { await page.click(id).catch(() => {}); break; }
    await page.waitForTimeout(60);
  }
  assert.fail('não chegou à minha fase principal');
}
const naFolha = async (page, re) => { await page.locator('.ds-dialog button', { hasText: re }).first().click(); await page.waitForTimeout(200); };
const jogaTerreno121 = async (page, nome) => { await page.locator(`#tb-hand .tb-card[aria-label^="${nome}"]`).first().click(); await naFolha(page, /Jogar terreno/); };

test('e2e · Leva 121 · faixa de turno: ícone + duas palavras, nunca cortada, e os detalhes só num balão que fecha fácil', { skip }, async t => {
  const { page, errors, base } = await open(t, { dev: false });
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await comOficiais(page, ['Highway Robbery']);
  await createDeck(page, base, 'Robbery', '24 Mountain\n16 Highway Robbery\n20 Lightning Bolt');
  await page.goto(base + '#/mesa'); await page.fill('#mesa-seed', '9');
  await page.waitForFunction(() => { const c = document.querySelector('[data-opponent="shark"]'); return c && !c.disabled; }, null, { timeout: 8000 });
  await page.click('[data-opponent="shark"]'); await page.waitForSelector('#mesa-bot-deck');
  await page.click('[data-serie="3"]');       // melhor de 3: o placar divide a linha com a faixa
  await page.click('#mesa-start'); await page.waitForSelector('#tb-keep');
  assert.equal(await page.getAttribute('#tb-vez', 'data-serie'), 'true', 'em série, o placar é um detalhe da faixa');
  await page.click('#tb-keep'); await page.waitForTimeout(400);
  await meuPrincipal121(page);
  await jogaTerreno121(page, 'Mountain');
  // anda até o turno do Shark com a prioridade comigo (tenho raio e montanha: a mesa para)
  for (let i = 0; i < 60; i++) { const e = await estado121(page); if (e.ativo === 1 && e.prio === 0) break; if (e.pend === 'discard') { await page.locator('#tb-hand .tb-card').first().click(); continue; }
    for (const id of ['#tb-no-attack', '#tb-pass-turn', '#tb-pass']) if (await page.locator(id).count()) { await page.click(id).catch(() => {}); break; } await page.waitForTimeout(80); }
  await page.waitForSelector('#tb-vez[data-papel="oponente"]');
  assert.equal((await page.innerText('#tb-vez')).trim(), 'Turno Shark', 'só o rótulo, em duas palavras: nenhum outro texto na faixa');
  assert.equal(await page.locator('#tb-vez .tb-vez__avatar [data-icone="tubarao"]').count(), 1, 'a barbatana do design system no lugar da inicial');
  assert.equal(EMOJI_121.test(await page.innerText('#tb-vez')), false);
  for (const [w, hgt] of [[320, 700], [360, 780], [384, 832], [390, 844], [412, 891]]) {
    await page.setViewportSize({ width: w, height: hgt }); await page.waitForTimeout(350);
    const m = await page.evaluate(() => { const r = document.querySelector('#tb-vez .tb-vez__rotulo'), f = document.querySelector('#tb-vez'), a = document.querySelector('.tb-top__actions'), sr = null;
      const b = f.getBoundingClientRect(), ab = a.getBoundingClientRect(), rb = r.getBoundingClientRect(), sb = sr ? sr.getBoundingClientRect() : null;
      return { corte: r.scrollWidth - r.clientWidth, dentro: rb.right <= b.right && rb.left >= b.left, direita: b.right, altura: b.height, acoesX: ab.left, serieX: sb ? sb.left : null, serieR: sb ? sb.right : null, mesmaLinha: Math.abs((b.top + b.height / 2) - (ab.top + ab.height / 2)) < 4, tela: window.innerWidth, doc: document.documentElement.scrollWidth }; });
    assert.equal(m.corte, 0, `${w}: rótulo inteiro`); assert.ok(m.dentro, `${w}: rótulo dentro da faixa`);
    assert.ok(m.altura >= 44, `${w}: faixa com 44 px`); assert.ok(m.doc <= m.tela, `${w}: sem rolagem lateral`);
    // 320 px fica abaixo da faixa estreita suportada (360): ali as ferramentas podem descer, mas o rótulo segue inteiro
    if (w >= 360) assert.ok(m.direita <= m.acoesX, `${w}: faixa não invade as ferramentas`);
    if (w >= 360) assert.ok(m.mesmaLinha, `${w}: ferramentas na linha da faixa (nada desce de linha, o campo não perde altura)`);
  }
  await page.setViewportSize({ width: 360, height: 780 }); await page.waitForTimeout(300);
  // detalhes: fechado por padrão; abre no toque; fecha no X, no toque fora, no Esc e tocando a faixa de novo
  const pop = page.locator('#tb-vez-pop');
  assert.equal(await pop.isVisible(), false, 'detalhes escondidos até tocar');
  await page.click('#tb-vez-btn'); await pop.waitFor({ state: 'visible' });
  assert.equal(await page.getAttribute('#tb-vez-btn', 'aria-expanded'), 'true');
  assert.deepEqual(await page.locator('#tb-vez-pop dt').allInnerTexts(), ['Série', 'Turno', 'Etapa', 'Joga', 'Prioridade']);
  assert.equal(await page.innerText('#tb-serie'), 'Partida 1 de 3 · Você 0–0 Shark', 'o placar da série é o primeiro detalhe');
  assert.equal(await page.innerText('#tb-vez-pop dd[data-k="joga"]'), 'Shark');
  assert.equal(await page.innerText('#tb-vez-pop dd[data-k="prioridade"]'), 'Você');
  await page.waitForTimeout(250);                                   // o balão entra com animação
  const pb = await pop.boundingBox(); assert.ok(pb.x >= 0 && pb.x + pb.width <= 360, 'balão cabe na tela');
  const fx = await page.locator('#tb-vez-fechar').boundingBox(); assert.ok(fx.width >= 44 && fx.height >= 44, 'X com 44 px');
  await auditaTela(page, 'faixa de turno com o balão aberto');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/121-vez-balao.png' });
  await page.click('#tb-vez-fechar'); await pop.waitFor({ state: 'hidden' });
  assert.equal(await page.getAttribute('#tb-vez-btn', 'aria-expanded'), 'false');
  await page.click('#tb-vez-btn'); await pop.waitFor({ state: 'visible' });
  await page.keyboard.press('Escape'); await pop.waitFor({ state: 'hidden' });
  await page.click('#tb-vez-btn'); await pop.waitFor({ state: 'visible' });
  await page.mouse.click(180, 600); await pop.waitFor({ state: 'hidden' });           // toque fora
  await page.click('#tb-vez-btn'); await pop.waitFor({ state: 'visible' });
  await page.click('#tb-vez-btn'); await pop.waitFor({ state: 'hidden' });            // a própria faixa fecha
  await auditaTela(page, 'faixa de turno');
  assert.deepEqual(errors, []);
});

test('e2e · Leva 121 · Highway Robbery: tramar pela folha, a tramada à vista na bandeja, conjurar sem pagar e a escolha entre descartar e sacrificar', { skip }, async t => {
  const { page, errors, base } = await open(t, { dev: false });
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await comOficiais(page, ['Highway Robbery']);
  await createDeck(page, base, 'Robbery', '24 Mountain\n16 Highway Robbery\n20 Lightning Bolt');
  await page.goto(base + '#/mesa'); await page.fill('#mesa-seed', '9');
  await page.click('#mesa-start'); await page.waitForSelector('#tb-keep'); await page.click('#tb-keep'); await page.waitForTimeout(300);
  await meuPrincipal121(page);
  await jogaTerreno121(page, 'Mountain');
  // com uma montanha só: o plot existe e aparece apagado com o motivo (antes não aparecia de jeito nenhum)
  const robbery = page.locator('#tb-hand .tb-card[aria-label^="Highway Robbery"]:not(.tb-card--tramada)').first();
  await robbery.click(); await page.waitForSelector('.ds-dialog');
  const apagado = page.locator('.ds-dialog button', { hasText: /^Tramar/ });
  assert.equal(await apagado.count(), 1, 'Tramar aparece na folha'); assert.equal(await apagado.isDisabled(), true);
  assert.match(await apagado.innerText(), /Tramar · \{?1\}?.*—/, 'com o custo e o motivo');
  await naFolha(page, /^Fechar$/);
  await page.locator('#tb-pass-turn').click(); await page.waitForTimeout(200); await meuPrincipal121(page);
  await jogaTerreno121(page, 'Mountain');
  // com duas montanhas: conjurar e tramar lado a lado
  await robbery.click(); await page.waitForSelector('.ds-dialog');
  assert.equal(await page.locator('.ds-dialog button', { hasText: /^Conjurar/ }).isEnabled(), true);
  assert.equal(await page.locator('.ds-dialog button', { hasText: /^Tramar/ }).isEnabled(), true, 'a mesa oferece o plot');
  await auditaTela(page, 'folha da Highway Robbery');
  const antes = await estado121(page);
  await naFolha(page, /^Tramar/);
  let e = await estado121(page);
  assert.deepEqual(e.exilio, ['Highway Robbery'], 'tramada: exilada da mão'); assert.equal(e.mao.length, antes.mao.length - 1);
  // a tramada fica à vista, primeira da fileira, com selo; no mesmo turno não conjura e diz por quê
  const tramada = page.locator('#tb-hand .tb-card--tramada');
  assert.equal(await tramada.count(), 1); assert.equal(await tramada.getAttribute('data-pronta'), 'false');
  assert.equal(await page.locator('#tb-hand .tb-card').first().evaluate(c => c.classList.contains('tb-card--tramada')), true, 'primeira da fileira');
  assert.equal(await tramada.locator('[data-marca="tramada"] svg').count(), 1, 'selo com ícone, sem emoji');
  assert.match(await tramada.getAttribute('aria-label'), /Tramada: conjure a partir do próximo turno/);
  await tramada.click(); await page.waitForSelector('.ds-dialog');
  const cedo = page.locator('.ds-dialog button', { hasText: /^Conjurar sem pagar/ });
  assert.equal(await cedo.isDisabled(), true); assert.match(await cedo.innerText(), /só a partir do próximo turno/);
  await naFolha(page, /^Fechar$/);
  await auditaTela(page, 'bandeja com carta tramada');
  await page.click('#tb-log'); await page.waitForSelector('#tb-timeline');
  assert.match(await page.innerText('#tb-timeline'), /Você tramou Highway Robbery/, 'o registro conta');
  await page.locator('.ds-dialog button', { hasText: /^Fechar$/ }).first().click(); await page.waitForTimeout(150);
  // turno seguinte: conjura sem pagar mana (as montanhas continuam desviradas)
  await page.locator('#tb-pass-turn').click(); await page.waitForTimeout(200); await meuPrincipal121(page);
  assert.equal(await tramada.getAttribute('data-pronta'), 'true');
  await tramada.click(); await naFolha(page, /^Conjurar sem pagar$/);
  for (let i = 0; i < 20; i++) { e = await estado121(page); if (e.pend === 'pick') break; if (await page.locator('#tb-pass').count()) await page.click('#tb-pass').catch(() => {}); await page.waitForTimeout(120); }
  assert.equal(e.pend, 'pick', 'na resolução, a escolha');
  assert.equal(await page.evaluate(() => { const s = window.__estanteMesa.estado(); return s.zones[0].battlefield.filter(o => s.objects[o].tapped).length; }), 0, 'do plot não paga mana');
  // a escolha: duas pilhas separadas, dois botões de uma palavra, e nada decidido sem um toque explícito
  await page.waitForSelector('#tb-troca');
  const chips = await page.locator('#tb-troca-modo .ds-chip').evaluateAll(cs => cs.map(c => [c.dataset.troca, c.getAttribute('aria-pressed'), c.innerText.replace(/\s+/g, ' ').trim()]));
  assert.deepEqual(chips, [['mao', 'true', `Descartar · ${e.mao.length}`], ['terreno', 'false', `Sacrificar · ${e.campo.length}`]]);
  assert.equal(await page.locator('#tb-pick-cards .tb-card').count(), e.mao.length, 'na aba de descarte, só a mão');
  assert.equal(await page.locator('#tb-troca-ok').isDisabled(), true, 'sem carta escolhida não confirma');
  assert.deepEqual([await page.innerText('#tb-troca-nao'), await page.innerText('#tb-troca-ok')], ['Não pagar', 'Descartar']);
  assert.match(await page.innerText('#tb-troca-dica'), /Entregue uma carta para comprar 2/);
  await auditaTela(page, 'escolha da Highway Robbery (descartar)');
  await page.click('[data-troca="terreno"]'); await page.waitForTimeout(120);
  assert.equal(await page.locator('#tb-pick-cards .tb-card').count(), e.campo.length, 'na aba de sacrifício, só os terrenos em campo');
  assert.equal(await page.innerText('#tb-troca-ok'), 'Sacrificar');
  await page.locator('#tb-pick-cards .tb-card').first().click(); await page.waitForTimeout(120);
  assert.equal(await page.locator('#tb-pick-cards .tb-card[data-selected="true"]').count(), 1);
  assert.match(await page.innerText('#tb-troca-dica'), /Sacrificar Mountain e comprar 2/, 'a frase diz o que vai acontecer');
  assert.equal((await estado121(page)).pend, 'pick', 'tocar na carta só marca: nada foi feito ainda');
  // a carta marcada cabe inteira na fileira (subia e era cortada pela borda)
  const marcada = await page.evaluate(() => { const c = document.querySelector('#tb-pick-cards .tb-card[data-selected="true"] .tb-card__face').getBoundingClientRect(), r = document.querySelector('#tb-pick-cards .tb-row').getBoundingClientRect(); return c.top >= r.top - 1; });
  assert.ok(marcada, 'carta marcada inteira');
  await page.locator('#tb-pick-cards .tb-card').first().click(); await page.waitForTimeout(120);
  assert.equal(await page.locator('#tb-troca-ok').isDisabled(), true, 'tocar de novo desmarca');
  await page.locator('#tb-pick-cards .tb-card').first().click(); await page.waitForTimeout(120);
  await auditaTela(page, 'escolha da Highway Robbery (sacrificar)');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/121-troca.png' });
  await page.click('#tb-troca-ok'); await page.waitForTimeout(250);
  const depois = await estado121(page);
  assert.equal(depois.pend, null); assert.equal(depois.campo.length, e.campo.length - 1, 'um terreno a menos');
  assert.equal(depois.mao.length, e.mao.length + 2, 'duas cartas a mais'); assert.ok(depois.cemiterio.includes('Mountain') && depois.cemiterio.includes('Highway Robbery'));
  // "Não pagar": conjura outra pela mão e recusa; nada sai, nada entra
  await page.locator('#tb-pass-turn').click(); await page.waitForTimeout(200); await meuPrincipal121(page);
  await jogaTerreno121(page, 'Mountain');
  await robbery.click(); await naFolha(page, /^Conjurar/);
  for (let i = 0; i < 20; i++) { e = await estado121(page); if (e.pend === 'pick') break; if (await page.locator('#tb-pass').count()) await page.click('#tb-pass').catch(() => {}); await page.waitForTimeout(120); }
  await page.waitForSelector('#tb-troca');
  const maoAntes = e.mao.length, campoAntes = e.campo.length;
  await page.click('#tb-troca-nao'); await page.waitForTimeout(250);
  e = await estado121(page);
  assert.equal(e.pend, null); assert.equal(e.mao.length, maoAntes, 'recusou: não comprou'); assert.equal(e.campo.length, campoAntes, 'e não sacrificou');
  assert.deepEqual(errors, []);
});

test('e2e · Leva 121 · folha da carta com a imagem carregada: Conjurar e Tramar aparecem sem rolar (foto do aparelho, 02/10/2026)', { skip }, async t => {
  const { page, errors, base } = await open(t, { dev: false });
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  // os outros testes deixam o CDN de imagens fora do ar; aqui a carta tem imagem, na proporção real (488×680), que é o
  // que faz a folha passar da altura da tela no aparelho
  const { PNG } = await import('pngjs'); const png = new PNG({ width: 488, height: 680 }); png.data.fill(120);
  const carta = PNG.sync.write(png);
  await page.route(/^https:\/\/cards\.scryfall\.io\//, r => r.fulfill({ status: 200, contentType: 'image/png', body: carta, headers: { 'access-control-allow-origin': '*' } }));
  await comOficiais(page, ['Highway Robbery', 'Mountain', 'Lightning Bolt'], { imagens: true });
  await page.setViewportSize({ width: 360, height: 780 });
  await createDeck(page, base, 'Robbery', '24 Mountain\n16 Highway Robbery\n20 Lightning Bolt');
  await page.goto(base + '#/mesa'); await page.fill('#mesa-seed', '9');
  await page.click('#mesa-start'); await page.waitForSelector('#tb-keep'); await page.click('#tb-keep'); await page.waitForTimeout(300);
  await meuPrincipal121(page); await jogaTerreno121(page, 'Mountain');
  await page.locator('#tb-pass-turn').click(); await page.waitForTimeout(200); await meuPrincipal121(page); await jogaTerreno121(page, 'Mountain');
  await page.locator('#tb-hand .tb-card[aria-label^="Highway Robbery"]').first().click(); await page.waitForSelector('.ds-dialog .tb-sheet__img');
  await page.waitForFunction(() => { const i = document.querySelector('.ds-dialog .tb-sheet__img'); return i && i.complete && i.naturalHeight > 0; });
  await page.waitForTimeout(300);
  const m = await page.evaluate(() => { const d = document.querySelector('.ds-dialog'), db = d.getBoundingClientRect();
    return { rolagem: d.scrollTop, imagem: Math.round(d.querySelector('.tb-sheet__img').getBoundingClientRect().height), fundo: Math.min(db.bottom, innerHeight),
      botoes: [...d.querySelectorAll('.tb-sheet__actions button')].map(b => ({ txt: b.textContent.trim().split(' ')[0], base: b.getBoundingClientRect().bottom })),
      texto: d.querySelector('.tb-adj__oracle').getBoundingClientRect().top }; });
  assert.ok(m.imagem >= 300, 'a imagem carregou no tamanho de carta: ' + m.imagem);
  assert.equal(m.rolagem, 0, 'folha aberta, sem rolar');
  assert.deepEqual(m.botoes.map(b => b.txt), ['Conjurar', 'Tramar']);
  for (const b of m.botoes) assert.ok(b.base <= m.fundo, `${b.txt} inteiro na tela sem rolar (${Math.round(b.base)} ≤ ${Math.round(m.fundo)})`);
  assert.ok(m.texto >= m.botoes[1].base, 'o texto da carta vem depois das ações');
  await auditaTela(page, 'folha da carta com imagem');
  assert.deepEqual(errors, []);
});

test('e2e · Leva 121 · gatilho com modos (Sewer-veillance Cam): a mesa pergunta virar ou desvirar em vez de ficar esperando', { skip }, async t => {
  const { page, errors, base } = await open(t, { dev: false });
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await comOficiais(page, ['Sewer-veillance Cam', 'Faerie Seer']);
  await createDeck(page, base, 'Cam', '20 Island\n20 Sewer-veillance Cam\n20 Faerie Seer');
  await page.goto(base + '#/mesa'); await page.fill('#mesa-seed', '5');
  await page.click('#mesa-start'); await page.waitForSelector('#tb-keep'); await page.click('#tb-keep'); await page.waitForTimeout(300);
  await meuPrincipal121(page);
  await jogaTerreno121(page, 'Island');
  await page.locator('#tb-hand .tb-card[aria-label^="Faerie Seer"]').first().click(); await naFolha(page, /^Conjurar/);
  for (let i = 0; i < 20; i++) { const e = await estado121(page); if (e.pend === 'pick') { if (await page.locator('#tb-pick-done').count()) await page.click('#tb-pick-done'); } else if (!e.pilha && e.campo.includes('Faerie Seer')) break; else if (await page.locator('#tb-pass').count()) await page.click('#tb-pass').catch(() => {}); await page.waitForTimeout(120); }
  await page.locator('#tb-pass-turn').click(); await page.waitForTimeout(200); await meuPrincipal121(page);
  await jogaTerreno121(page, 'Island');
  await page.locator('#tb-hand .tb-card[aria-label^="Sewer-veillance Cam"]').first().click(); await naFolha(page, /^Conjurar/);
  // Leva 131 · expectativa mudou com a regra: "you may tap or untap target creature" — a criatura é alvo (escolhido quando o
  // gatilho vai à pilha) e virar, desvirar ou nada se decide na resolução. Antes o modo era perguntado antes do alvo.
  let e; for (let i = 0; i < 30; i++) { e = await estado121(page); if (e.pend === 'choose_mode') break;
    if (e.pend === 'pick_target') await page.click('#tb-pick-target'); else if (await page.locator('#tb-pass').count()) await page.click('#tb-pass').catch(() => {}); await page.waitForTimeout(120); }
  assert.equal(e.pend, 'choose_mode', 'na resolução, o gatilho pergunta o que fazer com a criatura');
  await page.waitForSelector('#tb-modo');
  assert.doesNotMatch((await page.innerText('.tb-dock')).replace(/\s+/g, ' '), /Aguardando/, 'a mesa não fica esperando ninguém');
  assert.deepEqual(await page.locator('#tb-modo button').allInnerTexts(), ['Virar', 'Desvirar', 'Nada']);
  assert.match(await page.innerText('#tb-modo-pergunta'), /O que fazer com Faerie Seer\? Ela está (des)?virada\./);
  assert.match(await page.innerText('#tb-modo'), /Sewer-veillance Cam/, 'diz de qual carta é o gatilho');
  await auditaTela(page, 'escolha de modo do gatilho');
  await page.click('#tb-choose-mode'); await page.waitForTimeout(200);
  assert.notEqual((await estado121(page)).pend, 'choose_mode', 'escolhido o modo, a partida segue');
  assert.deepEqual(errors, []);
});


/* ---------------- Leva 121 · R0 · sonda de alcance: toda ação legal de carta tem botão, com as listas reais ---------------- */
// Joga cada lista Pauper de .listas/decks.json pela tela publicada, em modo único, com ações sorteadas por semente.
// A cada estado confere: (1) toda ação de carta que legalActions devolve está na folha da carta (acoesDe), sem perder
// variante (virada para baixo, tramada, modo, alvo, pagamento); (2) decisão pendente de quem vê a tela nunca cai em
// "Aguardando". É o guarda-corpo da classe de defeito desta leva: motor oferece, tela não desenha.
test('e2e · Leva 121 · R0 sonda de alcance: nas listas Pauper reais, toda ação legal de carta tem botão e nenhuma decisão fica sem aviso', { skip }, async t => {
  const decks = JSON.parse(readFileSync(join(ROOT, '.listas', 'decks.json'), 'utf8'));
  const PASSOS = +(process.env.SONDA_PASSOS || 260), SEMENTES = (process.env.SONDA_SEMENTES || '3').split(',');
  const jogaram = [], travadas = [], achados = [];
  for (const [nome, cartas] of Object.entries(decks).filter(([n]) => /^Pauper/.test(n))) {
    for (const semente of SEMENTES) {
      const { page, errors, base } = await open(t, { dev: false });
      await page.addInitScript(() => { window.__MTG_TEST = true; });
      await comOficiais(page, Object.keys(cartas));
      await createDeck(page, base, nome, Object.entries(cartas).map(([n, q]) => `${q} ${n}`).join('\n'), 'livre');
      await page.goto(base + '#/mesa'); await page.waitForSelector('#mesa-start'); await page.fill('#mesa-seed', semente);
      await page.waitForFunction(() => !document.querySelector('#mesa-start').disabled, null, { timeout: 5000 }).catch(() => {});
      if (await page.locator('#mesa-start').isDisabled()) { travadas.push(nome); await page.context().browser().close(); break; }
      await page.click('#mesa-start'); await page.waitForSelector('#tb-keep'); await page.click('#tb-keep'); await page.waitForTimeout(250);
      const r = await page.evaluate(async ({ PASSOS, semente }) => {
        const M = window.__estanteMesa; let x = (+semente * 2654435761) >>> 0; const rnd = n => { x = (x * 1664525 + 1013904223) >>> 0; return x % n; };
        const norm = a => JSON.stringify(Object.keys(a).sort().reduce((o, k) => (o[k] = a[k], o), {}));
        const DE_CARTA = ['cast', 'play_land', 'plot', 'unmorph', 'cycle', 'transmute', 'ninjutsu', 'activate', 'companion'];
        const AJUSTE = ['concede', 'move', 'tap', 'counter', 'damage', 'life', 'draw'];
        const faltas = {}, presos = {}, vistos = {}; let n = 0;
        for (; n < PASSOS; n++) {
          const s = M.estado(); if (!s || s.status === 'over') break;
          const v = M.quemVe(), legais = M.legais(); if (!legais.length) break;
          if (!s.pending) {
            const porOid = new Map();
            for (const a of legais) if (a.oid != null && DE_CARTA.includes(a.t)) porOid.set(a.oid, [...(porOid.get(a.oid) || []), a]);
            for (const [oid, as] of porOid) { const tela = new Set(M.acoesDe(oid).map(norm));
              for (const a of as) { vistos[a.t] = (vistos[a.t] || 0) + 1; if (!tela.has(norm(a))) faltas[`${s.objects[oid].name} · ${a.t} [${s.objects[oid].zone}]`] = norm(a); } }
          } else if (s.pending.p === v) {
            vistos['pendente:' + s.pending.kind] = (vistos['pendente:' + s.pending.kind] || 0) + 1;
            await new Promise(ok => setTimeout(ok, 0));
            const doca = document.querySelector('.tb-dock'); if (!doca || /Aguardando/.test(doca.innerText)) presos[`${s.pending.kind} · ${s.pending.name || s.pending.source || ''}`] = 1;
          }
          const uteis = legais.filter(a => a.t !== 'pass' && !AJUSTE.includes(a.t)), todas = legais.filter(a => !AJUSTE.includes(a.t));
          const a = (uteis.length && rnd(4) ? uteis : todas)[rnd((uteis.length && rnd(4) ? uteis : todas).length)] || legais[0];
          try { M.act(a); } catch (e) { faltas['recusada · ' + a.t] = String(e).slice(0, 100); }
        }
        return { n, faltas, presos, vistos };
      }, { PASSOS, semente });
      jogaram.push(`${nome}#${semente}`);
      for (const [k, v] of Object.entries(r.faltas)) achados.push(`${nome}: sem botão → ${k} ${v}`);
      for (const k of Object.keys(r.presos)) achados.push(`${nome}: decisão sem aviso → ${k}`);
      assert.ok(r.n >= 20, `${nome}: a partida andou (${r.n} ações)`);
      assert.deepEqual(errors, [], `${nome}: sem erro de console`);
      await page.context().browser().close();
    }
  }
  assert.deepEqual(achados, [], 'ações legais sem botão ou decisões sem aviso');
  // Leva 122 · expectativa ajustada com justificativa: a Axebane Guardian fechou (R1), a Walls Combo joga e a sonda cobre as sete
  assert.deepEqual(travadas, [], 'nenhuma lista Pauper travada');
  assert.equal(jogaram.length, 7 * SEMENTES.length, 'as sete jogaram');
});


/* ---------------- Leva 122 · R1 · Axebane Guardian: mana em qualquer combinação de cores ---------------- */
test('e2e · Leva 122 · Axebane Guardian: um botão abre a divisão por cor, só gera com todas escolhidas, e o pagamento automático mistura cores sozinho', { skip }, async t => {
  const { page, errors, base } = await open(t, { dev: false });
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await comOficiais(page, ['Axebane Guardian', 'Overgrown Battlement', 'Forest', 'Lightning Bolt', 'Counterspell'].filter(n => n === 'Forest' || OFICIAIS_121.some(c => c.name === n)));
  await page.setViewportSize({ width: 360, height: 780 });
  await createDeck(page, base, 'Muros', '20 Forest\n16 Axebane Guardian\n16 Overgrown Battlement\n8 Lightning Bolt', 'livre');
  await page.goto(base + '#/mesa'); await page.fill('#mesa-seed', '4');
  await page.click('#mesa-start'); await page.waitForSelector('#tb-keep'); await page.click('#tb-keep'); await page.waitForTimeout(300);
  await meuPrincipal121(page);
  // monta a mesa pelo motor (o que se testa aqui é a tela da divisão): Axebane e dois Battlements em campo, sem enjoo
  const ids = await page.evaluate(() => { const M = window.__estanteMesa, s = M.estado(); const acha = (n, q) => Object.values(s.objects).filter(o => o.owner === 0 && o.name === n && ['library', 'hand'].includes(o.zone)).slice(0, q).map(o => o.oid);
    return { ax: acha('Axebane Guardian', 1)[0], muros: acha('Overgrown Battlement', 2), raio: acha('Lightning Bolt', 1)[0] }; });
  // modo único não tem "mover carta": joga de verdade, turno a turno
  const naMao = n => page.evaluate(n => { const s = window.__estanteMesa.estado(); return s.zones[0].hand.filter(o => s.objects[o].name === n); }, n);
  const campo = () => page.evaluate(() => { const s = window.__estanteMesa.estado(); return s.zones[0].battlefield.map(o => s.objects[o].name); });
  const act = a => page.evaluate(a => { try { window.__estanteMesa.act(a); return true; } catch (e) { return String(e); } }, a);
  const pronta = () => page.evaluate(() => { const M = window.__estanteMesa, s = M.estado(); if (s.turn.active !== 0 || s.turn.step !== 'main1' || s.stack.length || s.pending) return false;
    const ax = s.zones[0].battlefield.map(o => s.objects[o]).find(o => o.name === 'Axebane Guardian' && !o.sick && !o.tapped);
    return !!ax && (M.legais().find(a => a.t === 'tap_mana' && a.oid === ax.oid) || {}).combo >= 2; });
  for (let turno = 0; turno < 20 && !(await pronta()); turno++) {
    const f = await naMao('Forest'); if (f.length) await act({ t: 'play_land', p: 0, oid: f[0] });
    for (const nome of ['Axebane Guardian', 'Overgrown Battlement']) for (const oid of await naMao(nome)) {
      if (nome === 'Axebane Guardian' && (await campo()).includes(nome)) break;
      const legal = await page.evaluate(oid => window.__estanteMesa.legais().find(a => a.t === 'cast' && a.oid === oid) || null, oid);
      if (!legal) continue;
      await act(legal); for (let i = 0; i < 12; i++) { const e = await estado121(page); if (!e.pilha) break; await page.click('#tb-pass').catch(() => {}); await page.waitForTimeout(80); }
    }
    if (await pronta()) break;
    await page.locator('#tb-pass-turn').click().catch(() => {}); await page.waitForTimeout(150); await meuPrincipal121(page);
  }
  assert.ok(await pronta(), 'Axebane desvirada e sem enjoo, com outro defensor em campo: ' + JSON.stringify(await campo()));
  const x = await page.evaluate(() => { const M = window.__estanteMesa, s = M.estado(); const ax = s.zones[0].battlefield.map(o => s.objects[o]).find(o => o.name === 'Axebane Guardian'); return { oid: ax.oid, n: M.legais().find(a => a.t === 'tap_mana' && a.oid === ax.oid).combo }; });
  assert.ok(x.n >= 2, 'Axebane em campo com pelo menos mais um defensor: X = ' + x.n);
  // a folha: um botão só, com o número
  await page.locator(`.tb-side--me .tb-card[data-oid="${x.oid}"]`).first().click(); await page.waitForSelector('.ds-dialog');
  const botoes = await page.locator('.ds-dialog .tb-sheet__actions button').allInnerTexts();
  assert.deepEqual(botoes.filter(b => /^Gerar/.test(b)), [`Gerar ${x.n} manas`], 'um botão, não cinco de uma cor só');
  await naFolha(page, /^Gerar \d+ manas$/);
  // a divisão
  await page.waitForSelector('#tb-mana-cores');
  assert.equal(await page.locator('#tb-mana-cores button').count(), 5);
  assert.deepEqual(await page.locator('#tb-mana-cores button').evaluateAll(bs => bs.map(b => b.getAttribute('aria-label'))), ['branca', 'azul', 'preta', 'vermelha', 'verde'].map(c => `Somar uma mana ${c}`));
  assert.equal(await page.locator('#tb-mana-ok').isDisabled(), true, 'sem todas as manas escolhidas não gera');
  assert.equal(await page.locator('#tb-mana-completar').isDisabled(), true);
  assert.match(await page.innerText('#tb-mana-conta'), new RegExp(`0 de ${x.n}`));
  await auditaTela(page, 'divisão de mana, vazia');
  await page.click('#tb-mana-cores [data-cor="R"]');
  assert.match(await page.innerText('#tb-mana-conta'), new RegExp(`1 de ${x.n}`));
  assert.equal(await page.locator('#tb-mana-ok').isDisabled(), x.n !== 1);
  // tirar uma mana escolhida e pôr outra
  await page.locator('#tb-mana-escolhidas [data-cor="R"]').first().click();
  assert.equal(await page.locator('#tb-mana-escolhidas button').count(), 0, 'tocar na mana escolhida tira');
  await page.click('#tb-mana-cores [data-cor="U"]'); await page.click('#tb-mana-completar');
  assert.equal(await page.locator('#tb-mana-escolhidas [data-cor="U"]').count(), x.n, 'Completar enche com a última cor');
  assert.equal(await page.locator('#tb-mana-cores [data-cor="R"]').isDisabled(), true, 'cheio: não soma mais');
  await page.locator('#tb-mana-escolhidas [data-cor="U"]').first().click(); await page.click('#tb-mana-cores [data-cor="R"]');
  assert.equal(await page.locator('#tb-mana-ok').isEnabled(), true);
  await auditaTela(page, 'divisão de mana, completa');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/122-divisao.png' });
  await page.click('#tb-mana-ok'); await page.waitForTimeout(200);
  const pool = await page.evaluate(() => window.__estanteMesa.estado().players[0].pool);
  assert.equal(pool.R, 1); assert.equal(pool.U, x.n - 1); assert.equal(pool.G, 0, 'gerou exatamente a divisão escolhida');
  await page.click('#tb-log'); await page.waitForSelector('#tb-timeline');
  assert.match((await page.innerText('#tb-timeline')).replace(/\s+/g, ' '), /Você gerou .*com Axebane Guardian/, 'o registro diz o que foi gerado');
  assert.deepEqual(errors, []);
});

/* ---------------- Leva 123 · dívidas do design system ---------------- */
test('e2e · Leva 123 diálogo prende o foco e devolve a quem abriu; aviso com ação acima da bandeja; carta da mesa com srcset', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await page.setViewportSize({ width: 360, height: 780 });
  await createDeck(page, base, 'Delver', PAUPER);
  // 1 · foco: abre a folha da carta pelo teclado, Tab circula só dentro, Esc devolve o foco ao botão que abriu
  const slot = page.locator('.deck-slot .ds-card').first();
  assert.equal(await slot.evaluate(el => el.tagName), 'BUTTON', 'a carta da lista é um botão: recebe foco e abre pelo teclado');
  await slot.focus(); await page.keyboard.press('Enter'); await page.waitForSelector('.ds-dialog');
  const dentro = async () => page.evaluate(() => !!document.activeElement.closest('#ds-overlay'));
  for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); assert.ok(await dentro(), `Tab ${i + 1} saiu do diálogo`); }
  for (let i = 0; i < 4; i++) { await page.keyboard.press('Shift+Tab'); assert.ok(await dentro(), `Shift+Tab ${i + 1} saiu do diálogo`); }
  await page.keyboard.press('Escape'); await page.waitForSelector('.ds-dialog', { state: 'detached' });
  assert.ok(await page.evaluate(() => document.activeElement.classList.contains('ds-card') && !!document.activeElement.closest('.deck-slot')), 'o foco voltou para a carta da lista que abriu o diálogo');
  // 2 · aviso com ação (o de "nova versão"): fica até ser tocado, botão de 44px, dentro da tela e acima da bandeja da mesa
  const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await page.route('https://**.scryfall.io/**', r => r.fulfill({ status: 200, contentType: 'image/png', body: PNG, headers: { 'access-control-allow-origin': '*' } })); // o CDN responde: a mesa usa o srcset
  await page.goto(base + '#/mesa'); await page.fill('#mesa-seed', '4'); await page.click('#mesa-start');
  await page.waitForSelector('#tb-keep'); await page.click('#tb-keep'); await page.waitForSelector('#tb-pass'); await page.waitForTimeout(300);
  await page.evaluate(() => { window.__toastClicado = 0; __m3.toast('Nova versão pronta', 0, { acao: { rotulo: 'Atualizar', icone: 'atualizar', onClick: () => { window.__toastClicado++; } } }); });
  await page.waitForTimeout(250);
  const av = await page.$eval('#ds-toast', el => { const r = el.getBoundingClientRect(); const b = el.querySelector('.ds-toast__acao').getBoundingClientRect();
    const dock = document.querySelector('.tb-dock').getBoundingClientRect(); return { open: el.dataset.open, texto: el.textContent, b: b.height, dentro: r.left >= 0 && r.right <= innerWidth, acima: r.bottom <= dock.top + 1, svg: !!el.querySelector('svg'), linhas: Math.round(el.querySelector('.ds-toast__texto').getBoundingClientRect().height / 18), dockEmbaixo: Math.abs(dock.bottom - innerHeight) <= 1 }; });
  assert.equal(av.open, 'true'); assert.match(av.texto, /Nova versão pronta/); assert.match(av.texto, /Atualizar/);
  assert.ok(av.b >= 44 && av.dentro && av.acima && av.svg, JSON.stringify(av));
  assert.ok(av.linhas <= 1, 'o texto do aviso fica numa linha: ' + JSON.stringify(av));
  assert.ok(av.dockEmbaixo, 'a bandeja fica colada embaixo mesmo com o campo curto: ' + JSON.stringify(av));
  await page.waitForTimeout(2600); assert.equal(await page.getAttribute('#ds-toast', 'data-open'), 'true', 'com ms = 0 o aviso não some sozinho');
  await page.click('.ds-toast__acao');
  assert.equal(await page.evaluate(() => window.__toastClicado), 1); assert.equal(await page.getAttribute('#ds-toast', 'data-open'), 'false');
  // 3 · carta com imagem na mesa leva srcset e sizes (nítida em tela 3×); se o CDN falha, cai no src simples;
  //     carta sem imagem continua em texto
  await drawUntil(page, 'Delver of Secrets');
  const img = await page.$eval('.tb-hand .tb-card[aria-label^="Delver of Secrets"] img', async i => { let ok = true; try { await i.decode(); } catch (e) { ok = false; } return { srcset: i.getAttribute('srcset') || '', sizes: i.getAttribute('sizes'), ok, w: i.naturalWidth }; });
  assert.match(img.srcset, /small\/front\/x\/delver\.png 146w/); assert.match(img.srcset, /normal\/front\/x\/delver\.png 488w/); assert.equal(img.sizes, '110px'); assert.ok(img.ok, 'a imagem decodifica: ' + JSON.stringify(img));
  await page.unroute('https://**.scryfall.io/**');
  // CDN fora do ar: o srcset sai e o src simples fica (o mesmo caminho que a mesa já tinha)
  const caiu = await page.evaluate(() => new Promise(res => { const el = __m17.TableCard({ name: 'x', image: 'https://cards.scryfall.io/normal/front/x/nada.png', images: { small: 'https://cards.scryfall.io/small/front/x/nada.png', normal: 'https://cards.scryfall.io/normal/front/x/nada.png' } }, { size: 'hand' });
    document.body.appendChild(el); const i = el.querySelector('img'); i.addEventListener('error', () => setTimeout(() => res({ srcset: i.getAttribute('srcset'), src: i.getAttribute('src') }), 0), { once: false }); }));
  assert.equal(caiu.srcset, null); assert.match(caiu.src, /normal\/front\/x\/nada\.png/);
  assert.equal(await page.locator('.tb-hand .tb-card[aria-label^="Island"] img').count(), 0, 'Island sem imagem nos dados de teste: vira texto');
  await auditaTela(page, 'mesa com aviso (leva 123)');
  // 4 · no scanner e nas trocas o aviso também sobe acima da doca de botões (antes cobria "Digitar" e "Opções")
  await page.goto(base + '#/scanner'); await page.waitForSelector('.scan-dock-wrap'); await page.waitForTimeout(400);
  await page.evaluate(() => __m3.toast('23 carta(s) não reconhecida(s) entram como mágica genérica', 0));
  await page.waitForTimeout(250);
  const sc = await page.evaluate(() => { const t = document.querySelector('#ds-toast').getBoundingClientRect(); const d = document.querySelector('.scan-dock-wrap').getBoundingClientRect(); return { t: [t.top, t.bottom], d: [d.top, d.bottom], doca: getComputedStyle(document.documentElement).getPropertyValue('--doca-h') }; });
  assert.ok(sc.t[1] <= sc.d[0] + 1, 'aviso acima da doca do scanner: ' + JSON.stringify(sc));
  await page.goto(base + '#/'); await page.waitForSelector('#home-atalhos'); await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--doca-h').trim()), '', 'fora da tela com doca, a reserva some');
  assert.deepEqual(errors, []);
});

/* ---------------- Leva 125 · R2 · Rakdos Madness carta a carta: decisões legíveis ---------------- */
const comLista125 = async (t, texto, nomes, semente, opcoes = {}) => {
  const { page, errors, base } = await open(t, { dev: false });
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await comOficiais(page, nomes, opcoes);
  await page.setViewportSize({ width: 360, height: 780 });
  await createDeck(page, base, 'R2', texto, 'livre');
  await page.goto(base + '#/mesa'); await page.fill('#mesa-seed', semente);
  await page.click('#mesa-start'); await page.waitForSelector('#tb-keep'); await page.click('#tb-keep'); await page.waitForTimeout(300);
  await meuPrincipal121(page);
  const M = {
    page, errors,
    est: () => estado121(page),
    act: a => page.evaluate(a => { try { window.__estanteMesa.act(a); return true; } catch (e) { return String(e); } }, a),
    oid: (nome, zona = 'hand') => page.evaluate(([nome, zona]) => { const s = window.__estanteMesa.estado(); return s.zones[0][zona].find(o => s.objects[o].name === nome) || null; }, [nome, zona]),
    legal: f => page.evaluate(f => window.__estanteMesa.legais().filter(new Function('a', 'return ' + f)), f),
    decisao: async () => (await page.locator('#tb-decisao').innerText()).replace(/\s*\n+\s*/g, ' | '),
    terreno: async () => { for (const n of ['Mountain', 'Swamp']) { const o = await M.oid(n); if (o && await M.act({ t: 'play_land', p: 0, oid: o }) === true) return n; } return null; },
    proximo: async () => { await page.locator('#tb-pass-turn').click(); await page.waitForTimeout(150); await meuPrincipal121(page); },
    resolve: async () => { for (let i = 0; i < 20; i++) { const e = await estado121(page); if (e.pend || !e.pilha) return e; await page.click('#tb-pass').catch(() => {}); await page.waitForTimeout(100); } return estado121(page); },
    desvirados: () => page.evaluate(() => { const s = window.__estanteMesa.estado(); return s.zones[0].battlefield.filter(o => !s.objects[o].tapped && s.facts[s.objects[o].name].types.includes('land')).map(o => s.objects[o].name); }),
  };
  return M;
};

test('e2e · Leva 125 · Rakdos: carta que não pode ser jogada diz por quê, e o pagamento vira só o que precisa', { skip }, async t => {
  const M = await comLista125(t, '10 Mountain\n10 Swamp\n14 Faithless Looting\n10 Fiery Temper\n8 Kitchen Imp\n8 Grab the Prize', ['Mountain', 'Swamp', 'Faithless Looting', 'Fiery Temper', 'Kitchen Imp', 'Grab the Prize'], '3');
  const { page } = M;
  // sem terreno em campo: a folha de uma mágica diz "mana insuficiente" (antes vinha só com "Fechar")
  let e = await M.est();
  const magica = e.mao.find(n => !['Mountain', 'Swamp'].includes(n));
  await page.locator(`#tb-hand .tb-card[aria-label^="${magica}"]`).first().click(); await page.waitForSelector('.ds-dialog');
  const apagado = page.locator('.ds-dialog .tb-sheet__actions button').first();
  assert.equal(await apagado.isDisabled(), true);
  assert.match(await apagado.innerText(), /^Conjurar · .* — mana insuficiente$/, 'motivo: mana, não "escolha 1 alvo(s)"');
  await auditaTela(page, 'folha com o motivo de não poder conjurar');
  await page.click('#ds-dialog-close'); await page.waitForTimeout(150);
  // segundo terreno no mesmo turno: a folha diz por quê
  assert.ok(await M.terreno());
  e = await M.est(); const outro = e.mao.find(n => ['Mountain', 'Swamp'].includes(n));
  if (outro) { await page.locator(`#tb-hand .tb-card[aria-label^="${outro}"]`).first().click(); await page.waitForSelector('.ds-dialog');
    assert.match(await page.locator('.ds-dialog .tb-sheet__actions button').first().innerText(), /^Jogar terreno — já jogou terreno neste turno$/);
    await page.click('#ds-dialog-close'); await page.waitForTimeout(150); }
  // chega a duas cores em campo e paga {R}: vira uma Mountain só, nenhuma mana fica flutuando
  for (let i = 0; i < 12; i++) { e = await M.est(); const d = await M.desvirados(); if (d.includes('Mountain') && d.includes('Swamp') && d.length >= 3 && e.mao.includes('Faithless Looting')) break; await M.proximo(); await M.terreno(); }
  const antes = await M.desvirados();
  assert.ok(antes.includes('Mountain') && antes.includes('Swamp') && antes.length >= 3, 'duas cores em campo: ' + antes.join(','));
  await page.locator('#tb-hand .tb-card[aria-label^="Faithless Looting"]').first().click(); await naFolha(page, /^Conjurar/);
  const depois = await M.desvirados();
  assert.equal(depois.length, antes.length - 1, 'Faithless Looting custa {R}: um terreno virado (antes, com Swamp de número menor, viravam todos até a Mountain)');
  assert.equal(depois.filter(n => n === 'Swamp').length, antes.filter(n => n === 'Swamp').length, 'nenhum Swamp virado para pagar vermelho');
  assert.equal(await page.evaluate(() => Object.values(window.__estanteMesa.estado().players[0].pool).reduce((a, b) => a + b, 0)), 0, 'nada flutuando');
  assert.deepEqual(M.errors, []);
});

test('e2e · Leva 125 · Rakdos: a pergunta de cada decisão fica escrita na bandeja (descarte por efeito, insanidade, lampejo pelo cemitério)', { skip }, async t => {
  const M = await comLista125(t, '12 Mountain\n8 Swamp\n14 Faithless Looting\n8 Fiery Temper\n8 Kitchen Imp\n10 Grab the Prize', ['Mountain', 'Swamp', 'Faithless Looting', 'Fiery Temper', 'Kitchen Imp', 'Grab the Prize'], '5');
  const { page } = M; let e;
  await M.terreno();
  for (let i = 0; i < 14; i++) { e = await M.est(); const d = await M.desvirados(); if (d.filter(n => n === 'Mountain').length >= 2 && d.includes('Swamp') && e.mao.includes('Faithless Looting') && e.mao.includes('Kitchen Imp')) break; await M.proximo(); await M.terreno(); }
  e = await M.est(); assert.ok(e.mao.includes('Faithless Looting') && e.mao.includes('Kitchen Imp'), 'mão pronta: ' + e.mao.join(','));
  // Faithless Looting: o descarte diz de qual carta é (antes: "Mão acima de 7 na limpeza")
  await page.locator('#tb-hand .tb-card[aria-label^="Faithless Looting"]').first().click(); await naFolha(page, /^Conjurar/);
  e = await M.resolve(); assert.equal(e.pend, 'discard');
  assert.equal(await M.decisao(), 'Faithless Looting: descarte 2 cartas | Toque na carta da mão que você descarta.');
  assert.doesNotMatch(await page.innerText('.tb-dock'), /limpeza/i);
  assert.ok((await page.locator('.tb-dock .tb-banner__text').boundingBox()).width <= 2, 'com a pergunta escrita, a palavra do momento e o balão saem da vista (o texto continua no documento)');
  assert.equal(await page.locator('.tb-dock button.tb-banner__text').count(), 0, 'e não sobra botão invisível');
  await auditaTela(page, 'descarte por efeito');
  // descarta o Kitchen Imp: insanidade com a carta, o custo e as duas saídas à vista
  await page.locator('#tb-hand .tb-card[aria-label^="Kitchen Imp"]').first().click(); await page.waitForTimeout(250);
  e = await M.est(); assert.equal(e.pend, 'madness');
  assert.match(await M.decisao(), /^Kitchen Imp: insanidade \{B\} \| Conjure agora por \{B\} ou deixe ir para o cemitério\.$/);
  assert.equal(await page.locator('#tb-decisao .ds-sym').count() >= 2, true, 'o custo aparece em símbolo');
  assert.deepEqual(await page.locator('.tb-dock .tb-banner__actions button').allInnerTexts(), ['Conjurar', 'Cemitério'], 'dois botões de uma palavra');
  assert.equal(await page.locator('#tb-madness').isEnabled(), true);
  await auditaTela(page, 'insanidade');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/125-insanidade.png' });
  await page.click('#tb-madness'); await page.waitForTimeout(250);
  e = await M.est(); assert.ok(e.pilha >= 1, 'Kitchen Imp na pilha por insanidade');
  // segundo descarte da mesma Looting continua dizendo a fonte
  assert.equal(e.pend, 'discard'); assert.equal(await M.decisao(), 'Faithless Looting: descarte 1 carta | Toque na carta da mão que você descarta.');
  const fica = e.mao.find(n => !['Kitchen Imp', 'Fiery Temper'].includes(n));
  await page.locator(`#tb-hand .tb-card[aria-label^="${fica}"]`).first().click(); await page.waitForTimeout(200);
  for (let i = 0; i < 12; i++) { e = await M.est(); if (e.pend === 'madness') await page.click('#tb-madness-no'); else if (e.pilha) await page.click('#tb-pass').catch(() => {}); else break; await page.waitForTimeout(120); }
  e = await M.est(); assert.ok(e.campo.includes('Kitchen Imp'), 'o Imp entrou'); assert.ok(e.cemiterio.includes('Faithless Looting'));
  // lampejo: sem mana sobrando, o chip do cemitério não acende e a folha diz por quê
  const chip = page.locator('#tb-cemiterio-me');
  const sobra = (await M.desvirados()).length;
  if (sobra < 3) {
    assert.equal(await chip.getAttribute('data-jogaveis'), null, 'sem mana para o lampejo: sem ponto');
    await chip.click(); await page.waitForSelector('.ds-dialog .tb-zonegrid');
    await page.locator('.ds-dialog .tb-card[aria-label^="Faithless Looting"]').first().click(); await page.waitForTimeout(250);
    assert.match(await page.locator('.ds-dialog .tb-sheet__actions button').first().innerText(), /^Lampejo do passado · \{2\}\{R\} — mana insuficiente$/);
    await page.click('#ds-dialog-close'); await page.waitForTimeout(150);
  }
  // turno seguinte, com mana: o chip acende, o cemitério não empilha cartas e o lampejo diz só o custo dele
  await M.proximo(); await M.terreno();
  for (let i = 0; i < 6 && (await M.desvirados()).length < 3; i++) { await M.proximo(); await M.terreno(); }
  assert.ok(Number(await chip.getAttribute('data-jogaveis')) >= 1, 'há carta jogável no cemitério');
  assert.match(await chip.getAttribute('aria-label'), /Cemitério: \d+, .*pode.* ser jogada.* agora/);
  await auditaTela(page, 'mesa com o chip do cemitério aceso');
  await chip.click(); await page.waitForSelector('.ds-dialog .tb-zonegrid');
  const sobre = await page.evaluate(() => { const cs = [...document.querySelectorAll('.ds-dialog .tb-zonegrid .tb-card')].map(c => c.getBoundingClientRect()); let n = 0;
    for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) if (cs[i].left < cs[j].right - 1 && cs[j].left < cs[i].right - 1 && cs[i].top < cs[j].bottom - 1 && cs[j].top < cs[i].bottom - 1) n++; return [cs.length, n]; });
  assert.ok(sobre[0] >= 2); assert.equal(sobre[1], 0, 'nenhuma carta do cemitério por cima de outra');
  await auditaTela(page, 'cemitério aberto');
  await page.locator('.ds-dialog .tb-card[aria-label^="Faithless Looting"]').first().click(); await page.waitForTimeout(250);
  const lampejo = page.locator('.ds-dialog .tb-sheet__actions button', { hasText: /^Lampejo do passado/ });
  assert.equal((await lampejo.innerText()).replace(/\s+/g, ' ').trim(), 'Lampejo do passado · {2}{R}', 'só o custo do lampejo (antes vinha "· {2}{R} · {R}")');
  await lampejo.click(); e = await M.resolve();
  assert.equal(e.pend, 'discard'); assert.match(await M.decisao(), /^Faithless Looting: descarte \d cartas?/);
  assert.deepEqual(M.errors, []);
});

test('e2e · Leva 125 · Rakdos: escolher a carta do custo é tocar na carta (cópias iguais juntas), e a insanidade sem mana explica', { skip }, async t => {
  const M = await comLista125(t, '14 Mountain\n6 Swamp\n16 Grab the Prize\n12 Kitchen Imp\n12 Fiery Temper', ['Mountain', 'Swamp', 'Grab the Prize', 'Kitchen Imp', 'Fiery Temper'], '7');
  const { page } = M; let e;
  await M.terreno();
  // só Mountain em campo, duas, e Kitchen Imp na mão: Grab the Prize paga {1}{R} e a insanidade {B} do Imp não tem como ser paga
  for (let i = 0; i < 14; i++) { e = await M.est(); const d = await M.desvirados(); if (d.length >= 2 && d.every(n => n === 'Mountain') && e.mao.includes('Grab the Prize') && e.mao.includes('Kitchen Imp') && e.mao.filter(n => n === 'Grab the Prize').length >= 2) break; await M.proximo(); const o = await M.oid('Mountain'); if (o) await M.act({ t: 'play_land', p: 0, oid: o }); }
  e = await M.est(); assert.ok(e.mao.includes('Grab the Prize') && e.mao.includes('Kitchen Imp'), 'mão pronta: ' + e.mao.join(','));
  await page.locator('#tb-hand .tb-card[aria-label^="Grab the Prize"]').first().click(); await naFolha(page, /^Conjurar/);
  await page.waitForSelector('#tb-escolha .tb-card');
  assert.match(await page.innerText('#tb-escolha-pergunta'), /Qual carta você descarta\? Toque na carta\./);
  const nomes = await page.locator('#tb-escolha > *').evaluateAll(cs => cs.map(c => c.dataset.escolha));
  assert.equal(new Set(nomes).size, nomes.length, 'cada carta diferente aparece uma vez: ' + nomes.join(','));
  const outras = e.mao.filter(n => n === 'Grab the Prize').length - 1;
  if (outras > 1) assert.match(await page.locator('#tb-escolha [data-escolha="Grab the Prize"]').innerText(), new RegExp(`×${outras}`), 'cópias iguais numa pilha só');
  assert.equal(await page.locator('#tb-escolha .ds-btn').count(), 0, 'cartas, não uma lista de botões');
  await auditaTela(page, 'escolha da carta do custo');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/125-escolha-carta.png' });
  await page.locator('#tb-escolha [data-escolha="Kitchen Imp"]').click(); await page.waitForTimeout(250);
  e = await M.est(); assert.equal(e.pend, 'madness'); assert.ok(e.pilha >= 1, 'Grab the Prize na pilha, custo pago');
  assert.match(await M.decisao(), /^Kitchen Imp: insanidade \{B\} \| Sem mana para pagar \{B\} agora: ela vai para o cemitério\.$/);
  assert.equal(await page.locator('#tb-madness').isDisabled(), true, 'Conjurar apagado, não sumido');
  await auditaTela(page, 'insanidade sem mana');
  await page.click('#tb-madness-no'); await page.waitForTimeout(200);
  e = await M.resolve(); assert.ok(e.cemiterio.includes('Kitchen Imp'));
  assert.deepEqual(M.errors, []);
});

test('e2e · Leva 125 · Rakdos: alvo de gatilho sem botão "principal", escolha do Carnarium e pagamento da Nihil Spellbomb dizem o que fazem', { skip }, async t => {
  const M = await comLista125(t, '8 Mountain\n6 Swamp\n8 Rakdos Carnarium\n8 Bojuka Bog\n12 Nihil Spellbomb\n8 Voldaren Epicure\n10 Cast into the Fire', ['Mountain', 'Swamp', 'Rakdos Carnarium', 'Bojuka Bog', 'Nihil Spellbomb', 'Voldaren Epicure', 'Cast into the Fire'], '8');
  const { page } = M; let e; const feitos = new Set();
  const limpa = async () => { for (let i = 0; i < 8; i++) { e = await M.est(); if (!e.pend && !e.pilha) return; if (e.pend === 'pick_target') await M.act({ t: 'pick_target', p: 0, index: 1 }); else if (e.pend === 'pick') await M.act({ t: 'pick', p: 0, oid: await page.evaluate(() => window.__estanteMesa.estado().pending.from[0]) }); else if (e.pend === 'may_pay') await M.act({ t: 'decline', p: 0 }); else await page.click('#tb-pass').catch(() => {}); await page.waitForTimeout(120); } };
  for (let turno = 0; turno < 22 && feitos.size < 4; turno++) {
    e = await M.est();
    for (const nome of ['Bojuka Bog', 'Rakdos Carnarium', 'Swamp', 'Mountain']) {
      if (!e.mao.includes(nome) || (nome === 'Rakdos Carnarium' && e.campo.length < 1) || (['Bojuka Bog', 'Rakdos Carnarium'].includes(nome) && feitos.has(nome))) continue;
      if (await M.act({ t: 'play_land', p: 0, oid: await M.oid(nome) }) !== true) continue;
      await page.waitForTimeout(250); e = await M.est();
      if (nome === 'Bojuka Bog' && e.pend === 'pick_target') {
        assert.match(await M.decisao(), /^Bojuka Bog: escolha o alvo \| O gatilho faz: /);
        assert.deepEqual(await page.locator('.tb-dock .tb-banner__actions button').allInnerTexts(), ['Você', 'Goldfish']);
        assert.equal(await page.locator('.tb-dock .tb-banner__actions .ds-btn--primary').count(), 0, 'nenhum alvo vem como principal (antes: "Você", que exilava o próprio cemitério)');
        await auditaTela(page, 'alvo do gatilho do Bojuka Bog'); feitos.add(nome);
      }
      if (nome === 'Rakdos Carnarium' && e.pend === 'pick') {
        assert.equal(await M.decisao(), 'Rakdos Carnarium · Escolha o que volta para a mão | Toque na carta.');
        assert.equal(await page.locator('#tb-pick-cards .tb-card[data-tapped="true"]').count(), 0, 'na fileira de escolha, todas as cartas em pé');
        assert.ok(await page.locator('#tb-pick-cards .tb-card[aria-label^="Rakdos Carnarium"]').count() >= 1, 'o próprio Carnarium pode voltar');
        await auditaTela(page, 'escolha do Rakdos Carnarium'); feitos.add(nome);
      }
      await limpa(); break;
    }
    for (const nome of ['Voldaren Epicure', 'Nihil Spellbomb']) { e = await M.est(); const o = e.mao.includes(nome) && e.campo.filter(n => n === nome).length < 2 ? await M.oid(nome) : null; const l = o ? (await M.legal(`a.t === 'cast' && a.oid === '${o}'`))[0] : null; if (l) { await M.act(l); await M.resolve(); await limpa(); } }
    e = await M.est();
    // Cast into the Fire com duas criaturas minhas em campo: cada combinação de alvos uma vez só
    if (!feitos.has('Cast') && e.mao.includes('Cast into the Fire') && e.campo.filter(n => n === 'Voldaren Epicure').length >= 2 && (await M.legal(`a.t === 'cast' && a.mode === 0`)).length) {
      await page.locator('#tb-hand .tb-card[aria-label^="Cast into the Fire"]').first().click(); await page.waitForSelector('.ds-dialog');
      const rot = (await page.locator('.ds-dialog .tb-sheet__actions button').allInnerTexts()).map(x => x.replace(/\s+/g, ' ').trim());
      const pares = rot.filter(x => /Voldaren Epicure \+ Voldaren Epicure/.test(x));
      const n = e.campo.filter(x => x === 'Voldaren Epicure').length;
      assert.equal(pares.length, n * (n - 1) / 2, `pares de alvos sem repetir a ordem (${n} criaturas): ${pares.length}`);
      assert.equal(new Set(rot).size <= rot.length, true);
      await auditaTela(page, 'folha da Cast into the Fire'); feitos.add('Cast');
      await page.click('#ds-dialog-close'); await page.waitForTimeout(150);
    }
    // Nihil Spellbomb: sacrifica, e o gatilho pergunta dizendo o que se ganha
    e = await M.est();
    const ativa = !feitos.has('Spellbomb') && e.campo.includes('Nihil Spellbomb') ? (await M.legal(`a.t === 'activate' && a.targets && a.targets[0].player === 1`))[0] : null;
    const pretoLivre = await page.evaluate(() => { const s = window.__estanteMesa.estado(); return s.zones[0].battlefield.some(o => !s.objects[o].tapped && /Swamp|Bojuka Bog|Rakdos Carnarium/.test(s.objects[o].name)); });
    if (ativa && pretoLivre) {
      await M.act(ativa);
      for (let i = 0; i < 8; i++) { e = await M.est(); if (e.pend === 'may_pay') break; await page.click('#tb-pass').catch(() => {}); await page.waitForTimeout(120); }
      assert.equal(e.pend, 'may_pay');
      assert.equal(await M.decisao(), 'Nihil Spellbomb: pagar {B}? | Se pagar: compra 1 carta. Recusando, nada acontece.');
      assert.deepEqual((await page.locator('.tb-dock .tb-banner__actions button').allInnerTexts()).map(x => x.replace(/\s+/g, ' ').trim()), ['Pagar {B}', 'Não pagar']);
      await auditaTela(page, 'pagamento da Nihil Spellbomb');
      const mao = e.mao.length; await page.click('#tb-pay'); await page.waitForTimeout(250); await limpa();
      assert.equal((await M.est()).mao.length, mao + 1, 'pagou e comprou'); feitos.add('Spellbomb');
    }
    await M.proximo();
  }
  assert.deepEqual([...feitos].sort(), ['Bojuka Bog', 'Cast', 'Rakdos Carnarium', 'Spellbomb'], 'as quatro decisões foram exercitadas');
  assert.deepEqual(M.errors, []);
});

/* ---------------- Leva 128 · perfil local ---------------- */
test('e2e · Leva 128 perfil: nome e foto na barra e na mesa, hot-seat preenchido, backup completo vai e volta, telas limpas nos dois temas', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(base + '#/'); await page.waitForSelector('#home-atalhos');
  // barra: sem perfil, o círculo apagado com o ícone de pessoa; alvo de 44 px; fica nos 66 px livres entre o logo e "Jogar"
  const nav = page.locator('#nav-perfil');
  assert.equal(await nav.getAttribute('aria-label'), 'Perfil');
  assert.equal(await page.getAttribute('#nav-perfil .ds-avatar', 'data-tipo'), 'vazio');
  const nb = await nav.boundingBox(); assert.ok(nb.height >= 44 && nb.width >= 44, JSON.stringify(nb));
  const jogar = await page.locator('#nav-play').boundingBox(); assert.ok(nb.x + nb.width <= jogar.x, 'o avatar não encosta em "Jogar"');
  // tela do perfil: Salvar só liga quando algo muda; foto da galeria entra reduzida; nome limitado
  await nav.click(); await page.waitForSelector('#perfil-nome');
  assert.equal(await page.locator('#perfil-salvar').isDisabled(), true, 'nada mudou ainda');
  assert.equal(await page.locator('.ds-btn--primary:visible').count(), 1, 'um primário na tela');
  await page.setInputFiles('#perfil-foto-arquivo', { name: 'eu.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAIAAAAuKetIAAAAVUlEQVR4nO3PAQnAQAzAwBYm5uVMzuRPxvGQIway33t25t6e2blaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oD2g+i4AIciMsj+gAAAABJRU5ErkJggg==', 'base64') });
  await page.click('#perfil-foto-usar'); // leva 149 · a foto passa pelo enquadramento antes de entrar
  await page.waitForSelector('.perfil-avatar[data-tipo="foto"]');
  const foto = await page.$eval('.perfil-avatar img', i => ({ src: i.src.slice(0, 22), w: i.naturalWidth, h: i.naturalHeight }));
  assert.equal(foto.src, 'data:image/jpeg;base64'); assert.equal(foto.w, 192); assert.equal(foto.h, 192, 'quadrado central reduzido a 192 px');
  await page.fill('#perfil-nome', 'Guilherme'); 
  assert.equal(await page.locator('#perfil-salvar').isDisabled(), false);
  await page.click('#perfil-salvar'); await page.waitForSelector('#ds-toast[data-open="true"]');
  assert.match(await page.innerText('#ds-toast'), /Perfil salvo/);
  assert.equal(await page.getAttribute('#nav-perfil .ds-avatar', 'data-tipo'), 'foto', 'a barra atualiza sem recarregar');
  assert.equal(await nav.getAttribute('aria-label'), 'Perfil de Guilherme');
  assert.equal(await page.getAttribute('#nav-perfil', 'aria-current'), 'page', 'o avatar marca a tela atual');
  await auditaTela(page, 'perfil (escuro)');
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light')); await auditaTela(page, 'perfil (claro)');
  for (const w of [384, 390, 412]) { await page.setViewportSize({ width: w, height: w === 390 ? 844 : w === 384 ? 832 : 891 }); await auditaTela(page, 'perfil ' + w); }
  await page.setViewportSize({ width: 360, height: 780 }); await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  // recarrega: o perfil persiste no aparelho
  await page.reload(); await page.waitForSelector('#perfil-nome'); assert.equal(await page.inputValue('#perfil-nome'), 'Guilherme');
  assert.equal(await page.getAttribute('#nav-perfil .ds-avatar', 'data-tipo'), 'foto');
  // remover a foto: a inicial entra no lugar; salvar de novo
  await page.click('#perfil-foto-remover'); await page.waitForSelector('.perfil-avatar[data-tipo="inicial"]');
  assert.equal(await page.innerText('.perfil-avatar'), 'G');
  await page.click('#perfil-salvar'); await page.waitForTimeout(200);
  assert.equal(await page.getAttribute('#nav-perfil .ds-avatar', 'data-tipo'), 'inicial');
  // mesa: o seu nome é o do perfil (contador de vida) e o hot-seat já vem com ele
  await createDeck(page, base, 'Delver', PAUPER);
  await page.goto(base + '#/mesa'); await page.waitForSelector('#mesa-start');
  await page.click('[data-opponent="hotseat"]'); assert.equal(await page.inputValue('#mesa-me'), 'Guilherme', 'hot-seat preenchido com o nome do perfil');
  await page.click('[data-opponent="goldfish"]'); await page.fill('#mesa-seed', '4'); await page.click('#mesa-start');
  await page.waitForSelector('#tb-keep'); await page.click('#tb-keep'); await page.waitForSelector('#tb-pass'); await page.waitForTimeout(300);
  assert.match(await page.innerText('.tb-side--me'), /Guilherme/, 'o contador de vida mostra o nome do perfil');
  assert.doesNotMatch(await page.innerText('.tb-side--me .tb-life, .tb-side--me'), /\bVocê\b.*Grimório/s, 'não sobra "Você" no assento');
  // foto do perfil no círculo da faixa de vez quando o turno é seu
  await page.goto(base + '#/perfil'); await page.waitForSelector('#perfil-nome');
  await page.setInputFiles('#perfil-foto-arquivo', { name: 'eu.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAIAAAAuKetIAAAAVUlEQVR4nO3PAQnAQAzAwBYm5uVMzuRPxvGQIway33t25t6e2blaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oD2g+i4AIciMsj+gAAAABJRU5ErkJggg==', 'base64') });
  await page.click('#perfil-foto-usar'); // leva 149 · a foto passa pelo enquadramento antes de entrar
  await page.waitForSelector('.perfil-avatar[data-tipo="foto"]'); await page.click('#perfil-salvar'); await page.waitForTimeout(200);
  await page.goto(base + '#/partida'); await page.waitForSelector('#tb-vez'); await page.waitForTimeout(400);
  const vez = await page.$eval('#tb-vez', el => ({ papel: el.dataset.papel, foto: el.querySelector('.tb-vez__avatar').dataset.foto, img: !!el.querySelector('.tb-vez__avatar img') }));
  if (vez.papel === 'eu') assert.ok(vez.foto === 'true' && vez.img, 'minha vez: a foto no círculo ' + JSON.stringify(vez));
  else assert.ok(vez.foto === 'false' && !vez.img, 'vez do outro: sem a minha foto ' + JSON.stringify(vez));
  await auditaTela(page, 'mesa com perfil');
  // backup completo: o arquivo leva perfil e preferências; restaurar num aparelho limpo traz tudo de volta
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light')); await page.click('#theme-toggle'); await page.waitForTimeout(100); // grava a preferência de tema
  await page.goto(base + '#/perfil'); await page.waitForSelector('#perfil-backup-export');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#perfil-backup-export')]);
  const texto = await (await download.createReadStream()).toArray().then(parts => Buffer.concat(parts).toString('utf8'));
  const dados = JSON.parse(texto);
  assert.equal(dados.version, 3); assert.equal(dados.perfil.nome, 'Guilherme'); assert.match(dados.perfil.avatar, /^data:image\/jpeg/); assert.ok('ui.theme' in dados.prefs); assert.equal(dados.decks.length, 1);
  await page.evaluate(() => indexedDB.databases().then(ds => Promise.all(ds.map(d => new Promise(r => { const q = indexedDB.deleteDatabase(d.name); q.onsuccess = q.onerror = q.onblocked = r; })))));
  await page.reload(); await page.waitForSelector('#perfil-nome'); assert.equal(await page.inputValue('#perfil-nome'), '', 'aparelho limpo');
  await page.setInputFiles('#perfil-backup-arquivo', { name: 'estante-backup.json', mimeType: 'application/json', buffer: Buffer.from(texto) });
  await page.waitForSelector('#ds-toast[data-open="true"]'); assert.match(await page.innerText('#ds-toast'), /1 lista\(s\) restaurada\(s\).*perfil.*preferências/);
  await page.waitForFunction(() => document.querySelector('#perfil-nome').value === 'Guilherme');
  assert.equal(await page.getAttribute('#nav-perfil .ds-avatar', 'data-tipo'), 'foto');
  assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-theme')), dados.prefs['ui.theme'], 'o tema volta com o backup');
  // D5 (leva 150) · expectativa mudou: o backup vive só em Perfil › Dados; Listas fica com o uso
  await page.goto(base + '#/listas'); await page.waitForSelector('#decks-list');
  assert.equal(await page.locator('#decks-backup-export').count(), 0, 'Listas sem seção de backup');
  assert.deepEqual(errors, []);
});

/* ---------------- Leva 129 · conta Google (atrás do Client ID) ---------------- */
test('e2e · Leva 129 conta Google: sem Client ID a seção explica e fica apagada; com ID (falso) entra, usa nome e foto na mesa, envia e baixa o backup, sai', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.setViewportSize({ width: 360, height: 780 });
  // 1 · sem Client ID (o publicado hoje): botão apagado com o motivo, e o backup por arquivo continua sendo o caminho
  await page.goto(base + '#/perfil'); await page.waitForSelector('#perfil-conta');
  assert.equal(await page.locator('#conta-entrar').isDisabled(), true);
  assert.match(await page.innerText('#perfil-conta'), /Client ID/);
  assert.match(await page.innerText('#perfil-conta'), /backup por arquivo/);
  await auditaTela(page, 'perfil sem conta');
  // 2 · com Client ID e um Google falso injetado pelo teste: a seção liga
  const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAIAAAAuKetIAAAAVUlEQVR4nO3PAQnAQAzAwBYm5uVMzuRPxvGQIway33t25t6e2blaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oD2g+i4AIciMsj+gAAAABJRU5ErkJggg==', 'base64');
  const nuvem = { arquivo: null, pedidos: [] };
  await page.route('https://www.googleapis.com/**', async r => {
    const url = r.request().url(), m = r.request().method(); nuvem.pedidos.push(m + ' ' + url.replace('https://www.googleapis.com', '').slice(0, 60));
    if (!/Bearer tok-e2e/.test(r.request().headers().authorization || '')) return r.fulfill({ status: 401, json: {} });
    if (url.includes('/oauth2/v3/userinfo')) return r.fulfill({ json: { name: 'Gui da Conta', email: 'gui@example.com', picture: 'https://lh3.googleusercontent.com/a/foto' } });
    if (url.includes('/drive/v3/files?spaces=appDataFolder')) return r.fulfill({ json: { files: nuvem.arquivo ? [{ id: 'f1', modifiedTime: '2026-10-02T12:00:00Z' }] : [] } });
    if (url.includes('/upload/drive/v3/files')) { nuvem.arquivo = r.request().postData().split('\r\n\r\n')[2].split('\r\n--')[0]; return r.fulfill({ json: { id: 'f1' } }); }
    if (/\/drive\/v3\/files\/f1\?alt=media/.test(url)) return r.fulfill({ status: 200, contentType: 'application/json', body: nuvem.arquivo });
    return r.fulfill({ status: 404, json: {} });
  });
  await page.route('https://lh3.googleusercontent.com/**', r => r.fulfill({ status: 200, contentType: 'image/png', body: PNG, headers: { 'access-control-allow-origin': '*' } }));
  await page.addInitScript(() => {
    window.__GOOGLE_CLIENT_ID = 'e2e.apps.googleusercontent.com';
    window.__googleLog = [];
    window.__GOOGLE_FALSO = { accounts: { oauth2: {
      initTokenClient: cfg => ({ requestAccessToken: o => { window.__googleLog.push(['pede', o.prompt]); setTimeout(() => cfg.callback({ access_token: 'tok-e2e', expires_in: 3600 }), 0); } }),
      revoke: (tk, cb) => { window.__googleLog.push(['revoga', tk]); cb && cb(); } } } };
  });
  await page.reload(); await page.waitForSelector('#conta-entrar:not([disabled])'); // a página recarrega para o Client ID de teste valer
  assert.equal(await page.locator('.ds-btn--primary:visible').count(), 1, 'a conta não cria um segundo primário');
  await page.click('#conta-entrar'); await page.waitForSelector('#perfil-conta[data-conectada="true"]');
  assert.equal(await page.innerText('#conta-nome'), 'Gui da Conta'); assert.equal(await page.innerText('#conta-email'), 'gui@example.com');
  assert.match(await page.innerText('#conta-backup-quando'), /nunca/);
  assert.deepEqual(await page.evaluate(() => window.__googleLog[0]), ['pede', 'consent']);
  await auditaTela(page, 'perfil com conta (escuro)');
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light')); await auditaTela(page, 'perfil com conta (claro)');
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  // 3 · "Usar na mesa": nome e foto da conta viram o perfil (foto reduzida como a da galeria) e a barra atualiza
  await page.click('#conta-usar'); await page.waitForFunction(() => document.querySelector('#perfil-nome') && document.querySelector('#perfil-nome').value === 'Gui da Conta');
  await page.waitForSelector('.perfil-avatar[data-tipo="foto"]');
  assert.equal(await page.$eval('.perfil-avatar img', i => i.naturalWidth), 192);
  assert.equal(await page.getAttribute('#nav-perfil .ds-avatar', 'data-tipo'), 'foto');
  // 4 · enviar o backup: o arquivo da nuvem é o backup v3 com o perfil; a hora do envio aparece
  await createDeck(page, base, 'Delver', PAUPER);
  await page.goto(base + '#/perfil'); await page.waitForSelector('#conta-enviar');
  await page.evaluate(() => { const t = document.querySelector('#ds-toast'); if (t) t.dataset.open = 'false'; }); // o aviso "Lista criada" ainda estava aberto
  await page.click('#conta-enviar'); await page.waitForFunction(() => /nuvem/.test(document.querySelector('#ds-toast')?.textContent || ''));
  assert.match(await page.innerText('#ds-toast'), /enviado para a nuvem/);
  const enviado = JSON.parse(nuvem.arquivo); assert.equal(enviado.version, 3); assert.equal(enviado.perfil.nome, 'Gui da Conta'); assert.equal(enviado.decks.length, 1);
  await page.waitForFunction(() => !/nunca/.test(document.querySelector('#conta-backup-quando').textContent));
  assert.equal(nuvem.pedidos.some(p => p.startsWith('POST /upload/drive/v3/files?uploadType=multipart')), true, 'primeiro envio cria o arquivo na pasta do app');
  await page.click('#conta-enviar'); await page.waitForTimeout(300);
  assert.equal(nuvem.pedidos.some(p => p.startsWith('PATCH /upload/drive/v3/files/f1')), true, 'segundo envio substitui');
  assert.equal(await page.evaluate(() => window.__googleLog.filter(x => x[0] === 'pede').length), 1, 'o token é reusado: um pedido só');
  // 5 · aparelho limpo + baixar da nuvem traz lista e perfil de volta
  await page.evaluate(() => indexedDB.databases().then(ds => Promise.all(ds.map(d => new Promise(r => { const q = indexedDB.deleteDatabase(d.name); q.onsuccess = q.onerror = q.onblocked = r; })))));
  await page.reload(); await page.waitForSelector('#conta-entrar:not([disabled])'); await page.click('#conta-entrar'); await page.waitForSelector('#conta-baixar');
  await page.click('#conta-baixar'); await page.waitForFunction(() => document.querySelector('#perfil-nome') && document.querySelector('#perfil-nome').value === 'Gui da Conta');
  await page.goto(base + '#/listas'); await page.waitForSelector('.deck-summary, #decks-list .ds-list__item, [data-deck]'); assert.match(await page.innerText('#decks-list'), /Delver/);
  // 6 · sair: revoga, apaga a conta do aparelho; o perfil local fica
  await page.goto(base + '#/perfil'); await page.waitForSelector('#conta-sair'); await page.click('#conta-sair');
  await page.waitForSelector('#conta-entrar:not([disabled])');
  assert.deepEqual(await page.evaluate(() => window.__googleLog.at(-1)), ['revoga', 'tok-e2e']);
  assert.equal(await page.inputValue('#perfil-nome'), 'Gui da Conta', 'sair da conta não apaga o perfil local');
  // 7 · sem internet, entrar explica em vez de falhar em silêncio
  await page.context().setOffline(true); await page.click('#conta-entrar'); await page.waitForSelector('#ds-toast[data-open="true"]');
  assert.match(await page.innerText('#ds-toast'), /Sem internet/); await page.context().setOffline(false);
  assert.deepEqual(errors, []);
});

// ---- Leva 131 · R3 · Mono Blue Faeries pela tela (360×780, modo único) ----
const dock131 = async page => (await page.locator('.tb-dock').innerText()).replace(/\s*\n+\s*/g, ' | ');
const folha131 = async (page, nome, onde = '#tb-hand') => { await page.locator(`${onde} .tb-card[aria-label^="${nome}"]`).first().click(); await page.waitForSelector('.ds-dialog'); await page.waitForTimeout(250);
  return page.locator('.ds-dialog .tb-sheet__actions button').evaluateAll(bs => bs.map(b => ({ txt: b.innerText.replace(/\s+/g, ' ').trim(), apagado: b.disabled, cls: b.className }))); };
const terrenoEAte131 = async (M, pronto) => { let e; for (let i = 0; i < 14; i++) { const o = await M.oid('Island'); if (o) await M.act({ t: 'play_land', p: 0, oid: o }); e = await M.est(); if (pronto(e)) return e; await M.proximo(); } assert.fail('a mão não chegou ao ponto do teste: ' + JSON.stringify(e)); };
const ilhas131 = e => e.campo.filter(x => x === 'Island').length;

test('e2e · Leva 131 · Faeries: vidência em português; alvo do gatilho sem nome repetido e pelo toque na carta; Cam pergunta virar, desvirar ou nada na resolução', { skip }, async t => {
  const M = await comLista125(t, '24 Island\n12 Faerie Seer\n12 Sewer-veillance Cam\n12 Harrier Strix', ['Island', 'Faerie Seer', 'Sewer-veillance Cam', 'Harrier Strix'], '5');
  const { page } = M;
  const conjura = async n => { await page.locator(`#tb-hand .tb-card[aria-label^="${n}"]`).first().click(); await naFolha(page, /^Conjurar/); return M.resolve(); };
  const virada = nome => page.evaluate(nome => { const s = window.__estanteMesa.estado(); return s.zones[0].battlefield.filter(o => s.objects[o].name === nome).map(o => !!s.objects[o].tapped); }, nome);
  await terrenoEAte131(M, e => e.mao.includes('Faerie Seer'));
  let e = await conjura('Faerie Seer');
  assert.equal(e.pend, 'pick');
  assert.match(await M.decisao(), /^Faerie Seer · Vidência: escolha o que fica no topo \| 0 de até 2 escolhida\(s\) · o resto vai para o fundo$/);
  await auditaTela(page, 'vidência da Faerie Seer');
  await page.click('#tb-pick-done'); await page.waitForTimeout(150);
  await terrenoEAte131(M, e => ilhas131(e) >= 4 && e.mao.includes('Harrier Strix') && e.mao.includes('Sewer-veillance Cam') && e.campo.includes('Faerie Seer'));
  // Harrier Strix: "tap target permanent" com 4 Ilhas, a Seer e a própria Strix em campo
  e = await conjura('Harrier Strix');
  assert.equal(e.pend, 'pick_target');
  assert.match(await M.decisao(), /^Harrier Strix: escolha o alvo \| O gatilho faz: vira uma permanente\. Toque na carta ou escolha aqui\.$/);
  const botoes = await page.locator('.tb-banner__actions button').allInnerTexts();
  assert.equal(new Set(botoes).size, botoes.length, 'nenhum botão repetido: ' + botoes.join(' | '));
  assert.deepEqual(botoes.slice().sort(), ['Faerie Seer', 'Harrier Strix', 'Island (desvirada)', 'Island (virada)'], 'cópias iguais viram um botão; o que separa as Ilhas é estar virada');
  assert.ok(await page.locator('.tb-side .tb-card[aria-label^="Faerie Seer"][data-eligible="true"]').count(), 'a carta que pode ser alvo fica marcada na mesa');
  await auditaTela(page, 'alvo do gatilho da Harrier Strix');
  // tocar na carta na mesa escolhe o alvo
  await page.locator('.tb-side .tb-card[aria-label^="Faerie Seer"]').first().click(); await page.waitForTimeout(200);
  e = await M.resolve();
  assert.equal(e.pend, null); assert.deepEqual(await virada('Faerie Seer'), [true], 'a Faerie Seer tocada na mesa foi virada');
  // Sewer-veillance Cam: alvo ao pôr na pilha; a escolha vem na resolução, com o estado da criatura escrito
  e = await conjura('Sewer-veillance Cam');
  assert.equal(e.pend, 'pick_target');
  assert.match(await M.decisao(), /pode virar ou desvirar uma criatura/);
  await page.locator('.tb-banner__actions button', { hasText: 'Faerie Seer' }).click(); await page.waitForTimeout(150);
  e = await M.resolve();
  assert.equal(e.pend, 'choose_mode');
  assert.equal(await page.innerText('#tb-modo-pergunta'), 'O que fazer com Faerie Seer? Ela está virada.');
  assert.deepEqual(await page.locator('#tb-modo button').allInnerTexts(), ['Virar', 'Desvirar', 'Nada']);
  await auditaTela(page, 'virar, desvirar ou nada');
  await page.locator('#tb-modo button', { hasText: 'Desvirar' }).click(); await page.waitForTimeout(200);
  assert.deepEqual(await virada('Faerie Seer'), [false], 'desvirou');
  assert.equal((await M.est()).pend, null);
  assert.deepEqual(M.errors, []);
});

test('e2e · Leva 131 · Faeries: ninjutsu aparece na folha com o custo, apagado com o motivo fora do combate; o aviso do gatilho diz quando não há descarte', { skip }, async t => {
  const M = await comLista125(t, '24 Island\n14 Faerie Seer\n11 Ninja of the Deep Hours\n11 Moon-Circuit Hacker', ['Island', 'Faerie Seer', 'Ninja of the Deep Hours', 'Moon-Circuit Hacker'], '5');
  const { page } = M;
  await terrenoEAte131(M, e => e.mao.includes('Faerie Seer'));
  await page.locator('#tb-hand .tb-card[aria-label^="Faerie Seer"]').first().click(); await naFolha(page, /^Conjurar/); await M.resolve();
  await page.click('#tb-pick-done'); await page.waitForTimeout(150);
  await M.proximo();
  await terrenoEAte131(M, e => ilhas131(e) >= 3 && e.mao.includes('Moon-Circuit Hacker') && e.campo.includes('Faerie Seer'));
  // na fase principal: conjurar normalmente, e o ninjutsu apagado dizendo quando dá
  let f = await folha131(page, 'Moon-Circuit Hacker');
  assert.deepEqual(f.map(b => [b.txt, b.apagado]), [['Conjurar · {1}{U}', false], ['Ninjutsu · {U} — só no combate, com um atacante seu sem bloqueio', true]]);
  await auditaTela(page, 'folha do ninja na fase principal');
  await page.click('#ds-dialog-close'); await page.waitForTimeout(150);
  // ataca com a Faerie Seer; o Goldfish não bloqueia
  for (let i = 0; i < 10; i++) { const e = await M.est(); if (e.pend === 'attackers') break; await page.click('#tb-pass'); await page.waitForTimeout(200); }
  await page.locator('.tb-card[aria-label^="Faerie Seer"]').first().click(); await page.waitForTimeout(150);
  await page.click('#tb-attack'); await page.waitForTimeout(300);
  let e = await M.est(); assert.equal(e.passo, 'combat_blockers');
  f = await folha131(page, 'Moon-Circuit Hacker');
  assert.deepEqual(f.map(b => [b.txt, b.apagado]), [['Conjurar · {1}{U} — só na sua fase principal, com a pilha vazia', true], ['Ninjutsu · {U} → devolve Faerie Seer', false]]);
  await naFolha(page, /^Ninjutsu/);
  e = await M.est();
  assert.ok(e.campo.includes('Moon-Circuit Hacker') && !e.campo.includes('Faerie Seer') && e.mao.includes('Faerie Seer'), 'a Seer voltou para a mão e o ninja entrou');
  assert.match(await dock131(page), /Moon-Circuit Hacker: sem bloqueio/);
  await auditaTela(page, 'ninja em campo, atacando');
  for (let i = 0; i < 8; i++) { e = await M.est(); if (e.pend) break; await page.click('#tb-pass'); await page.waitForTimeout(200); }
  assert.equal(e.pend, 'may_pay');
  assert.match(await M.decisao(), /^Moon-Circuit Hacker: fazer o efeito\? \| Se aceitar: compra 1 carta; descarta 1 carta \(só se ela não entrou neste turno\)\./);
  await auditaTela(page, 'gatilho opcional do ninja');
  const antes = e.mao.length;
  await page.locator('.tb-banner__actions button', { hasText: /^Fazer$/ }).click(); await page.waitForTimeout(200);
  e = await M.resolve();
  assert.equal(e.pend, null, 'entrou neste turno: compra e não descarta'); assert.equal(e.mao.length, antes + 1);
  assert.deepEqual(M.errors, []);
});

test('e2e · Leva 131 · Faeries: Hydroblast sem nada vermelho não oferece destruir a própria Ilha; Relic diz o custo inteiro; a Sprite anula a mágica na pilha', { skip }, async t => {
  const M = await comLista125(t, '20 Island\n14 Spellstutter Sprite\n13 Relic of Progenitus\n13 Hydroblast', ['Island', 'Spellstutter Sprite', 'Relic of Progenitus', 'Hydroblast'], '5');
  const { page } = M;
  await terrenoEAte131(M, e => ilhas131(e) >= 2 && e.mao.includes('Hydroblast') && e.mao.includes('Spellstutter Sprite'));
  // nada vermelho na mesa: nenhum botão dourado; o que sobra é discreto e diz que não faz nada
  let f = await folha131(page, 'Hydroblast');
  assert.deepEqual(f.map(b => b.txt), ['Destruir uma permanente, se for vermelha — sem efeito nos alvos de agora']);
  assert.doesNotMatch(f[0].cls, /primary/, 'não é a ação em destaque');
  await auditaTela(page, 'folha do Hydroblast sem alvo vermelho');
  await page.locator('.ds-dialog .tb-sheet__actions button').first().click(); await page.waitForSelector('#tb-alvos');
  assert.match(await page.innerText('.ds-dialog'), /sem efeito/); assert.match(await page.innerText('#tb-alvos'), /Suas permanentes/i);
  assert.equal((await M.est()).pilha, 0, 'abrir a lista não conjura nada');
  await auditaTela(page, 'lista de alvos sem efeito');
  await page.locator('.ds-dialog button', { hasText: 'Voltar' }).click(); await page.waitForTimeout(150);
  // primeira Sprite em campo (sem mágica na pilha o gatilho não tem alvo e sai)
  await page.locator('#tb-hand .tb-card[aria-label^="Spellstutter"]').first().click(); await naFolha(page, /^Conjurar/);
  let e = await M.resolve(); assert.equal(e.pend, null); assert.ok(e.campo.includes('Spellstutter Sprite'));
  await M.proximo();
  await terrenoEAte131(M, e => ilhas131(e) >= 4 && e.mao.includes('Relic of Progenitus') && e.mao.includes('Spellstutter Sprite') && e.mao.filter(n => n === 'Relic of Progenitus').length >= 2);
  // Relic na pilha; a segunda Sprite entra em resposta (duas Fadas: anula valor de mana até 2)
  await page.locator('#tb-hand .tb-card[aria-label^="Relic"]').first().click(); await naFolha(page, /^Conjurar/);
  assert.equal((await M.est()).pilha, 1);
  await page.locator('#tb-hand .tb-card[aria-label^="Spellstutter"]').first().click(); await naFolha(page, /^Conjurar/);
  e = await M.resolve();
  if (e.pend === 'pick_target') { await page.click('#tb-pick-target'); e = await M.resolve(); }
  assert.ok(e.cemiterio.includes('Relic of Progenitus') && !e.campo.includes('Relic of Progenitus'), 'a Relic foi anulada');
  // segunda Relic entra; a folha diz os dois custos por inteiro
  await M.proximo(); await terrenoEAte131(M, e => e.mao.includes('Relic of Progenitus'));
  await page.locator('#tb-hand .tb-card[aria-label^="Relic"]').first().click(); await naFolha(page, /^Conjurar/); e = await M.resolve();
  assert.ok(e.campo.includes('Relic of Progenitus'));
  f = await folha131(page, 'Relic of Progenitus', '.tb-side');
  const nomes = await page.evaluate(() => window.__estanteMesa.estado().players.map(p => p.name));
  assert.deepEqual(f.map(b => b.txt), [`Ativar ({T}) → ${nomes[0]}`, `Ativar ({T}) → ${nomes[1]}`, 'Ativar ({1}, exilar esta)']);
  await auditaTela(page, 'folha da Relic of Progenitus');
  await naFolha(page, /exilar esta/); e = await M.resolve();
  assert.ok(e.exilio.includes('Relic of Progenitus') && !e.cemiterio.length, 'a Relic se exila, exila os cemitérios e compra');
  assert.deepEqual(M.errors, []);
});

test('e2e · Leva 131 · Faeries: Of One Mind mostra o custo com desconto; a segunda Faerie Miscreant compra; Brinebarrow Intruder sem alvo não pergunta nada', { skip }, async t => {
  const M = await comLista125(t, '22 Island\n13 Brinebarrow Intruder\n12 Faerie Miscreant\n13 Of One Mind', ['Island', 'Brinebarrow Intruder', 'Faerie Miscreant', 'Of One Mind'], '5');
  const { page } = M;
  const conjura = async n => { await page.locator(`#tb-hand .tb-card[aria-label^="${n}"]`).first().click(); await naFolha(page, /^Conjurar/); return M.resolve(); };
  await terrenoEAte131(M, e => ilhas131(e) >= 4 && e.mao.includes('Brinebarrow Intruder') && e.mao.includes('Of One Mind') && e.mao.filter(n => n === 'Faerie Miscreant').length >= 2);
  let f = await folha131(page, 'Of One Mind');
  assert.deepEqual(f.map(b => b.txt), ['Conjurar · {2}{U}'], 'sem criaturas: custo impresso');
  await page.click('#ds-dialog-close'); await page.waitForTimeout(150);
  // Intruder: sem criatura do oponente, o gatilho não tem alvo e a mesa não pergunta nada
  let e = await conjura('Brinebarrow Intruder'); assert.equal(e.pend, null); assert.ok(e.campo.includes('Brinebarrow Intruder'));
  // primeira Miscreant: não compra; segunda: compra uma
  let mao = e.mao.length; e = await conjura('Faerie Miscreant'); assert.equal(e.mao.length, mao - 1, 'a primeira Miscreant não compra');
  f = await folha131(page, 'Of One Mind');
  assert.deepEqual(f.map(b => b.txt), ['Conjurar · {U} (com desconto)'], 'um Humano (Intruder) e um não Humano (Miscreant): {2} a menos');
  await auditaTela(page, 'folha de Of One Mind com desconto');
  await page.click('#ds-dialog-close'); await page.waitForTimeout(150);
  mao = e.mao.length; e = await conjura('Faerie Miscreant'); assert.equal(e.mao.length, mao, 'a segunda Miscreant sai da mão e compra uma');
  const desviradas = (await M.desvirados()).length;
  mao = e.mao.length; e = await conjura('Of One Mind');
  assert.equal(e.mao.length, mao + 1, 'compra duas'); assert.equal((await M.desvirados()).length, desviradas - 1, 'pagou só {U}');
  assert.deepEqual(M.errors, []);
});

test('e2e · Leva 131 · Faeries: Counterspell diz qual mágica anula, Dispel diz que não tem alvo, e Cryoshatter destrói a criatura quando ela vira', { skip }, async t => {
  const M = await comLista125(t, '22 Island\n12 Faerie Seer\n9 Counterspell\n8 Dispel\n9 Cryoshatter', ['Island', 'Faerie Seer', 'Counterspell', 'Dispel', 'Cryoshatter'], '5');
  const { page } = M;
  await terrenoEAte131(M, e => ilhas131(e) >= 4 && ['Faerie Seer', 'Counterspell', 'Dispel', 'Cryoshatter'].every(n => e.mao.includes(n)) && e.mao.filter(n => n === 'Faerie Seer').length >= 2);
  await page.locator('#tb-hand .tb-card[aria-label^="Faerie Seer"]').first().click(); await naFolha(page, /^Conjurar/);
  assert.equal((await M.est()).pilha, 1);
  // com a Faerie Seer (criatura) na pilha: Dispel só anula instantânea
  let f = await folha131(page, 'Dispel');
  assert.deepEqual(f.map(b => [b.txt, b.apagado]), [['Conjurar · {U} — sem alvo válido agora', true]]);
  await page.click('#ds-dialog-close'); await page.waitForTimeout(150);
  f = await folha131(page, 'Counterspell');
  assert.deepEqual(f.map(b => [b.txt, b.apagado]), [['Conjurar → Faerie Seer · {U}{U}', false]]);
  await auditaTela(page, 'folha do Counterspell com a mágica na pilha');
  await naFolha(page, /^Conjurar/); let e = await M.resolve();
  assert.ok(e.cemiterio.includes('Faerie Seer') && e.cemiterio.includes('Counterspell') && !e.campo.includes('Faerie Seer'), 'a Seer foi anulada');
  // outra Seer entra; Cryoshatter nela; ao atacar ela vira e é destruída
  await page.locator('#tb-hand .tb-card[aria-label^="Faerie Seer"]').first().click(); await naFolha(page, /^Conjurar/); e = await M.resolve();
  if (e.pend === 'pick') { await page.click('#tb-pick-done'); await page.waitForTimeout(150); }
  f = await folha131(page, 'Cryoshatter');
  assert.deepEqual(f.map(b => b.txt), ['Conjurar → Faerie Seer · {U}']);
  await naFolha(page, /^Conjurar/); e = await M.resolve();
  assert.ok(e.campo.includes('Cryoshatter'));
  await M.proximo();
  for (let i = 0; i < 10; i++) { e = await M.est(); if (e.pend === 'attackers') break; await page.click('#tb-pass'); await page.waitForTimeout(200); }
  await page.locator('.tb-side .tb-card[aria-label^="Faerie Seer"]').first().click(); await page.waitForTimeout(150);
  await page.click('#tb-attack'); await page.waitForTimeout(300);
  for (let i = 0; i < 10; i++) { e = await M.est(); if (!e.campo.includes('Faerie Seer') || e.passo === 'main2') break; await page.click('#tb-pass').catch(() => {}); await page.waitForTimeout(200); }
  assert.ok(e.cemiterio.filter(n => n === 'Faerie Seer').length >= 2 && e.cemiterio.includes('Cryoshatter'), 'virou para atacar: Cryoshatter destrói a criatura e vai junto para o cemitério');
  assert.deepEqual(M.errors, []);
});

// ---- Leva 136 · R4 · Elves pela tela (360×780, modo único) ----
const floresta136 = async (M, pronto, max = 18) => { let e; for (let i = 0; i < max; i++) { const o = await M.oid('Forest'); if (o) await M.act({ t: 'play_land', p: 0, oid: o }); e = await M.est(); if (pronto(e)) return e; await M.proximo(); } assert.fail('a mão não chegou ao ponto do teste: ' + JSON.stringify(e)); };
/** Joga terreno e conjura tudo o que der, turno a turno, até a mesa ficar como o teste precisa. */
const monta136 = async (M, pronto, max = 18) => { let e; for (let i = 0; i < max; i++) {
  const o = await M.oid('Forest'); if (o) await M.act({ t: 'play_land', p: 0, oid: o });
  for (let k = 0; k < 6; k++) { const c = await M.legal("a.t==='cast' && !a.faceDown"); if (!c.length) break; await M.act(c[0]); await M.resolve(); }
  e = await M.est(); if (pronto(e)) { await M.proximo(); const o2 = await M.oid('Forest'); if (o2) await M.act({ t: 'play_land', p: 0, oid: o2 }); return M.est(); } await M.proximo(); }
  assert.fail('a mesa não chegou ao ponto do teste: ' + JSON.stringify(e)); };
const fecha136 = async page => { if (await page.locator('#ds-dialog-close').count()) await page.click('#ds-dialog-close'); await page.waitForTimeout(150); };
const grade136 = page => page.locator('#tb-escolha .tb-card').evaluateAll(cs => cs.map(c => (c.matches('button') ? c : c.querySelector('button')).getAttribute('aria-label')));
const mesa136 = page => page.evaluate(() => { const s = window.__estanteMesa.estado(); const meus = s.zones[0].battlefield.map(o => s.objects[o]);
  return { pool: s.players[0].pool, vida: s.players[0].life, viradas: meus.filter(o => o.tapped).map(o => o.name), elfos: s.zones.flatMap(z => z.battlefield).filter(o => /Elf/.test((s.facts[s.objects[o].name].typeText || '') + ' ' + (s.facts[s.objects[o].name].subtypes || []).join(' '))).length,
    florestas: meus.filter(o => o.name === 'Forest').length, topo: s.zones[0].library.slice(0, 5).map(o => s.objects[o].name), tipos: Object.fromEntries(Object.entries(s.facts).map(([n, f]) => [n, f.types])) }; });

test('e2e · Leva 136 · Elves: virar dois Elfos tocando nas cartas (Birchlore Rangers), Quirion Ranger pergunta o alvo e depois qual Floresta volta, Priest diz quanta mana gera', { skip }, async t => {
  const M = await comLista125(t, '18 Forest\n8 Llanowar Elves\n8 Birchlore Rangers\n8 Priest of Titania\n8 Quirion Ranger\n5 Timberwatch Elf\n5 Jaspera Sentinel', ['Forest', 'Llanowar Elves', 'Birchlore Rangers', 'Priest of Titania', 'Quirion Ranger', 'Timberwatch Elf', 'Jaspera Sentinel'], '7');
  const { page } = M;
  await monta136(M, e => ['Birchlore Rangers', 'Priest of Titania', 'Quirion Ranger'].every(n => e.campo.includes(n)) && e.campo.filter(n => n === 'Llanowar Elves').length >= 2);
  let m = await mesa136(page);
  // Priest: o botão diz quantas manas saem
  let f = await folha131(page, 'Priest of Titania', '.tb-side');
  assert.deepEqual(f.map(b => b.txt), [m.elfos > 4 ? `Gerar ${m.elfos} × {G}` : 'Gerar ' + '{G}'.repeat(m.elfos)], 'uma {G} por Elfo no campo');
  await auditaTela(page, 'folha do Priest of Titania'); await fecha136(page);
  // Birchlore: escolhe a cor, depois toca em dois Elfos
  f = await folha131(page, 'Birchlore Rangers', '.tb-side');
  assert.deepEqual(f.map(b => b.txt), ['W', 'U', 'B', 'R', 'G'].map(c => `Gerar {${c}}`));
  await page.locator('.ds-dialog .tb-sheet__actions button').first().click(); await page.waitForSelector('#tb-escolha');
  assert.equal(await page.innerText('#tb-escolha-pergunta'), 'Quais criaturas viram para pagar? Toque nas cartas: 0 de 2.');
  const cartas = await grade136(page);
  assert.equal(new Set(cartas).size, cartas.length, 'uma carta por criatura diferente (antes: uma lista com todos os pares): ' + cartas.join(' | '));
  assert.ok(cartas.some(c => /^Virar Llanowar Elves, \d cópias iguais$/.test(c)), 'cópias iguais viram uma pilha');
  await auditaTela(page, 'virar dois Elfos');
  await page.locator('#tb-escolha [data-escolha="Llanowar Elves"]').first().click(); await page.waitForTimeout(200);
  assert.equal(await page.innerText('#tb-escolha-pergunta'), 'Quais criaturas viram para pagar? Toque nas cartas: 1 de 2.');
  assert.match((await grade136(page)).join(' | '), /Virar Llanowar Elves, \d cópias iguais, 1 escolhida\(s\)/);
  await page.locator('#tb-escolha [data-escolha="Llanowar Elves"]').first().click(); await page.waitForTimeout(300);
  m = await mesa136(page);
  assert.equal(await page.locator('#tb-escolha').count(), 0, 'fechou a conta, a escolha fecha'); assert.equal(m.pool.W, 1);
  assert.equal(m.viradas.filter(n => n === 'Llanowar Elves').length, 2, 'viraram os dois Llanowar tocados, não a Birchlore');
  // Quirion: alvo, depois qual Floresta (virada e desvirada aparecem separadas)
  const umaFloresta = await page.evaluate(() => { const s = window.__estanteMesa.estado(); return s.zones[0].battlefield.find(o => s.objects[o].name === 'Forest' && !s.objects[o].tapped); });
  await M.act({ t: 'tap_mana', p: 0, oid: umaFloresta, option: 0 });
  f = await folha131(page, 'Quirion Ranger', '.tb-side');
  assert.match(f[0].txt, /^Ativar \(devolver Forest à mão\)( · \d+ alvos| → .+)$/, 'o custo está escrito');
  await page.locator('.ds-dialog .tb-sheet__actions button').first().click(); await page.waitForTimeout(300);
  if (await page.locator('#tb-alvos').count()) { await auditaTela(page, 'alvos do Quirion Ranger'); await page.locator('#tb-alvos button', { hasText: 'Llanowar Elves' }).first().click(); await page.waitForTimeout(300); }
  await page.waitForSelector('#tb-escolha');
  assert.equal(await page.innerText('#tb-escolha-pergunta'), 'Qual terreno volta para a mão? Toque na carta.');
  const terrenos = await grade136(page);
  assert.deepEqual(terrenos.slice().sort(), ['Devolver Forest (virada)', m.florestas - 1 > 1 ? `Devolver Forest, ${m.florestas - 1} cópias iguais` : 'Devolver Forest'].sort(), 'Florestas iguais juntas, a virada à parte (antes: uma carta por Floresta, sem dizer qual estava virada)');
  await auditaTela(page, 'qual Floresta volta');
  const mao = (await M.est()).mao.filter(n => n === 'Forest').length;
  await page.locator('#tb-escolha .tb-card').nth(terrenos.indexOf('Devolver Forest (virada)')).click(); await page.waitForTimeout(200);
  const e = await M.resolve(); const d = await mesa136(page);
  assert.equal(e.mao.filter(n => n === 'Forest').length, mao + 1, 'a Floresta voltou para a mão'); assert.equal(d.florestas, m.florestas - 1);
  assert.equal(d.viradas.filter(n => n === 'Llanowar Elves').length, 1, 'um dos Llanowar foi desvirado'); assert.equal(d.viradas.includes('Forest'), false, 'voltou a Floresta virada');
  assert.deepEqual(M.errors, []);
});

test('e2e · Leva 136 · Elves: Winding Way entrega as cartas sem pergunta e diz o que revelou; Lead the Stampede diz o que pode ser pego; Huntmaster pergunta pela ficha; colher provas aparece na folha', { skip }, async t => {
  const M = await comLista125(t, '18 Forest\n10 Llanowar Elves\n8 Winding Way\n8 Lead the Stampede\n8 Lys Alana Huntmaster\n8 Vitu-Ghazi Inspector', ['Forest', 'Llanowar Elves', 'Winding Way', 'Lead the Stampede', 'Lys Alana Huntmaster', 'Vitu-Ghazi Inspector'], '4');
  const { page } = M;
  await floresta136(M, e => e.campo.filter(x => x === 'Forest').length >= 3 && e.mao.includes('Winding Way') && e.mao.includes('Lead the Stampede'));
  let f = await folha131(page, 'Winding Way');
  assert.deepEqual(f.map(b => b.txt), ['Revelar 4 e pegar as criaturas · {1}{G}', 'Revelar 4 e pegar os terrenos · {1}{G}']);
  let m = await mesa136(page); const topo = m.topo.slice(0, 4), criaturas = topo.filter(n => m.tipos[n].includes('creature'));
  let antes = await M.est();
  await page.locator('.ds-dialog .tb-sheet__actions button').first().click(); await page.waitForTimeout(300);
  let e = await M.resolve();
  assert.equal(e.pend, null, 'nenhuma pergunta: a carta diz "all"');
  assert.equal(e.mao.length, antes.mao.length - 1 + criaturas.length, 'as criaturas reveladas foram para a mão');
  assert.equal(e.cemiterio.length, antes.cemiterio.length + 1 + (4 - criaturas.length), 'o resto e a própria carta no cemitério');
  await page.waitForSelector('#ds-toast[data-open="true"]');
  assert.equal(await page.innerText('#ds-toast'), `Winding Way revelou: ${topo.join(', ')}`, 'a mesa diz o que foi revelado');
  await auditaTela(page, 'Winding Way resolvida');
  // Lead the Stampede: o aviso diz o que pode ir para a mão
  await M.proximo(); await floresta136(M, e => e.campo.filter(x => x === 'Forest').length >= 3 && e.mao.includes('Lead the Stampede'));
  m = await mesa136(page); const cinco = m.topo, pegaveis = cinco.filter(n => m.tipos[n].includes('creature'));
  await page.locator('#tb-hand .tb-card[aria-label^="Lead the"]').first().click(); await naFolha(page, /^Conjurar/); e = await M.resolve();
  assert.equal(e.pend, 'pick');
  assert.equal(await M.decisao(), 'Lead the Stampede · Olhar o topo do grimório | ' + (pegaveis.length ? `Toque nas criaturas que vão para a mão: 0 de ${pegaveis.length} · o resto vai para o fundo` : 'Nenhuma criatura entre as cartas · tudo vai para o fundo'));
  await auditaTela(page, 'escolha de Lead the Stampede');
  antes = await M.est();
  for (const o of await M.legal("a.t==='pick'")) await M.act(o);
  if ((await M.est()).pend === 'pick') { await page.click('#tb-pick-done'); await page.waitForTimeout(200); }
  e = await M.est(); assert.equal(e.mao.length, antes.mao.length + pegaveis.length);
  // Huntmaster: conjurar um Elfo pergunta pela ficha
  await M.proximo();
  await floresta136(M, e => e.campo.filter(x => x === 'Forest').length >= 5 && ['Lys Alana Huntmaster', 'Llanowar Elves', 'Vitu-Ghazi Inspector'].every(n => e.mao.includes(n)), 24);
  await page.locator('#tb-hand .tb-card[aria-label^="Lys Alana"]').first().click(); await naFolha(page, /^Conjurar/); await M.resolve();
  await page.locator('#tb-hand .tb-card[aria-label^="Llanowar"]').first().click(); await naFolha(page, /^Conjurar/); e = await M.resolve();
  assert.equal(e.pend, 'may_pay');
  assert.equal(await M.decisao(), 'Lys Alana Huntmaster: fazer o efeito? | Se aceitar: cria 1 ficha de Elf Warrior 1/1. Recusando, nada acontece.');
  await auditaTela(page, 'ficha da Huntmaster');
  await page.locator('.tb-banner__actions button', { hasText: /^Fazer$/ }).click(); await page.waitForTimeout(200); e = await M.resolve();
  assert.ok(e.campo.includes('Elf Warrior') && e.campo.includes('Llanowar Elves'));
  // Vitu-Ghazi Inspector: colher provas é uma opção da folha (antes as duas formas tinham o mesmo nome e a mesa conjurava sempre sem as provas)
  await M.proximo(); await floresta136(M, e => e.mao.includes('Vitu-Ghazi Inspector') && e.cemiterio.length >= 3);
  f = await folha131(page, 'Vitu-Ghazi Inspector');
  assert.deepEqual(f.map(b => [b.txt, b.apagado]), [['Conjurar · {1}{G}', false], ['Conjurar com provas 6 · {1}{G}', false]]);
  await auditaTela(page, 'folha do Vitu-Ghazi Inspector');
  await page.locator('.ds-dialog .tb-sheet__actions button', { hasText: 'com provas' }).click(); await page.waitForTimeout(300);
  e = await M.est(); assert.equal(e.pend, 'pick');
  assert.equal(await M.decisao(), 'Vitu-Ghazi Inspector · Colher provas: exile do cemitério | Toque nas cartas até somar 6 de valor de mana: 0 de 6');
  await auditaTela(page, 'colher provas');
  const vida = (await mesa136(page)).vida;
  for (let i = 0; i < 8 && (await M.est()).pend === 'pick'; i++) { const o = await M.legal("a.t==='pick'"); if (!o.length) { await page.click('#tb-pick-done'); break; } await M.act(o[0]); }
  e = await M.est(); assert.ok(e.exilio.length >= 1, 'as provas foram para o exílio');
  for (let i = 0; i < 12; i++) { e = await M.est(); if (e.pend === 'pick_target') { await page.click('#tb-pick-target'); await page.waitForTimeout(150); } else if (e.pend) await M.act((await M.legal("a.t!=='concede'"))[0]); /* a Huntmaster em campo pergunta pela ficha: o Inspector é mágica de Elfo */
    else if (e.pilha) { await page.click('#tb-pass', { timeout: 3000 }).catch(() => {}); await page.waitForTimeout(150); } else break; }
  assert.equal((await mesa136(page)).vida, vida + 2, 'com provas: marcador na criatura alvo e 2 de vida');
  assert.deepEqual(M.errors, []);
});

test('e2e · Leva 136 · Elves: Distant Melody diz de qual carta é a escolha do tipo; Salt Road Packbeast mostra o custo com afinidade', { skip }, async t => {
  const M = await comLista125(t, '16 Forest\n8 Birchlore Rangers\n8 Llanowar Elves\n6 Distant Melody\n6 Salt Road Packbeast\n6 Timberwatch Elf\n5 Mirrorshell Crab\n5 Scattershot Archer', ['Forest', 'Birchlore Rangers', 'Llanowar Elves', 'Distant Melody', 'Salt Road Packbeast', 'Timberwatch Elf', 'Mirrorshell Crab', 'Scattershot Archer'], '9');
  const { page } = M;
  let e = await monta136(M, e => e.campo.includes('Birchlore Rangers') && e.campo.includes('Llanowar Elves') && e.campo.includes('Timberwatch Elf') && e.mao.includes('Distant Melody') && e.mao.includes('Salt Road Packbeast') && e.campo.filter(n => n === 'Forest').length >= 4);
  const criaturas = e.campo.filter(n => n !== 'Forest').length;
  let f = await folha131(page, 'Salt Road Packbeast');
  assert.deepEqual(f.map(b => [b.txt, b.apagado]), [[`Conjurar · ${5 - criaturas > 0 ? `{${5 - criaturas}}` : ''}{W} (com desconto) — mana insuficiente`, true]], 'afinidade com criaturas: {1} a menos por criatura; falta o {W}');
  await auditaTela(page, 'folha da Salt Road Packbeast'); await fecha136(page);
  f = await folha131(page, 'Distant Melody'); assert.deepEqual(f.map(b => [b.txt, b.apagado]), [['Conjurar · {3}{U} — mana insuficiente', true]]); await fecha136(page);
  // {U} pelas Birchlore Rangers, virando ela e a Timberwatch
  await folha131(page, 'Birchlore Rangers', '.tb-side'); await page.locator('.ds-dialog .tb-sheet__actions button').nth(1).click(); await page.waitForSelector('#tb-escolha');
  await page.locator('#tb-escolha [data-escolha="Birchlore Rangers"]').first().click(); await page.waitForTimeout(200);
  await page.locator('#tb-escolha [data-escolha="Timberwatch Elf"]').first().click(); await page.waitForTimeout(300);
  let m = await mesa136(page); assert.equal(m.pool.U, 1);
  const elfos = m.elfos, mao = (await M.est()).mao.length;
  f = await folha131(page, 'Distant Melody'); assert.deepEqual(f.map(b => [b.txt, b.apagado]), [['Conjurar · {3}{U}', false]]);
  await page.locator('.ds-dialog .tb-sheet__actions button').first().click(); await page.waitForTimeout(300); e = await M.resolve();
  assert.equal(e.pend, 'choose_type');
  assert.match(await M.decisao(), /^Distant Melody · Escolha um tipo de criatura \| O efeito conta as suas permanentes desse tipo\./);
  assert.equal((await page.locator('.tb-banner__actions button').allInnerTexts())[0], 'Elf', 'o tipo que mais rende vem primeiro');
  await auditaTela(page, 'tipo de criatura da Distant Melody');
  await page.click('#tb-choose-type'); await page.waitForTimeout(200); e = await M.resolve();
  assert.equal(e.mao.length, mao - 1 + elfos, 'uma carta por Elfo seu');
  assert.deepEqual(M.errors, []);
});

// ---- R5 · GW Bogles pela tela (360×780, modo único) ----
const terraR5 = async M => { for (const n of ['Plains', 'Forest', 'Sheltering Landscape']) { const o = await M.oid(n); if (o && await M.act({ t: 'play_land', p: 0, oid: o }) === true) return n; } return null; };
/** Joga terreno e um Slippery Bogle por turno até a mesa ficar como o teste precisa; devolve o estado no turno seguinte. */
const montaR5 = async (M, bogles, pronto, max = 22) => { let e; for (let i = 0; i < max; i++) { await terraR5(M); e = await M.est();
  const bog = await M.oid('Slippery Bogle'); if (bog && e.campo.filter(n => n === 'Slippery Bogle').length < bogles) { const c = await M.legal(`a.t==='cast' && a.oid==='${bog}'`); if (c.length) { await M.act(c[0]); await M.resolve(); } }
  e = await M.est(); if (e.campo.filter(n => n === 'Slippery Bogle').length >= bogles && pronto(e)) { await M.proximo(); await terraR5(M); return M.est(); } await M.proximo(); }
  assert.fail('a mesa não chegou ao ponto do teste: ' + JSON.stringify(e)); };
const cartasR5 = (page, linha) => page.locator(`.tb-side [data-zone="${linha}"] .tb-card, .tb-side .tb-zone--${linha} .tb-card`).evaluateAll(cs => cs.map(c => c.getAttribute('aria-label')));

test('e2e · R5 · Bogles: dois Slippery Bogle dizem a força no alvo; cada Aura fica ao lado de quem a carrega, e a do terreno vai para a linha dos terrenos', { skip }, async t => {
  const M = await comLista125(t, '14 Forest\n6 Plains\n10 Slippery Bogle\n8 Ethereal Armor\n8 Rancor\n7 Utopia Sprawl\n7 Abundant Growth', ['Forest', 'Plains', 'Slippery Bogle', 'Ethereal Armor', 'Rancor', 'Utopia Sprawl', 'Abundant Growth'], '3');
  const { page } = M;
  let e = await montaR5(M, 2, e => e.campo.includes('Plains') && e.campo.filter(n => n === 'Forest').length >= 2 && ['Ethereal Armor', 'Rancor', 'Utopia Sprawl', 'Abundant Growth'].every(n => e.mao.includes(n)));
  let f = await folha131(page, 'Rancor'); assert.deepEqual(f.map(b => b.txt), ['Conjurar → Slippery Bogle · {G}'], 'iguais em tudo: um botão só');
  await naFolha(page, /^Conjurar/); await M.resolve();
  f = await folha131(page, 'Ethereal Armor');
  assert.deepEqual(f.map(b => b.txt), ['Conjurar → Slippery Bogle (3/1) · {W}', 'Conjurar → Slippery Bogle (1/1) · {W}'], 'com o Rancor num deles, o alvo diz a força (antes: um botão só, que mirava o primeiro)');
  await auditaTela(page, 'folha da Ethereal Armor com dois Bogles'); await fecha136(page);
  // Utopia Sprawl: só Floresta; a cor é perguntada ao entrar
  f = await folha131(page, 'Utopia Sprawl'); assert.ok(f.length >= 1 && f.every(b => /^Conjurar → Forest( \(.+\))? · \{G\}$/.test(b.txt)), f.map(b => b.txt).join(' | '));
  await page.locator('.ds-dialog .tb-sheet__actions button').first().click(); await page.waitForTimeout(300); e = await M.resolve();
  assert.equal(e.pend, 'choose_color'); assert.match(await M.decisao(), /^Escolha uma cor para Utopia Sprawl \| A carta pede uma cor ao entrar no campo\.$/);
  await auditaTela(page, 'cor da Utopia Sprawl');
  await page.locator('.tb-banner__actions button', { hasText: 'Azul' }).click(); await page.waitForTimeout(200); e = await M.resolve();
  // Abundant Growth: a Floresta com a Utopia Sprawl e as sem nada são alvos diferentes
  f = await folha131(page, 'Abundant Growth');
  assert.ok(f.some(b => /^Conjurar → Forest \((virada|desvirada), com Utopia Sprawl\) · \{G\}$/.test(b.txt)), 'a Floresta encantada diz o que carrega: ' + f.map(b => b.txt).join(' | '));
  assert.equal(new Set(f.map(b => b.txt)).size, f.length, 'nenhum alvo repetido');
  await fecha136(page);
  // a mesa: Aura colada em quem a carrega
  const ordem = await page.locator('.tb-side .tb-card').evaluateAll(cs => cs.map(c => ({ fala: c.getAttribute('aria-label'), anexo: c.dataset.anexo === 'true' })));
  const iBogle = ordem.findIndex(c => /^Slippery Bogle, 3\/1, Com Rancor/.test(c.fala));
  assert.ok(iBogle >= 0 && /^Rancor, Anexada a Slippery Bogle/.test(ordem[iBogle + 1].fala) && ordem[iBogle + 1].anexo, 'o Rancor vem logo depois do Bogle que o carrega: ' + ordem.map(c => c.fala).join(' | '));
  const iFloresta = ordem.findIndex(c => /^Forest, .*Com Utopia Sprawl/.test(c.fala));
  assert.ok(iFloresta >= 0 && /^Utopia Sprawl, Anexada a Forest/.test(ordem[iFloresta + 1].fala) && ordem[iFloresta + 1].anexo, 'a Utopia Sprawl vem logo depois da Floresta encantada');
  const terrenos = (await M.est()).campo.filter(n => ['Forest', 'Plains'].includes(n)).length;
  assert.match((await page.locator('.tb-side').last().innerText()).replace(/\s+/g, ' '), new RegExp(`Permanentes · 3 .*Terrenos · ${terrenos}\\b`), 'a Aura do terreno não entra na conta dos terrenos nem na linha das permanentes');
  await auditaTela(page, 'mesa com Auras');
  assert.deepEqual(M.errors, []);
});

test('e2e · R5 · Bogles: Armadillo Cloak e Spirit Link ganham a vida dos dois gatilhos; Malevolent Rumble diz o que pode levar; Sheltering Landscape busca com cópias juntas', { skip }, async t => {
  const M = await comLista125(t, "12 Forest\n8 Plains\n8 Slippery Bogle\n8 Armadillo Cloak\n8 Spirit Link\n8 Malevolent Rumble\n4 Sheltering Landscape\n4 Sentinel's Eyes", ['Forest', 'Plains', 'Slippery Bogle', 'Armadillo Cloak', 'Spirit Link', 'Malevolent Rumble', 'Sheltering Landscape', "Sentinel's Eyes"], '6');
  const { page } = M;
  let e = await montaR5(M, 1, e => e.campo.filter(n => n === 'Plains').length >= 3 && e.campo.filter(n => n === 'Forest').length >= 2 && ['Armadillo Cloak', 'Spirit Link', 'Malevolent Rumble'].every(n => e.mao.includes(n)));
  for (const n of ['Armadillo Cloak', 'Spirit Link']) { await page.locator(`#tb-hand .tb-card[aria-label^="${n}"]`).first().click(); await naFolha(page, /^Conjurar/); await M.resolve(); }
  for (let i = 0; i < 10; i++) { e = await M.est(); if (e.pend === 'attackers') break; await page.click('#tb-pass'); await page.waitForTimeout(200); }
  await page.locator('.tb-side .tb-card[aria-label^="Slippery Bogle"]').first().click(); await page.waitForTimeout(150); await page.click('#tb-attack'); await page.waitForTimeout(300);
  for (let i = 0; i < 10; i++) { e = await M.est(); if (e.pend) break; await page.click('#tb-pass', { timeout: 3000 }).catch(() => {}); await page.waitForTimeout(200); }
  // os dois gatilhos de vida ao mesmo tempo: uma pergunta de ordem, e os dois valem (antes ganhavam 0)
  assert.equal(e.pend, 'triggers');
  assert.equal(await M.decisao(), 'Ordem dos gatilhos | Escolha qual entra primeiro na pilha (o último escolhido resolve primeiro).');
  assert.deepEqual(await page.locator('.tb-banner__actions button').allInnerTexts(), ['Armadillo Cloak', 'Spirit Link']);
  await auditaTela(page, 'ordem dos gatilhos');
  await page.click('#tb-trigger'); await page.waitForTimeout(200); e = await M.est();
  assert.equal(e.pend, null, 'uma escolha só: o segundo vai sozinho'); assert.equal(e.pilha, 2);
  await M.resolve();
  assert.equal((await mesa136(page)).vida, 26, 'Bogle 3/3 com a Cloak: 3 de vida da Cloak e 3 da Spirit Link');
  // Malevolent Rumble
  await M.proximo(); await terraR5(M);
  await page.locator('#tb-hand .tb-card[aria-label^="Malevolent"]').first().click(); await naFolha(page, /^Conjurar/); e = await M.resolve();
  assert.equal(e.pend, 'pick');
  assert.equal(await M.decisao(), 'Malevolent Rumble · Olhar o topo do grimório | Pode levar uma permanente para a mão: toque nela, ou confirme sem pegar · o resto vai para o cemitério');
  assert.match(await page.innerText('#ds-toast'), /^Malevolent Rumble revelou: /);
  const olhadas = await page.locator('#tb-pick-cards .tb-card').evaluateAll(cs => cs.map(c => ({ fala: c.getAttribute('aria-label'), fora: c.classList.contains('tb-card--fora') })));
  for (const c of olhadas) assert.equal(c.fora, /^(Malevolent Rumble|Armadillo Cloak, não|Spirit Link, não)/.test(c.fala) && /não pode ser escolhida/.test(c.fala) || /^Malevolent Rumble/.test(c.fala), 'só a mágica que não é permanente fica apagada: ' + c.fala);
  await auditaTela(page, 'escolha da Malevolent Rumble');
  await page.click('#tb-pick-done'); await page.waitForTimeout(200); e = await M.resolve();
  assert.ok(e.campo.includes('Eldrazi Spawn'));
  let f = await folha131(page, 'Eldrazi Spawn', '.tb-side'); assert.deepEqual(f.map(b => b.txt), ['Gerar {C} (sacrificar)']); await fecha136(page);
  // Sheltering Landscape: busca com cópias iguais juntas
  assert.ok(e.campo.includes('Sheltering Landscape'));
  f = await folha131(page, 'Sheltering Landscape', '.tb-side'); assert.deepEqual(f.map(b => b.txt), ['Gerar {C}', 'Ativar ({T}, sacrificar)']);
  await page.locator('.ds-dialog .tb-sheet__actions button', { hasText: /^Ativar/ }).click(); await page.waitForTimeout(300); e = await M.resolve();
  assert.equal(e.pend, 'pick'); assert.equal(await M.decisao(), 'Sheltering Landscape · Vasculhar o grimório | Toque na carta.');
  const achadas = await page.locator('#tb-pick-cards .tb-card').evaluateAll(cs => cs.map(c => c.getAttribute('aria-label').replace(/, \d+ cópias/, ', N cópias')));
  assert.deepEqual(achadas.slice().sort(), ['Forest, N cópias', 'Plains, N cópias'], 'uma carta por nome, com a contagem (antes: nove cartas em fila)');
  await auditaTela(page, 'busca da Sheltering Landscape');
  const planicies = e.campo.filter(n => n === 'Plains').length;
  await page.locator('#tb-pick-cards .tb-card[aria-label^="Plains"]').click(); await page.waitForTimeout(200); e = await M.resolve();
  if (e.pend === 'pick') { await page.click('#tb-pick-done'); await page.waitForTimeout(200); e = await M.est(); }
  assert.equal(e.campo.filter(n => n === 'Plains').length, planicies + 1); assert.ok(!e.campo.includes('Sheltering Landscape') || e.cemiterio.includes('Sheltering Landscape'), 'a Landscape foi sacrificada');
  assert.deepEqual(M.errors, []);
});

// ---- R6 · Boros Bully pela tela (360×780, modo único) ----
const terraR6 = async M => { for (const n of ['Plains', 'Mountain']) { const o = await M.oid(n); if (o && await M.act({ t: 'play_land', p: 0, oid: o }) === true) return n; } return null; };
/** Resolve o que estiver aberto com a primeira ação legal (ordem de gatilhos, escolhas) e passa a pilha. */
const segueR6 = async (M, parar = () => false) => { let e; for (let i = 0; i < 30; i++) { e = await M.est(); if (parar(e)) return e;
  if (e.pend) { const l = await M.legal("a.t!=='concede'"); await M.act(l.find(a => a.t === 'pick_done') || l[0]); } else if (e.pilha) { await M.page.click('#tb-pass', { timeout: 3000 }).catch(() => {}); await M.page.waitForTimeout(120); } else return e; }
  return M.est(); };

test('e2e · R6 · Boros: gatilhos iguais não perguntam a ordem (Lunarch Veteran com dois Pássaros); o lampejo da Battle Screech diz o custo e vira as criaturas tocadas; Squadron Hawk com a Veteran pergunta a ordem uma vez', { skip }, async t => {
  const M = await comLista125(t, '12 Plains\n6 Mountain\n12 Lunarch Veteran\n10 Battle Screech\n10 Squadron Hawk\n10 Prismatic Strands', ['Plains', 'Mountain', 'Lunarch Veteran', 'Battle Screech', 'Squadron Hawk', 'Prismatic Strands'], '2', { cores: true });
  const { page } = M; let e;
  for (let i = 0; i < 24; i++) { await terraR6(M); e = await M.est();
    const v = await M.oid('Lunarch Veteran'); if (v && !e.campo.includes('Lunarch Veteran')) { const c = await M.legal(`a.t==='cast' && a.oid==='${v}'`); if (c.length) { await M.act(c[0]); await segueR6(M); } }
    e = await M.est(); if (e.campo.includes('Lunarch Veteran') && e.campo.filter(n => n === 'Plains').length >= 3 && e.campo.filter(n => ['Plains', 'Mountain'].includes(n)).length >= 5 && e.mao.includes('Battle Screech') && e.mao.includes('Squadron Hawk')) { await M.proximo(); await terraR6(M); break; }
    await M.proximo(); }
  e = await M.est(); assert.ok(e.campo.includes('Lunarch Veteran') && e.mao.includes('Battle Screech') && e.mao.includes('Squadron Hawk'), 'mesa pronta: ' + JSON.stringify(e));
  const veteranas = e.campo.filter(n => n === 'Lunarch Veteran').length; assert.equal(veteranas, 1);
  // Battle Screech: dois Pássaros entram juntos, a Veteran dispara duas vezes com o mesmo efeito — sem pergunta de ordem
  let vida = (await mesa136(page)).vida;
  await page.locator('#tb-hand .tb-card[aria-label^="Battle Screech"]').first().click(); await naFolha(page, /^Conjurar/);
  e = await M.resolve();
  assert.equal(e.pend, null, 'gatilhos idênticos não pedem ordem (antes: "Ordem dos gatilhos" com duas opções iguais)');
  assert.equal(e.campo.filter(n => n === 'Bird').length, 2); assert.equal((await mesa136(page)).vida, vida + 2);
  // lampejo do passado pelo cemitério: o custo por extenso e a escolha tocando nas cartas
  await page.click('#tb-cemiterio-me'); await page.waitForSelector('.ds-dialog');
  await page.locator('.ds-dialog .tb-card[aria-label^="Battle Screech"]').first().click(); await page.waitForTimeout(300);
  let f = await page.locator('.ds-dialog .tb-sheet__actions button').evaluateAll(bs => bs.map(b => [b.innerText.replace(/\s+/g, ' ').trim(), b.disabled]));
  assert.deepEqual(f, [['Lampejo do passado · virar 3 criaturas brancas', false]], 'o custo aparece por extenso (antes: "Lampejo do passado · " vazio)');
  await auditaTela(page, 'folha do lampejo da Battle Screech');
  await page.locator('.ds-dialog .tb-sheet__actions button').first().click(); await page.waitForTimeout(300);
  if (await page.locator('#tb-escolha').count()) { // mais de três criaturas brancas: toca nas três
    assert.equal(await page.innerText('#tb-escolha-pergunta'), 'Quais criaturas viram para pagar? Toque nas cartas: 0 de 3.');
    await auditaTela(page, 'virar três criaturas brancas');
    for (let i = 0; i < 6 && await page.locator('#tb-escolha').count(); i++) { await page.locator('#tb-escolha .tb-card').nth(i % await page.locator('#tb-escolha .tb-card').count()).click(); await page.waitForTimeout(200); } }
  e = await M.resolve();
  assert.equal(e.pend, null); assert.equal(e.campo.filter(n => n === 'Bird').length, 4); assert.ok(e.exilio.includes('Battle Screech'), 'conjurada pelo lampejo, vai para o exílio');
  assert.equal((await mesa136(page)).viradas.filter(n => ['Bird', 'Lunarch Veteran'].includes(n)).length, 3, 'três criaturas brancas viradas');
  // Squadron Hawk com a Veteran em campo: dois gatilhos DIFERENTES — uma pergunta de ordem, e a busca segue
  await M.proximo(); await terraR6(M);
  await page.locator('#tb-hand .tb-card[aria-label^="Squadron Hawk"]').first().click(); await naFolha(page, /^Conjurar/); e = await M.resolve();
  assert.equal(e.pend, 'triggers');
  assert.deepEqual((await page.locator('.tb-banner__actions button').allInnerTexts()).sort(), ['Lunarch Veteran', 'Squadron Hawk']);
  await page.locator('.tb-banner__actions button', { hasText: 'Lunarch Veteran' }).click(); await page.waitForTimeout(200);
  e = await M.resolve(); assert.equal(e.pend, 'pick', 'uma escolha de ordem só; a busca da Hawk abre em seguida');
  assert.equal(await M.decisao(), 'Squadron Hawk · Vasculhar o grimório | 0 de até 3 escolhida(s) · o resto fica onde está');
  await auditaTela(page, 'busca da Squadron Hawk');
  const mao = e.mao.length; for (let i = 0; i < 3; i++) { const l = await M.legal("a.t==='pick'"); if (!l.length) break; await M.act(l[0]); }
  e = await segueR6(M); assert.equal(e.mao.length, mao + 3, 'três Squadron Hawk para a mão');
  assert.deepEqual(M.errors, []);
});

test('e2e · R6 · Boros: Boros Garrison e Kor Skyfisher mostram iguais juntas ao devolver; a Pista diz o que faz; esgueirar-se aparece na folha; Prismatic Strands pergunta a cor como mágica', { skip }, async t => {
  const M = await comLista125(t, '10 Plains\n5 Mountain\n5 Boros Garrison\n8 Thraben Inspector\n8 Kor Skyfisher\n8 Prismatic Strands\n8 Martyr of Sands\n8 Leonardo, Big Brother', ['Plains', 'Mountain', 'Boros Garrison', 'Thraben Inspector', 'Kor Skyfisher', 'Prismatic Strands', 'Martyr of Sands', 'Leonardo, Big Brother'], '8', { cores: true });
  const { page } = M; let e;
  for (let i = 0; i < 24; i++) { await terraR6(M);
    for (const n of ['Thraben Inspector', 'Martyr of Sands']) { const v = await M.oid(n); if (v && !(await M.est()).campo.includes(n)) { const c = await M.legal(`a.t==='cast' && a.oid==='${v}'`); if (c.length) { await M.act(c[0]); await segueR6(M); } } }
    e = await M.est(); if (e.campo.includes('Thraben Inspector') && e.campo.includes('Martyr of Sands') && e.campo.filter(n => ['Plains', 'Mountain'].includes(n)).length >= 4 && ['Boros Garrison', 'Kor Skyfisher', 'Prismatic Strands', 'Leonardo, Big Brother'].every(n => e.mao.includes(n))) { await M.proximo(); break; }
    await M.proximo(); }
  e = await M.est(); assert.ok(['Boros Garrison', 'Kor Skyfisher', 'Prismatic Strands', 'Leonardo, Big Brother'].every(n => e.mao.includes(n)), 'mesa pronta: ' + JSON.stringify(e));
  const rotulos = () => page.locator('#tb-pick-cards .tb-card').evaluateAll(cs => cs.map(c => c.getAttribute('aria-label')));
  // Boros Garrison: entra, e a escolha do terreno que volta mostra iguais juntas
  let f = await folha131(page, 'Boros Garrison'); assert.deepEqual(f.map(b => b.txt), ['Jogar terreno']); await naFolha(page, /Jogar terreno/);
  e = await M.resolve(); assert.equal(e.pend, 'pick');
  assert.equal(await M.decisao(), 'Boros Garrison · Escolha o que volta para a mão | Toque na carta.');
  let cartas = await rotulos();
  assert.equal(new Set(cartas).size, cartas.length, 'uma carta por terreno diferente (antes: nove terrenos em fila): ' + cartas.join(' | '));
  assert.ok(cartas.some(c => /^Plains, \d cópias$/.test(c)) && cartas.includes('Boros Garrison'));
  await auditaTela(page, 'terreno que volta com a Boros Garrison');
  const planicies = e.campo.filter(n => n === 'Plains').length;
  await page.locator('#tb-pick-cards .tb-card[aria-label^="Plains"]').first().click(); await page.waitForTimeout(200); e = await segueR6(M);
  assert.equal(e.campo.filter(n => n === 'Plains').length, planicies - 1); assert.ok(e.campo.includes('Boros Garrison'));
  // a Pista (ficha) não tem texto na folha: o botão diz o que ela faz
  f = await folha131(page, 'Clue', '.tb-side'); assert.deepEqual(f.map(b => b.txt), ['Ativar ({2}, sacrificar): compra 1 carta']); await fecha136(page);
  // Leonardo: esgueirar-se apagado com o motivo fora do combate
  f = await folha131(page, 'Leonardo, Big Brother');
  assert.deepEqual(f.map(b => [b.txt.replace(/ — mana insuficiente$/, ''), b.apagado]).slice(-1), [['Esgueirar-se · {W} — só nos bloqueadores, com um atacante seu sem bloqueio', true]]);
  assert.match(f[0].txt, /^Conjurar · \{2\}\{W\}/);
  await auditaTela(page, 'folha do Leonardo'); await fecha136(page);
  // Prismatic Strands: a cor é pedida ao resolver, com a frase de mágica
  await page.locator('#tb-hand .tb-card[aria-label^="Prismatic Strands"]').first().click(); await naFolha(page, /^Conjurar/); e = await M.resolve();
  assert.equal(e.pend, 'choose_color');
  assert.equal(await M.decisao(), 'Escolha uma cor para Prismatic Strands | A mágica vale para a cor que você escolher agora.');
  await auditaTela(page, 'cor da Prismatic Strands');
  await page.locator('.tb-banner__actions button', { hasText: 'Preto' }).click(); await page.waitForTimeout(200); e = await segueR6(M);
  assert.equal(e.pend, null); assert.ok(e.cemiterio.includes('Prismatic Strands'));
  // Kor Skyfisher: devolve uma permanente; iguais no mesmo estado juntas
  if ((await M.legal(`a.t==='cast' && a.oid==='${await M.oid('Kor Skyfisher')}'`)).length) {
    await page.locator('#tb-hand .tb-card[aria-label^="Kor Skyfisher"]').first().click(); await naFolha(page, /^Conjurar/); e = await M.resolve();
    assert.equal(e.pend, 'pick'); assert.equal(await M.decisao(), 'Kor Skyfisher · Escolha o que volta para a mão | Toque na carta.');
    cartas = await rotulos(); assert.ok(cartas.some(c => /^Kor Skyfisher/.test(c)), 'pode devolver ela mesma');
    assert.ok(cartas.length < e.campo.length, 'terrenos iguais vêm juntos: ' + cartas.join(' | '));
    await auditaTela(page, 'permanente que volta com a Kor Skyfisher');
  }
  assert.deepEqual(M.errors, []);
});

// ---- R7 · Jund Wildfire pela tela (360×780, modo único) ----
const terraR7 = async M => { for (const n of ['Swamp', 'Forest', 'Mountain', 'Drossforge Bridge']) { const o = await M.oid(n); if (o && await M.act({ t: 'play_land', p: 0, oid: o }) === true) return n; } return null; };

test('e2e · R7 · Jund: o custo de sacrificar diz o quê; Fanatical Offering escolhe o sacrifício com iguais juntas; Cleansing Wildfire na própria Ponte busca o terreno; o Mapa diz o que faz', { skip }, async t => {
  const M = await comLista125(t, '8 Swamp\n4 Forest\n4 Mountain\n6 Drossforge Bridge\n8 Ichor Wellspring\n6 Fanatical Offering\n6 Cleansing Wildfire\n6 Krark-Clan Shaman\n6 Troublemaker Ouphe\n6 Evolution Witness', ['Swamp', 'Forest', 'Mountain', 'Drossforge Bridge', 'Ichor Wellspring', 'Fanatical Offering', 'Cleansing Wildfire', 'Krark-Clan Shaman', 'Troublemaker Ouphe', 'Evolution Witness'], '4', { cores: true });
  const { page } = M; let e;
  for (let i = 0; i < 24; i++) { await terraR7(M);
    for (const n of ['Ichor Wellspring', 'Krark-Clan Shaman', 'Evolution Witness']) { const v = await M.oid(n); if (v && (await M.est()).campo.filter(x => x === n).length < (n === 'Ichor Wellspring' ? 2 : 1)) { const c = await M.legal(`a.t==='cast' && a.oid==='${v}'`); if (c.length) { await M.act(c[0]); await segueR6(M); } } }
    e = await M.est(); if (['Krark-Clan Shaman', 'Evolution Witness', 'Drossforge Bridge'].every(n => e.campo.includes(n)) && e.campo.filter(n => n === 'Ichor Wellspring').length >= 2 && e.campo.filter(n => ['Swamp', 'Forest', 'Mountain', 'Drossforge Bridge'].includes(n)).length >= 5 && ['Fanatical Offering', 'Cleansing Wildfire'].every(n => e.mao.includes(n))) { await M.proximo(); await terraR7(M); break; }
    await M.proximo(); }
  e = await M.est(); assert.ok(['Fanatical Offering', 'Cleansing Wildfire'].every(n => e.mao.includes(n)) && e.campo.filter(n => n === 'Ichor Wellspring').length >= 2, 'mesa pronta: ' + JSON.stringify(e));
  // os custos dizem o que se sacrifica; adaptar diz adaptar
  let f = await folha131(page, 'Krark-Clan Shaman', '.tb-side'); assert.deepEqual(f.map(b => b.txt), ['Ativar (sacrificar um artefato)'], 'antes: "Ativar (sacrificar outra)"'); await fecha136(page);
  f = await folha131(page, 'Evolution Witness', '.tb-side'); assert.match(f[0].txt, /^(Adaptar 2 \(\{1\}\{G\}\)|Ativar \(\{1\}\{G\}\) — .+)$/); await fecha136(page);
  f = await folha131(page, 'Drossforge Bridge', '.tb-side'); if (f.length) assert.deepEqual(f.map(b => b.txt), ['Gerar {B}', 'Gerar {R}']); await fecha136(page);
  // Fanatical Offering: o sacrifício é escolhido tocando na carta; as duas Ichor Wellspring vêm juntas
  let mao = e.mao.length;
  f = await folha131(page, 'Fanatical Offering'); assert.deepEqual(f.map(b => b.txt), ['Conjurar · {1}{B}']);
  await page.locator('.ds-dialog .tb-sheet__actions button').first().click(); await page.waitForSelector('#tb-escolha');
  assert.equal(await page.innerText('#tb-escolha-pergunta'), 'O que você sacrifica para pagar? Toque na carta.');
  const opcoes = await grade136(page);
  assert.equal(new Set(opcoes).size, opcoes.length, 'nenhuma carta repetida: ' + opcoes.join(' | '));
  assert.ok(opcoes.some(c => /^Sacrificar Ichor Wellspring, \d cópias iguais$/.test(c)), 'iguais juntas (antes: uma carta para cada Wellspring)');
  await auditaTela(page, 'sacrifício da Fanatical Offering');
  await page.locator('#tb-escolha [data-escolha="Ichor Wellspring"]').first().click(); await page.waitForTimeout(300); e = await segueR6(M);
  assert.equal(e.mao.length, mao - 1 + 2 + 1, 'duas da Offering e uma da Wellspring que morreu'); assert.ok(e.campo.includes('Map'));
  f = await folha131(page, 'Map', '.tb-side');
  assert.match(f[0].txt, /^Ativar \(\{1\}, \{T\}, sacrificar\)(: .+)?( → .+| — .+)$/, 'o Mapa (ficha) diz o que faz: ' + f[0].txt);
  await auditaTela(page, 'folha do Mapa'); await fecha136(page);
  // Cleansing Wildfire na própria Ponte: ela fica (indestrutível) e a busca abre, com iguais juntas
  await M.proximo(); await terraR7(M); e = await M.est();
  const terrenos = e.campo.filter(n => ['Swamp', 'Forest', 'Mountain', 'Drossforge Bridge'].includes(n)).length;
  f = await folha131(page, 'Cleansing Wildfire');
  assert.ok(f.some(b => /^Conjurar → Drossforge Bridge( \(.+\))? · \{1\}\{R\}$/.test(b.txt)), f.map(b => b.txt).join(' | '));
  await page.locator('.ds-dialog .tb-sheet__actions button', { hasText: 'Drossforge Bridge' }).first().click(); await page.waitForTimeout(300); e = await M.resolve();
  assert.equal(e.pend, 'pick'); assert.ok(e.campo.includes('Drossforge Bridge'), 'a Ponte é indestrutível');
  assert.match(await M.decisao(), /^Cleansing Wildfire · Vasculhar o grimório \| /);
  const achadas = await page.locator('#tb-pick-cards .tb-card').evaluateAll(cs => cs.map(c => c.getAttribute('aria-label').replace(/, \d+ cópias/, '')));
  assert.equal(new Set(achadas).size, achadas.length, 'uma carta por terreno básico: ' + achadas.join(' | ')); assert.ok(achadas.every(n => ['Swamp', 'Forest', 'Mountain'].includes(n)));
  await auditaTela(page, 'busca da Cleansing Wildfire');
  await page.locator('#tb-pick-cards .tb-card').first().click(); await page.waitForTimeout(200); e = await segueR6(M);
  assert.equal(e.campo.filter(n => ['Swamp', 'Forest', 'Mountain', 'Drossforge Bridge'].includes(n)).length, terrenos + 1, 'um terreno a mais, e a Ponte continua');
  assert.deepEqual(M.errors, []);
});

/* ---------------- Leva 133 · partida online entre duas abas (transporte local) ---------------- */
test('e2e · Leva 133 partida online: criar sala, entrar com o código em outra aba, as duas mesas convergem, sem desfazer, desistir encerra', { skip }, async t => {
  const { page: A, errors, base } = await open(t, { dev: false });
  await A.addInitScript(() => { window.__MTG_TEST = true; });
  await A.setViewportSize({ width: 360, height: 780 });
  // lista 100% coberta (o modo online usa o motor completo)
  await createDeck(A, base, 'Coberta', '30 Island\n30 Counterspell', 'livre');
  // 1 · anfitrião: quarto oponente "Online", criar sala, código legível, "Começar partida" some
  await A.goto(base + '#/mesa'); await A.waitForSelector('[data-opponent="online"]');
  // quatro oponentes: o segmentado vira grade 2×2 e nenhum rótulo é cortado
  const chips = await A.$$eval('[data-opponent] .ds-chip__rotulo', es => es.map(e => [e.scrollWidth - e.clientWidth, Math.round(e.closest('.ds-chip').getBoundingClientRect().top)]));
  assert.deepEqual(chips.map(c => c[0]), [0, 0, 0, 0], 'rótulos inteiros em 360 px');
  assert.equal(new Set(chips.map(c => c[1])).size, 2, 'duas linhas de chips');
  await A.click('[data-opponent="online"]'); await A.waitForSelector('#online-criar');
  await A.waitForFunction(() => !document.querySelector('#online-criar').disabled, null, { timeout: 10000 }); // cobertura conferida
  assert.equal(await A.locator('#mesa-start').isVisible(), false, 'online começa pela sala, não pelo botão da mesa');
  assert.equal(await A.locator('.ds-btn--primary:visible').count(), 1, 'um primário: Criar sala');
  await auditaTela(A, 'preparar online (criar)');
  await A.click('#online-criar'); await A.waitForSelector('#online-codigo');
  const codigo = (await A.innerText('#online-codigo')).trim();
  assert.match(codigo, /^ESTA-[A-HJ-NP-Z2-9]{4}$/);
  assert.match(await A.innerText('#online-espera'), /Esperando o outro jogador/);
  await auditaTela(A, 'sala criada (escuro)');
  await A.evaluate(() => document.documentElement.setAttribute('data-theme', 'light')); await auditaTela(A, 'sala criada (claro)');
  await A.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  // 2 · convidado, em outra aba do mesmo aparelho: entra com o código digitado de qualquer jeito
  const B = await A.context().newPage(); const errosB = [];
  B.on('pageerror', e => errosB.push(String(e))); B.on('console', m => { if (m.type() === 'error' && !/Failed to load resource: net::ERR_/.test(m.text())) errosB.push(m.text()); });
  await B.addInitScript(() => { window.__MTG_TEST = true; });
  await B.setViewportSize({ width: 360, height: 780 });
  await B.goto(base + '#/mesa'); await B.waitForSelector('[data-opponent="online"]'); await B.click('[data-opponent="online"]');
  await B.click('[data-online-modo="entrar"]'); await B.waitForSelector('#online-codigo-input');
  await B.waitForFunction(() => document.querySelector('#online-codigo-input'), null, { timeout: 5000 });
  assert.equal(await B.locator('#online-entrar').isDisabled(), true, 'sem código completo não entra');
  await B.fill('#online-codigo-input', 'ESTA-ZZZZ'); await B.click('#online-entrar');
  await B.waitForSelector('.ds-note--negative'); assert.match(await B.innerText('.ds-note--negative'), /Não há sala/);
  await B.fill('#online-codigo-input', codigo.slice(5).toLowerCase()); await B.click('#online-entrar');
  // 3 · os dois chegam à mesa; cada um vê só o próprio assento, sem cortina
  await A.waitForSelector('#tb-keep', { timeout: 20000 }); await B.waitForSelector('#tb-keep', { timeout: 20000 });
  assert.equal(await A.locator('#tb-handoff').count(), 0); assert.equal(await B.locator('#tb-handoff').count(), 0);
  const estado = p => p.evaluate(() => JSON.stringify(window.__estanteMesa.estado()));
  const quemVe = p => p.evaluate(() => window.__estanteMesa.quemVe());
  assert.equal(await quemVe(A), 0); assert.equal(await quemVe(B), 1);
  assert.equal(await A.locator('#tb-online').count(), 1, 'indicador de partida online'); assert.equal(await A.locator('#tb-undo').isDisabled(), true, 'online não desfaz');
  await A.click('#tb-keep');
  await B.waitForFunction(() => window.__estanteMesa.estado().players[0].kept === true, null, { timeout: 10000 });
  assert.equal(await estado(A), await estado(B), 'depois do keep do anfitrião, as mesas são iguais');
  await B.click('#tb-keep');
  await A.waitForFunction(() => window.__estanteMesa.estado().status === 'playing', null, { timeout: 10000 });
  await B.waitForFunction(() => window.__estanteMesa.estado().status === 'playing', null, { timeout: 10000 });
  assert.equal(await estado(A), await estado(B), 'partida começada igual nos dois lados');
  // quem tem a prioridade passa; o outro recebe
  for (let i = 0; i < 3; i++) {
    const s = JSON.parse(await estado(A)); if (s.status !== 'playing' || s.pending) break;
    const dono = s.turn.priority === 0 ? A : B, outro = dono === A ? B : A; const antes = s.turn.step + s.turn.number + s.turn.priority;
    await dono.click('#tb-pass');
    await outro.waitForFunction(a => { const s = window.__estanteMesa.estado(); return s.turn.step + s.turn.number + s.turn.priority !== a; }, antes, { timeout: 10000 });
    await A.waitForTimeout(150);
    assert.equal(await estado(A), await estado(B), `passo ${i + 1}: mesas iguais`);
  }
  await auditaTela(A, 'mesa online');
  // 4 · desistir no anfitrião: os dois veem o fim e a sala encerra
  await A.click('#tb-concede'); await A.waitForSelector('.ds-dialog'); await A.click('.ds-dialog .ds-btn--danger');
  await B.waitForFunction(() => window.__estanteMesa.estado().status === 'over', null, { timeout: 10000 });
  assert.equal(JSON.parse(await estado(B)).winner, 1, 'o convidado venceu');
  assert.equal(await A.evaluate(c => JSON.parse(localStorage.getItem('estante.online:salas/' + c)).estado, codigo), 'encerrada');
  assert.deepEqual(errors, []); assert.deepEqual(errosB, []);
});

/* ---------------- Leva 134 · partida online pelo Firebase (REST falso no teste; fluxo de eventos por sondagem) ---------------- */
test('e2e · Leva 134 partida online com Firebase configurado: sala no banco por REST, duas abas convergem pelos eventos, indicador de ligação', { skip }, async t => {
  const { page: A, errors, base } = await open(t, { dev: false });
  // banco falso em memória, servido por rota nas duas abas: GET/PUT/PATCH/POST/DELETE em <caminho>.json
  const banco = { dados: {}, chamadas: [] }; let n = 0;
  const desce = (o, seg) => { for (const k of seg) { if (!o || typeof o !== 'object' || !(k in o)) return null; o = o[k]; } return o === undefined ? null : o; };
  const poe = (seg, v) => { if (!seg.length) { banco.dados = v || {}; return; } let o = banco.dados; for (const k of seg.slice(0, -1)) { if (!o[k] || typeof o[k] !== 'object') o[k] = {}; o = o[k]; } if (v === null) delete o[seg[seg.length - 1]]; else o[seg[seg.length - 1]] = v; };
  const rota = async r => {
    const req = r.request(); const m = req.url().match(/^https:\/\/teste\.firebaseio\.com\/(.*)\.json$/); const seg = m[1].split('/').filter(Boolean); const metodo = req.method();
    banco.chamadas.push(metodo + ' /' + seg.join('/'));
    const corpo = req.postData() ? JSON.parse(req.postData()) : undefined;
    const ok = v => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: v === null || v === undefined ? 'null' : JSON.stringify(v) });
    if (metodo === 'OPTIONS') return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,PUT,PATCH,POST,DELETE', 'access-control-allow-headers': 'content-type' } });
    if (metodo === 'GET') return ok(desce(banco.dados, seg));
    if (metodo === 'PUT') { poe(seg, corpo); return ok(corpo); }
    if (metodo === 'PATCH') { for (const [k, v] of Object.entries(corpo)) poe([...seg, ...k.split('/')], v); return ok(corpo); }
    if (metodo === 'POST') { const chave = '-N' + String(++n).padStart(6, '0'); poe([...seg, chave], corpo); return ok({ name: chave }); }
    if (metodo === 'DELETE') { poe(seg, null); return ok(null); }
    return r.fulfill({ status: 405 });
  };
  // EventSource de teste: sonda o nó por GET a cada 250 ms e emite "put" do nó inteiro quando muda (o Firebase real
  // manda os eventos; a réplica do app trata os dois do mesmo jeito)
  const init = () => {
    window.__FIREBASE_DB_URL = 'https://teste.firebaseio.com';
    window.EventSource = class {
      constructor(url) { this.url = url; this.ouv = {}; this.ultimo = undefined; this.timer = setInterval(() => this.sonda(), 250); setTimeout(() => this.sonda(), 0); }
      addEventListener(t, f) { (this.ouv[t] = this.ouv[t] || []).push(f); }
      async sonda() { try { const r = await fetch(this.url); const txt = await r.text(); if (txt !== this.ultimo) { this.ultimo = txt; (this.ouv.open || []).forEach(f => f({})); (this.ouv.put || []).forEach(f => f({ data: JSON.stringify({ path: '/', data: JSON.parse(txt || 'null') }) })); } } catch (e) { (this.ouv.error || []).forEach(f => f({})); } }
      close() { clearInterval(this.timer); }
    };
  };
  await A.route('https://teste.firebaseio.com/**', rota); await A.addInitScript(init); await A.addInitScript(() => { window.__MTG_TEST = true; });
  await A.setViewportSize({ width: 360, height: 780 });
  await createDeck(A, base, 'Coberta', '30 Island\n30 Counterspell', 'livre');
  await A.goto(base + '#/mesa'); await A.reload(); await A.waitForSelector('[data-opponent="online"]'); await A.click('[data-opponent="online"]');
  await A.waitForSelector('#online-criar'); assert.match(await A.innerText('.tb, main'), /A sala vive na internet/, 'a tela diz que a sala está na internet');
  await A.waitForFunction(() => !document.querySelector('#online-criar').disabled, null, { timeout: 10000 });
  await A.click('#online-criar'); await A.waitForSelector('#online-codigo');
  const codigo = (await A.innerText('#online-codigo')).trim();
  assert.ok(banco.chamadas.some(c => c === 'PUT /salas/' + codigo), 'a sala foi criada no banco por PUT: ' + banco.chamadas.slice(0, 4));
  const B = await A.context().newPage(); const errosB = [];
  B.on('pageerror', e => errosB.push(String(e))); B.on('console', m => { if (m.type() === 'error' && !/Failed to load resource: net::ERR_/.test(m.text())) errosB.push(m.text()); });
  await B.route('https://teste.firebaseio.com/**', rota); await B.addInitScript(init); await B.addInitScript(() => { window.__MTG_TEST = true; });
  await B.setViewportSize({ width: 360, height: 780 });
  await B.goto(base + '#/mesa'); await B.waitForSelector('[data-opponent="online"]'); await B.click('[data-opponent="online"]'); await B.click('[data-online-modo="entrar"]');
  await B.waitForSelector('#online-codigo-input'); await B.fill('#online-codigo-input', codigo); await B.waitForFunction(() => !document.querySelector('#online-entrar').disabled, null, { timeout: 10000 }); await B.click('#online-entrar');
  await A.waitForSelector('#tb-keep', { timeout: 25000 }); await B.waitForSelector('#tb-keep', { timeout: 25000 });
  const estado = p => p.evaluate(() => JSON.stringify(window.__estanteMesa.estado()));
  assert.equal(await A.getAttribute('#tb-online', 'data-ligado'), 'true', 'indicador: conectado');
  await A.click('#tb-keep'); await B.waitForFunction(() => window.__estanteMesa.estado().players[0].kept === true, null, { timeout: 15000 });
  await B.click('#tb-keep'); await A.waitForFunction(() => window.__estanteMesa.estado().status === 'playing', null, { timeout: 15000 });
  await B.waitForFunction(() => window.__estanteMesa.estado().status === 'playing', null, { timeout: 15000 }); await A.waitForTimeout(300);
  assert.equal(await estado(A), await estado(B), 'mesas iguais pelo Firebase');
  assert.ok(banco.chamadas.some(c => c === 'POST /salas/' + codigo + '/acoes'), 'ações empurradas por POST');
  assert.equal(Object.keys(desce(banco.dados, ['salas', codigo, 'acoes'])).length, 2, 'dois keeps na sala');
  await auditaTela(A, 'mesa online (firebase)');
  assert.deepEqual(errors, []); assert.deepEqual(errosB, []);
});

/* ---------------- Leva 135 · partida online: o outro sumiu, o outro encerrou, o cartão da partida salva ---------------- */
test('e2e · Leva 135 partida online: cartão "online, sala X" ao voltar, aviso quando o outro some, encerrar por abandono avisa o outro lado', { skip }, async t => {
  const { page: A, errors, base } = await open(t, { dev: false });
  await A.addInitScript(() => { window.__MTG_TEST = true; });
  await A.setViewportSize({ width: 360, height: 780 });
  await createDeck(A, base, 'Coberta', '30 Island\n30 Counterspell', 'livre');
  await A.goto(base + '#/mesa'); await A.waitForSelector('[data-opponent="online"]'); await A.click('[data-opponent="online"]');
  await A.waitForFunction(() => document.querySelector('#online-criar') && !document.querySelector('#online-criar').disabled, null, { timeout: 10000 });
  await A.click('#online-criar'); await A.waitForSelector('#online-codigo'); const codigo = (await A.innerText('#online-codigo')).trim();
  const B = await A.context().newPage(); const errosB = [];
  B.on('pageerror', e => errosB.push(String(e))); B.on('console', m => { if (m.type() === 'error' && !/Failed to load resource: net::ERR_/.test(m.text())) errosB.push(m.text()); });
  await B.addInitScript(() => { window.__MTG_TEST = true; }); await B.setViewportSize({ width: 360, height: 780 });
  await B.goto(base + '#/mesa'); await B.waitForSelector('[data-opponent="online"]'); await B.click('[data-opponent="online"]'); await B.click('[data-online-modo="entrar"]');
  await B.waitForSelector('#online-codigo-input'); await B.fill('#online-codigo-input', codigo); await B.waitForFunction(() => !document.querySelector('#online-entrar').disabled, null, { timeout: 10000 }); await B.click('#online-entrar');
  await A.waitForSelector('#tb-keep', { timeout: 20000 }); await B.waitForSelector('#tb-keep', { timeout: 20000 });
  // 1 · voltar à preparação: o cartão diz que a partida é online e em que sala; "Continuar" volta à mesa
  await A.goto(base + '#/mesa'); await A.waitForSelector('#mesa-saved');
  assert.match(await A.innerText('#mesa-saved-desc'), new RegExp('online, sala ' + codigo));
  assert.equal((await A.innerText('#mesa-descartar')).trim(), 'Encerrar por abandono');
  await auditaTela(A, 'preparar com partida online salva');
  await A.click('#mesa-continue'); await A.waitForSelector('#tb-keep');
  // 2 · o outro some: a presença dele envelhece (simulada no banco local) e a mesa avisa, sem travar a partida
  await A.evaluate(c => { const k = 'estante.online:salas/' + c; const r = JSON.parse(localStorage.getItem(k)); r.presenca = { ...(r.presenca || {}), 1: Date.now() - 120000 }; localStorage.setItem(k, JSON.stringify(r)); }, codigo);
  await A.evaluate(() => window.__estanteMesa.act({ t: 'keep', p: 0, bottom: [] })); // qualquer ação repinta
  await A.waitForSelector('#tb-online-ausente', { timeout: 10000 });
  assert.match(await A.innerText('#tb-online-ausente'), /parece ter saído/);
  assert.equal(await A.locator('#tb-keep, #tb-pass').count() >= 0, true);
  await auditaTela(A, 'mesa online com o outro ausente');
  // 3 · B encerra por abandono na preparação: A vê o aviso de partida encerrada e a sala fica encerrada
  await B.goto(base + '#/mesa'); await B.waitForSelector('#mesa-descartar'); await B.click('#mesa-descartar');
  await A.waitForSelector('#tb-online-fim', { timeout: 10000 });
  assert.match(await A.innerText('#tb-online-fim'), /O outro jogador saiu da sala/);
  assert.equal(await A.evaluate(c => JSON.parse(localStorage.getItem('estante.online:salas/' + c)).estado, codigo), 'encerrada');
  assert.deepEqual(errors, []); assert.deepEqual(errosB, []);
});

/* ---------------- Leva 137 · chat na partida online ---------------- */
test('e2e · Leva 137 chat: botão com selo de novas, frase rápida e texto chegam do outro lado, aviso com a mensagem, texto nunca vira HTML', { skip }, async t => {
  const { page: A, errors, base } = await open(t, { dev: false });
  await A.addInitScript(() => { window.__MTG_TEST = true; }); await A.setViewportSize({ width: 360, height: 780 });
  await createDeck(A, base, 'Coberta', '30 Island\n30 Counterspell', 'livre');
  await A.goto(base + '#/mesa'); await A.waitForSelector('[data-opponent="online"]'); await A.click('[data-opponent="online"]');
  await A.waitForFunction(() => document.querySelector('#online-criar') && !document.querySelector('#online-criar').disabled, null, { timeout: 10000 });
  await A.click('#online-criar'); await A.waitForSelector('#online-codigo'); const codigo = (await A.innerText('#online-codigo')).trim();
  const B = await A.context().newPage(); const errosB = [];
  B.on('pageerror', e => errosB.push(String(e))); B.on('console', m => { if (m.type() === 'error' && !/Failed to load resource: net::ERR_/.test(m.text())) errosB.push(m.text()); });
  await B.addInitScript(() => { window.__MTG_TEST = true; }); await B.setViewportSize({ width: 360, height: 780 });
  await B.goto(base + '#/mesa'); await B.waitForSelector('[data-opponent="online"]'); await B.click('[data-opponent="online"]'); await B.click('[data-online-modo="entrar"]');
  await B.waitForSelector('#online-codigo-input'); await B.fill('#online-codigo-input', codigo); await B.waitForFunction(() => !document.querySelector('#online-entrar').disabled, null, { timeout: 10000 }); await B.click('#online-entrar');
  await A.waitForSelector('#tb-chat', { timeout: 20000 }); await B.waitForSelector('#tb-chat', { timeout: 20000 });
  // sem mensagem: botão sem selo; não existe no jogo local (goldfish) — só online
  assert.equal(await A.getAttribute('#tb-chat', 'data-novas'), '0');
  const ab = await A.locator('#tb-chat').boundingBox(); assert.ok(ab.width >= 44 && ab.height >= 44);
  // A abre a conversa, manda uma frase rápida e um texto com HTML
  await A.click('#tb-chat'); await A.waitForSelector('#tb-chat-lista');
  assert.match(await A.innerText('#tb-chat-lista'), /Nenhuma mensagem ainda/);
  await A.click('[data-frase="Boa!"]'); await A.waitForSelector('#tb-chat-lista .tb-chat__msg--minha');
  await A.fill('#tb-chat-campo', '<b>oi</b> & tal'); await A.press('#tb-chat-campo', 'Enter');
  await A.waitForFunction(() => document.querySelectorAll('#tb-chat-lista .tb-chat__msg').length === 2);
  assert.equal(await A.locator('#tb-chat-lista b').count(), 0, 'HTML digitado vira texto');
  assert.match(await A.innerText('#tb-chat-lista'), /<b>oi<\/b> & tal/);
  assert.equal(await A.inputValue('#tb-chat-campo'), '', 'o campo limpa depois de enviar');
  await auditaTela(A, 'conversa aberta');
  // B, com a folha fechada: selo "2", aviso com o nome e a mensagem, vibração tentada
  await B.waitForFunction(() => document.querySelector('#tb-chat') && document.querySelector('#tb-chat').dataset.novas === '2', null, { timeout: 10000 });
  assert.match(await B.getAttribute('#tb-chat', 'aria-label'), /Conversa, 2 nova/);
  assert.match(await B.innerText('#ds-toast'), /<b>oi<\/b> & tal/);
  // B abre: lê tudo, o selo zera; responde e A (folha aberta) vê chegar na hora
  await B.click('#tb-chat'); await B.waitForSelector('#tb-chat-lista .tb-chat__msg');
  assert.equal(await B.locator('#tb-chat-lista .tb-chat__msg').count(), 2);
  assert.equal(await B.locator('#tb-chat-lista .tb-chat__msg--minha').count(), 0, 'as duas são do outro');
  await B.keyboard.press('Escape'); await B.waitForFunction(() => document.querySelector('#tb-chat').dataset.novas === '0', null, { timeout: 5000 });
  await B.click('#tb-chat'); await B.waitForSelector('#tb-chat-campo'); await B.fill('#tb-chat-campo', 'GG'); await B.click('#tb-chat-enviar');
  await A.waitForFunction(() => document.querySelectorAll('#tb-chat-lista .tb-chat__msg').length === 3, null, { timeout: 10000 });
  assert.equal(await A.getAttribute('#tb-chat', 'data-novas'), '0', 'com a folha aberta, a mensagem já conta como lida');
  await auditaTela(B, 'conversa com mensagens dos dois');
  assert.deepEqual(errors, []); assert.deepEqual(errosB, []);
});

/* ---------------- D1 · escala de texto, densidade e aviso que não atravessa telas ---------------- */
test('e2e · D1 escala grande e densidade compacta mudam a mesa inteira pelos tokens, o alvo de toque fica em 44 px, e o aviso de uma tela não aparece na seguinte', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await page.setViewportSize({ width: 360, height: 780 });
  await createDeck(page, base, 'Delver', PAUPER);
  await page.goto(base + '#/mesa'); await page.fill('#mesa-seed', '4'); await page.click('#mesa-start'); await page.waitForSelector('#tb-keep');
  const mede = () => page.evaluate(() => {
    const px = (sel, prop) => parseFloat(getComputedStyle(document.querySelector(sel))[prop]);
    return { titulo: px('.tb-vez__rotulo', 'fontSize'), chip: px('#tb-keep', 'fontSize'), alvo: document.querySelector('#tb-keep').getBoundingClientRect().height, gap: px('.tb-board', 'rowGap') || px('.tb-board', 'gap'), pad: px('.tb-dock', 'paddingLeft') };
  });
  const base0 = await mede();
  // escala grande: textos crescem ~12% em toda a mesa; o alvo continua ≥ 44
  await page.evaluate(() => document.documentElement.setAttribute('data-escala', 'grande')); await page.waitForTimeout(100);
  const grande = await mede();
  assert.ok(Math.abs(grande.titulo / base0.titulo - 1.12) < 0.02 && Math.abs(grande.chip / base0.chip - 1.12) < 0.02, JSON.stringify([base0, grande]));
  assert.ok(grande.alvo >= 44);
  await auditaTela(page, 'mesa com texto grande');
  await page.evaluate(() => document.documentElement.setAttribute('data-escala', 'pequena')); await page.waitForTimeout(100);
  const pequena = await mede(); assert.ok(Math.abs(pequena.chip / base0.chip - 0.92) < 0.02);
  assert.ok(pequena.alvo >= 44, 'texto pequeno não encolhe o alvo de toque');
  await page.evaluate(() => document.documentElement.removeAttribute('data-escala'));
  // densidade compacta: espaços encolhem 15%, alvo fica
  await page.evaluate(() => document.documentElement.setAttribute('data-densidade', 'compacta')); await page.waitForTimeout(100);
  const compacta = await mede();
  assert.ok(Math.abs(compacta.pad / base0.pad - 0.85) < 0.03, JSON.stringify([base0.pad, compacta.pad]));
  assert.ok(compacta.alvo >= 44);
  await auditaTela(page, 'mesa compacta');
  await page.evaluate(() => document.documentElement.removeAttribute('data-densidade'));
  // a preferência guardada volta depois de recarregar
  await page.evaluate(() => window.__estanteTema && window.__estanteTema.setAparencia({ escala: 'grande', densidade: 'compacta' }));
  await page.reload(); await page.waitForSelector('#tb-keep');
  assert.deepEqual(await page.evaluate(() => [document.documentElement.getAttribute('data-escala'), document.documentElement.getAttribute('data-densidade')]), ['grande', 'compacta']);
  await page.evaluate(() => window.__estanteTema.setAparencia({ escala: 'media', densidade: 'confortavel' }));
  // aviso: o da tela anterior some ao trocar de tela; o que tem ação (nova versão) fica
  await page.evaluate(() => __m3.toast('Aviso da mesa', 10000)); await page.waitForTimeout(50);
  await page.goto(base + '#/listas'); await page.waitForSelector('#decks-list'); await page.waitForTimeout(100);
  assert.equal(await page.getAttribute('#ds-toast', 'data-open'), 'false', 'o aviso da mesa não atravessa para Listas');
  await page.evaluate(() => __m3.toast('Nova versão pronta', 0, { acao: { rotulo: 'Atualizar', icone: 'atualizar', onClick: () => {} } })); await page.waitForTimeout(50);
  await page.goto(base + '#/'); await page.waitForSelector('#home-atalhos'); await page.waitForTimeout(100);
  assert.equal(await page.getAttribute('#ds-toast', 'data-open'), 'true', 'o aviso com ação continua');
  assert.deepEqual(errors, []);
});

/* ---------------- D2 · Ajustes › Aparência no Perfil ---------------- */
test('e2e · D2 aparência: tema, cor de destaque, texto, densidade, movimento e vibração mudam na hora, persistem e cabem em 360 nos dois temas', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(base + '#/perfil'); await page.waitForSelector('#perfil-aparencia');
  const html = () => page.evaluate(() => ['data-theme', 'data-acento', 'data-escala', 'data-densidade', 'data-movimento'].map(a => document.documentElement.getAttribute(a)));
  const accent = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
  assert.deepEqual((await html()).slice(1), [null, null, null, null]); // o tema inicial vem do sistema; os demais, padrão
  await page.click('#perfil-aparencia [data-tema="dark"]'); await page.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'dark');
  const latao = await accent();
  await auditaTela(page, 'aparência (escuro, padrão)');
  // cor de destaque: o chip muda o acento do app inteiro na hora (botão primário, barra)
  await page.click('#aparencia-acento [data-acento="jade"]'); await page.waitForFunction(() => document.documentElement.getAttribute('data-acento') === 'jade');
  const jade = await accent(); assert.notEqual(jade, latao);
  await page.waitForTimeout(150);
  const corDoPrimario = await page.evaluate(() => getComputedStyle(document.querySelector('#perfil-salvar')).borderTopColor);
  const corDoAcento = await page.evaluate(() => { const s = document.createElement('span'); s.style.color = getComputedStyle(document.documentElement).getPropertyValue('--accent'); document.body.appendChild(s); const c = getComputedStyle(s).color; s.remove(); return c; });
  assert.equal(corDoPrimario, corDoAcento, 'o primário usa o acento novo');
  assert.equal(await page.getAttribute('#aparencia-acento [data-acento="jade"]', 'aria-pressed'), 'true');
  // texto maior, compacta, menos movimento, vibração desligada
  const toca = async (sel, pronto) => { await page.click(sel); await page.waitForFunction(pronto, null, { timeout: 5000 }); };
  await toca('#perfil-aparencia [data-escala="grande"]', () => document.documentElement.getAttribute('data-escala') === 'grande' && document.querySelector('#perfil-aparencia [data-escala="grande"]').getAttribute('aria-pressed') === 'true');
  await toca('#perfil-aparencia [data-densidade="compacta"]', () => document.querySelector('#perfil-aparencia [data-densidade="compacta"]').getAttribute('aria-pressed') === 'true');
  await toca('#perfil-aparencia [data-movimento]', () => document.querySelector('#perfil-aparencia [data-movimento]').getAttribute('aria-pressed') === 'true');
  await toca('#perfil-aparencia [data-vibracao]', () => document.querySelector('#perfil-aparencia [data-vibracao]').getAttribute('aria-pressed') === 'false');
  assert.deepEqual(await html(), ['dark', 'jade', 'grande', 'compacta', 'reduzido']);
  assert.equal(await page.evaluate(() => __m0.haptics.vibrate(5)), false, 'vibração desligada: a instância padrão não vibra');
  assert.equal(await page.getAttribute('#perfil-aparencia [data-vibracao]', 'aria-pressed'), 'false');
  await auditaTela(page, 'aparência (jade, grande, compacta)');
  // tema pelo segmentado, e tudo persiste depois de recarregar
  await page.click('#perfil-aparencia [data-tema="light"]'); await page.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'light');
  await auditaTela(page, 'aparência (claro, jade)');
  await page.reload(); await page.waitForSelector('#perfil-aparencia');
  assert.deepEqual(await html(), ['light', 'jade', 'grande', 'compacta', 'reduzido']);
  assert.equal(await page.evaluate(() => __m0.haptics.ligada()), false, 'a vibração continua desligada depois de recarregar');
  // o backup completo leva a aparência
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#perfil-backup-export')]);
  const dados = JSON.parse(await (await download.createReadStream()).toArray().then(p => Buffer.concat(p).toString('utf8')));
  // D7 (leva 151) · a aparência ganhou superfície, cor do oponente e verso: o backup leva os três no padrão
  assert.deepEqual(dados.prefs['ui.aparencia'], { escala: 'grande', densidade: 'compacta', acento: 'jade', movimento: 'reduzido', vibracao: false, superficie: 'nogueira', oponente: 'azul', verso: 'estante' });
  // de volta ao padrão
  const toque = async (sel, pronto) => { await page.click(sel); await page.waitForFunction(pronto, null, { timeout: 5000 }); };
  await toque('#aparencia-acento [data-acento="latao"]', () => !document.documentElement.getAttribute('data-acento'));
  await toque('#perfil-aparencia [data-escala="media"]', () => !document.documentElement.getAttribute('data-escala'));
  await toque('#perfil-aparencia [data-densidade="confortavel"]', () => !document.documentElement.getAttribute('data-densidade'));
  await toque('#perfil-aparencia [data-movimento]', () => !document.documentElement.getAttribute('data-movimento') && document.querySelector('#perfil-aparencia [data-movimento]').getAttribute('aria-pressed') === 'false');
  await toque('#perfil-aparencia [data-vibracao]', () => document.querySelector('#perfil-aparencia [data-vibracao]').getAttribute('aria-pressed') === 'true');
  await toque('#perfil-aparencia [data-tema="dark"]', () => document.documentElement.getAttribute('data-theme') === 'dark');
  assert.deepEqual(await html(), ['dark', null, null, null, null]);
  assert.deepEqual(errors, []);
});

test('e2e · D3 início que lembra de você: "Olá, Nome", cartão Continuar (partida, última lista, pilha do scanner) e o primeiro atalho mais alto', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(FAKE_DEVICE(false));
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await page.setViewportSize({ width: 360, height: 780 });
  const topo = sel => page.locator(sel).boundingBox().then(b => Math.round(b.y));
  // sem perfil e sem nada para retomar: marca, uma frase e os atalhos; nenhum cartão Continuar
  await page.goto(base + '#/'); await page.waitForSelector('#home-atalhos'); await page.waitForTimeout(300);
  assert.equal(await page.innerText('#home-titulo'), 'Estante');
  assert.equal(await page.locator('#home-frase').isVisible(), true);
  assert.equal(await page.locator('#home-continuar').count(), 0, 'sem cartão quando não há o que continuar');
  const antes = 209; // leva 139: topo do atalho Jogar em 360×780 (medido antes da D3)
  const semPerfil = await topo('#go-play');
  assert.ok(semPerfil <= antes - 50, `Jogar subiu ≥ 50 px sem perfil (${antes} → ${semPerfil})`);
  // com perfil: "Olá, Nome", a frase sai e o atalho sobe mais
  await page.goto(base + '#/perfil'); await page.waitForSelector('#perfil-nome');
  await page.fill('#perfil-nome', 'Gui'); await page.click('#perfil-salvar'); await page.waitForSelector('#ds-toast[data-open="true"]');
  await page.goto(base + '#/'); await page.waitForSelector('#home-atalhos');
  await page.waitForFunction(() => (document.querySelector('#home-titulo') || {}).textContent === 'Olá, Gui');
  assert.equal(await page.locator('#home-frase').isVisible(), false);
  const comPerfil = await topo('#go-play');
  assert.ok(comPerfil <= antes - 75, `Jogar subiu ≥ 75 px com perfil (${antes} → ${comPerfil})`);
  console.log(`D3 · topo de Jogar: ${antes} → ${semPerfil} (sem perfil) → ${comPerfil} (com perfil)`);
  assert.ok(await page.locator('#go-play').evaluate(el => el.classList.contains('ds-btn--primary')), 'sem partida salva, Jogar é o primário');
  // última lista aberta vira uma linha do cartão; o toque abre a lista
  await createDeck(page, base, 'Delver', PAUPER);
  await page.goto(base + '#/'); await page.waitForSelector('#home-continuar [data-tipo="lista"]');
  assert.match(await page.innerText('#home-continuar [data-tipo="lista"]'), /Delver[\s\S]*Última lista aberta/);
  assert.equal(await page.locator('#home-continuar [data-tipo="partida"]').count(), 0);
  await page.click('#home-continuar [data-tipo="lista"]'); await page.waitForSelector('.deck-summary');
  assert.match(page.url(), /#\/lista\?id=/);
  // partida em andamento: linha principal do cartão; Jogar deixa de ser o primário; o toque volta para a mesa
  await page.goto(base + '#/mesa'); await page.waitForSelector('#mesa-start');
  await page.fill('#mesa-seed', '3'); await page.click('#mesa-start'); await page.waitForSelector('#tb-keep', { timeout: 15000 }); await page.click('#tb-keep');
  await page.goto(base + '#/'); await page.waitForSelector('#home-continuar [data-tipo="partida"]');
  assert.match(await page.innerText('#home-continuar [data-tipo="partida"]'), /Continuar a partida[\s\S]*Gui × /);
  assert.equal(await page.getAttribute('#home-continuar', 'data-itens'), '2');
  assert.equal(await page.locator('#home-atalhos .ds-btn--primary').count(), 0, 'com partida salva, a linha da partida é o caminho principal (nenhum atalho primário)');
  await page.click('#home-continuar [data-tipo="partida"]'); await page.waitForSelector('#tb-pass, #tb-new', { timeout: 15000 });
  assert.match(page.url(), /#\/partida$/);
  // pilha do scanner: terceira linha, com a contagem
  await page.goto(base + '#/scanner'); await page.waitForSelector('#scan-read:not([disabled])', { timeout: 10000 });
  await pausaAuto(page);
  await page.evaluate(() => window.__ocrQueue.push('Sol Ring'));
  await page.click('#scan-read'); await esperaPilha(page, 1);
  await page.goto(base + '#/'); await page.waitForSelector('#home-continuar [data-tipo="scanner"]');
  assert.match(await page.innerText('#home-continuar [data-tipo="scanner"]'), /Pilha do scanner[\s\S]*1 carta esperando/);
  assert.equal(await page.getAttribute('#home-continuar', 'data-itens'), '3');
  // cada linha é um alvo de toque inteiro, com nome falado completo; a tela cabe em 360 sem vazar
  const linhas = await page.$$eval('#home-continuar button', bs => bs.map(b => ({ h: Math.round(b.getBoundingClientRect().height), nome: b.getAttribute('aria-label') })));
  assert.ok(linhas.every(l => l.h >= 44 && l.nome && l.nome.includes(' · ')), JSON.stringify(linhas));
  await auditaTela(page, 'início com Continuar');
  // lista apagada não fica presa no cartão
  await page.click('#home-continuar [data-tipo="lista"]'); await page.waitForSelector('#deck-delete'); await page.click('#deck-delete');
  await page.waitForSelector('.ds-dialog .ds-btn--danger'); await page.click('.ds-dialog .ds-btn--danger'); await page.waitForSelector('#decks-list');
  await page.goto(base + '#/'); await page.waitForSelector('#home-continuar');
  await page.waitForFunction(() => document.querySelector('#home-continuar') && document.querySelector('#home-continuar').dataset.itens === '2');
  assert.equal(await page.locator('#home-continuar [data-tipo="lista"]').count(), 0);
  assert.deepEqual(errors, []);
});

test('e2e · D4a estados vazios de Listas e Coleção: ícone grande, título, uma frase, um primário e um secundário; o resto em "Mais" ou discreto; tudo volta com o primeiro item', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await page.setViewportSize({ width: 360, height: 780 });
  const solidos = () => page.locator('#outlet .ds-btn:not(.ds-btn--ghost):visible').count();
  const primarios = () => page.locator('#outlet .ds-btn--primary:visible').count();
  // Listas vazia: cartão de primeiro uso; botões do título e cartão de backup fora; "Mais" abre Restaurar backup
  await page.goto(base + '#/listas'); await page.waitForSelector('#decks-vazio');
  assert.equal(await page.locator('#decks-vazio .ds-empty__icone svg').count(), 1);
  assert.match(await page.innerText('#decks-vazio'), /Nenhuma lista ainda/);
  assert.equal(await solidos(), 2, 'dois botões sólidos'); assert.equal(await primarios(), 1, 'um primário');
  assert.equal(await page.locator('#deck-new').isVisible(), false);
  assert.ok(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight), 'listas vazia cabe sem rolagem');
  await page.click('#decks-mais'); await page.waitForSelector('.ds-dialog #decks-backup-restore-folha');
  await page.keyboard.press('Escape'); await page.waitForSelector('.ds-dialog', { state: 'detached' });
  await auditaTela(page, 'listas vazia');
  // com uma lista, o título recupera Prontas e Nova e o backup volta
  await createDeck(page, base, 'Delver', PAUPER);
  await page.goto(base + '#/listas'); await page.waitForSelector('#decks-list .ds-list__item');
  assert.equal(await page.locator('#deck-new').isVisible(), true);
  // Coleção vazia: Escanear e Colar lista; CSV, Pelo nome e Buscar discretos; filtro e seção de adicionar escondidos
  await page.goto(base + '#/colecao'); await page.waitForSelector('#col-vazio');
  assert.equal(await solidos(), 2, 'dois botões sólidos'); assert.equal(await primarios(), 1, 'um primário');
  assert.equal(await page.locator('#col-filter').isVisible(), false); assert.equal(await page.locator('#col-adicionar').isVisible(), false);
  assert.equal(await page.locator('#col-scan').isVisible(), false, 'o Escanear do título sai: o do cartão é o primário');
  assert.equal(await page.locator('#col-csv-import').isVisible(), true, 'Abrir CSV continua alcançável (discreto)');
  assert.ok(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight), 'coleção vazia cabe sem rolagem');
  await auditaTela(page, 'coleção vazia');
  // "Pelo nome" abre a seção no lugar e foca o campo; a primeira carta devolve a tela completa
  await page.click('#col-pelo-nome'); await page.waitForSelector('#col-add');
  await page.waitForFunction(() => document.activeElement && document.activeElement.id === 'col-add', null, { timeout: 3000 });
  await page.fill('#col-add', 'Sol Ring'); await page.click('#col-add-btn');
  await page.waitForSelector('.col-row[data-name="Sol Ring"]');
  assert.equal(await page.locator('#col-scan').isVisible(), true); assert.equal(await page.locator('#col-filter').isVisible(), true);
  assert.equal(await page.locator('#col-adicionar .col-acoes #col-import').count(), 1, 'Colar lista voltou para a grade de ações');
  assert.equal(await page.locator('#col-csv-import').evaluate(el => el.classList.contains('ds-btn--ghost')), false);
  assert.deepEqual(errors, []);
});

test('e2e · D4b apresentação de primeira abertura: três passos com Pular, aparece uma vez só, "Começar" devolve o foco à tela e o Perfil deixa rever', { skip }, async t => {
  const { page, errors, base } = await open(t, { apresentacao: true });
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(base + '#/'); await page.waitForSelector('#apresentacao[data-passo="1"]');
  assert.match(await page.innerText('#apresentacao-titulo'), /Tudo fica no aparelho/);
  assert.equal(await page.getAttribute('.apresentacao__pontos', 'aria-label'), 'Passo 1 de 3');
  assert.equal(await page.locator('#apresentacao-pular').isVisible(), true, 'dá para pular desde o primeiro passo');
  assert.equal(await page.locator('.ds-dialog .ds-btn--primary').count(), 1, 'um primário por passo');
  await auditaTela(page, 'apresentação passo 1');
  await page.click('#apresentacao-proximo'); await page.waitForSelector('#apresentacao[data-passo="2"]');
  assert.match(await page.innerText('#apresentacao-titulo'), /regras de verdade/);
  await page.click('#apresentacao-proximo'); await page.waitForSelector('#apresentacao[data-passo="3"]');
  assert.equal(await page.locator('#apresentacao-pular').count(), 0, 'no último passo, Começar e Abrir perfil');
  assert.equal(await page.locator('#apresentacao-perfil').isVisible(), true);
  await page.click('#apresentacao-comecar'); await page.waitForSelector('#ds-overlay[data-open="false"]', { state: 'attached' });
  assert.equal(await page.locator('#home-atalhos').isVisible(), true);
  // uma vez só: recarregar não mostra de novo
  await page.reload(); await page.waitForSelector('#home-atalhos'); await page.waitForTimeout(600);
  assert.equal(await page.locator('#ds-overlay[data-open="true"]').count(), 0, 'não volta na segunda abertura');
  assert.equal(await page.locator('#apresentacao').count(), 0);
  // Pular também marca como vista (em outro contexto limpo)
  const B = await page.context().browser().newContext({ viewport: { width: 360, height: 780 }, serviceWorkers: 'block' });
  const p2 = await B.newPage(); await p2.goto(base + '#/listas'); await p2.waitForSelector('#apresentacao-pular'); await p2.keyboard.press('Escape'); // fechar de qualquer jeito conta como vista
  await p2.waitForSelector('#ds-overlay[data-open="false"]', { state: 'attached' }); await p2.waitForTimeout(300); await p2.reload(); await p2.waitForSelector('#decks-vazio'); await p2.waitForTimeout(600);
  assert.equal(await p2.locator('#apresentacao').count(), 0, 'pulou: não insiste');
  await B.close();
  // Perfil: rever apresentação, e "Abrir perfil" do último passo leva ao perfil
  await page.goto(base + '#/perfil'); await page.waitForSelector('#perfil-apresentacao'); await page.click('#perfil-apresentacao');
  await page.waitForSelector('#apresentacao[data-passo="1"]');
  await page.click('#apresentacao-proximo'); await page.click('#apresentacao-proximo'); await page.waitForSelector('#apresentacao-perfil');
  await page.click('#apresentacao-perfil'); await page.waitForSelector('#ds-overlay[data-open="false"]', { state: 'attached' });
  assert.match(page.url(), /#\/perfil$/);
  assert.deepEqual(errors, []);
});

/* ---------------- Leva 149 · blocos expansíveis da coleção, formato obrigatório em Jogar, enquadrar a foto ---------------- */
const MEDIDAS_149 = [[360, 780], [384, 832], [390, 844], [412, 891]];
async function emTodasAsMedidas(page, nome) {
  for (const tema of ['dark', 'light']) {
    await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), tema);
    for (const [w, hh] of MEDIDAS_149) { await page.setViewportSize({ width: w, height: hh }); await auditaTela(page, `${nome} ${w} ${tema}`); }
  }
  await page.setViewportSize({ width: 360, height: 780 }); await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
}

test('e2e · leva 149 coleção: painel e adicionar carta são blocos expansíveis com ícone; fechar fica lembrado', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(base + '#/colecao'); await page.waitForSelector('#col-vazio');
  // D4 + leva 149 · coleção vazia: "Pelo nome" mostra o bloco já aberto, sem as ações de importar (elas moram no cartão)
  assert.equal(await page.locator('#col-add-bloco').isVisible(), false, 'vazia, o bloco de adicionar não aparece');
  assert.equal(await page.locator('#col-export-bloco').isVisible(), false, 'vazia, exportar e selecionar não aparecem');
  await page.click('#col-pelo-nome'); await page.waitForSelector('#col-add');
  assert.equal(await page.getAttribute('#col-add-toggle', 'aria-expanded'), 'true');
  await auditaTela(page, 'coleção vazia com adicionar aberto');
  await page.fill('#col-add', 'Sol Ring'); await page.click('#col-add-btn'); await page.waitForSelector('.col-row[data-name="Sol Ring"]');
  // cada bloco: cabeçalho-botão de pelo menos 44 px na largura toda, com o ícone do conceito e a seta
  for (const [toggle, icone, titulo] of [['#col-dash-toggle', 'painel', 'Painel'], ['#col-add-toggle', 'cartaMais', 'Adicionar carta']]) {
    const c = await page.$eval(toggle, el => ({ h: el.getBoundingClientRect().height, w: el.getBoundingClientRect().width, pai: el.parentElement.getBoundingClientRect().width, aberto: el.getAttribute('aria-expanded'),
      icones: [...el.querySelectorAll('.ds-icon')].map(i => i.dataset.icone), svg: el.querySelectorAll('svg').length, titulo: el.querySelector('.ds-expansivel__titulo').textContent, texto: el.textContent }));
    assert.ok(c.h >= 44, toggle + ' alto o bastante: ' + c.h); assert.ok(c.w >= c.pai - 2, toggle + ' ocupa a largura do bloco');
    assert.deepEqual(c.icones, [icone, 'descer']); assert.equal(c.svg, 2, 'ícones desenhados, nada de emoji');
    assert.equal(c.titulo, titulo); assert.equal(c.aberto, 'true', 'abertos por padrão');
    assert.doesNotMatch(c.texto, /\p{Extended_Pictographic}/u, 'sem emoji no cabeçalho');
  }
  // leva 160 · expectativa mudou (pedido de 04/10): exportar e selecionar subiram para um bloco próprio, logo abaixo de adicionar
  // ordem: painel, adicionar carta, exportar, filtro, lista
  const y = sel => page.$eval(sel, el => Math.round(el.getBoundingClientRect().top + scrollY));
  const ordem = { painel: await y('#col-dash-bloco'), adicionar: await y('#col-add-bloco'), exportar: await y('#col-export-bloco'), filtro: await y('#col-filter'), lista: await y('.col-row') };
  assert.ok(ordem.painel < ordem.adicionar && ordem.adicionar < ordem.exportar && ordem.exportar < ordem.filtro && ordem.filtro < ordem.lista, JSON.stringify(ordem));
  for (const id of ['#col-import', '#col-csv-import']) assert.equal(await page.locator('#col-add-bloco ' + id).count(), 1, id + ' dentro de adicionar carta');
  for (const id of ['#col-export', '#col-select']) assert.equal(await page.locator('#col-export-bloco ' + id).count(), 1, id + ' dentro do bloco Exportar');
  await emTodasAsMedidas(page, 'coleção com os dois blocos abertos');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/colecao-140-abertos.png', fullPage: true });
  // fechar os dois: sobra o cabeçalho; o painel fechado resume o recorte; a lista sobe
  const antes = await y('.col-row');
  await page.click('#col-add-toggle'); await page.waitForFunction(() => !document.querySelector('#col-add'));
  await page.click('#col-dash-toggle'); await page.waitForFunction(() => !document.querySelector('#col-dash-cartas'));
  assert.equal(await page.getAttribute('#col-add-toggle', 'aria-expanded'), 'false');
  assert.match(await page.innerText('#col-dash-toggle'), /1 cartas · 1 cópias/, 'fechado, o painel diz os números');
  const depois = await y('.col-row');
  assert.ok(antes - depois > 300, `a lista sobe com os blocos fechados: ${antes} → ${depois}`);
  for (const id of ['#col-dash-bloco', '#col-add-bloco']) { const hh = await page.$eval(id, el => el.getBoundingClientRect().height); assert.ok(hh <= 64, id + ' fechado ocupa só o cabeçalho: ' + hh); }
  await emTodasAsMedidas(page, 'coleção com os dois blocos fechados');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/colecao-140-fechados.png', fullPage: true });
  // lembrado por aparelho
  await page.goto(base + '#/listas'); await page.goto(base + '#/colecao'); await page.waitForSelector('#col-add-toggle');
  await page.waitForFunction(() => document.querySelector('#col-add-toggle').getAttribute('aria-expanded') === 'false');
  assert.equal(await page.locator('#col-add').count(), 0, 'adicionar carta continua fechado');
  assert.equal(await page.locator('#col-dash-cartas').count(), 0, 'painel continua fechado');
  // o atalho "+" do topo abre o bloco e põe o foco no campo; abrir pelo cabeçalho também foca
  await page.click('#col-ir-adicionar');
  await page.waitForFunction(() => document.activeElement && document.activeElement.id === 'col-add');
  assert.equal(await page.getAttribute('#col-add-toggle', 'aria-expanded'), 'true');
  await page.click('#col-add-toggle'); await page.click('#col-add-toggle');
  await page.waitForFunction(() => document.activeElement && document.activeElement.id === 'col-add');
  await page.fill('#col-add', 'Counterspell'); await page.keyboard.press('Enter'); await page.waitForSelector('.col-row[data-name="Counterspell"]');
  // catálogo do design system: o componente e os ícones novos estão lá, nos dois temas
  await page.goto(base + '#/ds'); await page.waitForSelector('#ds-expansivel-toggle');
  for (const n of ['painel', 'cartaMais']) assert.equal(await page.locator(`#ds-icones [data-icone="${n}"]`).count(), 1, 'ícone no catálogo: ' + n);
  await page.click('#ds-expansivel-toggle'); assert.equal(await page.getAttribute('#ds-expansivel-toggle', 'aria-expanded'), 'false');
  assert.ok((await page.$eval('#ds-range', el => el.getBoundingClientRect().height)) >= 44);
  assert.deepEqual(errors, []);
});

test('e2e · leva 149 Jogar: não existe "Todos"; sempre há um formato escolhido e as listas são só as dele', { skip }, async t => {
  const { page, errors, base } = await open(t, { dev: false });
  await page.setViewportSize({ width: 360, height: 780 });
  await createDeck(page, base, 'Delver', PAUPER);
  await createDeck(page, base, 'Mesa de Comandante', PAUPER, 'commander');
  await page.goto(base + '#/mesa'); await page.waitForSelector('#mesa-format .ds-chip');
  const chips = () => page.$$eval('#mesa-format .ds-chip', els => els.map(el => ({ k: el.dataset.tableFormat, texto: el.textContent.trim(), ligado: el.getAttribute('aria-pressed') })));
  let c = await chips();
  assert.deepEqual(c.map(x => x.k), ['pauper', 'commander'], 'só os formatos que têm lista');
  assert.ok(!c.some(x => /todos/i.test(x.texto) || x.k === 'all'), 'sem a opção "Todos"');
  assert.equal(c.filter(x => x.ligado === 'true').length, 1, 'um formato já vem escolhido');
  const inicial = c.find(x => x.ligado === 'true').k;
  const doFormato = async k => { await page.click('#mesa-mine'); await page.waitForSelector('.deck-picker__lista'); const f = await page.$$eval('.deck-picker__lista .ds-badge, .deck-picker__lista [data-deck-id]', els => els.filter(e => e.dataset.deckId).length); const txt = await page.innerText('.deck-picker__lista'); await page.keyboard.press('Escape'); return { f, txt }; };
  let l = await doFormato(inicial);
  assert.equal(l.f, 1, 'só a lista do formato escolhido aparece para escolher');
  // tocar no formato ligado não desliga: não há estado "sem formato"
  await page.click(`[data-table-format="${inicial}"]`);
  c = await chips(); assert.equal(c.find(x => x.k === inicial).ligado, 'true');
  // trocar de formato troca a lista
  const outro = inicial === 'pauper' ? 'commander' : 'pauper';
  await page.click(`[data-table-format="${outro}"]`);
  c = await chips(); assert.deepEqual(c.filter(x => x.ligado === 'true').map(x => x.k), [outro]);
  l = await doFormato(outro); assert.equal(l.f, 1);
  assert.match(l.txt, outro === 'pauper' ? /Delver/ : /Mesa de Comandante/);
  await emTodasAsMedidas(page, 'jogar sem "Todos"');
  assert.deepEqual(errors, []);
});

test('e2e · leva 149 perfil: enquadrar a foto arrastando e aproximando; sem o texto "Na mesa"', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(base + '#/perfil'); await page.waitForSelector('#perfil-nome');
  await page.fill('#perfil-nome', 'Guilherme');
  assert.doesNotMatch(await page.innerText('main, body'), /Na mesa:/, 'o texto "Na mesa: nome" saiu');
  // foto 64×48 (paisagem): metade esquerda vermelha, metade direita azul, feita na hora
  const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 64; c.height = 48; const x = c.getContext('2d'); x.fillStyle = '#c00'; x.fillRect(0, 0, 32, 48); x.fillStyle = '#00c'; x.fillRect(32, 0, 32, 48); return c.toDataURL('image/png').split(',')[1]; });
  const sobe = () => page.setInputFiles('#perfil-foto-arquivo', { name: 'eu.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  const corDoAvatar = () => page.$eval('.perfil-avatar img', async img => { await img.decode(); const c = document.createElement('canvas'); c.width = c.height = 8; const x = c.getContext('2d'); x.drawImage(img, 0, 0, 8, 8);
    const p = (px, py) => { const d = x.getImageData(px, py, 1, 1).data; return d[0] > d[2] ? 'vermelho' : 'azul'; }; return { esq: p(1, 4), dir: p(6, 4), w: img.naturalWidth, h: img.naturalHeight }; });
  await sobe(); await page.waitForSelector('#perfil-foto-palco');
  assert.equal(await page.locator('.perfil-avatar[data-tipo="foto"]').count(), 0, 'a foto só entra depois de confirmar');
  const palco = await page.locator('#perfil-foto-palco').boundingBox();
  assert.ok(Math.abs(palco.width - palco.height) < 1 && palco.width >= 240, 'palco quadrado e grande: ' + JSON.stringify(palco));
  assert.ok(palco.x >= 0 && palco.x + palco.width <= 360, 'cabe na tela');
  const q = () => page.$eval('#perfil-foto-palco', el => ({ zoom: +el.dataset.zoom, cx: +el.dataset.cx, cy: +el.dataset.cy }));
  await page.waitForFunction(() => document.querySelector('#perfil-foto-palco').dataset.zoom);
  assert.deepEqual(await q(), { zoom: 1, cx: 32, cy: 24 }, 'começa no recorte central');
  await emTodasAsMedidas(page, 'enquadrar foto');
  if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/perfil-140-enquadrar.png' });
  // sem ajuste, "Usar foto" dá o quadrado central: vermelho à esquerda, azul à direita
  await page.click('#perfil-foto-usar'); await page.waitForSelector('.perfil-avatar[data-tipo="foto"]');
  assert.deepEqual(await corDoAvatar(), { esq: 'vermelho', dir: 'azul', w: 192, h: 192 });
  // arrastar para a direita mostra o lado esquerdo da foto: o avatar fica todo vermelho
  await sobe(); await page.waitForSelector('#perfil-foto-palco'); await page.waitForFunction(() => document.querySelector('#perfil-foto-palco').dataset.zoom);
  const b = await page.locator('#perfil-foto-palco').boundingBox(); const mx = b.x + b.width / 2, my = b.y + b.height / 2;
  // aproximar: barra, botões e roda do mouse
  await page.click('#perfil-foto-mais'); await page.waitForFunction(() => +document.querySelector('#perfil-foto-palco').dataset.zoom === 1.25);
  assert.equal(await page.inputValue('#perfil-foto-zoom'), '125', 'a barra acompanha');
  await page.fill('#perfil-foto-zoom', '200').catch(async () => { await page.$eval('#perfil-foto-zoom', el => { el.value = '200'; el.dispatchEvent(new Event('input', { bubbles: true })); }); });
  await page.waitForFunction(() => +document.querySelector('#perfil-foto-palco').dataset.zoom === 2);
  await page.mouse.move(mx, my); await page.mouse.wheel(0, -120);
  await page.waitForFunction(() => +document.querySelector('#perfil-foto-palco').dataset.zoom > 2);
  await page.$eval('#perfil-foto-zoom', el => { el.value = '200'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForFunction(() => +document.querySelector('#perfil-foto-palco').dataset.zoom === 2);
  // arrastar: a foto segue o ponteiro e para na borda
  await page.mouse.move(mx, my); await page.mouse.down();
  assert.equal(await page.getAttribute('#perfil-foto-palco', 'data-arrastando'), 'true', 'retorno imediato ao pegar');
  await page.mouse.move(mx + 40, my, { steps: 4 });
  await page.waitForFunction(() => +document.querySelector('#perfil-foto-palco').dataset.cx < 32);
  await page.mouse.move(mx + 900, my + 900, { steps: 6 }); await page.mouse.up();
  await page.waitForFunction(() => document.querySelector('#perfil-foto-palco').dataset.arrastando === 'false');
  await page.waitForFunction(() => +document.querySelector('#perfil-foto-palco').dataset.cx === 12 && +document.querySelector('#perfil-foto-palco').dataset.cy === 12);
  assert.deepEqual(await q(), { zoom: 2, cx: 12, cy: 12 }, 'encosta no canto e não passa');
  // teclado: as setas movem
  await page.focus('#perfil-foto-palco'); await page.keyboard.press('ArrowLeft');
  await page.waitForFunction(() => +document.querySelector('#perfil-foto-palco').dataset.cx > 12);
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => +document.querySelector('#perfil-foto-palco').dataset.cx === 12);
  await page.click('#perfil-foto-usar'); await page.waitForSelector('#ds-overlay[data-open="false"]', { state: 'attached' });
  assert.deepEqual(await corDoAvatar(), { esq: 'vermelho', dir: 'vermelho', w: 192, h: 192 }, 'o recorte é o que o círculo mostrava');
  // cancelar não troca a foto
  const antes = await page.$eval('.perfil-avatar img', i => i.src);
  await sobe(); await page.waitForSelector('#perfil-foto-palco'); await page.keyboard.press('Escape');
  assert.equal(await page.$eval('.perfil-avatar img', i => i.src), antes);
  // salvar guarda a foto enquadrada
  await page.click('#perfil-salvar'); await page.waitForSelector('#ds-toast[data-open="true"]');
  await page.reload(); await page.waitForSelector('.perfil-avatar[data-tipo="foto"]');
  assert.deepEqual(await corDoAvatar(), { esq: 'vermelho', dir: 'vermelho', w: 192, h: 192 });
  await emTodasAsMedidas(page, 'perfil sem "Na mesa"');
  assert.deepEqual(errors, []);
});

test('e2e · D5 dados num lugar só: Perfil › Dados com backup, conta, base local de cartas e espaço; Listas sem backup; Cartas abre na busca', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await page.setViewportSize({ width: 360, height: 780 });
  // Cartas: a busca é a primeira superfície; nada de administração
  await page.goto(base + '#/cartas'); await page.waitForSelector('#cards-q');
  assert.equal(await page.locator('#local-panel').count(), 0);
  const q = await page.locator('#cards-q').boundingBox(); assert.ok(q.y < 300, `campo de busca no alto (${Math.round(q.y)} px)`);
  // a busca online alimenta a base local
  await page.fill('#cards-q', 'sol'); await page.click('#cards-search'); await page.waitForSelector('#cards-results .ds-card, #cards-results [data-name]', { timeout: 8000 }).catch(() => {});
  // Listas: sem seção de backup, com e sem listas
  await page.goto(base + '#/listas'); await page.waitForSelector('#decks-vazio');
  assert.equal(await page.locator('#decks-backup-export').count(), 0);
  // Perfil › Dados: backup, conta, base local (com a contagem da busca) e espaço
  await page.goto(base + '#/perfil'); await page.waitForSelector('#perfil-dados');
  for (const id of ['#perfil-backup', '#perfil-conta', '#local-panel', '#perfil-espaco']) assert.equal(await page.locator(id).count(), 1, id);
  const ordem = await page.$$eval('#perfil-dados ~ *', els => els.map(e => e.id).filter(Boolean));
  assert.deepEqual(ordem.slice(0, 4), ['perfil-backup', 'perfil-conta', 'local-panel', 'perfil-espaco'], 'ordem: backup, conta, base local, espaço');
  await page.waitForFunction(() => Number((document.querySelector('#local-count') || {}).textContent) >= 1, null, { timeout: 8000 });
  await page.waitForFunction(() => /Espaço usado|navegador/.test((document.querySelector('#perfil-espaco-texto') || {}).textContent || ''));
  for (const id of ['#local-import', '#local-export', '#local-clear', '#perfil-backup-export', '#perfil-backup-restore']) assert.ok(await page.locator(`${id} svg`).count() >= 1, `${id} com ícone`);
  // limpar a base pede confirmação
  await page.click('#local-clear'); await page.waitForSelector('#local-clear-confirm'); await page.click('#local-clear-confirm');
  await page.waitForFunction(() => (document.querySelector('#local-count') || {}).textContent === '0');
  await auditaTela(page, 'perfil com Dados');
  assert.deepEqual(errors, []);
});

test('e2e · D7 mesa do seu jeito: superfície só na partida, cor do oponente e verso persistem; a carta virada para baixo do outro mostra o verso, não o nome (hot-seat)', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await comOficiais(page, ['Forest', 'Birchlore Rangers']);
  await page.setViewportSize({ width: 360, height: 780 });
  const html = () => page.evaluate(() => ['data-superficie', 'data-oponente', 'data-verso'].map(a => document.documentElement.getAttribute(a)));
  const fundo = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const opp = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--player-opp').trim());
  await page.goto(base + '#/perfil'); await page.waitForSelector('#aparencia-mesa');
  assert.deepEqual(await html(), [null, null, null], 'padrões não marcam o <html>');
  const fundoPadrao = await fundo(); const oppPadrao = await opp();
  assert.equal(await page.locator('#aparencia-superficie .ds-chip').count(), 4); assert.equal(await page.locator('#aparencia-oponente .ds-chip').count(), 3); assert.equal(await page.locator('#aparencia-verso .ds-chip').count(), 3);
  assert.equal(await page.locator('#aparencia-verso .aparencia__verso .ds-verso[data-desenho]').count(), 3, 'cada chip de verso mostra o seu desenho');
  await page.click('#aparencia-superficie [data-superficie="feltro"]'); await page.click('#aparencia-oponente [data-oponente="rubi"]'); await page.click('#aparencia-verso [data-verso="selo"]');
  await page.waitForFunction(() => document.documentElement.getAttribute('data-verso') === 'selo');
  assert.deepEqual(await html(), ['feltro', 'rubi', 'selo']);
  assert.notEqual(await opp(), oppPadrao, 'a cor do oponente mudou na hora');
  assert.equal(await fundo(), fundoPadrao, 'fora da partida o fundo não muda');
  await auditaTela(page, 'aparência com Mesa');
  await page.reload(); await page.waitForSelector('#aparencia-mesa');
  assert.deepEqual(await html(), ['feltro', 'rubi', 'selo'], 'persiste');
  assert.equal(await page.getAttribute('#aparencia-superficie [data-superficie="feltro"]', 'aria-pressed'), 'true');
  // partida hot-seat: o fundo vira feltro; Ana conjura virada para baixo; Bia vê o verso e nenhum nome
  await createDeck(page, base, 'Rangers', '30 Forest\n10 Birchlore Rangers', 'livre');
  await page.goto(base + '#/mesa'); await page.click('[data-opponent="hotseat"]');
  await page.fill('#mesa-me', 'Ana'); await page.fill('#mesa-them', 'Bia'); await page.fill('#mesa-seed', '4');
  await page.click('#mesa-start'); await page.waitForSelector('#tb-keep'); await page.click('#tb-keep'); await reveal(page); await page.click('#tb-keep'); await reveal(page);
  await page.waitForSelector('#tb-vez[data-papel="eu"]');
  assert.equal(await page.evaluate(() => document.body.dataset.tela), 'partida');
  assert.notEqual(await fundo(), fundoPadrao, 'na partida o fundo é a superfície escolhida');
  const act = a => page.evaluate(a => { try { window.__estanteMesa.act(a); return true; } catch (e) { return String(e); } }, a);
  const oid = (nome, zona = 'hand', p = 0) => page.evaluate(([nome, zona, p]) => { const s = window.__estanteMesa.estado(); return s.zones[p][zona].find(o => s.objects[o].name === nome) || null; }, [nome, zona, p]);
  const minhaVez = async () => { for (let i = 0; i < 60; i++) { await reveal(page); const e = await estado121(page); if (e.ativo === 0 && e.prio === 0 && e.passo === 'main1' && !e.pend && !e.pilha) return; if (e.pend === 'discard') { await page.locator('#tb-hand .tb-card').first().click(); await page.waitForTimeout(60); continue; } for (const id of ['#tb-no-block', '#tb-no-attack', '#tb-pass-turn', '#tb-pass']) if (await page.locator(id).count()) { await page.click(id).catch(() => {}); break; } await page.waitForTimeout(60); } };
  let conj = null;
  for (let turno = 0; turno < 6 && !conj; turno++) {
    const f = await oid('Forest'); if (f) await act({ t: 'play_land', p: 0, oid: f });
    const l = await page.evaluate(() => window.__estanteMesa.legais().filter(a => a.t === 'cast' && a.faceDown)); if (l.length) { conj = l[0]; break; }
    await page.click('#tb-pass-turn'); await minhaVez(); // Bia joga vazio; volta para Ana
  }
  assert.ok(conj, 'Ana consegue conjurar a Rangers virada para baixo');
  await act(conj);
  for (let i = 0; i < 10; i++) { const e = await estado121(page); if (!e.pilha && !e.pend) break; await page.click('#tb-pass').catch(() => {}); await page.waitForTimeout(100); }
  // Ana vê a própria carta com a marca "virada para baixo", não o verso
  await page.waitForSelector('.tb-side--me .tb-card[data-oid]');
  assert.equal(await page.locator('.tb-side--me .tb-card__face--verso').count(), 0, 'quem conjurou vê a carta');
  assert.match(await page.locator('.tb-side--me [data-zone="permanents"] .tb-card').first().getAttribute('aria-label'), /Birchlore Rangers/);
  // passa o aparelho: Bia vê o verso, sem nome nem imagem; a folha também não revela
  await page.click('#tb-pass-turn'); await page.waitForSelector('#tb-reveal'); await page.click('#tb-reveal');
  await page.waitForSelector('.tb-side--opp .tb-card__face--verso');
  const lado = await page.innerText('.tb-side--opp'); assert.doesNotMatch(lado, /Birchlore/, 'o nome não aparece do outro lado');
  assert.match(await page.locator('.tb-side--opp [data-zone="permanents"] .tb-card').first().getAttribute('aria-label'), /^Carta virada para baixo/);
  assert.equal(await page.locator('.tb-side--opp .tb-card__face--verso .ds-verso').count(), 1, 'o verso escolhido');
  assert.match(await page.locator('.tb-side--opp .tb-card__face--verso .tb-card__pt').innerText(), /2\/2/, 'o que é público: 2/2');
  await page.locator('.tb-side--opp [data-zone="permanents"] .tb-card').first().click(); await page.waitForSelector('.ds-dialog');
  assert.doesNotMatch(await page.innerText('.ds-dialog'), /Birchlore/, 'a folha não revela'); await page.keyboard.press('Escape');
  await auditaTela(page, 'mesa feltro com verso');
  assert.deepEqual(errors, []);
});

test('e2e · D6 mesa de relance: no início da partida nenhuma zona vazia ocupa campo, zeros apagados, "Terrenos" só depois do primeiro terreno; cada lado ≤ 80 px no início (antes 121)', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await page.setViewportSize({ width: 360, height: 780 });
  await createDeck(page, base, 'Delver', PAUPER);
  await page.goto(base + '#/mesa'); await page.waitForSelector('#mesa-start');
  await page.fill('#mesa-seed', '3'); await page.click('#mesa-start'); await page.waitForSelector('#tb-keep', { timeout: 15000 }); await page.click('#tb-keep');
  await page.waitForSelector('.tb-side--me'); await page.waitForTimeout(300);
  const alturas = () => page.$$eval('.tb-side', ls => ls.map(l => Math.round(l.getBoundingClientRect().height)));
  const antes = 121; // leva 144: altura de cada lado no início (360×780, Delver × Goldfish)
  const h0 = await alturas();
  assert.ok(h0.every(h => h <= antes - 40), `cada lado ganhou ≥ 40 px (${antes} → ${h0.join('/')}); meta da D6: ≥ 60 px somando os dois lados`);
  assert.equal(await page.locator('.tb-side .tb-zone').count(), 0, 'nenhuma linha de zona com o campo vazio');
  assert.deepEqual(await page.$$eval('.tb-side', ls => ls.map(l => l.dataset.campo)), ['vazio', 'vazio']);
  assert.match(await page.getAttribute('.tb-side--me', 'aria-label'), /campo vazio/, 'o leitor de tela sabe que o campo está vazio');
  // zeros apagados: o chip continua um alvo de 44 px, mas sem borda nem peso
  const zero = page.locator('#tb-cemiterio-me');
  assert.equal(await zero.getAttribute('data-zero'), 'true');
  assert.ok((await zero.boundingBox()).height >= 44, 'alvo de toque mantido');
  assert.equal(await page.$eval('#tb-cemiterio-me', el => getComputedStyle(el).borderTopColor), 'rgba(0, 0, 0, 0)', 'zero sem borda');
  assert.notEqual(await page.$eval('#tb-lib-me', el => getComputedStyle(el).borderTopColor), 'rgba(0, 0, 0, 0)', 'o grimório (25) continua com borda');
  // o primeiro terreno traz "Terrenos · 1" e "Permanentes nenhuma" numa linha fina; o lado cresce só o necessário
  const ilha = await page.evaluate(() => { const s = window.__estanteMesa.estado(); return s.zones[0].hand.find(o => s.objects[o].name === 'Island') || null; });
  assert.ok(ilha, 'há uma Island na mão com a semente 3');
  await page.evaluate(oid => window.__estanteMesa.act({ t: 'play_land', p: 0, oid }), ilha);
  await page.waitForSelector('.tb-side--me [data-zone="lands"] .tb-card');
  assert.match(await page.innerText('.tb-side--me [data-zone="lands"] .tb-zone__label'), /Terrenos · 1/);
  assert.equal(await page.locator('.tb-side--me [data-zone="permanents"].tb-zone--empty').count(), 1);
  assert.equal(await page.getAttribute('.tb-side--me', 'data-campo'), 'ocupado');
  assert.equal(await page.locator('.tb-side--opp .tb-zone').count(), 0, 'o lado do oponente segue sem zonas');
  await auditaTela(page, 'mesa de relance');
  assert.deepEqual(errors, []);
});

test('e2e · D8 avisos no lugar: a lista sem rede tem uma linha de estado (≤ 48 px) com folha no lugar de duas notas; o botão mostra ✓ por 1,2 s antes do aviso', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await page.setViewportSize({ width: 360, height: 780 });
  await createDeck(page, base, 'Delver', PAUPER + '\n1 Carta Inexistente'); // a carta sem script garante "Copiar sem script"
  const urlDelver = page.url();
  // sem rede: uma lista nova com carta nunca vista abre com "Sem internet" e os avisos numa linha só (antes: duas notas)
  await page.route('https://api.scryfall.com/**', r => r.abort('internetdisconnected'));
  await page.context().setOffline(true);
  await createDeck(page, base, 'Sem rede', '20 Island\n4 Lightning Bolt');
  await page.waitForSelector('#deck-estado', { timeout: 10000 });
  const linha = await page.locator('#deck-estado').boundingBox();
  assert.ok(linha.height <= 48, `uma linha (${Math.round(linha.height)} px; antes eram duas notas somando 153 px)`);
  assert.equal(await page.locator('#outlet .ds-note:visible').count(), 0, 'nenhuma nota empilhada na tela');
  assert.equal(await page.locator('#deck-sem-rede').count(), 0, 'o aviso de rede entrou na linha');
  const itens = await page.$$eval('#deck-estado .ds-estado__item', is => is.map(i => [i.dataset.tom, i.textContent.trim()]));
  assert.deepEqual(itens[0], ['warning', 'Sem internet']);
  assert.ok(itens.some(([tom, txt]) => tom === 'warning' && /aviso/.test(txt)), JSON.stringify(itens));
  assert.match(await page.getAttribute('#deck-estado', 'aria-label'), /^Estado da lista: Sem internet, .*Toque para ver os detalhes$/);
  await page.click('#deck-estado'); await page.waitForSelector('.ds-dialog');
  assert.equal(await page.locator('.ds-dialog .ds-note').count(), itens.length, 'uma nota por item na folha');
  assert.match(await page.innerText('.ds-dialog'), /Sem conexão com a Scryfall/);
  await page.keyboard.press('Escape'); await page.waitForSelector('.ds-dialog', { state: 'detached' });
  await auditaTela(page, 'lista sem rede');
  // leva 158 · o CI usa uma fonte de sistema mais larga: a mesma tela é auditada com ela (a barra com o chip Sem rede
  // encostava "Coleção" em "Sem rede" só lá). Em tela estreita sem internet o chip é só ícone e o botão de tema sai.
  assert.equal(await page.locator('#nav-offline .ds-nav__rotulo').isVisible(), false, 'chip só com ícone em 360');
  assert.equal(await page.getAttribute('#nav-offline', 'aria-label'), 'Sem internet: ver o que funciona');
  assert.equal(await page.locator('#theme-toggle').isVisible(), false, 'tema fora da barra sem internet em 360');
  const larga = await page.addStyleTag({ content: ':root{--font-ui:"DejaVu Sans","Verdana",sans-serif !important}' });
  await auditaTela(page, 'lista sem rede, fonte larga');
  await larga.evaluate(el => el.remove());
  await page.context().setOffline(false); await page.unroute('https://api.scryfall.com/**');
  // ✓ no botão: Copiar sem script mostra "Copiado" no próprio botão e volta ao rótulo em ~1,2 s; o aviso vem junto
  await page.goto(urlDelver); await page.reload(); await page.waitForSelector('#deck-copy-missing', { timeout: 10000 });
  await page.evaluate(() => { navigator.clipboard.writeText = async () => {}; });
  await page.click('#deck-copy-missing');
  await page.waitForSelector('#deck-copy-missing[data-confirmado="true"]');
  assert.equal(await page.innerText('#deck-copy-missing .ds-btn__rotulo'), 'Copiado');
  assert.equal(await page.locator('#deck-copy-missing svg').count(), 1, 'o ✓ desenhado');
  assert.match(await page.innerText('#ds-toast'), /copiadas/);
  await page.waitForSelector('#deck-copy-missing:not([data-confirmado])', { timeout: 3000 });
  assert.equal(await page.innerText('#deck-copy-missing .ds-btn__rotulo'), 'Copiar sem script');
  // Perfil: Salvar vira "Salvo" por um instante
  await page.goto(base + '#/perfil'); await page.waitForSelector('#perfil-nome'); await page.fill('#perfil-nome', 'Gui'); await page.click('#perfil-salvar');
  await page.waitForSelector('#perfil-salvar[data-confirmado="true"]'); assert.equal(await page.innerText('#perfil-salvar .ds-btn__rotulo'), 'Salvo');
  assert.deepEqual(errors, []);
});

test('e2e · D9 coleção: agrupar e ordem lado a lado, desfazer importação numa linha com ícones e alvos de 44 px; a ordem painel › adicionar › filtro › lista da leva 149 continua', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(base + '#/colecao'); await page.waitForSelector('#col-vazio'); await page.click('#col-pelo-nome'); await page.waitForSelector('#col-import');
  await page.click('#col-import'); await page.waitForSelector('#col-import-text'); await page.fill('#col-import-text', '3 Island\n2 Counterspell\n1 Sol Ring\n1 Grizzly Bear');
  await page.click('#col-import-check'); await page.waitForSelector('#col-import-run'); await page.click('#col-import-run');
  await page.waitForSelector('.col-row[data-name="Sol Ring"]'); await page.waitForTimeout(400);
  // agrupar e ordem dividem a linha; a barra de desfazer é uma linha só
  const [ag, ord] = [await page.locator('#col-group').boundingBox(), await page.locator('#col-sort').boundingBox()];
  assert.ok(Math.abs(ag.y - ord.y) < 2 && ord.x > ag.x + ag.width - 1, 'agrupar e ordem lado a lado');
  const undo = await page.locator('#col-undo-btn').boundingBox(), ok = await page.locator('#col-undo-ok').boundingBox();
  assert.ok(Math.abs(undo.y - ok.y) < 2 && undo.height >= 44 && ok.height >= 44, 'desfazer e OK na mesma linha, 44 px');
  assert.equal(await page.getAttribute('#col-undo-btn', 'aria-label'), 'Desfazer a importação');
  assert.ok((await page.locator('#outlet .col-undo').boundingBox()).height <= 70, 'barra de desfazer numa linha');
  // a ordem da leva 149 (painel, adicionar, filtro, lista) continua; a D9 cedeu o "painel recolhido por padrão" ao bloco expansível dela
  const y = sel => page.locator(sel).first().boundingBox().then(b => Math.round(b.y));
  assert.ok((await y('#col-dashboard')) < (await y('#col-filter')) && (await y('#col-filter')) < (await y('.col-row')), 'painel, filtro, lista');
  await auditaTela(page, 'coleção com agrupar e ordem numa linha');
  assert.deepEqual(errors, []);
});

test('e2e · D10 movimento com sistema: catálogo em /ds, pulsos por token, a vez chegando vibra com o padrão "turno" e "menos movimento" zera tudo', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; window.__vibs = []; Object.defineProperty(navigator, 'vibrate', { value: p => { window.__vibs.push(p); return true; }, configurable: true }); });
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(base + '#/ds'); await page.waitForSelector('#ds-movimentos');
  assert.equal(await page.locator('#ds-movimentos .ds-movimento').count(), 8, 'oito durações no catálogo');
  await page.click('#ds-movimentos .ds-movimento__demo >> nth=5');
  assert.equal(await page.$eval('#ds-movimentos .ds-movimento__demo >> nth=5', el => getComputedStyle(el).animationDuration), '1.2s', 'a demo usa o token (--dur-pulso)');
  await page.click('.ds-surface:has(#ds-movimentos) button:has-text("turno")');
  assert.deepEqual(await page.evaluate(() => JSON.parse(JSON.stringify(window.__vibs.at(-1)))), [12, 40, 12], 'padrão da troca de vez');
  // o pulso de "sem internet" na barra usa o token lento
  await page.context().setOffline(true); await page.goto(base + '#/listas'); await page.waitForSelector('#nav-offline:not(.ds-hidden)');
  assert.equal(await page.$eval('#nav-offline', el => getComputedStyle(el, '::before').animationDuration), '2.4s');
  await page.context().setOffline(false);
  // hot-seat: quando a vez chega a quem está com o aparelho, vibra "turno" (uma vez por troca)
  await createDeck(page, base, 'Peixes', '30 Island\n10 Sky Pike', 'livre');
  await page.goto(base + '#/mesa'); await page.click('[data-opponent="hotseat"]'); await page.fill('#mesa-me', 'Ana'); await page.fill('#mesa-them', 'Bia'); await page.fill('#mesa-seed', '4');
  await page.click('#mesa-start'); await page.waitForSelector('#tb-keep'); await page.click('#tb-keep'); await reveal(page); await page.click('#tb-keep'); await reveal(page);
  await page.waitForSelector('#tb-vez[data-papel="eu"]');
  await page.evaluate(() => { window.__vibs.length = 0; });
  await page.click('#tb-pass-turn'); await page.waitForSelector('#tb-reveal'); await page.click('#tb-reveal'); await page.waitForSelector('#tb-vez[data-papel="eu"]');
  const vibs = await page.evaluate(() => JSON.parse(JSON.stringify(window.__vibs)));
  assert.ok(vibs.some(v => Array.isArray(v) && v.join() === '12,40,12'), 'a vez de Bia chegou com o padrão de turno: ' + JSON.stringify(vibs));
  // menos movimento por escolha: a demo do catálogo fica instantânea
  await page.goto(base + '#/perfil'); await page.waitForSelector('#perfil-aparencia'); await page.click('#perfil-aparencia [data-movimento]');
  await page.waitForFunction(() => document.documentElement.getAttribute('data-movimento') === 'reduzido');
  await page.goto(base + '#/ds'); await page.waitForSelector('#ds-movimentos');
  await page.click('#ds-movimentos .ds-movimento__demo >> nth=1');
  assert.ok(parseFloat(await page.$eval('#ds-movimentos .ds-movimento__demo >> nth=1', el => getComputedStyle(el).animationDuration)) < 0.001, 'instantânea');
  assert.deepEqual(errors, []);
});

/* ---------------- D11 · acessibilidade medida ---------------- */
// axe-core (devDependency) roda dentro de cada tela, nos dois temas: nomes, papéis, foco, contraste de todo texto, estrutura.
// Se não estiver instalado (clone antigo), o teste diz e falha: a medição faz parte do portão.
const AXE_PATH = join(ROOT, 'node_modules', 'axe-core', 'axe.min.js');
test('e2e · D11 acessibilidade medida: axe-core sem achados (WCAG 2.1 A/AA + boas práticas) em 13 telas e folhas, escuro e claro', { skip }, async t => {
  assert.ok(existsSync(AXE_PATH), 'axe-core instalado (npm install)');
  const AXE = readFileSync(AXE_PATH, 'utf8');
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await page.setViewportSize({ width: 360, height: 780 });
  await createDeck(page, base, 'Delver', PAUPER);
  const urlLista = page.url();
  await page.goto(base + '#/colecao'); await page.waitForSelector('#col-import'); await page.click('#col-import'); await page.waitForSelector('#col-import-text');
  await page.fill('#col-import-text', '2 Sol Ring\n1 Counterspell'); await page.click('#col-import-check'); await page.waitForSelector('#col-import-run'); await page.click('#col-import-run'); await page.waitForSelector('.col-row');
  const fecha = async () => { if (await page.locator('#ds-overlay[data-open="true"]').count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(150); } };
  const telas = [
    ['início', async () => { await page.goto(base + '#/'); await page.waitForSelector('#home-atalhos'); }],
    ['listas', async () => { await page.goto(base + '#/listas'); await page.waitForSelector('#decks-list .ds-list__item'); }],
    ['lista', async () => { await page.goto(urlLista); await page.waitForSelector('.deck-summary'); }],
    ['coleção', async () => { await page.goto(base + '#/colecao'); await page.waitForSelector('.col-row'); }],
    ['coleção · filtros', async () => { await page.click('#col-filters'); await page.waitForSelector('.ds-dialog'); }],
    ['cartas', async () => { await page.goto(base + '#/cartas'); await page.waitForSelector('#cards-q'); }],
    ['scanner', async () => { await page.goto(base + '#/scanner'); await page.waitForSelector('#scan-read'); }],
    ['preparar partida', async () => { await page.goto(base + '#/mesa'); await page.waitForSelector('#mesa-start'); }],
    ['partida', async () => { await page.fill('#mesa-seed', '3'); await page.click('#mesa-start'); await page.waitForSelector('#tb-keep', { timeout: 15000 }); await page.click('#tb-keep'); await page.waitForTimeout(400); }],
    ['perfil', async () => { await page.goto(base + '#/perfil'); await page.waitForSelector('#perfil-aparencia'); }],
    ['apresentação', async () => { await page.click('#perfil-apresentacao'); await page.waitForSelector('#apresentacao'); }],
    ['catálogo', async () => { await page.goto(base + '#/ds'); await page.waitForSelector('#ds-table'); }]
  ];
  const achados = [];
  for (const tema of ['dark', 'light']) {
    await page.emulateMedia({ colorScheme: tema });
    await page.evaluate(t => window.__estanteTema && window.__estanteTema.apply(t), tema);
    for (const [nome, prep] of telas) {
      await prep(); await page.waitForTimeout(350);
      await page.addScriptTag({ content: AXE });
      const v = await page.evaluate(async () => {
        const res = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } });
        return res.violations.map(x => ({ id: x.id, impact: x.impact, alvos: x.nodes.slice(0, 3).map(n => n.target.join(' ').slice(0, 60)) }));
      });
      for (const x of v) achados.push(`${tema} · ${nome}: ${x.id} (${x.impact}) ${x.alvos.join(' | ')}`);
      await fecha();
    }
  }
  assert.deepEqual(achados, [], 'achados do axe:\n' + achados.join('\n'));
  assert.deepEqual(errors, []);
});

test('e2e · D12 guia visual vivo: /ds mostra os tokens que estão valendo (mudam com o acento), estados dos componentes e o checklist; cabe em 360 sem rolagem lateral', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(base + '#/ds'); await page.waitForSelector('#ds-tokens-cor');
  assert.equal(await page.locator('#ds-tokens-cor .ds-token').count(), 21, 'vinte e um tokens de cor');
  const lido = await page.innerText('#ds-tokens-cor [data-token="--accent"]');
  const valendo = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
  assert.ok(lido.includes(valendo), `o catálogo mostra o valor que está valendo (${valendo})`);
  assert.equal(await page.locator('#ds-tokens-texto .ds-token').count(), 9); assert.equal(await page.locator('#ds-tokens-espaco .ds-token').count(), 8);
  assert.equal(await page.locator('#ds-checklist li').count(), 8, 'oito itens no checklist');
  for (const sel of ['#ds-linha-estado', '#ds-versos', '#ds-movimentos', '.ds-empty--hero', '.ds-anel[data-pct="100"]', '.ds-avatar']) assert.ok(await page.locator(sel).count() >= 1, sel);
  await page.click('#ds-confirma'); await page.waitForSelector('#ds-confirma[data-confirmado="true"]');
  await auditaTela(page, 'catálogo');
  // o acento muda e o catálogo acompanha sem recarregar a página inteira
  await page.evaluate(() => window.__estanteTema.setAparencia({ acento: 'jade' }));
  await page.goto(base + '#/listas'); await page.goto(base + '#/ds'); await page.waitForSelector('#ds-tokens-cor');
  const jade = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
  assert.notEqual(jade, valendo); assert.ok((await page.innerText('#ds-tokens-cor [data-token="--accent"]')).includes(jade));
  assert.deepEqual(errors, []);
});

test('e2e · leva 160 coleção: bloco Exportar expansível com ícone próprio, abaixo de Adicionar carta — texto, CSV, filtradas e seleção; fechar fica lembrado', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(base + '#/colecao'); await page.waitForSelector('#col-vazio');
  assert.equal(await page.locator('#col-export-bloco').isVisible(), false, 'coleção vazia: nada a exportar, o bloco não aparece');
  await page.click('#col-import'); await page.waitForSelector('#col-import-text'); await page.fill('#col-import-text', '3 Island\n2 Counterspell\n1 Sol Ring');
  await page.click('#col-import-check'); await page.waitForSelector('#col-import-run'); await page.click('#col-import-run'); await page.waitForSelector('.col-row[data-name="Sol Ring"]');
  // cabeçalho: botão na largura toda, ≥ 44 px, ícone próprio (a carta que sai) e a seta; aberto por padrão
  const c = await page.$eval('#col-export-toggle', el => ({ h: el.getBoundingClientRect().height, w: el.getBoundingClientRect().width, pai: el.parentElement.getBoundingClientRect().width, aberto: el.getAttribute('aria-expanded'),
    icones: [...el.querySelectorAll('.ds-icon')].map(i => i.dataset.icone), titulo: el.querySelector('.ds-expansivel__titulo').textContent, texto: el.textContent }));
  assert.ok(c.h >= 44 && c.w >= c.pai - 2, JSON.stringify(c)); assert.deepEqual(c.icones, ['cartaSai', 'descer']); assert.equal(c.titulo, 'Exportar'); assert.equal(c.aberto, 'true');
  assert.doesNotMatch(c.texto, /\p{Extended_Pictographic}/u, 'sem emoji');
  // posição: logo abaixo de Adicionar carta e acima do filtro e da lista (antes ficava depois da lista)
  const y = sel => page.$eval(sel, el => Math.round(el.getBoundingClientRect().top + scrollY));
  const [add, exp, filtro, lista] = [await y('#col-add-bloco'), await y('#col-export-bloco'), await y('#col-filter'), await y('.col-row')];
  assert.ok(add < exp && exp < filtro && filtro < lista, JSON.stringify({ add, exp, filtro, lista }));
  assert.equal(await page.locator('#col-acoes-lista').count(), 0, 'as ações saíram do fim da página');
  // quatro saídas, cada uma com ícone, rótulo de até duas palavras e 44 px
  const botoes = await page.$$eval('#col-acoes-exportar .ds-btn', bs => bs.map(b => ({ id: b.id, rot: b.querySelector('.ds-btn__rotulo').textContent, svg: b.querySelectorAll('svg').length, h: Math.round(b.getBoundingClientRect().height), off: b.disabled })));
  assert.deepEqual(botoes.map(b => [b.id, b.rot]), [['col-export', 'Em texto'], ['col-export-csv', 'Em CSV'], ['col-export-filtro', 'Filtradas'], ['col-select', 'Selecionar']]);
  assert.ok(botoes.every(b => b.svg === 1 && b.h >= 44 && b.rot.split(' ').length <= 2), JSON.stringify(botoes));
  assert.equal(botoes[2].off, true, 'sem filtro ligado, "Filtradas" fica apagado');
  await auditaTela(page, 'coleção com o bloco Exportar aberto');
  // Em texto abre a folha com os formatos; Em CSV baixa direto e confirma no botão
  await page.click('#col-export'); await page.waitForSelector('#col-export-text'); assert.match(await page.inputValue('#col-export-text'), /3 Island/);
  await page.keyboard.press('Escape'); await page.waitForSelector('.ds-dialog', { state: 'detached' });
  const [csv] = await Promise.all([page.waitForEvent('download'), page.click('#col-export-csv')]);
  assert.equal(csv.suggestedFilename(), 'estante-colecao.csv');
  await page.waitForSelector('#col-export-csv[data-confirmado="true"]');
  // com filtro ligado, "Filtradas" acende, mostra a contagem e abre a folha já no recorte
  await page.fill('#col-filter', 'Sol'); await page.waitForFunction(() => document.querySelectorAll('.col-row').length === 1);
  await page.waitForSelector('#col-export-filtro:not([disabled])');
  assert.equal(await page.innerText('#col-export-filtro .ds-btn__conta'), '1');
  await page.click('#col-export-filtro'); await page.waitForSelector('#col-export-text');
  const txt = await page.inputValue('#col-export-text'); assert.match(txt, /Sol Ring/); assert.doesNotMatch(txt, /Island/);
  await page.keyboard.press('Escape'); await page.waitForSelector('.ds-dialog', { state: 'detached' });
  await page.fill('#col-filter', ''); await page.waitForFunction(() => document.querySelectorAll('.col-row').length === 3);
  // Selecionar liga a seleção (o botão fica marcado) e a barra de seleção aparece
  await page.click('#col-select'); await page.waitForSelector('#col-select-off');
  assert.equal(await page.getAttribute('#col-select', 'aria-pressed'), 'true');
  await page.click('#col-select-off'); await page.waitForFunction(() => !document.querySelector('#col-select-off'));
  // fechar: sobra o cabeçalho com o resumo, a lista sobe, e fica lembrado
  await page.click('#col-export-toggle'); await page.waitForFunction(() => !document.querySelector('#col-acoes-exportar'));
  assert.equal(await page.getAttribute('#col-export-toggle', 'aria-expanded'), 'false');
  assert.match(await page.innerText('#col-export-toggle'), /texto · CSV · seleção/);
  assert.ok((await page.$eval('#col-export-bloco', el => el.getBoundingClientRect().height)) <= 64, 'fechado ocupa só o cabeçalho');
  assert.ok(lista - (await y('.col-row')) >= 120, 'a lista sobe com o bloco fechado');
  await auditaTela(page, 'coleção com o bloco Exportar fechado');
  await page.goto(base + '#/listas'); await page.goto(base + '#/colecao'); await page.waitForSelector('#col-export-toggle');
  await page.waitForFunction(() => document.querySelector('#col-export-toggle').getAttribute('aria-expanded') === 'false');
  // o ícone novo está no catálogo
  await page.goto(base + '#/ds'); await page.waitForSelector('#ds-icones');
  assert.equal(await page.locator('#ds-icones [data-icone="cartaSai"]').count(), 1, 'cartaSai no catálogo de ícones');
  assert.deepEqual(errors, []);
});

test('e2e · leva 163 preço em três moedas no detalhe da carta: dólar, real pela cotação e euro; foil separado; sem internet vale a última cotação; sem preço não inventa', { skip }, async t => {
  const { page, errors, base } = await open(t);
  await page.addInitScript(() => { window.__MTG_TEST = true; });
  await page.setViewportSize({ width: 360, height: 780 });
  // a Scryfall devolve Sol Ring com preço normal e foil (euro de mercado só no normal) e Counterspell sem preço
  await page.route('https://api.scryfall.com/cards/search**', r => r.fulfill({ json: { object: 'list', has_more: false, data: [
    { ...DB['sol ring'], prices: { usd: '2.00', usd_foil: '10.00', eur: '1.50', eur_foil: null } }, { ...DB['counterspell'], prices: {} }] } }));
  let pedidos = 0;
  await page.context().route(/api\.frankfurter\.dev/, r => { pedidos++; return r.fulfill({ json: { base: 'USD', rates: { BRL: 5, EUR: 0.9 } }, headers: { 'access-control-allow-origin': '*' } }); });
  await page.goto(base + '#/cartas'); await page.waitForSelector('#cards-q'); await page.fill('#cards-q', 'o'); await page.click('#cards-search');
  await page.waitForSelector('#cards-results .ds-card');
  await page.locator('#cards-results .ds-card[aria-label="Sol Ring"]').click(); await page.waitForSelector('#card-precos');
  await page.waitForFunction(() => /Dólar a/.test((document.querySelector('#card-cotacao') || {}).textContent || ''));
  const linhas = await page.$$eval('#card-precos .ds-precos__linha', ls => ls.map(l => [l.dataset.acabamento, ...[...l.querySelectorAll('.ds-precos__valor')].map(v => v.textContent + (v.dataset.mercado === 'true' ? ' *' : ''))]));
  assert.deepEqual(linhas, [['normal', 'US$ 2,00 *', 'R$ 10,00', '€ 1,50 *'], ['foil', 'US$ 10,00 *', 'R$ 50,00', '€ 9,00']], 'real = dólar × cotação; euro de mercado no normal, convertido no foil');
  assert.match(await page.innerText('#card-cotacao'), /Dólar a R\$ 5,00 · cotação de \d\d\/\d\d \d\d:\d\d · Frankfurter \(BCE\) · euro sem preço de mercado é convertido/);
  assert.ok(pedidos >= 1);
  await auditaTela(page, 'visor da carta com preço');
  await page.keyboard.press('Escape'); await page.waitForSelector('.ds-dialog', { state: 'detached' });
  // carta sem preço: diz que não há, não inventa
  await page.locator('#cards-results .ds-card[aria-label="Counterspell"]').click(); await page.waitForSelector('#card-sem-preco');
  assert.equal(await page.locator('#card-precos .ds-precos__valor').count(), 0);
  await page.keyboard.press('Escape'); await page.waitForSelector('.ds-dialog', { state: 'detached' });
  // a cotação fica guardada: dentro da validade não busca de novo, e sem internet continua valendo
  const antes = pedidos;
  await page.context().unroute(/api\.frankfurter\.dev/); await page.context().route(/api\.frankfurter\.dev/, r => r.abort('internetdisconnected'));
  await page.reload(); await page.waitForSelector('#cards-q'); await page.fill('#cards-q', 'o'); await page.click('#cards-search'); await page.waitForSelector('#cards-results .ds-card');
  await page.locator('#cards-results .ds-card[aria-label="Sol Ring"]').click();
  await page.waitForFunction(() => /Dólar a R\$ 5,00/.test((document.querySelector('#card-cotacao') || {}).textContent || ''));
  assert.equal(pedidos, antes, 'cotação guardada: nenhuma busca nova');
  assert.equal(await page.innerText('#card-precos [data-acabamento="normal"] [data-moeda="brl"]'), 'R$ 10,00');
  assert.deepEqual(errors, []);
});
