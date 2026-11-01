// M-589 · leitor e núcleo, competitivos na ordem gulosa da sentinela (texto da Scryfall de 25/10/2026 em cobertura/resumo.json):
// "Activated abilities of artifacts can't be activated." (Null Rod, Stony Silence) e "Activated abilities of artifacts your opponents
// control can't be activated." (Karn, the Great Creator, que segue parcial pelas outras frases). CR 602.5: a habilidade não pode ser
// ativada; 605.1a: habilidade de mana continua sendo ativada, então a pedra de mana também para (e o pagamento automático não a usa);
// tripular também é habilidade ativada. Só artefato no campo. Cartas de teste com nomes inventados; a aprovação das cartas do catálogo
// é da homologacao. Falha no motor anterior (frase sem leitura e sem trava no núcleo).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, act, poe, legais, passaAte, limpaMao } from './listas.mjs';
import { loadModules } from './_load.mjs';
const L = loadModules().leitor;
const C = {
  Vara: { name: 'Vara', mana_cost: '{2}', cmc: 2, type_line: 'Artifact', oracle_text: "Activated abilities of artifacts can't be activated.", keywords: [], colors: [] },
  Grande: { name: 'Grande', mana_cost: '{4}', cmc: 4, type_line: 'Enchantment', oracle_text: "Activated abilities of artifacts your opponents control can't be activated.", keywords: [], colors: [] },
  Pedra: { name: 'Pedra', mana_cost: '{1}', cmc: 1, type_line: 'Artifact', oracle_text: '{T}: Add {G}.', keywords: [], colors: [] },
  Cofre: { name: 'Cofre', mana_cost: '{1}', cmc: 1, type_line: 'Artifact', oracle_text: '{1}, {T}: Draw a card.', keywords: [], colors: [] },
  Urso: { name: 'Urso', mana_cost: '{G}', cmc: 1, type_line: 'Creature — Bear', oracle_text: '', power: '2', toughness: '2', keywords: [], colors: ['G'] },
  Wastes: { name: 'Wastes', type_line: 'Basic Land', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {C}.)', colors: [] },
};
const ex = { example: { target: 'none', expect: { selfLife: 0 } } };
const lido = n => { const r = L.ler(C[n]); assert.ok(r && r.completa, `${n} lida por inteiro`); return { ...r.script, ...ex }; };
const SC = { Vara: lido('Vara'), Grande: lido('Grande'), Pedra: { name: 'Pedra', produces: [['G']], ...ex }, Cofre: { name: 'Cofre', abilities: [{ kind: 'activated', cost: { mana: '{1}', tap: true }, effects: [{ do: 'draw', amount: 1 }] }], ...ex }, Urso: { name: 'Urso', ...ex } };
function mesa(seed = 270) {
  const d = xs => xs.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  const deck = d([['Vara', 2], ['Grande', 2], ['Pedra', 4], ['Cofre', 4], ['Urso', 4], ['Wastes', 24]]);
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SC, first: 0, players: [{ name: 'A', deck }, { name: 'B', deck: deck.map(x => ({ ...x })) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = limpaMao(s, 0); let u, pe, co, w; [s, u] = poe(s, 0, 'Urso', 'hand'); [s, pe] = poe(s, 0, 'Pedra'); [s, co] = poe(s, 0, 'Cofre'); [s, w] = poe(s, 0, 'Wastes');
  return { s, u, pe, co };
}
const ativa = (s, oid) => legais(s, 0, x => x.oid === oid && ['activate', 'tap_mana'].includes(x.t)).length > 0;
const conjuraUrso = (s, u) => legais(s, 0, x => x.t === 'cast' && x.oid === u).length > 0;

test('M-589 · leitura: as duas frases viram a trava estática', () => {
  assert.equal(JSON.stringify(SC.Vara.self), JSON.stringify({ travaAtivadasDeArtefato: 'todos' }));
  assert.equal(JSON.stringify(SC.Grande.self), JSON.stringify({ travaAtivadasDeArtefato: 'oponentes' }));
  assert.equal(loadModules().scripts.validateScript({ name: 'X', self: { travaAtivadasDeArtefato: 'alguns' }, ...ex }).length > 0, true, 'o validador recusa valor desconhecido');
});

test('M-589 · sem a trava: a pedra paga o Urso e o cofre ativa', () => {
  const { s, u, pe, co } = mesa();
  assert.ok(ativa(s, pe) && ativa(s, co)); assert.ok(conjuraUrso(s, u), 'a pedra paga o {G}');
});

test('M-589 · 602.5/605.1a: com a Vara de qualquer lado, nenhum artefato ativa, nem a de mana; o pagamento não usa a pedra', () => {
  for (const lado of [0, 1]) {
    let { s, u, pe, co } = mesa(); let v; [s, v] = poe(s, lado, 'Vara');
    assert.ok(!ativa(s, pe), 'a pedra não vira para mana'); assert.ok(!ativa(s, co), 'o cofre não ativa');
    assert.ok(!conjuraUrso(s, u), 'sem a pedra não há {G}');
    assert.throws(() => act(s, { t: 'tap_mana', p: 0, oid: pe }), /travada|não pode|ilegal/i, 'a ação direta é recusada');
  }
});

test('M-589 · "your opponents control": a Grande trava só os artefatos do oponente', () => {
  let { s, u, pe, co } = mesa(); let g; [s, g] = poe(s, 0, 'Grande');
  assert.ok(ativa(s, pe) && ativa(s, co) && conjuraUrso(s, u), 'os seus artefatos seguem ativando');
  let { s: s2, u: u2, pe: pe2 } = mesa(); [s2] = poe(s2, 1, 'Grande');
  assert.ok(!ativa(s2, pe2) && !conjuraUrso(s2, u2), 'a Grande do oponente trava os seus');
});
