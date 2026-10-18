// M-503 · 601.2g–h: o pagamento automático paga o genérico com fonte cuja cor o custo não pede (achado da revisão de M-501/M-502).
// Com dois Pântanos e oito Florestas, {4}{B} virava os dois Pântanos e a segunda ativação da Hagra Sharpshooter sumia. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ["Sovereign's Bite", 'Strangling Spores', 'Dark Remedy', 'Symbiote Spawn', 'Hagra Sharpshooter', 'Tar Snare', 'Moment of Craving', "Warlord's Axe", 'Satyr Hedonist'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [].filter(Boolean), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Duo: { name: 'Duo', type_line: 'Land', mana_cost: '', cmc: 0, keywords: [], oracle_text: '{T}: Add {U} or {B}.', colors: [] }, Reliquia: { name: 'Reliquia', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] }, Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 172, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Plains', 'Island', 'Swamp', 'Forest', 'Duo']) }, { name: 'B', deck: b(['Urso', 'Forest', 'Reliquia']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };

const semKw = n => ({ ...C[n], keywords: [] });
const ativa = (s, oid, alvo) => tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === oid && a.targets && a.targets[0].oid === alvo)[0]));
const viradas = (s, nome) => s.zones[0].battlefield.filter(x => s.objects[x].name === nome && s.objects[x].tapped).length;

test('M-503 · Hagra Sharpshooter ativa duas vezes com dois Pântanos e oito Florestas: o genérico sai das Florestas', () => {
  let s = mesa(), hs, u; [s, u] = poe(s, 1, 'Urso'); [s, hs] = poe(s, 0, 'Hagra Sharpshooter'); s = terras(s, 'Swamp', 2); s = terras(s, 'Forest', 8);
  s = ativa(s, hs, u); assert.equal(viradas(s, 'Swamp'), 1, 'um Pântano só'); assert.equal(viradas(s, 'Forest'), 4);
  assert.ok(legais(s, 0, a => a.t === 'activate' && a.oid === hs).length > 0, 'segunda ativação oferecida');
  s = ativa(s, hs, u); assert.equal(s.objects[u].zone, 'graveyard');
});

test("M-503 · com dois Pântanos e três Florestas, Sovereign's Bite vira uma Floresta e guarda um Pântano para Moment of Craving", () => {
  let s = mesa(), sb, mc, u; [s, u] = poe(s, 1, 'Urso'); [s, sb] = poe(s, 0, "Sovereign's Bite", 'hand'); [s, mc] = poe(s, 0, 'Moment of Craving', 'hand'); s = terras(s, 'Swamp', 2); s = terras(s, 'Forest', 3);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === sb && a.targets[0].player === 1)[0])); assert.equal(viradas(s, 'Forest'), 1); assert.equal(viradas(s, 'Swamp'), 1);
  assert.ok(legais(s, 0, a => a.t === 'cast' && a.oid === mc).length > 0, 'ainda tem preto');
});

test("M-503 · empate de sobras não troca, e terreno duplo nunca entra no lugar de um básico (revisão da M-503)", () => {
  let s = mesa(), sb; [s, sb] = poe(s, 0, "Sovereign's Bite", 'hand'); s = terras(s, 'Swamp', 2); s = terras(s, 'Forest', 1);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === sb && a.targets[0].player === 1)[0])); assert.equal(viradas(s, 'Swamp'), 2, 'sobra a Floresta'); assert.equal(viradas(s, 'Forest'), 0);
  let t = mesa(), b2; [t, b2] = poe(t, 0, "Sovereign's Bite", 'hand'); t = terras(t, 'Swamp', 2); t = terras(t, 'Duo', 1);
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === b2 && a.targets[0].player === 1)[0])); assert.equal(viradas(t, 'Swamp'), 2, 'o duplo fica desvirado'); assert.equal(viradas(t, 'Duo'), 0);
});

test('M-503 · sem fonte de outra cor nada muda: quatro Pântanos não pagam {4}{B}, cinco viram os cinco', () => {
  let s = mesa(), hs, u; [s, u] = poe(s, 1, 'Urso'); [s, hs] = poe(s, 0, 'Hagra Sharpshooter'); s = terras(s, 'Swamp', 4);
  assert.equal(legais(s, 0, a => a.t === 'activate' && a.oid === hs).length, 0);
  s = terras(s, 'Swamp', 1); s = ativa(s, hs, u); assert.equal(viradas(s, 'Swamp'), 5); assert.equal(E.stats(s, s.objects[u]).power, 1);
});
