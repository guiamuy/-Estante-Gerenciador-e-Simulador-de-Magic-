// Trilha cartas (Pauper de A a L, levas C-N) · apoio dos testes de regra: as cartas das listas (cmd.mjs) mais o texto oficial de
// .listas/oficiais-cartas.json (Oracle do Forge, 12/10/2026) e criaturas de teste simples (nome diz o que são). Partidas em modo único.
import { readFileSync } from 'node:fs';
import { palavrasDoTexto, valorDeMana } from './listas.mjs';
import { CARTAS, E, J, act, poe, legais, resolveUm, passaAte, mesa, comMana, tudo } from './cmd.mjs';
export { CARTAS, E, J, act, poe, legais, resolveUm, passaAte, mesa, comMana, tudo };
const cores = c => [...new Set((c || '').match(/[WUBRG]/g) || [])];
export const oficiaisCartas = JSON.parse(readFileSync(new URL('./.listas/oficiais-cartas.json', import.meta.url), 'utf8')).cartas;
for (const c of oficiaisCartas) CARTAS[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost || '', cmc: valorDeMana(c.mana_cost), keywords: palavrasDoTexto(c.oracle_text), oracle_text: c.oracle_text || '', colors: cores(c.mana_cost),
  ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) };
/** Carta de teste: `teste('Urso 2/2', 'Creature — Bear', { pt: [2, 2], colors: ['W'] })`. */
export function teste(name, type_line, extra = {}) {
  CARTAS[name] = { name, type_line, mana_cost: extra.mana_cost || '{1}', cmc: extra.cmc != null ? extra.cmc : 1, keywords: extra.keywords || [], oracle_text: extra.oracle_text || '', colors: extra.colors || [],
    ...(extra.pt ? { power: String(extra.pt[0]), toughness: String(extra.pt[1]) } : {}) };
  return name;
}
/** Decisão pendente → primeira ação legal dela que passa no filtro (ou a primeira). */
export const decide = (f = () => true) => s => { const op = legais(s, s.pending.p); return op.find(f) || op[0]; };
/** Conjura/ativa a ação legal que passa no filtro (erro claro se a mesa não oferece). */
export function faz(s, p, f, oque = 'ação') { const a = legais(s, p, f)[0]; if (!a) throw new Error(`${oque}: a mesa não oferece`); return act(s, a); }
