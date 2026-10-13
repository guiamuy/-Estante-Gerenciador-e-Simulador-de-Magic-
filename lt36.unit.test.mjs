// M-353 · LT34 · Primitivas pedidas pelas trilhas paralelas e Mesmeric Fiend: "look at the top card … you may reveal … transform ~" (Delver of
// Secrets, 701.28; o script à mão com a face de trás é da trilha `cartas`), mana a mais de "tapped for mana" em habilidade com {T} e outro custo
// (Wild Growth numa terra de esgotamento, 106.12a; pedido da L-1), "return it to the battlefield transformed under your control" (The Modern Age;
// pedido da L-3) e Mesmeric Fiend ("reveals their hand and you choose a nonland card … exile"; "when ~ leaves, return the exiled card to its owner's
// hand"). Texto oficial do Fiend em .listas/oficiais-revisadas.json (Oracle do Forge, 13/10/2026). Cada teste de regra falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';
import { loadModules } from './_load.mjs';

const { leitor: L, scripts: S } = loadModules();
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const mv = m => [...m.matchAll(/\{([^}]+)\}/g)].reduce((n, x) => n + (/^\d+$/.test(x[1]) ? +x[1] : 1), 0);
const cores = m => [...new Set((m.match(/[WUBRG]/g) || []))];
const carta = n => { const c = OF.find(x => x.name === n); assert.ok(c, n); return { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: mv(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: cores(c.mana_cost), ...(c.power ? { power: c.power, toughness: c.toughness } : {}) }; };
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: mv(mana_cost), keywords: [], oracle_text: '', colors: cores(mana_cost), ...extra });
const EX = { example: { action: 'etb', target: 'none', expect: { attached: false } } };
const cards = { 'Mesmeric Fiend': carta('Mesmeric Fiend'),
  Vigia: c0('Vigia', 'Creature — Human Wizard', '{U}', { power: '1', toughness: '1' }), Raio: c0('Raio', 'Instant', '{R}'), Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2' }),
  Crescer: c0('Crescer', 'Enchantment — Aura', '{G}'), Agulha: c0('Agulha', 'Land', ''), Lobo: c0('Lobo', 'Creature — Wolf', '{1}{G}', { power: '2', toughness: '2' }), Piscar: c0('Piscar', 'Instant', '{W}'), Lampejo: c0('Lampejo', 'Instant', '{W}'), Tres: c0('Tres', 'Creature — Beast', '{2}{G}', { power: '3', toughness: '3' }), Choque: c0('Choque', 'Instant', '{R}') };
const scripts = { 'Mesmeric Fiend': { ...L.ler(carta('Mesmeric Fiend')).script, ...EX },
  Vigia: { name: 'Vigia', self: { duplaFace: true }, abilities: [{ kind: 'triggered', when: 'upkeep', effects: [{ do: 'revela_topo_transforma', tipos: ['instant', 'sorcery'] }] }],
    back: { name: 'Inseto', types: ['creature'], subtypes: ['Human', 'Insect'], colors: ['U'], power: 3, toughness: 2, keywords: ['flying'] }, ...EX },
  Lampejo: { name: 'Lampejo', effects: [{ do: 'pisca', target: 'permanent-you-control' }], example: { target: 'own-creature', expect: { selfLife: 0 } } },
  Piscar: { name: 'Piscar', effects: [{ do: 'pisca', target: 'creature-you-control' }], example: { target: 'own-creature', expect: { selfLife: 0 } } },
  Choque: { name: 'Choque', effects: [{ do: 'damage', amount: 2, target: 'any' }], example: { target: 'enemy-creature', expect: { gone: true } } },
  Raio: { name: 'Raio', effects: [{ do: 'damage', amount: 3, target: 'any' }], example: { target: 'enemy-creature', expect: { gone: true } } },
  Crescer: { name: 'Crescer', aura: { enchant: 'land' }, grants: { extraMana: ['G'] }, example: { action: 'aura', target: 'own-land', expect: { mana: true } } },
  Agulha: { name: 'Agulha', entra: [{ afetados: 'self', virada: true, marcadores: { depletion: 2 } }], abilities: [{ kind: 'activated', cost: { tap: true, removeCounters: { tipo: 'depletion', n: 1 } }, semMarcadorSacrifica: 'depletion', effects: [{ do: 'add_mana', symbols: ['R', 'R'] }] }], ...EX },
  Lobo: { name: 'Lobo', self: { duplaFace: true }, abilities: [{ kind: 'activated', cost: { mana: '{0}' }, effects: [{ do: 'exile_return_transformed', target: 'self-source', sob: 'voce' }] }, { kind: 'activated', cost: { mana: '{1}' }, effects: [{ do: 'exile_return_transformed', target: 'self-source' }] }],
    back: { name: 'Lobisomem', types: ['creature'], subtypes: ['Werewolf'], colors: ['G'], power: 4, toughness: 4 }, ...EX } };
