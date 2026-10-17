// M-484 · LT150 · 400.7 no "sim" do gatilho opcional de permanente no campo (achado da revisão de M-466…M-475): Scavenger Drake
// ("Whenever another creature you control dies, you may put a +1/+1 counter on this creature.") que saiu e voltou com o gatilho
// na pilha é outro objeto — aceitar não põe o marcador na nova. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const c0 = OF.find(x => x.name === 'Scavenger Drake');
const DR = { name: c0.name, type_line: c0.type_line, mana_cost: c0.mana_cost, cmc: valorDeMana(c0.mana_cost), keywords: /^Flying/m.test(c0.oracle_text) ? ['Flying'] : [], oracle_text: c0.oracle_text, colors: ['B'], power: c0.power, toughness: c0.toughness };
const C = { [DR.name]: DR, Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Swamp: { name: 'Swamp', type_line: 'Basic Land — Swamp', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {B}.)', colors: [] } };
function mesa() {
  const d = [{ name: DR.name, qty: 4, zone: 'main' }, { name: 'Urso', qty: 4, zone: 'main' }, { name: 'Swamp', qty: 16, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed: 154, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: d }, { name: 'B', deck: d }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const comSim = s => { for (let i = 0; i < 40 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pay') || l.find(x => x.t === 'pass') || l[0]); } return s; };
const gatilhoNaPilha = () => { let s = mesa(), d, u; [s, d] = poe(s, 0, DR.name); [s, u] = poe(s, 0, 'Urso'); s = J(s); s.objects[u].damage = 9; s = act(s, { t: 'pass', p: 0 }); return [s, d, u]; };

test('LT150 · Scavenger Drake: outra criatura sua morre, aceitar põe o marcador', () => {
  let [s, d, u] = gatilhoNaPilha(); assert.equal(s.objects[u].zone, 'graveyard'); assert.ok(s.stack.some(o => s.objects[o].ability && s.objects[o].name === DR.name), 'gatilho na pilha');
  s = comSim(s); assert.equal((s.objects[d].counters || {}).p1p1, 1);
});

test('LT150 · Scavenger Drake que saiu e voltou com o gatilho na pilha: aceitar não marca a nova (400.7)', () => {
  let [s, d] = gatilhoNaPilha(); s = J(s); E.moveObject(s, d, 'hand'); E.moveObject(s, d, 'battlefield', { controller: 0 });
  assert.equal(s.objects[d].zone, 'battlefield'); s = comSim(s); assert.equal((s.objects[d].counters || {}).p1p1 || 0, 0);
});
