// Épico CR · testes de conformidade com as Magic Comprehensive Rules de 25/09/2026. Cada teste leva o número do item que
// prova; cartas inventadas ("Urso", "Grande"…) existem só para exercitar a regra sem depender do texto de uma carta real.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { E, J, act, poe, legais, passaAte, resolveUm, CARTAS, comMana, tudo, alvos } from './cmd.mjs';
const { decks: D } = loadModules();
const c = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: 0, keywords: [], oracle_text: '', colors: [...new Set((mana_cost.match(/[WUBRG]/g) || []))], ...extra });
const INVENTADAS = {
  Urso: c('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2', cmc: 2 }), Grande: c('Grande', 'Creature — Giant', '{4}{R}', { power: '5', toughness: '5', cmc: 5 }),
  'Paga Vida': c('Paga Vida', 'Artifact', '{0}'), 'Sonda Phyrexiana': c('Sonda Phyrexiana', 'Sorcery', '{U/P}', { cmc: 1 }), 'Sem Custo': c('Sem Custo', 'Sorcery', ''),
  'Dano Contado': c('Dano Contado', 'Instant', '{0}', { colors: ['R'] }), Vigia: c('Vigia', 'Enchantment — Aura', '{0}'), 'Fim de Combate': c('Fim de Combate', 'Creature — Spirit', '{1}', { power: '1', toughness: '1' }),
};
const SCRIPTS = {
  'Paga Vida': { name: 'Paga Vida', abilities: [{ kind: 'activated', cost: { life: 3 }, effects: [{ do: 'draw', amount: 1 }] }], example: { action: 'activate:0', target: 'none', expect: { handDelta: 1 } } },
  'Sonda Phyrexiana': { name: 'Sonda Phyrexiana', effects: [{ do: 'draw', amount: 1 }], example: { target: 'none', expect: { handDelta: 1 } } },
  'Sem Custo': { name: 'Sem Custo', effects: [{ do: 'draw', amount: 1 }], example: { target: 'none', expect: { handDelta: 1 } } },
  'Dano Contado': { name: 'Dano Contado', effects: [{ do: 'damage', amount: { per: 'defenders-you-control' }, target: 'creature' }], example: { target: 'enemy-creature', expect: { damaged: 0 } } },
  Vigia: { name: 'Vigia', aura: { enchant: 'creature' }, abilities: [{ kind: 'triggered', when: 'enchanted-tapped-or-damaged', effects: [{ do: 'draw', amount: 1 }] }], example: { action: 'aura', target: 'own-creature', expect: { attached: true } } },
  'Fim de Combate': { name: 'Fim de Combate', abilities: [{ kind: 'triggered', when: 'end-of-combat', effects: [{ do: 'gain', amount: 1 }] }], example: { action: 'etb', target: 'none', expect: { attached: false } } },
};
const cards = { ...CARTAS, ...INVENTADAS };
function mesa(a = [], b = [], seed = 1) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 12, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards, scripts: SCRIPTS, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Plains', 'Swamp']) }, { name: 'B', deck: baralho([...b, 'Island', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const comVida = (s, n, p = 0) => { s = J(s); s.players[p].life = n; return s; };
const conj = (s, oid, f = () => true) => legais(s, 0, a => a.t === 'cast' && a.oid === oid && f(a));

test('CR 119.4 · pagar vida exige ter pelo menos aquela vida: com exatamente 3, "pague 3 de vida" é permitido; com 2, não', () => {
  let s = mesa(['Paga Vida']), o; [s, o] = poe(s, 0, 'Paga Vida');
  assert.equal(legais(comVida(s, 2), 0, a => a.t === 'activate' && a.oid === o).length, 0);
  const t = comVida(s, 3); const as = legais(t, 0, a => a.t === 'activate' && a.oid === o); assert.equal(as.length, 1, 'com 3 de vida pode pagar 3');
  assert.equal(act(t, as[0]).players[0].life, 0);
});

test('CR 107.4 · mana phyrexiana: com a cor disponível o motor paga com mana, não com vida; sem mana paga 2 de vida, e só se tiver 2', () => {
  let s = mesa(['Sonda Phyrexiana', 'Island']), o, i; [s, o] = poe(s, 0, 'Sonda Phyrexiana', 'hand'); [s, i] = poe(s, 0, 'Island');
  { const t = act(s, conj(s, o)[0]); assert.equal(t.players[0].life, 20, 'com Island desvirada não cobra vida'); assert.equal(t.objects[i].tapped, true); }
  { let t = J(s); t.objects[i].tapped = true; t = act(t, conj(t, o)[0]); assert.equal(t.players[0].life, 18, 'sem mana, 2 de vida'); }
  { let t = comVida(s, 1); t.objects[i].tapped = true; assert.equal(conj(t, o).length, 0, 'com 1 de vida e sem mana não é conjurável (119.4)'); }
});

