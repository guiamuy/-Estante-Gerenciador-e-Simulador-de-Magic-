// M-636 · rotina Motor contínuo · campanha Modern, ordem gulosa (coleta de 14/11/2026 13h51 UTC): Seasoned Cryomancer é a primeira
// da curva gulosa (9 listas Modern; única pendência de pelo menos uma lista).
// Regras: 603.12 gatilho reflexo — "When you discard one or more nonland cards this way, tap up to that many target creatures and put
// a stun counter on each of them": dispara só se ao menos uma carta descartada pelo próprio efeito não é terreno; o número de alvos
// (todos opcionais, "up to") é o de cartas que não são terreno descartadas assim; os alvos são escolhidos quando o reflexo vai à pilha,
// depois do descarte. 122.1d atordoamento: no lugar de desvirar, sai um marcador. 602.1 / 113.6: a ativada funciona do cemitério e o
// custo exila a própria carta. Texto da API da Scryfall pela coleta de 14/11 (.listas/oficiais-revisadas.json). Tudo falha no motor
// anterior: a carta não tinha script, nem o reflexo contava o descarte, nem havia o "vira e põe atordoamento" por alvo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';

const M = loadModules(), E = M.engine, S = M.scripts, SF = M.scryfall;
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const SC = 'Seasoned Cryomancer';
const oficial = n => { const o = OF.find(x => x.name === n); assert.ok(o, `${n} em .listas/oficiais-revisadas.json`);
  return SF.normalizeCard({ object: 'card', layout: 'normal', ...o, cmc: 3, colors: ['U'] }); };
const J = x => JSON.parse(JSON.stringify(x));

test('M-636 · o texto da Scryfall de 14/11 guardado; script à mão válido e cobertura completa', () => {
  const o = OF.find(x => x.name === SC);
  assert.match(o.fonte, /api\.scryfall\.com/); assert.equal(o.consulta, '2026-11-14');
  assert.equal(o.mana_cost, '{1}{U}{U}'); assert.equal(o.type_line, 'Creature — Human Wizard'); assert.equal(o.power, '2'); assert.equal(o.toughness, '2');
  assert.equal(o.oracle_text, 'When this creature enters, draw two cards, then discard two cards. When you discard one or more nonland cards this way, tap up to that many target creatures and put a stun counter on each of them.\n{3}{U}{U}, Exile this card from your graveyard: Draw two cards.');
  assert.ok(S.SCRIPTS[SC], 'tem script'); assert.equal(S.validateScript(S.SCRIPTS[SC]).length, 0);
  assert.equal(S.coverage(oficial(SC), S.SCRIPTS, SC).level, 'completo');
});

test('M-636 · validador: contaAssimM só no descarte; porNaoTerrenoAssimM só no reflexo logo depois dele, com efeitos que miram', () => {
  const ex = { example: { action: 'etb', target: 'none', expect: { handDelta: 0 } } };
  const gat = effects => ({ name: 'Teste', abilities: [{ kind: 'triggered', when: 'etb', effects }], ...ex });
  const ref = (efs = [{ do: 'vira_atordoa_m', target: 'creature', amount: 1 }]) => ({ do: 'reflexive', porNaoTerrenoAssimM: true, effects: efs });
  assert.equal(S.validateScript(gat([{ do: 'discard', amount: 2, contaAssimM: true }, ref()])).length, 0);
  assert.ok(S.validateScript(gat([{ do: 'draw', amount: 2, contaAssimM: true }])).length, 'contaAssimM fora do descarte');
  assert.ok(S.validateScript(gat([{ do: 'discard', amount: 2, contaAssimM: 'sim' }, ref()])).length, 'contaAssimM não é true');
  assert.ok(S.validateScript(gat([{ do: 'discard', amount: 2, contaAssimM: true }, { do: 'draw', amount: 1 }])).length, 'contaAssimM sem o reflexo logo depois');
  assert.ok(S.validateScript(gat([{ do: 'discard', amount: 2 }, ref()])).length, 'reflexo sem o descarte que conta');
  assert.ok(S.validateScript(gat([{ do: 'draw', amount: 1 }, ref()])).length, 'reflexo sem descarte antes');
  assert.ok(S.validateScript(gat([{ do: 'discard', amount: 2, contaAssimM: true }, ref([{ do: 'draw', amount: 1 }])])).length, 'efeito do reflexo sem alvo');
  assert.ok(S.validateScript(gat([{ do: 'discard', amount: 2, contaAssimM: true }, ref([{ do: 'vira_atordoa_m', target: 'creature', amount: 1, targetCount: 2 }])])).length, 'o número de alvos vem do descarte');
  assert.ok(S.validateScript(gat([{ do: 'discard', amount: 2, contaAssimM: true }, ref([{ do: 'vira_atordoa_m', target: 'self', amount: 1 }])])).length, 'vira_atordoa_m mira criatura');
});

