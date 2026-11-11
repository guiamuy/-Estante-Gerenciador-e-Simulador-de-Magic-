// M-619 · rotina Motor contínuo · campanha Modern, ordem gulosa: Nethergoyf, Moonshadow, Detective's Phoenix e Fear of Missing Out são as
// quatro únicas cartas que faltam em 45 listas Modern do catálogo (coleta de 10/11/2026; mais 30 com Flare of Malice e 10 com Ob Nixilis).
// Fatia 1 desta leva: Nethergoyf e Moonshadow. Textos da API da Scryfall (cobertura/modern.json do ramo catalogo, 10/11/2026), guardados em
// .listas/oficiais-revisadas.json. Regras novas: 604.3 com a contagem "card types among cards in your graveyard" (205.2a) e "that number plus 1";
// 702.138a com o custo "exile any number of other cards from your graveyard with four or more card types among them"; 603.2c com o lote
// "one or more permanent cards are put into your graveyard from anywhere" e o efeito "remove a -1/-1 counter from this creature".
// Cada teste de partida falha no motor anterior (as duas cartas não tinham script).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';

const M = loadModules(), E = M.engine, S = M.scripts, SF = M.scryfall;
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NG = 'Nethergoyf', MS = 'Moonshadow';
const oficial = n => { const o = OF.find(x => x.name === n); assert.ok(o, `${n} em .listas/oficiais-revisadas.json`);
  return SF.normalizeCard({ object: 'card', layout: 'normal', ...o, cmc: 1, colors: ['B'] }); };
const J = x => JSON.parse(JSON.stringify(x));

test('M-619 · os dois textos da Scryfall de 10/11 guardados; Nethergoyf e Moonshadow por script à mão, completos', () => {
  for (const n of [NG, MS]) { const o = OF.find(x => x.name === n); assert.match(o.fonte, /api\.scryfall\.com/); assert.equal(o.consulta, '2026-11-10');
    assert.ok(S.SCRIPTS[n], `${n} tem script`); assert.equal(S.validateScript(S.SCRIPTS[n]).length, 0); assert.equal(S.coverage(oficial(n), S.SCRIPTS, n).level, 'completo'); }
  assert.equal(OF.find(x => x.name === NG).oracle_text, "Nethergoyf's power is equal to the number of card types among cards in your graveyard and its toughness is equal to that number plus 1.\nEscape—{2}{B}, Exile any number of other cards from your graveyard with four or more card types among them. (You may cast this card from your graveyard for its escape cost.)");
  assert.equal(OF.find(x => x.name === MS).oracle_text, 'Menace\nThis creature enters with six -1/-1 counters on it.\nWhenever one or more permanent cards are put into your graveyard from anywhere while this creature has a -1/-1 counter on it, remove a -1/-1 counter from this creature.');
});

test('M-619 · o validador: fuga por tipos de 1 a 9 e sem o número junto; tira_marcador pede o tipo; "soma" aceita uma constante ao lado de uma contagem', () => {
  const ex = { example: { action: 'etb', target: 'none', expect: { attached: false } } };
  assert.equal(S.validateScript({ name: 'X', escape: { mana: '{B}', exileGraveyardTipos: 4 }, ...ex }).length, 0);
  assert.ok(S.validateScript({ name: 'X', escape: { mana: '{B}', exileGraveyardTipos: 0 }, ...ex }).some(e => /exileGraveyardTipos/.test(e)));
  assert.ok(S.validateScript({ name: 'X', escape: { mana: '{B}', exileGraveyardTipos: 4, exileGraveyard: 2 }, ...ex }).some(e => /exileGraveyardTipos/.test(e)));
  assert.ok(S.validateScript({ name: 'X', abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'tira_marcador' }] }], ...ex }).some(e => /tira_marcador/.test(e)));
  assert.equal(S.validateScript({ name: 'X', abilities: [{ kind: 'triggered', when: { evento: 'descem', quem: 'voce' }, effects: [{ do: 'tira_marcador', tipo: 'm1m1' }] }], ...ex }).length, 0);
  assert.ok(S.validateScript({ name: 'X', self: { ptDefinido: { poder: { per: 'soma', partes: [1, 2] } } }, ...ex }).length > 0, 'soma só de constantes não vale');
});

