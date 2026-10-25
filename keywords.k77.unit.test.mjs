// K-77 · CR 700.2d · mágica modal de mais de um modo, lida pelo leitor: "Choose two —", "Choose three —", "Choose one or both —" e
// "Choose one or more —" viram `modeCount` / `modeMin` (o motor já resolve, T-104). Kolaghan's Command (Scryfall, 25/10/2026) e
// Avengers Disassembled (Oracle do Forge, 25/10/2026) em .listas/oficiais-keywords.json. Antes, a linha "Choose two —" não tinha padrão.
// Escalar, entrelaçar, spree e escalonado têm leitura própria e ficam de fora. A aprovação (APROVADAS) é da homologação.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, J, act, poe, legais, passaAte } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-keywords.json', import.meta.url), 'utf8')).cartas;
const cor = m => [...new Set(String(m).match(/[WUBRG]/g) || [])];
const of = n => { const c = OF.find(x => x.name === n); assert.ok(c, 'sem texto oficial: ' + n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: 3, keywords: [], oracle_text: c.oracle_text, colors: cor(c.mana_cost) }; };
const sint = (oracle, tipo = 'Instant') => ({ name: 'Teste Modal', type_line: tipo, mana_cost: '{2}{R}', cmc: 3, keywords: [], oracle_text: oracle, colors: ['R'] });

test('K-77 · 700.2d · Kolaghan\'s Command: "Choose two —" com quatro modos vira modeCount 2', () => {
  const l = S.leitura(of("Kolaghan's Command")); assert.ok(l, 'leitura completa'); assert.equal(l.aprovada, false); assert.equal(S.coverage(of("Kolaghan's Command")).level, 'lida');
  assert.equal(l.script.modeCount, 2); assert.equal(l.script.modeMin, undefined); assert.equal(l.script.modes.length, 4);
});

test('K-77 · 700.2d · Avengers Disassembled: "Choose one or both —" vira modeCount 2 e modeMin 1', () => {
  // H-20 · a aprovação é da homologação: aprovada se e só se está em APROVADAS (lote 3 da revisão em lote dos competitivos)
  const l = S.leitura(of('Avengers Disassembled')); assert.ok(l, 'leitura completa'); assert.equal(S.coverage(of('Avengers Disassembled')).level, S.APROVADAS['Avengers Disassembled'] ? 'completo' : 'lida');
  assert.deepEqual([l.script.modeCount, l.script.modeMin, l.script.modes.length], [2, 1, 2]);
});

test('K-77 · "one or more" conta os modos; "Choose three" pede mais modos que a escolha; escalar/entrelaçar ficam de fora', () => {
  const tres = '• Draw a card.\n• You gain 3 life.\n• Teste Modal deals 2 damage to any target.';
  const om = S.leitura(sint('Choose one or more —\n' + tres)); assert.ok(om); assert.deepEqual([om.script.modeCount, om.script.modeMin, om.script.modes.length], [3, 1, 3]);
  assert.equal(S.leitura(sint('Choose three —\n' + tres)), null, 'três de três modos não é modal de verdade');
  const t4 = S.leitura(sint('Choose three —\n' + tres + '\n• Scry 2.')); assert.ok(t4); assert.equal(t4.script.modeCount, 3);
  assert.equal(S.leitura(sint('Choose one or both —\n' + tres)), null, '"one or both" é de dois modos');
  assert.equal(S.leitura(sint('Entwine {2}\nChoose two —\n' + tres)), null, 'entrelaçar tem leitura própria');
  assert.equal(S.leitura(sint('Escalate {1}\nChoose one or more —\n' + tres)), null, 'escalar tem leitura própria');
});

const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
test('K-77 · Kolaghan\'s Command na mesa: escolhe dois modos diferentes; o oponente descarta e leva 2', () => {
  const C = { "Kolaghan's Command": of("Kolaghan's Command"), Swamp: terra('Swamp', 'Swamp', 'B'), Mountain: terra('Mountain', 'Mountain', 'R') };
  const scripts = { "Kolaghan's Command": { ...S.leitura(C["Kolaghan's Command"]).script, lido: true, example: { action: 'etb', target: 'none', expect: { attached: false } } } };
  const b = ns => ns.map(name => ({ name, qty: 10, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 77, mode: 'full', cards: C, scripts, first: 0, players: [{ name: 'A', deck: b(["Kolaghan's Command", 'Swamp', 'Mountain']) }, { name: 'B', deck: b(['Swamp', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  let kc; [s, kc] = poe(s, 0, "Kolaghan's Command", 'hand'); for (const n of ['Swamp', 'Mountain', 'Mountain']) [s] = poe(s, 0, n);
  const ofertas = legais(s, 0, x => x.t === 'cast' && x.oid === kc);
  assert.ok(ofertas.length && ofertas.every(x => Array.isArray(x.modes) && x.modes.length === 2 && x.modes[0] !== x.modes[1]), 'sempre dois modos diferentes');
  const a = ofertas.find(x => x.modes[0] === 1 && x.modes[1] === 3 && x.targets.length === 2 && x.targets.every(t => t.player === 1)); assert.ok(a, 'descarte + 2 de dano no oponente');
  const mao = s.zones[1].hand.length, vida = s.players[1].life;
  s = act(s, a); assert.equal(s.stack.length, 1, 'na pilha');
  s = passaAte(s, x => !x.stack.length || !!x.pending);
  if (s.pending) { const d = legais(s, s.pending.p)[0]; assert.ok(d, 'decisão do descarte: ' + s.pending.kind); s = passaAte(act(s, d), x => !x.stack.length && !x.pending); }
  assert.equal(s.players[1].life, vida - 2); assert.equal(s.zones[1].hand.length, mao - 1);
});
