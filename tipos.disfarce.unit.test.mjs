// T-42 · CR5 · Disfarce (Comprehensive Rules 702.168, com 708 e 702.21) e o gatilho "quando é virada para cima" (708.8).
// Texto da regra: .regras/cr-2026-09-25.txt. Carta exemplo com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge, clone
// de 13/10/2026): Nervous Gardener. As cartas "de teste" são scripts sintéticos que isolam a regra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, T, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => x.name === 'Nervous Gardener'))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: ['Disguise'], oracle_text: c.oracle_text, colors: ['G'], power: c.power, toughness: c.toughness };
for (const [n, k] of Object.entries({ Forest: 'G', Island: 'U' })) C[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = {
  'Choque': { name: 'Choque', effects: [{ do: 'damage', amount: 1, target: 'creature' }], ...EX },
  'Vira Tudo': { name: 'Vira Tudo', self: { disfarce: '{1}' }, abilities: [{ kind: 'triggered', when: 'turned-face-up', effects: [{ do: 'gain', amount: 4 }] }], ...EX },
};
carta('Choque', 'Instant'); carta('Vira Tudo', 'Creature — Shapeshifter', { power: '3', toughness: '3', mana_cost: '{4}', cmc: 4 });

const NG = 'Nervous Gardener';
function mesa(seed = 1) {
  const deck = [{ name: NG, qty: 6, zone: 'main' }, { name: 'Vira Tudo', qty: 3, zone: 'main' }, { name: 'Choque', qty: 4, zone: 'main' }, { name: 'Forest', qty: 14, zone: 'main' }, { name: 'Island', qty: 13, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const pool = (s, p = 0) => Object.values(s.players[p].pool).reduce((a, b) => a + b, 0);
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const esvazia = s => { for (let i = 0; i < 30; i++) { s = passaAte(s, x => !x.stack.length || !!x.pending); if (!s.pending) return s; const os = legais(s, s.pending.p); if (!os.length) return s; s = act(s, os.find(a => a.t === 'pick') || os[0]); } return s; };
const disfarcada = (s, p, oid) => legais(s, p, a => a.t === 'cast' && a.oid === oid && a.faceDown);
const conjuraDisfarcada = s => { let g; [s, g] = poe(s, 0, NG, 'hand'); s = mana(s); s = esvazia(act(s, disfarcada(s, 0, g)[0])); return [s, g]; };

test('CR 702.168a · da mão, conjurar virada para baixo por {3}: entra 2/2 sem nome nem custo', () => {
  let s = mesa(); let g; [s, g] = poe(s, 0, NG, 'hand'); s = mana(s);
  const of = disfarcada(s, 0, g); assert.equal(of.length, 1);
  const antes = pool(s);
  s = esvazia(act(s, of[0]));
  const o = s.objects[g], st = E.stats(s, o);
  eq([antes - pool(s), o.zone, !!o.faceDown, st.power, st.toughness], [3, 'battlefield', true, 2, 2]);
});

test('CR 702.168a / 702.21 · virada para baixo pelo disfarce ela tem salvaguarda {2}: a mágica do oponente que a mira dispara a salvaguarda', () => {
  let s = mesa(); let g; [s, g] = conjuraDisfarcada(s);
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  let c; [s, c] = poe(s, 1, 'Choque', 'hand'); s = mana(s, 1);
  const r = E.apply(s, legais(s, 1, a => a.t === 'cast' && a.oid === c && a.targets[0].oid === g)[0]);
  assert.ok(r.state.queued.some(q => q.when === 'ward') || r.state.stack.some(x => (r.state.objects[x] || {}).when === 'ward') || r.events.some(e => /salvaguarda|ward/.test(JSON.stringify(e))), 'a salvaguarda disparou');
});

test('CR 702.168d · com prioridade, virar para cima pelo custo de disfarce ({G}); a salvaguarda acaba; "quando é virada para cima" busca um terreno com tipo básico para a mão', () => {
  let s = mesa(); let g; [s, g] = conjuraDisfarcada(s); s = mana(s);
  const mao = s.zones[0].hand.length, antes = pool(s);
  const v = legais(s, 0, a => a.t === 'unmorph' && a.oid === g); assert.equal(v.length, 1);
  s = act(s, v[0]);
  eq([antes - pool(s), !!s.objects[g].faceDown, E.wardsDeK ? E.wardsDeK(s, s.objects[g]).length : 0], [1, false, 0]);
  s = esvazia(s);
  const nova = s.zones[0].hand.slice(mao).map(x => s.objects[x].name);
  eq(nova.length, 1, 'uma carta nova na mão'); assert.ok(['Forest', 'Island'].includes(nova[0]), nova[0]);
});

test('CR 708.8 · gatilho "quando é virada para cima" de script: dispara ao virar e só então', () => {
  let s = mesa(); let v; [s, v] = poe(s, 0, 'Vira Tudo', 'hand'); s = mana(s);
  s = esvazia(act(s, disfarcada(s, 0, v)[0]));
  const vida = s.players[0].life;
  assert.equal(s.players[0].life - vida, 0, 'entrar virada para baixo não dispara');
  s = mana(s); s = esvazia(act(s, legais(s, 0, a => a.t === 'unmorph' && a.oid === v)[0]));
  eq(s.players[0].life - vida, 4);
});

test('CR 702.168a · conjurada normalmente (virada para cima) não tem salvaguarda nem o gatilho', () => {
  let s = mesa(); let g; [s, g] = poe(s, 0, NG, 'hand'); s = mana(s);
  const mao = s.zones[0].hand.length;
  s = esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === g && !a.faceDown)[0]));
  eq([s.objects[g].zone, !!s.objects[g].faceDown, s.zones[0].hand.length], ['battlefield', false, mao - 1]);
  if (E.wardsDeK) eq(E.wardsDeK(s, s.objects[g]).length, 0);
});

test('Validador · self.disfarce é o custo de disfarce', () => {
  eq(SC.validateScript({ name: 'X', self: { disfarce: '{2}{G}' }, ...EX }), []);
  assert.ok(SC.validateScript({ name: 'X', self: { disfarce: 3 }, ...EX }).some(e => /disfarce/.test(e)));
  assert.ok(SC.validateScript({ name: 'X', self: { disfarce: '{1}' }, morph: { mana: '{2}' }, ...EX }).some(e => /disfarce/.test(e)), 'disfarce e metamorfose na mesma carta, não');
});

test('CR 702.168 · passeio aleatório com disfarces: nada oferecido é recusado e cartas são viradas para cima', () => {
  let viradas = 0;
  for (let seed = 1; seed <= 5; seed++) {
    let s = mesa(seed), r = seed * 49979687;
    for (let i = 0; i < 300 && s.status !== 'over'; i++) {
      const p = s.pending ? s.pending.p : s.turn.priority;
      if (i % 6 === 0 && !s.pending) s = mana(s, p, 2);
      const acoes = E.legalActions(s, p).filter(a => a.t !== 'concede');
      assert.ok(acoes.length, `semente ${seed}, passo ${i}: sem ação`);
      r = (r * 1103515245 + 12345) & 0x7fffffff;
      const pref = acoes.filter(a => a.t === 'cast' || a.t === 'unmorph');
      const a = pref.length && r % 3 ? pref[r % pref.length] : acoes[r % acoes.length];
      if (a.t === 'unmorph') viradas++;
      s = E.apply(s, a).state; // oferta = aceito
    }
  }
  assert.ok(viradas > 0, 'alguma carta foi virada para cima');
});

/* ---------------- T-44 · correção da auditoria independente ---------------- */
test('CR 702.168a · "de qualquer zona de onde poderia jogá-la": jogável do exílio, a carta também é conjurada virada para baixo por {3}', () => {
  let s = mesa(); let g; [s, g] = poe(s, 0, NG, 'exile', { playableFromExile: 0 }); s = mana(s);
  const of = disfarcada(s, 0, g);
  assert.equal(of.length, 1, 'a oferta de virada para baixo do exílio');
  s = esvazia(act(s, of[0]));
  eq([s.objects[g].zone, !!s.objects[g].faceDown, !!s.objects[g].disfarcadaT], ['battlefield', true, true]);
  assert.equal(E.wardsDeK(s, s.objects[g]).length, 1, 'com a salvaguarda {2}');
});

test('CR 702.168a · sem permissão, do exílio ou do cemitério não há virada para baixo (pedido direto recusado)', () => {
  let s = mesa(); let g; [s, g] = poe(s, 0, NG, 'graveyard'); s = mana(s);
  eq(disfarcada(s, 0, g).length, 0);
  assert.throws(() => E.apply(s, { t: 'cast', p: 0, oid: g, faceDown: true }));
});

/* ---------------- T-57 · CR 702.168b / 701.58a · a salvaguarda {2} da virada para baixo é valor copiável ---------------- */
const comCopias57 = (seed = 3) => {
  const sc = { ...SCRIPTS,
    'Clone Teste': { name: 'Clone Teste', entraComoCopia: { de: { tipos: ['creature'] } }, ...EX },
    'Espelho': { name: 'Espelho', effects: [{ do: 'ficha_copia', amount: 1, target: 'creature' }], ...EX },
    'Mascara': { name: 'Mascara', morph: { mana: '{1}' }, ...EX },
    'Capa': { name: 'Capa', effects: [{ do: 'cloak' }], ...EX } };
  C['Clone Teste'] = { name: 'Clone Teste', type_line: 'Creature — Shapeshifter', mana_cost: '{3}', cmc: 3, keywords: [], oracle_text: '', colors: [], power: '0', toughness: '0' };
  C['Espelho'] = { name: 'Espelho', type_line: 'Sorcery', mana_cost: '{2}', cmc: 2, keywords: [], oracle_text: '', colors: [] };
  C['Mascara'] = { name: 'Mascara', type_line: 'Creature — Rogue', mana_cost: '{3}', cmc: 3, keywords: ['Morph'], oracle_text: '', colors: [], power: '3', toughness: '3' };
  C['Capa'] = { name: 'Capa', type_line: 'Sorcery', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] };
  const deck = [{ name: NG, qty: 6, zone: 'main' }, ...['Clone Teste', 'Espelho', 'Mascara', 'Capa', 'Choque'].map(name => ({ name, qty: 3, zone: 'main' })), { name: 'Forest', qty: 14, zone: 'main' }, { name: 'Island', qty: 12, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: sc, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
};
const clonaA = (s, alvo) => { let c; [s, c] = poe(s, 0, 'Clone Teste', 'hand'); s = mana(s);
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === c)[0]); s = passaAte(s, x => !!x.pending || !x.stack.length);
  if (s.pending && s.pending.kind === 'pick') s = act(s, { t: 'pick', p: 0, oid: alvo }); return [esvazia(s), c]; };