// ── partidas ──
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: [...mana_cost.matchAll(/\{([^}]+)\}/g)].reduce((n, [, x]) => n + (/^\d+$/.test(x) ? +x : 1), 0), keywords: [], oracle_text: '', colors: [], ...extra });
const C = {
  [SC]: oficial(SC),
  Island: c0('Island', 'Basic Land — Island', '', { oracle_text: '({T}: Add {U}.)' }),
  'Urso Teste': c0('Urso Teste', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2', colors: ['G'] }),
  'Feitico Teste': c0('Feitico Teste', 'Sorcery', '{1}', {}),
};
const SCR = { 'Feitico Teste': { name: 'Feitico Teste', effects: [{ do: 'draw', amount: 1 }], example: { target: 'none', expect: { handDelta: 1 } } } };
const act = (s, a) => { const r = E.apply(s, a); if (r.error) throw new Error(JSON.stringify(r.error)); return r.state; };
const comEventos = (s, a) => { const r = E.apply(s, a); if (r.error) throw new Error(JSON.stringify(r.error)); return r; };
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
/** Põe no topo do grimório de p as cartas pedidas, na ordem (a primeira é a próxima compra). */
function topo(s, p, nomes) {
  s = J(s); const lib = s.zones[p].library;
  const postas = [];
  for (const name of nomes) { const oid = lib.find(o => s.objects[o].name === name && !postas.includes(o)); lib.splice(lib.indexOf(oid), 1); postas.push(oid); }
  lib.unshift(...postas);
  return s;
}
const limpaMao = (s, p) => { s = J(s); for (const oid of s.zones[p].hand.slice()) { s.zones[p].hand.splice(s.zones[p].hand.indexOf(oid), 1); s.zones[p].library.push(oid); s.objects[oid].zone = 'library'; } return s; };
const resolve = s => { for (let i = 0; i < 60 && (s.stack.length || s.pending || (s.queued || []).length); i++) { if (s.pending) return s; s = act(s, { t: 'pass', p: s.turn.priority }); } return s; };
const terras = (s, p, n) => { let o; for (let i = 0; i < n; i++) [s, o] = poe(s, p, 'Island'); return s; };
function mesa() {
  const d = ns => ns.map(name => ({ name, qty: 8, zone: 'main' }));
  const todos = [SC, 'Island', 'Urso Teste', 'Feitico Teste'];
  let s = E.createGame({ format: 'livre', seed: 636, mode: 'full', cards: C, scripts: SCR, first: 0, players: [{ name: 'A', deck: d(todos) }, { name: 'B', deck: d(todos) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = limpaMao(s, 0); s = limpaMao(s, 1);
  return s;
}
/** Mesa com dois Ursos do oponente, o Cryomancer na mão de A, três Ilhas e as duas compras do gatilho no topo. */
function conjura(compras) {
  let s = mesa(), cr, u1, u2;
  s = terras(s, 0, 3); [s, u1] = poe(s, 1, 'Urso Teste'); [s, u2] = poe(s, 1, 'Urso Teste');
  [s, cr] = poe(s, 0, SC, 'hand'); s = topo(s, 0, compras);
  s = act(s, { t: 'cast', p: 0, oid: cr }); s = resolve(s);
  assert.equal(s.objects[cr].zone, 'battlefield');
  assert.equal(s.pending && s.pending.kind, 'discard', 'compra duas e descarta duas');
  assert.equal(s.pending.n, 2); assert.equal(s.zones[0].hand.length, 2);
  return { s, cr, u1, u2 };
}
const descartaTudo = s => { while (s.pending && s.pending.kind === 'discard') s = act(s, { t: 'discard', p: 0, oid: s.zones[0].hand[0] }); return s; };

test('M-636 · duas cartas que não são terreno descartadas: até dois alvos; viram e recebem um marcador de atordoamento cada', () => {
  let { s, cr, u1, u2 } = conjura(['Feitico Teste', 'Feitico Teste']);
  s = descartaTudo(s); s = resolve(s);
  assert.equal(s.pending && s.pending.kind, 'pick_target', 'o reflexo pede o alvo ao ir para a pilha (603.12)');
  assert.ok(s.pending.semAlvo, '"up to": pode não mirar nada');
  assert.equal(s.pending.de, 2, 'dois alvos possíveis');
  const idx = oid => s.pending.options.findIndex(o => o.oid === oid);
  s = act(s, { t: 'pick_target', p: 0, index: idx(u1) });
  assert.equal(s.pending && s.pending.kind, 'pick_target');
  assert.ok(!s.pending.options.some(o => o.oid === u1), 'o mesmo alvo não se escolhe duas vezes');
  s = act(s, { t: 'pick_target', p: 0, index: s.pending.options.findIndex(o => o.oid === u2) });
  s = resolve(s);
  for (const u of [u1, u2]) { assert.equal(s.objects[u].tapped, true); assert.equal(s.objects[u].counters.stun, 1); }
  assert.equal(s.objects[cr].tapped, false); assert.equal(s.objects[cr].counters.stun, undefined);
  // 122.1d: no desvirar do turno do oponente, sai o marcador no lugar de desvirar
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1');
  for (const u of [u1, u2]) { assert.equal(s.objects[u].tapped, true, 'continua virada'); assert.ok(!s.objects[u].counters.stun, 'o marcador saiu'); }
});

test('M-636 · um terreno e uma que não é terreno: um alvo só; o registro conta o marcador', () => {
  let { s, u1 } = conjura(['Island', 'Feitico Teste']);
  s = descartaTudo(s); s = resolve(s);
  assert.equal(s.pending && s.pending.kind, 'pick_target');
  assert.equal(s.pending.de, undefined, 'um alvo só (sem "1 de N")');
  const r = comEventos(s, { t: 'pick_target', p: 0, index: s.pending.options.findIndex(o => o.oid === u1) });
  s = resolve(r.state);
  assert.equal(s.objects[u1].tapped, true); assert.equal(s.objects[u1].counters.stun, 1);
  assert.equal(s.stack.length, 0); assert.ok(!s.pending);
});

test('M-636 · só terrenos descartados: o reflexo não dispara', () => {
  let { s, u1, u2 } = conjura(['Island', 'Island']);
  s = descartaTudo(s); s = resolve(s);
  assert.ok(!s.pending, 'nada a escolher'); assert.equal(s.stack.length, 0);
  assert.equal(s.objects[u1].tapped, false); assert.equal(s.objects[u2].tapped, false);
  assert.equal(s.descarteAssimM, undefined, 'a mão guardada não fica no estado');
});

test('M-636 · "up to": recusar os alvos não vira nada', () => {
  let { s, u1, u2 } = conjura(['Feitico Teste', 'Feitico Teste']);
  s = descartaTudo(s); s = resolve(s);
  assert.ok(E.legalActions(s, 0).some(a => a.t === 'pick_target' && a.nenhum), 'a mesa oferece "Nenhum alvo"');
  s = act(s, { t: 'pick_target', p: 0, nenhum: true });
  if (s.pending && s.pending.kind === 'pick_target') s = act(s, { t: 'pick_target', p: 0, nenhum: true });
  s = resolve(s);
  assert.equal(s.objects[u1].tapped, false); assert.equal(s.objects[u2].tapped, false);
  assert.ok(!s.objects[u1].counters.stun && !s.objects[u2].counters.stun);
});

test('M-636 · a criatura alvo já virada recebe o marcador mesmo assim; a sua também pode ser alvo', () => {
  let { s, cr, u1 } = conjura(['Feitico Teste', 'Feitico Teste']);
  s = J(s); s.objects[u1].tapped = true;
  s = descartaTudo(s); s = resolve(s);
  assert.ok(s.pending.options.some(o => o.oid === cr), '"target creatures": qualquer criatura, a própria inclusive');
  s = act(s, { t: 'pick_target', p: 0, index: s.pending.options.findIndex(o => o.oid === u1) });
  s = act(s, { t: 'pick_target', p: 0, nenhum: true });
  s = resolve(s);
  assert.equal(s.objects[u1].tapped, true); assert.equal(s.objects[u1].counters.stun, 1);
});

test('M-636 · {3}{U}{U}, exilar do cemitério: compra duas; no campo não se ativa', () => {
  let s = mesa(), cr;
  s = terras(s, 0, 5); [s, cr] = poe(s, 0, SC, 'graveyard');
  const of = E.legalActions(s, 0).filter(a => a.t === 'activate' && a.oid === cr);
  assert.equal(of.length, 1); assert.equal(of[0].fromGraveyard, true);
  const mao = s.zones[0].hand.length;
  s = act(s, of[0]);
  assert.equal(s.objects[cr].zone, 'exile', 'o custo exila a carta');
  s = resolve(s);
  assert.equal(s.zones[0].hand.length, mao + 2);
  let s2, cr2; [s2, cr2] = poe(mesa(), 0, SC); s2 = terras(s2, 0, 5);
  assert.equal(E.legalActions(s2, 0).filter(a => a.t === 'activate' && a.oid === cr2).length, 0, 'só do cemitério');
});
