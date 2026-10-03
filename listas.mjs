// Épico R · apoio dos testes de regra por lista: partidas com as listas reais (.listas/decks.json) e o texto oficial
// (.listas/oficiais.json), em modo único (mana cobrada). As palavras-chave saem das linhas do texto que são só
// palavras-chave ("Flying, haste"), que é como a Scryfall as manda no campo `keywords`.
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';
export const { engine: E, scripts: S, table: T } = loadModules();
export const J = x => JSON.parse(JSON.stringify(x));
const aqui = n => new URL('./.listas/' + n, import.meta.url);
export const oficiais = JSON.parse(readFileSync(aqui('oficiais.json'), 'utf8')).cartas;
export const decks = JSON.parse(readFileSync(aqui('decks.json'), 'utf8'));
const PALAVRAS = ['Flying', 'Reach', 'Trample', 'Deathtouch', 'Lifelink', 'Vigilance', 'Haste', 'First strike', 'Double strike', 'Menace', 'Defender', 'Indestructible', 'Flash', 'Hexproof', 'Shroud', 'Changeling'];
export const palavrasDoTexto = t => [...new Set(String(t || '').split('\n').flatMap(l => { const ps = l.replace(/\s*\(.*\)\s*$/, '').split(/,\s*/).map(x => x.trim());
  return ps.every(x => PALAVRAS.some(k => k.toLowerCase() === x.toLowerCase())) ? ps.map(x => PALAVRAS.find(k => k.toLowerCase() === x.toLowerCase())) : []; }))];
const cores = c => [...new Set((c || '').match(/[WUBRG]/g) || [])];
export const CARDS = {};
/** Valor de mana a partir do custo impresso ({2}{U}{U} = 4; {X} conta 0), como a Scryfall manda em `cmc`. */
export const valorDeMana = custo => [...String(custo || '').matchAll(/\{([^}]+)\}/g)].reduce((n, [, x]) => n + (/^\d+$/.test(x) ? +x : x === 'X' ? 0 : 1), 0);
for (const c of oficiais) CARDS[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost || '', cmc: valorDeMana(c.mana_cost), keywords: palavrasDoTexto(c.oracle_text), oracle_text: c.oracle_text || '', colors: cores(c.mana_cost), ...(c.power != null ? { power: String(c.power), toughness: String(c.toughness) } : {}) };
for (const [n, k] of Object.entries({ Island: 'U', Mountain: 'R', Forest: 'G', Plains: 'W', Swamp: 'B' })) CARDS[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
export const deck = nome => Object.entries(decks[nome]).map(([name, qty]) => ({ name, qty, zone: 'main' }));
export const act = (s, a) => E.apply(s, a).state;
/** Passa a prioridade até `fim`, respondendo o mínimo às decisões de rotina (limpeza, ataque e bloqueio vazios). Para em qualquer outra decisão. */
export function passaAte(s, fim, max = 400) {
  for (let i = 0; i < max && !fim(s); i++) { const pd = s.pending;
    if (pd && pd.kind === 'discard' && pd.reason !== 'effect') s = act(s, { t: 'discard', p: pd.p, oid: s.zones[pd.p].hand[0] });
    else if (pd && pd.kind === 'attackers') s = act(s, { t: 'attack', p: pd.p, attackers: [] });
    else if (pd && pd.kind === 'blockers') s = act(s, { t: 'block', p: pd.p, blocks: [] });
    else if (pd) return s; else s = act(s, { t: 'pass', p: s.turn.priority }); }
  return s;
}
export const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);
/** Resolve só o topo da pilha (os dois passam uma vez): para olhar o gatilho que a mágica deixou na pilha. */
export const resolveUm = s => { const topo = s.stack[s.stack.length - 1]; return passaAte(s, x => !x.stack.includes(topo) || !!x.pending); };
/** Partida no modo único, parada na primeira fase principal do jogador A (a lista em teste). `terrenos`: nomes postos em campo para o jogador A. */
export function jogo({ lista, oponente = 'Pauper Mono Blue Faeries', seed = 1, terrenos = [], terrenosDoOponente = [] } = {}) {
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: CARDS, players: [{ name: 'A', deck: deck(lista) }, { name: 'B', deck: deck(oponente) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending); // sempre no turno de A, que joga a lista em teste
  for (const n of terrenos) [s] = poe(s, 0, n);
  for (const n of terrenosDoOponente) [s] = poe(s, 1, n);
  return s;
}
/** Tira a carta do grimório, da mão ou do cemitério do jogador e a põe na zona pedida, desvirada e sem enjoo. */
export function poe(s, p, name, zone = 'battlefield', extra = {}) {
  s = J(s);
  const from = ['library', 'hand', 'graveyard'].map(z => s.zones[p][z]).find(z => z.some(o => s.objects[o].name === name));
  if (!from) throw new Error(`${name} não está no grimório, na mão nem no cemitério de ${s.players[p].name}`);
  const oid = from.find(o => s.objects[o].name === name); from.splice(from.indexOf(oid), 1); s.zones[p][zone].push(oid);
  Object.assign(s.objects[oid], { zone, sick: false, tapped: false, controller: p, ...extra }); return [s, oid];
}
/** Devolve a mão do jogador ao topo do grimório (para montar a mão que o teste quer). */
export function limpaMao(s, p) { s = J(s); for (const oid of s.zones[p].hand.slice()) { s.zones[p].hand.splice(s.zones[p].hand.indexOf(oid), 1); s.zones[p].library.unshift(oid); s.objects[oid].zone = 'library'; } return s; }
export const legais = (s, p, f = () => true) => E.legalActions(s, p).filter(f);
export const conjura = (s, p, oid, f = () => true) => { const a = legais(s, p, x => x.t === 'cast' && x.oid === oid && f(x))[0]; if (!a) throw new Error(`conjurar ${s.objects[oid].name}: nenhuma ação legal`); return act(s, a); };
export const alvosDe = (s, acoes) => [...new Set(acoes.flatMap(x => (x.targets || []).map(t => t.player != null ? `jogador ${s.players[t.player].name}` : `${s.objects[t.oid].name} de ${s.players[s.objects[t.oid].controller].name}`)))].sort();
/** Palavra-chave da carta como o motor a leu (campo `kw` dos fatos). */
export const temPalavra = (s, oid, k) => ((s.facts[s.objects[oid].name] || {}).kw || []).includes(k);