test('CR 702.168b · o Clone que copia uma disfarçada virada para baixo é 2/2 sem nome e com salvaguarda {2}', () => {
  let s = comCopias57(); let g; [s, g] = poe(s, 0, NG, 'hand'); s = mana(s); s = esvazia(act(s, disfarcada(s, 0, g)[0]));
  let c; [s, c] = clonaA(s, g);
  const o = s.objects[c];
  eq([!!o.faceDown, E.stats(s, o).power, E.wardsDeK(s, o)], [false, 2, ['{2}']]);
});

test('CR 702.168b · a ficha que copia uma disfarçada virada para baixo também tem salvaguarda {2}; a cópia de uma metamorfose (sem disfarce) não tem', () => {
  let s = comCopias57(); let g; [s, g] = poe(s, 0, NG, 'hand'); s = mana(s); s = esvazia(act(s, disfarcada(s, 0, g)[0]));
  let m; [s, m] = poe(s, 0, 'Mascara', 'hand'); s = mana(s); s = esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === m && a.faceDown)[0]));
  let e; [s, e] = poe(s, 0, 'Espelho', 'hand'); s = mana(s);
  s = esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === e && ((a.targets || [])[0] || {}).oid === g)[0]));
  [s, e] = poe(s, 0, 'Espelho', 'hand'); s = mana(s);
  s = esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === e && ((a.targets || [])[0] || {}).oid === m)[0]));
  const fichas = s.zones[0].battlefield.map(x => s.objects[x]).filter(o => o.token).map(o => E.wardsDeK(s, o).length).sort();
  eq(fichas, [0, 1]);
});

test('CR 701.58a · o Clone que copia uma encoberta (virada para baixo) também tem salvaguarda {2}', () => {
  let s = comCopias57(); let k; [s, k] = poe(s, 0, 'Capa', 'hand'); s = mana(s); s = esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === k)[0]));
  const enc = s.zones[0].battlefield.find(x => s.objects[x].faceDown);
  assert.ok(enc, 'uma encoberta no campo');
  let c; [s, c] = clonaA(s, enc);
  eq(E.wardsDeK(s, s.objects[c]), ['{2}']);
});
