// M-614 · LT271 · rotina Motor contínuo · revisão em lote 9: as cartas `lida` seguintes de maior valor nos competitivos
// (cobertura/<formato>.json do ramo catalogo, 08/11/2026: Modern, Legacy, Pioneer, Standard, Vintage, Construído e Commander), conferidas
// frase a frase por revisores independentes, uma partida por carta, e aprovadas com o texto da API da Scryfall de 08/11/2026 (guardado em
// .listas/oficiais-revisadas.json). As partidas abaixo são as dos revisores, pelo caminho do app: nenhum script é passado para as cartas
// do lote, elas jogam pelo script lido e aprovado (SC.scriptLido). Falham antes da M-614. Recusadas: Sheoldred's Edict (701.21a),
// Pop Quiz (701.48a) e Logic Knot (702.66a), que seguem `lida`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';

const M = loadModules(), E = M.engine, S = M.scripts, SF = M.scryfall;
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
export const LOTE9 = ["Floodpits Drowner", "Mightform Harmonizer", "Shadowspear", "Manifold Key", "Fountainport", "Mossborn Hydra", "Demolition Field", "Once Upon a Time", "Merchant Scroll", "Planar Nexus", "Collector Ouphe", "Harbinger of the Seas", "Vraska's Final Mercy", "Razorgrass Ambush // Razorgrass Field", "Magus of the Moon", "Stony Silence", "Ashen Rider", "Censor"];
const valor = c => [...String(c || '').matchAll(/\{([^}]+)\}/g)].reduce((n, [, x]) => n + (/^\d+$/.test(x) ? +x : x === 'X' ? 0 : 1), 0);
const cores = c => [...new Set(String(c || '').match(/[WUBRG]/g) || [])];
/** A carta como a Scryfall a entrega (dupla face com `card_faces`), montada pelo app com normalizeCard. */
const carta = n => { const o = OF.find(x => x.name === n); assert.ok(o, `${n} em .listas/oficiais-revisadas.json`);
  const mc = o.faces ? o.faces[0].mana_cost : o.mana_cost;
  const crua = o.faces ? { object: 'card', name: o.name, layout: o.layout, keywords: o.keywords || [], type_line: o.type_line, card_faces: o.faces }
    : { object: 'card', layout: 'normal', keywords: [], ...o };
  return SF.normalizeCard({ ...crua, cmc: valor(mc), colors: cores(mc) }); };

test(`M-614 · as ${LOTE9.length} cartas do lote 9 jogam no app: texto da Scryfall de 08/11 guardado, assinatura de APROVADAS igual e cobertura completa`, () => {
  for (const n of LOTE9) {
    const c = carta(n), o = OF.find(x => x.name === n);
    assert.match(o.fonte, /api\.scryfall\.com/, `${n}: texto da Scryfall`); assert.equal(o.consulta, "2026-11-08", `${n}: data da consulta`);
    assert.ok(S.APROVADAS[n], `${n} em APROVADAS`); assert.equal(S.APROVADAS[n].leva, "M-614");
    assert.equal(S.APROVADAS[n].texto, S.assinaturaRevisao(c), `${n}: a assinatura é a do texto revisado`);
    assert.equal(S.coverage(c, S.SCRIPTS, n).level, "completo", `${n} joga`);
    assert.ok(S.scriptLido(c), `${n}: o app joga pelo script lido`);
  }
  assert.equal((S.APROVADAS["Sheoldred's Edict"] || {}).leva, 'M-615', "Sheoldred's Edict: recusada na M-614 (701.21a), aprovada na M-615 depois que o sacrifício passou a olhar os tipos de agora (mudança de propósito)");
  assert.ok(!S.APROVADAS['Pop Quiz'], 'Pop Quiz recusada (701.48a: learn sem a Lição de fora do jogo)');
  assert.ok(!S.APROVADAS['Logic Knot'], 'Logic Knot recusada (702.66a: o delve não paga a parte {X} do custo)');
});

// ── partidas: o app monta o script de cada carta do lote sozinho ─────────────────────────────────────────────────────────────────
const C = Object.fromEntries(LOTE9.map(n => [n, carta(n)]));
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
  for (const n of a.concat(b)) if (LOTE9.includes(n)) assert.ok(!S.SCRIPTS[n] && s.facts[n] && s.facts[n].script, `${n} joga pelo script lido (sem script à mão)`);
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = J(s); for (const oid of s.zones[0].hand.slice()) { s.zones[0].hand.splice(s.zones[0].hand.indexOf(oid), 1); s.zones[0].library.unshift(oid); s.objects[oid].zone = 'library'; }
  return s;
}
const meuMain = s => passaAte(passaAte(s, q => q.turn.active === 1 && q.turn.step === 'main1'), q => q.turn.active === 0 && q.turn.step === 'main1');

// ── partidas dos revisores ──

// ── grupo 1 (revisor independente): Floodpits Drowner, Mightform Harmonizer, Shadowspear, Manifold Key, Fountainport, Mossborn Hydra,
// Demolition Field, Once Upon a Time ──
const temKw = (s, oid, k) => E.hasKeyword(s, s.objects[oid], k);

test('M-614 · Floodpits Drowner: flash e vigilância; ao entrar vira e atordoa criatura do oponente; {1}{U},{T} embaralha ela e o alvo atordoado', () => {
  const N = 'Floodpits Drowner';
  let s = mesa([N], ['Ladino']), d, u, l, meu;
  [s, d] = poe(s, 0, N, 'hand'); [s, u] = poe(s, 1, 'Urso'); [s, l] = poe(s, 1, 'Ladino'); [s, meu] = poe(s, 0, 'Urso');
  // flash: conjura no turno do oponente
  s = passaAte(s, q => q.turn.active === 1 && q.turn.step === 'main1' && !q.stack.length && !q.pending);
  s = J(s); s.turn.priority = 0; s = comMana(s, 'UU');
  const cs = legais(s, 0, a => a.t === 'cast' && a.oid === d); assert.ok(cs.length, 'flash: conjura no turno do oponente');
  s = act(s, cs[0]); let alvos;
  s = roda(s, (x, op, pd) => { if (!pd.options) return null; alvos = pd.options.map(o => x.objects[o.oid].name + '/' + x.objects[o.oid].controller); return op[pd.options.findIndex(o => o.oid === l)]; });
  assert.ok(alvos, 'o gatilho pede o alvo');
  assert.equal(s.objects[d].zone, 'battlefield');
  assert.equal(s.objects[l].tapped, true, 'vira o alvo'); assert.equal((s.objects[l].counters || {}).stun, 1, 'um marcador de atordoamento');
  assert.equal(s.objects[u].tapped, false); assert.equal(s.objects[meu].tapped, false, 'a minha criatura não é alvo');
  igual(alvos.sort(), ['Ladino/1', 'Urso/1'], 'só criatura do oponente');
  assert.ok(temKw(s, d, 'vigilance') && temKw(s, d, 'flash'));
  // ativada: só criatura com marcador de atordoamento
  s = passaAte(s, q => q.turn.active === 0 && q.turn.step === 'main1');
  assert.equal(s.objects[l].tapped, true, 'atordoada: no desvirar sai o marcador e ela fica virada (122.1d)'); assert.equal((s.objects[l].counters || {}).stun || 0, 1, 'o desvirar do dono é o do turno dele');
  // vigilância: ataca e não vira
  s = passaAte(s, q => q.pending && q.pending.kind === 'attackers');
  s = act(s, { t: 'attack', p: 0, attackers: [d] }); assert.equal(s.objects[d].tapped, false, 'vigilância: atacar não vira');
  s = passaAte(s, q => q.turn.active === 0 && q.turn.step === 'main2' && !q.stack.length && !q.pending);
  s = comMana(s, 'UU');
  const at = legais(s, 0, a => a.t === 'activate' && a.oid === d);
  igual(at.map(a => s.objects[a.targets[0].oid].name), ['Ladino'], 'só a criatura atordoada');
  const libB = s.zones[1].library.length, libA = s.zones[0].library.length;
  s = roda(act(s, at[0]));
  assert.equal(s.objects[d].zone, 'library'); assert.equal(s.objects[l].zone, 'library');
  assert.ok(s.zones[1].library.includes(l), 'no grimório do dono'); assert.ok(s.zones[0].library.includes(d));
  assert.equal(s.zones[1].library.length, libB + 1); assert.equal(s.zones[0].library.length, libA + 1);
});

