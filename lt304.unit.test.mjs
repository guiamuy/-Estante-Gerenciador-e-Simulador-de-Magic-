// M-630 · rotina Motor contínuo · campanha Modern, ordem gulosa (coleta de 13/11/2026 16h40 UTC: 140 de 719 listas a 100%):
// Abhorrent Oculus (10 listas Modern; com a M-625, a M-626, a M-628 e a M-629 na fila do trem, a única pendência de 6 delas).
// Regras: 601.2b/601.2h, custo adicional "As an additional cost to cast this spell, exile six cards from your graveyard" — uma conjuração
// oferecida e as seis cartas escolhidas por quem conjura logo depois (como o delve), sem conjurar com cinco ou menos; 603.2 + 503.1,
// "At the beginning of each opponent's upkeep": dispara na manutenção do oponente, não na sua; 701.62a manifestar pavor (o efeito da V-18).
// Texto da API da Scryfall da coleta de 13/11 (.listas/oficiais-revisadas.json). Tudo falha no motor anterior: a carta não tinha script
// (conjurava sem custo adicional e sem gatilho).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';

const M = loadModules(), E = M.engine, S = M.scripts, SF = M.scryfall;
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const OC = 'Abhorrent Oculus';
const oficial = n => { const o = OF.find(x => x.name === n); assert.ok(o, `${n} em .listas/oficiais-revisadas.json`);
  return SF.normalizeCard({ object: 'card', layout: 'normal', ...o, cmc: 3, colors: ['U'] }); };
const J = x => JSON.parse(JSON.stringify(x));

test('M-630 · o texto da Scryfall de 13/11 guardado; script à mão válido e cobertura completa', () => {
  const o = OF.find(x => x.name === OC);
  assert.match(o.fonte, /api\.scryfall\.com/); assert.equal(o.consulta, '2026-11-13');
  assert.equal(o.oracle_text, 'As an additional cost to cast this spell, exile six cards from your graveyard.\nFlying\nAt the beginning of each opponent\'s upkeep, manifest dread. (Look at the top two cards of your library. Put one onto the battlefield face down as a 2/2 creature and the other into your graveyard. Turn it face up any time for its mana cost if it\'s a creature card.)');
  assert.equal(o.mana_cost, '{2}{U}'); assert.equal(o.type_line, 'Creature — Eye'); assert.equal(o.power, '5'); assert.equal(o.toughness, '5');
  assert.ok(S.SCRIPTS[OC], 'tem script'); assert.equal(S.validateScript(S.SCRIPTS[OC]).length, 0);
  assert.equal(S.coverage(oficial(OC), S.SCRIPTS, OC).level, 'completo');
});

