// M-243 · CR2-G R5d · substituição de dano num formato só (614.1a): `dano: [{ fonte, a, soma, multiplica, soCombate }]` numa
// permanente — "se <fonte> fosse causar dano a <alvo>, causa N a mais / o dobro" —, no combate e no dano de efeito, antes da
// prevenção. Sem nenhuma dessas regras no campo, o dano é o de antes (provado em partidas aleatórias com as listas reais).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, S, T, J, act, decks, jogo, poe, passaAte, conjura, resolve } from './listas.mjs';

const LISTAS = Object.keys(decks);

function compara(s, rotulo) {
  let n = 0;
  const fontes = [...s.zones.flatMap(z => z.battlefield), ...s.stack].map(oid => s.objects[oid]).filter(Boolean);
  const alvos = [...s.zones.flatMap(z => z.battlefield).map(oid => ({ obj: s.objects[oid] })), { player: 0 }, { player: 1 }];
  for (const src of fontes) for (const alvo of alvos) for (const combate of [false, true]) for (const amt of [0, 1, 3]) {
    assert.equal(E.danoSubstituido(s, src, alvo, amt, combate), amt, `${rotulo} · ${src.name} → ${alvo.obj ? alvo.obj.name : 'jogador ' + alvo.player}`); n++;
  }
  return n;
}

test('M-243 · R5d · sem regra de dano no campo, o dano é exatamente o de antes, para cada fonte, alvo, tipo e quantidade, em partidas aleatórias com as listas reais', () => {
  let n = 0;
  LISTAS.forEach((lista, i) => {
    let s = jogo({ lista, oponente: LISTAS[(i + 5) % LISTAS.length], seed: 80 + i });
    const politica = E.randomPolicy(3301 + i);
    for (let k = 0; k < 160 && s.status !== 'over'; k++) { const a = politica(s); if (!a) break; s = act(s, a); if (k % 12 === 0) n += compara(s, `${lista} · ${k}`); }
  });
  assert.ok(n > 10000, `amostra pequena (${n})`);
});

function comRegra(s, nome, dano) {
  s = J(s); s.facts[nome] = { ...s.facts[nome], script: { ...(s.facts[nome].script || {}), dano } }; return s;
}

test('M-243 · R5d · a comparação pega divergência: uma regra de dano no campo muda o resultado', () => {
  let s = jogo({ lista: 'Pauper Boros Bully', oponente: 'Pauper Elves', seed: 2 });
  [s] = poe(s, 0, 'Lunarch Veteran'); [s] = poe(s, 1, 'Llanowar Elves');
  assert.throws(() => compara(comRegra(s, 'Lunarch Veteran', [{ fonte: { de: 'you' }, multiplica: 2 }]), 'com regra'));
});

test('M-243 · R5d · na partida: "se uma fonte sua fosse causar dano a um oponente, causa o dobro" dobra o Lightning Bolt no oponente e não na criatura; "+1 de combate" das suas criaturas soma antes de dobrar; a prevenção vem depois', () => {
  let s = jogo({ lista: 'Pauper Boros Bully', oponente: 'Pauper Elves', seed: 3, terrenos: ['Mountain'] }), fonte, bolt, elfo;
  [s, fonte] = poe(s, 0, 'Lunarch Veteran'); [s, bolt] = poe(s, 0, 'Lightning Bolt', 'hand'); [s, elfo] = poe(s, 1, 'Llanowar Elves');
  const regras = [{ fonte: { de: 'you' }, a: 'oponente', multiplica: 2 }, { fonte: { tipos: ['creature'], de: 'you' }, soma: 1, soCombate: true }];
  for (const [i, r] of regras.entries()) assert.deepEqual(J(S.danoErros(r, 'd' + i)), []);
  s = comRegra(s, 'Lunarch Veteran', regras);
  const vida = s.players[1].life;
  const x = resolve(conjura(s, 0, bolt, a => (a.targets || []).some(t => t.player === 1)));
  assert.equal(x.players[1].life, vida - 6, 'o raio causou 6 ao oponente');
  assert.equal(E.danoSubstituido(s, s.objects[bolt], { obj: s.objects[elfo] }, 3, false), 3, 'na criatura não dobra');
  assert.equal(E.danoSubstituido(s, s.objects[fonte], { player: 1 }, 1, true), 4, 'criatura sua em combate no oponente: (1+1)×2');
  assert.equal(E.danoSubstituido(s, s.objects[fonte], { player: 1 }, 1, false), 2, 'fora do combate, só o dobro');
  assert.equal(E.danoSubstituido(s, s.objects[elfo], { player: 0 }, 1, true), 1, 'fonte do oponente não muda');
  const y = J(s); y.prevencoes = [{ alvo: { player: 1 }, quantidade: 4 }];
  const ev = []; E.applyEffect(y, y.objects[bolt], { do: 'damage', amount: 3, target: 'player' }, { player: 1 }, ev);
  assert.equal(y.players[1].life, vida - 2, 'dobrou para 6 e o escudo de 4 segurou 4 (a prevenção vem depois)');
  assert.equal(T.descreveDano(regras[0]), 'se uma fonte que você controla fosse causar dano a um oponente, causa o dobro');
  assert.equal(T.descreveDano(regras[1]), 'se uma criatura que você controla fosse causar dano de combate, causa 1 a mais');
});

test('M-243 · R5d · a fonte sem as habilidades não substitui; validador', () => {
  let s = jogo({ lista: 'Pauper Boros Bully', oponente: 'Pauper Elves', seed: 4 }), fonte;
  [s, fonte] = poe(s, 0, 'Lunarch Veteran');
  s = comRegra(s, 'Lunarch Veteran', [{ fonte: 'self', soma: 2 }]);
  assert.equal(E.danoSubstituido(s, s.objects[fonte], { player: 1 }, 1, true), 3);
  const x = J(s); x.objects[fonte].faceDown = true;
  assert.equal(E.danoSubstituido(x, x.objects[fonte], { player: 1 }, 1, true), 1, 'virada para baixo não tem a habilidade');
  assert.ok(J(S.danoErros({ fonte: 'self' }, 'd')).some(e => /não muda nada/.test(e)));
  assert.ok(J(S.danoErros({ fonte: 'self', multiplica: 1 }, 'd')).some(e => /maior que 1/.test(e)));
  assert.ok(J(S.danoErros({ fonte: 'self', soma: 1, a: 'todos' }, 'd')).some(e => /"a" precisa/.test(e)));
  assert.ok(J(S.danoErros({ fonte: 'tudo', soma: 1 }, 'd')).some(e => /self ou um seletor/.test(e)));
});