function mesaX(a = [], b = [], seed = 67) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Island', 'Forest', 'Swamp']) }, { name: 'B', deck: baralho([...b, 'Plains', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolveSo = s => act(act(s, { t: 'pass', p: s.turn.priority }), { t: 'pass', p: 1 - s.turn.priority });
const ateManutencao = s => passaAte(act(s, { t: 'pass', p: s.turn.priority }), x => x.turn.active === 0 && (x.stack.length > 0 || !!x.pending) && x.turn.number > s.turn.number);
const topoE = (s, oid) => { s = J(s); const lib = s.zones[0].library; lib.splice(lib.indexOf(oid), 1); lib.unshift(oid); s.objects[oid].zone = 'library'; return s; };

test('LT34 · revela_topo_transforma (Delver of Secrets): com instantânea ou feitiço no topo, pode revelar e transformar; recusar não transforma; com outra carta, nada', () => {
  let s = mesaX(['Vigia', 'Raio', 'Urso']), v, r, u;
  [s, v] = poe(s, 0, 'Vigia'); [s, r] = poe(s, 0, 'Raio', 'hand'); [s, u] = poe(s, 0, 'Urso', 'hand');
  let t = topoE(s, r); t = ateManutencao(t); t = tudo(t, x => x.pending.kind === 'may_pay' ? legais(x, x.pending.p, a => a.t === 'pay')[0] : legais(x, x.pending.p)[0]);
  assert.equal(t.objects[v].name, 'Inseto', 'transformou'); assert.equal(E.stats(t, t.objects[v]).power, 3); assert.ok(E.hasKeyword(t, t.objects[v], 'flying'));
  let n = topoE(s, r); n = ateManutencao(n); n = resolveSo(n); assert.equal(n.pending && n.pending.kind, 'may_pay', 'pergunta se revela');
  n = tudo(act(n, legais(n, n.pending.p, a => a.t !== 'pay')[0])); assert.equal(n.objects[v].name, 'Vigia', 'recusou: não transforma');
  let w = topoE(s, u); w = tudo(resolveSo(ateManutencao(w))); assert.equal(w.objects[v].name, 'Vigia', 'criatura no topo: nada'); assert.ok(!w.pending);
});

test('LT34 · 106.12a: terra encantada com "tapped for mana" dá o mana a mais também pela habilidade com {T} e outro custo (pedido da L-1)', () => {
  let s = mesaX(['Crescer', 'Agulha']), cr, ag;
  [s, cr] = poe(s, 0, 'Crescer', 'hand'); [s, ag] = poe(s, 0, 'Agulha'); s = J(s); s.objects[ag].counters = { depletion: 2 }; s.objects[ag].tapped = false;
  s = tudo(resolveSo(act(comMana(s, 'G'), legais(comMana(s, 'G'), 0, a => a.t === 'cast' && a.oid === cr && a.targets && a.targets[0].oid === ag)[0])));
  s = J(s); for (const k in s.players[0].pool) s.players[0].pool[k] = 0;
  const q = act(s, legais(s, 0, a => a.t === 'activate' && a.oid === ag)[0]);
  assert.deepEqual([q.players[0].pool.R, q.players[0].pool.G], [2, 1]);
});

