// T-24 · CR5 · Cartas de subir de nível (Comprehensive Rules 702.87 e 711).
// Texto da regra: .regras/cr-2026-09-25.txt. Cartas exemplo com o texto oficial de .listas/oficiais-tipos.json (Forge, consulta de
// 12/10/2026): Beastbreaker of Bala Ged e Knight of Cliffhaven. As cartas "de teste" são scripts sintéticos que isolam a regra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, J, act, poe, legais, passaAte, palavrasDoTexto, valorDeMana } from './listas.mjs';

const L = n => { const o = JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')); return Array.isArray(o) ? o : o.cartas; };
const C = {};
// como o app recebe a carta: as palavras-chave lidas do texto inteiro (as das barras vêm junto, e o motor precisa tirá-las) e a palavra "Level Up"
for (const c of L('oficiais-tipos.json').filter(x => ['Beastbreaker of Bala Ged', 'Knight of Cliffhaven'].includes(x.name)))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: ['Level Up', ...palavrasDoTexto(c.oracle_text)], oracle_text: c.oracle_text, colors: [], power: c.power, toughness: c.toughness };
C.Forest = { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {G}.)', colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = {
  'Lição': { name: 'Lição', effects: [{ do: 'counters', amount: 1, tipo: 'level', target: 'creature' }], ...EX }, // "Put a level counter on target creature."
  'Esquecer': { name: 'Esquecer', effects: [{ do: 'continuo', torna: { perdeHabilidades: true }, target: 'creature' }], ...EX }, // "Target creature loses all abilities until end of turn."
  'Bênção': { name: 'Bênção', effects: [{ do: 'counters', amount: 1, target: 'creature' }], ...EX }, // "Put a +1/+1 counter on target creature."
  'Rebote': { name: 'Rebote', effects: [{ do: 'bounce', target: 'creature' }], ...EX },
  'Sopro': { name: 'Sopro', effects: [{ do: 'gain', amount: 1 }], ...EX },
};
carta('Lição', 'Sorcery'); carta('Esquecer', 'Instant'); carta('Bênção', 'Instant'); carta('Rebote', 'Instant'); carta('Sopro', 'Instant');

const BB = 'Beastbreaker of Bala Ged', KC = 'Knight of Cliffhaven';
const TODAS = [BB, KC, 'Lição', 'Esquecer', 'Bênção', 'Rebote', 'Sopro'];
function mesa() {
  const deck = [...TODAS.map(name => ({ name, qty: 4, zone: 'main' })), { name: 'Forest', qty: 12, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += 6; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const pt = (s, oid) => { const st = E.stats(s, s.objects[oid]); return [st.power, st.toughness]; };
const tem = (s, oid, k) => E.hasKeyword(s, s.objects[oid], k);
const nivel = (s, oid) => (s.objects[oid].counters || {}).level || 0;
const comNivel = (s, oid, n) => { s = J(s); s.objects[oid].counters.level = n; return s; };
const sobe = (s, p, oid) => legais(s, p, a => a.t === 'activate' && a.oid === oid);
const esvazia = s => passaAte(s, x => !x.stack.length || !!x.pending);

test('CR 702.87a · subir de nível: paga o custo e põe um marcador de nível; só como feitiço (na sua fase principal, com a pilha vazia)', () => {
  let s = mesa(); let b; [s, b] = poe(s, 0, BB);
  assert.equal(sobe(s, 0, b).length, 0, 'sem mana, nada');
  s = mana(s);
  const of = sobe(s, 0, b); assert.equal(of.length, 1, 'a ativada de subir de nível é oferecida');
  s = esvazia(act(s, of[0]));
  eq([nivel(s, b), s.players[0].pool.G + s.players[0].pool.C + s.players[0].pool.W + s.players[0].pool.U + s.players[0].pool.B + s.players[0].pool.R], [1, 36 - 3], '{2}{G} pago, um marcador de nível');
  let r; [s, r] = poe(s, 0, 'Sopro', 'hand'); s = mana(s);
  const t = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === r)[0]);
  assert.equal(sobe(t, 0, b).length, 0, 'com a pilha ocupada, não');
  const u = mana(passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending), 0);
  assert.equal(sobe(u, 0, b).length, 0, 'no turno do oponente, não');
});

test('CR 711.4 · a habilidade de subir de nível vale sempre, com qualquer número de marcadores (até acima da última barra)', () => {
  let s = mesa(); let b; [s, b] = poe(s, 0, BB); s = mana(comNivel(s, b, 9));
  assert.equal(sobe(s, 0, b).length, 1);
  s = esvazia(act(s, sobe(s, 0, b)[0]));
  assert.equal(nivel(s, b), 10);
});

