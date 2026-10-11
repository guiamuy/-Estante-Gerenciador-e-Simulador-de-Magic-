// CR2a.9 · correções achadas pela auditoria independente das fases CR2a e CR2h (zonas, ações de estado e conceitos, 11/10/2026): criatura sem
// resistência impressa morre pela resistência de agora (704.5f/g); toque mortífero de uma habilidade é o da fonte dela e vale com infectar
// (702.2b, 702.90b, 704.5h); a marca de toque mortífero vale só "desde a última checagem" (704.5h); o que a resolução anotou na carta não
// acompanha o objeto novo (400.7, 608.2n). Cada teste falha no motor v105.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';

const c = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: 0, keywords: [], oracle_text: '', colors: [...new Set((mana_cost.match(/[WUBRG]/g) || []))], ...extra });
function mesa(a = [], b = [], { cards = {}, scripts = {} } = {}) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 12, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Plains', 'Swamp']) }, { name: 'B', deck: baralho([...b, 'Island', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const conj = (s, p, oid, f = () => true) => legais(s, p, a => a.t === 'cast' && a.oid === oid && f(a));
const ativa = (s, p, oid, f = () => true) => legais(s, p, a => a.t === 'activate' && a.oid === oid && f(a));
const cards = {
  Pinga: c('Pinga', 'Creature — Wizard', '{R}', { power: '1', toughness: '1' }),
  'Colar Mortal': c('Colar Mortal', 'Enchantment — Aura', '{B}'),
  Muro: c('Muro', 'Creature — Wall', '{W}', { power: '0', toughness: '5' }),
  'Vibora Toxica': c('Vibora Toxica', 'Creature — Snake', '{B}', { power: '1', toughness: '1', keywords: ['Deathtouch', 'Infect'] }),
  Vibora: c('Vibora', 'Creature — Snake', '{B}', { power: '1', toughness: '1', keywords: ['Deathtouch'] }),
  Escudo: c('Escudo', 'Enchantment — Aura', '{W}'),
};
const scripts = {
  Pinga: { name: 'Pinga', abilities: [{ kind: 'activated', cost: { tap: true }, effects: [{ do: 'damage', amount: 1, target: 'any' }] }], example: { action: 'activate:0', target: 'opponent', expect: { opponentLife: -1 } } },
  'Colar Mortal': { name: 'Colar Mortal', aura: { enchant: 'creature' }, grants: { keywords: ['deathtouch', 'lifelink'] }, example: { action: 'aura', target: 'own-creature', expect: { keyword: 'deathtouch' } } },
  Vibora: { name: 'Vibora', abilities: [{ kind: 'activated', cost: { tap: true }, effects: [{ do: 'damage', amount: 1, target: 'any' }] }], example: { action: 'activate:0', target: 'opponent', expect: { opponentLife: -1 } } },
  Escudo: { name: 'Escudo', aura: { enchant: 'creature' }, grants: { keywords: ['indestructible'] }, abilities: [{ kind: 'activated', cost: { sacrifice: true }, effects: [{ do: 'draw', amount: 1 }] }], example: { action: 'aura', target: 'own-creature', expect: { keyword: 'indestructible' } } },
};

test('CR 704.5 · Mishra\'s Factory animada (2/2) com 3 de dano vai para o cemitério (antes ficava: a carta não tem resistência impressa)', () => {
  let s = mesa(["Mishra's Factory", 'Lightning Bolt']), m, b;
  [s, m] = poe(s, 0, "Mishra's Factory"); [s, b] = poe(s, 0, 'Lightning Bolt', 'hand');
  s = comMana(s, 'C'); s = comMana(s, 'R');
  const a = ativa(s, 0, m); s = tudo(act(s, a.find(x => !x.targets || !x.targets.length) || a[0]));
  s = tudo(act(s, conj(s, 0, b, x => x.targets && x.targets[0].oid === m)[0]));
  assert.equal(s.objects[m].zone, 'graveyard');
});

