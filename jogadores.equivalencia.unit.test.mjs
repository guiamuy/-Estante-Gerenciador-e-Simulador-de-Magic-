// M-238 · CR2-G R4b · quantificador de jogadores (101.4): `jogadores: 'cada' | 'cada-oponente' | 'voce'` nos verbos de jogador
// (comprar, ganhar e perder vida, moer, dano, exilar o cemitério, criar ficha). Os nomes antigos "each-opponent", "each-player"
// e o "all" do exílio de cemitério viram atalhos. Este teste compara o estado pelo caminho antigo (applyEffect sem alvo, com o
// ramo próprio de cada verbo) e pelo quantificador (aplicaPorJogador), em estados de partidas aleatórias com as listas reais.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, S, T, J, act, decks, jogo, poe, conjura, resolve } from './listas.mjs';

const LISTAS = Object.keys(decks);
const ATALHOS = [{ do: 'damage', amount: 2, target: 'each-opponent' }, { do: 'lose', amount: 3, target: 'each-opponent' },
  { do: 'exile_graveyard', target: 'each-opponent' }, { do: 'exile_graveyard', target: 'all' }];

test('M-238 · R4b · "cada oponente" e "todos os cemitérios" pelo quantificador deixam o estado igual ao caminho antigo, em partidas aleatórias, com fonte mágica e fonte criatura (vínculo com a vida, prevenção por cor)', () => {
  let n = 0;
  LISTAS.forEach((lista, i) => {
    let s = jogo({ lista, oponente: LISTAS[(i + 1) % LISTAS.length], seed: 30 + i });
    const politica = E.randomPolicy(4243 + i);
    for (let k = 0; k < 160 && s.status !== 'over'; k++) {
      const a = politica(s); if (!a) break; s = act(s, a);
      if (k % 8) continue;
      const fontes = [{ oid: 'm', name: 'Mágica', controller: 0, ability: true, source: null }, { oid: 'm', name: 'Mágica', controller: 1, ability: true, source: null },
        ...s.zones.flatMap(z => z.battlefield).slice(0, 4).map(oid => s.objects[oid])];
      for (const eff of ATALHOS) for (const f of fontes) {
        const x1 = J(s), x2 = J(s), src1 = f.oid === 'm' ? f : x1.objects[f.oid], src2 = f.oid === 'm' ? f : x2.objects[f.oid];
        E.applyEffect(x1, src1, eff, null, []); E.aplicaPorJogador(x2, src2, eff, []);
        assert.deepEqual(J(x2), J(x1), `${lista} · ação ${k} · ${eff.do} ${eff.target} · fonte ${f.name}`); n++;
      }
    }
  });
  assert.ok(n > 1000, `amostra pequena (${n})`);
});

test('M-238 · R4b · correção: o registro de "cada oponente perde vida / sofre dano" nomeia o oponente (antes nomeava quem controlava a fonte)', () => {
  const s = jogo({ lista: 'Pauper Boros Bully', oponente: 'Pauper Elves', seed: 2 });
  for (const eff of [{ do: 'lose', amount: 1, target: 'each-opponent' }, { do: 'damage', amount: 1, target: 'each-opponent' }]) {
    const x = J(s), ev = [];
    E.aplicaPorJogador(x, { oid: 'z', name: 'Zulaport Cutthroat', controller: 0, ability: true, source: null }, eff, ev);
    assert.equal(ev.length, 1);
    assert.equal(ev[0].target, s.players[1].name, `${eff.do}: o alvo do registro é o oponente`);
    assert.equal(x.players[1].life, s.players[1].life - 1); assert.equal(x.players[0].life, s.players[0].life);
  }
});

test('M-238 · R4b · quantificador escrito como dado na partida: "cada jogador compra uma carta" e "cada oponente põe duas cartas do grimório no cemitério"', () => {
  let s = jogo({ lista: 'Pauper Boros Bully', oponente: 'Pauper Elves', seed: 3, terrenos: ['Mountain'] }), bolt;
  [s, bolt] = poe(s, 0, 'Lightning Bolt', 'hand'); s = J(s);
  const efeitos = [{ do: 'draw', amount: 1, jogadores: 'cada' }, { do: 'mill', amount: 2, jogadores: 'cada-oponente' }];
  assert.deepEqual(J(S.validateScript({ name: 'Teste', effects: efeitos })).filter(e => !/cenário/.test(e)), []);
  s.facts['Lightning Bolt'] = { ...s.facts['Lightning Bolt'], script: { name: 'Lightning Bolt', effects: efeitos } };
  const maos = [s.zones[0].hand.length - 1, s.zones[1].hand.length], cemiterio = s.zones[1].graveyard.length, meuCem = s.zones[0].graveyard.length;
  s = resolve(conjura(s, 0, bolt));
  assert.equal(s.zones[0].hand.length, maos[0] + 1, 'você comprou'); assert.equal(s.zones[1].hand.length, maos[1] + 1, 'o oponente comprou');
  assert.equal(s.zones[1].graveyard.length, cemiterio + 2, 'o oponente moeu 2');
  assert.equal(s.zones[0].graveyard.length, meuCem + 1, 'você não moeu (só a mágica foi para o cemitério)');
  assert.equal(T.descreveEfeitos(efeitos), 'cada jogador compra 1 carta; cada oponente põe 2 cartas do grimório no cemitério');
});

test('M-238 · R4b · validador e português do quantificador', () => {
  const erros = e => J(S.validateScript({ name: 'Teste', effects: [e] })).filter(x => !/cenário/.test(x));
  assert.ok(erros({ do: 'draw', amount: 1, jogadores: 'todos' }).some(x => /cada, cada-oponente ou voce/.test(x)));
  assert.ok(erros({ do: 'destroy', jogadores: 'cada' }).some(x => /só vale para/.test(x)));
  assert.ok(erros({ do: 'draw', amount: 1, jogadores: 'cada', target: 'player' }).some(x => /não se junta a alvo/.test(x)));
  assert.equal(S.jogadoresDe({ do: 'lose', target: 'each-opponent' }), 'cada-oponente');
  assert.equal(S.jogadoresDe({ do: 'exile_graveyard', target: 'all' }), 'cada');
  assert.equal(S.jogadoresDe({ do: 'discard', target: 'each-opponent' }), null, 'descarte (com escolha) fica fora por enquanto');
  assert.equal(T.descreveEfeitos([{ do: 'damage', amount: 1, jogadores: 'cada' }]), 'causa 1 de dano a cada jogador');
  assert.equal(T.descreveEfeitos([{ do: 'gain', amount: 2, jogadores: 'voce' }]), 'você ganha 2 de vida');
  assert.equal(T.descreveEfeitos([{ do: 'exile_graveyard', jogadores: 'cada-oponente' }]), 'exila o cemitério de cada oponente');
});
