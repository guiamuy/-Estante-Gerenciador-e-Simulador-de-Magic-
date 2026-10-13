// M-388 · LT55 · Navigator's Compass: "When Navigator's Compass enters, you gain 3 life. {T}: Until end of turn, target land you control becomes
// the basic land type of your choice in addition to its other types." (Oracle do Forge, consulta de 12/10/2026; .listas/oficiais-revisadas.json),
// caminho de produção (APROVADAS). 305.7: "in addition" — o terreno mantém o que tinha e ganha o tipo escolhido, com a mana dele (305.6). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';
import { valorDeMana, palavrasDoTexto } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const r = OF.find(x => x.name === "Navigator's Compass");
const CARDS = { ...CARTAS, "Navigator's Compass": { name: r.name, type_line: r.type_line, mana_cost: r.mana_cost, cmc: valorDeMana(r.mana_cost), keywords: palavrasDoTexto(r.oracle_text), oracle_text: r.oracle_text, colors: [] } };
function mesa() {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 31, mode: 'full', cards: CARDS, first: 0,
    players: [{ name: 'A', deck: baralho(["Navigator's Compass", 'Forest']) }, { name: 'B', deck: baralho(['Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);

test('LT55 · Navigator\'s Compass: entra e você ganha 3; {T}: a Floresta vira também Ilha até o fim do turno e gera {U} além de {G}; no turno seguinte, só Floresta', () => {
  let s = mesa(), c, f; [s, c] = poe(s, 0, "Navigator's Compass", 'hand'); [s] = poe(s, 0, 'Forest'); [s, f] = poe(s, 0, 'Forest');
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === c)[0]));
  assert.equal(s.players[0].life, 23, 'ganha 3 ao entrar');
  const at = legais(s, 0, a => a.t === 'activate' && a.oid === c && a.targets && a.targets[0].oid === f)[0];
  assert.ok(at, 'mira a Floresta'); assert.ok(legais(s, 0, a => a.t === 'activate' && a.oid === c).every(a => s.objects[a.targets[0].oid].controller === 0), 'só terreno seu');
  s = resolve(act(s, at));
  assert.equal(s.pending && s.pending.kind, 'choose_type'); assert.deepEqual([...s.pending.options], ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest']);
  s = act(s, legais(s, 0, a => a.t === 'choose_type' && a.subtype === 'Island')[0]);
  const L = loadT(); assert.match(L.linha(s, f), /Forest/); assert.match(L.linha(s, f), /Island/);
  const cores = E.productions(s, s.objects[f]).map(x => x.join(''));
  assert.ok(cores.includes('U') && cores.includes('G'), JSON.stringify(cores));
  assert.ok(!E.productions(s, s.objects[s.zones[0].battlefield.find(x => x !== f && s.objects[x].name === 'Forest')]).map(x => x.join('')).includes('U'), 'a outra Floresta não');
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1');
  assert.doesNotMatch(L.linha(s, f), /Island/, 'acabou no fim do turno'); assert.ok(!E.productions(s, s.objects[f]).map(x => x.join('')).includes('U'));
});
function loadT() { return { linha: (s, oid) => { const o = s.objects[oid]; const v = (o.vira || []).flatMap(x => x.subtypes || []); return (s.facts[o.name].typeText || '') + ' ' + v.join(' '); } }; }

test('LT55 · achado da revisão (205.4): a Floresta básica que ganhou Ilha continua básica — a linha mantém o supertipo', () => {
  let s = mesa(), c, f; [s, c] = poe(s, 0, "Navigator's Compass"); [s, f] = poe(s, 0, 'Forest');
  s = resolve(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === c && a.targets[0].oid === f)[0]));
  s = act(s, legais(s, 0, a => a.t === 'choose_type' && a.subtype === 'Island')[0]);
  assert.match(E.linhaDeTipo(s, s.objects[f]), /^Basic Land — Forest Island$/);
});
