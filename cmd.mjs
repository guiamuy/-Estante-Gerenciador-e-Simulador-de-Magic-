// R11 · apoio dos testes de regra das cartas de Commander: fatos de carta a partir do texto oficial
// (.listas/oficiais.json + .listas/oficiais-commander.json) e partidas montadas à mão em modo único.
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, resolveUm, passaAte, palavrasDoTexto, valorDeMana } from './listas.mjs';
export { E, J, act, poe, legais, resolveUm, passaAte };
const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const cores = c => [...new Set((c || '').match(/[WUBRG]/g) || [])];
export const CARTAS = {};
for (const c of [...L('oficiais.json'), ...L('oficiais-commander.json')]) CARTAS[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost || '', cmc: valorDeMana(c.mana_cost), keywords: palavrasDoTexto(c.oracle_text), oracle_text: c.oracle_text || '', colors: cores(c.mana_cost),
  ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}), ...(c.loyalty != null ? { loyalty: c.loyalty } : {}) };
for (const [n, k] of Object.entries({ Island: 'U', Mountain: 'R', Forest: 'G', Plains: 'W', Swamp: 'B' })) CARTAS[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
const baralho = nomes => { const u = [...new Set(nomes)]; return u.map(name => ({ name, qty: Math.max(4, Math.ceil(40 / u.length)), zone: 'main' })); };
/** Partida livre com as cartas pedidas no baralho de cada um, parada na 1ª fase principal de A. */
export function mesa(a = [], b = [], seed = 1) {
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: CARTAS, players: [{ name: 'A', deck: baralho([...a, 'Plains', 'Swamp']) }, { name: 'B', deck: baralho([...b, 'Island', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
export const comMana = (s, m, p = 0) => { s = J(s); for (const c of m) s.players[p].pool[c]++; return s; };
export const tudo = (s, decide = x => legais(x, x.pending.p)[0]) => { for (let i = 0; i < 40 && (s.stack.length || s.pending); i++) s = s.pending ? act(s, decide(s)) : resolveUm(s); return s; };
export const alvos = (s, p, oid) => [...new Set(legais(s, p, a => a.oid === oid).flatMap(a => (a.targets || []).map(t => t.player != null ? 'jogador ' + s.players[t.player].name : s.objects[t.oid].name)))].sort();