test('M-614 · Mightform Harmonizer: terreno seu que entra dobra o poder de criatura sua até o fim do turno; dobra {2}{G} exila e volta a ser conjurável do exílio', () => {
  const N = 'Mightform Harmonizer';
  let s = mesa([N, 'Shock'], ['Ladino']), h, u, g, f, l;
  [s, h] = poe(s, 0, N, 'hand'); [s, u] = poe(s, 0, 'Urso'); [s, g] = poe(s, 0, 'Gigante'); [s, f] = poe(s, 0, 'Forest', 'hand'); [s, l] = poe(s, 1, 'Ladino');
  s = comMana(s, 'GGG');
  const cs = legais(s, 0, a => a.t === 'cast' && a.oid === h);
  igual(cs.map(a => a.alt), [0], 'com {2}{G} só a dobra (o custo normal é {2}{G}{G})');
  s = roda(act(s, cs[0])); assert.equal(s.objects[h].zone, 'battlefield'); assert.equal(s.players[0].pool.G, 0);
  // landfall: só criatura minha
  s = act(s, { t: 'play_land', p: 0, oid: f }); let alvos;
  s = roda(s, (x, op, pd) => { if (!pd.options) return null; alvos = pd.options.map(o => x.objects[o.oid].name + '/' + x.objects[o.oid].controller); return op[pd.options.findIndex(o => o.oid === u)]; });
  assert.ok(alvos, 'pede o alvo'); igual(alvos.sort(), ['Gigante/0', 'Mightform Harmonizer/0', 'Urso/0'], 'só criatura que você controla');
  assert.equal(E.stats(s, s.objects[u]).power, 4, 'dobra: 2 → 4'); assert.equal(E.stats(s, s.objects[u]).toughness, 2, 'a resistência fica');
  // terreno do oponente não dispara
  { let [t2, ilha] = poe(s, 1, 'Island', 'hand'); t2 = J(t2); E.moveObject(t2, ilha, 'battlefield', { controller: 1 });
    assert.equal(t2.stack.length + (t2.queued || []).length, 0, 'terreno do oponente não dispara');
    let [t3, mo] = poe(s, 0, 'Mountain', 'hand'); t3 = J(t3); E.moveObject(t3, mo, 'battlefield', { controller: 0 });
    assert.equal(t3.stack.length + (t3.queued || []).length, 1, 'controle: o meu dispara pelo mesmo caminho'); }
  // fim do turno: o poder volta e a dobra exila
  s = passaAte(s, q => q.turn.active === 1);
  assert.equal(E.stats(s, s.objects[u]).power, 2, 'até o fim do turno'); assert.equal(s.objects[h].zone, 'exile', 'exilada na próxima etapa final');
  assert.equal(legais(s, 0, a => a.t === 'cast' && a.oid === h).length, 0);
  s = meuMain(s); s = comMana(s, 'GGGG');
  const de = legais(s, 0, a => a.t === 'cast' && a.oid === h); assert.ok(de.length, 'conjurável do exílio num turno depois');
  s = roda(act(s, de[0])); assert.equal(s.objects[h].zone, 'battlefield');
});

