// H-1 · a conversão do Oracle do Forge para a forma da Scryfall que a prova de partida do catálogo usa (catalogo.prova.mjs).
// Se a conversão errar custo, tipo ou face, a cobertura medida pela prova deixa de ser a mesma que o app mede.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { custoDoForge, valorDeMana, linhaDeTipo, cartaDoForge, joga, jogaShark } from './catalogo.prova.mjs';
import { loadModules } from './_load.mjs';
const { scryfall: SF, scripts: S, starter: ST, decks: D } = loadModules();

test('H-1 · custo do Forge vira o custo da Scryfall: genérico, híbrido, phyrexiano, {2/R}, sem custo', () => {
  assert.equal(custoDoForge('1 GW GW'), '{1}{G/W}{G/W}');
  assert.equal(custoDoForge('X R R'), '{X}{R}{R}');
  assert.equal(custoDoForge('BP'), '{B/P}');
  assert.equal(custoDoForge('2R 2R'), '{2/R}{2/R}');
  assert.equal(custoDoForge('C'), '{C}');
  assert.equal(custoDoForge('no cost'), '');
  assert.equal(valorDeMana('{1}{G/W}{G/W}'), 3);
  assert.equal(valorDeMana('{X}{R}{R}'), 2);
  assert.equal(valorDeMana('{2/R}{2/R}'), 4);
});

test('H-1 · linha de tipo: supertipos e tipos antes do travessão, subtipos depois', () => {
  assert.equal(linhaDeTipo('Legendary Creature Human Wizard'), 'Legendary Creature — Human Wizard');
  assert.equal(linhaDeTipo('Basic Land Island'), 'Basic Land — Island');
  assert.equal(linhaDeTipo('Artifact Creature Golem'), 'Artifact Creature — Golem');
  assert.equal(linhaDeTipo('Instant'), 'Instant');
  assert.equal(linhaDeTipo('Kindred Instant Elf'), 'Kindred Instant — Elf');
});

test('H-1 · carta de uma face: texto, P/T, palavra-chave só quando o texto a escreve, e a normalização do app', () => {
  const cru = cartaDoForge('Name:Kitchen Finks\nManaCost:1 GW GW\nTypes:Creature Ouphe\nPT:3/2\nK:Persist\nK:etbCounter:P1P1:1\nOracle:When Kitchen Finks enters, you gain 2 life.\\nPersist (When this creature dies, return it.)\n');
  assert.deepEqual([cru.name, cru.mana_cost, cru.cmc, cru.type_line, cru.power, cru.toughness], ['Kitchen Finks', '{1}{G/W}{G/W}', 3, 'Creature — Ouphe', '3', '2']);
  assert.deepEqual(cru.keywords, ['Persist'], 'K:etbCounter é regra interna do Forge, não palavra-chave impressa');
  assert.equal(cru.oracle_text, 'When Kitchen Finks enters, you gain 2 life.\nPersist (When this creature dies, return it.)');
  assert.deepEqual(cru.colors.slice().sort().join(), 'G,W');
  const c = SF.normalizeCard(cru);
  assert.equal(c.name, 'Kitchen Finks');
  assert.equal(c.layout, 'normal');
});

test('H-1 · dupla face vira "Frente // Verso" com as duas faces; dividida soma o valor de mana das metades', () => {
  const delver = cartaDoForge('Name:Delver of Secrets\nManaCost:U\nTypes:Creature Human Wizard\nPT:1/1\nAlternateMode:DoubleFaced\nOracle:At the beginning of your upkeep, look at the top card of your library.\n\nALTERNATE\n\nName:Insectile Aberration\nManaCost:no cost\nColors:blue\nTypes:Creature Human Insect\nPT:3/2\nK:Flying\nOracle:Flying\n');
  assert.equal(delver.name, 'Delver of Secrets // Insectile Aberration');
  assert.equal(delver.layout, 'transform');
  assert.equal(delver.card_faces.length, 2);
  assert.deepEqual(delver.card_faces[1].colors, ['U'], 'cor do verso pelo indicador');
  const n = SF.normalizeCard(delver);
  assert.equal(n.mana_cost, '{U}');
  assert.equal(n.power, '1');
  const fogo = cartaDoForge('Name:Fire\nManaCost:1 R\nTypes:Instant\nAlternateMode:Split\nOracle:Fire deals 2 damage divided as you choose among one or two targets.\n\nALTERNATE\n\nName:Ice\nManaCost:1 U\nTypes:Instant\nOracle:Tap target permanent.\\nDraw a card.\n');
  assert.deepEqual([fogo.name, fogo.mana_cost, fogo.cmc, fogo.layout], ['Fire // Ice', '{1}{R} // {1}{U}', 4, 'split']);
});

