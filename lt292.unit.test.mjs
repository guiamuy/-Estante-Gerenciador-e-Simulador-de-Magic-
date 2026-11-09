// M-613 · LT270 · rotina Motor contínuo · revisão em lote 8: as 23 cartas `lida` de maior valor nos competitivos de 60 cartas
// (cobertura/<formato>.json do ramo catalogo, 08/11/2026: Modern, Legacy, Pioneer, Standard, Vintage e Construído), conferidas frase a
// frase por dois revisores independentes, uma partida por carta, e aprovadas com o texto da API da Scryfall de 08/11/2026 (guardado em
// .listas/oficiais-revisadas.json). Vibrant Outburst ficou de fora (115.3: as duas palavras "target" podem escolher a mesma criatura,
// o motor nunca oferece 3 de dano e virar o mesmo alvo). As partidas abaixo são as dos revisores, aqui pelo caminho do app: nenhum
// script é passado para as cartas do lote, elas jogam pelo script lido e aprovado (SC.scriptLido). Falham antes da M-613.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';

const M = loadModules(), E = M.engine, S = M.scripts, SF = M.scryfall;
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
export const LOTE8 = ["Urza's Saga", 'Boseiju, Who Endures', 'Dark Matter Manipulator', 'Sink into Stupor // Soporific Springs', "Stitcher's Supplier",
  'Icetill Explorer', 'Strategic Betrayal', 'Blood Moon', 'Seam Rip', 'Haywire Mite', 'Null Rod', 'Sokenzan, Crucible of Defiance', 'Emry, Lurker of the Loch',
  'Hexing Squelcher', 'Shoot the Sheriff', 'Thundertrap Trainer', 'Yavimaya, Cradle of Growth', 'Takenuma, Abandoned Mire', 'Eiganjo, Seat of the Empire',
  'Portable Hole', 'Sheoldred, the Apocalypse', 'Griselbrand', 'Urborg, Tomb of Yawgmoth'];
const valor = c => [...String(c || '').matchAll(/\{([^}]+)\}/g)].reduce((n, [, x]) => n + (/^\d+$/.test(x) ? +x : x === 'X' ? 0 : 1), 0);
const cores = c => [...new Set(String(c || '').match(/[WUBRG]/g) || [])];
/** A carta como a Scryfall a entrega (dupla face com `card_faces`), montada pelo app com normalizeCard. */
const carta = n => { const o = OF.find(x => x.name === n); assert.ok(o, `${n} em .listas/oficiais-revisadas.json`);
  const mc = o.faces ? o.faces[0].mana_cost : o.mana_cost;
  const crua = o.faces ? { object: 'card', name: o.name, layout: o.layout, keywords: o.keywords || [], type_line: o.type_line, card_faces: o.faces }
    : { object: 'card', layout: 'normal', keywords: [], ...o };
  return SF.normalizeCard({ ...crua, cmc: valor(mc), colors: cores(mc) }); };

test('M-613 · as 23 cartas do lote 8 jogam no app: texto da Scryfall de 08/11 guardado, assinatura de APROVADAS igual e cobertura completa', () => {
  for (const n of LOTE8) {
    const c = carta(n), o = OF.find(x => x.name === n);
    assert.match(o.fonte, /api\.scryfall\.com/, `${n}: texto da Scryfall`); assert.equal(o.consulta, '2026-11-08', `${n}: data da consulta`);
    assert.ok(S.APROVADAS[n], `${n} em APROVADAS`); assert.equal(S.APROVADAS[n].leva, 'M-613');
    assert.equal(S.APROVADAS[n].texto, S.assinaturaRevisao(c), `${n}: a assinatura é a do texto revisado`);
    assert.equal(S.coverage(c, S.SCRIPTS, n).level, 'completo', `${n} joga`);
    assert.ok(S.scriptLido(c), `${n}: o app joga pelo script lido`);
  }
  assert.ok(!S.APROVADAS['Vibrant Outburst'], 'Vibrant Outburst recusada na revisão (115.3)');
});

