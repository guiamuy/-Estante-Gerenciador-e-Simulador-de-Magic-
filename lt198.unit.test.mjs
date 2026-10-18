// M-516 · LT178 · revisão por lote CLIV: frases simples que travavam listas do catálogo (textos da Scryfall de 18/10/2026). Primitivas:
// contagem de terrenos de um subtipo que você controla (Spitting Earth), evasão "só criaturas pretas bloqueiam" (Prowling Nightstalker) e
// Aura que torna a criatura imbloqueável (Tricks of the Trade); o leitor passa a ler "a card" no descarte escolhido, "target tapped creature",
// reanimar (também virada) e "on top of its owner's library". Falham no motor anterior (as cartas não eram lidas).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const KW = { Gravewaker: ['Flying'] }; // campo keywords da Scryfall
const NOMES = ['Coercion', 'Vengeance', 'Spitting Earth', 'Breath of Life', 'Time Ebb', 'Gravewaker', 'Tricks of the Trade', 'Prowling Nightstalker', 'Nimble Innovator', 'Agonizing Syphon'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: KW[n] || [], oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
const bicho = (name, p, t, cor) => ({ name, type_line: 'Creature — Beast', mana_cost: `{1}{${cor}}`, cmc: 2, keywords: [], oracle_text: '', power: String(p), toughness: String(t), colors: [cor] });
Object.assign(C, { Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Mountain: terra('Mountain', 'Mountain', 'R'), Forest: terra('Forest', 'Forest', 'G'),
  Taiga: { name: 'Taiga', type_line: 'Land — Mountain Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {R} or {G}.)', colors: [] },
  Urso: bicho('Urso', 2, 2, 'G'), Gigante: bicho('Gigante', 3, 3, 'G'), Sombrio: bicho('Sombrio', 1, 1, 'B') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 198, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Taiga', 'Urso']) }, { name: 'B', deck: b(['Urso', 'Gigante', 'Sombrio', 'Forest', 'Island']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };
const limpa = s => passaAte(s, x => !x.stack.length && !x.pending && !(x.queued || []).length);
const conj = (s, oid, f = () => true) => { const a = legais(s, 0, x => x.t === 'cast' && x.oid === oid && f(x))[0]; assert.ok(a, 'conjurar'); return act(s, a); };
const alvoOid = oid => x => x.targets && x.targets[0] && x.targets[0].oid === oid;

test('M-516 · Coercion: o oponente revela a mão e você escolhe QUALQUER carta (terreno e criatura também)', () => {
  let s = mesa(), c, f, u; [s, c] = poe(s, 0, 'Coercion', 'hand'); s = terras(s, 'Swamp', 3);
  [s, f] = poe(s, 1, 'Forest', 'hand'); [s, u] = poe(s, 1, 'Urso', 'hand');
  s = passaAte(conj(s, c, x => x.targets[0].player === 1), x => !!x.pending && x.pending.kind === 'pick');
  const pode = new Set(legais(s, 0, a => a.t === 'pick').map(a => a.oid)); assert.ok(pode.has(f) && pode.has(u), 'terreno e criatura servem');
  s = limpa(act(s, legais(s, 0, a => a.t === 'pick' && a.oid === f)[0])); if (s.pending && s.pending.kind === 'pick') s = limpa(act(s, legais(s, 0, a => a.t === 'pick_done')[0]));
  assert.equal(s.objects[f].zone, 'graveyard'); assert.equal(s.objects[u].zone, 'hand');
});

test('M-516 · Vengeance só mira criatura virada e a destrói', () => {
  let s = mesa(), v, u, g; [s, v] = poe(s, 0, 'Vengeance', 'hand'); s = terras(s, 'Plains', 4); [s, u] = poe(s, 1, 'Urso'); [s, g] = poe(s, 1, 'Gigante', 'battlefield', { tapped: true });
  const alvos = new Set(legais(s, 0, x => x.t === 'cast' && x.oid === v).map(x => x.targets[0].oid)); assert.ok(alvos.has(g) && !alvos.has(u), 'só a virada');
  s = limpa(conj(s, v, alvoOid(g))); assert.equal(s.objects[g].zone, 'graveyard');
});

test('M-516 · Spitting Earth causa dano igual às Montanhas que você controla, inclusive terreno não básico com o subtipo', () => {
  let s = mesa(), se, g; [s, se] = poe(s, 0, 'Spitting Earth', 'hand'); s = terras(s, 'Mountain', 2); s = terras(s, 'Forest', 3); [s, g] = poe(s, 1, 'Gigante');
  let t = limpa(conj(s, se, alvoOid(g))); assert.equal(t.objects[g].zone, 'battlefield', 'duas Montanhas: 2 de dano na 3/3'); assert.equal(t.objects[g].damage, 2);
  let u = s; [u] = poe(u, 0, 'Taiga'); u = limpa(conj(u, se, alvoOid(g))); assert.equal(u.objects[g].zone, 'graveyard', 'Taiga é Montanha: 3 de dano');
});

test('M-516 · Breath of Life devolve a criatura desvirada; Gravewaker devolve virada', () => {
  let s = mesa(), b, u; [s, u] = poe(s, 0, 'Urso', 'graveyard'); [s, b] = poe(s, 0, 'Breath of Life', 'hand'); s = terras(s, 'Plains', 4);
  s = limpa(conj(s, b, alvoOid(u))); assert.equal(s.objects[u].zone, 'battlefield'); assert.equal(!!s.objects[u].tapped, false);
  let t = mesa(), gw, u2; [t, u2] = poe(t, 0, 'Urso', 'graveyard'); [t, gw] = poe(t, 0, 'Gravewaker'); t = terras(t, 'Swamp', 7);
  const a = legais(t, 0, x => x.t === 'activate' && x.oid === gw && alvoOid(u2)(x))[0]; assert.ok(a, 'ativa mirando o Urso do cemitério');
  t = limpa(act(t, a)); assert.equal(t.objects[u2].zone, 'battlefield'); assert.equal(t.objects[u2].tapped, true);
});

test('M-516 · Time Ebb põe a criatura do oponente no topo do grimório do dono', () => {
  let s = mesa(), te, g; [s, te] = poe(s, 0, 'Time Ebb', 'hand'); s = terras(s, 'Island', 3); [s, g] = poe(s, 1, 'Gigante');
  s = limpa(conj(s, te, alvoOid(g))); assert.equal(s.objects[g].zone, 'library'); assert.equal(s.zones[1].library[0], g);
});

const ataca = (s, atacante) => { s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0); s = act(s, { t: 'attack', p: 0, attackers: [atacante] }); return passaAte(s, x => !!x.pending && x.pending.kind === 'blockers' || x.turn.step === 'main2'); };

test('M-516 · Prowling Nightstalker: só criatura preta bloqueia', () => {
  let s = mesa(), pn, u, b; [s, pn] = poe(s, 0, 'Prowling Nightstalker'); [s, u] = poe(s, 1, 'Urso'); [s, b] = poe(s, 1, 'Sombrio');
  s = ataca(s, pn); assert.equal(s.pending && s.pending.kind, 'blockers');
  assert.throws(() => E.apply(s, { t: 'block', p: 1, blocks: [[u, pn]] }), 'a verde não bloqueia');
  assert.doesNotThrow(() => E.apply(s, { t: 'block', p: 1, blocks: [[b, pn]] }), 'a preta bloqueia');
});

test('M-516 · Tricks of the Trade: +2/+0 e ninguém bloqueia a encantada', () => {
  let s = mesa(), tt, u, o; [s, tt] = poe(s, 0, 'Tricks of the Trade', 'hand'); [s, u] = poe(s, 0, 'Urso'); s = terras(s, 'Island', 4); [s, o] = poe(s, 1, 'Sombrio'); [s] = poe(s, 1, 'Gigante');
  s = limpa(conj(s, tt, alvoOid(u))); assert.equal(E.stats(s, s.objects[u]).power, 4);
  s = ataca(s, u); assert.ok(!(s.pending && s.pending.kind === 'blockers') || legais(s, 1, a => a.t === 'block' && (a.blocks || []).length).length === 0, 'sem bloqueio oferecido');
  if (s.pending && s.pending.kind === 'blockers') assert.throws(() => E.apply(s, { t: 'block', p: 1, blocks: [[o, u]] }));
});

test('M-516 · Nimble Innovator compra ao entrar; Agonizing Syphon causa 3 e você ganha 3', () => {
  let s = mesa(), ni; [s, ni] = poe(s, 0, 'Nimble Innovator', 'hand'); s = terras(s, 'Island', 4); const mao = s.zones[0].hand.length;
  s = limpa(conj(s, ni)); assert.equal(s.zones[0].hand.length, mao - 1 + 1);
  let t = mesa(), ag; [t, ag] = poe(t, 0, 'Agonizing Syphon', 'hand'); t = terras(t, 'Swamp', 4); const v0 = t.players[0].life, v1 = t.players[1].life;
  t = limpa(conj(t, ag, x => x.targets[0].player === 1)); assert.equal(t.players[1].life, v1 - 3); assert.equal(t.players[0].life, v0 + 3);
});
