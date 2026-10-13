// M-356 · CR 702.167 craft — "Craft with [materials] [cost]" significa "[Cost], Exile this permanent, Exile [materials] from among permanents you
// control and/or cards in your graveyard: Return this card to the battlefield transformed under its owner's control. Activate only as a sorcery."
// Carta de prova: Tithing Blade // Consuming Sepulcher, texto do Oracle do Forge copiado em .listas/oficiais-listas.json (consulta de 12/10/2026,
// trilha listas). O script aqui é só de teste: o script de verdade da carta (M a Z) é da trilha listas, abaixo da âncora ↓ L.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, T, J, act, poe, legais, passaAte, resolveUm } from './listas.mjs';
import { CARTAS } from './cmd.mjs';

const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-listas.json', import.meta.url), 'utf8'));
const acha = (o, n) => { if (Array.isArray(o)) { for (const v of o) { const r = acha(v, n); if (r) return r; } } else if (o && typeof o === 'object') { if (o.name === n) return o; for (const v of Object.values(o)) { const r = acha(v, n); if (r) return r; } } return null; };
const tb = acha(OF, 'Tithing Blade');
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: 2, keywords: [], oracle_text: '', colors: [...new Set((mana_cost.match(/[WUBRG]/g) || []))], ...extra });
const cards = { 'Tithing Blade': { name: tb.name, type_line: tb.type_line, mana_cost: tb.mana_cost, cmc: 2, keywords: [], oracle_text: tb.oracle_text, colors: ['B'] },
  Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2' }), Pedra: c0('Pedra', 'Artifact', '{1}') };
const TB = { name: 'Tithing Blade', self: { craft: { mana: '{4}{B}', types: ['creature'] } }, // "Craft with creature {4}{B}"
  abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'sacrificar', tipos: ['creature'], jogadores: 'cada-oponente' }] }], // "When Tithing Blade enters, each opponent sacrifices a creature."
  back: { name: 'Consuming Sepulcher', types: ['artifact'], colors: ['B'], // "At the beginning of your upkeep, each opponent loses 1 life and you gain 1 life."
    abilities: [{ kind: 'triggered', when: 'upkeep', effects: [{ do: 'lose', amount: 1, target: 'each-opponent' }, { do: 'gain', amount: 1 }] }] },
  example: { action: 'etb', target: 'none', expect: { attached: false } } };