// ── partidas: o app monta o script de cada carta do lote sozinho ─────────────────────────────────────────────────────────────────
const C = Object.fromEntries(LOTE8.map(n => [n, carta(n)]));
for (const [n, k] of Object.entries({ Island: 'U', Mountain: 'R', Forest: 'G', Plains: 'W', Swamp: 'B' })) C[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: valor(mana_cost), keywords: [], oracle_text: '', colors: cores(mana_cost), ...extra });
const ex = { example: { target: 'none', expect: { selfLife: 0 } } };
Object.assign(C, {
  Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2' }),
  Ladino: c0('Ladino', 'Creature — Human Rogue', '{1}{B}', { power: '2', toughness: '2' }),
  Bruxo: c0('Bruxo', 'Creature — Human Warlock', '{1}{B}', { power: '2', toughness: '2' }),
  Rei: c0('Rei', 'Legendary Creature — Human Noble', '{1}{W}', { power: '2', toughness: '2' }),
  Gigante: c0('Gigante', 'Creature — Giant', '{4}{R}', { power: '5', toughness: '5' }),
  Totem: c0('Totem', 'Artifact', '{2}'), Aura: c0('Aura', 'Enchantment', '{1}{W}'),
  Ornithopter: c0('Ornithopter', 'Artifact Creature — Thopter', '{0}', { power: '0', toughness: '2', keywords: ['Flying'], oracle_text: 'Flying' }),
  Constelacao: c0('Constelacao', 'Enchantment Creature — Nymph', '{1}{G}', { power: '2', toughness: '2' }),
  Cidade: c0('Cidade', 'Land', '', { oracle_text: '{T}: Add {C}.' }), Neve: c0('Neve', 'Snow Land — Forest', '', { oracle_text: '({T}: Add {G}.)' }),
  Anel: c0('Anel', 'Artifact', '{1}', { oracle_text: '{T}: Add {C}.' }), Pedra: c0('Pedra', 'Artifact', '{2}', { oracle_text: '{1}, {T}: Draw a card.' }),
  Bomba: c0('Bomba', 'Artifact', '{1}{R}'), SemCusto: c0('SemCusto', 'Artifact', ''),
  Planeswalker: c0('Planeswalker', 'Legendary Planeswalker — Test', '{3}', { loyalty: '3' }),
  Divination: c0('Divination', 'Sorcery', '{2}{U}', { oracle_text: 'Draw two cards.' }),
  Shock: c0('Shock', 'Instant', '{R}', { oracle_text: 'Shock deals 2 damage to any target.' }),
  Counterspell: c0('Counterspell', 'Instant', '{U}{U}', { oracle_text: 'Counter target spell.' }),
  Naturalize: c0('Naturalize', 'Instant', '{1}{G}', { oracle_text: 'Destroy target artifact or enchantment.' }),
});
const SEM_TEXTO = ['Urso', 'Ladino', 'Bruxo', 'Rei', 'Gigante', 'Totem', 'Aura', 'Constelacao', 'Bomba', 'SemCusto', 'Planeswalker', 'Ornithopter'];
const J = x => JSON.parse(JSON.stringify(x));
const igual = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m); // os objetos do motor vêm de outro contexto (vm): compara pelo conteúdo
const act = (s, a) => { const r = E.apply(s, a); if (r.error) throw new Error(JSON.stringify(r.error)); return r.state; };
const legais = (s, p, f = () => true) => E.legalActions(s, p).filter(f);
function passaAte(s, fim, max = 400) {
  for (let i = 0; i < max && !fim(s); i++) { const pd = s.pending;
    if (pd && pd.kind === 'discard' && pd.reason !== 'effect') s = act(s, { t: 'discard', p: pd.p, oid: s.zones[pd.p].hand[0] });
    else if (pd && pd.kind === 'attackers') s = act(s, { t: 'attack', p: pd.p, attackers: [] });
    else if (pd && pd.kind === 'blockers') s = act(s, { t: 'block', p: pd.p, blocks: [] });
    else if (pd) return s; else s = act(s, { t: 'pass', p: s.turn.priority }); }
  return s;
}
function roda(s, escolhe = null) {
  for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pd = s.pending;
    if (pd) { const op = legais(s, pd.p); s = act(s, (escolhe && escolhe(s, op, pd)) || op[0]); } else s = act(s, { t: 'pass', p: s.turn.priority }); }
  return s;
}
function poe(s, p, name, zone = 'battlefield', extra = {}) {
  s = J(s);
  const from = ['library', 'hand', 'graveyard'].map(z => s.zones[p][z]).find(z => z.some(o => s.objects[o].name === name));
  if (!from) throw new Error(name + ' ausente');
  const oid = from.find(o => s.objects[o].name === name); from.splice(from.indexOf(oid), 1); s.zones[p][zone].push(oid);
  Object.assign(s.objects[oid], { zone, sick: false, tapped: false, controller: p, ...extra }); return [s, oid];
}
const comMana = (s, m, p = 0) => { s = J(s); for (const c of m) s.players[p].pool[c]++; return s; };
const mill = (s, p, n) => { const x = J(s); for (let i = 0; i < n; i++) { const o = x.zones[p].library.shift(); x.zones[p].graveyard.push(o); x.objects[o].zone = 'graveyard'; } return x; };
const nomesEm = (s, p, z) => s.zones[p][z].map(o => s.objects[o].name);
/** Mesa de teste: as cartas do lote SEM script passado (o app lê e aprova); as auxiliares sem texto ganham o script vazio. */
function mesa(a, b = [], seed = 18) {
  const scripts = {}; for (const n of SEM_TEXTO) scripts[n] = { name: n, ...ex };
  const d = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts, first: 0,
    players: [{ name: 'A', deck: d([...a, 'Urso', 'Gigante', 'Divination', 'Island', 'Mountain', 'Swamp', 'Forest', 'Plains']) }, { name: 'B', deck: d([...b, 'Urso', 'Island', 'Swamp', 'Forest']) }] });
  for (const n of a.concat(b)) if (LOTE8.includes(n)) assert.ok(!S.SCRIPTS[n] && s.facts[n] && s.facts[n].script, `${n} joga pelo script lido (sem script à mão)`);
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = J(s); for (const oid of s.zones[0].hand.slice()) { s.zones[0].hand.splice(s.zones[0].hand.indexOf(oid), 1); s.zones[0].library.unshift(oid); s.objects[oid].zone = 'library'; }
  return s;
}
const meuMain = s => passaAte(passaAte(s, q => q.turn.active === 1 && q.turn.step === 'main1'), q => q.turn.active === 0 && q.turn.step === 'main1');