Object.assign(C, {
  Guardiao: c0('Guardiao', 'Creature — Spirit', '{2}{W}', { power: '2', toughness: '2', keywords: ['Hexproof', 'Indestructible'], oracle_text: 'Hexproof\nIndestructible' }),
  Relicario: c0('Relicario', 'Artifact', '{3}', { keywords: ['Indestructible'], oracle_text: 'Indestructible' }),
});
test('M-614 · Shadowspear: equipar {2} dá +1/+1, atropelar e vínculo com a vida; {1} tira resistência a magia e indestrutível das permanentes do oponente até o fim do turno', () => {
  const N = 'Shadowspear';
  let s = mesa([N, 'Shock', 'Naturalize', 'Guardiao'], ['Guardiao', 'Relicario']), sp, u, gO, rel, gM, sh, nat;
  [s, sp] = poe(s, 0, N); [s, u] = poe(s, 0, 'Urso'); [s, gO] = poe(s, 1, 'Guardiao'); [s, rel] = poe(s, 1, 'Relicario'); [s, gM] = poe(s, 0, 'Guardiao');
  [s, sh] = poe(s, 0, 'Shock', 'hand'); [s, nat] = poe(s, 0, 'Naturalize', 'hand');
  s = comMana(s, 'C');
  assert.equal(legais(s, 0, a => a.oid === sp && a.index === 1).length, 0, 'equipar custa {2}');
  s = comMana(s, 'C');
  const eq = legais(s, 0, a => a.oid === sp && a.index === 1);
  igual(eq.map(a => s.objects[a.targets[0].oid].name + '/' + s.objects[a.targets[0].oid].controller).sort(), ['Guardiao/0', 'Urso/0'], 'equipa só criatura sua');
  s = roda(act(s, eq.find(a => a.targets[0].oid === u)));
  const st = E.stats(s, s.objects[u]); assert.equal(st.power, 3); assert.equal(st.toughness, 3);
  assert.ok(E.hasKeyword(s, s.objects[u], 'trample') && E.hasKeyword(s, s.objects[u], 'lifelink'));
  // {1}: antes, nem Shock no Guardião do oponente
  s = comMana(s, 'R');
  assert.ok(!legais(s, 0, a => a.t === 'cast' && a.oid === sh).some(a => a.targets?.[0]?.oid === gO), 'resistência a magia antes');
  s = comMana(s, 'C'); s = roda(act(s, legais(s, 0, a => a.oid === sp && a.index === 0)[0]));
  assert.ok(!E.hasKeyword(s, s.objects[gO], 'hexproof') && !E.hasKeyword(s, s.objects[gO], 'indestructible'), 'o Guardião do oponente perde as duas');
  assert.ok(!E.hasKeyword(s, s.objects[rel], 'indestructible'), 'vale para toda permanente do oponente, não só criatura');
  assert.ok(E.hasKeyword(s, s.objects[gM], 'hexproof') && E.hasKeyword(s, s.objects[gM], 'indestructible'), 'as minhas ficam');
  const so = legais(s, 0, a => a.t === 'cast' && a.oid === sh && a.targets?.[0]?.oid === gO); assert.ok(so.length, 'agora o Shock alveja');
  s = roda(act(s, so[0])); assert.equal(s.objects[gO].zone, 'graveyard', 'sem indestrutível, 2 de dano mata');
  s = comMana(s, 'GG'); s = roda(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === nat && a.targets?.[0]?.oid === rel)[0]));
  assert.equal(s.objects[rel].zone, 'graveyard', 'o artefato indestrutível do oponente é destruído');
  // vínculo com a vida no combate
  const v0 = s.players[0].life, v1 = s.players[1].life;
  s = passaAte(s, q => q.pending && q.pending.kind === 'attackers'); s = act(s, { t: 'attack', p: 0, attackers: [u] });
  s = passaAte(s, q => q.turn.step === 'main2');
  assert.equal(s.players[1].life, v1 - 3); assert.equal(s.players[0].life, v0 + 3, 'vínculo com a vida');
  // a perda vale até o fim do turno e só para as permanentes do oponente na resolução
  let s2 = mesa(['Shadowspear'], ['Guardiao']), sp2, g1, g2;
  [s2, sp2] = poe(s2, 0, 'Shadowspear'); [s2, g1] = poe(s2, 1, 'Guardiao'); s2 = comMana(s2, 'C');
  s2 = roda(act(s2, legais(s2, 0, a => a.oid === sp2 && a.index === 0)[0]));
  assert.ok(!E.hasKeyword(s2, s2.objects[g1], 'hexproof'));
  [s2, g2] = poe(s2, 1, 'Guardiao'); assert.ok(E.hasKeyword(s2, s2.objects[g2], 'hexproof'), '611.2c: a que entra depois não é afetada');
  s2 = passaAte(s2, q => q.turn.active === 1); assert.ok(E.hasKeyword(s2, s2.objects[g1], 'hexproof') && E.hasKeyword(s2, s2.objects[g1], 'indestructible'), 'volta no turno seguinte');
});

test('M-614 · Manifold Key: {1},{T} desvira OUTRO artefato alvo; {3},{T} criatura alvo não pode ser bloqueada neste turno', () => {
  const N = 'Manifold Key';
  let s = mesa([N, 'Pedra', 'Totem'], ['Ladino', 'Totem']), k, pe, tO, u, l, lo;
  [s, k] = poe(s, 0, N); [s, pe] = poe(s, 0, 'Pedra', 'battlefield', { tapped: true }); [s, tO] = poe(s, 1, 'Totem', 'battlefield', { tapped: true });
  [s, u] = poe(s, 0, 'Urso'); [s, l] = poe(s, 1, 'Ladino'); [s, lo] = poe(s, 1, 'Urso');
  s = comMana(s, 'C');
  const d = legais(s, 0, a => a.t === 'activate' && a.oid === k && a.index === 0);
  igual(d.map(a => s.objects[a.targets[0].oid].name).sort(), ['Pedra', 'Totem'], 'artefato de qualquer jogador, mas não a própria chave');
  let r = roda(act(s, d.find(a => a.targets[0].oid === pe)));
  assert.equal(r.objects[pe].tapped, false, 'desvira'); assert.equal(r.objects[k].tapped, true, 'custa virar a chave');
  // {3},{T}: imbloqueável
  s = J(s); s.players[0].pool.C = 0; s = comMana(s, 'CC'); assert.equal(legais(s, 0, a => a.t === 'activate' && a.oid === k && a.index === 1).length, 0, 'custa {3}');
  s = comMana(s, 'C'); const ib = legais(s, 0, a => a.t === 'activate' && a.oid === k && a.index === 1);
  igual(ib.map(a => s.objects[a.targets[0].oid].controller).sort(), [0, 1, 1], 'qualquer criatura');
  s = roda(act(s, ib.find(a => a.targets[0].oid === u)));
  s = passaAte(s, q => q.pending && q.pending.kind === 'attackers'); s = act(s, { t: 'attack', p: 0, attackers: [u] });
  s = passaAte(s, q => q.pending && q.pending.kind === 'blockers');
  assert.ok(s.pending, 'chega aos bloqueadores');
  assert.throws(() => act(s, { t: 'block', p: 1, blocks: [[l, u]] }), /bloque|block/i, 'não pode ser bloqueada');
  const v1 = s.players[1].life; s = passaAte(s, q => q.turn.step === 'main2'); assert.equal(s.players[1].life, v1 - 2);
  // no turno seguinte pode ser bloqueada de novo
  s = meuMain(s); s = passaAte(s, q => q.pending && q.pending.kind === 'attackers'); s = act(s, { t: 'attack', p: 0, attackers: [u] });
  s = passaAte(s, q => q.pending && q.pending.kind === 'blockers');
  const v2 = s.players[1].life; s = act(s, { t: 'block', p: 1, blocks: [[l, u]] });
  s = passaAte(s, q => q.turn.step === 'main2'); assert.equal(s.players[1].life, v2, 'neste turno só: no seguinte é bloqueada');
});

