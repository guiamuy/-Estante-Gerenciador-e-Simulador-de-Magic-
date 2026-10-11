// Trilha verbos (CR3 · 701) · apoio dos testes de regra: as cartas das listas (cmd.mjs) mais o texto oficial de
// .listas/oficiais-verbos.json e criaturas de teste simples (nome diz o que são). Partidas em modo único, como no app.
import { readFileSync } from 'node:fs';
import { palavrasDoTexto, valorDeMana } from './listas.mjs';
import { CARTAS, E, J, act, poe, legais, resolveUm, passaAte, mesa, comMana, tudo } from './cmd.mjs';
export { CARTAS, E, J, act, poe, legais, resolveUm, passaAte, mesa, comMana, tudo };
const cores = c => [...new Set((c || '').match(/[WUBRG]/g) || [])];
export const oficiaisVerbos = JSON.parse(readFileSync(new URL('./.listas/oficiais-verbos.json', import.meta.url), 'utf8')).cartas;
for (const c of oficiaisVerbos) CARTAS[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost || '', cmc: valorDeMana(c.mana_cost), keywords: palavrasDoTexto(c.oracle_text), oracle_text: c.oracle_text || '', colors: cores(c.mana_cost),
  ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) };
/** Criatura de teste: `criatura('Teste 3/3', 3, 3, { keywords: ['Deathtouch'], colors: ['G'] })`. */
export function criatura(name, p, t, extra = {}) {
  CARTAS[name] = { name, type_line: 'Creature — ' + (extra.subtipo || 'Beast'), mana_cost: extra.mana_cost || '{1}', cmc: 1, keywords: extra.keywords || [], oracle_text: (extra.keywords || []).join(', '), colors: extra.colors || [], power: String(p), toughness: String(t) };
  return name;
}
/** Conjura a carta da mão com os alvos pedidos (oids ou { player }) e devolve o estado com a mágica na pilha. */
export function conjura(s, p, oid, alvos = []) {
  const quer = alvos.map(a => (typeof a === 'object' ? a : { oid: a }));
  const acao = legais(s, p, a => a.t === 'cast' && a.oid === oid).find(a => JSON.stringify((a.targets || []).map(t => (t.player != null ? { player: t.player } : { oid: t.oid }))) === JSON.stringify(quer));
  if (!acao) throw new Error(`conjurar ${s.objects[oid].name} com esses alvos não é oferecido`);
  return act(s, acao);
}
