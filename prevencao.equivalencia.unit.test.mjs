// M-241 · CR2-G R5b · prevenção de dano num caminho só (615): danoAposPrevencao(fonte, alvo, quanto, combate) junta a cor
// prevenida, "todo dano que seria causado a ela", a proteção e os escudos novos do verbo `prevenir` (todo o dano ou os
// próximos N, de uma cor, só de combate). Este teste compara com o caminho antigo (sim/não) em estados de partidas aleatórias.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, S, T, J, act, decks, jogo, poe, passaAte, conjura, resolve } from './listas.mjs';

const LISTAS = Object.keys(decks);
const CORES = ['W', 'U', 'B', 'R', 'G'];

function compara(s, rotulo) {
  let n = 0;
  const fontes = [...s.zones.flatMap(z => z.battlefield), ...s.stack].map(oid => s.objects[oid]).filter(Boolean);
  const alvos = [...s.zones.flatMap(z => z.battlefield).map(oid => ({ obj: s.objects[oid] })), { player: 0 }, { player: 1 }];
  for (const src of fontes) for (const alvo of alvos) for (const combate of [false, true]) {
    const novo = E.danoAposPrevencao(s, src, alvo, 3, combate), velho = E.prevencaoLegado(s, src, alvo.obj || null) ? 0 : 3;
    assert.equal(novo, velho, `${rotulo} · ${src.name} → ${alvo.obj ? alvo.obj.name : 'jogador ' + alvo.player}${combate ? ' (combate)' : ''}`); n++;
  }
  return n;
}

test('M-241 · R5b · prevenção pelo caminho único e pelo antigo: o mesmo para cada fonte, alvo e tipo de dano, em partidas aleatórias, com cores prevenidas, "a prevenção não se aplica", prevenção na criatura e proteção temporária sorteadas', () => {
  let n = 0;
  LISTAS.forEach((lista, i) => {
    let s = jogo({ lista, oponente: LISTAS[(i + 2) % LISTAS.length], seed: 60 + i });
    const politica = E.randomPolicy(9001 + i);
    for (let k = 0; k < 160 && s.status !== 'over'; k++) {
      const a = politica(s); if (!a) break; s = act(s, a);
      if (k % 12) continue;
      n += compara(s, `${lista} · ${k}`);
      const x = J(s), bf = x.zones.flatMap(z => z.battlefield);
      x.preventedColors = [CORES[k % 5]];
      if (bf[0]) x.objects[bf[0]].prevenirDano = true;
      if (bf[1]) x.objects[bf[1]].tempProtection = [CORES[(k + 2) % 5]];
      n += compara(x, `${lista} · ${k} · com escudos`);
      x.noPrevention = true; n += compara(x, `${lista} · ${k} · sem prevenção`);
    }
  });
  assert.ok(n > 10000, `amostra pequena (${n})`);
});

test('M-241 · R5b · a comparação pega divergência: um escudo do verbo novo só o caminho único vê', () => {
  let s = jogo({ lista: 'Pauper Boros Bully', oponente: 'Pauper Elves', seed: 1 });
  [s] = poe(s, 0, 'Kor Skyfisher'); [s] = poe(s, 1, 'Llanowar Elves');
  const x = J(s); x.prevencoes = [{ todos: true }];
  assert.throws(() => compara(x, 'com escudo'));
});

test('M-241 · R5b · verbo "prevenir" na partida: "previna os próximos 3 de dano que seria causado à criatura alvo" segura um Lightning Bolt inteiro e só uma parte do segundo; acaba no fim do turno', () => {
  let s = jogo({ lista: 'Pauper Boros Bully', oponente: 'Pauper Elves', seed: 2, terrenos: ['Mountain', 'Mountain', 'Plains'] }), kor, b1, b2, cura;
  [s, kor] = poe(s, 0, 'Kor Skyfisher'); [s, b1] = poe(s, 0, 'Lightning Bolt', 'hand'); [s, cura] = poe(s, 0, 'Prismatic Strands', 'hand');
  s = J(s);
  const escudo = { do: 'prevenir', target: 'creature', quantidade: 4 };
  assert.deepEqual(J(S.validateScript({ name: 'Teste', effects: [escudo] })).filter(e => !/cenário/.test(e)), []);
  E.applyEffect(s, { oid: 'h', name: 'Escudo', controller: 0, ability: true, source: null }, escudo, { oid: kor }, []);
  assert.equal(s.prevencoes.length, 1);
  s = resolve(conjura(s, 0, b1, x => (x.targets || []).some(t => t.oid === kor)));
  assert.equal(s.objects[kor].damage, 0, 'os 3 do raio foram prevenidos');
  assert.equal(s.prevencoes[0].quantidade, 1, 'sobra 1 no escudo');
  const ev = []; E.applyEffect(s, s.objects[b1], { do: 'damage', amount: 2, target: 'creature' }, { oid: kor }, ev);
  assert.equal(s.objects[kor].damage, 1, 'do segundo, 1 foi prevenido e 1 passou');
  assert.equal(T.descreveEfeitos([escudo]), 'previne os próximos 4 de dano que seria causado a uma criatura neste turno');
  s = passaAte(s, x => x.turn.active === 1);
  assert.equal(s.prevencoes, undefined, 'o escudo acaba na limpeza');
});

test('M-241 · R5b · escudos de cor, só de combate e de jogador; "a prevenção não se aplica" fura tudo; validador', () => {
  const s = jogo({ lista: 'Pauper Boros Bully', oponente: 'Pauper Elves', seed: 3 });
  const x = J(s), vermelho = Object.values(x.objects).find(o => o.name === 'Lightning Bolt'), branco = Object.values(x.objects).find(o => o.name === 'Kor Skyfisher');
  x.prevencoes = [{ alvo: { player: 0 }, cor: 'R' }, { alvo: { player: 1 }, combate: true }];
  assert.equal(E.danoAposPrevencao(x, vermelho, { player: 0 }, 3, false), 0, 'fonte vermelha a você: prevenido');
  assert.equal(E.danoAposPrevencao(x, branco, { player: 0 }, 3, false), 3, 'fonte branca passa');
  assert.equal(E.danoAposPrevencao(x, vermelho, { player: 1 }, 3, false), 3, 'escudo só de combate não segura dano de mágica');
  assert.equal(E.danoAposPrevencao(x, branco, { player: 1 }, 3, true), 0, 'segura o de combate');
  x.noPrevention = true; assert.equal(E.danoAposPrevencao(x, vermelho, { player: 0 }, 3, false), 3, '615.12');
  const erros = e => J(S.validateScript({ name: 'Teste', effects: [{ do: 'prevenir', ...e }] })).filter(m => !/cenário/.test(m));
  assert.ok(erros({}).some(m => /precisa dizer a quem/.test(m)));
  assert.ok(erros({ target: 'creature', quantidade: 0 }).some(m => /inteiro positivo/.test(m)));
  assert.ok(erros({ todos: true, deCor: 'X' }).some(m => /WUBRG/.test(m)));
  assert.deepEqual(erros({ jogadores: 'voce', deCor: 'R' }), []);
  assert.equal(T.descreveEfeitos([{ do: 'prevenir', jogadores: 'voce', deCor: 'R' }]), 'previne todo o dano de fontes vermelhas que seria causado a você neste turno');
});
