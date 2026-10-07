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
  // CR1b
  Fracao: c('Fracao', 'Instant', '{0}', { keywords: ['Split second'], oracle_text: 'Split second' }), Resposta: c('Resposta', 'Instant', '{0}'), Taxa: c('Taxa', 'Instant', '{0}'),
  Paladino: c('Paladino', 'Creature — Knight', '{W}', { power: '2', toughness: '2', keywords: ['Protection'], oracle_text: 'Protection from black and from red' }),
  Zumbi: c('Zumbi', 'Creature — Zombie', '{B}', { power: '2', toughness: '2' }), Golem: c('Golem', 'Artifact Creature — Golem', '{2}', { power: '2', toughness: '2' }), Pequeno: c('Pequeno', 'Creature — Kithkin', '{W}', { power: '1', toughness: '1' }),
  'Raio Negro': c('Raio Negro', 'Instant', '{B}'), 'Raio Verde': c('Raio Verde', 'Instant', '{G}'),
  Medroso: c('Medroso', 'Creature — Horror', '{B}', { power: '2', toughness: '2', keywords: ['Fear'] }), Intimidador: c('Intimidador', 'Creature — Ogre', '{R}', { power: '2', toughness: '2', keywords: ['Intimidate'] }),
  Sombrio: c('Sombrio', 'Creature — Spirit', '{U}', { power: '2', toughness: '2', keywords: ['Shadow'] }), 'Anda Ilha': c('Anda Ilha', 'Creature — Merfolk', '{U}', { power: '2', toughness: '2', keywords: ['Islandwalk'] }),
  Furtivo: c('Furtivo', 'Creature — Rogue', '{U}', { power: '1', toughness: '1', keywords: ['Skulk'] }),
  Modal: c('Modal', 'Enchantment', '{0}'), 'Modal Sem Saida': c('Modal Sem Saida', 'Enchantment', '{0}'), Condicional: c('Condicional', 'Enchantment', '{0}'),
  // CR2a
  Helice: c('Helice', 'Instant', '{0}', { colors: ['R', 'W'] }), Lenda: c('Lenda', 'Legendary Creature — Hero', '{W}', { power: '2', toughness: '2' }), 'Lenda Eterna': c('Lenda Eterna', 'Legendary Creature — God', '{W}', { power: '2', toughness: '2', keywords: ['Indestructible'] }),
  Porrete: c('Porrete', 'Artifact — Equipment', '{1}'),
  Promessa: c('Promessa', 'Instant', '{0}'),
  Emprestimo: c('Emprestimo', 'Instant', '{0}'), 'Grito de Guerra': c('Grito de Guerra', 'Instant', '{0}'), Manticora: c('Manticora', 'Creature — Manticore', '{0}', { power: '2', toughness: '2' }),
  'Helice Lenta': c('Helice Lenta', 'Instant', '{0}', { colors: ['R', 'W'] }),
  Carpideira: c('Carpideira', 'Creature — Cleric', '{B}', { power: '1', toughness: '1' }), Mortico: c('Mortico', 'Creature — Spirit', '{B}', { power: '2', toughness: '2' }),
  'Urso Veloz': c('Urso Veloz', 'Creature — Bear', '{0}', { power: '2', toughness: '2', keywords: ['Flash'], colors: ['G'] }), Devolve: c('Devolve', 'Instant', '{0}', { colors: ['U'] }),
  'Dano Contado': c('Dano Contado', 'Instant', '{0}', { colors: ['R'] }), Vigia: c('Vigia', 'Enchantment — Aura', '{0}'), 'Fim de Combate': c('Fim de Combate', 'Creature — Spirit', '{1}', { power: '1', toughness: '1' }),
};
const SCRIPTS = {
  'Paga Vida': { name: 'Paga Vida', abilities: [{ kind: 'activated', cost: { life: 3 }, effects: [{ do: 'draw', amount: 1 }] }], example: { action: 'activate:0', target: 'none', expect: { handDelta: 1 } } },
  'Sonda Phyrexiana': { name: 'Sonda Phyrexiana', effects: [{ do: 'draw', amount: 1 }], example: { target: 'none', expect: { handDelta: 1 } } },
  'Sem Custo': { name: 'Sem Custo', effects: [{ do: 'draw', amount: 1 }], example: { target: 'none', expect: { handDelta: 1 } } },
  Fracao: { name: 'Fracao', effects: [{ do: 'draw', amount: 1 }], example: { target: 'none', expect: { handDelta: 1 } } },
  Resposta: { name: 'Resposta', effects: [{ do: 'draw', amount: 1 }], example: { target: 'none', expect: { handDelta: 1 } } },
  Taxa: { name: 'Taxa', effects: [{ do: 'counter', target: 'spell', unless: { mana: '{1}' } }], example: { target: 'enemy-spell', expect: { countered: true } } },
  'Raio Negro': { name: 'Raio Negro', effects: [{ do: 'damage', amount: 3, target: 'creature' }], example: { target: 'enemy-creature', expect: { damaged: 3 } } },
  'Raio Verde': { name: 'Raio Verde', effects: [{ do: 'damage', amount: 3, target: 'creature' }], example: { target: 'enemy-creature', expect: { damaged: 3 } } },
  Modal: { name: 'Modal', abilities: [{ kind: 'triggered', when: 'etb', modes: [{ label: 'destruir', effects: [{ do: 'destroy', target: 'creature' }] }, { label: 'comprar', effects: [{ do: 'draw', amount: 1 }] }] }], example: { action: 'etb', target: 'none', expect: { attached: false } } },
  'Modal Sem Saida': { name: 'Modal Sem Saida', abilities: [{ kind: 'triggered', when: 'etb', modes: [{ label: 'destruir', effects: [{ do: 'destroy', target: 'creature' }] }, { label: 'ferir', effects: [{ do: 'damage', amount: 1, target: 'creature' }] }] }], example: { action: 'etb', target: 'none', expect: { attached: false } } },
  Condicional: { name: 'Condicional', abilities: [{ kind: 'triggered', when: 'other-etb', filter: { types: ['creature'] }, condition: { lifeGained: 3 }, effects: [{ do: 'draw', amount: 1 }] }], example: { action: 'etb', target: 'none', expect: { attached: false } } },
  Helice: { name: 'Helice', effects: [{ do: 'damage', amount: 3, target: 'any' }, { do: 'gain', amount: 3 }], example: { target: 'opponent', expect: { opponentLife: 17 } } },
  Devolve: { name: 'Devolve', effects: [{ do: 'bounce', target: 'creature' }], example: { target: 'enemy-creature', expect: { gone: true } } },
  Carpideira: { name: 'Carpideira', abilities: [{ kind: 'triggered', when: 'other-dies', filter: { types: ['creature'] }, effects: [{ do: 'gain', amount: 1 }] }], example: { action: 'etb', target: 'none', expect: { attached: false } } },
  Mortico: { name: 'Mortico', abilities: [{ kind: 'triggered', when: 'dies', effects: [{ do: 'gain', amount: 3 }] }], example: { action: 'etb', target: 'none', expect: { attached: false } } },
  'Helice Lenta': { name: 'Helice Lenta', effects: [{ do: 'damage', amount: 3, target: 'any' }, { do: 'discard', amount: 1 }, { do: 'gain', amount: 3 }], example: { target: 'opponent', expect: { opponentLife: 17 } } },
  Emprestimo: { name: 'Emprestimo', effects: [{ do: 'pump', power: 1, toughness: 0, target: 'creature' }, { do: 'delayed', when: 'next-end-step', target: 'first-target', effects: [{ do: 'bounce', target: 'delayed-object' }] }], example: { target: 'own-creature', expect: { pump: [1, 0] } } },
  'Grito de Guerra': { name: 'Grito de Guerra', effects: [{ do: 'delayed', when: 'end-of-combat', effects: [{ do: 'gain', amount: 2 }] }], example: { target: 'none', expect: { selfLife: 0 } } },
  Manticora: { name: 'Manticora', abilities: [{ kind: 'triggered', when: 'etb', mayPay: { mana: '{1}' }, effects: [{ do: 'reflexive', effects: [{ do: 'damage', amount: 2, target: 'any' }] }] }], example: { action: 'etb', target: 'none', expect: { attached: false } } },
  Promessa: { name: 'Promessa', effects: [{ do: 'delayed', when: 'next-upkeep', effects: [{ do: 'draw', amount: 1 }] }], example: { target: 'none', expect: { handDelta: 0 } } },
  Porrete: { name: 'Porrete', equip: { enchant: 'creature', cost: { mana: '{1}' } }, grants: { power: 1, toughness: 1 }, example: { action: 'equip', target: 'own-creature', expect: { stats: [3, 3] } } },
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

// ---------------------------------------------------------------- CR1b
/** Quem pode bloquear `atk` sozinho: nomes dos bloqueadores oferecidos ao defensor. */
function bloqueiam(s, atk) {
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers'); s = act(s, { t: 'attack', p: 0, attackers: [atk] }); s = passaAte(s, x => x.pending && x.pending.kind === 'blockers');
  return [s, [...new Set(legais(s, 1, a => a.t === 'block' && a.blocks.length === 1).map(a => s.objects[a.blocks[0][0]].name))].sort()];
}
const campo = (s, p, ...nomes) => { const ids = []; for (const n of nomes) { let o; [s, o] = poe(s, p, n); ids.push(o); } return [s, ...ids]; };

test('CR 702.61 · fração de segundo: com a mágica na pilha ninguém conjura nem ativa habilidade que não seja de mana; mana continua', () => {
  let s = mesa(['Fracao', 'Resposta'], ['Resposta', 'Paga Vida', 'Island']), f, r0, r1, pv, i;
  [s, f] = poe(s, 0, 'Fracao', 'hand'); [s, r0] = poe(s, 0, 'Resposta', 'hand'); [s, r1] = poe(s, 1, 'Resposta', 'hand'); [s, pv] = poe(s, 1, 'Paga Vida'); [s, i] = poe(s, 1, 'Island');
  s = act(s, conj(s, f)[0]);
  assert.equal(legais(s, 0, a => a.t === 'cast').length, 0, 'nem quem conjurou responde');
  s = act(s, { t: 'pass', p: 0 });
  assert.deepEqual([...new Set(legais(s, 1).map(a => a.t))].sort(), ['concede', 'pass', 'tap_mana'].filter(t => legais(s, 1).some(a => a.t === t)));
  assert.equal(legais(s, 1, a => a.t === 'tap_mana' && a.oid === i).length, 1, 'habilidade de mana continua');
  assert.throws(() => act(s, { t: 'cast', p: 1, oid: r1 }), /fração de segundo/); assert.throws(() => act(s, { t: 'activate', p: 1, oid: pv, index: 0 }), /fração de segundo/);
  s = act(s, { t: 'pass', p: 1 }); assert.equal(legais(s, 0, a => a.t === 'cast' && a.oid === r0).length, 1, 'resolvida a mágica, volta ao normal');
});

test('CR 702.16 · proteção impressa na carta: não é alvo, não é bloqueada e não recebe dano de fonte daquela cor; outra cor passa', () => {
  { let s = mesa(['Raio Negro', 'Raio Verde'], ['Paladino']), n, v, p; [s, n] = poe(s, 0, 'Raio Negro', 'hand'); [s, v] = poe(s, 0, 'Raio Verde', 'hand'); [s, p] = poe(s, 1, 'Paladino'); s = comMana(s, 'BG');
    assert.deepEqual(alvos(s, 0, n), [], 'mágica preta não mira'); assert.deepEqual(alvos(s, 0, v), ['Paladino'], 'mágica verde mira'); }
  { let s = mesa(['Paladino'], ['Zumbi', 'Urso']), p; [s, p] = campo(s, 0, 'Paladino'); [s] = campo(s, 1, 'Zumbi', 'Urso'); let q; [s, q] = bloqueiam(s, p); assert.deepEqual(q, ['Urso'], 'criatura preta não bloqueia'); }
  { let s = mesa(['Zumbi'], ['Paladino']), z, p; [s, z] = campo(s, 0, 'Zumbi'); [s, p] = campo(s, 1, 'Paladino'); [s] = bloqueiam(s, z);
    s = act(s, { t: 'block', p: 1, blocks: [[p, z]] }); s = passaAte(s, x => x.turn.step === 'main2'); assert.equal(s.objects[p].zone, 'battlefield', 'o dano de combate da fonte preta é prevenido'); assert.equal(s.objects[z].zone, 'graveyard'); }
});

test('CR 702.36 · medo: só criatura artefato ou preta bloqueia', () => {
  let s = mesa(['Medroso'], ['Urso', 'Zumbi', 'Golem']), m, q; [s, m] = campo(s, 0, 'Medroso'); [s] = campo(s, 1, 'Urso', 'Zumbi', 'Golem'); [s, q] = bloqueiam(s, m); assert.deepEqual(q, ['Golem', 'Zumbi']);
});

test('CR 702.13 · intimidar: só criatura artefato ou que compartilha cor com ela bloqueia', () => {
  let s = mesa(['Intimidador'], ['Urso', 'Grande', 'Golem']), m, q; [s, m] = campo(s, 0, 'Intimidador'); [s] = campo(s, 1, 'Urso', 'Grande', 'Golem'); [s, q] = bloqueiam(s, m); assert.deepEqual(q, ['Golem', 'Grande']);
});

test('CR 702.28 · sombra: só sombra bloqueia sombra, e sombra só bloqueia sombra', () => {
  { let s = mesa(['Sombrio'], ['Urso', 'Sombrio']), m, q; [s, m] = campo(s, 0, 'Sombrio'); [s] = campo(s, 1, 'Urso', 'Sombrio'); [s, q] = bloqueiam(s, m); assert.deepEqual(q, ['Sombrio']); }
  { let s = mesa(['Urso'], ['Urso', 'Sombrio']), m, q; [s, m] = campo(s, 0, 'Urso'); [s] = campo(s, 1, 'Urso', 'Sombrio'); [s, q] = bloqueiam(s, m); assert.deepEqual(q, ['Urso']); }
});

test('CR 702.14 · travessia: não pode ser bloqueada se o defensor controla terreno daquele tipo', () => {
  { let s = mesa(['Anda Ilha'], ['Urso']), m, q; [s, m] = campo(s, 0, 'Anda Ilha'); [s] = campo(s, 1, 'Urso', 'Island'); [s, q] = bloqueiam(s, m); assert.deepEqual(q, []); }
  { let s = mesa(['Anda Ilha'], ['Urso']), m, q; [s, m] = campo(s, 0, 'Anda Ilha'); [s] = campo(s, 1, 'Urso', 'Mountain'); [s, q] = bloqueiam(s, m); assert.deepEqual(q, ['Urso']); }
});

test('CR 702.118 · esgueirar: não pode ser bloqueada por criatura de poder maior', () => {
  let s = mesa(['Furtivo'], ['Urso', 'Pequeno']), m, q; [s, m] = campo(s, 0, 'Furtivo'); [s] = campo(s, 1, 'Urso', 'Pequeno'); [s, q] = bloqueiam(s, m); assert.deepEqual(q, ['Pequeno']);
});

test('CR 700.2 · gatilho modal: modo sem alvo legal não pode ser escolhido; sem nenhum modo legal o gatilho sai da pilha (700.2b)', () => {
  { let s = mesa(['Modal']), m; [s, m] = poe(s, 0, 'Modal', 'hand'); s = passaAte(act(s, conj(s, m)[0]), x => !!x.pending); assert.equal(s.pending.kind, 'choose_mode');
    assert.deepEqual(J(legais(s, 0, a => a.t === 'choose_mode').map(a => a.label)), ['comprar'], 'sem criatura na mesa, "destruir" não é oferecido');
    assert.throws(() => act(s, { t: 'choose_mode', p: 0, index: 0 }), /sem alvo/); const mao = s.zones[0].hand.length; s = tudo(act(s, { t: 'choose_mode', p: 0, index: 1 })); assert.equal(s.zones[0].hand.length, mao + 1); }
  { let s = mesa(['Modal Sem Saida']), m; [s, m] = poe(s, 0, 'Modal Sem Saida', 'hand'); s = passaAte(act(s, conj(s, m)[0]), x => !!x.pending || (!x.stack.length && x.objects[m].zone === 'battlefield'));
    assert.equal(s.pending, null, 'nenhum modo legal: nada a escolher'); assert.equal(s.stack.length, 0); }
});

test('CR 603.4 · "se" intermediário em gatilho de outra permanente: sem a condição não dispara; com ela, dispara', () => {
  for (const [ganhou, compra] of [[0, 0], [3, 1]]) {
    let s = mesa(['Condicional', 'Urso']), u; [s] = poe(s, 0, 'Condicional'); [s, u] = poe(s, 0, 'Urso', 'hand'); s = comMana(s, 'GG'); s.players[0].lifeGained = ganhou;
    const mao = s.zones[0].hand.length; s = tudo(act(s, conj(s, u)[0])); assert.equal(s.zones[0].hand.length, mao - 1 + compra, 'vida ganha no turno: ' + ganhou);
  }
});

test('CR 605.3 · habilidade de mana pode ser ativada enquanto um efeito pede pagamento ("a menos que pague")', () => {
  let s = mesa(['Urso'], ['Taxa']), u, t, pl, sw; [s, u] = poe(s, 0, 'Urso', 'hand'); [s, t] = poe(s, 1, 'Taxa', 'hand'); [s, pl] = poe(s, 0, 'Plains'); [s, sw] = poe(s, 0, 'Swamp'); s = comMana(s, 'GG');
  s = act(s, conj(s, u)[0]); s = act(s, { t: 'pass', p: 0 }); s = act(s, legais(s, 1, a => a.t === 'cast' && a.oid === t)[0]); s = passaAte(s, x => !!x.pending);
  assert.equal(s.pending.kind, 'may_pay'); assert.equal(legais(s, 0, a => a.t === 'tap_mana').length, 2, 'as duas fontes são oferecidas');
  s = act(s, { t: 'tap_mana', p: 0, oid: sw, option: 0 }); assert.equal(s.pending.kind, 'may_pay', 'a decisão continua pendente'); s = act(s, { t: 'pay', p: 0 });
  assert.equal(s.objects[pl].tapped, false, 'pagou com a mana que o jogador escolheu gerar'); assert.equal(s.objects[u].zone === 'graveyard', false);
});

// ---------------------------------------------------------------- CR2a
test('CR 704.4 · ações de estado não são conferidas no meio da resolução: 3 de dano em si mesmo com 3 de vida e depois ganhar 3 não perde o jogo', () => {
  let s = mesa(['Helice']), h; [s, h] = poe(s, 0, 'Helice', 'hand'); s = comVida(s, 3);
  s = tudo(act(s, conj(s, h, a => a.targets[0].player === 0)[0])); assert.equal(s.players[0].lost || false, false); assert.equal(s.players[0].life, 3); assert.equal(s.status, 'playing');
});

test('CR 704.5 · regra das lendas (704.5j): duas lendárias de mesmo nome com o mesmo controlador — ele escolhe uma, a outra vai para o cemitério, mesmo indestrutível', () => {
  { let s = mesa(['Lenda Eterna']), a, b; [s, a] = poe(s, 0, 'Lenda Eterna'); [s, b] = poe(s, 0, 'Lenda Eterna'); s = act(s, { t: 'pass', p: 0 });
    assert.equal(s.pending.kind, 'legend'); assert.deepEqual(J(legais(s, 0, x => x.t === 'choose_legend').map(x => x.oid)).sort(), [a, b].sort());
    assert.throws(() => act(s, { t: 'pass', p: 0 }), /lendária/); s = act(s, { t: 'choose_legend', p: 0, oid: b });
    assert.equal(s.objects[b].zone, 'battlefield'); assert.equal(s.objects[a].zone, 'graveyard', 'não é destruição: indestrutível não salva'); assert.equal(s.pending, null); }
  { let s = mesa(['Lenda'], ['Lenda']), a, b; [s, a] = poe(s, 0, 'Lenda'); [s, b] = poe(s, 1, 'Lenda'); s = act(s, { t: 'pass', p: 0 }); assert.equal(s.pending, null, 'controladores diferentes: as duas ficam'); assert.equal(s.objects[a].zone, 'battlefield'); assert.equal(s.objects[b].zone, 'battlefield'); }
  { let s = mesa(['Lenda']), a, b; [s, a] = poe(s, 0, 'Lenda'); [s, b] = poe(s, 0, 'Lenda', 'battlefield', { faceDown: true }); s = act(s, { t: 'pass', p: 0 }); assert.equal(s.pending, null, 'virada para baixo não tem nome nem supertipo (708.2)'); }
  { let s = mesa(['Lenda']), ids = []; for (let i = 0; i < 3; i++) { let o; [s, o] = poe(s, 0, 'Lenda'); ids.push(o); } s = act(s, { t: 'pass', p: 0 }); s = act(s, { t: 'choose_legend', p: 0, oid: ids[1] });
    assert.deepEqual(ids.map(o => s.objects[o].zone), ['graveyard', 'battlefield', 'graveyard'], 'três cópias: fica uma'); }
});

test('CR 704.5 · Equipamento anexado a permanente que não é criatura se solta e fica no campo (704.5n)', () => {
  let s = mesa(['Porrete']), e, l; [s, l] = poe(s, 0, 'Plains'); [s, e] = poe(s, 0, 'Porrete'); s = J(s); s.objects[e].attachedTo = l;
  s = act(s, { t: 'pass', p: 0 }); assert.equal(s.objects[e].zone, 'battlefield'); assert.equal(s.objects[e].attachedTo ?? null, null);
});

test('CR 400.7 · objeto que muda de zona vira objeto novo: a mágica que mirava a criatura não acerta a mesma carta depois que ela saiu e voltou', () => {
  let s = mesa(['Raio Verde'], ['Urso Veloz', 'Devolve']), r, u, d; [s, r] = poe(s, 0, 'Raio Verde', 'hand'); [s, u] = poe(s, 1, 'Urso Veloz'); [s, d] = poe(s, 1, 'Devolve', 'hand'); s = comMana(s, 'G');
  s = act(s, conj(s, r, a => a.targets[0].oid === u)[0]); s = act(s, { t: 'pass', p: 0 });
  s = act(s, legais(s, 1, a => a.t === 'cast' && a.oid === d && a.targets[0].oid === u)[0]); s = act(act(s, { t: 'pass', p: 1 }), { t: 'pass', p: 0 }); assert.equal(s.objects[u].zone, 'hand');
  while (s.turn.priority !== 1) s = act(s, { t: 'pass', p: s.turn.priority });
  s = act(s, legais(s, 1, a => a.t === 'cast' && a.oid === u)[0]); s = resolveUm(s); assert.equal(s.objects[u].zone, 'battlefield'); assert.ok(s.stack.includes(r), 'o raio ainda está na pilha');
  s = tudo(s); assert.equal(s.objects[u].zone, 'battlefield', 'a criatura que voltou é outro objeto'); assert.equal(s.objects[u].damage, 0); assert.equal(s.objects[r].zone, 'graveyard');
});

test('CR 603.10 · mortes simultâneas: quem observa "outra criatura sua morre" e morre junto vê as outras (603.10a)', () => {
  let s = mesa(['Carpideira', 'Urso']), a, b, u; [s, a] = poe(s, 0, 'Carpideira'); [s, b] = poe(s, 0, 'Carpideira'); [s, u] = poe(s, 0, 'Urso');
  s = J(s); for (const o of [a, b, u]) s.objects[o].damage = 5;
  s = tudo(act(s, { t: 'pass', p: 0 }), x => legais(x, x.pending.p)[0]);
  assert.deepEqual([a, b, u].map(o => s.objects[o].zone), ['graveyard', 'graveyard', 'graveyard']);
  assert.equal(s.players[0].life, 24, 'cada Carpideira vê a outra e o Urso: quatro gatilhos');
});

test('CR 603.10 · gatilho de saída olha para trás: criatura que morre virada para baixo não dispara a habilidade da face de cima', () => {
  for (const [faceDown, vida] of [[true, 20], [false, 23]]) {
    let s = mesa(['Mortico']), m; [s, m] = poe(s, 0, 'Mortico', 'battlefield', faceDown ? { faceDown: true } : {}); s = J(s); s.objects[m].damage = 2;
    s = tudo(act(s, { t: 'pass', p: 0 })); assert.equal(s.objects[m].zone, 'graveyard'); assert.equal(s.players[0].life, vida, faceDown ? 'virada para baixo' : 'de frente');
    assert.equal(s.objects[m].ultima.faceDown, faceDown, 'a última informação conhecida fica guardada no objeto');
  }
});

test('CR 704.4 · resolução parada numa escolha do jogador também não confere ações de estado: dano, descarte escolhido e só então o ganho de vida', () => {
  let s = mesa(['Helice Lenta', 'Urso']), h; [s, h] = poe(s, 0, 'Helice Lenta', 'hand'); [s] = poe(s, 0, 'Urso', 'hand'); s = comVida(s, 3);
  s = act(s, conj(s, h, a => a.targets[0].player === 0)[0]); s = act(act(s, { t: 'pass', p: 0 }), { t: 'pass', p: 1 });
  assert.equal(s.pending.kind, 'discard'); assert.equal(s.players[0].life, 0, 'no meio da resolução a vida está em 0'); assert.equal(s.status, 'playing', 'e ninguém perdeu ainda');
  s = act(s, legais(s, 0, a => a.t === 'discard')[0]); assert.equal(s.players[0].life, 3); assert.equal(s.players[0].lost || false, false); assert.equal(s.resume, null);
});

// ---------------------------------------------------------------- CR2b
test('CR 603.7 · gatilho atrasado: criado na resolução, dispara uma vez só no início da manutenção do PRÓXIMO turno, controlado por quem conjurou a mágica', () => {
  let s = mesa(['Promessa']), pr; [s, pr] = poe(s, 0, 'Promessa', 'hand');
  s = tudo(act(s, conj(s, pr)[0])); assert.equal(s.atrasados.length, 1, 'a promessa fica registrada'); const turno = s.turn.number;
  const mao = () => s.zones[0].hand.length; let antes = mao();
  s = passaAte(s, x => x.turn.number === turno + 1 && x.turn.step === 'upkeep' && x.stack.length > 0); // manutenção do oponente
  assert.equal(s.turn.active, 1); const ab = s.objects[s.stack[s.stack.length - 1]]; assert.equal(ab.controller, 0, 'quem conjurou controla o gatilho (603.7e)'); assert.equal(ab.name, 'Promessa');
  assert.equal(mao(), antes, 'ainda na pilha: dá para responder'); s = tudo(s); assert.equal(mao(), antes + 1); assert.equal((s.atrasados || []).length, 0, 'dispara uma vez só (603.7b)');
  antes = mao(); s = passaAte(s, x => x.turn.number === turno + 2 && x.turn.step === 'upkeep'); assert.equal(s.stack.length, 0, 'na manutenção seguinte não dispara de novo');
});

test('CR 603.7 · gatilho atrasado preso a um objeto: no início do próximo passo final ele age naquela criatura; se ela saiu e voltou, é outro objeto e nada acontece (603.7c)', () => {
  { let s = mesa(['Emprestimo', 'Urso']), e, u; [s, e] = poe(s, 0, 'Emprestimo', 'hand'); [s, u] = poe(s, 0, 'Urso');
    s = tudo(act(s, conj(s, e, a => a.targets[0].oid === u)[0])); assert.equal(s.objects[u].zone, 'battlefield'); const turno = s.turn.number;
    s = passaAte(s, x => x.turn.step === 'end' && x.stack.length > 0); assert.equal(s.turn.number, turno, 'o passo final DESTE turno'); s = tudo(s); assert.equal(s.objects[u].zone, 'hand', 'devolvida no passo final'); assert.equal((s.atrasados || []).length, 0); }
  { let s = mesa(['Emprestimo', 'Urso Veloz', 'Devolve']), e, u, d; [s, e] = poe(s, 0, 'Emprestimo', 'hand'); [s, u] = poe(s, 0, 'Urso Veloz'); [s, d] = poe(s, 0, 'Devolve', 'hand');
    s = tudo(act(s, conj(s, e, a => a.targets[0].oid === u)[0])); s = tudo(act(s, conj(s, d, a => a.targets[0].oid === u)[0])); s = tudo(act(s, conj(s, u)[0])); assert.equal(s.objects[u].zone, 'battlefield', 'saiu e voltou');
    s = passaAte(s, x => x.turn.step === 'cleanup' || (x.turn.step === 'end' && x.stack.length > 0)); s = tudo(s); assert.equal(s.objects[u].zone, 'battlefield', 'o gatilho não acha mais o objeto que mirou'); }
});

test('CR 603.7 · "no fim do combate": o gatilho atrasado dispara no próximo passo de fim de combate, uma vez', () => {
  let s = mesa(['Grito de Guerra', 'Urso']), g; [s, g] = poe(s, 0, 'Grito de Guerra', 'hand'); [s] = poe(s, 0, 'Urso'); s = tudo(act(s, conj(s, g)[0]));
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers'); s = act(s, { t: 'attack', p: 0, attackers: [] });
  s = passaAte(s, x => x.turn.step === 'main2' && !x.stack.length); assert.equal(s.players[0].life, 22); assert.equal((s.atrasados || []).length, 0);
});

test('CR 603.12 · gatilho reflexivo: "você pode pagar; quando fizer, cause 2 de dano a qualquer alvo" — o alvo é escolhido depois de pagar, e a nova habilidade vai à pilha', () => {
  let s = mesa(['Manticora'], ['Urso']), m, u; [s, m] = poe(s, 0, 'Manticora', 'hand'); [s, u] = poe(s, 1, 'Urso'); s = comMana(s, 'C');
  s = act(s, conj(s, m)[0]); for (let i = 0; i < 8 && !s.pending; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.pending.kind, 'may_pay', 'primeiro a decisão de pagar, ainda sem alvo'); s = act(s, { t: 'pay', p: 0 });
  assert.equal(s.pending.kind, 'pick_target', 'pagou: agora escolhe o alvo da habilidade reflexiva'); const i = s.pending.options.findIndex(o => o.oid === u); assert.ok(i >= 0);
  s = act(s, { t: 'pick_target', p: 0, index: i }); assert.equal(s.stack.length, 1, 'a reflexiva está na pilha: dá para responder'); assert.equal(s.objects[u].zone, 'battlefield');
  s = tudo(s); assert.equal(s.objects[u].zone, 'graveyard');
  // sem pagar, não há segunda habilidade
  let t = mesa(['Manticora'], ['Urso']), m2; [t, m2] = poe(t, 0, 'Manticora', 'hand'); t = comMana(t, 'C'); t = act(t, conj(t, m2)[0]); for (let k = 0; k < 8 && !t.pending; k++) t = act(t, { t: 'pass', p: t.turn.priority });
  t = act(t, { t: 'decline', p: 0 }); assert.equal(t.pending, null); assert.equal(t.stack.length, 0);
});