test("M-613 · Urza's Saga: I dá {T}: {C}; II cria o Construto que conta artefatos; III busca só artefato de custo {0} ou {1} e sacrifica", () => {
  const N = "Urza's Saga";
  let s = mesa([N, 'Anel', 'Pedra', 'Ornithopter', 'SemCusto', 'Bomba']), us; [s, us] = poe(s, 0, N, 'hand');
  s = roda(act(s, legais(s, 0, a => a.oid === us)[0]));
  igual(s.objects[us].counters, { lore: 1 }); assert.ok(legais(s, 0, a => a.t === 'tap_mana' && a.oid === us).length, 'capítulo I: {T}: {C}');
  s = roda(meuMain(s)); assert.equal(s.objects[us].counters.lore, 2);
  [s] = poe(s, 0, 'Anel'); s = comMana(s, 'UU');
  s = roda(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === us)[0]));
  const k = s.zones[0].battlefield.find(o => s.objects[o].name === 'Construct'); assert.ok(k, 'Construto criado');
  assert.equal(E.stats(s, s.objects[k]).power, 2, 'Anel + o próprio Construto');
  let ofertas; s = roda(meuMain(s), (x, op) => { const pk = op.filter(a => a.t === 'pick'); if (pk.length) ofertas = new Set(pk.map(a => x.objects[a.oid].name)); return pk[0] || op[0]; });
  igual([...ofertas].sort(), ['Anel', 'Ornithopter'], 'nem sem custo, nem {1}{R}, nem {2}');
  assert.equal(s.objects[us].zone, 'graveyard', 'sacrificada depois do III'); assert.equal(E.stats(s, s.objects[k]).power, 3);
});

test('M-613 · Boseiju: canalizar da mão contra artefato, encantamento ou não básico do oponente; o dono busca terreno com tipo básico', () => {
  const N = 'Boseiju, Who Endures';
  let s = mesa([N, 'Totem', 'Rei'], ['Totem', 'Aura', 'Cidade', 'Neve']), bo, ci;
  [s, bo] = poe(s, 0, N, 'hand'); [s] = poe(s, 0, 'Totem'); [s] = poe(s, 1, 'Totem'); [s] = poe(s, 1, 'Aura'); [s, ci] = poe(s, 1, 'Cidade'); [s] = poe(s, 1, 'Island'); [s] = poe(s, 1, 'Urso');
  s = comMana(s, 'G'); assert.equal(legais(s, 0, a => a.oid === bo && a.t === 'activate').length, 0, '{1}{G} sem lendária');
  let [s2] = poe(s, 0, 'Rei'); const at = legais(s2, 0, a => a.oid === bo && a.t === 'activate');
  igual(at.map(a => s2.objects[a.targets[0].oid].name).sort(), ['Aura', 'Cidade', 'Totem'], 'nem o Totem de A, nem Ilha, nem criatura');
  let r = act(s2, at.find(a => a.targets[0].oid === ci)); assert.equal(r.objects[bo].zone, 'graveyard');
  while (!r.pending) r = act(r, { t: 'pass', p: r.turn.priority });
  assert.equal(r.pending.p, 1, 'quem busca é o controlador do alvo'); assert.equal(r.pending.min, 0, 'busca opcional');
  r = roda(act(r, { t: 'pick', p: 1, oid: r.pending.from.find(o => r.objects[o].name === 'Neve') }));
  assert.equal(r.objects[ci].zone, 'graveyard'); assert.ok(r.zones[1].battlefield.some(o => r.objects[o].name === 'Neve'), 'terreno não básico com tipo básico serve');
});

