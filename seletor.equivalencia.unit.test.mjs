// M-229 · R1 · seletor único: cada nome de alvo antigo virou atalho para um seletor. Este teste prova que o caminho novo
// devolve exatamente o mesmo que o antigo (mesmos alvos, mesma ordem), em partidas aleatórias com as listas reais.
// Enquanto ele existir, o caminho antigo (legalTargetsLegado) fica no motor só para esta comparação.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, S, T, J, act, decks, jogo } from './listas.mjs';

const KINDS = Object.keys(S.ALVO_SELETOR);
const LISTAS = Object.keys(decks);

function compara(s, rotulo) {
  let n = 0;
  const fontes = [undefined, ...s.zones.flatMap(z => z.battlefield).slice(0, 6), ...s.stack.slice(-2)];
  for (const p of [0, 1]) for (const kind of KINDS) for (const self of fontes) for (const cor of [undefined, 'B']) {
    const novo = E.legalTargets(s, p, kind, self, cor), velho = E.legalTargetsLegado(s, p, kind, self, cor);
    assert.deepEqual(J(novo), J(velho), `${rotulo} · jogador ${p} · "${kind}" · fonte ${self || '-'}${cor ? ' · cor ' + cor : ''}`); n++;
  }
  return n;
}

test('M-229 · R1 · os nomes de alvo antigos e o seletor dão o mesmo resultado, na mesma ordem, em partidas aleatórias com as listas reais', () => {
  let comparacoes = 0, estados = 0;
  LISTAS.forEach((lista, i) => {
    for (const seed of [1, 2]) {
      let s = jogo({ lista, oponente: LISTAS[(i + 3) % LISTAS.length], seed });
      const politica = E.randomPolicy(seed * 7919 + i);
      for (let k = 0; k < 160 && s.status !== 'over'; k++) {
        const a = politica(s); if (!a) break;
        s = act(s, a);
        if (k % 8 === 0) { comparacoes += compara(s, `${lista} · semente ${seed} · ação ${k}`); estados++; }
      }
    }
  });
  assert.ok(estados >= 50 && comparacoes > 10000, `amostra pequena demais (${estados} estados, ${comparacoes} comparações)`);
});

test('M-229 · R1 · seletor escrito direto no script é aceito pelo validador e mira o que descreve', () => {
  const sc = { name: 'Teste do seletor', effects: [{ do: 'destroy', target: { tipos: ['creature'], de: 'opponent' } }], example: { target: 'enemy-creature', expect: { gone: true } } };
  assert.equal(S.validateScript(sc).length, 0, 'válido: ' + S.validateScript(sc).join('; '));
  assert.ok(S.validateScript({ ...sc, effects: [{ do: 'destroy', target: { tipos: ['criatura'] } }] }).some(e => /tipo "criatura"/.test(e)), 'tipo desconhecido é recusado');
  assert.ok(S.validateScript({ ...sc, effects: [{ do: 'destroy', target: { jogadores: 'any' } }] }).some(e => /não mira jogadores/.test(e)), 'destruir não mira jogador');
  let s = jogo({ lista: 'Commander Orzhov Killian', oponente: 'Pauper Elves', seed: 3 });
  const oponente = E.selecionar(s, 0, { tipos: ['creature'], de: 'opponent' }), legado = E.legalTargetsLegado(s, 0, 'creature-opponent-controls');
  assert.deepEqual(J(oponente), J(legado));
  assert.deepEqual(J(E.selecionar(s, 0, { zona: 'nenhuma', jogadores: 'opponent' })), [{ player: 1 }]);
});

test('M-229 · R1 · a comparação pega divergência: um atalho trocado de propósito dá resultado diferente do caminho antigo', () => {
  const s = jogo({ lista: 'Pauper Elves', oponente: 'Pauper Boros Bully', seed: 5 });
  const antes = S.ALVO_SELETOR.player;
  try { S.ALVO_SELETOR.player = { zona: 'nenhuma', jogadores: 'opponent' }; assert.notDeepEqual(J(E.legalTargets(s, 0, 'player')), J(E.legalTargetsLegado(s, 0, 'player'))); }
  finally { S.ALVO_SELETOR.player = antes; }
});

test('M-229 · R1 · alvo escrito como seletor aparece em português na folha da carta', () => {
  assert.equal(T.descreveEfeitos([{ do: 'destroy', target: { tipos: ['creature', 'planeswalker'], de: 'opponent' } }]), 'destrói uma criatura ou planeswalker que um oponente controla');
  assert.equal(T.descreveEfeitos([{ do: 'reanimate', target: { zona: 'graveyard', de: 'you', tipos: ['creature'] } }]), 'devolve uma criatura do cemitério ao campo');
});