test('H-1 · a partida da prova anda: duas listas do acervo cobertas jogam turnos no modo completo sem falha', async () => {
  const { CARDS } = await import('./listas.mjs'); // texto conferido das listas do acervo (.listas/oficiais.json)
  const lista = n => D.parseDeckText(ST.STARTER_DECKS.find(d => d.name === n).text).entries.filter(e => e.zone !== 'side');
  const A = lista('Pauper Mono Blue Faeries'), B = lista('Pauper Boros Bully');
  const cards = Object.fromEntries([...A, ...B].map(e => [e.name, CARDS[e.name]]));
  assert.ok(Object.values(cards).every(Boolean), 'todas as cartas das duas listas têm dados');
  assert.equal(S.deckCoverage(A, cards).pct, 100);
  const r = joga({ format: 'pauper', seed: 7, mode: 'full', manaCheck: true, cards, players: [{ name: 'A', deck: A }, { name: 'B', deck: B }] });
  assert.equal(r.erro, undefined, `${r.erro}: ${r.mensagem}`);
  assert.ok(r.turnos >= 3, `a partida passou de três turnos (${r.turnos})`);
});

test('H-3 · a prova conta, por carta, quando ela podia ser paga na fase principal e quando foi oferecida', async () => {
  const { CARDS } = await import('./listas.mjs');
  const lista = n => D.parseDeckText(ST.STARTER_DECKS.find(d => d.name === n).text).entries.filter(e => e.zone !== 'side');
  const A = lista('Pauper Mono Blue Faeries'), B = lista('Pauper Boros Bully');
  const cards = Object.fromEntries([...A, ...B].map(e => [e.name, CARDS[e.name]]));
  const obs = new Map();
  const r = joga({ format: 'pauper', seed: 11, mode: 'full', manaCheck: true, cards, players: [{ name: 'A', deck: A }, { name: 'B', deck: B }] }, false, obs);
  assert.equal(r.erro, undefined, `${r.erro}: ${r.mensagem}`);
  const podia = [...obs.values()].reduce((n, o) => n + o.podia, 0), ofertas = [...obs.values()].reduce((n, o) => n + o.oferecida, 0);
  assert.ok(podia > 0 && ofertas > 0, `observou podia (${podia}) e oferecida (${ofertas})`);
  assert.ok(![...obs.keys()].some(n => /^(Island|Mountain|Plains)$/.test(n) && obs.get(n).podia), 'terreno não entra na conta de "podia pagar"');
  for (const [n, o] of obs) if (o.podia >= 3) assert.ok(o.oferecida > 0, `${n}: podia ${o.podia} vezes e nunca foi oferecida (as listas do acervo jogam inteiras)`);
});

test('H-3 · Shark × Shark com duas listas do acervo: o motor aceita toda jogada do Shark e as invariantes valem', async () => {
  const { CARDS } = await import('./listas.mjs');
  const lista = n => D.parseDeckText(ST.STARTER_DECKS.find(d => d.name === n).text).entries.filter(e => e.zone !== 'side');
  const A = lista('Pauper GW Bogles'), B = lista('Pauper Rakdos Madness');
  const cards = Object.fromEntries([...A, ...B].map(e => [e.name, CARDS[e.name]]));
  const r = jogaShark({ format: 'pauper', seed: 5, mode: 'full', manaCheck: true, cards, players: [{ name: 'A', deck: A }, { name: 'B', deck: B }] }, 150);
  assert.equal(r.erro, undefined, `${r.erro}: ${r.mensagem}`);
  assert.ok(r.turnos >= 2, `a partida andou (${r.turnos} turnos, ${r.acoes} ações)`);
});
