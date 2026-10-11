// LT7 · Revisão por lote (decisão A): carta sem script à mão que o leitor lê por inteiro fica "lida, em revisão" e não joga; depois da
// aprovação (nome + assinatura do texto em APROVADAS) ela joga pelo script lido; texto diferente do revisado volta para a revisão;
// script à mão sempre vence. Com APROVADAS vazia nada muda no motor (decisão 11 do dono).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';
import { S } from './listas.mjs'; // o mesmo motor dos helpers (um realm só: a aprovação vale para a partida)
import { candidatas, confere } from './.listas/leitor-revisar.mjs';


const c = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: 1, keywords: [], oracle_text: '', colors: [...new Set((mana_cost.match(/[WUBRG]/g) || []))], ...extra });
const FAISCA = c('Faísca de Teste', 'Instant', '{R}', { oracle_text: 'Faísca de Teste deals 3 damage to any target.' });
const J2 = x => JSON.parse(JSON.stringify(x)); // os objetos vêm do vm (outro realm): deepEqual compara pela forma
const aprova = (card, leva = 'teste') => { S.APROVADAS[card.name] = { texto: S.hashTexto(card.oracle_text), leva }; };
const desaprova = card => { delete S.APROVADAS[card.name]; };
function mesaX(a, cards) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 12, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards: { ...CARTAS, ...cards }, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Plains', 'Swamp']) }, { name: 'B', deck: baralho(['Island', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}

test('LT7 · sem aprovação: a carta lida por inteiro fica "lida, em revisão", a lista não joga e a partida não ganha script', () => {
  assert.ok(S.leitura(FAISCA), 'o leitor lê a carta por inteiro');
  const cv = S.coverage(FAISCA);
  assert.deepEqual(J2(cv), { level: 'lida', reason: 'lida pelo motor, em revisão' });
  const dc = S.deckCoverage([{ name: FAISCA.name, qty: 4, zone: 'main' }, { name: 'Mountain', qty: 20, zone: 'main' }], new Map([[FAISCA.name, FAISCA]]));
  assert.equal(dc.lida, 4); assert.equal(dc.pct, Math.round(20 / 24 * 100), 'lida não conta como completa: a lista não joga');
  assert.equal(S.COVERAGE_PT.lida, 'Lida · em revisão');
  const s = mesaX([FAISCA.name], { [FAISCA.name]: FAISCA });
  assert.equal(s.facts[FAISCA.name].script, null, 'sem aprovação a partida não usa o script lido');
});

test('LT7 · aprovada: cobertura completa e a partida joga pelo script lido (Faísca dá 3 de dano ao oponente)', () => {
  aprova(FAISCA);
  try {
    assert.deepEqual(J2(S.coverage(FAISCA)), { level: 'completo', reason: 'lida pelo motor e revisada' });
    assert.equal(S.scriptLido(FAISCA).lido, true);
    let s = mesaX([FAISCA.name], { [FAISCA.name]: FAISCA }), f;
    assert.deepEqual(JSON.parse(JSON.stringify(s.facts[FAISCA.name].script.effects)), [{ do: 'damage', amount: 3, target: 'any' }]);
    [s, f] = poe(s, 0, FAISCA.name, 'hand'); s = comMana(s, 'R');
    const v1 = s.players[1].life;
    const cast = legais(s, 0, a => a.t === 'cast' && a.oid === f && a.targets && a.targets[0].player === 1); assert.ok(cast.length, 'a mesa oferece conjurar mirando o oponente');
    s = tudo(act(act(act(s, cast[0]), { t: 'pass', p: 0 }), { t: 'pass', p: 1 }));
    assert.equal(v1 - s.players[1].life, 3);
  } finally { desaprova(FAISCA); }
});

test('LT7 · texto diferente do revisado volta para "em revisão"; script à mão vence o lido; registro vazio não muda nada', () => {
  aprova(FAISCA);
  try {
    const errata = { ...FAISCA, oracle_text: 'Faísca de Teste deals 2 damage to any target.' };
    assert.equal(S.coverage(errata).level, 'lida', 'assinatura diferente: a aprovação não vale para este texto');
    assert.equal(S.scriptLido(errata), null);
    assert.deepEqual(J2(S.coverage({ ...FAISCA, name: 'Lightning Bolt', oracle_text: 'Lightning Bolt deals 3 damage to any target.' })), { level: 'completo', reason: 'script validado' }, 'script à mão vence');
  } finally { desaprova(FAISCA); }
  assert.equal(S.coverage(c('Rabisco', 'Instant', '{U}', { oracle_text: 'The moon turns purple.' })).level, 'manual', 'não lida: segue manual');
  assert.deepEqual(confere(), [], 'toda aprovação registrada ainda casa com o texto guardado e é lida por inteiro');
  for (const f of candidatas()) assert.equal(S.coverage(f).level, 'lida', `${f.name}: candidata à revisão aparece como lida`);
});
