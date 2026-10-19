// M-524 · LT186 · revisão por lote CLXII: cartas que travam listas do catálogo com 1 a 3 pendências (textos da Scryfall de 19/10/2026):
// Terror ("target nonartifact, nonblack creature"), Slickshot Show-Off (tramar, 702.170), Elven Riders ("can't be blocked except by Walls
// and/or creatures with flying", 509.1b) e Ironclaw Orcs ("can't block creatures with power 2 or greater", 509.1b). Falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';
import { loadModules } from './_load.mjs';
const { leitor: L } = loadModules();
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const KW = { 'Slickshot Show-Off': ['Flying', 'Haste', 'Plot'] }; // campo keywords da Scryfall
const NOMES = ['Terror', 'Slickshot Show-Off', 'Elven Riders', 'Ironclaw Orcs'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: KW[n] || [], oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
const bicho = (name, tl, p, t, cor, kw = []) => ({ name, type_line: tl, mana_cost: `{1}{${cor || 'G'}}`, cmc: 2, keywords: kw, oracle_text: kw.join(', '), power: String(p), toughness: String(t), colors: cor ? [cor] : [] });
Object.assign(C, { Swamp: terra('Swamp', 'Swamp', 'B'), Mountain: terra('Mountain', 'Mountain', 'R'), Forest: terra('Forest', 'Forest', 'G'),
  'Lightning Bolt': { name: 'Lightning Bolt', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: 'Lightning Bolt deals 3 damage to any target.', colors: ['R'] },
  Urso: bicho('Urso', 'Creature — Bear', 2, 2, 'G'), Esquilo: bicho('Esquilo', 'Creature — Squirrel', 1, 1, 'G'), Ave: bicho('Ave', 'Creature — Bird', 1, 1, 'W', ['Flying']),
  Muralha: bicho('Muralha', 'Creature — Wall', 0, 4, 'W', ['Defender']), Muda: { ...bicho('Muda', 'Creature — Shapeshifter', 1, 1, 'U', ['Changeling']), oracle_text: 'Changeling (This card is every creature type.)' }, Zumbi: bicho('Zumbi', 'Creature — Zombie', 2, 2, 'B'), Golem: { ...bicho('Golem', 'Artifact Creature — Golem', 2, 2, null), mana_cost: '{2}' } });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 206, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Lightning Bolt', 'Swamp', 'Mountain', 'Forest', 'Urso', 'Esquilo']) }, { name: 'B', deck: b(['Urso', 'Esquilo', 'Ave', 'Muralha', 'Zumbi', 'Golem', 'Ironclaw Orcs', 'Muda', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };
const limpa = s => passaAte(s, x => !x.stack.length && !x.pending && !(x.queued || []).length);
const conj = (s, oid, f = () => true) => { const a = legais(s, 0, x => x.t === 'cast' && x.oid === oid && f(x))[0]; assert.ok(a, 'conjurar ' + s.objects[oid].name); return act(s, a); };
const mira = (s, oid, alvo) => legais(s, 0, x => x.t === 'cast' && x.oid === oid && x.targets && x.targets[0] && x.targets[0].oid === alvo).length > 0;
const ataca = (s, p, at) => { s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === p); s = act(s, { t: 'attack', p, attackers: [at] }); return passaAte(s, x => !!x.pending && x.pending.kind === 'blockers'); };
const bloqueia = (s, p, b, a) => { try { E.apply(s, { t: 'block', p, blocks: [[b, a]] }); return true; } catch { return false; } };

