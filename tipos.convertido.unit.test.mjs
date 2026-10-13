// T-49 · CR5 · Converter (701.28), "More Than Meets the Eye" (702.162) e metal vivo (702.161), com 712.8c / 712.11a / 712.13.
// Texto da regra: .regras/cr-2026-09-25.txt. Carta exemplo com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge, clone
// de 13/10/2026): Jetfire, Ingenious Scientist // Jetfire, Air Guardian (parcial: a habilidade de mana da frente fica de fora).
// As cartas "de teste" são scripts sintéticos que isolam a regra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, T, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const JF = 'Jetfire, Ingenious Scientist', JB = 'Jetfire, Air Guardian';
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => x.name === JF))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: ['Flying', 'More Than Meets the Eye'], oracle_text: c.oracle_text, colors: ['U'], power: c.power, toughness: c.toughness };
for (const [n, k] of Object.entries({ Island: 'U' })) C[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{U}', cmc: 1, keywords: [], oracle_text: '', colors: ['U'], ...extra }; };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = {
  // converte a si mesma (701.28): sem dupla face, nada acontece (701.28c)
  'Engrenagem': { name: 'Engrenagem', abilities: [{ kind: 'activated', cost: { mana: '{1}' }, effects: [{ do: 'convert' }] }], ...EX },
};
carta('Engrenagem', 'Artifact Creature — Robot', { power: '1', toughness: '1' });
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2', mana_cost: '{1}{U}', cmc: 2 });

const deckCom = extra => [{ name: 'Island', qty: 24, zone: 'main' }, { name: 'Urso', qty: 10, zone: 'main' }, ...extra];
function mesa(seed = 1, extra = [{ name: JF, qty: 4, zone: 'main' }, { name: 'Engrenagem', qty: 2, zone: 'main' }]) {
  const deck = deckCom(extra);
  const nomes = new Set(deck.map(d => d.name)), cards = Object.fromEntries(Object.entries(C).filter(([n]) => nomes.has(n)));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const pool = (s, p = 0) => Object.values(s.players[p].pool).reduce((a, b) => a + b, 0);
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const esvazia = s => { for (let i = 0; i < 30; i++) { s = passaAte(s, x => !x.stack.length || !!x.pending); if (!s.pending) return s; const os = legais(s, s.pending.p); if (!os.length) return s; s = act(s, os.find(a => a.t === 'pick') || os[0]); } return s; };
const convertida = (s, p, oid) => legais(s, p, a => a.t === 'cast' && a.oid === oid && a.face === 'convertida');
const ateTurnoDe = (s, p) => passaAte(s, x => x.turn.active === p && x.turn.step === 'main1' && !x.stack.length && !x.pending && x.turn.number > s.turn.number);
const conjuraConvertida = s => { let j; [s, j] = poe(s, 0, JF, 'hand'); s = mana(s); const of = convertida(s, 0, j); assert.equal(of.length, 1, 'uma oferta convertida'); s = esvazia(act(s, of[0])); return [s, j]; };

test('CR 702.162a / 712.11a · da mão, conjurar convertida pelo custo de "More Than Meets the Eye" ({3}{U}): na pilha com o verso para cima, valor de mana da frente (712.8c)', () => {
  let s = mesa(); let j; [s, j] = poe(s, 0, JF, 'hand'); s = mana(s);
  const of = convertida(s, 0, j); assert.equal(of.length, 1);
  const antes = pool(s);
  s = act(s, of[0]);
  const o = s.objects[j];
  eq([antes - pool(s), o.zone, o.name, E.manaValueT(s, o)], [4, 'stack', JB, 5]);
});

test('CR 712.13 / 702.161a · a mágica convertida entra com o verso para cima: Veículo que, no turno de quem controla, também é criatura artefato 3/4 com voar', () => {
  let s = mesa(); let j; [s, j] = conjuraConvertida(s);
  const o = s.objects[j], st = E.stats(s, o);
  eq([o.zone, o.name, E.tiposDe(s, o).includes('creature'), E.tiposDe(s, o).includes('artifact'), st.power, st.toughness, E.hasKeyword(s, o, 'flying')], ['battlefield', JB, true, true, 3, 4, true]);
});

test('CR 702.161a · metal vivo vale só durante o turno de quem controla: no turno do oponente, não é criatura (e não pode bloquear)', () => {
  let s = mesa(); let j; [s, j] = conjuraConvertida(s);
  s = ateTurnoDe(s, 1);
  eq(E.tiposDe(s, s.objects[j]).includes('creature'), false);
  s = ateTurnoDe(s, 0);
  eq(E.tiposDe(s, s.objects[j]).includes('creature'), true, 'de volta ao meu turno');
});

test('CR 302.6 · convertida no turno em que entrou, com metal vivo ela é criatura mas está enjoada: não ataca', () => {
  let s = mesa(); let j; [s, j] = conjuraConvertida(s);
  s = passaAte(s, x => x.turn.step === 'combat_attackers' || !!x.pending);
  const pd = s.pending;
  assert.ok(!pd || pd.kind !== 'attackers' || !E.legalActions(s, 0).some(a => a.t === 'attack' && (a.attackers || []).includes(j)), 'não ataca no turno em que entrou');
});

test('CR 702.162a · conjurada normalmente (frente para cima) pelo custo impresso {4}{U}: entra como Jetfire, Ingenious Scientist', () => {
  let s = mesa(); let j; [s, j] = poe(s, 0, JF, 'hand'); s = mana(s);
  const antes = pool(s);
  s = esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === j && a.face == null)[0]));
  eq([antes - pool(s), s.objects[j].name, s.objects[j].zone], [5, JF, 'battlefield']);
});