test('CR 711.5 · com menos marcadores que o primeiro número da primeira barra, a criatura tem o P/R de cima e nenhuma habilidade das barras', () => {
  let s = mesa(); let b; [s, b] = poe(s, 0, BB); let k; [s, k] = poe(s, 0, KC);
  eq([pt(s, b), tem(s, b, 'trample'), pt(s, k), tem(s, k, 'flying'), tem(s, k, 'vigilance')], [[2, 2], false, [2, 2], false, false], 'as palavras das barras impressas não valem no nível 0');
});

test('CR 711.2a / 711.2b · Beastbreaker of Bala Ged (texto oficial): nível 1 a 3 é 4/4; nível 4 ou mais é 6/6 com atropelar', () => {
  let s = mesa(); let b; [s, b] = poe(s, 0, BB);
  const em = n => { const t = comNivel(s, b, n); return [pt(t, b), tem(t, b, 'trample')]; };
  eq([em(1), em(3), em(4), em(12)], [[[4, 4], false], [[4, 4], false], [[6, 6], true], [[6, 6], true]]);
});

test('CR 711.2a / 711.2b · Knight of Cliffhaven (texto oficial): nível 1 a 3 é 2/3 com voar; nível 4 ou mais é 4/4 com voar e vigilância', () => {
  let s = mesa(); let k; [s, k] = poe(s, 0, KC);
  const em = n => { const t = comNivel(s, k, n); return [pt(t, k), tem(t, k, 'flying'), tem(t, k, 'vigilance')]; };
  eq([em(1), em(2), em(4)], [[[2, 3], true, false], [[2, 3], true, false], [[4, 4], true, true]]);
});

test('CR 711.2 / 613.4 · o P/R da barra é a base: marcadores +1/+1 e outros bônus somam por cima dela', () => {
  let s = mesa(); let b; [s, b] = poe(s, 0, BB); s = comNivel(s, b, 2);
  let r; [s, r] = poe(s, 0, 'Bênção', 'hand'); s = mana(s);
  s = esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === r && (a.targets || []).some(t => t.oid === b))[0]));
  eq(pt(s, b), [5, 5]);
});

test('CR 711.2 · o marcador de nível de qualquer fonte conta (não só o da habilidade de subir)', () => {
  let s = mesa(); let b; [s, b] = poe(s, 0, BB); s = comNivel(s, b, 3);
  let r; [s, r] = poe(s, 0, 'Lição', 'hand'); s = mana(s);
  s = esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === r && (a.targets || []).some(t => t.oid === b))[0]));
  eq([nivel(s, b), pt(s, b), tem(s, b, 'trample')], [4, [6, 6], true]);
});

test('CR 711.6 / 400.7 · fora do campo a carta tem o P/R de cima; voltando ao campo é um objeto novo, sem os marcadores de nível', () => {
  let s = mesa(); let b; [s, b] = poe(s, 0, BB); s = comNivel(s, b, 5);
  let r; [s, r] = poe(s, 0, 'Rebote', 'hand'); s = mana(s);
  s = esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === r && (a.targets || []).some(t => t.oid === b))[0]));
  eq([s.objects[b].zone, pt(s, b)], ['hand', [2, 2]], 'na mão, 2/2');
  s = mana(s); s = esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === b)[0]));
  eq([s.objects[b].zone, nivel(s, b), pt(s, b), tem(s, b, 'trample')], ['battlefield', 0, [2, 2], false]);
});

test('CR 711.2 (as barras são habilidades) · a criatura que perde todas as habilidades fica com o P/R de cima, sem as palavras das barras e sem subir de nível', () => {
  let s = mesa(); let b; [s, b] = poe(s, 0, BB); s = comNivel(s, b, 4);
  let r; [s, r] = poe(s, 0, 'Esquecer', 'hand'); s = mana(s);
  s = esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === r && (a.targets || []).some(t => t.oid === b))[0]));
  eq([pt(s, b), tem(s, b, 'trample'), sobe(mana(s), 0, b).length, nivel(s, b)], [[2, 2], false, 0, 4], 'os marcadores ficam; voltam a valer quando o efeito acaba');
});

test('Validador · a forma de self.nivelar: custo, barras em ordem crescente, a última aberta ("N+"), P/R inteiro, palavras conhecidas', () => {
  const base = { name: 'X', ...EX, self: { nivelar: { mana: '{1}', faixas: [{ de: 1, ate: 2, base: [1, 1] }, { de: 3, base: [2, 2], palavras: ['flying'] }] } } };
  eq(SC.validateScript(base), []);
  const com = nv => SC.validateScript({ name: 'X', ...EX, self: { nivelar: nv } });
  assert.ok(com({ faixas: base.self.nivelar.faixas }).some(e => /nivelar/.test(e)), 'sem custo');
  assert.ok(com({ mana: '{1}', faixas: [{ de: 3, ate: 4, base: [1, 1] }, { de: 2, base: [2, 2] }] }).some(e => /nivelar/.test(e)), 'fora de ordem');
  assert.ok(com({ mana: '{1}', faixas: [{ de: 1, ate: 2, base: [1, 1] }, { de: 3, ate: 5, base: [2, 2] }] }).some(e => /nivelar/.test(e)), 'última fechada');
  assert.ok(com({ mana: '{1}', faixas: [{ de: 1, ate: 2, base: ['a', 1] }, { de: 3, base: [2, 2] }] }).some(e => /nivelar/.test(e)), 'P/R não numérico');
  assert.ok(com({ mana: '{1}', faixas: [{ de: 1, ate: 2, base: [1, 1] }, { de: 3, base: [2, 2], palavras: ['voo'] }] }).some(e => /palavra/.test(e)), 'palavra desconhecida');
  assert.ok(SC.validateScript({ ...base, grantsAll: { keywords: ['flying'] } }).some(e => /nivelar/.test(e)), 'grantsAll não convive (use continuo)');
});

