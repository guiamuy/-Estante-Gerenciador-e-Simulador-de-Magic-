// M-536 · LT198 · revisão por lote CLXXIV (textos da Scryfall de 20/10/2026): Stifle ("Counter target activated or triggered ability"),
// Impractical Joke ("Damage can't be prevented this turn. ~ deals 3 damage to up to one target creature or planeswalker", 115.3) e Reckless
// Rage ("4 damage to target creature you don't control and 2 damage to target creature you control"). Falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Stifle', 'Impractical Joke', 'Reckless Rage'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))] }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
const cr = (name, cost, p, t, extra = {}) => ({ name, type_line: 'Creature — Test', mana_cost: cost, cmc: valorDeMana(cost), keywords: [], oracle_text: '', power: String(p), toughness: String(t), colors: [...new Set((cost.match(/[WUBRG]/g) || []))], ...extra });
Object.assign(C, { Island: terra('Island', 'Island', 'U'), Mountain: terra('Mountain', 'Mountain', 'R'), Forest: terra('Forest', 'Forest', 'G'),
  Urso: cr('Urso', '{1}{G}', 2, 2), Gigante: cr('Gigante', '{4}{G}', 5, 5),
  'Elvish Visionary': cr('Elvish Visionary', '{1}{G}', 1, 1, { type_line: 'Creature — Elf Shaman', oracle_text: 'When this creature enters, draw a card.' }),
  'Prodigal Sorcerer': cr('Prodigal Sorcerer', '{2}{U}', 1, 1, { type_line: 'Creature — Human Wizard', oracle_text: '{T}: Prodigal Sorcerer deals 1 damage to any target.' }) });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 218, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Urso', 'Gigante', 'Island', 'Mountain', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Gigante', 'Elvish Visionary', 'Prodigal Sorcerer', 'Forest', 'Island']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const terras = (s, p, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, p, n); return s; };
const limpa = s => passaAte(s, x => !x.stack.length && !x.pending && !(x.queued || []).length);
const turnoDeB = s => passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);

test('M-536 · as três jogam (lidas e aprovadas)', () => { for (const n of NOMES) assert.equal(S.coverage(of(n)).level, 'completo', n); });

test('M-536 · Stifle anula a habilidade ativada e a disparada; não mira mágica', () => {
  let s = mesa(), st, ps; s = terras(s, 0, 'Island', 1); [s, st] = poe(s, 0, 'Stifle', 'hand'); s = turnoDeB(s); [s, ps] = poe(s, 1, 'Prodigal Sorcerer');
  const v = s.players[0].life; s = act(s, legais(s, 1, a => a.t === 'activate' && a.oid === ps && a.targets && a.targets[0].player === 0)[0]); s = act(s, { t: 'pass', p: 1 });
  const ab = s.stack.find(o => s.objects[o].ability); assert.ok(ab);
  s = limpa(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === st && a.targets && a.targets[0].oid === ab)[0])); assert.equal(s.players[0].life, v, 'a ativada não causou dano');
  let t = mesa(), s2, ev; t = terras(t, 0, 'Island', 1); [t, s2] = poe(t, 0, 'Stifle', 'hand'); t = turnoDeB(t); [t, ev] = poe(t, 1, 'Elvish Visionary', 'hand'); t = terras(t, 1, 'Forest', 2);
  t = act(t, legais(t, 1, a => a.t === 'cast' && a.oid === ev)[0]); t = act(t, { t: 'pass', p: 1 });
  assert.ok(!legais(t, 0, a => a.t === 'cast' && a.oid === s2 && a.targets && a.targets[0].oid === ev).length, 'a mágica não é alvo');
  t = passaAte(t, x => x.objects[ev].zone === 'battlefield' && x.stack.length > 0 || !!x.pending); if (t.turn.priority === 1) t = act(t, { t: 'pass', p: 1 });
  const gat = t.stack.find(o => t.objects[o].ability); assert.ok(gat); const mao = t.zones[1].hand.length;
  t = limpa(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === s2 && a.targets && a.targets[0].oid === gat)[0])); assert.equal(t.zones[1].hand.length, mao, 'o gatilho anulado: B não comprou');
});

test('M-536 · Impractical Joke: 3 de dano em até uma criatura ou planeswalker (pode sem alvo)', () => {
  let s = mesa(), ij, u; [s, ij] = poe(s, 0, 'Impractical Joke', 'hand'); s = terras(s, 0, 'Mountain', 1); [s, u] = poe(s, 1, 'Urso');
  const ofs = legais(s, 0, a => a.t === 'cast' && a.oid === ij);
  assert.ok(ofs.some(a => !a.targets || !a.targets.length), 'sem alvo é oferecido'); assert.ok(!ofs.some(a => a.targets && a.targets[0] && a.targets[0].player != null), 'não mira jogador');
  s = limpa(act(s, ofs.find(a => a.targets && a.targets[0] && a.targets[0].oid === u))); assert.equal(s.objects[u].zone, 'graveyard');
  let t = mesa(), i2; [t, i2] = poe(t, 0, 'Impractical Joke', 'hand'); t = terras(t, 0, 'Mountain', 1);
  t = limpa(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === i2 && (!a.targets || !a.targets.length))[0])); assert.equal(t.objects[i2].zone, 'graveyard', 'resolve sem alvo');
});

test('M-536 · Reckless Rage: 4 numa criatura do oponente e 2 numa sua', () => {
  let s = mesa(), rr, g, u; [s, rr] = poe(s, 0, 'Reckless Rage', 'hand'); s = terras(s, 0, 'Mountain', 1); [s, g] = poe(s, 1, 'Gigante'); [s, u] = poe(s, 0, 'Gigante');
  const ofs = legais(s, 0, a => a.t === 'cast' && a.oid === rr); assert.ok(ofs.length && ofs.every(a => a.targets[0].oid === g && a.targets[1].oid === u));
  s = limpa(act(s, ofs[0])); assert.equal(s.objects[g].damage, 4); assert.equal(s.objects[u].damage, 2);
  let t = mesa(), r2; [t, r2] = poe(t, 0, 'Reckless Rage', 'hand'); t = terras(t, 0, 'Mountain', 1); [t] = poe(t, 1, 'Gigante');
  assert.equal(legais(t, 0, a => a.t === 'cast' && a.oid === r2).length, 0, 'sem criatura sua não há como conjurar (os dois alvos são exigidos)');
});
