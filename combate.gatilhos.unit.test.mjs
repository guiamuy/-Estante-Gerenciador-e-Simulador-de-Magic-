// CR2g.5 · gatilhos de combate que faltavam: 508.3d "whenever you attack" (uma vez por combate, com quantas atacaram), 509.3c "whenever ~
// becomes blocked" (uma vez, com um ou mais bloqueadores) e "whenever ~ attacks and isn't blocked" (inclusive quando ninguém pode bloquear).
// Também fixa 508.3c ("sempre que outra criatura sua ataca"), que já funcionava pelo descritor e não tinha teste. Falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';

const c = (name, type_line, extra = {}) => ({ name, type_line, mana_cost: '{G}', cmc: 1, keywords: [], oracle_text: '', colors: ['G'], ...extra });
const EX = { action: 'etb', target: 'none', expect: { attached: false } };
const cards = { Ursa: c('Ursa', 'Creature — Bear', { power: '2', toughness: '2' }), Muro: c('Muro', 'Creature — Wall', { power: '0', toughness: '4' }),
  Toque: c('Toque', 'Creature — Elf', { power: '1', toughness: '1' }), Chefe: c('Chefe', 'Creature — Elf', { power: '1', toughness: '1' }), Fera: c('Fera', 'Creature — Beast', { power: '3', toughness: '3' }) };
const scripts = {
  Chefe: { name: 'Chefe', abilities: [{ kind: 'triggered', when: 'you-attack', effects: [{ do: 'gain', amount: { per: 'trigger-value' } }] }, { kind: 'triggered', when: { evento: 'ataca', objeto: 'outra', quem: 'voce' }, effects: [{ do: 'draw', amount: 1 }] }], example: EX },
  Fera: { name: 'Fera', abilities: [{ kind: 'triggered', when: 'becomes-blocked', effects: [{ do: 'counters', amount: 1, target: 'self-source' }] }], example: EX },
  Toque: { name: 'Toque', abilities: [{ kind: 'triggered', when: 'attacks-unblocked', effects: [{ do: 'draw', amount: 1 }] }], example: EX }
};
function mesaX(a = [], b = []) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 12, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Forest']) }, { name: 'B', deck: baralho([...b, 'Island']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const passa = s => act(s, { t: 'pass', p: s.turn.priority });
const ataca = (s, quem) => { for (let i = 0; i < 10 && s.turn.step !== 'combat_attackers'; i++) s = passa(s); const a = legais(s, 0, x => x.t === 'attack' && x.attackers.length === quem.length && quem.every(o => x.attackers.includes(o)))[0]; assert.ok(a, 'atacar'); return act(s, a); };
const ateMain2 = (s, bloqueio) => { for (let i = 0; i < 40 && s.turn.step !== 'main2'; i++) { if (s.pending && s.pending.kind === 'blockers' && bloqueio) { s = act(s, bloqueio(s)); continue; } s = s.pending ? act(s, legais(s, s.pending.p).find(a => a.t !== 'concede')) : passa(s); } return s; };
const prontas = (s, oids) => { s = J(s); for (const o of oids) s.objects[o].sick = false; return s; };

test('CR 508.3c/d · "sempre que você ataca" dispara uma vez com o número de atacantes; "sempre que outra criatura sua ataca", uma vez por criatura', () => {
  let s = mesaX(['Chefe', 'Ursa']), ch, u1, u2;
  [s, ch] = poe(s, 0, 'Chefe'); [s, u1] = poe(s, 0, 'Ursa'); [s, u2] = poe(s, 0, 'Ursa'); s = prontas(s, [u1, u2]); s.objects[ch].sick = true; // o Chefe não ataca
  const v = s.players[0].life, m = s.zones[0].hand.length;
  s = ateMain2(ataca(s, [u1, u2]));
  assert.equal(s.players[0].life - v, 2, 'um gatilho, valor 2 (duas atacantes)');
  assert.equal(s.zones[0].hand.length - m, 2, 'outra criatura sua ataca: um por Ursa');
});

test('CR 509.3c · "quando é bloqueada": uma vez, mesmo com dois bloqueadores; não bloqueada, não dispara', () => {
  let s = mesaX(['Fera'], ['Muro']), f, m1, m2;
  [s, f] = poe(s, 0, 'Fera'); [s, m1] = poe(s, 1, 'Muro'); [s, m2] = poe(s, 1, 'Muro'); s = prontas(s, [f]);
  s = ataca(s, [f]);
  for (let i = 0; i < 6 && !(s.pending && s.pending.kind === 'blockers'); i++) s = passa(s);
  s = act(s, legais(s, 1, x => x.t === 'block' && (x.blocks || []).length === 2)[0]);
  const daFera = s.stack.filter(oid => s.objects[oid].ability && s.objects[oid].source === f);
  assert.equal(daFera.length, 1, 'um gatilho só, com dois bloqueadores');
  let t = mesaX(['Fera']), f2; [t, f2] = poe(t, 0, 'Fera'); t = prontas(t, [f2]);
  t = ataca(t, [f2]); for (let i = 0; i < 4 && t.turn.step !== 'combat_damage'; i++) t = passa(t);
  assert.equal(t.stack.filter(oid => t.objects[oid].ability && t.objects[oid].source === f2).length, 0, 'sem bloqueio: nada');
});

test('CR 509.3 · "ataca e não é bloqueada": dispara sem bloqueio declarado e quando ninguém pode bloquear; bloqueada, não', () => {
  for (const [deB, bloqueia, compra] of [[[], false, 1], [['Muro'], false, 1], [['Muro'], true, 0]]) {
    let s = mesaX(['Toque'], deB), t, m;
    [s, t] = poe(s, 0, 'Toque'); if (deB.length) [s, m] = poe(s, 1, 'Muro'); s = prontas(s, [t]);
    const h = s.zones[0].hand.length;
    s = ateMain2(ataca(s, [t]), x => bloqueia ? legais(x, 1, y => y.t === 'block' && (y.blocks || []).length === 1)[0] : legais(x, 1, y => y.t === 'block' && !(y.blocks || []).length)[0]);
    assert.equal(s.zones[0].hand.length - h, compra, `${deB.length ? (bloqueia ? 'bloqueada' : 'sem bloqueio declarado') : 'ninguém pode bloquear'}`);
  }
});
