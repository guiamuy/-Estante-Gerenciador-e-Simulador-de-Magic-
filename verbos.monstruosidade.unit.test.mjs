// V-6 · CR 701.37 · monstruosidade. Texto oficial em .listas/oficiais-verbos.json (Oracle do Forge e mtggoldfish, 11/10/2026):
// Nessian Asp — "{6}{G}: Monstrosity 4." · Keepsake Gorgon — "{5}{B}{B}: Monstrosity 1. When Keepsake Gorgon becomes monstrous,
// destroy target non-Gorgon creature an opponent controls."
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { E, J, act, poe, legais, mesa, comMana, tudo, criatura } from './verbos.mjs';
const { scripts: S, table: T } = loadModules();
const URSO = criatura('Urso de Teste 3/3', 3, 3);
const ativa = (s, oid) => act(s, legais(s, 0, a => a.t === 'activate' && a.oid === oid)[0]);
const resolve = s => tudo(s, x => legais(x, x.pending.p)[0]);

test('CR 701.37 · monstruosidade (a): a permanente que não é monstruosa recebe N marcadores +1/+1 e fica monstruosa; ativar de novo não põe mais nada', () => {
  let s = mesa(['Nessian Asp'], [URSO]), asp; [s, asp] = poe(s, 0, 'Nessian Asp');
  s = resolve(ativa(comMana(s, 'GGGGGGG'), asp));
  assert.equal(s.objects[asp].counters.p1p1, 4); assert.equal(E.stats(s, s.objects[asp]).power, 8); assert.equal(E.ehMonstruosa(s, s.objects[asp]), true);
  const de = legais(comMana(s, 'GGGGGGG'), 0, a => a.t === 'activate' && a.oid === asp);
  assert.ok(de.length > 0, 'a habilidade continua podendo ser ativada (a regra só diz que nada acontece)');
  s = resolve(ativa(comMana(s, 'GGGGGGG'), asp));
  assert.equal(s.objects[asp].counters.p1p1, 4, 'já é monstruosa: nenhum marcador a mais');
});

test('CR 701.37 · monstruosidade (b): a marca dura até a permanente sair do campo — de volta, é objeto novo e pode ficar monstruosa outra vez; marcadores postos por outro efeito não a tornam monstruosa', () => {
  let s = mesa(['Nessian Asp'], [URSO]), asp; [s, asp] = poe(s, 0, 'Nessian Asp');
  let x = J(s); x.objects[asp].counters.p1p1 = 2; assert.equal(E.ehMonstruosa(x, x.objects[asp]), false);
  x = resolve(ativa(comMana(x, 'GGGGGGG'), asp)); assert.equal(x.objects[asp].counters.p1p1, 6, 'ter marcadores não é ser monstruosa (não é adaptar)');
  // sai do campo (devolvida à mão pelo motor) e volta
  const ev = []; x = J(x); E.applyEffect(x, { oid: 'h', name: 'T', controller: 0, ability: true, source: null }, { do: 'bounce', target: 'creature' }, { oid: asp }, ev);
  assert.equal(x.objects[asp].zone, 'hand'); assert.equal(E.ehMonstruosa(x, x.objects[asp]), false);
  x = resolve(act(comMana(x, 'GGGGG'), legais(comMana(x, 'GGGGG'), 0, a => a.t === 'cast' && a.oid === asp)[0])); // conjurada de novo: volta ao campo como objeto novo
  assert.equal(x.objects[asp].zone, 'battlefield'); assert.equal(E.ehMonstruosa(x, x.objects[asp]), false);
  x = resolve(ativa(comMana(x, 'GGGGGGG'), asp)); assert.equal(x.objects[asp].counters.p1p1, 4, 'o objeto novo fica monstruoso de novo');
});

test('CR 701.37 · "quando fica monstruosa" dispara uma vez, vai à pilha com alvo, e leva o N como valor (c); se já era monstruosa não dispara', () => {
  let s = mesa(['Keepsake Gorgon'], [URSO, 'Keepsake Gorgon']), g, urso, outra;
  [s, g] = poe(s, 0, 'Keepsake Gorgon'); [s, urso] = poe(s, 1, URSO); [s, outra] = poe(s, 1, 'Keepsake Gorgon');
  s = ativa(comMana(s, 'BBBBBBB'), g);
  for (let i = 0; i < 6 && !s.pending && !(s.objects[g].counters.p1p1 > 0); i++) s = act(s, { t: 'pass', p: s.turn.priority }); // até a monstruosidade resolver
  assert.equal(s.objects[g].counters.p1p1, 1);
  // o gatilho pede alvo: só criatura do oponente que não seja Górgona (com um alvo legal só, o motor já o escolhe)
  const gatilho = () => Object.values(s.objects).find(o => o.ability && o.zone === 'stack' && o.source === g);
  const alvos = s.pending ? s.pending.options.map(o => o.oid) : gatilho().targets.map(t => t.oid);
  assert.deepEqual([...alvos], [urso], 'a Górgona do oponente não é alvo');
  if (s.pending) s = act(s, legais(s, 0)[0]);
  assert.equal(gatilho().triggerValue, 1, 'o X da monstruosidade viaja com o gatilho');
  s = resolve(s); assert.equal(s.objects[urso].zone, 'graveyard');
  // segunda ativação: nada acontece e nada dispara
  s = resolve(ativa(comMana(s, 'BBBBBBB'), g)); assert.equal(s.objects[outra].zone, 'battlefield'); assert.equal(s.objects[g].counters.p1p1, 1);
});

test('CR 701.37 · monstruosidade: só permanente fica monstruosa; o validador e a frase em português', () => {
  let s = mesa(['Nessian Asp'], []), asp; [s, asp] = poe(s, 0, 'Nessian Asp', 'graveyard'); s = J(s);
  const ev = []; E.applyEffect(s, { oid: 'h', name: 'Nessian Asp', controller: 0, ability: true, source: asp }, { do: 'monstrosity', amount: 4 }, null, ev);
  assert.equal(s.objects[asp].counters.p1p1 || 0, 0); assert.equal(s.objects[asp].monstruosa, undefined); assert.ok(ev.some(e => e.failed));
  const ex = { action: 'activate:0', target: 'none', expect: { counters: 1 } };
  assert.match(S.validateScript({ name: 'X', abilities: [{ kind: 'activated', cost: { mana: '{1}' }, effects: [{ do: 'monstrosity' }] }], example: ex }).join(), /amount/);
  assert.equal(T.descreveEfeitos(S.SCRIPTS['Nessian Asp'].abilities[0].effects), 'monstruosidade 4: se ainda não é monstruosa, recebe 4 marcadores +1/+1 e fica monstruosa');
  assert.equal(S.descreveGatilho('becomes-monstrous'), 'quando fica monstruosa');
});