test('M-614 · Fountainport: {T} dá {C}; {4},{T} Tesouro; {3},{T} e 1 de vida um Peixe 1/1 azul; {2},{T} e sacrificar uma ficha compra', () => {
  const N = 'Fountainport';
  let s = mesa([N, 'Totem']), fp;
  [s, fp] = poe(s, 0, N); [s] = poe(s, 0, 'Totem');
  const desvira = x => { x = J(x); x.objects[fp].tapped = false; for (const c in x.players[0].pool) x.players[0].pool[c] = 0; return x; };
  const fichas = x => x.zones[0].battlefield.filter(o => x.objects[o].token);
  // {T}: {C}
  const m = act(s, legais(s, 0, a => a.t === 'tap_mana' && a.oid === fp)[0]); assert.equal(m.players[0].pool.C, 1); assert.equal(m.objects[fp].tapped, true);
  s = comMana(s, 'CCCC');
  assert.ok(!legais(s, 0, a => a.oid === fp && a.index === 0).length, 'sem ficha não compra (sacrificar o Totem, que não é ficha, não serve)');
  // {4},{T}: Tesouro
  s = roda(act(s, legais(s, 0, a => a.oid === fp && a.index === 2)[0]));
  let fx = fichas(s); assert.equal(fx.length, 1); const tes = fx[0];
  assert.equal(s.objects[tes].name, 'Treasure'); assert.match(E.linhaDeTipo(s, s.objects[tes]), /artifact.*Treasure/i);
  assert.equal(s.objects[fp].tapped, true); assert.equal(s.players[0].pool.C, 0);
  const tm = legais(s, 0, a => a.oid === tes); assert.ok(tm.length >= 5, 'o Tesouro dá mana de qualquer cor');
  // {3},{T}, 1 de vida: Peixe
  s = desvira(s); s = comMana(s, 'CC'); assert.ok(!legais(s, 0, a => a.oid === fp && a.index === 1).length, 'custa {3}');
  s = comMana(s, 'C'); const v = s.players[0].life;
  s = roda(act(s, legais(s, 0, a => a.oid === fp && a.index === 1)[0]));
  assert.equal(s.players[0].life, v - 1, 'paga 1 de vida');
  const pe = fichas(s).find(o => s.objects[o].name === 'Fish'); assert.ok(pe, 'Peixe');
  const st = E.stats(s, s.objects[pe]); assert.equal(st.power, 1); assert.equal(st.toughness, 1); assert.ok(E.isCreature(s, s.objects[pe])); assert.match(E.linhaDeTipo(s, s.objects[pe]), /Fish/); igual([...E.coresDe(s, s.objects[pe])], ['U'], 'azul');
  // {2},{T}, sacrificar uma ficha: compra
  s = desvira(s); s = comMana(s, 'CC'); const mao = s.zones[0].hand.length;
  const cp = legais(s, 0, a => a.oid === fp && a.index === 0); assert.ok(cp.length, 'com ficha compra');
  const tot = s.zones[0].battlefield.find(o => s.objects[o].name === 'Totem');
  igual(cp.map(a => a.pay.sacrifice).sort(), [pe, tes].sort(), 'qualquer ficha (artefato ou criatura), nunca o Totem que não é ficha');
  s = roda(act(s, cp.find(a => a.pay.sacrifice === tes)));
  assert.equal(s.zones[0].hand.length - mao, 1, 'compra 1'); assert.ok(!s.objects[tes] || s.objects[tes].zone !== 'battlefield', 'o Tesouro foi sacrificado');
  assert.equal(s.objects[pe].zone, 'battlefield'); assert.equal(s.objects[tot].zone, 'battlefield');
});

test('M-614 · Mossborn Hydra: entra com um marcador +1/+1, atropela; terreno seu que entra dobra os marcadores (contados na resolução)', () => {
  const N = 'Mossborn Hydra';
  let s = mesa([N]), h, f;
  [s, h] = poe(s, 0, N, 'hand'); [s, f] = poe(s, 0, 'Forest', 'hand'); s = comMana(s, 'GGG');
  s = roda(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === h)[0]));
  assert.equal(s.objects[h].zone, 'battlefield', 'a 0/0 sobrevive: entra com o marcador'); assert.equal(s.objects[h].counters.p1p1, 1);
  igual([E.stats(s, s.objects[h]).power, E.stats(s, s.objects[h]).toughness], [1, 1]); assert.ok(E.hasKeyword(s, s.objects[h], 'trample'));
  s = roda(act(s, { t: 'play_land', p: 0, oid: f })); assert.equal(s.objects[h].counters.p1p1, 2, 'dobra: 1 → 2');
  // dois terrenos com os dois gatilhos na pilha: 2 → 4 → 8 (cada um conta na resolução)
  s = meuMain(s); let m1, m2; [s, m1] = poe(s, 0, 'Mountain', 'hand'); [s, m2] = poe(s, 0, 'Swamp', 'hand');
  s = act(s, { t: 'play_land', p: 0, oid: m1 }); assert.equal(s.stack.length, 1, 'o gatilho na pilha');
  s = J(s); E.moveObject(s, m2, 'battlefield', { controller: 0 });
  s = roda(s); assert.equal(s.objects[h].counters.p1p1, 8);
  // terreno do oponente não dispara
  let ilha; [s, ilha] = poe(s, 1, 'Island', 'hand'); s = J(s); E.moveObject(s, ilha, 'battlefield', { controller: 1 }); s = roda(s);
  assert.equal(s.objects[h].counters.p1p1, 8, 'só terreno que você controla');
  // atropelar no combate: 8/8 bloqueada por 2/2 passa 6
  s = meuMain(s); const ub = s.zones[1].battlefield.find(o => s.objects[o].name === 'Urso') || (() => { let x; [s, x] = poe(s, 1, 'Urso'); return x; })();
  const v1 = s.players[1].life;
  s = passaAte(s, q => q.pending && q.pending.kind === 'attackers'); s = act(s, { t: 'attack', p: 0, attackers: [h] });
  s = passaAte(s, q => q.pending && q.pending.kind === 'blockers'); s = act(s, { t: 'block', p: 1, blocks: [[ub, h]] });
  s = passaAte(s, q => q.turn.step === 'main2'); assert.equal(s.pending?.kind, 'dividir_dano', 'atropelar: quem ataca divide o dano');
  s = act(s, legais(s, 0, a => a.t === 'dividir_dano' && a.index === 0)[0]); s = passaAte(s, q => q.turn.step === 'main2');
  assert.equal(s.players[1].life, v1 - 6, 'atropelar: 2 no bloqueador, 6 no jogador');
});

test('M-614 · Demolition Field: {2},{T}, sacrificar: destrói terreno não básico do oponente; o controlador dele pode buscar um básico, e você também', () => {
  const N = 'Demolition Field';
  let s = mesa([N, 'Cidade'], ['Cidade']), df, cO, cM, ilhaO;
  [s, df] = poe(s, 0, N); [s, cO] = poe(s, 1, 'Cidade'); [s, cM] = poe(s, 0, 'Cidade', 'battlefield', { tapped: true }); [s, ilhaO] = poe(s, 1, 'Island');
  s = comMana(s, 'C'); assert.equal(legais(s, 0, a => a.t === 'activate' && a.oid === df).length, 0, 'custa {2}');
  s = comMana(s, 'C'); const at = legais(s, 0, a => a.t === 'activate' && a.oid === df);
  igual(at.map(a => s.objects[a.targets[0].oid].name + '/' + s.objects[a.targets[0].oid].controller), ['Cidade/1'], 'só não básico do oponente');
  const r0 = act(s, at[0]); assert.equal(r0.objects[df].zone, 'graveyard', 'sacrificada no custo');
  const libB = s.zones[1].library.length, libA = s.zones[0].library.length;
  const quem = []; let primeira;
  // caminho 1: o oponente busca, você também
  let s1 = roda(r0, (x, op, pd) => { quem.push([pd.p, pd.min]); const al = pd.from.find(o => x.objects[o].name === (pd.p === 1 ? 'Swamp' : 'Plains'));
    if (!primeira) primeira = pd.from.map(o => x.objects[o].name); return op.find(a => a.oid === al); });
  assert.equal(s1.objects[cO].zone, 'graveyard', 'destruída');
  igual(quem, [[1, 0], [0, 0]], 'primeiro o controlador do terreno, depois você; os dois opcionais');
  assert.ok(primeira.every(n => ['Island', 'Swamp', 'Forest'].includes(n)), 'só terreno básico');
  assert.ok(nomesEm(s1, 1, 'battlefield').includes('Swamp')); assert.ok(nomesEm(s1, 0, 'battlefield').includes('Plains'));
  assert.equal(s1.zones[1].library.length, libB - 1); assert.equal(s1.zones[0].library.length, libA - 1);
  // caminho 2: os dois recusam
  let s2 = roda(r0, (x, op) => op.find(a => a.t !== 'pick') || null);
  assert.equal(s2.zones[1].library.length, libB); assert.equal(s2.zones[0].library.length, libA, 'você também pode não buscar');
  assert.equal(s2.objects[cM].zone, 'battlefield');
});

