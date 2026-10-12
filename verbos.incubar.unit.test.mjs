// V-27 · CR 701.53 · incubar (111.10i: a ficha Incubadora). Texto oficial em .listas/oficiais-verbos.json (Oracle do Forge, clone de
// 12/10/2026): Eyes of Gitaxias — "Incubate 3. Draw a card." · Merciless Repurposing — "Exile target creature. Incubate 3." ·
// Converter Beast — "When Converter Beast enters, incubate 5." · Infected Defector — "When Infected Defector dies, incubate 3."
// (scripts das permanentes provados aqui)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { E, J, act, poe, legais, mesa, comMana, tudo, criatura, conjura } from './verbos.mjs';
const { scripts: S, table: T } = loadModules();
const URSO = criatura('Urso de Teste 3/3', 3, 3);
const fonte = (p = 0) => ({ oid: 'h', name: URSO, controller: p, ability: true, source: null });
const faz = (s, eff, p = 0) => { s = J(s); const ev = []; E.applyEffect(s, fonte(p), eff, null, ev); return [s, ev]; };
const incubadoras = (s, p = 0) => s.zones[p].battlefield.map(oid => s.objects[oid]).filter(o => o.token && (o.frontName || o.name) === 'Incubator');
const resolveTudo = s => tudo(s, x => legais(x, x.pending.p)[0]);
const comScript = (s, script) => { s = J(s); s.facts[script.name] = { ...s.facts[script.name], script }; return s; };
const BEAST = { name: 'Converter Beast', abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'incubate', amount: 5 }] }], example: { action: 'etb', target: 'none', expect: { handDelta: 0 } } };
const DEFECTOR = { name: 'Infected Defector', abilities: [{ kind: 'triggered', when: 'dies', effects: [{ do: 'incubate', amount: 3 }] }], example: { action: 'etb', target: 'none', expect: { handDelta: 0 } } };

test('CR 701.53a/b · incubar N: uma ficha Incubadora, artefato incolor (não criatura), que entra com N marcadores +1/+1 e tem "{2}: Transform this token"', () => {
  let s = mesa([URSO], []); let [x, ev] = faz(s, { do: 'incubate', amount: 3 });
  const [inc] = incubadoras(x); assert.ok(inc); assert.equal(incubadoras(x).length, 1);
  assert.equal(inc.counters.p1p1, 3); assert.deepEqual([...E.colorsOf(x, inc)], []);
  assert.deepEqual([...x.facts.Incubator.types], ['artifact']); assert.match(x.facts.Incubator.typeText, /Incubator/);
  assert.equal(E.eligibleAttackers(x, 0).includes(inc.oid), false, 'a frente não é criatura');
  assert.equal(ev.find(e => e.do === 'incubate').amount, 3);
  const ativ = legais(comMana(x, 'BB'), 0, a => a.t === 'activate' && a.oid === inc.oid); assert.equal(ativ.length, 1, '{2}: transformar');
  assert.equal(legais(comMana(x, 'B'), 0, a => a.t === 'activate' && a.oid === inc.oid).length, 0, 'com uma mana só não dá');
});

test('CR 701.53b · pagando {2} a Incubadora transforma: vira a Phyrexian Token, criatura artefato 0/0 que fica N/N com os marcadores; não ataca no turno em que nasceu', () => {
  let s = mesa([URSO], []); let [x] = faz(s, { do: 'incubate', amount: 3 }); const inc = incubadoras(x)[0].oid;
  x = act(comMana(x, 'BB'), legais(comMana(x, 'BB'), 0, a => a.t === 'activate' && a.oid === inc)[0]); x = resolveTudo(x);
  const o = x.objects[inc]; assert.equal(o.name, 'Phyrexian Token'); assert.equal(o.counters.p1p1, 3);
  assert.deepEqual({ ...E.stats(x, o) }, { power: 3, toughness: 3 }); assert.ok(x.facts['Phyrexian Token'].types.includes('creature')); assert.ok(x.facts['Phyrexian Token'].types.includes('artifact'));
  assert.match(x.facts['Phyrexian Token'].typeText, /Phyrexian/); assert.deepEqual([...E.colorsOf(x, o)], []);
  assert.equal(legais(comMana(x, 'BB'), 0, a => a.t === 'activate' && a.oid === inc).length, 0, 'o verso não tem a habilidade de transformar');
  assert.equal(E.eligibleAttackers(x, 0).includes(inc), false, '302.6: nasceu neste turno');
  for (let i = 0; i < 200 && !(x.turn.active === 0 && x.turn.number > s.turn.number && x.turn.step === 'main1'); i++) x = x.pending ? act(x, legais(x, x.pending.p)[0]) : act(x, { t: 'pass', p: x.turn.priority });
  assert.equal(E.eligibleAttackers(x, 0).includes(inc), true, 'no seu turno seguinte ataca');
  assert.equal(E.invariants(x).length, 0);
});

