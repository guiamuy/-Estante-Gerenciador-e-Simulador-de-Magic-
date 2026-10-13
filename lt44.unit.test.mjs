// M-361 · seletor de criatura atacando (506.4) e duas frases do leitor — Tangle e Witch's Cottage (texto do Oracle do Forge em
// .listas/oficiais-listas.json, consulta de 12/10/2026, trilha listas). Os scripts de verdade das duas (M a Z) são da trilha listas.
// Todos os testes falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, CARTAS } from './cmd.mjs';
import { loadModules } from './_load.mjs';
const { leitor: L, scripts: S } = loadModules();

const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-listas.json', import.meta.url), 'utf8'));
const acha = (o, n) => { if (Array.isArray(o)) { for (const v of o) { const r = acha(v, n); if (r) return r; } } else if (o && typeof o === 'object') { if (o.name === n) return o; for (const v of Object.values(o)) { const r = acha(v, n); if (r) return r; } } return null; };
const cartaDe = (n, extra = {}) => { const c = acha(OF, n); return { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost || '', cmc: 2, keywords: [], oracle_text: c.oracle_text, colors: [...new Set(((c.mana_cost || '').match(/[WUBRG]/g) || []))], ...extra }; };
const tangle = cartaDe('Tangle'), cottage = cartaDe("Witch's Cottage", { cmc: 0 });
const EX = { example: { action: 'etb', target: 'none', expect: { attached: false } } };
const lT = L.ler(tangle), lC = L.ler(cottage);
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: 2, keywords: [], oracle_text: '', colors: [...new Set((mana_cost.match(/[WUBRG]/g) || []))], ...extra });
const cards = { Tangle: tangle, "Witch's Cottage": cottage, Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2' }), Lobo: c0('Lobo', 'Creature — Wolf', '{1}{G}', { power: '3', toughness: '3' }) };
const scripts = { Tangle: { ...lT.script, ...EX }, "Witch's Cottage": { ...lC.script, ...EX } };
function mesaT(a, b, seed = 37) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Swamp']) }, { name: 'B', deck: baralho([...b, 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}

test('M-361 · leitor: Tangle e Witch\'s Cottage lidas por inteiro, com scripts válidos', () => {
  assert.equal(lT.completa, true, JSON.stringify(lT.frases)); assert.equal(lC.completa, true, JSON.stringify(lC.frases));
  assert.deepEqual(JSON.parse(JSON.stringify(lT.script.effects)), [{ do: 'fog' }, { do: 'nao_desvira', cada: { tipos: ['creature'], atacando: true } }]);
  assert.deepEqual(JSON.parse(JSON.stringify(lC.script.abilities[0].effects)), [{ do: 'mover', para: 'library', posicao: 'topo', target: 'creature-in-your-graveyard' }]);
  assert.deepEqual([...S.validateScript(scripts.Tangle)], []); assert.deepEqual([...S.validateScript(scripts["Witch's Cottage"])], []);
});

test('M-361 · 506.4 / 502.3: Tangle no combate — sem dano de combate; só as criaturas atacando ficam presas no próximo desvirar de quem as controla', () => {
  let s = mesaT(['Urso', 'Lobo'], ['Tangle', 'Urso']), u, l, ub, tg;
  [s, u] = poe(s, 0, 'Urso'); [s, l] = poe(s, 0, 'Lobo'); [s, ub] = poe(s, 1, 'Urso'); [s, tg] = poe(s, 1, 'Tangle', 'hand');
  s = J(s); s.objects[ub].tapped = true;
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0);
  s = act(s, { t: 'attack', p: 0, attackers: [u] });
  s = passaAte(s, x => x.turn.priority === 1 && !x.pending && !x.stack.length, 60);
  const vida = s.players[1].life;
  let m = comMana(s, 'GG', 1); s = act(m, legais(m, 1, a => a.t === 'cast' && a.oid === tg)[0]);
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending, 400);
  assert.equal(s.players[1].life, vida, 'dano de combate prevenido');
  assert.equal(s.objects[u].naoDesviraProximo, true, 'a Urso que atacou fica presa');
  assert.ok(!s.objects[l].naoDesviraProximo, 'o Lobo que não atacou, não');
  assert.ok(!s.objects[ub].naoDesviraProximo, 'a criatura do defensor, não (virada, mas não atacando)');
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending, 400);
  assert.equal(s.objects[u].tapped, true, 'não desvirou no passo de desvirar de A');
});

test('M-361 · Witch\'s Cottage: com três outros Pântanos entra desvirada e PODE pôr uma carta de criatura do seu cemitério no topo; virada, nada', () => {
  let s = mesaT(["Witch's Cottage", 'Urso'], []), wc, u;
  for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Swamp');
  [s, u] = poe(s, 0, 'Urso', 'graveyard'); [s, wc] = poe(s, 0, "Witch's Cottage", 'hand');
  let t = act(s, legais(s, 0, a => a.t === 'play_land' && a.oid === wc)[0]);
  assert.equal(t.objects[wc].tapped, false);
  for (let i = 0; i < 6 && (t.stack.length || t.pending); i++) {
    if (t.pending) { const op = legais(t, t.pending.p).find(a => (a.targets || []).some(x => x.oid === u) || a.t === 'pay' || a.oid === u) || legais(t, t.pending.p)[0]; t = act(t, op); }
    else t = act(act(t, { t: 'pass', p: t.turn.priority }), { t: 'pass', p: 1 - t.turn.priority });
  }
  assert.equal(t.objects[u].zone, 'library'); assert.equal(t.zones[0].library[0], u, 'no topo (a próxima compra)');
  let s2 = mesaT(["Witch's Cottage", 'Urso'], []), w2;
  [s2] = poe(s2, 0, 'Urso', 'graveyard'); [s2, w2] = poe(s2, 0, "Witch's Cottage", 'hand');
  s2 = act(s2, legais(s2, 0, a => a.t === 'play_land' && a.oid === w2)[0]);
  assert.equal(s2.objects[w2].tapped, true); assert.equal(s2.stack.length + (s2.pending ? 1 : 0), 0, 'entrou virada: o gatilho não dispara');
});
