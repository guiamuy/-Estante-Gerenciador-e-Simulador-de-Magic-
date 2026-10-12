// V-29 · CR 701.71 · Empower Jace. Texto oficial em .listas/oficiais-verbos.json (Oracle do Forge, clone de 12/10/2026):
// Protege's Awakening — "Empower Jace 6. Draw a card." · Mindseeker Oculus — "When this creature enters, empower Jace 4." ·
// Keeper of the Quiet Hour — "When this creature enters, empower Jace 2." (scripts das permanentes provados aqui)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { E, J, act, poe, legais, mesa, comMana, tudo, criatura, conjura } from './verbos.mjs';
const { scripts: S, table: T } = loadModules();
const URSO = criatura('Urso de Teste 3/3', 3, 3);
const fonte = (p = 0) => ({ oid: 'h', name: URSO, controller: p, ability: true, source: null });
const faz = (s, eff, p = 0) => { s = J(s); const ev = []; E.applyEffect(s, fonte(p), eff, null, ev); return [s, ev]; };
const jaces = (s, p = 0) => s.zones[p].battlefield.filter(oid => E.fichaJaceV(s, s.objects[oid], p));
const resolveTudo = s => tudo(s, x => legais(x, x.pending.p)[0]);
const comScript = (s, script) => { s = J(s); s.facts[script.name] = { ...s.facts[script.name], script }; return s; };
const OCULUS = { name: 'Mindseeker Oculus', abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'empower_jace', amount: 4 }] }], example: { action: 'etb', target: 'none', expect: { handDelta: 0 } } };
const KEEPER = { name: 'Keeper of the Quiet Hour', abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'empower_jace', amount: 2 }] }], example: { action: 'etb', target: 'none', expect: { handDelta: 0 } } };

test('CR 701.71a · sem ficha Jace, empoderar cria a ficha azul de planeswalker Jace e põe os N marcadores de lealdade nela; ela não morre por ter nascido com 0', () => {
  let s = mesa([URSO], []); let [x, ev] = faz(s, { do: 'empower_jace', amount: 3 });
  const [j] = jaces(x); assert.ok(j); const o = x.objects[j];
  assert.equal(o.token, true); assert.equal(o.name, 'Jace'); assert.deepEqual([...E.colorsOf(x, o)], ['U']);
  assert.ok([...E.tiposDe(x, o)].includes('planeswalker')); assert.match(E.linhaDeTipo(x, o), /Jace/); assert.equal(E.isCreature(x, o), false);
  assert.equal(o.counters.loyalty, 3); assert.equal(ev.find(e => e.do === 'empower_jace').amount, 3); assert.equal(x.pending, null); assert.equal(x.verbo, undefined);
  x = act(x, { t: 'pass', p: x.turn.priority }); assert.equal(x.objects[j].zone, 'battlefield', '704.5i: com 3 de lealdade continua');
  assert.equal(E.invariants(x).length, 0);
});

test('CR 701.71a · com uma ficha Jace sua, os marcadores vão para ela (não cria outra); com duas, quem empodera escolhe; a do oponente não conta', () => {
  let s = mesa([URSO], [URSO]); [s] = faz(s, { do: 'empower_jace', amount: 2 }); [s] = faz(s, { do: 'empower_jace', amount: 1 }, 1);
  const [a] = jaces(s, 0), [dele] = jaces(s, 1);
  let [x] = faz(s, { do: 'empower_jace', amount: 4 }); assert.equal(jaces(x).length, 1); assert.equal(x.objects[a].counters.loyalty, 6); assert.equal(x.objects[dele].counters.loyalty, 1);
  // uma segunda ficha Jace (cópia): a escolha é de quem empodera
  let y = J(s); E.applyEffect(y, fonte(0), { do: 'token', amount: 1, token: { name: 'Jace', types: ['planeswalker'], subtypes: ['Jace'], colors: ['U'] } }, null, []); const b = jaces(y).find(o => o !== a); y.objects[b].counters.loyalty = 1;
  [y] = faz(y, { do: 'empower_jace', amount: 2 });
  assert.equal(y.pending.kind, 'pick'); assert.equal(y.pending.p, 0); assert.deepEqual([...y.pending.from].sort(), [a, b].sort());
  y = act(y, legais(y, 0, z => z.t === 'pick' && z.oid === b)[0]); if (y.pending) y = act(y, legais(y, 0, z => z.t === 'pick_done')[0]);
  assert.equal(y.objects[b].counters.loyalty, 3); assert.equal(y.objects[a].counters.loyalty, 2);
});

test('CR 701.71a · a ficha Jace usa "[−1]: Surveil 1" e "[−3]: Draw a card" como planeswalker: uma habilidade por turno, em velocidade de feitiço, com lealdade suficiente', () => {
  let s = mesa([URSO, URSO, URSO, URSO], []); [s] = faz(s, { do: 'empower_jace', amount: 3 }); const [j] = jaces(s);
  const lealdade = x => legais(x, 0, a => a.t === 'activate' && a.oid === j);
  assert.equal(lealdade(s).length, 2, 'as duas habilidades');
  const mao = s.zones[0].hand.length;
  let x = resolveTudo(act(s, lealdade(s).find(a => a.index === 1)));
  assert.equal(x.zones[0].hand.length, mao + 1);
  assert.equal(x.zones[0].battlefield.includes(j), false, 'pagou 3 de lealdade: com 0 a ficha sai do campo (704.5i) e deixa de existir (111.7)');
  let y = resolveTudo(act(s, lealdade(s).find(a => a.index === 0))); assert.equal(y.objects[j].counters.loyalty, 2);
  assert.equal(lealdade(y).length, 0, 'uma habilidade de lealdade por turno');
});

test("Protege's Awakening, Mindseeker Oculus e Keeper of the Quiet Hour: os scripts, a ordem e a frase em português", () => {
  for (const sc of [OCULUS, KEEPER]) assert.equal(S.validateScript(sc).join(), '', sc.name);
  assert.match(S.validateScript({ name: 'X', effects: [{ do: 'empower_jace', amount: 0 }], example: { target: 'none', expect: { handDelta: 0 } } }).join(), /empower_jace/);
  let s = mesa([URSO, "Protege's Awakening"], []), pa; [s, pa] = poe(s, 0, "Protege's Awakening", 'hand'); const mao = s.zones[0].hand.length;
  let x = resolveTudo(conjura(comMana(s, 'UUUU'), 0, pa)); assert.equal(x.objects[jaces(x)[0]].counters.loyalty, 6); assert.equal(x.zones[0].hand.length, mao, 'gastou a mágica e comprou uma');
  let b = mesa(['Mindseeker Oculus'], []), mo; b = comScript(b, OCULUS); [b, mo] = poe(b, 0, 'Mindseeker Oculus', 'hand'); b = J(b);
  b = resolveTudo(act(comMana(b, 'UUU'), legais(comMana(b, 'UUU'), 0, a => a.t === 'cast' && a.oid === mo)[0]));
  for (let i = 0; i < 6 && b.stack.length; i++) b = resolveTudo(act(b, { t: 'pass', p: b.turn.priority }));
  assert.equal(b.objects[jaces(b)[0]].counters.loyalty, 4, 'Mindseeker Oculus entrou e empoderou 4');
  assert.match(T.descreveEfeitos([{ do: 'empower_jace', amount: 6 }]), /^empodera Jace 6 \(põe 6 marcadores de lealdade numa ficha Jace sua/);
});
