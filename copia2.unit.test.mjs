// CR2f.2 · "entra como cópia" (707.5: a escolha vem ao entrar, antes dos gatilhos de entrada, que já são os do modelo) e ficha que é
// cópia (707.8). Efeitos sintéticos: as listas não têm Clone nem "crie uma ficha que é cópia".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, comMana, tudo } from './cmd.mjs';
import { S, T } from './listas.mjs';

function prepara() {
  let s = mesa(['Faerie Seer', 'Thraben Inspector'], ['Faerie Seer']), clone, ins, op;
  [s, clone] = poe(s, 0, 'Faerie Seer', 'hand'); [s, ins] = poe(s, 0, 'Thraben Inspector'); [s, op] = poe(s, 1, 'Faerie Seer');
  s = J(s); s.facts['Faerie Seer'].script = { ...(s.facts['Faerie Seer'].script || {}), entraComoCopia: { de: { tipos: ['creature'] } } }; // a Seer de teste vira "Clone"
  s = comMana(s, 'U');
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === clone)[0]);
  for (let i = 0; i < 6 && !(s.pending && s.pending.kind === 'pick'); i++) s = act(s, { t: 'pass', p: s.turn.priority });
  return { s, clone, ins, op };
}

test('CR 707.5 · entra como cópia: a mesa pergunta qual criatura copiar; escolhida, entra já como ela e dispara o gatilho de entrada do modelo', () => {
  let { s, clone, ins, op } = prepara();
  assert.equal(s.pending.label, 'copiar ao entrar'); assert.equal(s.pending.min, 0); assert.equal(s.pending.max, 1);
  assert.deepEqual(J(s.pending.from).sort(), [ins, op].sort(), 'qualquer criatura no campo, dos dois lados');
  s = act(s, { t: 'pick', p: 0, oid: ins });
  assert.equal(s.objects[clone].zone, 'battlefield'); assert.equal(s.objects[clone].name, 'Thraben Inspector'); assert.equal(s.objects[clone].nomeImpresso, 'Faerie Seer');
  s = tudo(s);
  assert.ok(Object.values(s.objects).some(o => o.token && o.name === 'Clue'), '"When this creature enters, investigate": o gatilho do modelo');
  const y = J(s); E.moveObject(y, clone, 'graveyard'); assert.equal(y.objects[clone].name, 'Faerie Seer', 'no cemitério é ela mesma');
});

test('CR 707.5 · recusar: entra como ela mesma, com o gatilho dela; CR 707.8 · ficha que é cópia', () => {
  let { s, clone, ins } = prepara();
  s = act(s, { t: 'pick_done', p: 0 });
  assert.equal(s.objects[clone].zone, 'battlefield'); assert.equal(s.objects[clone].name, 'Faerie Seer'); assert.equal(s.objects[clone].nomeImpresso, undefined);
  let x = J(s); E.applyEffect(x, { oid: 'h', name: 'Teste', controller: 0, ability: true }, { do: 'ficha_copia', target: 'creature', palavras: ['haste'] }, { oid: ins }, []);
  const ficha = Object.values(x.objects).find(o => o.token && o.name === 'Thraben Inspector');
  assert.ok(ficha, 'ficha com os valores do Inspector'); assert.equal(E.hasKeyword(x, ficha, 'haste'), true, '"except it has haste"');
  assert.equal(T.descreveEfeitos([{ do: 'ficha_copia', target: 'creature' }]), 'cria uma ficha que é cópia de uma criatura');
  assert.ok(J(S.validateScript({ name: 'T', entraComoCopia: { de: { tipo: 'x' } }, example: { action: 'etb', target: 'none', expect: { attached: false } } })).some(e => /entra como cópia|seletor/.test(e)));
});