test('M-614 · Once Upon a Time: de graça só se for a primeira mágica que VOCÊ conjura na partida; olha 5, pode revelar criatura ou terreno, o resto ao fundo', () => {
  const N = 'Once Upon a Time';
  let s = mesa([N, 'Shock'], ['Shock']), o1, o2;
  [s, o1] = poe(s, 0, N, 'hand'); [s, o2] = poe(s, 0, N, 'hand');
  const cs = legais(s, 0, a => a.t === 'cast' && a.oid === o1);
  igual(cs.map(a => a.alt), [0], 'sem mana: só de graça');
  const topo = s.zones[0].library.slice(0, 5), nomesTopo = topo.map(o => s.objects[o].name), n = s.zones[0].library.length;
  igual(nomesTopo, ['Urso', 'Shock', 'Shock', 'Urso', 'Swamp']);
  let r = act(s, cs[0]); while (!r.pending) r = act(r, { t: 'pass', p: r.turn.priority });
  assert.equal(r.pending.p, 0); assert.equal(r.pending.min, 0, 'pode não pegar nenhuma');
  igual([...r.pending.from].sort(), [...topo].sort(), 'olha as cinco do topo');
  const ok = legais(r, 0, a => a.t === 'pick').map(a => r.objects[a.oid].name).sort();
  igual(ok, ['Swamp', 'Urso', 'Urso'], 'só criatura ou terreno');
  const urso = topo[0]; r = roda(act(r, { t: 'pick', p: 0, oid: urso }));
  assert.ok(r.zones[0].hand.includes(urso), 'vai para a mão');
  igual([...r.zones[0].library.slice(-4)].sort(), topo.slice(1).sort(), 'as outras quatro no fundo'); assert.equal(r.zones[0].library.length, n - 1);
  assert.equal(r.objects[o1].zone, 'graveyard');
  // a segunda já não é de graça
  assert.equal(legais(r, 0, a => a.t === 'cast' && a.oid === o2).length, 0, 'sem mana e não é a primeira: não conjura');
  r = comMana(r, 'GG'); igual(legais(r, 0, a => a.t === 'cast' && a.oid === o2).map(a => a.alt ?? null), [null], 'só pelo custo de mana');
  // pode também não pegar nada: tudo para o fundo
  let t0 = act(s, cs[0]); while (!t0.pending) t0 = act(t0, { t: 'pass', p: t0.turn.priority });
  t0 = roda(t0, (x, op) => op.find(a => a.t !== 'pick') || null);
  igual([...t0.zones[0].library.slice(-5)].sort(), [...topo].sort(), 'nada na mão, as cinco no fundo'); assert.equal(t0.zones[0].hand.length, s.zones[0].hand.length - 1);
  // a mágica do OPONENTE não conta ("you've cast")
  let u = mesa([N], ['Shock']), ou, sh; [u, ou] = poe(u, 0, N, 'hand');
  u = passaAte(u, q => q.turn.active === 1 && q.turn.step === 'main1' && !q.stack.length && !q.pending);
  [u, sh] = poe(u, 1, 'Shock', 'hand'); u = comMana(u, 'R', 1);
  u = roda(act(u, legais(u, 1, a => a.t === 'cast' && a.oid === sh && a.targets?.[0]?.player === 0)[0]));
  u = meuMain(u); assert.ok(legais(u, 0, a => a.t === 'cast' && a.oid === ou && a.alt === 0).length, 'ainda é a sua primeira');
});

// ── M-614 · grupo 2 (revisor independente) ──
Object.assign(C, {
  Ruina: c0('Ruina', 'Instant', '{U}{R}', { oracle_text: 'Draw a card.' }),
});


