// M-600 · leitor e núcleo, competitivos na ordem gulosa da sentinela (texto da Scryfall de 01/11/2026 em cobertura/<formato>.json):
// "Create two 1/1 colorless Spirit creature tokens. They gain haste until end of turn." (Sokenzan, Crucible of Defiance; 611.2a: as fichas
// criadas ganham ímpeto até o fim do turno, não a lista de fichas para sempre) e "double the power of target creature you control until
// end of turn" (Mightform Harmonizer; 701.10e: a criatura ganha +X/+0, X = o poder dela na resolução). Cartas de teste com nomes
// inventados; a aprovação das cartas do catálogo é da homologacao. Falha no motor anterior (as duas frases ficavam sem leitura).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, act, poe, legais, passaAte, limpaMao } from './listas.mjs';
import { loadModules } from './_load.mjs';
const L = loadModules().leitor;
const C = {
  Vulcao: { name: 'Vulcao', mana_cost: '', cmc: 0, type_line: 'Legendary Land', oracle_text: '{T}: Add {R}.\nChannel — {3}{R}, Discard this card: Create two 1/1 colorless Spirit creature tokens. They gain haste until end of turn. This ability costs {1} less to activate for each legendary creature you control.', keywords: [], colors: [] },
  Harmonia: { name: 'Harmonia', mana_cost: '{3}{G}{G}', cmc: 5, type_line: 'Creature — Elf Druid', oracle_text: 'Landfall — Whenever a land you control enters, double the power of target creature you control until end of turn.', power: '2', toughness: '2', keywords: ['Landfall'], colors: ['G'] },
  Urso: { name: 'Urso', mana_cost: '{1}{G}', cmc: 2, type_line: 'Creature — Bear', oracle_text: '', power: '3', toughness: '2', keywords: [], colors: ['G'] },
  Mountain: { name: 'Mountain', type_line: 'Basic Land — Mountain', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {R}.)', colors: [] },
  Forest: { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {G}.)', colors: [] },
};
const ex = { example: { target: 'none', expect: { selfLife: 0 } } };
const lido = n => { const r = L.ler(C[n]); assert.ok(r && r.completa, `${n} lida por inteiro`); return { ...r.script, ...ex }; };
const SC = { Vulcao: lido('Vulcao'), Harmonia: lido('Harmonia'), Urso: { name: 'Urso', ...ex } };
function mesa(seed = 281) {
  const d = xs => xs.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SC, first: 0, players: [{ name: 'A', deck: d([['Vulcao', 2], ['Harmonia', 2], ['Urso', 4], ['Mountain', 16], ['Forest', 16]]) }, { name: 'B', deck: d([['Forest', 40]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  return limpaMao(s, 0);
}
const resolve = s => { for (let i = 0; i < 40 && (s.stack.length || s.pending); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority }); return s; };

test('M-600 · leitura: fichas com ímpeto até o fim do turno; dobrar o poder', () => {
  const e = SC.Vulcao.abilities[0].effects; assert.equal(e.length, 1); assert.equal(e[0].do, 'token'); assert.equal(e[0].amount, 2);
  assert.equal(JSON.stringify(e[0].palavrasAteFimDoTurno), JSON.stringify(['haste']));
  assert.equal(JSON.stringify(SC.Harmonia.abilities[0].effects), JSON.stringify([{ do: 'pump', power: 0, toughness: 0, dobraPoder: true, target: 'creature-you-control' }]));
  const V = loadModules().scripts.validateScript; assert.equal(V(SC.Vulcao).length + V(SC.Harmonia).length, 0);
  assert.ok(V({ name: 'X', effects: [{ do: 'draw', amount: 1, dobraPoder: true }], ...ex }).length > 0, 'dobraPoder fora do pump é recusado');
});

test('M-600 · 611.2a: as duas fichas entram com ímpeto e o perdem no turno seguinte', () => {
  let s = mesa(), v; [s, v] = poe(s, 0, 'Vulcao', 'hand'); for (let i = 0; i < 4; i++) [s] = poe(s, 0, 'Mountain');
  s = resolve(act(s, legais(s, 0, a => a.oid === v && a.t === 'activate')[0]));
  const fichas = s.zones[0].battlefield.filter(o => s.objects[o].token); assert.equal(fichas.length, 2);
  assert.ok(fichas.every(o => E.hasKeyword(s, s.objects[o], 'haste')), 'com ímpeto');
  s = passaAte(s, x => x.turn.active === 0 && x.turn.number > 2 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  assert.ok(fichas.every(o => !E.hasKeyword(s, s.objects[o], 'haste')), 'no turno seguinte, sem ímpeto');
});

test('M-600 · 701.10e: terreno entra e o Urso de poder 3 vai a 6 até o fim do turno', () => {
  let s = mesa(), u, f; [s] = poe(s, 0, 'Harmonia'); [s, u] = poe(s, 0, 'Urso'); [s, f] = poe(s, 0, 'Forest', 'hand');
  s = act(s, { t: 'play_land', p: 0, oid: f });
  for (let i = 0; i < 20 && (s.stack.length || s.pending); i++) { if (s.pending) { const pd = s.pending, op = legais(s, pd.p); const i = pd.kind === 'pick_target' ? (pd.options || []).findIndex(o => o.oid === u) : -1; s = act(s, i >= 0 ? op.find(x => x.index === i) : (op.find(x => JSON.stringify(x).includes(`"${u}"`)) || op[0])); } else s = act(s, { t: 'pass', p: s.turn.priority }); }
  assert.equal(E.stats(s, s.objects[u]).power, 6); assert.equal(E.stats(s, s.objects[u]).toughness, 2, 'só o poder dobra');
});