test('CR 702.2 · toque mortífero concedido à fonte de uma habilidade de dano destrói (pinger com colar); com infectar também destrói', () => {
  let s = mesa(['Pinga', 'Colar Mortal'], ['Muro'], { cards, scripts }), p, col, mu;
  [s, p] = poe(s, 0, 'Pinga'); [s, col] = poe(s, 0, 'Colar Mortal'); s = J(s); s.objects[col].attachedTo = p; [s, mu] = poe(s, 1, 'Muro');
  const v0 = s.players[0].life;
  s = tudo(act(s, ativa(s, 0, p, x => x.targets && x.targets[0] && x.targets[0].oid === mu)[0]));
  assert.equal(s.players[0].life - v0, 1, 'o vínculo concedido já valia');
  assert.equal(s.objects[mu].zone, 'graveyard', 'o toque mortífero concedido também (antes o Muro 0/5 ficava)');
  let t = mesa(['Vibora Toxica'], ['Muro'], { cards, scripts }), v, mu2;
  [t, v] = poe(t, 0, 'Vibora Toxica'); t = J(t); t.objects[v].entrouNoTurno = 0; [t, mu2] = poe(t, 1, 'Muro');
  t = passaAte(t, x => x.pending && x.pending.kind === 'attackers'); t = act(t, { t: 'attack', p: 0, attackers: [v] });
  t = passaAte(t, x => x.pending && x.pending.kind === 'blockers'); t = act(t, { t: 'block', p: 1, blocks: [[mu2, v]] });
  t = passaAte(t, x => x.turn.step === 'main2' || (x.pending && !['attackers', 'blockers'].includes(x.pending.kind)));
  assert.equal(t.objects[mu2].zone, 'graveyard', 'toque mortífero com infectar (o dano vira marcador) destrói');
});

test('CR 704.5 · o toque mortífero vale só desde a última checagem: o indestrutível que perde a indestrutibilidade depois não morre', () => {
  let s = mesa(['Vibora', 'Escudo', 'Muro'], [], { cards, scripts }), v, e, m;
  [s, v] = poe(s, 0, 'Vibora'); [s, m] = poe(s, 0, 'Muro'); [s, e] = poe(s, 0, 'Escudo'); s = J(s); s.objects[e].attachedTo = m;
  s = tudo(act(s, ativa(s, 0, v, x => x.targets && x.targets[0].oid === m)[0]));
  assert.equal(s.objects[m].zone, 'battlefield', 'indestrutível');
  s = tudo(act(s, ativa(s, 0, e)[0]));
  assert.equal(s.objects[m].zone, 'battlefield', 'sem o Escudo, o toque mortífero antigo não mata (antes morria)');
});

test('CR 400.7 · o que a resolução anotou na carta não acompanha o objeto novo: o lampejo do Prismatic Strands pede a cor de novo; a segunda Call of the Death-Dweller sem alvo não mexe na criatura da primeira', () => {
  let s = mesa(['Prismatic Strands', 'Lunarch Veteran']), ps, w;
  [s, ps] = poe(s, 0, 'Prismatic Strands', 'hand'); [s, w] = poe(s, 0, 'Lunarch Veteran');
  s = comMana(s, 'WWW');
  s = act(s, conj(s, 0, ps)[0]); s = act(s, { t: 'pass', p: 0 }); s = act(s, { t: 'pass', p: 1 });
  s = act(s, { t: 'choose_color', p: 0, color: 'R' });
  s = J(s); s.preventedColors = []; s = comMana(s, 'WWW');
  s = act(s, legais(s, 0, a => a.oid === ps)[0]); s = act(s, { t: 'pass', p: 0 }); s = act(s, { t: 'pass', p: 1 });
  assert.equal(s.pending && s.pending.kind, 'choose_color', 'antes reaproveitava o vermelho da primeira resolução');
  let t = mesa(['Call of the Death-Dweller', 'Faerie Seer']), cd, fs;
  [t, cd] = poe(t, 0, 'Call of the Death-Dweller', 'hand'); [t, fs] = poe(t, 0, 'Faerie Seer', 'graveyard');
  t = comMana(t, 'BBBBBB');
  t = tudo(act(t, conj(t, 0, cd, x => (x.targets || []).length === 1)[0]));
  t = J(t); E.moveObject(t, cd, 'hand');
  t = tudo(act(t, conj(t, 0, cd, x => !(x.targets || []).length)[0]));
  assert.deepEqual(J(t.objects[fs].counters), { deathtouch: 1, menace: 1 }, 'antes ficava com 2 de cada');
});