function mesaC(seed = 31) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: { ...CARTAS, ...cards }, scripts: { 'Tithing Blade': TB }, first: 0,
    players: [{ name: 'A', deck: baralho(['Tithing Blade', 'Urso', 'Pedra', 'Swamp']) }, { name: 'B', deck: baralho(['Plains', 'Island']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = J(s); for (const o of s.zones[0].battlefield.slice()) { s.zones[0].battlefield = s.zones[0].battlefield.filter(x => x !== o); s.zones[0].library.push(o); s.objects[o].zone = 'library'; }
  let bl; [s, bl] = poe(s, 0, 'Tithing Blade');
  for (let i = 0; i < 5; i++) [s] = poe(s, 0, 'Swamp');
  return [s, bl];
}
const craftDe = (s, bl) => legais(s, 0, a => a.t === 'activate' && a.oid === bl);
const resolve = s => { for (let i = 0; i < 6 && (s.stack.length || s.pending); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : resolveUm(s); return s; };

test('M-356 · 702.167a: o validador aceita o craft com face de trás e recusa sem ela ou com material desconhecido', () => {
  assert.deepEqual([...SC.validateScript(TB)], []);
  assert.ok(SC.validateScript({ ...TB, back: undefined }).some(e => /craft/.test(e)), 'sem face de trás não há o que voltar transformado');
  assert.ok(SC.validateScript({ ...TB, self: { craft: { mana: '{4}{B}', types: ['goblin'] } } }).some(e => /craft/.test(e)));
  assert.ok(SC.validateScript({ ...TB, self: { craft: { mana: '{4}{B}', types: ['creature'], amount: 0 } } }).some(e => /craft/.test(e)));
});

test('M-356 · 702.167a: quem paga escolhe o material entre criatura sua e carta de criatura do seu cemitério; sem material, não há oferta', () => {
  let [s, bl] = mesaC();
  assert.equal(craftDe(s, bl).length, 0, 'sem criatura no campo nem no cemitério, o craft não é oferecido');
  let u1, u2, pd; [s, u1] = poe(s, 0, 'Urso'); [s, u2] = poe(s, 0, 'Urso', 'graveyard'); [s, pd] = poe(s, 0, 'Pedra', 'graveyard');
  const ofs = craftDe(s, bl);
  assert.deepEqual([...ofs.map(a => [...a.pay.craft].join())].sort(), [u1, u2].sort(), 'duas formas: a criatura no campo ou a carta no cemitério (o artefato não serve)');
  assert.equal(E.abilitiesOf ? E.abilitiesOf(s, s.objects[bl]).find(x => x.cost && x.cost.craft).label : 'Craft com criatura', 'Craft com criatura');
});

test('M-356 · 702.167a: só como feitiço — não é oferecido nem aceito no turno do oponente', () => {
  let [s, bl] = mesaC(); let u; [s, u] = poe(s, 0, 'Urso', 'graveyard');
  const ok = craftDe(s, bl)[0]; assert.ok(ok);
  s = J(s); s.turn.active = 1;
  assert.equal(craftDe(s, bl).length, 0);
  assert.throws(() => E.apply(s, ok), /feitiço/);
});

test('M-356 · 702.167a: paga {4}{B}, exila a Lâmina e o material; ao resolver, volta transformada sob o controle do DONO e a face de trás funciona', () => {
  let [s, bl] = mesaC(); let u; [s, u] = poe(s, 0, 'Urso');
  s = J(s); s.objects[bl].controller = 0;
  const a = craftDe(s, bl).find(x => x.pay.craft[0] === u); assert.ok(a);
  s = act(s, a);
  assert.equal(s.objects[bl].zone, 'exile', 'a Lâmina foi exilada como custo');
  assert.equal(s.objects[u].zone, 'exile', 'o material foi exilado como custo');
  assert.equal(s.stack.length, 1, 'a habilidade usa a pilha (pode ser respondida)');
  s = resolve(s);
  assert.equal(s.objects[bl].zone, 'battlefield');
  assert.equal(s.objects[bl].name, 'Consuming Sepulcher', 'voltou com a face de trás');
  assert.equal(s.objects[bl].controller, s.objects[bl].owner);
  const v0 = s.players[0].life, v1 = s.players[1].life;
  s = passaAte(s, x => x.turn.active === 0 && x.turn.number > s.turn.number && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  assert.equal(s.players[1].life, v1 - 1, 'na sua manutenção, cada oponente perde 1');
  assert.equal(s.players[0].life, v0 + 1, 'e você ganha 1');
});

test('M-356 · 400.7: se a carta sai do exílio antes da habilidade resolver, nada volta ao campo', () => {
  let [s, bl] = mesaC(); let u; [s, u] = poe(s, 0, 'Urso', 'graveyard');
  s = act(s, craftDe(s, bl)[0]);
  s = J(s); s.zones[0].exile = s.zones[0].exile.filter(x => x !== bl); s.zones[0].graveyard.push(bl); s.objects[bl].zone = 'graveyard'; s.objects[bl].zc = (s.objects[bl].zc || 0) + 1;
  s = J(s); s.zones[0].graveyard = s.zones[0].graveyard.filter(x => x !== bl); s.zones[0].exile.push(bl); s.objects[bl].zone = 'exile'; s.objects[bl].zc++;
  s = resolve(s);
  assert.equal(s.objects[bl].zone, 'exile', 'é outro objeto no exílio: a habilidade não o encontra');
  assert.notEqual(s.objects[bl].name, 'Consuming Sepulcher');
});

test('M-356 · pilha explicada: a habilidade de craft mostra a linha do craft, não o "enters" da frente (achado da revisão independente)', () => {
  let [s, bl] = mesaC(); let u; [s, u] = poe(s, 0, 'Urso', 'graveyard');
  s = act(s, craftDe(s, bl)[0]);
  const txt = JSON.stringify(T.explicaPilha(s, { oracleDe: n => (cards[n] || {}).oracle_text || '' }));
  assert.match(txt, /Craft with creature/);
  assert.doesNotMatch(txt, /each opponent sacrifices/, 'a habilidade na pilha não faz o oponente sacrificar');
});