test('CR 701.28a · "{U}{U}{U}: Convert Jetfire, then adapt 3": converte de volta para a frente e põe três marcadores +1/+1 nela; o registro diz "converteu"', () => {
  let s = mesa(); let j; [s, j] = conjuraConvertida(s); s = mana(s);
  const of = legais(s, 0, a => a.t === 'activate' && a.oid === j); assert.equal(of.length, 1);
  let t = act(s, of[0]), linhas = [];
  for (let i = 0; i < 6 && t.stack.length; i++) { const pa = { t: 'pass', p: t.turn.priority }, r = E.apply(t, pa); linhas = linhas.concat(T.describe(t, pa, r.events, r.state).map(String)); t = r.state; }
  const o = t.objects[j];
  eq([o.name, (o.counters || {}).p1p1 || 0, E.stats(t, o).power], [JF, 3, 6]);
  assert.ok(linhas.some(l => /Jetfire, Air Guardian converteu em Jetfire, Ingenious Scientist/.test(l)), JSON.stringify(linhas));
});

test('CR 701.28c · converter uma permanente que não é de dupla face: nada acontece', () => {
  let s = mesa(); let g; [s, g] = poe(s, 0, 'Engrenagem', 'battlefield'); s = mana(s);
  s = esvazia(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === g)[0]));
  eq([s.objects[g].name, !!s.objects[g].frontName], ['Engrenagem', false]);
});

test('CR 702.162a · sem permissão, do cemitério não há conjuração convertida; carta sem "More Than Meets the Eye" não é conjurada convertida (pedido direto recusado)', () => {
  let s = mesa(); let j, u; [s, j] = poe(s, 0, JF, 'graveyard'); [s, u] = poe(s, 0, 'Urso', 'hand'); s = mana(s);
  eq(convertida(s, 0, j).length, 0);
  assert.throws(() => E.apply(s, { t: 'cast', p: 0, oid: j, face: 'convertida' }));
  assert.throws(() => E.apply(s, { t: 'cast', p: 0, oid: u, face: 'convertida' }));
});

test('CR 702.162a · "de qualquer zona de onde poderia conjurá-la": jogável do exílio, também convertida', () => {
  let s = mesa(); let j; [s, j] = poe(s, 0, JF, 'exile', { playableFromExile: 0 }); s = mana(s);
  const of = convertida(s, 0, j); assert.equal(of.length, 1);
  s = esvazia(act(s, of[0]));
  eq([s.objects[j].zone, s.objects[j].name], ['battlefield', JB]);
});

test('Validador · self.maisQueOlhos é o custo de "More Than Meets the Eye" e pede a dupla face', () => {
  const ok = { name: 'X', self: { duplaFace: true, maisQueOlhos: '{1}{U}' }, back: { name: 'Y', types: ['artifact'], subtypes: ['Vehicle'], power: 1, toughness: 1, keywords: ['living metal'] }, ...EX };
  eq(SC.validateScript(ok), []);
  assert.ok(SC.validateScript({ ...ok, self: { duplaFace: true, maisQueOlhos: 3 } }).some(e => /More Than Meets the Eye/.test(e)));
  assert.ok(SC.validateScript({ name: 'X', self: { maisQueOlhos: '{1}' }, ...EX }).some(e => /More Than Meets the Eye/.test(e)), 'sem face de trás, não');
});

test('CR 702.162 · passeio aleatório com Transformers: nada oferecido é recusado, e cartas são conjuradas convertidas', () => {
  let convertidas = 0;
  for (let seed = 1; seed <= 4; seed++) {
    let s = mesa(seed), r = seed * 104729;
    for (let i = 0; i < 300 && s.status !== 'over'; i++) {
      const p = s.pending ? s.pending.p : s.turn.priority;
      if (i % 6 === 0 && !s.pending) s = mana(s, p, 3);
      const acoes = E.legalActions(s, p).filter(a => a.t !== 'concede');
      assert.ok(acoes.length, `semente ${seed}, passo ${i}: sem ação`);
      r = (r * 1103515245 + 12345) & 0x7fffffff;
      const conv = acoes.filter(a => a.face === 'convertida'), pref = acoes.filter(a => a.t === 'cast' || a.t === 'activate');
      const a = conv.length && r % 2 ? conv[r % conv.length] : pref.length && r % 3 ? pref[r % pref.length] : acoes[r % acoes.length];
      if (a.face === 'convertida') convertidas++;
      s = E.apply(s, a).state;
    }
  }
  assert.ok(convertidas > 0, 'alguma carta foi conjurada convertida');
});

/* ---------------- T-50 · correções da auditoria independente ---------------- */
test('CR 302.6 · convertida no turno em que entrou e convertida de volta para a frente (criatura): continua enjoada, não ataca (D1)', () => {
  let s = mesa(); let j; [s, j] = conjuraConvertida(s); s = mana(s);
  s = esvazia(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === j)[0]));
  eq([s.objects[j].name, E.tiposDe(s, s.objects[j]).includes('creature')], [JF, true]);
  s = passaAte(s, x => x.turn.step === 'combat_attackers' || (!!x.pending && x.pending.kind !== 'attackers'));
  assert.ok(!E.legalActions(s, 0).some(a => a.t === 'attack' && (a.attackers || []).includes(j)), 'não é oferecida para atacar');
  if (s.pending && s.pending.kind === 'attackers') assert.throws(() => E.apply(s, { t: 'attack', p: 0, attackers: [j] }), 'o pedido direto é recusado');
});