test('CR 701.53a · incubar 0 cria a Incubadora sem marcador (transformada, a 0/0 morre); "incubate N twice" cria duas, cada uma com N', () => {
  let s = mesa([URSO], []); let [x] = faz(s, { do: 'incubate', amount: { per: 'creatures-you-control' } });
  assert.equal(incubadoras(x).length, 1); assert.equal(incubadoras(x)[0].counters.p1p1 || 0, 0);
  const inc = incubadoras(x)[0].oid; x = resolveTudo(act(comMana(x, 'BB'), legais(comMana(x, 'BB'), 0, a => a.t === 'activate' && a.oid === inc)[0]));
  assert.notEqual(x.objects[inc] && x.objects[inc].zone, 'battlefield', '704.5f: a Firexiana 0/0 morre');
  { let y = s; [y] = poe(y, 0, URSO); [y] = poe(y, 0, URSO); [y] = faz(y, { do: 'incubate', amount: { per: 'creatures-you-control' } }); assert.equal(incubadoras(y)[0].counters.p1p1, 2, 'X = criaturas que você controla'); }
  [x] = faz(s, { do: 'incubate', amount: 2, vezes: 2 }); assert.deepEqual(incubadoras(x).map(o => o.counters.p1p1), [2, 2]);
});

test('Eyes of Gitaxias, Merciless Repurposing, Converter Beast e Infected Defector: os scripts, a ordem e a frase em português', () => {
  for (const sc of [BEAST, DEFECTOR]) assert.equal(S.validateScript(sc).join(), '', sc.name);
  assert.match(S.validateScript({ name: 'X', effects: [{ do: 'incubate', amount: 0 }], example: { target: 'none', expect: { handDelta: 0 } } }).join(), /incubate/);
  assert.match(S.validateScript({ name: 'X', effects: [{ do: 'incubate', amount: 2, vezes: 1 }], example: { target: 'none', expect: { handDelta: 0 } } }).join(), /vezes/);
  let s = mesa([URSO, 'Eyes of Gitaxias', 'Merciless Repurposing'], [URSO]), ur, eg, mr; [s, ur] = poe(s, 1, URSO);
  [s, eg] = poe(s, 0, 'Eyes of Gitaxias', 'hand'); [s, mr] = poe(s, 0, 'Merciless Repurposing', 'hand');
  const mao = s.zones[0].hand.length;
  let x = resolveTudo(conjura(comMana(s, 'UUU'), 0, eg)); assert.equal(incubadoras(x)[0].counters.p1p1, 3); assert.equal(x.zones[0].hand.length, mao, 'gastou a mágica e comprou uma');
  x = resolveTudo(conjura(comMana(s, 'BBBBBB'), 0, mr, [ur])); assert.equal(x.objects[ur].zone, 'exile'); assert.equal(incubadoras(x)[0].counters.p1p1, 3);
  let b = mesa(['Converter Beast'], []), cb; b = comScript(b, BEAST); [b, cb] = poe(b, 0, 'Converter Beast', 'hand'); b = J(b);
  b = resolveTudo(act(comMana(b, 'GGGG'), legais(comMana(b, 'GGGG'), 0, a => a.t === 'cast' && a.oid === cb)[0]));
  for (let i = 0; i < 6 && b.stack.length; i++) b = resolveTudo(act(b, { t: 'pass', p: b.turn.priority }));
  assert.equal(incubadoras(b)[0].counters.p1p1, 5, 'Converter Beast entrou e incubou 5');
  let d = mesa(['Infected Defector'], []), id; [d, id] = poe(d, 0, 'Infected Defector'); d = comScript(d, DEFECTOR); d = J(d);
  E.applyEffect(d, fonte(1), { do: 'destroy', target: 'creature' }, { oid: id }, []); d = resolveTudo(act(d, { t: 'pass', p: d.turn.priority }));
  assert.equal(incubadoras(d)[0].counters.p1p1, 3, 'Infected Defector morreu e incubou 3');
  assert.match(T.descreveEfeitos([{ do: 'incubate', amount: 3 }]), /^incuba 3 \(cria uma ficha de Incubadora com 3 marcadores \+1\/\+1/);
});