test('Mesa · a folha da carta diz "Subir de nível · custo"', () => {
  let s = mesa(); let b; [s, b] = poe(s, 0, BB); s = mana(s);
  const legal = sobe(s, 0, b).map(action => ({ action, label: 'Ativar' }));
  E.rotulosDaClasseT(s, b, legal, () => '');
  eq(legal.map(x => x.label), ['Subir de nível · {2}{G}']);
});

/* ---------------- T-25 · correções da auditoria independente ---------------- */
test('CR 400.7 · a subida de nível que estava na pilha resolve depois que a criatura saiu e voltou: o objeto novo não recebe o marcador', () => {
  let s = mesa(); let b; [s, b] = poe(s, 0, BB); s = mana(s);
  const r = E.apply(s, sobe(s, 0, b)[0]); let t = J(r.state);
  E.moveObject(t, b, 'hand'); E.moveObject(t, b, 'battlefield', { controller: 0 });
  const r1 = E.apply(t, { t: 'pass', p: 0 }), r2 = E.apply(r1.state, { t: 'pass', p: 1 });
  eq([nivel(r2.state, b), pt(r2.state, b), r2.events.some(e => e.do === 'nivel_sobe' && e.failed)], [0, [2, 2], true]);
});

test('CR 613.4a / 613.4b · a base de P/R da barra (camada 7b) vence o P/R definido por habilidade da própria carta (7a)', () => {
  const sc = { name: 'Asterisco', self: { ptDefinido: { poder: 7, resistencia: 7 }, nivelar: { mana: '{1}', faixas: [{ de: 1, ate: 1, base: [3, 3] }, { de: 2, base: [5, 5] }] } }, ...EX };
  eq(SC.validateScript(sc), [], 'script válido');
  C.Asterisco = { name: 'Asterisco', type_line: 'Creature — Test', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], power: '*', toughness: '*' };
  let s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards: C, scripts: { ...SCRIPTS, Asterisco: sc }, players: [0, 1].map(i => ({ name: 'AB'[i], deck: [{ name: 'Asterisco', qty: 20, zone: 'main' }, { name: 'Forest', qty: 20, zone: 'main' }] })) });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  let a; [s, a] = poe(s, 0, 'Asterisco');
  eq([pt(s, a), pt(comNivel(s, a, 1), a), pt(comNivel(s, a, 2), a)], [[7, 7], [3, 3], [5, 5]]);
  delete C.Asterisco;
});

test('Validador · subir de nível só com custo de mana; exatamente duas barras (711.1); nivelar nulo é recusado', () => {
  const f2 = [{ de: 1, ate: 2, base: [1, 1] }, { de: 3, base: [2, 2] }];
  const com = nv => SC.validateScript({ name: 'X', ...EX, self: { nivelar: nv } });
  assert.ok(com({ mana: 'abc{', faixas: f2 }).some(e => /nivelar/.test(e)), 'custo que não é de mana');
  assert.ok(com({ mana: '{T}', faixas: f2 }).some(e => /nivelar/.test(e)), 'virar não é custo de subir de nível');
  assert.ok(com({ mana: '{1}', faixas: [{ de: 1, base: [1, 1] }] }).some(e => /nivelar/.test(e)), 'uma barra só');
  assert.ok(com(null).some(e => /nivelar/.test(e)), 'nulo');
  eq(com({ mana: '{2}{G}', faixas: f2 }), []);
});

test('Registro · a subida de nível diz o nível novo', () => {
  let s = mesa(); let b; [s, b] = poe(s, 0, BB); s = mana(comNivel(s, b, 3));
  const r1 = E.apply(act(s, sobe(s, 0, b)[0]), { t: 'pass', p: 0 }), r2 = E.apply(r1.state, { t: 'pass', p: 1 });
  const ev = r2.events.find(e => e.do === 'nivel_sobe');
  eq([ev && ev.nivel, nivel(r2.state, b), pt(r2.state, b)], [4, 4, [6, 6]]);
});
