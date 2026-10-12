// M-334 · LT18 · frases sobre primitivas que o motor já tinha: rituais ("Add {B}{B}{B}" em mágica e gatilho), custo adicional de sacrificar um
// terreno/criatura/artefato (601.2b), "It doesn't untap during its controller's next untap step" (502.3), "Activate only once each turn"
// (602.5b), encaixar em Arcano (702.47) e evocar impresso (702.74). Os scripts vêm do leitor (texto oficial em .listas/oficiais-revisadas.json,
// Oracle do Forge, 12/10/2026). Cada teste falha no leitor anterior (as cartas não tinham script).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';
import { loadModules } from './_load.mjs';

const { leitor: L } = loadModules();
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const mv = m => [...m.matchAll(/\{([^}]+)\}/g)].reduce((n, x) => n + (/^\d+$/.test(x[1]) ? +x[1] : 1), 0);
const carta = n => { const c = OF.find(x => x.name === n); assert.ok(c, n); return { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: mv(c.mana_cost), keywords: /^Flying/m.test(c.oracle_text) ? ['Flying'] : [], oracle_text: c.oracle_text, colors: [...new Set(c.mana_cost.match(/[WUBRG]/g) || [])], ...(c.power ? { power: c.power, toughness: c.toughness } : {}) }; };
const EX = { target: 'none', expect: { handDelta: 0 } };
const lido = n => ({ ...L.ler(carta(n)).script, example: { action: 'etb', target: 'none', expect: { attached: false } } });
const NOMES = ['Dark Ritual', 'Crop Rotation', 'Mulldrifter', 'Desperate Ritual', 'Sleep of the Dead', 'Barrels of Blasting Jelly', 'Burning-Tree Emissary', 'Culling the Weak'];
const cards = Object.fromEntries(NOMES.map(n => [n, carta(n)]));
Object.assign(cards, { Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Kami: { name: 'Kami', type_line: 'Instant — Arcane', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: '', colors: ['R'] } });
const scripts = Object.fromEntries(NOMES.map(n => [n, lido(n)]));
scripts['Dark Ritual'].example = scripts['Desperate Ritual'].example = scripts['Culling the Weak'].example = { target: 'none', expect: { poolAdded: true } };
scripts['Crop Rotation'].example = scripts['Sleep of the Dead'].example = EX;
scripts.Kami = { name: 'Kami', effects: [{ do: 'damage', amount: 1, target: 'any' }], example: { target: 'opponent', expect: { opponentLife: -1 } } };
function mesaX(a = [], b = []) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 12, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 7, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Forest', 'Swamp', 'Island', 'Mountain']) }, { name: 'B', deck: baralho([...b, 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => tudo(act(act(s, { t: 'pass', p: 0 }), { t: 'pass', p: 1 }));
const conjura = (s, oid, f = () => true) => { const a = legais(s, 0, x => x.t === 'cast' && x.oid === oid && f(x))[0]; assert.ok(a, 'conjurar ' + s.objects[oid].name); return act(s, a); };

test('LT18 · rituais: Dark Ritual põe {B}{B}{B} na reserva ao resolver; Culling the Weak exige sacrificar uma criatura e dá {B}{B}{B}{B}', () => {
  let s = mesaX(['Dark Ritual', 'Culling the Weak', 'Urso']), d, c, u;
  [s, d] = poe(s, 0, 'Dark Ritual', 'hand'); [s, c] = poe(s, 0, 'Culling the Weak', 'hand');
  s = resolve(conjura(comMana(s, 'B'), d));
  assert.equal(s.players[0].pool.B, 3, '{B}{B}{B}');
  let t = J(s); t.players[0].pool.B = 1;
  assert.equal(legais(t, 0, x => x.t === 'cast' && x.oid === c).length, 0, 'sem criatura para sacrificar, não conjura (601.2b)');
  [t, u] = poe(t, 0, 'Urso');
  t = resolve(conjura(t, c));
  assert.equal(t.objects[u].zone, 'graveyard', 'a criatura foi sacrificada no custo');
  assert.equal(t.players[0].pool.B, 4, '{B}{B}{B}{B}');
});

test('LT18 · Crop Rotation: sacrificar um terreno é custo adicional; busca um terreno para o campo', () => {
  let s = mesaX(['Crop Rotation']), cr, f;
  [s, cr] = poe(s, 0, 'Crop Rotation', 'hand');
  assert.equal(legais(comMana(s, 'G'), 0, x => x.t === 'cast' && x.oid === cr).length, 0, 'sem terreno, não conjura');
  [s, f] = poe(s, 0, 'Forest', 'battlefield', { tapped: true });
  const campo0 = s.zones[0].battlefield.length;
  s = resolve(conjura(comMana(s, 'G'), cr));
  assert.equal(s.objects[f].zone, 'graveyard', 'a Floresta foi sacrificada');
  assert.equal(s.zones[0].battlefield.length, campo0, 'um terreno saiu, outro entrou');
});

