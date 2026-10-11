// Auditoria independente das primitivas M-304…M-307 (11/10/2026): três divergências reproduzidas pelo revisor, cada uma vira teste antes da
// correção (M-308). A quarta (amass não passa pelos dobradores de ficha) fica declarada no mapa (614.16 parcial).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';

const c = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: 0, keywords: [], oracle_text: '', colors: [...new Set((mana_cost.match(/[WUBRG]/g) || []))], ...extra });
const EX = { action: 'etb', target: 'none', expect: { attached: false } };
const cards = { Banidor: c('Banidor', 'Creature — Cleric', '{1}{W}', { power: '2', toughness: '2' }), Ursa: c('Ursa', 'Creature — Bear', '{G}', { power: '2', toughness: '2' }),
  BanAtv: c('BanAtv', 'Artifact', '{1}'), Fabrica: c('Fabrica', 'Sorcery', '{W}'), Dobra: c('Dobra', 'Enchantment', '{4}{G}') };
const scripts = {
  Banidor: { name: 'Banidor', abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'exile', target: 'creature', ate: 'fonte-sair' }] }], example: EX },
  BanAtv: { name: 'BanAtv', abilities: [{ kind: 'activated', cost: { tap: true }, effects: [{ do: 'exile', target: 'creature', ate: 'fonte-sair' }] }], example: EX },
  Fabrica: { name: 'Fabrica', effects: [{ do: 'token', amount: 1, token: { name: 'Soldado', types: ['creature'], subtypes: ['Soldier'], colors: ['W'], power: 1, toughness: 1 } }], example: { target: 'none', expect: { tokens: 1 } } },
  Dobra: { name: 'Dobra', self: { multiplica: [{ evento: 'fichas', modo: 'dobro' }] }, example: EX }
};
function mesaX(a = [], b = []) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 12, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Plains', 'Forest']) }, { name: 'B', deck: baralho([...b, 'Island', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const passa = s => act(s, { t: 'pass', p: s.turn.priority });
const resolveTudo = s => { for (let i = 0; i < 40 && (s.stack.length || s.pending); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : passa(s); return s; };
const mv = (s, oid, to, o) => { s = J(s); E.moveObject(s, oid, to, o); return s; };

test('CR 610.3a · habilidade ATIVADA "exile … until ~ leaves": a fonte pisca antes de resolver — nada é exilado (antes a Ursa ficava presa ao objeto novo)', () => {
  let s = mesaX(['BanAtv'], ['Ursa']), b, u;
  [s, u] = poe(s, 1, 'Ursa'); [s, b] = poe(s, 0, 'BanAtv');
  const a = legais(s, 0, x => x.oid === b && x.t !== 'cast' && JSON.stringify(x).includes('"' + u + '"'))[0]; assert.ok(a, 'ativar mirando a Ursa');
  s = act(s, a); s = mv(s, b, 'exile'); s = mv(s, b, 'battlefield', { controller: 0 }); s = resolveTudo(s);
  assert.equal(s.objects[u].zone, 'battlefield'); assert.equal(s.objects[b].ate, undefined);
});

test('CR 610.3 / 400.7 · a carta exilada sai do exílio e volta a ele por outro efeito: é outro objeto e não volta quando o Banidor morre', () => {
  let s = mesaX(['Banidor'], ['Ursa']), ba, u;
  [s, u] = poe(s, 1, 'Ursa'); [s, ba] = poe(s, 0, 'Banidor', 'hand'); s = comMana(s, 'WW');
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === ba)[0]);
  for (let i = 0; i < 8 && !(s.objects[ba].zone === 'battlefield' && (s.stack.length || s.pending)); i++) s = passa(s);
  if (s.pending) s = act(s, { t: 'pick_target', p: s.pending.p, index: s.pending.options.findIndex(o => o.oid === u) });
  s = resolveTudo(s); assert.equal(s.objects[u].zone, 'exile');
  s = mv(s, u, 'graveyard'); s = mv(s, u, 'exile'); s = mv(s, ba, 'graveyard');
  assert.equal(s.objects[u].zone, 'exile');
});

test('CR 708.2 / 113.6 · dobrador virado para baixo não tem habilidade: a ficha não dobra (antes dobrava)', () => {
  let s = mesaX(['Dobra', 'Fabrica']), d, f;
  [s, d] = poe(s, 0, 'Dobra'); s = J(s); s.objects[d].faceDown = true; [s, f] = poe(s, 0, 'Fabrica', 'hand'); s = comMana(s, 'W');
  s = tudo(act(act(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === f)[0]), { t: 'pass', p: 0 }), { t: 'pass', p: 1 }));
  assert.equal(s.zones[0].battlefield.filter(o => s.objects[o].name === 'Soldado').length, 1);
});
