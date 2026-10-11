// CR2f.1 · "torna-se uma cópia de" (707.4, camada 1a): os valores copiáveis são os impressos mais outras cópias (707.2, 707.3);
// marcadores e efeitos de outras camadas ficam; exceção de tipo (707.9b); fora do campo a carta volta a ser ela mesma (400.7).
// Carta: Saheeli, Sublime Artificer −2 (texto oficial em .listas/oficiais-commander.json, 05/10/2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, tudo, passaAte } from './cmd.mjs';
import { S, T } from './listas.mjs';

function prepara() {
  let s = mesa(['Saheeli, Sublime Artificer', 'Sol Ring', 'Thraben Inspector'], []), sa, ring, ins;
  [s, sa] = poe(s, 0, 'Saheeli, Sublime Artificer', 'battlefield', { counters: { loyalty: 5 } }); [s, ring] = poe(s, 0, 'Sol Ring'); [s, ins] = poe(s, 0, 'Thraben Inspector');
  return { s, sa, ring, ins };
}
const menos2 = (s, sa, a, b) => tudo(act(s, legais(s, 0, x => x.t === 'activate' && x.oid === sa && (x.targets || []).length === 2 && x.targets[0].oid === a && x.targets[1].oid === b)[0]));

test('CR 707.4 · Saheeli −2: o Sol Ring vira cópia do Thraben Inspector até o fim do turno, além de artefato; na limpeza volta a ser Sol Ring', () => {
  let { s, sa, ring, ins } = prepara();
  s = J(s); s.objects[ring].counters.charge = 2; // marcador do próprio objeto: fica (não é copiável)
  s = menos2(s, sa, ring, ins);
  assert.equal(s.objects[sa].counters.loyalty, 3);
  const r = s.objects[ring];
  assert.equal(r.name, 'Thraben Inspector', 'nome e características do modelo'); assert.equal(r.nomeImpresso, 'Sol Ring');
  assert.ok(E.isCreature(s, r), 'agora é criatura'); assert.ok(/\bArtifact\b/.test(E.linhaDeTipo(s, r)), '"except it\'s an artifact in addition to its other types"');
  assert.deepEqual([E.stats(s, r).power, E.stats(s, r).toughness], [1, 2]);
  assert.equal(r.counters.charge, 2, 'os marcadores do objeto ficam');
  const x = passaAte(s, y => y.turn.active === 1);
  assert.equal(x.objects[ring].name, 'Sol Ring', 'acabou: volta ao nome impresso'); assert.equal(E.isCreature(x, x.objects[ring]), false);
  assert.equal(x.objects[ring].nomeImpresso, undefined);
});

test('CR 707.3 · cópia de cópia usa os valores copiados; saindo do campo, a carta é ela mesma (400.7)', () => {
  let { s, sa, ring, ins } = prepara();
  let outro; [s, outro] = poe(s, 0, 'Sol Ring');
  s = menos2(s, sa, ring, ins);
  { const z = J(s), src = { oid: 'h', name: 'Teste', controller: 0, ability: true };
    E.applyEffect(z, src, { do: 'escolhe_copiadora', target: 'artifact' }, { oid: outro }, []); E.applyEffect(z, src, { do: 'torna_copia', target: 'creature' }, { oid: ring }, []);
    assert.equal(z.objects[outro].name, 'Thraben Inspector', 'copiou a cópia: valores já copiados (707.3)'); assert.equal(z.objects[outro].nomeImpresso, 'Sol Ring'); }
  const y = J(s); E.moveObject(y, ring, 'graveyard');
  assert.equal(y.objects[ring].name, 'Sol Ring', 'no cemitério é o Sol Ring'); assert.equal(y.objects[ring].copias, undefined);
  assert.equal(S.SCRIPTS['Saheeli, Sublime Artificer'].covers, undefined);
  assert.equal(T.descreveEfeitos([{ do: 'torna_copia', target: 'creature', ate: 'fim-do-turno', somaTipos: ['artifact'] }]), 'ela vira uma cópia de uma criatura, além de artefato até o fim do turno');
});