test('CR 202.1 · carta sem custo de mana não pode ser conjurada pelo custo normal (não é custo zero)', () => {
  let s = mesa(['Sem Custo']), o; [s, o] = poe(s, 0, 'Sem Custo', 'hand');
  assert.equal(conj(s, o).length, 0); assert.throws(() => act(s, { t: 'cast', p: 0, oid: o }));
});

test('CR 202.3 · o X pago conta no valor de mana da mágica na pilha: Spell Snare (valor 2) mira {X}{G} com X=1 e não com X=2', () => {
  for (const [x, esperado] of [[1, ['Nyxborn Hydra']], [2, []]]) {
    let s = mesa(['Nyxborn Hydra', 'Spell Snare']), h, sn; [s, h] = poe(s, 0, 'Nyxborn Hydra', 'hand'); [s, sn] = poe(s, 0, 'Spell Snare', 'hand'); s = comMana(s, 'GGG');
    s = comMana(act(s, conj(s, h, a => a.x === x && !a.bestow)[0]), 'U'); assert.deepEqual(alvos(s, 0, sn), esperado, 'X=' + x);
  }
});

test('CR 120.8 · dano 0 não é dano: não dispara "quando a criatura encantada recebe dano"', () => {
  let s = mesa(['Dano Contado', 'Vigia', 'Urso']), d, v, u; [s, u] = poe(s, 0, 'Urso'); [s, v] = poe(s, 0, 'Vigia', 'battlefield', { attachedTo: null }); s = J(s); s.objects[v].attachedTo = u; [s, d] = poe(s, 0, 'Dano Contado', 'hand');
  const mao = s.zones[0].hand.length; s = tudo(act(s, conj(s, d, a => a.targets[0].oid === u)[0]));
  assert.equal(s.objects[u].damage, 0); assert.equal(s.zones[0].hand.length, mao - 1, 'gastou a mágica e não comprou nada pelo gatilho');
});

test('CR 701.24 · buscar e pôr no topo: embaralha e DEPOIS põe a carta no topo (Mystical Tutor)', () => {
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    let s = mesa(['Mystical Tutor', 'Lightning Bolt', 'Urso'], [], seed), m; [s, m] = poe(s, 0, 'Mystical Tutor', 'hand'); s = comMana(s, 'U');
    s = act(s, conj(s, m)[0]); s = tudo(s, x => legais(x, x.pending.p, y => y.t === 'pick')[0] || legais(x, x.pending.p)[0]);
    assert.equal(s.objects[s.zones[0].library[0]].name, 'Lightning Bolt', 'semente ' + seed);
  }
});

test('CR 701.23 · busca por característica em zona oculta: o jogador pode não achar', () => {
  let s = mesa(['Mystical Tutor', 'Lightning Bolt']), m; [s, m] = poe(s, 0, 'Mystical Tutor', 'hand'); s = comMana(s, 'U');
  s = resolveUm(act(s, conj(s, m)[0])); assert.equal(s.pending.kind, 'pick'); assert.equal(s.pending.min, 0);
  const antes = s.zones[0].hand.length; s = act(s, { t: 'pick_done', p: 0 }); assert.equal(s.zones[0].hand.length, antes); assert.equal(s.pending, null);
});

test('CR 708.2 · permanente virada para baixo é 2/2 incolor: a cor impressa não vale, e bônus de Aura valem', () => {
  let s = mesa(['Birchlore Rangers', 'Ethereal Armor']), b, e; [s, b] = poe(s, 0, 'Birchlore Rangers', 'battlefield', { faceDown: true });
  s = J(s); s.preventedColors = ['G']; // escudo do turno contra fontes verdes (Prismatic Strands)
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers'); s = act(s, { t: 'attack', p: 0, attackers: [b] }); s = passaAte(s, x => x.turn.step === 'main2');
  assert.equal(s.players[1].life, 18, 'o dano da 2/2 sem cor não é prevenido pelo escudo contra verde');
  [s, e] = poe(s, 0, 'Ethereal Armor', 'battlefield'); s = J(s); s.objects[e].attachedTo = b; const st = E.stats(s, s.objects[b]); assert.deepEqual([st.power, st.toughness], [3, 3]);
});