test('M-613 · Dark Matter Manipulator e Stitcher\'s Supplier: moer ao entrar (e ao morrer); +2/+0 por grupo de sete no seu cemitério', () => {
  let s = mesa(['Dark Matter Manipulator']), d; [s, d] = poe(s, 0, 'Dark Matter Manipulator', 'hand'); s = comMana(s, 'BB');
  s = roda(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === d)[0]));
  assert.equal(s.zones[0].graveyard.length, 3);
  for (const [n, p] of [[6, 1], [7, 3], [14, 5]]) { const x = mill(s, 0, n - 3); assert.equal(E.stats(x, x.objects[d]).power, p, `${n} no cemitério`); }
  const y = mill(s, 1, 14); assert.equal(E.stats(y, y.objects[d]).power, 1, 'o cemitério do oponente não conta');
  let t = mesa(["Stitcher's Supplier", 'Shock']), st, sh; [t, st] = poe(t, 0, "Stitcher's Supplier", 'hand'); t = comMana(t, 'B');
  t = roda(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === st)[0])); assert.equal(t.zones[0].graveyard.length, 3);
  [t, sh] = poe(t, 0, 'Shock', 'hand'); t = comMana(t, 'R');
  t = roda(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === sh && a.targets?.[0]?.oid === st)[0]));
  assert.equal(t.objects[st].zone, 'graveyard'); assert.equal(t.zones[0].graveyard.length, 8, '3 + Shock + Supplier + 3');
});

test('M-613 · Sink into Stupor // Soporific Springs: devolve mágica ou não-terreno do oponente à mão do dono; a face terreno pede 3 de vida', () => {
  const N = 'Sink into Stupor // Soporific Springs';
  let s = mesa([N, 'Totem']), sk, tA; [s, sk] = poe(s, 0, N, 'hand'); [s] = poe(s, 0, 'Urso'); [s] = poe(s, 1, 'Urso'); [s] = poe(s, 1, 'Island');
  [s, tA] = poe(s, 0, 'Totem'); s = J(s); s.objects[tA].controller = 1; s.zones[0].battlefield.splice(s.zones[0].battlefield.indexOf(tA), 1); s.zones[1].battlefield.push(tA);
  s = comMana(s, 'UUU'); const cs = legais(s, 0, a => a.t === 'cast' && a.oid === sk);
  igual(cs.map(a => s.objects[a.targets[0].oid].name).sort(), ['Totem', 'Urso'], 'só não-terreno do oponente');
  const r = roda(act(s, cs.find(a => a.targets[0].oid === tA))); assert.ok(r.zones[0].hand.includes(tA), 'volta à mão do DONO');
  const l = act(s, { t: 'play_land', p: 0, oid: sk, face: 'verso' }); assert.equal(l.pending.kind, 'may_pay');
  const pago = act(l, { t: 'pay', p: 0 }), nao = act(l, { t: 'decline', p: 0 });
  assert.equal(pago.players[0].life, l.players[0].life - 3); assert.equal(pago.objects[sk].tapped, false); assert.equal(nao.objects[sk].tapped, true);
});

test('M-613 · Icetill Explorer: dois terrenos por turno, inclusive do cemitério; terreno seu que entra mói 1', () => {
  let s = mesa(['Icetill Explorer']), f, gy;
  [s] = poe(s, 0, 'Icetill Explorer'); [s, f] = poe(s, 0, 'Forest', 'hand'); [s, gy] = poe(s, 0, 'Mountain', 'graveyard');
  const lib = s.zones[0].library.length;
  assert.ok(legais(s, 0, a => a.t === 'play_land' && a.oid === gy).length, 'terreno do cemitério');
  s = roda(act(s, { t: 'play_land', p: 0, oid: gy })); assert.equal(lib - s.zones[0].library.length, 1);
  s = roda(act(s, { t: 'play_land', p: 0, oid: f })); assert.equal(lib - s.zones[0].library.length, 2);
  assert.equal(legais(s, 0, a => a.t === 'play_land').length, 0, 'só dois por turno');
});

