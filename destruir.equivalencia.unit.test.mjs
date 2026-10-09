// M-242 · CR2-G R5c · "se fosse destruída" (701.8 / 614): a destruição — pelo verbo destruir e pelo dano letal na checagem de
// estado — passa por seriaDestruida, que diz se ela é indestrutível, se a Aura com armadura de totem vai no lugar (702.89),
// se um escudo de regeneração é gasto (701.15) ou se ela é destruída. Sem escudo nem totem, o resultado é o de antes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, S, T, J, act, decks, jogo, poe, passaAte, conjura, resolve } from './listas.mjs';

const LISTAS = Object.keys(decks);

test('M-242 · R5c · sem escudo nem totem, "se fosse destruída" dá o que o caminho antigo dava (indestrutível ou destruída) para cada permanente, em partidas aleatórias com as listas reais', () => {
  let n = 0;
  LISTAS.forEach((lista, i) => {
    let s = jogo({ lista, oponente: LISTAS[(i + 4) % LISTAS.length], seed: 70 + i });
    const politica = E.randomPolicy(1201 + i);
    for (let k = 0; k < 200 && s.status !== 'over'; k++) {
      const a = politica(s); if (!a) break; s = act(s, a);
      if (k % 3) continue;
      for (const oid of s.zones.flatMap(z => z.battlefield)) {
        const o = s.objects[oid], velho = E.hasKeyword(s, o, 'indestructible') ? 'indestrutivel' : 'destruida';
        assert.equal(E.seriaDestruida(s, o), velho, `${lista} · ${k} · ${o.name}`); n++;
      }
    }
  });
  assert.ok(n > 2000, `amostra pequena (${n})`);
});

test('M-242 · R5c · regenerar na partida: o escudo segura o Lightning Bolt (vira, perde o dano), é gasto, e "não pode ser regenerada" (Polymorph) fura', () => {
  let s = jogo({ lista: 'Pauper Boros Bully', oponente: 'Pauper Elves', seed: 4, terrenos: ['Mountain'] }), kor, bolt;
  [s, kor] = poe(s, 0, 'Kor Skyfisher'); [s, bolt] = poe(s, 0, 'Lightning Bolt', 'hand');
  s = J(s);
  const regen = { do: 'regenerar', target: 'creature' };
  assert.deepEqual(J(S.validateScript({ name: 'Teste', effects: [regen] })).filter(e => !/cenário/.test(e)), []);
  E.applyEffect(s, s.objects[kor], { do: 'regenerar', target: 'self-source' }, null, []);
  assert.equal(s.objects[kor].regenerar, 1);
  s.facts['Lightning Bolt'] = { ...s.facts['Lightning Bolt'], script: { name: 'Lightning Bolt', effects: [{ do: 'damage', amount: 3, target: 'creature' }] } };
  s = resolve(conjura(s, 0, bolt, x => (x.targets || []).some(t => t.oid === kor)));
  assert.equal(s.objects[kor].zone, 'battlefield', 'regenerou');
  assert.equal(s.objects[kor].tapped, true); assert.equal(s.objects[kor].damage, 0); assert.equal(s.objects[kor].regenerar, undefined, 'o escudo foi gasto');
  // "Destroy target creature. It can't be regenerated." (Polymorph)
  const x = J(s); x.objects[kor].regenerar = 1;
  E.applyEffect(x, { oid: 'p', name: 'Polymorph', controller: 0, ability: true, source: null }, S.SCRIPTS.Polymorph.effects[0], { oid: kor }, []);
  assert.equal(x.objects[kor].zone, 'graveyard', 'não pode ser regenerada');
  const y = J(s); y.objects[kor].regenerar = 1;
  E.applyEffect(y, { oid: 'p', name: 'Destruir', controller: 0, ability: true, source: null }, { do: 'destroy', target: 'creature' }, { oid: kor }, []);
  assert.equal(y.objects[kor].zone, 'battlefield', 'destruir comum: o escudo segura');
  assert.equal(T.descreveEfeitos([regen]), 'regenera uma criatura (na próxima vez que seria destruída neste turno, vira, perde o dano e sai do combate)');
});

test('M-242 · R5c · armadura de totem: a Aura vai para o cemitério no lugar da criatura, que perde o dano; resistência 0 não é destruição', () => {
  let s = jogo({ lista: 'Pauper GW Bogles', oponente: 'Pauper Elves', seed: 5 }), bogle, rancor;
  [s, bogle] = poe(s, 0, 'Gladecover Scout'); [s, rancor] = poe(s, 0, 'Rancor');
  s = J(s);
  s.facts.Rancor = { ...s.facts.Rancor, script: { ...s.facts.Rancor.script, armaduraTotem: true } };
  assert.deepEqual(J(S.validateScript({ name: 'Teste', armaduraTotem: true, effects: [] })).filter(e => /totem/.test(e)), ['armadura de totem só vale para Aura']);
  s.objects[rancor].attachedTo = bogle; s.objects[rancor].anexadaEm = 50;
  const x = J(s); x.objects[bogle].damage = 9;
  const r = E.apply(x, { t: 'pass', p: 0 }); // a checagem de estado roda
  assert.equal(r.state.objects[bogle].zone, 'battlefield', 'a criatura fica');
  assert.equal(r.state.objects[bogle].damage, 0, 'perdeu o dano');
  assert.equal(r.state.objects[rancor].zone !== 'battlefield', true, 'a Aura foi no lugar');
  assert.ok(r.events.some(e => e.kind === 'totem'));
  const y = J(s); y.objects[bogle].pump = { p: 0, t: -5 };
  const r2 = E.apply(y, { t: 'pass', p: 0 });
  assert.notEqual(r2.state.objects[bogle].zone, 'battlefield', 'resistência 0: vai para o cemitério mesmo com totem (não é destruição)');
});