test('LT34 · exile_return_transformed com sob: voce volta sob o controle de quem controlava; sem, sob o dono (pedido da L-3)', () => {
  let s = mesaX(['Lobo']), lb;
  [s, lb] = poe(s, 0, 'Lobo'); s = J(s); s.objects[lb].controller = 1; s.objects[lb].sick = false; delete s.objects[lb].entrouNoTurno;
  s = passaAte(act(s, { t: 'pass', p: s.turn.priority }), x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  const a = tudo(resolveSo(act(s, legais(s, 1, x => x.t === 'activate' && x.oid === lb && (x.index || 0) === 0)[0])));
  assert.equal(a.objects[lb].name, 'Lobisomem'); assert.equal(a.objects[lb].controller, 1, 'under your control');
  const b = tudo(resolveSo(act(comMana(s, 'C', 1), legais(comMana(s, 'C', 1), 1, x => x.t === 'activate' && x.oid === lb && x.index === 1)[0])));
  assert.equal(b.objects[lb].controller, 0, 'sem sob: volta ao dono');
});

test('LT34 · Mesmeric Fiend: você escolhe uma carta que não seja terreno da mão do oponente e a exila; quando o Fiend sai, ela volta à mão do dono; se o Fiend sai antes, fica exilada', () => {
  let s = mesaX(['Mesmeric Fiend', 'Raio'], ['Urso']), mf, u, pl;
  [s, mf] = poe(s, 0, 'Mesmeric Fiend', 'hand'); s = J(s); for (const o of s.zones[1].hand.slice()) { s.zones[1].hand = s.zones[1].hand.filter(x => x !== o); s.zones[1].library.push(o); s.objects[o].zone = 'library'; }
  [s, u] = poe(s, 1, 'Urso', 'hand'); [s, pl] = poe(s, 1, 'Plains', 'hand');
  let t = resolveSo(act(comMana(s, 'BB'), legais(comMana(s, 'BB'), 0, a => a.t === 'cast' && a.oid === mf)[0]));
  t = resolveSo(t); assert.equal(t.pending.kind, 'pick'); assert.equal(t.pending.p, 0, 'quem escolhe é você'); assert.deepEqual([...t.pending.from], [u], 'só a que não é terreno');
  t = tudo(act(t, { t: 'pick', p: 0, oid: u })); assert.equal(t.objects[u].zone, 'exile'); assert.equal(t.objects[pl].zone, 'hand');
  let r; [t, r] = poe(t, 0, 'Raio', 'hand');
  const k = tudo(resolveSo(act(comMana(t, 'R'), legais(comMana(t, 'R'), 0, a => a.t === 'cast' && a.oid === r && a.targets[0].oid === mf)[0])));
  assert.equal(k.objects[mf].zone, 'graveyard'); assert.equal(k.objects[u].zone, 'hand', 'volta à mão do dono');
  // o Fiend sai com o gatilho de entrada ainda na pilha: o de saída resolve antes e não devolve nada; depois a carta é exilada para sempre
  let e = act(comMana(s, 'BB'), legais(comMana(s, 'BB'), 0, a => a.t === 'cast' && a.oid === mf)[0]); e = resolveSo(e); assert.ok(e.stack.length, 'gatilho de entrada na pilha');
  let r2; [e, r2] = poe(e, 0, 'Raio', 'hand'); e = act(comMana(e, 'R'), legais(comMana(e, 'R'), 0, a => a.t === 'cast' && a.oid === r2 && a.targets[0].oid === mf)[0]);
  e = tudo(e, x => x.pending.kind === 'pick' ? { t: 'pick', p: 0, oid: u } : legais(x, x.pending.p)[0]);
  assert.equal(e.objects[mf].zone, 'graveyard'); assert.equal(e.objects[u].zone, 'exile', 'fica exilada (400.7)');
});

const piscar = (s, alvo) => { let pi; [s, pi] = poe(s, 0, 'Piscar', 'hand'); const m = comMana(s, 'W'); return act(m, legais(m, 0, a => a.t === 'cast' && a.oid === pi && a.targets[0].oid === alvo)[0]); };
const ordem = k => x => x.pending.kind === 'order_triggers' || x.pending.kind === 'ordem' ? legais(x, x.pending.p)[k] || legais(x, x.pending.p)[0] : x.pending.kind === 'pick' ? { t: 'pick', p: x.pending.p, oid: x.pending.from[0] } : legais(x, x.pending.p)[0];
function fiendComCarta(seed) {
  let s = mesaX(['Mesmeric Fiend', 'Piscar', 'Raio'], ['Urso', 'Choque'], seed), mf, u, ch;
  [s, mf] = poe(s, 0, 'Mesmeric Fiend', 'hand'); s = J(s); for (const o of s.zones[1].hand.slice()) { s.zones[1].hand = s.zones[1].hand.filter(x => x !== o); s.zones[1].library.push(o); s.objects[o].zone = 'library'; }
  [s, ch] = poe(s, 1, 'Choque', 'hand'); [s, u] = poe(s, 1, 'Urso', 'hand');
  s = resolveSo(resolveSo(act(comMana(s, 'BB'), legais(comMana(s, 'BB'), 0, a => a.t === 'cast' && a.oid === mf)[0])));
  s = tudo(act(s, { t: 'pick', p: 0, oid: ch })); return [s, mf, u, ch];
}

test('achado da revisão do lote XXV · 607.2a/603.10a: Fiend piscado depois do gatilho de entrada — a carta do Fiend antigo volta à mão do dono e o novo guarda a dele, nas duas ordens', () => {
  for (const k of [0, 1]) {
    let [s, mf, u, ch] = fiendComCarta(67 + k);
    assert.equal(s.objects[ch].zone, 'exile');
    let t = tudo(resolveSo(piscar(s, mf)), ordem(k));
    assert.equal(t.objects[ch].zone, 'hand', 'ordem ' + k + ': o Choque volta à mão de B');
    assert.equal(t.objects[u].zone, 'exile', 'ordem ' + k + ': o Fiend novo exilou o Urso');
    let r; [t, r] = poe(t, 0, 'Raio', 'hand');
    const k2 = tudo(resolveSo(act(comMana(t, 'R'), legais(comMana(t, 'R'), 0, a => a.t === 'cast' && a.oid === r && a.targets[0].oid === mf)[0])));
    assert.equal(k2.objects[u].zone, 'hand', 'ordem ' + k + ': quando o Fiend novo sai, o Urso volta');
  }
});

test('achado da revisão do lote XXV · 400.7: Fiend piscado em resposta ao próprio gatilho de entrada — a carta do gatilho antigo fica exilada para sempre', () => {
  let s = mesaX(['Mesmeric Fiend', 'Piscar', 'Raio'], ['Urso', 'Choque'], 71), mf, u, ch;
  [s, mf] = poe(s, 0, 'Mesmeric Fiend', 'hand'); s = J(s); for (const o of s.zones[1].hand.slice()) { s.zones[1].hand = s.zones[1].hand.filter(x => x !== o); s.zones[1].library.push(o); s.objects[o].zone = 'library'; }
  [s, ch] = poe(s, 1, 'Choque', 'hand'); [s, u] = poe(s, 1, 'Urso', 'hand');
  s = resolveSo(act(comMana(s, 'BB'), legais(comMana(s, 'BB'), 0, a => a.t === 'cast' && a.oid === mf)[0])); assert.equal(s.stack.length, 1, 'gatilho de entrada na pilha');
  let t = piscar(s, mf);
  // o Piscar resolve (Fiend novo: gatilhos de saída e de entrada novos), depois o gatilho antigo
  t = tudo(t, x => x.pending.kind === 'pick' ? { t: 'pick', p: 0, oid: x.pending.from.includes(u) ? u : x.pending.from[0] } : legais(x, x.pending.p)[0]);
  const exiladas = [u, ch].filter(o => t.objects[o].zone === 'exile');
  assert.equal(exiladas.length, 2, 'as duas foram exiladas (uma por gatilho)');
  const g = t.objects[mf].holding; assert.ok(g === u || g === ch, 'o Fiend novo guarda uma só');
  let r; [t, r] = poe(t, 0, 'Raio', 'hand');
  const k = tudo(resolveSo(act(comMana(t, 'R'), legais(comMana(t, 'R'), 0, a => a.t === 'cast' && a.oid === r && a.targets[0].oid === mf)[0])));
  const voltou = [u, ch].filter(o => k.objects[o].zone === 'hand'); assert.equal(voltou.length, 1, 'só a carta do Fiend novo volta; a do antigo fica exilada');
});

test('achado da revisão do lote XXV · 400.7: Delver (revela_topo_transforma) e exile_return_transformed não agem sobre a criatura piscada em resposta', () => {
  let s = mesaX(['Vigia', 'Raio', 'Lobo', 'Piscar']), v, r, lb;
  [s, v] = poe(s, 0, 'Vigia'); [s, r] = poe(s, 0, 'Raio', 'hand');
  let t = ateManutencao(topoE(s, r)); assert.ok(t.stack.length, 'gatilho de manutenção na pilha');
  t = piscar(t, v);
  t = tudo(t, x => x.pending.kind === 'may_pay' ? legais(x, x.pending.p, a => a.t === 'pay')[0] || legais(x, x.pending.p)[0] : legais(x, x.pending.p)[0]);
  assert.equal(t.objects[v].name, 'Vigia', 'o objeto novo não transforma');
  let u = s; [u, lb] = poe(u, 0, 'Lobo'); u = J(u); u.objects[lb].sick = false; delete u.objects[lb].entrouNoTurno;
  u = act(u, legais(u, 0, x => x.t === 'activate' && x.oid === lb && (x.index || 0) === 0)[0]);
  u = tudo(piscar(u, lb));
  assert.equal(u.objects[lb].name, 'Lobo', 'a habilidade do Lobo antigo não transforma o novo');
});

test('achado da revisão do lote XXV · 400.7: Journey to Nowhere piscada em resposta ao próprio gatilho — a nova guarda a criatura do gatilho novo; a do antigo fica exilada para sempre', () => {
  let s = mesaX(['Journey to Nowhere', 'Lampejo', 'Raio'], ['Urso', 'Tres'], 73), jn, u, t3;
  [s, jn] = poe(s, 0, 'Journey to Nowhere', 'hand'); [s, u] = poe(s, 1, 'Urso'); [s, t3] = poe(s, 1, 'Tres');
  let t = resolveSo(act(comMana(s, 'WW'), legais(comMana(s, 'WW'), 0, a => a.t === 'cast' && a.oid === jn)[0]));
  if (t.pending && t.pending.kind === 'pick_target') t = act(t, { t: 'pick_target', p: 0, index: Math.max(0, t.pending.options.findIndex(o => o && o.oid === u)) });
  assert.ok(t.stack.length, 'gatilho de entrada na pilha'); const alvoAntigo = t.objects[t.stack[t.stack.length - 1]].targets[0].oid;
  let lp; [t, lp] = poe(t, 0, 'Lampejo', 'hand'); t = act(comMana(t, 'W'), legais(comMana(t, 'W'), 0, a => a.t === 'cast' && a.oid === lp && a.targets[0].oid === jn)[0]);
  const outro = alvoAntigo === u ? t3 : u;
  t = tudo(t, x => x.pending.kind === 'pick_target' ? { t: 'pick_target', p: x.pending.p, index: Math.max(0, x.pending.options.findIndex(o => o && o.oid === outro)) } : legais(x, x.pending.p)[0]);
  assert.equal(t.objects[jn].holding, outro, 'a Journey nova guarda a criatura do gatilho dela');
  assert.equal(t.objects[alvoAntigo].zone, 'exile'); assert.equal(t.objects[outro].zone, 'exile');
});

test('M-353 · Mesmeric Fiend revisada joga (decisão A)', () => {
  assert.equal(S.coverage(carta('Mesmeric Fiend')).level, 'completo');
});