test('LT18 · Burning-Tree Emissary: ao entrar, adiciona {R}{G}; Barrels of Blasting Jelly: a habilidade de mana só uma vez por turno', () => {
  let s = mesaX(['Burning-Tree Emissary', 'Barrels of Blasting Jelly']), bt, br;
  [s, bt] = poe(s, 0, 'Burning-Tree Emissary', 'hand');
  s = resolve(conjura(comMana(s, 'RG'), bt));
  assert.equal(s.players[0].pool.R, 1); assert.equal(s.players[0].pool.G, 1);
  [s, br] = poe(s, 0, 'Barrels of Blasting Jelly');
  s = comMana(s, 'CC');
  const a = legais(s, 0, x => x.t === 'activate' && x.oid === br && x.index === 0)[0];
  assert.ok(a, 'ativa a primeira vez');
  s = act(s, a.color ? a : { ...a, color: 'U' });
  assert.equal(legais(s, 0, x => x.t === 'activate' && x.oid === br && x.index === 0).length, 0, '602.5b: não ativa de novo no mesmo turno');
});

test('LT18 · Sleep of the Dead: a criatura virada não desvira no próximo passo de desvirar de quem a controla', () => {
  let s = mesaX(['Sleep of the Dead'], ['Urso']), sd, u;
  [s, sd] = poe(s, 0, 'Sleep of the Dead', 'hand'); [s, u] = poe(s, 1, 'Urso');
  s = resolve(conjura(comMana(s, 'U'), sd, x => x.targets && x.targets[0].oid === u));
  assert.equal(s.objects[u].tapped, true);
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1');
  assert.equal(s.objects[u].tapped, true, 'continua virada no turno de B');
  s = passaAte(s, x => x.turn.active === 1 && x.turn.number > 3 && x.turn.step === 'main1');
  assert.equal(s.objects[u].tapped, false, 'desvira no passo seguinte');
});

test('LT18 · Mulldrifter evocada: entra, compra duas e é sacrificada; Desperate Ritual encaixa num Arcano e soma {R}{R}{R}', () => {
  let s = mesaX(['Mulldrifter', 'Desperate Ritual', 'Kami']), m, dr, k;
  [s, m] = poe(s, 0, 'Mulldrifter', 'hand');
  const h = s.zones[0].hand.length;
  s = comMana(s, 'UUU'); const ev = legais(s, 0, x => x.t === 'cast' && x.oid === m && x.alt != null)[0];
  assert.ok(ev, 'evocar é oferecido');
  s = tudo(resolve(act(s, ev)));
  assert.equal(s.objects[m].zone, 'graveyard', 'sacrificada ao entrar');
  assert.equal(s.zones[0].hand.length, h - 1 + 2, 'comprou duas');
  [s, dr] = poe(s, 0, 'Desperate Ritual', 'hand'); [s, k] = poe(s, 0, 'Kami', 'hand');
  s = comMana(s, 'RRR');
  const enc = legais(s, 0, x => x.t === 'cast' && x.oid === k && (x.emenda || []).includes(dr))[0];
  assert.ok(enc, 'o Kami (Arcano) pode levar o Desperate Ritual encaixado');
  s = resolve(act(s, enc));
  assert.equal(s.players[0].pool.R, 3, 'o efeito encaixado adicionou {R}{R}{R}');
  assert.equal(s.objects[dr].zone, 'hand', 'a carta encaixada fica na mão (702.47c)');
});

test('M-334 · as 16 do lote VIII revisadas jogam (decisão A) e o custo híbrido guardado está no formato do Oracle', async () => {
  const { scripts: S } = loadModules();
  for (const n of ['Dark Ritual', 'Crop Rotation', 'Tinker', 'Mulldrifter', 'Desperate Ritual', 'Sleep of the Dead', 'Pyretic Ritual', 'Diabolic Intent', 'Seething Song', 'Culling the Weak', 'Harrow', 'Barrels of Blasting Jelly', 'Burning-Tree Emissary', 'Shrapnel Blast', 'Bone Splinters', 'Doomed Traveler'])
    assert.equal(S.coverage(carta(n)).level, 'completo', n + ' joga');
  assert.ok(OF.every(c => !/\{[WUBRGC2][WUBRGP]\}/.test(c.mana_cost || '')), 'nenhum {GW}/{BP} do formato do Forge');
  assert.equal(OF.find(c => c.name === 'Burning-Tree Emissary').mana_cost, '{R/G}{R/G}');
});