test('M-613 · Strategic Betrayal: o oponente escolhe a criatura que exila e o cemitério dele vai junto', () => {
  let s = mesa(['Strategic Betrayal'], ['Ladino']), d, u1, u2; [s, d] = poe(s, 0, 'Strategic Betrayal', 'hand'); [s, u1] = poe(s, 1, 'Urso'); [s, u2] = poe(s, 1, 'Ladino');
  s = mill(s, 1, 5); s = comMana(s, 'BBB');
  const c = legais(s, 0, a => a.t === 'cast' && a.oid === d); igual([...new Set(c.map(a => a.targets[0].player))], [1]);
  s = roda(act(s, c[0]), (x, op, pd) => { assert.equal(pd.p, 1, 'quem escolhe é o oponente'); return op.find(a => a.oid === u2); });
  assert.equal(s.objects[u2].zone, 'exile'); assert.equal(s.objects[u1].zone, 'battlefield'); assert.equal(s.zones[1].graveyard.length, 0);
});

test('M-613 · Seam Rip e Portable Hole: exilam não-terreno do oponente de valor 2 ou menos até saírem', () => {
  for (const N of ['Seam Rip', 'Portable Hole']) {
    let s = mesa([N, 'Naturalize'], ['Gigante', 'Ornithopter', 'Bomba']), d, u, nat;
    [s, d] = poe(s, 0, N, 'hand'); [s, u] = poe(s, 1, 'Urso'); [s] = poe(s, 1, 'Gigante'); [s] = poe(s, 1, 'Ornithopter'); [s] = poe(s, 1, 'Island'); [s] = poe(s, 0, 'Urso'); [s] = poe(s, 1, 'Bomba');
    s = comMana(s, 'WW'); s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === d)[0]);
    let nomes; s = roda(s, (x, op, pd) => { if (!pd.options) return null; nomes = pd.options.map(o => x.objects[o.oid].name + '/' + x.objects[o.oid].controller); return op[pd.options.findIndex(o => o.oid === u)]; });
    igual(nomes.sort(), ['Bomba/1', 'Ornithopter/1', 'Urso/1'], `${N}: nem terreno, nem valor 5, nem a criatura de A`);
    assert.equal(s.objects[u].zone, 'exile');
    [s, nat] = poe(s, 0, 'Naturalize', 'hand'); s = comMana(s, 'GG');
    s = roda(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === nat && a.targets?.[0]?.oid === d)[0]));
    assert.equal(s.objects[u].zone, 'battlefield', `${N}: volta quando sai`); assert.equal(s.objects[u].controller, 1);
  }
});

test('M-613 · Haywire Mite: {G} e sacrificar exila artefato ou encantamento não-criatura; ao morrer, 2 de vida', () => {
  let s = mesa(['Haywire Mite', 'Totem'], ['Totem', 'Aura', 'Ornithopter', 'Constelacao']), m, au;
  [s, m] = poe(s, 0, 'Haywire Mite'); [s] = poe(s, 0, 'Totem'); [s] = poe(s, 1, 'Totem'); [s, au] = poe(s, 1, 'Aura'); [s] = poe(s, 1, 'Ornithopter'); [s] = poe(s, 1, 'Constelacao');
  s = comMana(s, 'G'); const at = legais(s, 0, a => a.oid === m && a.t === 'activate');
  igual(at.map(a => s.objects[a.targets[0].oid].name).sort(), ['Aura', 'Totem', 'Totem'], 'sem criaturas');
  const v = s.players[0].life; let r = act(s, at.find(a => a.targets[0].oid === au));
  assert.equal(r.objects[m].zone, 'graveyard'); r = roda(r);
  assert.equal(r.objects[au].zone, 'exile'); assert.equal(r.players[0].life, v + 2);
});