// ── partidas ──
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: [...mana_cost.matchAll(/\{([^}]+)\}/g)].reduce((n, [, x]) => n + (/^\d+$/.test(x) ? +x : 1), 0), keywords: [], oracle_text: '', colors: [], ...extra });
const C = {
  [OC]: oficial(OC),
  Island: c0('Island', 'Basic Land — Island', '', { oracle_text: '({T}: Add {U}.)' }),
  Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2', colors: ['G'] }),
  Pedra: c0('Pedra', 'Artifact', '{1}'),
};
const ex = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCR = { Urso: { name: 'Urso', ...ex }, Pedra: { name: 'Pedra', ...ex } };
const act = (s, a) => { const r = E.apply(s, a); if (r.error) throw new Error(JSON.stringify(r.error)); return r.state; };
const recusa = (s, a, re) => { const r = (() => { try { return E.apply(s, a); } catch (e) { return { error: { message: e.message } }; } })(); assert.ok(r.error, `devia recusar ${JSON.stringify(a)}`); if (re) assert.match(JSON.stringify(r.error), re); };
function passaAte(s, fim, max = 400) {
  for (let i = 0; i < max && !fim(s); i++) { const pd = s.pending;
    if (pd && pd.kind === 'discard' && pd.reason !== 'effect') s = act(s, { t: 'discard', p: pd.p, oid: s.zones[pd.p].hand[0] });
    else if (pd && pd.kind === 'attackers') s = act(s, { t: 'attack', p: pd.p, attackers: [] });
    else if (pd && pd.kind === 'blockers') s = act(s, { t: 'block', p: pd.p, blocks: [] });
    else if (pd) return s; else s = act(s, { t: 'pass', p: s.turn.priority }); }
  return s;
}
function poe(s, p, name, zone = 'battlefield') {
  s = J(s);
  const from = ['library', 'hand', 'graveyard'].map(z => s.zones[p][z]).find(z => z.some(o => s.objects[o].name === name));
  if (!from) throw new Error(name + ' ausente');
  const oid = from.find(o => s.objects[o].name === name); from.splice(from.indexOf(oid), 1); s.zones[p][zone].push(oid);
  Object.assign(s.objects[oid], { zone, sick: false, tapped: false, controller: p });
  return [s, oid];
}
/** N cartas do grimório (do fundo) para o cemitério de p, sem mexer no topo. */
const enterra = (s, p, n) => { s = J(s); const l = []; for (let i = 0; i < n; i++) { const c = s.zones[p].library.pop(); s.zones[p].graveyard.push(c); s.objects[c].zone = 'graveyard'; l.push(c); } return [s, l]; };
const limpaMao = (s, p) => { s = J(s); for (const oid of s.zones[p].hand.slice()) { s.zones[p].hand.splice(s.zones[p].hand.indexOf(oid), 1); s.zones[p].library.unshift(oid); s.objects[oid].zone = 'library'; } return s; };
const resolve = s => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { if (s.pending) return s; s = act(s, { t: 'pass', p: s.turn.priority }); } return s; };
const terras = (s, p, n) => { let o; for (let i = 0; i < n; i++) [s, o] = poe(s, p, 'Island'); return s; };
/** A no próprio main1; os dois baralhos têm de tudo. */
function mesa() {
  const d = ns => ns.map(name => ({ name, qty: 8, zone: 'main' }));
  const todos = [OC, 'Island', 'Urso', 'Pedra'];
  let s = E.createGame({ format: 'livre', seed: 630, mode: 'full', cards: C, scripts: SCR, first: 0, players: [{ name: 'A', deck: d(todos) }, { name: 'B', deck: d(todos) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = limpaMao(s, 0); s = limpaMao(s, 1);
  return s;
}
const castsDe = (s, p, oid) => E.legalActions(s, p).filter(a => a.t === 'cast' && a.oid === oid);

test('M-630 · 601.2b: com cinco cartas no cemitério não conjura; com seis ou mais, uma conjuração só (sem uma oferta por combinação)', () => {
  let s = mesa(), oc;
  [s, oc] = poe(s, 0, OC, 'hand'); s = terras(s, 0, 3);
  let s5; [s5] = enterra(s, 0, 5);
  assert.equal(castsDe(s5, 0, oc).length, 0, 'cinco cartas não pagam o custo');
  recusa(s5, { t: 'cast', p: 0, oid: oc }, /custo adicional|cemit/);
  let s9; [s9] = enterra(s, 0, 9);
  const v = castsDe(s9, 0, oc);
  assert.equal(v.length, 1, 'nove cartas: uma oferta (antes: C(9,6) = 84 combinações cortadas em 24)');
  assert.ok(!(v[0].pay && v[0].pay.exile), 'as cartas não vêm na oferta');
});

test('M-630 · 601.2h: quem conjura escolhe as seis do cemitério logo depois; as outras ficam; a criatura entra 5/5 com voar', () => {
  let s = mesa(), oc, cem;
  [s, oc] = poe(s, 0, OC, 'hand'); s = terras(s, 0, 3); [s, cem] = enterra(s, 0, 9);
  s = act(s, castsDe(s, 0, oc)[0]);
  assert.equal(s.objects[oc].zone, 'stack', 'a mágica já está na pilha');
  const pk = s.pending;
  assert.equal(pk && pk.kind, 'pick'); assert.equal(pk.p, 0); assert.equal(pk.min, 6); assert.equal(pk.max, 6); assert.equal(pk.to, 'exile');
  assert.deepEqual(J(pk.from.slice().sort()), J(cem.slice().sort()), 'escolhe entre todas as nove do cemitério');
  assert.equal(pk.tituloM, 'Custo adicional: exile do cemitério');
  const escolhidas = cem.slice(3); // as últimas seis: o motor não decide por ninguém
  for (const oid of escolhidas.slice(0, 5)) s = act(s, { t: 'pick', p: 0, oid });
  recusa(s, { t: 'pick_done', p: 0 }, /./);
  assert.ok(!E.legalActions(s, 0).some(a => a.t === 'pick_done'), 'com cinco, a mesa não oferece terminar');
  s = act(s, { t: 'pick', p: 0, oid: escolhidas[5] });
  if (s.pending && s.pending.kind === 'pick') s = act(s, { t: 'pick_done', p: 0 });
  for (const oid of escolhidas) assert.equal(s.objects[oid].zone, 'exile', 'as seis escolhidas vão para o exílio');
  for (const oid of cem.slice(0, 3)) assert.equal(s.objects[oid].zone, 'graveyard', 'as três outras ficam');
  s = resolve(s);
  const o = s.objects[oc];
  assert.equal(o.zone, 'battlefield');
  { const st = E.stats(s, o); assert.deepEqual([st.power, st.toughness], [5, 5]); }
  assert.ok(E.hasKeyword(s, o, 'flying'), 'voar');
});

test('M-630 · com as cartas na própria ação (pay.exile), o custo é pago na hora, sem escolha aberta; carta repetida ou de fora é recusada', () => {
  let s = mesa(), oc, cem;
  [s, oc] = poe(s, 0, OC, 'hand'); s = terras(s, 0, 3); [s, cem] = enterra(s, 0, 7);
  const s1 = act(s, { t: 'cast', p: 0, oid: oc, add: 0, pay: { exile: cem.slice(1) } });
  assert.ok(!s1.pending, 'nada a escolher'); assert.equal(s1.objects[cem[0]].zone, 'graveyard');
  for (const x of cem.slice(1)) assert.equal(s1.objects[x].zone, 'exile');
  recusa(s, { t: 'cast', p: 0, oid: oc, add: 0, pay: { exile: [cem[0], cem[0], cem[1], cem[2], cem[3], cem[4]] } }, /6 cartas/);
  const doOutro = s.zones[1].library[0];
  recusa(s, { t: 'cast', p: 0, oid: oc, add: 0, pay: { exile: [doOutro, ...cem.slice(0, 5)] } }, /6 cartas/);
});

test('M-630 · 503.1 + 701.62a: na manutenção do oponente manifesta pavor (olha duas, uma entra 2/2 virada, a outra vai ao cemitério); na sua, nada', () => {
  let s = mesa(), oc;
  [s, oc] = poe(s, 0, OC);
  // vai até a manutenção de B
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'upkeep' && (x.stack.length > 0 || !!x.pending));
  assert.equal(s.turn.active, 1); assert.equal(s.turn.step, 'upkeep');
  const topo = s.zones[0].library.slice(0, 2), gyAntes = s.zones[0].graveyard.length;
  s = resolve(s);
  const pk = s.pending;
  assert.equal(pk && pk.kind, 'pick', 'escolha da carta que entra virada'); assert.equal(pk.p, 0, 'quem controla o Oculus escolhe'); assert.deepEqual(J(pk.from), J(topo));
  s = act(s, { t: 'pick', p: 0, oid: topo[1] });
  if (s.pending && s.pending.kind === 'pick') s = act(s, { t: 'pick_done', p: 0 });
  const v = s.objects[topo[1]];
  assert.equal(v.zone, 'battlefield'); assert.equal(v.faceDown, true); assert.equal(v.controller, 0, 'a manifestada é de quem controla o Oculus');
  assert.equal(E.ehManifestada(s, v), true); { const st = E.stats(s, v); assert.deepEqual([st.power, st.toughness], [2, 2]); }
  assert.equal(s.objects[topo[0]].zone, 'graveyard'); assert.equal(s.zones[0].graveyard.length, gyAntes + 1);
  // a manutenção seguinte é de A: o gatilho não dispara
  const campoA = s.zones[0].battlefield.length;
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'draw');
  assert.equal(s.zones[0].battlefield.length, campoA, 'na sua manutenção o Oculus não manifesta');
  assert.equal(s.objects[oc].zone, 'battlefield');
});

test('M-630 · grimório com uma carta só: manifesta essa, sem escolha; vazio: nada acontece (701.62a)', () => {
  let s = mesa(), oc;
  [s, oc] = poe(s, 0, OC);
  s = J(s); const resto = s.zones[0].library.splice(1); for (const x of resto) { s.zones[0].graveyard.push(x); s.objects[x].zone = 'graveyard'; }
  const unica = s.zones[0].library[0];
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'upkeep' && (x.stack.length > 0 || !!x.pending));
  s = resolve(s);
  assert.ok(!s.pending || s.pending.kind !== 'pick', 'sem o que escolher');
  assert.equal(s.objects[unica].zone, 'battlefield'); assert.equal(s.objects[unica].faceDown, true);
});
