// M-532 · LT194 · revisão por lote CLXX (textos da Scryfall de 19/10/2026): seis Aventuras (715) lidas pela segunda face (M-531) —
// Murderous Rider ("When this creature dies, put it on the bottom of its owner's library"), Rimrock Knight, Order of Midnight, Beanstalk
// Giant (P/T igual aos terrenos que você controla, 604.3), Lovestruck Beast ("can't attack unless you control a 1/1 creature", 508.1c) e
// Smitten Swordmaster (X = Knights que você controla). Falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Murderous Rider // Swift End', 'Rimrock Knight // Boulder Rush', 'Order of Midnight // Alter Fate', 'Beanstalk Giant // Fertile Footsteps', "Lovestruck Beast // Heart's Desire", 'Smitten Swordmaster // Curry Favor'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, layout: c.layout, faces: c.faces, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: c.keywords || [], oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], power: c.power, toughness: c.toughness }; };
const F = n => n.split(' // ')[0];
const C = Object.fromEntries(NOMES.map(n => [F(n), of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Swamp: terra('Swamp', 'Swamp', 'B'), Mountain: terra('Mountain', 'Mountain', 'R'), Forest: terra('Forest', 'Forest', 'G'),
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] },
  Feitico: { name: 'Feitico', type_line: 'Sorcery', mana_cost: '{3}', cmc: 3, keywords: [], oracle_text: '', colors: [] } });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 214, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES.map(F), 'Urso', 'Feitico', 'Swamp', 'Mountain', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };
const limpa = s => passaAte(s, x => !x.stack.length && !x.pending && !(x.queued || []).length);
const aventura = (s, oid, f = () => true) => { const a = legais(s, 0, x => x.t === 'cast' && x.oid === oid && x.omen && f(x))[0]; assert.ok(a, 'conjurar a Aventura de ' + s.objects[oid].name); return act(s, a); };
const bloqueia = (s, b, at) => { try { E.apply(s, { t: 'block', p: 0, blocks: [[b, at]] }); return true; } catch { return false; } };
const ataqueDoOponente = (s, at) => { s = passaAte(s, x => x.turn.active === 1 && !!x.pending && x.pending.kind === 'attackers' && x.pending.p === 1); s = act(s, { t: 'attack', p: 1, attackers: [at] }); return passaAte(s, x => (!!x.pending && x.pending.kind === 'blockers') || x.turn.step === 'main2'); }; // sem bloqueador possível, o motor nem pergunta

test('M-532 · as seis jogam, com a Aventura nos fatos da partida', () => {
  for (const n of NOMES) assert.equal(S.coverage(of(n)).level, 'completo', n);
  const s = mesa(); for (const n of NOMES) { const b = s.facts[F(n)].script.back; assert.ok(b && s.facts[b.name || b], n); }
});

test('M-532 · Murderous Rider: Swift End destrói criatura e você perde 2; morrendo, a Rider vai para o fundo do grimório do dono', () => {
  let s = mesa(), mr, u; [s, mr] = poe(s, 0, 'Murderous Rider', 'hand'); s = terras(s, 'Swamp', 6); [s, u] = poe(s, 1, 'Urso'); const v = s.players[0].life;
  s = limpa(aventura(s, mr, x => x.targets[0].oid === u)); assert.equal(s.objects[u].zone, 'graveyard'); assert.equal(s.players[0].life, v - 2); assert.equal(s.objects[mr].zone, 'exile');
  s = limpa(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === mr && !x.omen)[0])); assert.equal(s.objects[mr].zone, 'battlefield');
  let w = mesa(), a1, a2; // morre de verdade: destruída pela Swift End de outra Rider
  [w, a1] = poe(w, 0, 'Murderous Rider'); [w, a2] = poe(w, 0, 'Murderous Rider', 'hand'); w = terras(w, 'Swamp', 3);
  w = limpa(aventura(w, a2, x => x.targets[0].oid === a1));
  assert.equal(w.objects[a1].zone, 'library'); assert.equal(w.zones[0].library[w.zones[0].library.length - 1], a1, 'no fundo');
});

test('M-532 · Rimrock Knight e Order of Midnight não bloqueiam; Boulder Rush dá +2/+0; Alter Fate devolve criatura do seu cemitério', () => {
  for (const n of ['Rimrock Knight', 'Order of Midnight']) { let s = mesa(), k, u; [s, k] = poe(s, 0, n); [s, u] = poe(s, 1, 'Urso'); s = ataqueDoOponente(s, u); assert.equal(bloqueia(s, k, u), false, n); }
  let s = mesa(), rk, u; [s, rk] = poe(s, 0, 'Rimrock Knight', 'hand'); s = terras(s, 'Mountain', 1); [s, u] = poe(s, 0, 'Urso');
  s = limpa(aventura(s, rk, x => x.targets[0].oid === u)); assert.equal(E.stats(s, s.objects[u]).power, 4); assert.equal(E.stats(s, s.objects[u]).toughness, 2);
  let t = mesa(), om, g1, g2, g3; [t, om] = poe(t, 0, 'Order of Midnight', 'hand'); t = terras(t, 'Swamp', 2); [t, g1] = poe(t, 0, 'Urso', 'graveyard'); [t, g2] = poe(t, 0, 'Feitico', 'graveyard'); [t, g3] = poe(t, 1, 'Urso', 'graveyard');
  const alvos = legais(t, 0, x => x.t === 'cast' && x.oid === om && x.omen).map(x => x.targets[0].oid);
  assert.ok(alvos.includes(g1) && !alvos.includes(g2) && !alvos.includes(g3), 'só criatura do seu cemitério');
  t = limpa(aventura(t, om, x => x.targets[0].oid === g1)); assert.equal(t.objects[g1].zone, 'hand');
});

