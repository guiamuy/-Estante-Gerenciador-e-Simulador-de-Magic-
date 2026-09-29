// U10 · um bot só, o Shark: padrão, nome, e partidas antigas abrindo como Shark.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { CARDS, PAUPER_DECK } from './fixtures.mjs';
const { bot: B, table: T } = loadModules();

test('U10 · o bot padrão é o Shark; qualquer nível vindo da mesa vira o Shark', () => {
  assert.equal(B.NOME_DO_BOT, 'Shark');
  assert.equal(B.criaBot().nivel, 'profissional', 'sem nível: Shark');
  for (const n of ['amador', 'profissional', 'shark', undefined, 'qualquer']) assert.equal(B.nivelDaMesa(n), 'profissional', String(n));
  const shark = B.criaBot({ nivel: 'shark' });
  assert.equal(typeof shark.jogada, 'function');
});

for (const antigo of [['Bot amador', 'amador'], ['Bot profissional', 'profissional']]) {
  test(`U10 · partida salva contra "${antigo[0]}" continua, agora como Shark`, () => {
    const setup = T.buildSetup({ format: 'pauper', seed: 5, cards: CARDS,
      seats: [{ name: 'Você', deck: { entries: PAUPER_DECK } }, { name: antigo[0], deck: { entries: PAUPER_DECK } }], manaCheck: true, mode: 'full' });
    const velha = T.createTable(setup, { options: { autoPass: true, bot: { nivel: antigo[1], seat: 1 } } });
    const dados = JSON.parse(JSON.stringify(velha.serialize()));
    // simula o arquivo gravado por uma versão anterior: nome e nível antigos
    dados.setup.players[1].name = antigo[0]; dados.options.bot = { nivel: antigo[1], seat: 1 };
    const voltou = T.restoreTable(dados);
    assert.equal(voltou.state.players[1].name, 'Shark');
    assert.deepEqual(JSON.parse(JSON.stringify(voltou.serialize().options.bot)), { nivel: 'shark', seat: 1 });
  });
}

test('U10 · nome escolhido pela pessoa no jogo a dois não é trocado', () => {
  const setup = T.buildSetup({ format: 'pauper', seed: 5, cards: CARDS,
    seats: [{ name: 'Ana', deck: { entries: PAUPER_DECK } }, { name: 'Bot amador', deck: { entries: PAUPER_DECK } }], manaCheck: true, mode: 'assisted' });
  const mesa = T.createTable(setup, { options: { autoPass: true } });
  assert.equal(mesa.state.players[1].name, 'Bot amador', 'sem bot no assento, o nome é da pessoa');
});
