// M-574 · LT232 · achado da prova de partida do Pauper (23/10/2026): o texto Oracle do Forge imprime o nome da carta no custo do cemitério ("{1}{B}, Exile
// Wither and Bloom from your graveyard: …"), onde a Scryfall de 23/10/2026 diz "Exile this card from your graveyard". A assinatura da revisão trata as duas como
// o mesmo texto (o nome vira ~), então a carta contava como aprovada — e o leitor perdia a habilidade do cemitério. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const carta = (n, texto) => { const o = OF.find(x => x.name === n); return { name: n, type_line: o.type_line, mana_cost: o.mana_cost, keywords: o.keywords || [], oracle_text: texto ?? o.oracle_text }; };
const lido = c => { const l = S.leitura(c); assert.ok(l && l.aprovada && l.script, `${c.name}: o leitor não aprovou`); const { name, ...resto } = l.script; return resto; };

test('M-574 · Wither and Bloom: com o nome impresso no custo do cemitério, o mesmo script de "Exile this card"', () => {
  const forge = 'Target creature gets -3/-3 until end of turn.\n{1}{B}, Exile Wither and Bloom from your graveyard: Put a +1/+1 counter on target creature you control. Activate only as a sorcery.';
  const a = lido(carta('Wither and Bloom', forge)), b = lido(carta('Wither and Bloom'));
  assert.deepEqual(a, b);
  assert.ok(a.abilities?.[0]?.cost?.exileSelf && a.abilities[0].cost.fromGraveyard, 'ativa do cemitério, exilando-se');
  assert.equal(S.coverage(carta('Wither and Bloom', forge)).level, 'completo');
});

test('M-574 · Elven Farsight: a redação anterior ("If it\'s a creature card, draw a card") não é a revisada e continua em revisão', () => {
  // o texto atual da Scryfall diz "If a creature card is revealed this way" (errata que deixa claro que só compra revelando); a aprovação vale para ele
  const l = S.leitura(carta('Elven Farsight', "Scry 3, then you may reveal the top card of your library. If it's a creature card, draw a card."));
  assert.equal(!!(l && l.aprovada), false);
  assert.equal(lido(carta('Elven Farsight')).effects.map(e => e.do).join(), 'scry,revela_topo_compra');
});

test('M-574 · o nome impresso só vale para a própria carta (outro nome no custo não é "esta carta")', () => {
  const outro = 'Target creature gets -3/-3 until end of turn.\n{1}{B}, Exile Other Card from your graveyard: Put a +1/+1 counter on target creature you control. Activate only as a sorcery.';
  const l = S.leitura(carta('Wither and Bloom', outro));
  assert.ok(!(l && l.aprovada && l.script?.abilities?.some(a => a.cost?.exileSelf)), 'não lê como exilar a si mesma');
});