test('M-532 · Beanstalk Giant tem P/T igual aos terrenos que você controla; Fertile Footsteps põe um básico no campo', () => {
  let s = mesa(), bg; [s, bg] = poe(s, 0, 'Beanstalk Giant', 'hand'); s = terras(s, 'Forest', 3);
  const lands = () => s.zones[0].battlefield.filter(o => /Land/.test(s.facts[s.objects[o].name].typeLine || C[s.objects[o].name].type_line)).length;
  s = aventura(s, bg); s = passaAte(s, x => !!x.pending && x.pending.kind === 'pick' || (!x.stack.length && !x.pending));
  if (s.pending && s.pending.kind === 'pick') { const b = s.pending.from.find(o => /Basic Land/.test(C[s.objects[o].name].type_line)); s = act(s, { t: 'pick', p: 0, oid: b }); }
  s = limpa(s); assert.equal(lands(), 4, 'o básico entrou'); assert.equal(s.objects[bg].zone, 'exile');
  s = terras(s, 'Forest', 6); s = limpa(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === bg && !x.omen)[0]));
  assert.equal(s.objects[bg].zone, 'battlefield'); assert.deepEqual([E.stats(s, s.objects[bg]).power, E.stats(s, s.objects[bg]).toughness], [lands(), lands()]);
});

test("M-532 · Lovestruck Beast só ataca com uma criatura 1/1 sua; Heart's Desire cria o Humano 1/1", () => {
  const podeAtacar = s => { s = passaAte(s, x => !!x.pending && x.pending.kind === 'attackers' && x.pending.p === 0); return s; };
  let s = mesa(), lb; [s, lb] = poe(s, 0, 'Lovestruck Beast'); [s] = poe(s, 0, 'Urso');
  s = podeAtacar(s); assert.throws(() => E.apply(s, { t: 'attack', p: 0, attackers: [lb] }), undefined, 'sem 1/1 não ataca');
  let t = mesa(), l2, l3; [t, l2] = poe(t, 0, 'Lovestruck Beast'); [t, l3] = poe(t, 0, 'Lovestruck Beast', 'hand'); t = terras(t, 'Forest', 1);
  t = limpa(aventura(t, l3)); const hum = t.zones[0].battlefield.find(o => t.objects[o].name === 'Human'); assert.ok(hum); assert.deepEqual([E.stats(t, t.objects[hum]).power, E.stats(t, t.objects[hum]).toughness], [1, 1]);
  t = podeAtacar(t); t = act(t, { t: 'attack', p: 0, attackers: [l2] }); assert.ok(t.combat && t.combat.attackers.includes(l2));
});

test('M-532 · Curry Favor: você ganha X e cada oponente perde X, X = Knights que você controla', () => {
  let s = mesa(), sw; [s, sw] = poe(s, 0, 'Smitten Swordmaster', 'hand'); [s] = poe(s, 0, 'Order of Midnight'); [s] = poe(s, 0, 'Murderous Rider'); [s] = poe(s, 0, 'Urso'); s = terras(s, 'Swamp', 1);
  const v0 = s.players[0].life, v1 = s.players[1].life; s = limpa(aventura(s, sw));
  assert.equal(s.players[0].life, v0 + 2); assert.equal(s.players[1].life, v1 - 2);
});

test('M-532 · Murderous Rider que sai do cemitério e volta antes do gatilho é outro objeto (400.7): fica no cemitério (achado da revisão)', () => {
  let s = mesa(), r, lb; [s, r] = poe(s, 0, 'Murderous Rider'); [s, lb] = poe(s, 0, 'Murderous Rider', 'hand'); s = terras(s, 'Swamp', 3);
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === lb && x.omen && x.targets[0].oid === r)[0]);
  s = passaAte(s, x => x.objects[r].zone === 'graveyard' && x.stack.some(o => x.objects[o].ability) || !!x.pending);
  assert.ok(s.stack.some(o => s.objects[o].ability), 'o gatilho de morrer está na pilha');
  s = JSON.parse(JSON.stringify(s)); E.moveObject(s, r, 'hand'); E.moveObject(s, r, 'graveyard'); s = limpa(s);
  assert.equal(s.objects[r].zone, 'graveyard');
});
