// M-575 · LT233 · o app mede a cobertura com o texto que o aparelho baixa da Scryfall. Em 23/10/2026 quatro cartas aprovadas com o texto do Forge tinham
// outra redação na Scryfall e apareciam no app como "Lida · em revisão" ou "Manual" — 97 das 517 listas Pauper do catálogo ficavam fora de 100%:
// Extract a Confession ("sacrifices a creature of their choice", 75 listas), Glimpse the Impossible (frases juntas e "Sacrifice this token", 17),
// Creosote Heath ("{T}: Add {G} or {W}.") e Lagonna-Band Trailblazer ("put a +1/+1 counter on it"). Os dados abaixo são da API da Scryfall de 23/10/2026
// (cards/search). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';
const { scripts: S, scryfall: SF } = loadModules();
const SCRYFALL = [
 {
  "name": "Extract a Confession",
  "mana_cost": "{1}{B}",
  "type_line": "Sorcery",
  "oracle_text": "As an additional cost to cast this spell, you may collect evidence 6. (Exile cards with total mana value 6 or greater from your graveyard.)\nEach opponent sacrifices a creature of their choice. If evidence was collected, instead each opponent sacrifices a creature with the greatest power among creatures they control.",
  "keywords": [
   "Collect evidence"
  ],
  "layout": "normal"
 },
 {
  "name": "Glimpse the Impossible",
  "mana_cost": "{2}{R}",
  "type_line": "Sorcery",
  "oracle_text": "Exile the top three cards of your library. You may play those cards this turn. At the beginning of the next end step, if any of those cards remain exiled, put them into your graveyard, then create a 0/1 colorless Eldrazi Spawn creature token for each card put into your graveyard this way. Those tokens have \"Sacrifice this token: Add {C}.\"",
  "keywords": [],
  "layout": "normal"
 },
 {
  "name": "Creosote Heath",
  "mana_cost": "",
  "type_line": "Land — Desert",
  "oracle_text": "This land enters tapped.\nWhen this land enters, it deals 1 damage to target opponent.\n{T}: Add {G} or {W}.",
  "keywords": [],
  "layout": "normal"
 },
 {
  "name": "Lagonna-Band Trailblazer",
  "mana_cost": "{W}",
  "type_line": "Creature — Centaur Scout",
  "oracle_text": "Heroic — Whenever you cast a spell that targets this creature, put a +1/+1 counter on it.",
  "keywords": [
   "Heroic"
  ],
  "layout": "normal",
  "power": "0",
  "toughness": "4"
 }
];
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;

test('M-575 · as quatro cartas, com o texto da Scryfall, jogam no app (lidas e aprovadas)', () => {
  for (const c of SCRYFALL) { const cv = S.coverage(SF.normalizeCard(c)); assert.equal(cv.level, 'completo', `${c.name}: ${cv.reason}`); }
});

test('M-575 · Glimpse the Impossible: com as frases juntas e "this token", o leitor chega ao mesmo script (exílio do topo + gatilho atrasado com as fichas)', () => {
  const c = SF.normalizeCard(SCRYFALL.find(x => x.name === 'Glimpse the Impossible'));
  const l = S.leitura(c); assert.ok(l && l.script, 'lido');
  assert.equal(l.script.effects.map(e => e.do).join(), 'exile_top_playable,delayed');
  const ficha = l.script.effects[1].effects[1].token; assert.equal(ficha.name, 'Eldrazi Spawn'); assert.equal(JSON.stringify(ficha.abilities[0].cost), '{"sacrifice":true}');
  const separado = S.leitura({ ...c, oracle_text: c.oracle_text.replace('this turn. At', 'this turn.\nAt').replace('this token', 'this creature') });
  assert.equal(JSON.stringify(l.script), JSON.stringify(separado.script));
});

test('M-575 · o texto guardado para a revisão é o da Scryfall (a aprovação vale para o que o aparelho baixa)', () => {
  for (const c of SCRYFALL) { const o = OF.find(x => x.name === c.name); assert.equal(o.oracle_text, c.oracle_text, c.name); assert.match(o.fonte, /^https:\/\/api\.scryfall\.com\//); }
});