test("M-614 · Merchant Scroll: procura só mágica instantânea azul (multicolorida serve), revela, vai para a mão; pode não achar e embaralha", () => {
  const N = 'Merchant Scroll';
  let s = mesa([N, 'Counterspell', 'Shock', 'Ruina']), ms; [s, ms] = poe(s, 0, N, 'hand'); s = comMana(s, 'UU');
  const cs = legais(s, 0, a => a.t === 'cast' && a.oid === ms); assert.equal(cs.length, 1, 'feitiço sem alvo');
  s = act(s, cs[0]); s = act(s, { t: 'pass', p: 0 }); s = act(s, { t: 'pass', p: 1 });
  assert.equal(s.pending.kind, 'pick'); assert.equal(s.pending.p, 0, 'quem procura é quem conjurou'); assert.equal(s.pending.max, 1, 'uma carta');
  const op = legais(s, 0);
  igual([...new Set(op.filter(a => a.t === 'pick').map(a => s.objects[a.oid].name))].sort(), ['Counterspell', 'Ruina'], 'nem Shock (vermelha), nem Divination (feitiço azul), nem terreno');
  assert.ok(op.some(a => a.t === 'pick_done'), '701.19b: busca por qualidade pode não achar');
  const antes = s.zones[0].library.slice(), cv = op.find(a => a.t === 'pick' && s.objects[a.oid].name === 'Counterspell').oid;
  const r = E.apply(s, { t: 'pick', p: 0, oid: cv }); let x = r.state;
  if (x.pending && x.pending.kind === 'pick') { const r2 = E.apply(x, { t: 'pick_done', p: 0 }); r.events.push(...r2.events); x = r2.state; }
  assert.ok(x.zones[0].hand.includes(cv), 'vai para a mão'); assert.equal(x.objects[ms].zone, 'graveyard');
  assert.ok(r.events.some(e => e.do === 'reveal' && /Counterspell/.test(e.target)), 'revela a carta achada');
  assert.equal(x.zones[0].library.length, antes.length - 1);
  assert.notEqual(JSON.stringify(x.zones[0].library), JSON.stringify(antes.filter(o => o !== cv)), 'embaralha depois');
  // sem nada que sirva: resolve, não pega nada e embaralha
  let t = mesa([N, 'Shock']), m2; [t, m2] = poe(t, 0, N, 'hand'); t = comMana(t, 'UU'); const lib = t.zones[0].library.slice();
  t = roda(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === m2)[0]));
  assert.equal(t.zones[0].hand.length, 0); assert.notEqual(JSON.stringify(t.zones[0].library), JSON.stringify(lib), 'embaralha mesmo sem achar');
});
test('M-614 · Planar Nexus: tem todo tipo de terreno não básico em toda zona (nenhum básico); {T}: {C}; {1}, {T}: uma cor qualquer', () => {
  const N = 'Planar Nexus', NB = ['Desert', 'Gate', 'Lair', 'Locus', 'Mine', 'Power-Plant', 'Tower', "Urza's", 'Cave', 'Sphere'];
  let s = mesa([N]), nx, il; [s, nx] = poe(s, 0, N, 'hand');
  const tipos = x => (E.linhaDeTipo(x, x.objects[nx]).split('—')[1] || '').trim().split(/\s+/);
  for (const k of NB) assert.ok(tipos(s).includes(k), `na mão já é ${k} (604.3)`);
  for (const k of ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest']) assert.ok(!tipos(s).includes(k), `não é ${k}`);
  assert.ok(!/Basic/.test(E.linhaDeTipo(s, s.objects[nx])), 'terreno não básico');
  s = act(s, { t: 'play_land', p: 0, oid: nx }); for (const k of NB) assert.ok(tipos(s).includes(k), `no campo é ${k}`);
  igual(legais(s, 0, a => a.oid === nx).map(a => a.t), ['tap_mana'], 'sozinho, não paga o {1} da segunda habilidade');
  assert.equal(act(s, legais(s, 0, a => a.oid === nx)[0]).players[0].pool.C, 1, '{T}: {C}');
  [s, il] = poe(s, 0, 'Island');
  const cor = legais(s, 0, a => a.oid === nx && a.t === 'activate');
  igual(cor.map(a => a.color).sort(), ['B', 'G', 'R', 'U', 'W'], 'uma mana de qualquer cor');
  const r = act(s, cor.find(a => a.color === 'G'));
  assert.equal(r.players[0].pool.G, 1); assert.equal(r.objects[nx].tapped, true); assert.equal(r.objects[il].tapped, true, 'a Ilha pagou o {1}');
  assert.equal(r.players[0].pool.U || 0, 0);
});

const luaK = (N, sub, cor, custo) => {
  let s = mesa([N, 'Planar Nexus', 'Cidade', 'Shock'], ['Cidade']), h, nx, ci, cb, bas, sh; [s, h] = poe(s, 0, N, 'hand'); [s, nx] = poe(s, 0, 'Planar Nexus'); [s, ci] = poe(s, 0, 'Cidade'); [s, cb] = poe(s, 1, 'Cidade');
  [s, bas] = poe(s, 0, sub === 'Island' ? 'Mountain' : 'Island'); [s] = poe(s, 0, 'Plains');
  s = roda(act(comMana(s, custo), legais(comMana(s, custo), 0, a => a.t === 'cast' && a.oid === h)[0])); assert.equal(s.objects[h].zone, 'battlefield'); igual(E.stats(s, s.objects[h]), { power: 2, toughness: 2 });
  for (const o of [nx, ci, bas]) assert.equal(s.objects[o].tapped, false);
  assert.equal(E.linhaDeTipo(s, s.objects[ci]), `Land — ${sub}`); assert.equal(E.linhaDeTipo(s, s.objects[cb]), `Land — ${sub}`, 'o do oponente também');
  assert.equal(E.linhaDeTipo(s, s.objects[nx]), `Land — ${sub}`, '305.7: perde todos os outros tipos de terreno');
  assert.match(E.linhaDeTipo(s, s.objects[bas]), /^Basic Land — (Island|Mountain)$/, 'básico não muda');
  assert.notEqual(E.linhaDeTipo(s, s.objects[bas]), `Basic Land — ${sub}`);
  igual(legais(s, 0, a => a.oid === nx).map(a => a.t), ['tap_mana'], 'o Nexus perde o {1}, {T}: uma cor');
  const u = act(s, legais(s, 0, a => a.oid === ci)[0]); assert.equal(u.players[0].pool[cor], 1); assert.equal(u.players[0].pool.C || 0, 0, `Cidade gera {${cor}}, não {C}`);
  assert.equal(act(s, legais(s, 0, a => a.oid === nx)[0]).players[0].pool[cor], 1, `o Nexus gera {${cor}}`);
  [s, sh] = poe(s, 0, 'Shock', 'hand'); s = comMana(s, 'R');
  s = roda(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === sh && a.targets?.[0]?.oid === h)[0])); assert.equal(s.objects[h].zone, 'graveyard');
  assert.equal(E.linhaDeTipo(s, s.objects[ci]), 'Land', 'a fonte saiu: volta ao impresso');
  assert.equal(legais(s, 0, a => a.oid === nx && a.t === 'activate').length, 5, 'o Nexus volta a ter {1}, {T}');
};
test('M-614 · Harbinger of the Seas: terrenos não básicos (de todos) são Ilhas, perdem as habilidades e só geram {U}; básicos não mudam; ao sair, volta', () => {
  luaK('Harbinger of the Seas', 'Island', 'U', 'UUU');
});
test('M-614 · Magus of the Moon: terrenos não básicos (de todos) são Montanhas, perdem as habilidades e só geram {R}; básicos não mudam; ao sair, volta', () => {
  luaK('Magus of the Moon', 'Mountain', 'R', 'RRR');
});