test('M-613 · Null Rod: habilidades ativadas de artefatos param, inclusive as de mana; Griselbrand paga 7 de vida e compra 7', () => {
  let s = mesa(['Null Rod', 'Anel', 'Pedra', 'Griselbrand']), nr, an, g;
  [s, g] = poe(s, 0, 'Griselbrand');
  assert.equal(legais(J({ ...s, players: s.players.map((p, i) => i ? p : { ...p, life: 6 }) }), 0, y => y.t === 'activate' && y.oid === g).length, 0, 'com 6 de vida não paga 7');
  const f = roda(act(s, legais(s, 0, x => x.t === 'activate' && x.oid === g)[0])); assert.equal(f.players[0].life, 13); assert.equal(f.zones[0].hand.length, 7);
  [s, an] = poe(s, 0, 'Anel'); [s] = poe(s, 0, 'Pedra'); [s] = poe(s, 0, 'Island');
  assert.ok(legais(s, 0, a => a.t === 'tap_mana' && a.oid === an).length, 'antes, o Anel gera mana');
  [s, nr] = poe(s, 0, 'Null Rod', 'hand'); s = comMana(s, 'BB');
  s = roda(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === nr)[0]));
  igual(legais(s, 0, a => a.t === 'activate').map(a => s.objects[a.oid].name), ['Griselbrand'], 'só o não artefato ativa');
  assert.ok(!legais(s, 0, a => a.t === 'tap_mana' && a.oid === an).length, 'mana de artefato também para');
});

test('M-613 · Emry: afinidade por artefatos, mói 4 e deixa conjurar do cemitério só o artefato escolhido', () => {
  const N = 'Emry, Lurker of the Loch';
  let s = mesa([N, 'Anel', 'Pedra']), em, p3, dv;
  [s, em] = poe(s, 0, N, 'hand'); [s] = poe(s, 0, 'Anel', 'battlefield', { tapped: true }); [s] = poe(s, 0, 'Pedra', 'battlefield', { tapped: true });
  s = comMana(s, 'U'); s = roda(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === em)[0]));
  assert.equal(s.zones[0].graveyard.length, 4, 'mói 4');
  assert.equal(legais(s, 0, a => a.t === 'activate' && a.oid === em).length, 0, 'enjoo de invocação');
  [s, p3] = poe(s, 0, 'Pedra', 'graveyard'); [s, dv] = poe(s, 0, 'Divination', 'graveyard'); s.objects[em].sick = false;
  s = roda(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === em && a.targets?.[0]?.oid === p3)[0]));
  assert.equal(legais(comMana(s, 'UU'), 0, a => a.t === 'cast' && a.oid === p3).length, 1);
  assert.equal(legais(comMana(s, 'UUU'), 0, a => a.t === 'cast' && a.oid === dv).length, 0);
});

test('M-613 · Hexing Squelcher: não pode ser anulada; dá ward de 2 vidas às suas outras criaturas', () => {
  const N = 'Hexing Squelcher';
  let s = mesa([N], ['Shock', 'Counterspell']), h, u, ub, cs, sh;
  [s, h] = poe(s, 0, N, 'hand'); [s, u] = poe(s, 0, 'Urso'); [s, ub] = poe(s, 1, 'Urso'); [s, cs] = poe(s, 1, 'Counterspell', 'hand'); [s, sh] = poe(s, 1, 'Shock', 'hand');
  s = comMana(s, 'RR'); s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === h)[0]); s = act(s, { t: 'pass', p: 0 });
  const ofCs = legais(comMana(s, 'UU', 1), 1, a => a.t === 'cast' && a.oid === cs);
  s = roda(ofCs.length ? act(comMana(s, 'UU', 1), ofCs[0]) : s);
  assert.equal(s.objects[h].zone, 'battlefield', 'não pode ser anulada');
  const mira = (s0, alvo, paga) => { let x = act(J(s0), { t: 'pass', p: 0 }); x = comMana(x, 'R', 1);
    x = act(x, legais(x, 1, a => a.t === 'cast' && a.oid === sh && a.targets?.[0]?.oid === alvo)[0]);
    return roda(x, (y, op) => op.find(a => a.t === (paga ? 'pay' : 'decline')) || op[0]); };
  assert.equal(mira(s, u, false).objects[u].zone, 'battlefield', 'ward concedido ao Urso de A');
  const pago = mira(s, h, true); assert.equal(pago.players[1].life, 18); assert.equal(pago.objects[h].zone, 'graveyard');
  assert.equal(mira(s, ub, false).objects[ub].zone, 'graveyard', 'a criatura de B não tem ward');
});