// ── partidas ──
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: [...mana_cost.matchAll(/\{([^}]+)\}/g)].reduce((n, [, x]) => n + (/^\d+$/.test(x) ? +x : 1), 0), keywords: [], oracle_text: '', colors: [], ...extra });
const C = {
  [NG]: oficial(NG), [MS]: oficial(MS),
  Swamp: c0('Swamp', 'Basic Land — Swamp', '', { oracle_text: '({T}: Add {B}.)' }),
  Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2', colors: ['G'] }),
  Golem: c0('Golem', 'Artifact Creature — Golem', '{3}', { power: '3', toughness: '3' }),
  Pedra: c0('Pedra', 'Artifact', '{1}'),
  Pacto: c0('Pacto', 'Enchantment', '{1}{B}', { colors: ['B'] }),
  Raio: c0('Raio', 'Instant', '{B}', { colors: ['B'] }),
  Leitura: c0('Leitura', 'Sorcery', '{B}', { colors: ['B'] }),
  Moer: c0('Moer', 'Sorcery', '{B}', { colors: ['B'] }),
  MoerDuas: c0('MoerDuas', 'Sorcery', '{B}', { colors: ['B'] }),
  Descarte: c0('Descarte', 'Sorcery', '{B}', { colors: ['B'] }),
  Varrer: c0('Varrer', 'Sorcery', '{B}', { colors: ['B'] }),
  Tribo: c0('Tribo', 'Kindred Instant — Eldrazi', '{B}', { colors: ['B'] }),
  Dividida: { ...c0('Dividida', 'Instant // Sorcery', '{B} // {B}', { colors: ['B'] }), layout: 'split' },
};
const SCR = {
  Urso: { name: 'Urso', example: { target: 'none', expect: { selfLife: 0 } } },
  Golem: { name: 'Golem', example: { target: 'none', expect: { selfLife: 0 } } },
  Pedra: { name: 'Pedra', example: { action: 'etb', target: 'none', expect: { attached: false } } },
  Pacto: { name: 'Pacto', example: { action: 'etb', target: 'none', expect: { attached: false } } },
  Raio: { name: 'Raio', effects: [{ do: 'destroy', target: 'creature' }], example: { target: 'enemy-creature', expect: { gone: true } } },
  Leitura: { name: 'Leitura', effects: [{ do: 'draw', amount: 1 }], example: { target: 'none', expect: { handDelta: 0 } } },
  Moer: { name: 'Moer', effects: [{ do: 'mill', amount: 2 }], example: { target: 'none', expect: { selfLife: 0 } } }, // um evento só
  MoerDuas: { name: 'MoerDuas', effects: [{ do: 'mill', amount: 1 }, { do: 'mill', amount: 1 }], example: { target: 'none', expect: { selfLife: 0 } } }, // dois eventos
  Descarte: { name: 'Descarte', effects: [{ do: 'discard', amount: 1, target: 'self' }], example: { target: 'none', expect: { selfLife: 0 } } },
  Varrer: { name: 'Varrer', effects: [{ do: 'destroy_all', types: ['creature'] }], example: { target: 'none', expect: { selfLife: 0 } } },
  Tribo: { name: 'Tribo', effects: [{ do: 'draw', amount: 1 }], example: { target: 'none', expect: { handDelta: 0 } } },
  Dividida: { name: 'Dividida', effects: [{ do: 'draw', amount: 1 }], example: { target: 'none', expect: { handDelta: 0 } } },
};
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
  const from = ['library', 'hand', 'graveyard'].map(z => s.zones[p][z]).find(z => z.some(o => s.objects[o].name === name && s.objects[o].zone !== zone));
  if (!from) throw new Error(name + ' ausente');
  const oid = from.find(o => s.objects[o].name === name); from.splice(from.indexOf(oid), 1); s.zones[p][zone].push(oid);
  Object.assign(s.objects[oid], { zone, sick: false, tapped: false, controller: p });
  return [s, oid];
}
const limpaMao = (s, p) => { s = J(s); for (const oid of s.zones[p].hand.slice()) { s.zones[p].hand.splice(s.zones[p].hand.indexOf(oid), 1); s.zones[p].library.unshift(oid); s.objects[oid].zone = 'library'; } return s; };
const resolve = s => { for (let i = 0; i < 40 && (s.stack.length || s.pending); i++) { if (s.pending) return s; s = act(s, { t: 'pass', p: s.turn.priority }); } return s; };
/** A no próprio main1, mãos vazias. */
function mesa() {
  const d = ns => ns.map(name => ({ name, qty: 5, zone: 'main' }));
  const todos = [NG, MS, 'Swamp', 'Urso', 'Golem', 'Pedra', 'Pacto', 'Raio', 'Leitura', 'Moer', 'MoerDuas', 'Descarte', 'Varrer', 'Tribo', 'Dividida'];
  let s = E.createGame({ format: 'livre', seed: 619, mode: 'full', cards: C, scripts: SCR, first: 0, players: [{ name: 'A', deck: d(todos) }, { name: 'B', deck: d(todos) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = limpaMao(s, 0); s = limpaMao(s, 1);
  return s;
}
const pt = (s, oid) => { const st = E.stats(s, s.objects[oid]); return [st.power, st.toughness]; };
const pantanos = (s, p, n) => { const out = []; for (let i = 0; i < n; i++) { let o; [s, o] = poe(s, p, 'Swamp'); out.push(o); } return [s, out]; };
const topo = (s, p, names) => { s = J(s); for (const n of names.slice().reverse()) { const oid = s.zones[p].library.find(o => s.objects[o].name === n); s.zones[p].library.splice(s.zones[p].library.indexOf(oid), 1); s.zones[p].library.unshift(oid); } return s; };

test('M-619 · Nethergoyf (604.3): poder = tipos de carta no seu cemitério, resistência = isso mais 1; o cemitério do oponente não conta', () => {
  let s = mesa(), ng;
  [s, ng] = poe(s, 0, NG);
  assert.deepEqual(pt(s, ng), [0, 1], 'cemitério vazio: 0/1');
  [s] = poe(s, 0, 'Urso', 'graveyard'); [s] = poe(s, 0, 'Urso', 'graveyard');
  assert.deepEqual(pt(s, ng), [1, 2], 'duas criaturas: um tipo');
  [s] = poe(s, 0, 'Golem', 'graveyard');
  assert.deepEqual(pt(s, ng), [2, 3], 'criatura-artefato: dois tipos');
  [s] = poe(s, 0, 'Raio', 'graveyard'); [s] = poe(s, 0, 'Swamp', 'graveyard');
  assert.deepEqual(pt(s, ng), [4, 5], 'mais instantânea e terreno: quatro tipos');
  [s] = poe(s, 1, 'Pacto', 'graveyard'); [s] = poe(s, 1, 'Leitura', 'graveyard');
  assert.deepEqual(pt(s, ng), [4, 5], 'o cemitério de B não conta');
  [s] = poe(s, 0, 'Pacto', 'graveyard');
  assert.deepEqual(pt(s, ng), [5, 6], 'encantamento: cinco tipos');
});

test('M-619 · Nethergoyf com fuga (702.138a): só com quatro tipos entre as OUTRAS cartas; a escolha é de quem paga; menos de quatro é recusado', () => {
  let s = mesa(), ng, urso, raio, pedra, pacto, lei;
  [s, ng] = poe(s, 0, NG, 'graveyard');
  [s, urso] = poe(s, 0, 'Urso', 'graveyard'); [s, raio] = poe(s, 0, 'Raio', 'graveyard'); [s, pedra] = poe(s, 0, 'Pedra', 'graveyard');
  [s] = pantanos(s, 0, 3);
  const fugas = x => E.legalActions(x, 0).filter(a => a.t === 'cast' && a.oid === ng && a.escape);
  assert.equal(fugas(s).length, 0, 'três tipos entre as outras: sem fuga (a própria Nethergoyf, criatura, não entra na conta)');
  [s, pacto] = poe(s, 0, 'Pacto', 'graveyard'); [s, lei] = poe(s, 0, 'Leitura', 'graveyard');
  const fs = fugas(s);
  assert.ok(fs.length >= 2, 'com cinco tipos há mais de uma escolha mínima');
  for (const a of fs) { assert.ok(a.pay && a.pay.exileGrave && a.pay.exileGrave.length === 4, 'escolha mínima: quatro cartas de um tipo cada'); assert.ok(!a.pay.exileGrave.includes(ng)); }
  recusa(s, { ...fs[0], pay: { exileGrave: [urso, raio, pedra] } }, /quatro|4 ou mais tipos/);
  recusa(s, { ...fs[0], pay: { exileGrave: [urso, raio, pedra, ng] } }, /tipos/);
  // exilar mais do que o mínimo também vale ("any number")
  const todas = [urso, raio, pedra, pacto, lei];
  let s1 = resolve(act(s, { ...fs[0], pay: { exileGrave: todas } }));
  assert.equal(s1.objects[ng].zone, 'battlefield', 'escapou');
  for (const o of todas) assert.equal(s1.objects[o].zone, 'exile');
  assert.equal(s1.zones[0].graveyard.length, 0);
  assert.deepEqual(pt(s1, ng), [0, 1], 'cemitério vazio de novo: 0/1');
  // a escolha oferecida exila só as quatro escolhidas
  let s2 = resolve(act(s, fs[0]));
  assert.equal(s2.objects[ng].zone, 'battlefield');
  assert.equal(fs[0].pay.exileGrave.filter(o => s2.objects[o].zone === 'exile').length, 4);
  assert.equal(s2.zones[0].graveyard.length, 1, 'sobrou uma carta no cemitério');
  assert.deepEqual(pt(s2, ng), [1, 2]);
});

test('M-619 · Nethergoyf: carta de dois tipos conta os dois (criatura-artefato, terreno e instantânea pagam com três cartas)', () => {
  let s = mesa(), ng, gol, sw, raio, urso;
  [s, ng] = poe(s, 0, NG, 'graveyard');
  [s, gol] = poe(s, 0, 'Golem', 'graveyard'); [s, sw] = poe(s, 0, 'Swamp', 'graveyard'); [s, raio] = poe(s, 0, 'Raio', 'graveyard'); [s, urso] = poe(s, 0, 'Urso', 'graveyard');
  [s] = pantanos(s, 0, 3);
  const fs = E.legalActions(s, 0).filter(a => a.t === 'cast' && a.oid === ng && a.escape);
  assert.equal(fs.length, 1, 'uma escolha mínima: Golem, Pântano e Raio (o Urso sobra)');
  assert.deepEqual(J(fs[0].pay.exileGrave).sort(), [gol, sw, raio].sort());
  const s1 = resolve(act(s, fs[0]));
  assert.equal(s1.objects[ng].zone, 'battlefield'); assert.equal(s1.objects[urso].zone, 'graveyard');
});

test('M-619 · Moonshadow: entra 1/1 com seis −1/−1; carta de permanente que vai para o seu cemitério tira um marcador (de qualquer zona)', () => {
  let s = mesa(), ms, urso, raio;
  [s, ms] = poe(s, 0, MS, 'hand'); [s] = pantanos(s, 0, 2);
  s = resolve(act(s, E.legalActions(s, 0).find(a => a.t === 'cast' && a.oid === ms)));
  assert.equal(s.objects[ms].zone, 'battlefield');
  assert.equal(s.objects[ms].counters.m1m1, 6); assert.deepEqual(pt(s, ms), [1, 1]);
  assert.equal(E.hasKeyword(s, s.objects[ms], 'menace'), true, 'ameaça');
  // A destrói o próprio Urso com Raio: o Urso (criatura) desce; o Raio (instantânea) não conta
  [s, urso] = poe(s, 0, 'Urso'); [s, raio] = poe(s, 0, 'Raio', 'hand');
  s = act(s, E.legalActions(s, 0).find(a => a.t === 'cast' && a.oid === raio && ((a.targets || [])[0] || {}).oid === urso));
  s = resolve(s);
  assert.equal(s.objects[urso].zone, 'graveyard');
  assert.equal(s.objects[ms].counters.m1m1, 5, 'um marcador a menos'); assert.deepEqual(pt(s, ms), [2, 2]);
  // do grimório: moer dois Pântanos é um evento só
  let s2 = topo(J(s), 0, ['Swamp', 'Swamp']);
  let moer; [s2, moer] = poe(s2, 0, 'Moer', 'hand'); s2 = J(s2); for (const o of s2.zones[0].battlefield) s2.objects[o].tapped = false;
  s2 = resolve(act(s2, E.legalActions(s2, 0).find(a => a.t === 'cast' && a.oid === moer)));
  assert.equal(s2.objects[ms].counters.m1m1, 4, 'moer dois Pântanos é um evento: um marcador só');
});

test('M-619 · Moonshadow: um evento, um gatilho; dois eventos na mesma mágica, dois; sem marcador não dispara; cartas do oponente e mágicas não contam', () => {
  let s = mesa(), ms, m2, md;
  [s, ms] = poe(s, 0, MS); s = J(s); s.objects[ms].counters = { m1m1: 6 };
  [s] = pantanos(s, 0, 2);
  // MoerDuas: duas instruções → dois eventos → dois gatilhos
  s = topo(s, 0, ['Urso', 'Pedra']);
  [s, md] = poe(s, 0, 'MoerDuas', 'hand');
  s = resolve(act(s, E.legalActions(s, 0).find(a => a.t === 'cast' && a.oid === md)));
  assert.equal(s.objects[ms].counters.m1m1, 4, 'dois eventos: dois marcadores');
  // moer duas mágicas: nada
  s = J(s); for (const o of s.zones[0].battlefield) s.objects[o].tapped = false;
  s = topo(s, 0, ['Raio', 'Leitura']);
  [s, m2] = poe(s, 0, 'Moer', 'hand');
  s = resolve(act(s, E.legalActions(s, 0).find(a => a.t === 'cast' && a.oid === m2)));
  assert.equal(s.objects[ms].counters.m1m1, 4, 'instantânea e feitiço não são cartas de permanente');
  // carta de permanente no cemitério do oponente: nada
  s = J(s); for (const o of s.zones[0].battlefield) s.objects[o].tapped = false;
  let ub; [s, ub] = poe(s, 1, 'Urso'); let r; [s, r] = poe(s, 0, 'Raio', 'hand');
  s = resolve(act(s, E.legalActions(s, 0).find(a => a.t === 'cast' && a.oid === r && ((a.targets || [])[0] || {}).oid === ub)));
  assert.equal(s.objects[ub].zone, 'graveyard'); assert.equal(s.objects[ms].counters.m1m1, 4, 'o Urso de B foi para o cemitério de B');
  // sem marcador −1/−1 o gatilho não dispara (a condição é do disparo)
  s = J(s); s.objects[ms].counters = {}; for (const o of s.zones[0].battlefield) s.objects[o].tapped = false;
  s = topo(s, 0, ['Urso', 'Golem']);
  let m3; [s, m3] = poe(s, 0, 'Moer', 'hand');
  s = act(s, E.legalActions(s, 0).find(a => a.t === 'cast' && a.oid === m3));
  s = act(s, { t: 'pass', p: 0 }); s = act(s, { t: 'pass', p: 1 });
  assert.equal(s.stack.length, 0, 'nenhum gatilho na pilha');
  assert.deepEqual(pt(s, ms), [7, 7]);
});

test('M-619 · 205.2a: carta kindred conta kindred; carta dividida conta as duas metades no cemitério (709.4)', () => {
  let s = mesa(), ng;
  [s, ng] = poe(s, 0, NG);
  [s] = poe(s, 0, 'Tribo', 'graveyard');
  assert.deepEqual(pt(s, ng), [2, 3], 'Kindred Instant: dois tipos');
  [s] = poe(s, 0, 'Dividida', 'graveyard');
  assert.deepEqual(pt(s, ng), [3, 4], 'Instant // Sorcery: soma o feitiço');
});

test('M-619 · fuga do Nethergoyf: a folha oferece, para cada carta que dá para guardar, uma escolha que a deixa no cemitério', () => {
  let s = mesa(), ng; const cem = [];
  [s, ng] = poe(s, 0, NG, 'graveyard');
  for (const n of ['Urso', 'Urso', 'Urso', 'Urso', 'Raio', 'Raio', 'Raio', 'Raio', 'Pedra', 'Pedra', 'Pedra', 'Pedra', 'Pacto', 'Pacto', 'Pacto', 'Pacto']) { let o; [s, o] = poe(s, 0, n, 'graveyard'); cem.push(o); }
  [s] = pantanos(s, 0, 3);
  const fs = E.legalActions(s, 0).filter(a => a.t === 'cast' && a.oid === ng && a.escape);
  assert.ok(fs.length <= 24 && fs.length >= 16);
  for (const o of cem) assert.ok(fs.some(a => !a.pay.exileGrave.includes(o)), `há escolha que guarda ${s.objects[o].name} ${o}`);
});

test('M-619 · Moonshadow: carta de permanente descartada desce; o Moonshadow que morre junto com outra criatura não dispara (603.6c), em qualquer ordem', () => {
  let s = mesa(), ms, pac, des;
  [s, ms] = poe(s, 0, MS); s = J(s); s.objects[ms].counters = { m1m1: 6 };
  [s] = pantanos(s, 0, 1); [s, pac] = poe(s, 0, 'Pacto', 'hand'); [s, des] = poe(s, 0, 'Descarte', 'hand');
  s = act(s, E.legalActions(s, 0).find(a => a.t === 'cast' && a.oid === des));
  for (let i = 0; i < 10 && !(s.pending && s.pending.kind === 'discard') && s.stack.length; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  if (s.pending && s.pending.kind === 'discard') s = act(s, { t: 'discard', p: 0, oid: pac });
  s = resolve(s);
  assert.equal(s.objects[pac].zone, 'graveyard'); assert.equal(s.objects[ms].counters.m1m1, 5, 'o Pacto descartado desce');
  for (const antes of [true, false]) {
    let t = mesa(), m, u, v;
    if (antes) { [t, u] = poe(t, 0, 'Urso'); [t, m] = poe(t, 0, MS); } else { [t, m] = poe(t, 0, MS); [t, u] = poe(t, 0, 'Urso'); }
    t = J(t); t.objects[m].counters = { m1m1: 2 }; [t] = pantanos(t, 0, 1); [t, v] = poe(t, 0, 'Varrer', 'hand');
    t = act(t, E.legalActions(t, 0).find(a => a.t === 'cast' && a.oid === v));
    t = act(t, { t: 'pass', p: 0 }); t = act(t, { t: 'pass', p: 1 });
    assert.equal(t.objects[m].zone, 'graveyard'); assert.equal(t.objects[u].zone, 'graveyard');
    assert.equal(t.stack.length, 0, `nenhum gatilho (Urso ${antes ? 'antes' : 'depois'} no campo)`);
  }
});
