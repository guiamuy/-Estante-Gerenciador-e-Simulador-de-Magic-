// M-348 · LT30 · Frases do Pauper lidas pelo leitor: terras de depleção (Hickory Woodlot, 605.1a), "Flashback—{1}{U}, Pay 3 life" (Deep Analysis,
// 702.34a + 119.4), "As an additional cost…, discard a card" (Big Score, 601.2b), Archaeomancer (instantânea ou feitiço do cemitério), Toxin Analysis
// (duas palavras-chave), Campfire (comandantes para a mão; cemitério no grimório), Bonder's Ornament, Reckoner's Bargain ("the sacrificed permanent's
// mana value", 608.2h) e "You may discard a card. If you do, draw two cards" (Pursue the Past). Texto oficial em .listas/oficiais-revisadas.json
// (Oracle do Forge, 12/10/2026). Cada teste de regra falha no leitor/motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';
import { loadModules } from './_load.mjs';

const { leitor: L, scripts: S } = loadModules();
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const mv = m => [...m.matchAll(/\{([^}]+)\}/g)].reduce((n, x) => n + (/^\d+$/.test(x[1]) ? +x[1] : x[1] === 'X' ? 0 : 1), 0);
const carta = n => { const c = OF.find(x => x.name === n); assert.ok(c, n); return { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: mv(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [...new Set(c.mana_cost.match(/[WUBRG]/g) || [])], ...(c.power ? { power: c.power, toughness: c.toughness } : {}) }; };
const NOMES = ['Hickory Woodlot', 'Deep Analysis', 'Big Score', 'Archaeomancer', 'Toxin Analysis', 'Campfire', "Bonder's Ornament", "Reckoner's Bargain", 'Pursue the Past', 'Laughing Mad', 'Emerge Unscathed'];
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: mv(mana_cost), keywords: [], oracle_text: '', colors: [...new Set(mana_cost.match(/[WUBRG]/g) || [])], ...extra });
const cards = { ...Object.fromEntries(NOMES.map(n => [n, carta(n)])), Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2' }), Choque: c0('Choque', 'Instant', '{R}'), Arte: c0('Arte', 'Artifact', '{3}') };
const ex = { action: 'etb', target: 'none', expect: { attached: false } };
const scripts = { ...Object.fromEntries(NOMES.map(n => [n, { ...L.ler(carta(n)).script, example: ex }])), Choque: { name: 'Choque', effects: [{ do: 'damage', amount: 2, target: 'any' }], example: { target: 'enemy-creature', expect: { damaged: 2 } } } };
function mesaX(a = [], b = [], seed = 47) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: baralho([...b, 'Mountain', 'Plains']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolveSo = s => act(act(s, { t: 'pass', p: s.turn.priority }), { t: 'pass', p: 1 - s.turn.priority });
const resolve = s => tudo(resolveSo(s));

test('LT30 · Hickory Woodlot: entra virada com dois marcadores de esgotamento; cada {G}{G} tira um; sem marcador, é sacrificada (605.1a)', () => {
  let s = mesaX(['Hickory Woodlot']), hw;
  [s, hw] = poe(s, 0, 'Hickory Woodlot', 'hand'); s = act(s, { t: 'play_land', p: 0, oid: hw });
  assert.equal(s.objects[hw].tapped, true); assert.equal(s.objects[hw].counters.depletion, 2);
  let t = J(s); t.objects[hw].tapped = false;
  t = act(t, legais(t, 0, x => x.t === 'activate' && x.oid === hw)[0]);
  assert.equal(t.players[0].pool.G, 2); assert.equal(t.objects[hw].counters.depletion, 1); assert.equal(t.objects[hw].zone, 'battlefield'); assert.equal(t.stack.length, 0, 'habilidade de mana: sem pilha');
  t = J(t); t.objects[hw].tapped = false; t = act(t, legais(t, 0, x => x.t === 'activate' && x.oid === hw)[0]);
  assert.equal(t.players[0].pool.G, 4); assert.equal(t.objects[hw].zone, 'graveyard', 'sem marcadores: sacrificada');
});

test('LT30 · Deep Analysis: lampejo do passado por {1}{U} e 3 de vida; com 2 de vida, não', () => {
  let s = mesaX(['Deep Analysis']), da;
  [s, da] = poe(s, 0, 'Deep Analysis', 'graveyard');
  const m = comMana(s, 'UU'), a = legais(m, 0, x => x.t === 'cast' && x.oid === da && x.flashback)[0]; assert.ok(a, 'lampejo oferecido');
  const v = m.players[0].life, h = m.zones[0].hand.length;
  const t = resolve(act(m, a)); assert.equal(t.players[0].life, v - 3); assert.equal(t.zones[0].hand.length, h + 2); assert.equal(t.objects[da].zone, 'exile');
  const p = J(m); p.players[0].life = 2; assert.equal(legais(p, 0, x => x.t === 'cast' && x.oid === da && x.flashback).length, 0, '119.4');
});

test('LT30 · Big Score: descartar uma carta é custo adicional (escolhido pelo jogador); com a mão só com ela, não conjura', () => {
  let s = mesaX(['Big Score', 'Urso']), bs, u;
  [s, bs] = poe(s, 0, 'Big Score', 'hand'); [s, u] = poe(s, 0, 'Urso', 'hand');
  const m = comMana(s, 'RRRR'), a = legais(m, 0, x => x.t === 'cast' && x.oid === bs && x.pay && [].concat(x.pay.discard)[0] === u)[0]; assert.ok(a);
  const t = act(m, a); assert.equal(t.objects[u].zone, 'graveyard', 'descartada na conjuração');
  const r = resolve(t); assert.equal(r.zones[0].battlefield.filter(o => r.objects[o].name === 'Treasure').length, 2);
  let so = J(m); for (const o of so.zones[0].hand.slice()) if (o !== bs) { so.zones[0].hand = so.zones[0].hand.filter(x => x !== o); so.zones[0].library.push(o); so.objects[o].zone = 'library'; }
  assert.equal(legais(so, 0, x => x.t === 'cast' && x.oid === bs).length, 0, 'sem outra carta para descartar');
});

test('LT30 · Archaeomancer devolve só instantânea ou feitiço do seu cemitério; Toxin Analysis dá toque mortífero e vínculo com a vida', () => {
  let s = mesaX(['Archaeomancer', 'Choque', 'Urso', 'Toxin Analysis'], ['Urso']), ar, ch, u, ta, meu, dele;
  [s, ar] = poe(s, 0, 'Archaeomancer', 'hand'); [s, ch] = poe(s, 0, 'Choque', 'graveyard'); [s] = poe(s, 0, 'Choque', 'graveyard'); [s, u] = poe(s, 0, 'Urso', 'graveyard'); [s, ta] = poe(s, 0, 'Toxin Analysis', 'hand'); [s, meu] = poe(s, 0, 'Urso'); [s, dele] = poe(s, 1, 'Urso');
  const m = comMana(s, 'UUUU');
  let t = act(m, legais(m, 0, x => x.t === 'cast' && x.oid === ar)[0]); t = passaAte(resolveSo(t), x => !!x.pending || !x.stack.length);
  assert.equal(t.pending && t.pending.kind, 'pick_target', 'o gatilho de entrada pede o alvo');
  const alvos = t.pending.options.map(o => o.oid); assert.ok(alvos.includes(ch) && !alvos.includes(u), 'só a instantânea');
  t = tudo(act(t, legais(t, 0, x => x.t === 'pick_target' && t.pending.options[x.index].oid === ch)[0]));
  assert.equal(t.objects[ch].zone, 'hand');
  const b = comMana(s, 'B'), r = resolve(act(b, legais(b, 0, x => x.t === 'cast' && x.oid === ta && x.targets[0].oid === meu)[0]));
  assert.ok(E.hasKeyword(r, r.objects[meu], 'deathtouch') && E.hasKeyword(r, r.objects[meu], 'lifelink'));
});

test("LT30 · Bonder's Ornament: cada jogador que controla um Ornament compra; Pursue the Past: pode descartar e, se descartar, compra duas", () => {
  let s = mesaX(["Bonder's Ornament", 'Pursue the Past', 'Urso'], ["Bonder's Ornament"]), bo, bo2, pp, u;
  [s, bo] = poe(s, 0, "Bonder's Ornament"); [s, bo2] = poe(s, 1, "Bonder's Ornament"); [s, pp] = poe(s, 0, 'Pursue the Past', 'hand'); [s, u] = poe(s, 0, 'Urso', 'hand');
  const m = comMana(s, 'CCCC'), ha = m.zones[0].hand.length, hb = m.zones[1].hand.length;
  let t = resolve(act(m, legais(m, 0, x => x.t === 'activate' && x.oid === bo)[0]));
  assert.equal(t.zones[0].hand.length, ha + 1); assert.equal(t.zones[1].hand.length, hb + 1, 'o oponente com Ornament também compra');
  const r = comMana(s, 'RW'), v = r.players[0].life;
  let q = resolveSo(act(r, legais(r, 0, x => x.t === 'cast' && x.oid === pp)[0]));
  assert.equal(q.players[0].life, v + 2); assert.equal(q.pending.kind, 'pick'); assert.equal(q.pending.min, 0);
  const h = q.zones[0].hand.length; const sem = tudo(act(q, { t: 'pick_done', p: 0 })); assert.equal(sem.zones[0].hand.length, h, 'recusou: nada');
  let com = act(q, { t: 'pick', p: 0, oid: u }); if (com.pending && com.pending.kind === 'pick') com = act(com, { t: 'pick_done', p: 0 }); com = tudo(com); assert.equal(com.objects[u].zone, 'graveyard'); assert.equal(com.zones[0].hand.length, h - 1 + 2, 'descartou e comprou duas');
});

test("LT30 · Reckoner's Bargain: ganha vida igual ao valor de mana da permanente sacrificada (608.2h)", () => {
  let s = mesaX(["Reckoner's Bargain", 'Arte']), rb, ar;
  [s, rb] = poe(s, 0, "Reckoner's Bargain", 'hand'); [s, ar] = poe(s, 0, 'Arte');
  const m = comMana(s, 'BB'), v = m.players[0].life, h = m.zones[0].hand.length;
  const t = resolve(act(m, legais(m, 0, x => x.t === 'cast' && x.oid === rb && x.pay && [].concat(x.pay.sacrifice)[0] === ar)[0]));
  assert.equal(t.objects[ar].zone, 'graveyard'); assert.equal(t.players[0].life, v + 3, 'Arte custa {3}'); assert.equal(t.zones[0].hand.length, h - 1 + 2);
});

test('LT30 · Campfire em Commander: o comandante no cemitério volta para a mão e o cemitério é embaralhado no grimório; fora de Commander, só embaralha', () => {
  const k = (name, type_line, x = {}) => ({ name, type_line, mana_cost: '', cmc: 0, keywords: [], oracle_text: '', colors: [], ...x });
  const CS = { ...CARTAS, Campfire: carta('Campfire'), Capitao: { ...k('Capitao', 'Legendary Creature — Human Soldier', { mana_cost: '{1}{R}', cmc: 2, colors: ['R'], power: '2', toughness: '2' }), color_identity: ['R'] }, Mountain: k('Mountain', 'Basic Land — Mountain', { oracle_text: '({T}: Add {R}.)' }) };
  const deck = [{ name: 'Capitao', qty: 1, zone: 'commander' }, { name: 'Campfire', qty: 4, zone: 'main' }, { name: 'Mountain', qty: 60, zone: 'main' }];
  let s = E.createGame({ format: 'commander', seed: 3, mode: 'full', cards: CS, scripts: { Campfire: scripts.Campfire }, first: 0, players: [{ name: 'A', deck }, { name: 'B', deck: [{ name: 'Mountain', qty: 60, zone: 'main' }] }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  const cap = s.zones[0].command[0]; s = J(s); s.zones[0].command = []; s.zones[0].graveyard.push(cap); s.objects[cap].zone = 'graveyard';
  let cf; [s, cf] = poe(s, 0, 'Campfire'); const m = comMana(s, 'CC'), lib = m.zones[0].library.length, gy = m.zones[0].graveyard.length;
  const t = tudo(resolveSo(act(m, legais(m, 0, x => x.t === 'activate' && x.oid === cf && x.index === 1)[0])), x => x.pending.kind === 'commander_zone' ? { t: 'commander_zone', p: 0, yes: false } : legais(x, x.pending.p)[0]); // 903.9: o dono pode deixar na mão
  assert.equal(t.objects[cap].zone, 'hand', 'comandante na mão'); assert.equal(t.objects[cf].zone, 'exile', 'exilada como custo');
  assert.equal(t.zones[0].graveyard.length, 0); assert.equal(t.zones[0].library.length, lib + gy - 1, 'o resto do cemitério foi para o grimório (o comandante não)');
});

test('achado da revisão do lote XXI · Laughing Mad: no lampejo do passado, o jogador escolhe a carta do custo adicional de descarte (601.2b)', () => {
  let s = mesaX(['Laughing Mad', 'Urso', 'Arte']), lm, u, ar;
  [s, lm] = poe(s, 0, 'Laughing Mad', 'graveyard'); [s, u] = poe(s, 0, 'Urso', 'hand'); [s, ar] = poe(s, 0, 'Arte', 'hand');
  const m = comMana(s, 'RRRR'), os = legais(m, 0, x => x.t === 'cast' && x.oid === lm && x.flashback);
  assert.ok(os.some(x => x.pay && [].concat(x.pay.discard)[0] === u) && os.some(x => x.pay && [].concat(x.pay.discard)[0] === ar), 'uma oferta por carta descartável');
  const t = act(m, os.find(x => x.pay && [].concat(x.pay.discard)[0] === ar)); assert.equal(t.objects[ar].zone, 'graveyard'); assert.equal(t.objects[u].zone, 'hand');
});

test('achado da revisão do lote XXI · Emerge Unscathed: a cor é escolhida na resolução e a proteção chega ao alvo (antes a mágica resolvia sem efeito)', () => {
  let s = mesaX(['Emerge Unscathed', 'Urso'], ['Choque']), eu, u;
  [s, eu] = poe(s, 0, 'Emerge Unscathed', 'hand'); [s, u] = poe(s, 0, 'Urso');
  let t = resolveSo(act(comMana(s, 'W'), legais(comMana(s, 'W'), 0, x => x.t === 'cast' && x.oid === eu && x.targets[0].oid === u)[0]));
  assert.equal(t.pending && t.pending.kind, 'choose_color', 'pede a cor ao resolver');
  t = tudo(act(t, { t: 'choose_color', p: 0, color: 'R' }));
  assert.deepEqual(E.protections(t, t.objects[u]), ['R'], 'proteção contra vermelho');
});

test('achado da revisão do lote XXI · 903.9b: comandante que iria da zona de comando para a mão (Campfire) pode ficar na zona de comando', () => {
  const k = (name, type_line, x = {}) => ({ name, type_line, mana_cost: '', cmc: 0, keywords: [], oracle_text: '', colors: [], ...x });
  const CS = { ...CARTAS, Campfire: carta('Campfire'), Capitao: { ...k('Capitao', 'Legendary Creature — Human Soldier', { mana_cost: '{1}{R}', cmc: 2, colors: ['R'], power: '2', toughness: '2' }), color_identity: ['R'] }, Mountain: k('Mountain', 'Basic Land — Mountain', { oracle_text: '({T}: Add {R}.)' }) };
  const deck = [{ name: 'Capitao', qty: 1, zone: 'commander' }, { name: 'Campfire', qty: 4, zone: 'main' }, { name: 'Mountain', qty: 60, zone: 'main' }];
  let s = E.createGame({ format: 'commander', seed: 3, mode: 'full', cards: CS, scripts: { Campfire: scripts.Campfire }, first: 0, players: [{ name: 'A', deck }, { name: 'B', deck: [{ name: 'Mountain', qty: 60, zone: 'main' }] }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  const cap = s.zones[0].command[0]; let cf; [s, cf] = poe(s, 0, 'Campfire'); const m = comMana(s, 'CC');
  let t = resolveSo(act(m, legais(m, 0, x => x.t === 'activate' && x.oid === cf && x.index === 1)[0]));
  assert.equal(t.pending && t.pending.kind, 'commander_zone', 'o dono decide');
  assert.equal(tudo(act(t, { t: 'commander_zone', p: 0, yes: true })).objects[cap].zone, 'command');
  assert.equal(tudo(act(t, { t: 'commander_zone', p: 0, yes: false })).objects[cap].zone, 'hand');
});

test('M-348 · as 19 do lote XXI revisadas jogam (decisão A)', () => {
  for (const n of ['Campfire', "Bonder's Ornament", "Reckoner's Bargain", 'Deep Analysis', 'Archaeomancer', 'Toxin Analysis', 'Pursue the Past', 'Hickory Woodlot', 'Sandstone Needle', 'Big Score', 'Abandon Attachments', 'Laughing Mad', 'Bitter Reunion', 'Electric Revelation', 'Remote Farm', 'Acorn Harvest', 'Assault Strobe', 'Emerge Unscathed', 'Thrill of Possibility'])
    assert.equal(S.coverage(carta(n)).level, 'completo', n + ' joga');
});
