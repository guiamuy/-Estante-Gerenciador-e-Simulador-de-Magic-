// M-248 · rastros do turno no estado: "vida perdida neste turno" (119.3: dano a jogador, perda de vida e vida paga são perda)
// e "atacou neste turno" (508.1: declarar atacantes; pôr no campo atacando não conta). Os dois somem no começo do turno seguinte.
// Cartas: Children of Korlis e Chart a Course (texto oficial em .listas/oficiais-commander.json, 05/10/2026; segunda fonte 10/10/2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, comMana, tudo, passaAte } from './cmd.mjs';
import { S, T, decks, jogo } from './listas.mjs';

test('M-248 · vida perdida neste turno: dano de combate e de efeito, perda de vida e vida paga somam; ganhar vida não desconta; zera no turno seguinte', () => {
  let s = mesa(['Lightning Bolt', 'Children of Korlis'], ['Lightning Bolt']), b, k;
  [s, b] = poe(s, 1, 'Lightning Bolt', 'hand'); [s, k] = poe(s, 0, 'Children of Korlis');
  s = J(s); s.players[0].life = 20;
  const ev = []; E.applyEffect(s, s.objects[b], { do: 'damage', amount: 3, target: 'player' }, { player: 0 }, ev);
  E.applyEffect(s, { oid: 'h', name: 'Perda', controller: 1, ability: true, source: null }, { do: 'lose', amount: 2, target: 'player' }, { player: 0 }, []);
  E.applyEffect(s, { oid: 'h', name: 'Ganho', controller: 0, ability: true, source: null }, { do: 'gain', amount: 4 }, null, []);
  assert.equal(s.players[0].lifeLost, 5, '3 de dano + 2 de perda; o ganho de 4 não desconta');
  assert.equal(s.players[1].lifeLost, undefined, 'quem não perdeu não tem o rastro (estado igual ao de antes)');
  // "Sacrifice this creature: You gain life equal to the life you've lost this turn."
  const x = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === k)[0]));
  assert.equal(x.players[0].life, 19 + 5, '20 − 5 + 4 + 5');
  assert.equal(T.descreveEfeitos(S.SCRIPTS['Children of Korlis'].abilities[0].effects), 'ganha vida igual à vida que você perdeu neste turno');
  const y = passaAte(s, z => z.turn.active === 1);
  assert.equal(y.players[0].lifeLost, undefined, 'some no começo do turno seguinte');
});

test('M-248 · atacou neste turno: só declarar atacantes conta; Chart a Course descarta "unless you attacked this turn"', () => {
  let s = jogo({ lista: 'Pauper Boros Bully', oponente: 'Pauper Elves', seed: 5 }), kor;
  [s, kor] = poe(s, 0, 'Kor Skyfisher');
  s = J(s); s.facts['Chart a Course'] = { ...(s.facts['Lightning Bolt']), name: 'Chart a Course', types: ['sorcery'], script: S.SCRIPTS['Chart a Course'] };
  assert.equal(s.players[0].atacouCom, undefined);
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers');
  s = act(s, { t: 'attack', p: 0, attackers: [kor] });
  assert.equal(s.players[0].atacouCom, 1);
  const fonte = { oid: 'c', name: 'Chart a Course', controller: 0 };
  const efeitos = S.SCRIPTS['Chart a Course'].effects;
  assert.equal(E.effectAllowed(s, fonte, efeitos[1]), false, 'atacou: não descarta');
  const semAtaque = J(s); delete semAtaque.players[0].atacouCom;
  assert.equal(E.effectAllowed(semAtaque, fonte, efeitos[1]), true, 'sem ataque: descarta');
  assert.equal(E.effectAllowed(s, fonte, efeitos[0]), true, 'a compra não tem condição');
  assert.equal(T.descreveEfeitos(efeitos), 'compra 2 cartas; descarta 1 carta (só se você não atacou neste turno)');
  const z = passaAte(s, x => x.turn.active === 1);
  assert.equal(z.players[0].atacouCom, undefined, 'some no turno seguinte');
});

test('M-248 · Chart a Course na partida: sem ataque compra 2 e descarta 1; depois de atacar, compra 2 e não descarta', () => {
  const base = () => { let s = mesa(['Chart a Course', 'Faerie Seer'], []), c, f; [s, c] = poe(s, 0, 'Chart a Course', 'hand'); [s, f] = poe(s, 0, 'Faerie Seer'); return { s: comMana(s, 'UC'), c, f }; };
  { let { s, c } = base(); const mao = s.zones[0].hand.length;
    s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === c)[0]);
    s = tudo(s, x => legais(x, x.pending.p, a => a.t === 'discard')[0] || legais(x, x.pending.p)[0]);
    assert.equal(s.zones[0].hand.length, mao - 1 + 2 - 1, 'conjurou, comprou 2, descartou 1'); }
  { let { s, c, f } = base();
    s = passaAte(s, x => x.pending && x.pending.kind === 'attackers'); s = act(s, { t: 'attack', p: 0, attackers: [f] });
    s = passaAte(s, x => x.turn.step === 'main2' && !x.stack.length && !x.pending);
    const mao = s.zones[0].hand.length; s = comMana(s, 'UC');
    s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === c)[0]));
    assert.equal(s.zones[0].hand.length, mao - 1 + 2, 'atacou: só compra'); }
});

test('M-248 · invariante em partidas aleatórias com as listas reais: no turno, a vida perdida nunca diminui e cresce pelo menos o que a vida caiu em cada ação', () => {
  const LISTAS = Object.keys(decks); let n = 0;
  LISTAS.forEach((lista, i) => {
    let s = jogo({ lista, oponente: LISTAS[(i + 1) % LISTAS.length], seed: 90 + i }); const pol = E.randomPolicy(4100 + i);
    for (let k = 0; k < 700 && s.status !== 'over'; k++) {
      const a = pol(s); if (!a) break;
      const antes = s.players.map(p => ({ vida: p.life, perdida: p.lifeLost || 0 })), turno = s.turn.number;
      s = E.apply(s, a).state;
      s.players.forEach((p, j) => {
        assert.ok(p.lifeLost == null || p.lifeLost > 0, 'o rastro só existe com perda');
        if (s.turn.number !== turno) return; // virou o turno: zerou
        const caiu = antes[j].vida - p.life, subiu = (p.lifeLost || 0) - antes[j].perdida;
        assert.ok(subiu >= 0, `${lista} · ${k}: a vida perdida no turno diminuiu`);
        if (caiu > 0) { assert.ok(subiu >= caiu, `${lista} · ${k}: caiu ${caiu} e o rastro subiu ${subiu}`); n++; }
      });
    }
  });
  assert.ok(n > 30, `amostra pequena (${n})`);
});