test('M-613 · Thundertrap Trainer: prole {4} cria a cópia 1/1; olha quatro e pega uma não criatura e não terreno', () => {
  const N = 'Thundertrap Trainer';
  let s = mesa([N]), t; [s, t] = poe(s, 0, N, 'hand'); s = comMana(s, 'UUUUUU');
  const c = legais(s, 0, a => a.t === 'cast' && a.oid === t); assert.ok(c.some(a => a.proleK), 'prole oferecida');
  s = roda(act(s, c.find(a => a.proleK)), (x, op) => op[0]);
  const tk = s.zones[0].battlefield.find(o => s.objects[o].token); assert.ok(tk); igual(E.stats(s, s.objects[tk]), { power: 1, toughness: 1 });
  let s2 = mesa([N]), t2; [s2, t2] = poe(s2, 0, N, 'hand'); s2 = comMana(s2, 'UU');
  const topo = ['Divination', 'Urso', 'Island', 'Gigante'].map(n => s2.zones[0].library.find(o => s2.objects[o].name === n));
  s2.zones[0].library = [...topo, ...s2.zones[0].library.filter(o => !topo.includes(o))];
  let of; s2 = roda(act(s2, legais(s2, 0, a => a.t === 'cast' && a.oid === t2 && !a.proleK)[0]), (x, op) => { of = op.map(a => a.t + ':' + (x.objects[a.oid] || {}).name); return op[0]; });
  igual(of, ['pick:Divination', 'pick_done:undefined']); igual(nomesEm(s2, 0, 'hand'), ['Divination']);
  igual(s2.zones[0].library.slice(-3).map(o => s2.objects[o].name).sort(), ['Gigante', 'Island', 'Urso']);
});

test('M-613 · canalizar: Sokenzan (dois Espíritos com ímpeto), Takenuma (mói 3 e devolve criatura ou planeswalker), Eiganjo (só atacante ou bloqueador)', () => {
  let s = mesa(['Sokenzan, Crucible of Defiance', 'Rei']), so; [s, so] = poe(s, 0, 'Sokenzan, Crucible of Defiance', 'hand');
  assert.equal(legais(comMana(s, 'RRR'), 0, a => a.oid === so && a.t === 'activate').length, 0, '{3}{R} sem lendária');
  [s] = poe(s, 0, 'Rei'); s = comMana(s, 'RRR');
  let r = roda(act(s, legais(s, 0, a => a.oid === so && a.t === 'activate')[0]));
  const tok = r.zones[0].battlefield.filter(o => r.objects[o].token); assert.equal(tok.length, 2);
  assert.equal(r.facts.Spirit.power, 1); igual(r.facts.Spirit.colors, []); assert.ok(r.objects[tok[0]].tempKeywords.includes('haste'));

  let t = mesa(['Takenuma, Abandoned Mire', 'Rei', 'Planeswalker']), tk, pw; [t, tk] = poe(t, 0, 'Takenuma, Abandoned Mire', 'hand');
  const at = x => legais(x, 0, a => a.t === 'activate' && a.oid === tk).length;
  assert.equal(at(comMana(t, 'BBBB')), 1); assert.equal(at(comMana(t, 'BBB')), 0); [t] = poe(t, 0, 'Rei'); assert.equal(at(comMana(t, 'BBB')), 1);
  [t, pw] = poe(t, 0, 'Planeswalker', 'graveyard'); [t] = poe(t, 0, 'Divination', 'graveyard');
  const lib = t.zones[0].library.length; let of; t = comMana(t, 'BBB');
  t = roda(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === tk)[0]), (x, op) => { const pk = op.filter(a => x.objects[a.oid]); if (pk.length) of = pk.map(a => x.objects[a.oid].name); return op.find(a => a.oid === pw) || op[0]; });
  assert.ok(!of.includes('Divination'), 'mágica não volta'); assert.equal(t.zones[0].library.length, lib - 3);
  assert.equal(t.objects[pw].zone, 'hand'); assert.equal(t.objects[tk].zone, 'graveyard');

  let e = mesa(['Eiganjo, Seat of the Empire', 'Rei'], ['Gigante']), ei, g, ua;
  [e, ei] = poe(e, 0, 'Eiganjo, Seat of the Empire', 'hand'); [e, g] = poe(e, 1, 'Gigante'); [e] = poe(e, 1, 'Urso'); [e, ua] = poe(e, 0, 'Urso');
  assert.equal(legais(comMana(e, 'WWW'), 0, a => a.oid === ei && a.t === 'activate').length, 0, 'fora de combate não há alvo');
  e = passaAte(e, x => x.turn.active === 1 && x.pending && x.pending.kind === 'attackers'); e = act(e, { t: 'attack', p: 1, attackers: [g] });
  e = passaAte(e, x => x.pending && x.pending.kind === 'blockers'); e = act(e, { t: 'block', p: 0, blocks: [[ua, g]] }); e = act(e, { t: 'pass', p: 1 });
  e = comMana(e, 'WWW'); const ae = legais(e, 0, a => a.oid === ei && a.t === 'activate');
  igual([...new Set(ae.map(a => a.targets[0].oid))].sort(), [g, ua].sort(), 'atacante e bloqueador, não o Urso parado');
  const re = roda(act(e, ae.find(a => a.targets[0].oid === g))); assert.equal(re.objects[g].damage, 4); assert.equal(re.objects[ei].zone, 'graveyard');
});

