// Trilha listas (levas L-N) · apoio dos testes de regra: as cartas de Pauper de M a Z com o texto oficial de .listas/oficiais-listas.json
// (Oracle do Forge, consulta de 12/10/2026), terrenos básicos (também os da neve) e criaturas de teste simples. Partidas em modo único.
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, palavrasDoTexto, valorDeMana } from './listas.mjs';
export { E, J, act, poe, legais, passaAte };
export const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-listas.json', import.meta.url), 'utf8')).cartas;
const cores = c => [...new Set((c || '').match(/[WUBRG]/g) || [])];
export const CARTAS = {};
for (const c of OF) CARTAS[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost || '', cmc: valorDeMana(c.mana_cost), keywords: palavrasDoTexto(c.oracle_text),
  oracle_text: c.oracle_text || '', colors: /^Devoid\b/m.test(c.oracle_text || '') ? [] : cores(c.mana_cost), ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) };
for (const [n, k] of Object.entries({ Island: 'U', Mountain: 'R', Forest: 'G', Plains: 'W', Swamp: 'B' })) {
  CARTAS[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
  CARTAS['Snow-Covered ' + n] = { name: 'Snow-Covered ' + n, type_line: `Basic Snow Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
}
export const criatura = (name, p, t, extra = {}) => (CARTAS[name] = { name, type_line: 'Creature — ' + (extra.subtipo || 'Beast'), mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: extra.colors || ['G'], power: String(p), toughness: String(t) }, name);
criatura('Urso de Teste', 2, 2); criatura('Humano de Teste', 1, 1, { subtipo: 'Human Warrior', colors: ['W'] });

const baralho = nomes => { const u = [...new Set(nomes)]; return u.map(name => ({ name, qty: Math.max(4, Math.ceil(40 / u.length)), zone: 'main' })); };
/** Partida livre com as cartas pedidas; parada na 1ª fase principal de A. */
export function mesa(a = [], b = [], seed = 3) {
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: CARTAS, players: [{ name: 'A', deck: baralho([...a, 'Plains', 'Swamp', 'Mountain', 'Forest', 'Island']) }, { name: 'B', deck: baralho([...b, 'Island', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
export const comMana = (s, m, p = 0) => { s = J(s); for (const c of m) s.players[p].pool[c]++; return s; };
export const tudo = (s, decide = x => legais(x, x.pending.p)[0]) => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) s = s.pending ? act(s, decide(s)) : passaAte(s, x => !x.stack.length || !!x.pending); return s; };
export const noCampo = (s, p, nome) => s.zones[p].battlefield.filter(o => s.objects[o].name === nome);
export const fichas = (s, p, nome) => Object.values(s.objects).filter(o => o.token && o.zone === 'battlefield' && o.controller === p && o.name === nome);