test('CR 704.5 · marcadores +1/+1 e −1/−1 na mesma permanente se anulam aos pares (704.5q)', () => {
  let s = mesa(['Urso']), u; [s, u] = poe(s, 0, 'Urso'); s = J(s); s.objects[u].counters = { p1p1: 3, m1m1: 2 };
  s = act(s, { t: 'pass', p: 0 }); assert.equal(s.objects[u].counters.p1p1, 1); assert.equal(s.objects[u].counters.m1m1 || 0, 0);
});

test('CR 704.5 · Aura no campo sem estar anexada, ou anexada a algo que ela não pode encantar, vai para o cemitério (704.5m)', () => {
  { let s = mesa(["Sevinne's Reclamation", 'Ethereal Armor']), r, a; [s, r] = poe(s, 0, "Sevinne's Reclamation", 'hand'); [s, a] = poe(s, 0, 'Ethereal Armor', 'graveyard'); s = comMana(s, 'WWW');
    s = tudo(act(s, conj(s, r, x => x.targets[0].oid === a)[0])); assert.equal(s.objects[a].zone, 'graveyard', 'Aura devolvida ao campo sem hospedeiro cai na checagem seguinte'); }
  { let s = mesa(['Ethereal Armor']), a, l; [s, l] = poe(s, 0, 'Plains'); [s, a] = poe(s, 0, 'Ethereal Armor'); s = J(s); s.objects[a].attachedTo = l;
    s = act(s, { t: 'pass', p: 0 }); assert.equal(s.objects[a].zone, 'graveyard', '"Enchant creature" presa a um terreno'); }
});

test('CR 511.2 · "no fim do combate" dispara para as permanentes de todos os jogadores, não só do ativo', () => {
  let s = mesa(['Fim de Combate'], ['Fim de Combate']); [s] = poe(s, 0, 'Fim de Combate'); [s] = poe(s, 1, 'Fim de Combate');
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers'); s = act(s, { t: 'attack', p: 0, attackers: [] }); s = passaAte(s, x => x.turn.step === 'main2' && !x.stack.length);
  assert.deepEqual(J(s.players.map(p => p.life)), [21, 21]);
});

test('CR 514.2 · na limpeza o dano sai e os efeitos "até o fim do turno" acabam ANTES de alguém receber prioridade (514.3a)', () => {
  let s = mesa(['Fiery Temper', 'Mountain'], ['Grande']), t, x; [s, t] = poe(s, 0, 'Fiery Temper', 'hand'); [s, x] = poe(s, 1, 'Grande'); [s] = poe(s, 0, 'Mountain');
  s = J(s); s.objects[x].damage = 2; while (s.zones[0].hand.length < 8) { const o = s.zones[0].library.shift(); s.zones[0].hand.push(o); s.objects[o].zone = 'hand'; }
  s = passaAte(s, y => y.pending && y.pending.kind === 'discard'); assert.equal(s.turn.step, 'cleanup'); s = act(s, { t: 'discard', p: 0, oid: t });
  s = act(s, legais(s, 0, a => a.t === 'cast_madness' && a.targets.some(z => z.oid === x))[0]); assert.equal(s.objects[x].damage, 0, 'o dano do turno já saiu quando a mágica vai para a pilha');
  s = act(act(s, { t: 'pass', p: 0 }), { t: 'pass', p: 1 }); assert.equal(s.objects[x].zone, 'battlefield', 'a 5/5 sobrevive aos 3 da Fiery Temper'); assert.equal(s.objects[x].damage, 3);
});

test('CR 104.3 · quem concede perde por desistência, não por vida', () => {
  let s = mesa(); s = act(s, { t: 'concede', p: 0 }); assert.equal(s.players[0].lost, true); assert.equal(s.players[0].lossReason, 'desistência');
});

test('CR 903.3 · Veículo lendário pode ser comandante', () => {
  const k = (name, type_line, ci = [], extra = {}) => ({ name, type_line, color_identity: ci, cmc: 2, oracle_text: '', legalities: { commander: 'legal' }, ...extra });
  const M = new Map([k('Motor Lendario', 'Legendary Artifact — Vehicle', ['U'], { power: '8', toughness: '8' }), k('Encanto Lendario', 'Legendary Enchantment', ['U']), k('Island', 'Basic Land — Island', ['U'])].map(x => [x.name.toLowerCase(), x]));
  const erros = cmd => D.validateDeck({ format: 'commander', entries: [{ name: cmd, qty: 1, zone: 'commander' }, { name: 'Island', qty: 99, zone: 'main' }] }, M).filter(i => i.level === 'error' && /não pode ser comandante/.test(i.message)).length;
  assert.equal(erros('Motor Lendario'), 0); assert.equal(erros('Encanto Lendario'), 1, 'encantamento lendário continua recusado');
});