test('M-614 · Collector Ouphe: nenhuma habilidade ativada de artefato (de ninguém, inclusive de mana) pode ser ativada; terreno e criatura não artefato seguem', () => {
  const N = 'Collector Ouphe';
  let s = mesa([N, 'Anel', 'Pedra', 'Planar Nexus'], ['Anel']), co, an, pe, ab, nx;
  [s, an] = poe(s, 0, 'Anel'); [s, pe] = poe(s, 0, 'Pedra'); [s, ab] = poe(s, 1, 'Anel'); [s, nx] = poe(s, 0, 'Planar Nexus'); [s, co] = poe(s, 0, N, 'hand');
  assert.ok(legais(s, 0, a => a.t === 'tap_mana' && a.oid === an).length, 'antes, o Anel gera mana');
  s = roda(act(comMana(s, 'GG'), legais(comMana(s, 'GG'), 0, a => a.t === 'cast' && a.oid === co)[0])); assert.equal(s.objects[co].zone, 'battlefield');
  igual(E.stats(s, s.objects[co]), { power: 2, toughness: 2 });
  assert.equal(legais(s, 0, a => a.oid === an || a.oid === pe).length, 0, 'nem mana do Anel, nem {1}, {T} da Pedra');
  assert.throws(() => act(s, { t: 'tap_mana', p: 0, oid: an, option: 0 }), undefined, 'a ação direta também é recusada');
  assert.ok(legais(s, 0, a => a.oid === nx).length, 'terreno não artefato segue');
  let o = J(s); o.turn.priority = 1; assert.equal(legais(o, 1, a => a.oid === ab).length, 0, 'o Anel do oponente também (todos)');
  // o pagamento automático também não usa o Anel: só ele de fonte, {1} não se paga
  let t2 = J(s); t2.objects[nx].tapped = true; [t2] = poe(t2, 0, 'Divination', 'hand');
  const dvo = t2.zones[0].hand.find(x => t2.objects[x].name === 'Divination');
  assert.equal(legais(comMana(t2, 'UU'), 0, a => a.t === 'cast' && a.oid === dvo).length, 0, '{2}{U} com UU + Anel travado não paga');
  [t2] = poe(t2, 0, 'Island'); assert.equal(legais(comMana(t2, 'UU'), 0, a => a.t === 'cast' && a.oid === dvo).length, 1, 'com uma Ilha a mais paga');
});

test('M-614 · Vraska\'s Final Mercy: modo 1 perde 2 e destrói criatura ou planeswalker alvo (de qualquer um); modo 2 perde 2 e empodera Jace 6; alvo ilegal: nada acontece', () => {
  const N = "Vraska's Final Mercy";
  let s = mesa([N, 'Planeswalker'], ['Planeswalker']), v, ub, pb, ua; [s, v] = poe(s, 0, N, 'hand');
  [s, ub] = poe(s, 1, 'Urso'); [s, pb] = poe(s, 1, 'Planeswalker', 'battlefield', { loyalty: 3, counters: { loyalty: 3 } }); [s, ua] = poe(s, 0, 'Urso'); [s] = poe(s, 1, 'Island'); [s] = poe(s, 0, 'Plains');
  s = comMana(s, 'BB');
  const cs = legais(s, 0, a => a.t === 'cast' && a.oid === v);
  const m0 = cs.filter(a => a.mode === 0), m1 = cs.filter(a => a.mode === 1);
  igual(m0.map(a => s.objects[a.targets[0].oid].name + '/' + s.objects[a.targets[0].oid].controller).sort(), ['Planeswalker/1', 'Urso/0', 'Urso/1'], 'criatura ou planeswalker, de qualquer um; nem terreno');
  assert.equal(m1.length, 1, 'modo 2 sem alvo');
  const va = s.players[0].life;
  let r = roda(act(s, m0.find(a => a.targets[0].oid === pb))); assert.equal(r.objects[pb].zone, 'graveyard'); assert.equal(r.players[0].life, va - 2);
  r = roda(act(s, m0.find(a => a.targets[0].oid === ub))); assert.equal(r.objects[ub].zone, 'graveyard'); assert.equal(r.players[0].life, va - 2); assert.equal(r.players[1].life, s.players[1].life, 'quem perde é você');
  // 608.2b: o único alvo ficou ilegal; a mágica não resolve e você não perde vida
  let f = act(s, m0.find(a => a.targets[0].oid === ub)); f = J(f); f.zones[1].battlefield.splice(f.zones[1].battlefield.indexOf(ub), 1); f.zones[1].hand.push(ub); f.objects[ub].zone = 'hand';
  f = roda(f); assert.equal(f.players[0].life, va, 'sem alvo legal, não perde 2'); assert.equal(f.objects[v].zone, 'graveyard');
  // modo 2: cria a ficha Jace com 6; com uma ficha Jace já no campo, põe mais 6 nela
  let j = roda(act(s, m1[0])); assert.equal(j.players[0].life, va - 2);
  const jace = () => j.zones[0].battlefield.filter(o => j.objects[o].token && /Jace/.test(E.linhaDeTipo(j, j.objects[o])));
  assert.equal(jace().length, 1); const jo = j.objects[jace()[0]]; assert.equal(jo.loyalty ?? (jo.counters || {}).loyalty, 6);
  assert.match(E.linhaDeTipo(j, jo), /Planeswalker — Jace/); igual(j.facts[jo.name].colors, ['U']);
  let v2; [j, v2] = poe(j, 0, N, 'hand'); j = comMana(j, 'BB'); j = roda(act(j, legais(j, 0, a => a.t === 'cast' && a.oid === v2 && a.mode === 1)[0]));
  assert.equal(jace().length, 1, 'não cria outra'); const jo2 = j.objects[jace()[0]]; assert.equal(jo2.loyalty ?? (jo2.counters || {}).loyalty, 12); assert.equal(j.players[0].life, va - 4);
  assert.equal(legais(j, 0, a => a.t === 'activate' && a.oid === jo2.oid).length, 2, '[−1]: vigia 1 e [−3]: compra');
});

test('M-614 · Razorgrass Ambush // Razorgrass Field: 3 de dano em criatura atacante ou bloqueadora (instantânea); o verso pede 3 de vida ou entra virado e gera {W}', () => {
  const N = 'Razorgrass Ambush // Razorgrass Field';
  let e = mesa([N], ['Gigante']), ra, g, ua, ub, up;
  [e, ra] = poe(e, 0, N, 'hand'); [e, g] = poe(e, 1, 'Gigante'); [e, ub] = poe(e, 1, 'Urso'); [e, ua] = poe(e, 0, 'Urso'); [e, up] = poe(e, 0, 'Urso');
  assert.equal(legais(comMana(e, 'WW'), 0, a => a.t === 'cast' && a.oid === ra).length, 0, 'fora de combate não há alvo');
  e = passaAte(e, x => x.turn.active === 1 && x.pending && x.pending.kind === 'attackers'); e = act(e, { t: 'attack', p: 1, attackers: [g] });
  e = passaAte(e, x => x.pending && x.pending.kind === 'blockers'); e = act(e, { t: 'block', p: 0, blocks: [[ua, g]] }); e = act(e, { t: 'pass', p: 1 });
  e = comMana(e, 'WW'); const cs = legais(e, 0, a => a.t === 'cast' && a.oid === ra);
  igual([...new Set(cs.map(a => a.targets[0].oid))].sort(), [g, ua].sort(), 'atacante e bloqueador (de qualquer lado), não as que não estão em combate');
  assert.ok(!cs.some(a => a.targets[0].oid === ub || a.targets[0].oid === up));
  const r = roda(act(e, cs.find(a => a.targets[0].oid === g))); assert.equal(r.objects[g].damage, 3, '3 de dano'); assert.equal(r.objects[ra].zone, 'graveyard');
  const r2 = roda(act(e, cs.find(a => a.targets[0].oid === ua))); assert.equal(r2.objects[ua].zone, 'graveyard', 'na bloqueadora também');
  // o verso: terreno que pede 3 de vida ou entra virado
  let s = mesa([N]), rf; [s, rf] = poe(s, 0, N, 'hand');
  const l = act(s, { t: 'play_land', p: 0, oid: rf, face: 'verso' }); assert.equal(l.pending.kind, 'may_pay');
  const pago = act(l, { t: 'pay', p: 0 }), nao = act(l, { t: 'decline', p: 0 });
  assert.equal(pago.players[0].life, l.players[0].life - 3); assert.equal(pago.objects[rf].tapped, false);
  assert.equal(nao.objects[rf].tapped, true); assert.equal(nao.players[0].life, l.players[0].life);
  igual(legais(pago, 0, a => a.oid === rf).map(a => a.t), ['tap_mana']); assert.equal(act(pago, legais(pago, 0, a => a.oid === rf)[0]).players[0].pool.W, 1, '{T}: {W}');
});

