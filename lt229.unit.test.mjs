// M-547 · LT209 · revisão por lote CLXXXV (texto e rulings da Scryfall de 21/10/2026): Soul-Scar Mage ("Prowess / If a source you control would deal
// noncombat damage to a creature an opponent controls, put that many -1/-1 counters on that creature instead."). Substituição (614.1a): o dano
// não é causado (sem vínculo com a vida); não é prevenção; combate e criatura sua ficam como antes. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, T, act, poe, legais, passaAte, valorDeMana, palavrasDoTexto } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const SS = 'Soul-Scar Mage';
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: c.keywords || palavrasDoTexto(c.oracle_text), oracle_text: c.oracle_text, colors: ['R'], power: c.power, toughness: c.toughness }; };
const C = { [SS]: of(SS) };
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
const ins = name => ({ name, type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: '', colors: ['R'] });
Object.assign(C, { 'Doubling Season': { name: 'Doubling Season', type_line: 'Enchantment', mana_cost: '{4}{G}', cmc: 5, keywords: [], colors: ['G'],
    oracle_text: 'If an effect would create one or more tokens under your control, it creates twice that many of those tokens instead.\nIf an effect would put one or more counters on a permanent you control, it puts twice that many of those counters on that permanent instead.' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Choque: ins('Choque'), Choque2: ins('Choque2'), Luta: ins('Luta'),
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] },
  Gigante: { name: 'Gigante', type_line: 'Creature — Giant', mana_cost: '{4}{G}', cmc: 5, keywords: [], oracle_text: '', power: '4', toughness: '4', colors: ['G'] },
  Vampiro: { name: 'Vampiro', type_line: 'Creature — Vampire', mana_cost: '{1}{B}', cmc: 2, keywords: ['Lifelink'], oracle_text: 'Lifelink\n{T}: Vampiro deals 1 damage to any target.', power: '1', toughness: '1', colors: ['B'] } });
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = { Choque: { name: 'Choque', effects: [{ do: 'damage', amount: 2, target: 'any' }], ...EX },
  Choque2: { name: 'Choque2', effects: [{ do: 'no_prevention' }, { do: 'damage', amount: 2, target: 'any' }], ...EX },
  Luta: { name: 'Luta', effects: [{ do: 'mordedor', target: 'creature-you-control' }, { do: 'morde', target: { tipos: ['creature'], de: 'opponent' } }], ...EX },
  Vampiro: { name: 'Vampiro', abilities: [{ kind: 'activated', cost: { tap: true }, effects: [{ do: 'damage', amount: 1, target: 'any' }] }], ...EX } };
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 229, mode: 'full', cards: C, scripts: SCRIPTS, first: 0, players: [{ name: 'A', deck: b([SS, 'Choque', 'Choque2', 'Luta', 'Vampiro', 'Gigante', 'Urso', 'Mountain']) }, { name: 'B', deck: b(['Urso', 'Gigante', 'Choque', 'Doubling Season', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const limpa = s => passaAte(s, x => !x.stack.length && !x.pending && !(x.queued || []).length);
const m1 = (s, o) => (s.objects[o].counters || {}).m1m1 || 0;
const conjura = (s, p, nome, alvo) => { let c; [s, c] = poe(s, p, nome, 'hand'); [s] = poe(s, p, 'Mountain'); return limpa(act(s, legais(s, p, a => a.t === 'cast' && a.oid === c && (!alvo || (a.targets && a.targets.some(t => t && t.oid === alvo))))[0])); };

test('M-547 · Soul-Scar Mage joga (lida e aprovada)', () => { assert.equal(S.coverage(of(SS)).level, 'completo'); });

test('M-547 · dano não de combate de fonte sua numa criatura do oponente vira marcadores -1/-1 (também o que não pode ser prevenido); na sua criatura e no jogador, dano', () => {
  let s = mesa(), g; [s] = poe(s, 0, SS); [s, g] = poe(s, 1, 'Gigante'); s = conjura(s, 0, 'Choque', g);
  assert.deepEqual([m1(s, g), s.objects[g].damage || 0], [2, 0], 'Gigante do oponente: dois marcadores, nenhum dano');
  let t = mesa(), g2; [t] = poe(t, 0, SS); [t, g2] = poe(t, 1, 'Gigante'); t = conjura(t, 0, 'Choque2', g2); assert.equal(m1(t, g2), 2, 'dano que não pode ser prevenido também vira marcador');
  let u = mesa(), g3; [u] = poe(u, 0, SS); [u, g3] = poe(u, 0, 'Gigante'); u = conjura(u, 0, 'Choque', g3); assert.deepEqual([m1(u, g3), u.objects[g3].damage], [0, 2], 'criatura sua: dano');
  let v = mesa(); [v] = poe(v, 0, SS); const vida = v.players[1].life; v = conjura(v, 0, 'Choque'); assert.ok(v.players[1].life <= vida, 'jogador: dano normal');
});

test('M-547 · a fonte com vínculo não ganha vida (o dano não é causado); fonte do oponente e combate ficam como antes; na luta, só a criatura do oponente leva marcadores', () => {
  let s = mesa(), vp, g; [s] = poe(s, 0, SS); [s, vp] = poe(s, 0, 'Vampiro'); [s, g] = poe(s, 1, 'Gigante'); const vida = s.players[0].life;
  s = limpa(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === vp && a.targets && a.targets[0].oid === g)[0]));
  assert.deepEqual([m1(s, g), s.players[0].life], [1, vida], 'marcador; sem ganho de vida');
  let t = mesa(), u; [t] = poe(t, 0, SS); [t, u] = poe(t, 0, 'Gigante'); t = passaAte(t, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  t = conjura(t, 1, 'Choque', u); assert.deepEqual([m1(t, u), t.objects[u].damage], [0, 2], 'o Choque do oponente na sua criatura: dano');
  let w = mesa(), mu, gg; [w, mu] = poe(w, 0, 'Urso'); [w] = poe(w, 0, SS); [w, gg] = poe(w, 1, 'Gigante');
  w = conjura(w, 0, 'Luta', gg); assert.deepEqual([m1(w, gg), w.objects[gg].damage || 0, w.objects[gg].zone], [2, 0, 'battlefield'], 'o seu Urso morde o Gigante do oponente: dois marcadores');
  let c = mesa(), at, bl; [c, at] = poe(c, 0, SS); [c, bl] = poe(c, 1, 'Gigante');
  c = passaAte(c, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0); c = act(c, { t: 'attack', p: 0, attackers: [at] });
  c = passaAte(c, x => x.pending && x.pending.kind === 'blockers'); c = act(c, { t: 'block', p: 1, blocks: [[bl, at]] });
  c = passaAte(c, x => ['combat_end', 'main2'].includes(x.turn.step) && !x.stack.length && !x.pending); assert.deepEqual([m1(c, bl), c.objects[bl].damage], [0, 1], 'combate: dano');
});

test('M-547 · achados da revisão: os marcadores passam pelo Doubling Season do dono da criatura (614.16); o registro diz marcadores, não dano', () => {
  let s = mesa(), g, c; [s] = poe(s, 0, SS); [s, g] = poe(s, 1, 'Gigante'); [s] = poe(s, 1, 'Doubling Season'); [s, c] = poe(s, 0, 'Choque', 'hand'); [s] = poe(s, 0, 'Mountain');
  const a = legais(s, 0, x => x.t === 'cast' && x.oid === c && x.targets && x.targets[0].oid === g)[0]; s = act(s, a);
  let antes = s, r = null; for (let i = 0; i < 6 && s.stack.length; i++) { antes = s; const pr = s.turn.priority; r = E.apply(s, { t: 'pass', p: pr }); s = r.state; }
  s = limpa(s); assert.equal(s.objects[g].zone, 'graveyard', 'dois marcadores dobrados: quatro −1/−1 matam o Gigante 4/4 (sem o Doubling Season, 2 e ele ficaria)');
  const linha = String(T.describe(antes, { t: 'pass', p: antes.turn.priority }, r.events, r.state)); assert.match(linha, /4 marcadores -1\/-1 em vez de dano/); assert.doesNotMatch(linha, /causou 4 de dano/);
});