test('M-524 · Terror destrói criatura não artefato e não preta; artefato e preta não podem ser alvo', () => {
  let s = mesa(), te, u, z, g; [s, te] = poe(s, 0, 'Terror', 'hand'); s = terras(s, 'Swamp', 2); [s, u] = poe(s, 1, 'Urso'); [s, z] = poe(s, 1, 'Zumbi'); [s, g] = poe(s, 1, 'Golem');
  assert.equal(mira(s, te, z), false, 'preta não'); assert.equal(mira(s, te, g), false, 'artefato não'); assert.ok(mira(s, te, u));
  s = limpa(conj(s, te, x => x.targets[0].oid === u)); assert.equal(s.objects[u].zone, 'graveyard');
  const r = L.ler({ name: 'X', type_line: 'Instant', mana_cost: '{1}{B}', oracle_text: 'Destroy target nonartifact creature.' });
  assert.equal(r.completa, true, '"target nonartifact creature" também');
});

test('M-524 · Slickshot Show-Off: +2/+0 a cada mágica não criatura sua no turno', () => {
  let s = mesa(), ss, lb; [s, ss] = poe(s, 0, 'Slickshot Show-Off'); [s, lb] = poe(s, 0, 'Lightning Bolt', 'hand'); [s] = poe(s, 0, 'Mountain');
  s = limpa(conj(s, lb, x => x.targets && x.targets[0] && x.targets[0].player === 1)); assert.equal(E.stats(s, s.objects[ss]).power, 3);
  s = passaAte(s, x => x.turn.active === 1); assert.equal(E.stats(s, s.objects[ss]).power, 1, 'até o fim do turno');
});

test('M-524 · Slickshot Show-Off: tramar por {1}{R} exila da mão; num turno depois conjura sem pagar mana', () => {
  let s = mesa(), ss; [s, ss] = poe(s, 0, 'Slickshot Show-Off', 'hand'); s = terras(s, 'Mountain', 2);
  const pl = legais(s, 0, a => a.t === 'plot' && a.oid === ss)[0]; assert.ok(pl, 'oferece tramar');
  s = limpa(act(s, pl)); assert.equal(s.objects[ss].zone, 'exile');
  assert.equal(legais(s, 0, a => a.t === 'cast' && a.oid === ss && a.plotted).length, 0, 'não no mesmo turno');
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && x.turn.number > 2 && !x.stack.length && !x.pending);
  s = J(s); for (const o of s.zones[0].battlefield) s.objects[o].tapped = true; // sem mana nenhuma
  const c = legais(s, 0, a => a.t === 'cast' && a.oid === ss && a.plotted)[0]; assert.ok(c, 'conjura de graça');
  s = limpa(act(s, c)); assert.equal(s.objects[ss].zone, 'battlefield');
});

test('M-524 · Elven Riders: só Paredes e criaturas com voar a bloqueiam', () => {
  let s = mesa(), er, u, a, m; [s, er] = poe(s, 0, 'Elven Riders'); [s, u] = poe(s, 1, 'Urso'); [s, a] = poe(s, 1, 'Ave'); [s, m] = poe(s, 1, 'Muralha');
  s = ataca(s, 0, er);
  assert.equal(bloqueia(s, 1, u, er), false, 'criatura comum não'); assert.equal(bloqueia(s, 1, a, er), true, 'voadora sim'); assert.equal(bloqueia(s, 1, m, er), true, 'Parede sim');
  let t = mesa(), er2, mu; [t, er2] = poe(t, 0, 'Elven Riders'); [t, mu] = poe(t, 1, 'Muda'); t = ataca(t, 0, er2);
  assert.equal(bloqueia(t, 1, mu, er2), true, 'metamorfo é Parede (702.73a)');
});

test('M-524 · Ironclaw Orcs não bloqueia criatura com poder 2 ou mais; bloqueia a de poder 1', () => {
  let s = mesa(), io, u, q; [s, u] = poe(s, 0, 'Urso'); [s, q] = poe(s, 0, 'Esquilo'); [s, io] = poe(s, 1, 'Ironclaw Orcs');
  const t = ataca(s, 0, u); assert.equal(bloqueia(t, 1, io, u), false, 'poder 2: não');
  const w = ataca(s, 0, q); assert.equal(bloqueia(w, 1, io, q), true, 'poder 1: sim');
});