// ── grupo 3 (revisor independente): Stony Silence, Ashen Rider, Censor ──

test('M-614 · Stony Silence: trava as ativadas de artefato dos dois lados, inclusive mana (605.1a); terreno segue gerando', () => {
  let s = mesa(['Stony Silence', 'Anel', 'Totem'], ['Anel']), ss, an, anB, to, pl;
  [s, an] = poe(s, 0, 'Anel'); [s, anB] = poe(s, 1, 'Anel'); [s, to] = poe(s, 0, 'Totem', 'hand'); [s, ss] = poe(s, 0, 'Stony Silence', 'hand'); [s, pl] = poe(s, 0, 'Plains');
  assert.ok(legais(s, 0, a => a.t === 'tap_mana' && a.oid === an).length, 'antes, o Anel gera mana');
  assert.equal(legais(s, 0, a => a.t === 'cast' && a.oid === to).length, 1, 'antes, Anel + Planície pagam {2}');
  s = comMana(s, 'WW'); s = roda(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === ss)[0]));
  assert.equal(s.objects[ss].zone, 'battlefield');
  assert.equal(legais(s, 0, a => a.oid === an).length, 0, 'o Anel de A não ativa');
  assert.equal(legais(s, 0, a => a.t === 'cast' && a.oid === to).length, 0, 'o pagamento automático também não usa o Anel');
  assert.ok(legais(s, 0, a => a.t === 'tap_mana' && a.oid === pl).length, 'terreno não é artefato');
  const b = act(s, { t: 'pass', p: 0 }); assert.equal(b.turn.priority, 1);
  assert.equal(legais(b, 1, a => a.oid === anB).length, 0, 'o Anel do oponente também não ativa (sem "your opponents control")');
});

test('M-614 · Ashen Rider: voa; ao entrar e ao morrer exila permanente alvo (qualquer uma, terreno e ela mesma incluídos), quem escolhe é o controlador', () => {
  let s = mesa(['Ashen Rider', 'Shock'], ['Totem']), ar, u, t, il, sh;
  [s, ar] = poe(s, 0, 'Ashen Rider', 'hand'); [s, u] = poe(s, 1, 'Urso'); [s, t] = poe(s, 1, 'Totem'); [s, il] = poe(s, 1, 'Island'); [s, sh] = poe(s, 0, 'Shock', 'hand');
  s = comMana(s, 'WWBBUUUU'); s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === ar)[0]);
  let of, quem; s = roda(s, (x, op, pd) => { if (pd.kind !== 'pick_target') return null; quem = pd.p; of = pd.options.map(o => o.oid); return op[pd.options.findIndex(o => o.oid === il)]; });
  igual(of.slice().sort(), [ar, u, t, il].sort(), 'ao entrar: criatura, artefato, terreno e a própria'); assert.equal(quem, 0);
  assert.equal(s.objects[il].zone, 'exile', 'exila, não destrói'); assert.equal(s.objects[ar].zone, 'battlefield');
  assert.ok(E.hasKeyword(s, s.objects[ar], 'flying'), 'voar');
  s = J(s); s.objects[ar].damage = 3; s = comMana(s, 'R');
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === sh && a.targets?.[0]?.oid === ar)[0]);
  of = null; s = roda(s, (x, op, pd) => { if (pd.kind !== 'pick_target') return null; quem = pd.p; of = pd.options.map(o => o.oid); return op[pd.options.findIndex(o => o.oid === t)]; });
  assert.equal(s.objects[ar].zone, 'graveyard'); assert.ok(of, 'ao morrer, dispara de novo'); igual(of.slice().sort(), [u, t].sort()); assert.equal(quem, 0);
  assert.equal(s.objects[t].zone, 'exile'); assert.equal(s.objects[u].zone, 'battlefield');
});

test('M-614 · Censor: anula mágica alvo a menos que o controlador dela pague {1} (ele decide); reciclagem {U} descarta e compra', () => {
  const choqueB = s => { let sh; [s, sh] = poe(s, 1, 'Shock', 'hand'); s = act(s, { t: 'pass', p: 0 }); s = comMana(s, 'R', 1);
    s = act(s, legais(s, 1, a => a.t === 'cast' && a.oid === sh && a.targets?.[0]?.player === 0)[0]); return [act(s, { t: 'pass', p: 1 }), sh]; };
  let s = mesa(['Censor'], ['Shock']), c, sh, il; [s, c] = poe(s, 0, 'Censor', 'hand'); [s, il] = poe(s, 1, 'Island'); [s, sh] = choqueB(s);
  s = comMana(s, 'UU'); const cs = legais(s, 0, a => a.t === 'cast' && a.oid === c);
  igual(cs.map(a => a.targets[0].oid), [sh], 'só mágica é alvo');
  let r = act(s, cs[0]); r = act(r, { t: 'pass', p: 0 }); r = act(r, { t: 'pass', p: 1 });
  assert.equal(r.pending.kind, 'may_pay'); assert.equal(r.pending.p, 1, 'quem decide é o controlador da mágica'); assert.equal(r.pending.cost, '{1}');
  const pago = roda(act(r, { t: 'pay', p: 1 })); assert.equal(pago.objects[il].tapped, true, 'pagou {1} com a Ilha'); assert.equal(pago.players[0].life, 18, 'o Shock resolve');
  const nao = roda(act(r, { t: 'decline', p: 1 })); assert.equal(nao.objects[sh].zone, 'graveyard'); assert.equal(nao.players[0].life, 20, 'anulado');
  let q = mesa(['Censor']), cc; [q, cc] = poe(q, 0, 'Censor', 'hand');
  assert.equal(legais(comMana(q, 'R'), 0, a => a.t === 'cycle').length, 0, 'reciclagem pede {U}');
  q = comMana(q, 'U'); q = roda(act(q, legais(q, 0, a => a.t === 'cycle' && a.oid === cc)[0]));
  assert.equal(q.objects[cc].zone, 'graveyard'); assert.equal(q.zones[0].hand.length, 1, 'compra uma');
});