test('M-613 · Shoot the Sheriff: destrói criatura não fora da lei (Ladino e Bruxo não podem ser alvo)', () => {
  let s = mesa(['Shoot the Sheriff'], ['Ladino', 'Bruxo', 'Gigante']), sh, g;
  [s, sh] = poe(s, 0, 'Shoot the Sheriff', 'hand'); [s] = poe(s, 1, 'Ladino'); [s] = poe(s, 1, 'Bruxo'); [s, g] = poe(s, 1, 'Gigante'); [s] = poe(s, 0, 'Urso');
  s = comMana(s, 'BB'); const cs = legais(s, 0, a => a.t === 'cast' && a.oid === sh);
  igual(cs.map(a => s.objects[a.targets[0].oid].name).sort(), ['Gigante', 'Urso']);
  assert.equal(roda(act(s, cs.find(a => a.targets[0].oid === g))).objects[g].zone, 'graveyard');
});

test('M-613 · Blood Moon, Urborg e Yavimaya: tipos de terreno na camada 4 (613.8: sob Blood Moon, Urborg perde a habilidade)', () => {
  let s = mesa(['Cidade', 'Neve', 'Blood Moon', 'Yavimaya, Cradle of Growth'], ['Blood Moon', 'Urborg, Tomb of Yawgmoth']), c, n, i, ub;
  [s, c] = poe(s, 0, 'Cidade'); [s, n] = poe(s, 0, 'Neve'); [s, i] = poe(s, 0, 'Island'); [s, ub] = poe(s, 1, 'Urborg, Tomb of Yawgmoth');
  assert.equal(E.linhaDeTipo(s, s.objects[i]), 'Basic Land — Island Swamp', 'o Urborg do oponente vale para todos');
  assert.equal(act(s, { t: 'tap_mana', p: 0, oid: i, option: 1 }).players[0].pool.B, 1);
  let y = s, yv, x; [y, yv] = poe(y, 0, 'Yavimaya, Cradle of Growth'); y = J(y); y.objects[yv].tapped = true; y.objects[n].tapped = true; [y, x] = poe(y, 0, 'Urso', 'hand');
  y = J(y); y.objects[ub].tapped = true;
  assert.ok(legais(y, 0, a => a.t === 'cast' && a.oid === x).length, 'Ilha + Cidade (Florestas pela Yavimaya) pagam {1}{G}');
  [s] = poe(s, 1, 'Blood Moon');
  assert.equal(E.linhaDeTipo(s, s.objects[c]), 'Land — Mountain'); assert.equal(E.linhaDeTipo(s, s.objects[n]), 'Snow Land — Mountain');
  assert.equal(E.linhaDeTipo(s, s.objects[i]), 'Basic Land — Island', 'Urborg virou Montanha e perdeu a habilidade');
  assert.equal(E.linhaDeTipo(s, s.objects[ub]), 'Legendary Land — Mountain');
  assert.equal(act(s, { t: 'tap_mana', p: 0, oid: n, option: 0 }).players[0].pool.R, 1);
  assert.throws(() => act(s, { t: 'tap_mana', p: 0, oid: n, option: 1 }), undefined, 'a Neve não gera mais {G}');
});

test('M-613 · Sheoldred, the Apocalypse: você ganha 2 a cada compra sua; o oponente perde 2 a cada compra dele', () => {
  let s = mesa(['Sheoldred, the Apocalypse']), sh, dv; [s, sh] = poe(s, 0, 'Sheoldred, the Apocalypse'); [s, dv] = poe(s, 0, 'Divination', 'hand');
  const va = s.players[0].life, vb = s.players[1].life; s = comMana(s, 'UUU');
  s = roda(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === dv)[0])); assert.equal(s.players[0].life, va + 4);
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length); assert.equal(s.players[1].life, vb - 2, 'passo de compra do oponente');
});
