// M-538 · LT200 · revisão por lote CLXXVI (texto da Scryfall de 20/10/2026): Psychic Frog ("Whenever this creature deals combat damage to a
// player or planeswalker, draw a card. / Discard a card: Put a +1/+1 counter on this creature. / Exile three cards from your graveyard: This
// creature gains flying until end of turn."). Gatilho de dano de combate a jogador ou planeswalker (510.2) e custo de exilar N cartas do
// cemitério (601.2h: quem paga escolhe quais). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, act, poe, legais, passaAte, valorDeMana, palavrasDoTexto } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const PF = 'Psychic Frog';
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: palavrasDoTexto(c.oracle_text), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], power: c.power, toughness: c.toughness }; };
const C = { [PF]: of(PF) };
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G'),
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] },
  Feitico: { name: 'Feitico', type_line: 'Sorcery', mana_cost: '{3}', cmc: 3, keywords: [], oracle_text: '', colors: [] },
  'Sábio': { name: 'Sábio', type_line: 'Legendary Planeswalker — Sabio', mana_cost: '{3}', cmc: 3, keywords: [], oracle_text: '', colors: [], loyalty: '5' },
  'Golem PW': { name: 'Golem PW', type_line: 'Legendary Planeswalker Creature — Golem', mana_cost: '{3}', cmc: 3, keywords: [], oracle_text: '', colors: [], loyalty: '5', power: '0', toughness: '4' } });
const SCRIPTS = { 'Sábio': { name: 'Sábio', loyalty: [{ cost: 1, label: '+1', effects: [{ do: 'gain', amount: 1 }] }], example: { target: 'none', expect: { selfLife: 0 } } },
  'Golem PW': { name: 'Golem PW', loyalty: [{ cost: 1, label: '+1', effects: [{ do: 'gain', amount: 1 }] }], example: { target: 'none', expect: { selfLife: 0 } } } };
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 220, mode: 'full', cards: C, scripts: SCRIPTS, first: 0, players: [{ name: 'A', deck: b([PF, 'Urso', 'Feitico', 'Island', 'Swamp']) }, { name: 'B', deck: b(['Urso', 'Sábio', 'Golem PW', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const ataca = (s, a, alvos) => { s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0); s = act(s, { t: 'attack', p: 0, attackers: [a], ...(alvos ? { alvos } : {}) });
  return passaAte(s, x => ['combat_end', 'main2'].includes(x.turn.step) && !x.stack.length && !x.pending); };

test('M-538 · Psychic Frog joga (lida e aprovada)', () => { assert.equal(S.coverage(of(PF)).level, 'completo'); });

test('M-538 · compra uma carta ao causar dano de combate a um jogador e a um planeswalker', () => {
  let s = mesa(), f; [s, f] = poe(s, 0, PF); let mao = s.zones[0].hand.length, v = s.players[1].life;
  s = ataca(s, f); assert.equal(s.players[1].life, v - 1); assert.equal(s.zones[0].hand.length, mao + 1, 'jogador: compra');
  let t = mesa(), f2, pw; [t, f2] = poe(t, 0, PF); [t, pw] = poe(t, 1, 'Sábio', 'battlefield', { counters: { loyalty: 5 } }); mao = t.zones[0].hand.length;
  t = ataca(t, f2, { [f2]: pw }); assert.equal(t.objects[pw].counters.loyalty, 4); assert.equal(t.zones[0].hand.length, mao + 1, 'planeswalker: compra');
  let u = mesa(), f3, ub; [u, f3] = poe(u, 0, PF); [u, ub] = poe(u, 1, 'Urso'); mao = u.zones[0].hand.length;
  u = passaAte(u, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0); u = act(u, { t: 'attack', p: 0, attackers: [f3] });
  u = passaAte(u, x => x.pending && x.pending.kind === 'blockers'); u = act(u, { t: 'block', p: 1, blocks: [[ub, f3]] });
  u = passaAte(u, x => ['combat_end', 'main2'].includes(x.turn.step) && !x.stack.length && !x.pending); assert.equal(u.zones[0].hand.length, mao, 'bloqueado: dano na criatura não compra');
});

test('M-538 · descartar uma carta põe um marcador +1/+1; exilar três cartas do cemitério dá voar até o fim do turno (quem paga escolhe quais)', () => {
  let s = mesa(), f, d; [s, f] = poe(s, 0, PF); [s, d] = poe(s, 0, 'Urso', 'hand');
  s = act(s, legais(s, 0, a => a.t === 'activate' && a.oid === f && a.pay && [].concat(a.pay.discard)[0] === d)[0]); s = passaAte(s, x => !x.stack.length && !x.pending);
  assert.equal(s.objects[f].counters.p1p1, 1); assert.equal(s.objects[d].zone, 'graveyard');
  assert.ok(!legais(s, 0, a => a.t === 'activate' && a.oid === f && a.pay && a.pay.exile).length, 'com uma carta no cemitério não dá para exilar três');
  const gy = []; for (let i = 0; i < 3; i++) { let g; [s, g] = poe(s, 0, 'Feitico', 'graveyard'); gy.push(g); }
  const ofs = legais(s, 0, a => a.t === 'activate' && a.oid === f && a.pay && a.pay.exile);
  assert.equal(ofs.length, 4, 'quatro cartas no cemitério: quatro formas de escolher três'); assert.ok(ofs.every(a => [].concat(a.pay.exile).length === 3));
  const esc = ofs.find(a => !a.pay.exile.includes(d)); s = act(s, esc); s = passaAte(s, x => !x.stack.length && !x.pending);
  assert.deepEqual(gy.map(g => s.objects[g].zone), ['exile', 'exile', 'exile']); assert.equal(s.objects[d].zone, 'graveyard', 'a carta não escolhida fica');
  assert.ok(E.hasKeyword(s, s.objects[f], 'flying'), 'voa');
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1'); assert.ok(!E.hasKeyword(s, s.objects[f], 'flying'), 'só até o fim do turno');
});

test('M-538 · achado da revisão: bloqueado por um planeswalker-criatura, o dano tira lealdade e fica marcado (120.3c/e) e o Frog compra', () => {
  let s = mesa(), f, g; [s, f] = poe(s, 0, PF); [s, g] = poe(s, 1, 'Golem PW', 'battlefield', { counters: { loyalty: 5 } }); const mao = s.zones[0].hand.length;
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0); s = act(s, { t: 'attack', p: 0, attackers: [f] });
  s = passaAte(s, x => x.pending && x.pending.kind === 'blockers'); s = act(s, { t: 'block', p: 1, blocks: [[g, f]] });
  s = passaAte(s, x => ['combat_end', 'main2'].includes(x.turn.step) && !x.stack.length && !x.pending);
  assert.equal(s.objects[g].counters.loyalty, 4, 'lealdade'); assert.equal(s.objects[g].damage, 1, 'dano marcado'); assert.equal(s.zones[0].hand.length, mao + 1, 'compra');
});
