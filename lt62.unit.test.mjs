// M-379 · LT47 · 702.194 (trabalho em equipe, K-70) pelo leitor: "Teamwork N" e "If this spell was cast using teamwork, <efeito>" — revisão por
// lote XXXVIII: Crossover Collaboration (Oracle do Forge, consulta de 12/10/2026; .listas/oficiais-revisadas.json), caminho de produção (APROVADAS).
// Os testes falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';
import { valorDeMana, palavrasDoTexto } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const cores = c => [...new Set((c || '').match(/[WUBRG]/g) || [])];
const cc = OF.find(x => x.name === 'Crossover Collaboration');
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: valorDeMana(mana_cost), keywords: [], oracle_text: '', colors: cores(mana_cost), ...extra });
const CARDS = { ...CARTAS, 'Crossover Collaboration': { name: cc.name, type_line: cc.type_line, mana_cost: cc.mana_cost, cmc: valorDeMana(cc.mana_cost), keywords: palavrasDoTexto(cc.oracle_text), oracle_text: cc.oracle_text, colors: ['R'] },
  Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2' }) };
function mesa() {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 9, mode: 'full', cards: CARDS, first: 0,
    players: [{ name: 'A', deck: baralho(['Crossover Collaboration', 'Urso', 'Mountain']) }, { name: 'B', deck: baralho(['Forest', 'Island']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);
const tesouros = s => s.zones[0].battlefield.filter(o => s.objects[o].name === 'Treasure').length;

test('LT47 · Crossover Collaboration: com trabalho em equipe (virando o Urso, poder 2), exila as duas de cima jogáveis e cria um Tesouro; sem, não cria', () => {
  for (const equipe of [true, false]) {
    let s = mesa(), c, u; [s, c] = poe(s, 0, 'Crossover Collaboration', 'hand'); [s, u] = poe(s, 0, 'Urso'); for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Mountain');
    const topo = s.zones[0].library.slice(0, 2);
    const ofs = legais(s, 0, a => a.t === 'cast' && a.oid === c);
    const a = ofs.find(x => equipe ? [].concat((x.pay || {}).equipeK || []).includes(u) : !(x.pay || {}).equipeK); assert.ok(a, equipe ? 'oferece com equipe' : 'oferece sem equipe');
    s = resolve(act(s, a));
    assert.equal(s.objects[u].tapped, equipe, 'o Urso vira só com equipe');
    assert.deepEqual(topo.map(o => s.objects[o].zone), ['exile', 'exile']);
    assert.equal(tesouros(s), equipe ? 1 : 0);
  }
});
