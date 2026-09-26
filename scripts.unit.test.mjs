// Camada 1 · scripts de carta (S1, S2, S4, S5) e cenário de cada script da biblioteca.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { engine: E, scripts: S } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));

const card = (name, type_line, extra = {}) => ({ name, type_line, mana_cost: extra.mana_cost || '', cmc: 0, keywords: extra.keywords || [], oracle_text: extra.oracle_text || '',
  ...(extra.pt ? { power: String(extra.pt[0]), toughness: String(extra.pt[1]) } : {}) });
const CARDS = {
  'Island': card('Island', 'Basic Land — Island'),
  'Grizzly Bear': card('Grizzly Bear', 'Creature — Bear', { pt: [2, 2] }),
  'Hexproof Bear': card('Hexproof Bear', 'Creature — Bear', { pt: [2, 2], keywords: ['Hexproof'], oracle_text: 'Hexproof' }),
  'Shroud Ox': card('Shroud Ox', 'Creature — Ox', { pt: [3, 3], keywords: ['Shroud'], oracle_text: 'Shroud' }),
  'Steel Wall': card('Steel Wall', 'Artifact Creature — Wall', { pt: [0, 4], keywords: ['Defender', 'Indestructible'], oracle_text: 'Defender, indestructible' }),
  'Odd Stone': card('Odd Stone', 'Artifact', { oracle_text: '{T}: Add {C}.\nAt the beginning of your upkeep, something odd happens.' }),
  'Preordain': card('Preordain', 'Sorcery', { oracle_text: 'Scry 2, then draw a card.' }),
  'Sem Script': card('Sem Script', 'Sorcery', { oracle_text: 'Faz algo que o motor não entende.' }),
  'Mystery Enchantment': card('Mystery Enchantment', 'Enchantment', { oracle_text: 'At the beginning of your upkeep, do something strange.' }),
  'Test Signet': card('Test Signet', 'Artifact', { oracle_text: '{T}: Add {C}.' }),
  'Test Forest': card('Test Forest', 'Basic Land — Forest', { oracle_text: '' }),
  'Test Ward': card('Test Ward', 'Enchantment', { oracle_text: '' })
};
// tipo de cada carta da biblioteca: mágica instantânea quando o efeito pede resposta; permanentes pelo mapa abaixo
const PERM_TYPES = { 'Elvish Visionary': 'Creature — Elf Shaman', 'Prodigal Sorcerer': 'Creature — Human Wizard', 'Cunning Sparkmage': 'Creature — Human Shaman',
  'Rod of Ruin': 'Artifact', 'Icy Manipulator': 'Artifact', 'Aether Spellbomb': 'Artifact', 'Mind Stone': 'Artifact',
  'Ichor Wellspring': 'Artifact', "Tormod's Crypt": 'Artifact',
  'Rancor': 'Enchantment — Aura', 'Ethereal Armor': 'Enchantment — Aura', 'Ancestral Mask': 'Enchantment — Aura',
  "Sentinel's Eyes": 'Enchantment — Aura', 'Spirit Link': 'Enchantment — Aura', 'Lifelink': 'Enchantment — Aura',
  'Angelic Gift': 'Enchantment — Aura', 'Flickering Ward': 'Enchantment — Aura', 'Skullclamp': 'Artifact — Equipment',
  'Utopia Sprawl': 'Enchantment — Aura', 'Abundant Growth': 'Enchantment — Aura', 'Armadillo Cloak': 'Enchantment — Aura',
  'Benevolent Blessing': 'Enchantment — Aura', 'Silhana Ledgewalker': 'Creature — Elf Rogue', 'Aura Gnarlid': 'Creature — Beast',
  'Thraben Inspector': 'Creature — Human Soldier', 'Novice Inspector': 'Creature — Human Detective', 'Squadron Hawk': 'Creature — Bird',
  'Kor Skyfisher': 'Creature — Kor Soldier', 'Zulaport Cutthroat': 'Creature — Human Rogue', 'Cruel Celebrant': 'Creature — Vampire',
  'Corpse Knight': 'Creature — Zombie Knight', 'Elvish Vanguard': 'Creature — Elf Warrior', 'Bojuka Bog': 'Land',
  'Priest of Titania': 'Creature — Elf Druid', 'Overgrown Battlement': 'Creature — Wall', 'Axebane Guardian': 'Creature — Human Druid',
  'Timberwatch Elf': 'Creature — Elf Warrior', 'Valakut Invoker': 'Creature — Human Shaman', 'Bloodrite Invoker': 'Creature — Vampire Shaman',
  'Ninja of the Deep Hours': 'Creature — Human Ninja', 'Moon-Circuit Hacker': 'Creature — Human Ninja',
  'Tinder Wall': 'Creature — Plant Wall', 'Krark-Clan Shaman': 'Creature — Goblin Shaman',
  'Saheeli, Sublime Artificer': 'Legendary Planeswalker — Saheeli',
  'Voldaren Epicure': 'Creature — Vampire', 'Sheltering Landscape': 'Land', 'Bojuka Bog': 'Land',
  'Setessan Training': 'Enchantment — Aura', 'Kitchen Imp': 'Creature — Imp', 'Writhing Chrysalis': 'Creature — Eldrazi Drone',
  'Springleaf Drum': 'Artifact', 'Jaspera Sentinel': 'Creature — Elf Warrior', 'Birchlore Rangers': 'Creature — Elf Druid',
  'Lys Alana Huntmaster': 'Creature — Elf Warrior', 'Lunarch Veteran': 'Creature — Human Cleric', 'Sagu Wildling': 'Creature — Dragon',
  'Sorin of House Markov': 'Legendary Creature — Human Noble', 'Kytheon, Hero of Akros': 'Legendary Creature — Human Soldier',
  'Izzet Signet': 'Artifact', 'Orzhov Signet': 'Artifact', 'Arcane Signet': 'Artifact', 'Talisman of Creativity': 'Artifact',
  'Talisman of Hierarchy': 'Artifact', 'Fellwar Stone': 'Artifact', 'Lotus Petal': 'Artifact', 'Chromatic Sphere': 'Artifact',
  'Chromatic Star': 'Artifact', 'Soul-Guide Lantern': 'Artifact', 'Nihil Spellbomb': 'Artifact', 'Lembas': 'Artifact',
  'Faerie Seer': 'Creature — Faerie Wizard', 'Faerie Miscreant': 'Creature — Faerie Rogue', 'Spellstutter Sprite': 'Creature — Faerie Wizard',
  'Brinebarrow Intruder': 'Creature — Human Rogue', 'Harrier Strix': 'Creature — Bird',
  'Quirion Ranger': 'Creature — Elf Ranger', 'Shield-Wall Sentinel': 'Creature — Wall', 'Drift of Phantasms': 'Creature — Spirit',
  'Orochi Leafcaller': 'Creature — Snake Shaman', 'Saruli Caretaker': 'Creature — Dryad', 'Scattershot Archer': 'Creature — Elf Archer',
  'Standard Bearer': 'Creature — Human Flagbearer', 'Martyr of Sands': 'Creature — Human Cleric' };
const LOYALTY = { 'Saheeli, Sublime Artificer': 5 };
const instantish = sc => (sc.modes || []).length > 0 || (sc.effects || []).some(e => ['counter', 'pump', 'bounce', 'tap', 'untap'].includes(e.do)) || /spell/.test(sc.example.target || '');
for (const sc of S.RAW_SCRIPTS) {
  CARDS[sc.name] = card(sc.name, PERM_TYPES[sc.name] || (instantish(sc) ? 'Instant' : 'Sorcery'),
    PERM_TYPES[sc.name] && /Creature/.test(PERM_TYPES[sc.name]) ? { pt: [1, 1] } : {});
  if (LOYALTY[sc.name]) CARDS[sc.name].loyalty = String(LOYALTY[sc.name]);
}
CARDS['Lightning Bolt'].type_line = 'Instant'; CARDS['Shock'].type_line = 'Instant'; CARDS['Lightning Helix'].type_line = 'Instant';
CARDS['Murder'].type_line = 'Instant'; CARDS['Doom Blade'].type_line = 'Instant'; CARDS['Disenchant'].type_line = 'Instant';
// as criaturas e artefatos do cenário precisam de cor para os modos condicionais (Hydroblast e cia.)
CARDS['Grizzly Bear'].colors = ['R', 'U']; CARDS['Test Signet'].colors = ['R', 'U'];
CARDS['Grizzly Bear'].cmc = 2; // Spell Snare precisa de um alvo de valor 2

const DECK = [{ name: 'Island', qty: 30, zone: 'main' }, { name: 'Grizzly Bear', qty: 6, zone: 'main' }, { name: 'Test Signet', qty: 2, zone: 'main' }, { name: 'Test Forest', qty: 4, zone: 'main' }, { name: 'Test Ward', qty: 2, zone: 'main' },
  { name: 'Hexproof Bear', qty: 2, zone: 'main' }, { name: 'Shroud Ox', qty: 2, zone: 'main' }, { name: 'Steel Wall', qty: 2, zone: 'main' },
  ...S.RAW_SCRIPTS.map(sc => ({ name: sc.name, qty: 2, zone: 'main' }))];
const setup = (seed = 1) => ({ format: 'livre', seed, mode: 'assisted', manaCheck: false, cards: CARDS, players: [{ name: 'A', deck: DECK }, { name: 'B', deck: DECK }] });

function game(seed = 1) {
  let s = E.createGame(setup(seed));
  for (let p = 0; p < 2; p++) s = E.apply(s, { t: 'keep', p, bottom: [] }).state;
  for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = E.apply(s, { t: 'pass', p: s.turn.priority }).state;
  return s;
}
function put(s, p, name, zone = 'battlefield', opts = {}) {
  s = J(s);
  const from = ['library', 'hand'].map(z => s.zones[p][z]).find(z => z.some(o => s.objects[o].name === name));
  const oid = from.find(o => s.objects[o].name === name);
  from.splice(from.indexOf(oid), 1); s.zones[p][zone].push(oid);
  Object.assign(s.objects[oid], { zone, sick: false, ...opts });
  return [s, oid];
}
const act = (s, a) => E.apply(s, a).state;
const resolve = s => { const a = s.turn.priority; s = act(s, { t: 'pass', p: a }); return act(s, { t: 'pass', p: s.turn.priority }); };

/* ---------------- S1 · formato e validador ---------------- */
const OK_EXAMPLE = { target: 'opponent', expect: { opponentLife: -3 } };
test('S1 · validador recusa script sem efeito, com efeito desconhecido, sem campo, com alvo errado e sem cenário', () => {
  assert.deepEqual([...S.validateScript({ name: 'X', effects: [{ do: 'damage', amount: 3, target: 'any' }], example: OK_EXAMPLE })], []);
  assert.match(S.validateScript({ name: 'X', effects: [{ do: 'draw', amount: 1 }] }).join(), /sem cenário/);
  assert.match(S.validateScript({ name: 'X', effects: [{ do: 'draw', amount: 1 }], example: { target: 'marte', expect: { handDelta: 1 } } }).join(), /alvo "marte" desconhecido/);
  assert.match(S.validateScript({ name: 'X', effects: [{ do: 'draw', amount: 1 }], example: { expect: { sorte: 1 } } }).join(), /verificação "sorte" desconhecida/);
  assert.match(S.validateScript({ name: 'X', effects: [] }).join(), /sem efeitos/);
  assert.match(S.validateScript({ name: 'X', effects: [{ do: 'teletransportar' }] }).join(), /desconhecido/);
  assert.match(S.validateScript({ name: 'X', effects: [{ do: 'damage', target: 'any' }] }).join(), /amount: precisa ser inteiro ou contagem/);
  assert.match(S.validateScript({ name: 'X', effects: [{ do: 'counter', target: 'creature' }] }).join(), /alvo "creature" não vale/);
  assert.match(S.validateScript({ effects: [{ do: 'draw', amount: 1 }], example: { expect: { handDelta: 1 } } }).join(), /sem nome/);
});

test('S1 · a biblioteca inteira é válida e só vale para mágicas', () => {
  assert.deepEqual(J(S.SCRIPT_ERRORS), {});
  assert.equal(Object.keys(S.SCRIPTS).length, S.RAW_SCRIPTS.length);
  const s = E.createGame({ ...setup(2), scripts: { 'Grizzly Bear': { name: 'Grizzly Bear', effects: [{ do: 'draw', amount: 9 }] }, 'Bad': { name: 'Bad', effects: [] } } });
  assert.equal(s.facts['Grizzly Bear'].script, null, 'criatura não recebe script de mágica');
  assert.equal(s.facts['Lightning Bolt'].script.effects[0].amount, 3);
});

/* ---------------- S2 · cobertura ---------------- */
test('S2 · nível de cobertura por carta', () => {
  const lv = c => S.coverage(c).level;
  assert.equal(lv(CARDS['Lightning Bolt']), 'completo', 'tem script');
  assert.equal(lv(CARDS['Grizzly Bear']), 'completo', 'baunilha');
  assert.equal(lv(CARDS['Steel Wall']), 'completo', 'só palavras-chave conhecidas');
  assert.equal(lv(CARDS['Island']), 'completo');
  assert.equal(lv(CARDS['Odd Stone']), 'parcial', 'mana conhecida + texto que o motor não resolve');
  assert.equal(lv(CARDS['Mind Stone']), 'completo', 'a habilidade virou script');
  assert.equal(lv(CARDS['Sem Script']), 'manual', 'mágica sem script');
  assert.equal(lv(CARDS['Preordain']), 'completo', 'Preordain agora tem script (scry)');
  assert.equal(lv(CARDS['Mystery Enchantment']), 'manual');
  assert.equal(lv({ name: 'Desconhecida' }), 'manual');
});

test('S2 · cobertura da lista: percentual, contagem e o que falta; reserva não conta', () => {
  const cards = new Map(Object.entries(CARDS).map(([k, v]) => [k, v]));
  const cov = S.deckCoverage([{ name: 'Lightning Bolt', qty: 4, zone: 'main' }, { name: 'Grizzly Bear', qty: 4, zone: 'main' },
    { name: 'Sem Script', qty: 2, zone: 'main' }, { name: 'Odd Stone', qty: 2, zone: 'main' }, { name: 'Preordain', qty: 10, zone: 'side' }], cards);
  assert.deepEqual({ c: cov.completo, p: cov.parcial, m: cov.manual, total: cov.total, pct: cov.pct }, { c: 8, p: 2, m: 2, total: 12, pct: 67 });
  assert.deepEqual([...cov.worst].sort(), ['Odd Stone', 'Sem Script']);
});

/* ---------------- S4 · efeitos ---------------- */
test('S4 · dano, destruir, devolver, anular, comprar, vida e pump', () => {
  let s = game(3); const a = s.turn.active, d = 1 - a;
  let bolt, bear, murder, unsummon, growth, div;
  [s, bear] = put(s, d, 'Grizzly Bear');
  [s, bolt] = put(s, a, 'Lightning Bolt', 'hand');
  s = resolve(act(s, { t: 'cast', p: a, oid: bolt, targets: [{ player: d }] }));
  assert.equal(s.players[d].life, 17);

  [s, murder] = put(s, a, 'Murder', 'hand');
  s = resolve(act(s, { t: 'cast', p: a, oid: murder, targets: [{ oid: bear }] }));
  assert.equal(s.objects[bear].zone, 'graveyard');

  let bear2; [s, bear2] = put(s, d, 'Grizzly Bear');
  [s, unsummon] = put(s, a, 'Unsummon', 'hand');
  s = resolve(act(s, { t: 'cast', p: a, oid: unsummon, targets: [{ oid: bear2 }] }));
  assert.equal(s.objects[bear2].zone, 'hand');

  let bear3; [s, bear3] = put(s, a, 'Grizzly Bear');
  [s, growth] = put(s, a, 'Giant Growth', 'hand');
  s = resolve(act(s, { t: 'cast', p: a, oid: growth, targets: [{ oid: bear3 }] }));
  assert.deepEqual(J(s.objects[bear3].pump), { p: 3, t: 3 });

  const hand = s.zones[a].hand.length;
  [s, div] = put(s, a, 'Divination', 'hand');
  s = resolve(act(s, { t: 'cast', p: a, oid: div }));
  assert.equal(s.zones[a].hand.length, hand + 2 - 1 + 1, 'comprou 2, gastou a carta (e o put tirou do grimório)');
});

test('S4 · efeito até o fim do turno acaba na limpeza; indestrutível resiste a destruir', () => {
  let s = game(4); const a = s.turn.active;
  let wall, growth, disen;
  [s, wall] = put(s, a, 'Steel Wall');
  [s, growth] = put(s, a, 'Giant Growth', 'hand');
  s = resolve(act(s, { t: 'cast', p: a, oid: growth, targets: [{ oid: wall }] }));
  [s, disen] = put(s, a, 'Disenchant', 'hand');
  const r = E.apply(act(s, { t: 'cast', p: a, oid: disen, targets: [{ oid: wall }] }), { t: 'pass', p: a });
  const r2 = E.apply(r.state, { t: 'pass', p: r.state.turn.priority });
  assert.equal(r2.state.objects[wall].zone, 'battlefield');
  assert.ok(r2.events.some(e => e.do === 'destroy' && e.failed), 'o registro diz que não destruiu');
  let t = r2.state;
  for (let i = 0; i < 40 && t.turn.number === s.turn.number; i++) { t = t.pending ? act(t, { t: 'discard', p: t.pending.p, oid: t.zones[t.pending.p].hand[0] }) : act(t, { t: 'pass', p: t.turn.priority }); }
  assert.equal(t.objects[wall].pump, undefined, 'o +3/+3 não passa do turno');
});

test('S4 · Vapor Snag: devolve e o controlador do alvo perde 1', () => {
  let s = game(5); const a = s.turn.active, d = 1 - a;
  let bear, snag;
  [s, bear] = put(s, d, 'Grizzly Bear');
  [s, snag] = put(s, a, 'Vapor Snag', 'hand');
  s = resolve(act(s, { t: 'cast', p: a, oid: snag, targets: [{ oid: bear }] }));
  assert.equal(s.objects[bear].zone, 'hand');
  assert.equal(s.players[d].life, 19);
  assert.equal(s.players[a].life, 20);
});

/* ---------------- S5 · alvos ---------------- */
test('S5 · maldição de véu e proteção; anular só pega mágica do tipo certo', () => {
  let s = game(6); const a = s.turn.active, d = 1 - a;
  let hex, ox, mine, bolt;
  [s, hex] = put(s, d, 'Hexproof Bear'); [s, ox] = put(s, d, 'Shroud Ox'); [s, mine] = put(s, a, 'Hexproof Bear');
  [s, bolt] = put(s, a, 'Lightning Bolt', 'hand');
  const targets = E.legalTargets(s, a, 'creature');
  assert.ok(!targets.some(t => t.oid === hex), 'protegida do oponente não pode ser alvo');
  assert.ok(!targets.some(t => t.oid === ox), 'maldição de véu não pode ser alvo de ninguém');
  assert.ok(targets.some(t => t.oid === mine), 'a sua protegida você mesmo pode mirar');
  assert.throws(() => act(s, { t: 'cast', p: a, oid: bolt, targets: [{ oid: hex }] }), /alvo ilegal/);
  assert.throws(() => act(s, { t: 'cast', p: a, oid: bolt }), /escolha 1 alvo/);

  let bear, scatter, negate;
  [s, bear] = put(s, a, 'Grizzly Bear', 'hand');
  s = act(s, { t: 'cast', p: a, oid: bear });
  [s, negate] = put(s, d, 'Negate', 'hand');
  assert.equal(E.legalTargets(s, d, 'noncreature-spell').length, 0, 'Negate não pega mágica de criatura');
  [s, scatter] = put(s, d, 'Essence Scatter', 'hand');
  s = act(s, { t: 'pass', p: a });
  s = act(s, { t: 'cast', p: d, oid: scatter, targets: [{ oid: bear }] });
  s = resolve(s);
  assert.equal(s.objects[bear].zone, 'graveyard', 'criatura anulada vai para o cemitério');
});

test('S5 · alvo que some antes da resolução anula a mágica (608.2b)', () => {
  let s = game(7); const a = s.turn.active, d = 1 - a;
  let bear, bolt, bolt2;
  [s, bear] = put(s, d, 'Grizzly Bear');
  [s, bolt] = put(s, a, 'Lightning Bolt', 'hand'); [s, bolt2] = put(s, a, 'Lightning Bolt', 'hand');
  s = act(s, { t: 'cast', p: a, oid: bolt, targets: [{ oid: bear }] });
  s = act(s, { t: 'cast', p: a, oid: bolt2, targets: [{ oid: bear }] });
  const r1 = E.apply(E.apply(s, { t: 'pass', p: a }).state, { t: 'pass', p: d }); // resolve o segundo: mata o urso
  assert.equal(r1.state.objects[bear].zone, 'graveyard');
  const r2 = E.apply(E.apply(r1.state, { t: 'pass', p: a }).state, { t: 'pass', p: d });
  assert.ok(r2.events.some(e => e.kind === 'fizzled'), 'sem alvo legal, a mágica é anulada na resolução');
  assert.equal(r2.state.players[d].life, 20, 'e não causa dano a ninguém');
  assert.equal(r2.state.objects[bolt].zone, 'graveyard');
});

/* ---------------- S8 · cenário declarado em cada script ---------------- */
/** Monta a mesa que o cenário pede, conjura e confere o que ele promete. */
function runExample(sc) {
  let s = game(8); const a = s.turn.active, d = 1 - a;
  let mine, theirs, art, spellOid = null, oid;
  [s, theirs] = put(s, d, 'Grizzly Bear');
  [s, mine] = put(s, a, 'Grizzly Bear');
  [s, art] = put(s, d, 'Test Signet');
  let land; [s, land] = put(s, a, 'Island');
  let buriedMine; [s, buriedMine] = put(s, a, 'Grizzly Bear', 'graveyard'); // carta no seu cemitério, para efeitos de recursão
  let myArt; [s, myArt] = put(s, a, 'Test Signet'); // artefato seu, para custos de sacrifício
  let myForest; [s, myForest] = put(s, a, 'Test Forest'); // Floresta sua, para custos de devolver terreno
  let enemyWard; [s, enemyWard] = put(s, d, 'Test Ward'); // encantamento do oponente, como alvo
  let mine2; [s, mine2] = put(s, a, 'Grizzly Bear'); // segunda criatura sua, para custos de virar outras
  const ex = sc.example, want = ex.expect;
  if (ex.target === 'enemy-spell' || ex.target === 'enemy-instant') {
    // põe uma mágica do oponente na pilha (o cenário só precisa dela lá)
    // a mágica na pilha precisa combinar com o que o script mira
    const wantKind = [...(sc.effects || []), ...(sc.modes || []).flatMap(m => m.effects || [])].map(e => e.target).find(x => /spell/.test(x || '')) || '';
    const spellName = wantKind === 'artifact-enchantment-spell' ? 'Test Signet' : (ex.target === 'enemy-instant' || wantKind === 'instant-spell') ? 'Lightning Bolt' : 'Grizzly Bear';
    [s, spellOid] = put(s, d, spellName, 'hand');
    s = J(s);
    s.zones[d].hand = s.zones[d].hand.filter(x => x !== spellOid);
    s.stack.push(spellOid);
    Object.assign(s.objects[spellOid], { zone: 'stack', controller: d });
    if (ex.target === 'enemy-instant') s.objects[spellOid].targets = [{ player: a }];
  }
  // um cemitério com carta, para os efeitos que mexem nele
  s = J(s); const buried = s.zones[d].library.pop(); s.zones[d].graveyard.push(buried); s.objects[buried].zone = 'graveyard';
  const how = ex.action || 'cast';
  [s, oid] = put(s, a, sc.name, how.startsWith('activate') || how.startsWith('loyalty') || how === 'equip' ? 'battlefield' : 'hand');
  if (how.startsWith('loyalty')) { s = JSON.parse(JSON.stringify(s)); s.objects[oid].counters.loyalty = LOYALTY[sc.name] || 3; }
  const ownSweep = [...(sc.effects || []), ...(sc.abilities || []).flatMap(x => x.effects || [])].some(e => e.target === 'each-own-creature');
  const watch = ex.target === 'own-creature' || ownSweep ? mine : ex.target === 'enemy-enchantment' ? enemyWard : ex.target === 'enemy-permanent' ? art : spellOid || theirs;
  const target = { 'opponent': { player: d }, 'self-player': { player: a }, 'enemy-creature': { oid: theirs },
    'own-creature': { oid: mine }, 'own-land': { oid: land }, 'own-graveyard-creature': { oid: buriedMine }, 'enemy-spell': { oid: spellOid }, 'enemy-instant': { oid: spellOid }, 'enemy-permanent': { oid: art }, 'enemy-enchantment': { oid: enemyWard } }[ex.target || 'none'];
  const tokensOf = st2 => Object.values(st2.objects).filter(o => o.token && o.controller === a).length;
  const before = { life: s.players.map(p => p.life), hand: s.zones[a].hand.length, total: Object.values(s.objects).filter(o => !o.ability && !o.token).length, tokens: tokensOf(s) };
  // equipar é a última habilidade ativada do script
  const equipIndex = ((sc.abilities || []).filter(x => x.kind === 'activated').length);
  const isLand = /\bLand\b/.test(CARDS[sc.name].type_line);
  // S18 · ninjutsu: precisa de um atacante seu sem bloqueio; insanidade: precisa descartar a carta
  if (how === 'ninjutsu') {
    for (let g = 0; g < 30 && s.turn.step !== 'combat_attackers'; g++) s = act(s, { t: 'pass', p: s.turn.priority });
    s = act(s, { t: 'attack', p: a, attackers: [mine] });
    for (let g = 0; g < 10 && s.turn.step !== 'combat_blockers'; g++) s = act(s, { t: 'pass', p: s.turn.priority });
    if (s.pending && s.pending.kind === 'blockers') s = act(s, { t: 'block', p: s.pending.p, blocks: [] });
  }
  if (how === 'madness') s = act(s, { t: 'discard', p: a, oid });
  if (how === 'disturb') { s = JSON.parse(JSON.stringify(s)); s.zones[a].hand = s.zones[a].hand.filter(x => x !== oid); s.zones[a].graveyard.push(oid); s.objects[oid].zone = 'graveyard'; }
  if (how === 'flashback') { s = JSON.parse(JSON.stringify(s)); s.zones[a].hand = s.zones[a].hand.filter(x => x !== oid); s.zones[a].graveyard.push(oid); s.objects[oid].zone = 'graveyard'; }
  const loyaltyIndex = ((sc.abilities || []).filter(x => x.kind === 'activated').length) + (sc.equip ? 1 : 0);
  const action = how === 'transmute' ? { t: 'transmute', p: a, oid }
    : how === 'disturb' ? { t: 'cast', p: a, oid, disturb: true }
    : how === 'omen' ? (E.legalActions(s, a).find(x => x.t === 'cast' && x.oid === oid && x.omen) || { t: 'cast', p: a, oid, omen: true })
    : how.startsWith('loyalty') ? { t: 'activate', p: a, oid, index: loyaltyIndex + Number(how.split(':')[1]), ...(target ? { targets: [target] } : {}) }
    : how === 'ninjutsu' ? { t: 'ninjutsu', p: a, oid, attacker: mine }
    : how === 'madness' ? { t: 'cast_madness', p: a, ...(target ? { targets: [target] } : {}) }
    : (isLand && !how.startsWith('activate')) ? { t: 'play_land', p: a, oid }
    : how === 'flashback' ? { t: 'cast', p: a, oid, flashback: true, ...(target ? { targets: [target] } : {}) }
    : how.startsWith('alt') ? (() => {
      const found = E.legalActions(s, a).find(x => x.t === 'cast' && x.oid === oid && x.alt === Number(how.split(':')[1]));
      return found ? { ...found, ...(target ? { targets: [target] } : {}) } : { t: 'cast', p: a, oid, alt: Number(how.split(':')[1]), ...(target ? { targets: [target] } : {}) };
    })()
    : how.startsWith('mode') ? { t: 'cast', p: a, oid, mode: Number(how.split(':')[1]), ...(target ? { targets: [target] } : {}) }
    : how === 'equip' ? { t: 'activate', p: a, oid, index: equipIndex, targets: [{ oid: mine }] }
    : how.startsWith('activate') ? { t: 'activate', p: a, oid, index: Number(how.split(':')[1]), ...(target ? { targets: [target] } : {}) }
      : { t: 'cast', p: a, oid, ...(target ? { targets: [target] } : {}) };
  const oferta = E.legalActions(s, a).find(x => x.t === action.t && x.oid === oid && (x.index || 0) === (action.index || 0) && x.color);
  if (oferta) action.color = oferta.color;
  // efeito com mais de um alvo: usa a combinação que a própria mesa oferece
  const precisa = [...(sc.effects || []), ...((sc.modes || [])[action.mode || 0] || {}).effects || []].filter(e => S.isTargeted(e)).length;
  if (precisa > 1) {
    const multi = E.legalActions(s, a).find(x => x.t === action.t && x.oid === oid && (x.mode || 0) === (action.mode || 0) && (x.targets || []).length === precisa);
    if (multi) action.targets = JSON.parse(JSON.stringify(multi.targets));
  }
  assert.ok(E.legalActions(s, a).some(x => x.t === action.t && (x.oid === oid || action.t === 'cast_madness') && !!x.disturb === !!action.disturb && !!x.omen === !!action.omen && (x.index || 0) === (action.index || 0) && (x.mode || 0) === (action.mode || 0)
    && (x.alt == null ? -1 : x.alt) === (action.alt == null ? -1 : action.alt) && !!x.flashback === !!action.flashback
    && JSON.stringify(x.targets || null) === JSON.stringify(action.targets || null)),
    `${sc.name}: a mesa não ofereceu a ação do cenário`);
  const manaPower = x => { const o = E.productions(s, s.objects[land]); return [o.length, Math.max(0, ...o.map(y => y.length))].join(':'); };
  const baseMana = manaPower();
  s = act(s, action);
  if (s.stack.length && !s.pending) s = resolve(s); // habilidade de mana não usa a pilha
  let discarded = 0, picked = 0, pickOpened = false, watchOverride = null;
  // resolve tudo o que a mágica abriu: escolhas, gatilhos e o que ficou na pilha
  for (let guard = 0; guard < 20; guard++) {
    const pd = s.pending;
    if (pd && pd.p === a && pd.kind === 'choose_color') { s = act(s, { t: 'choose_color', p: a, color: 'G' }); continue; }
    if (pd && pd.p === a && pd.kind === 'pick_target') {
      const opt = pd.options[0];
      if (opt && opt.oid) watchOverride = opt.oid;
      s = act(s, { t: 'pick_target', p: a, index: 0 }); continue;
    }
    if (pd && pd.kind === 'may_pay' && pd.p === d) { s = act(s, { t: 'decline', p: d }); continue; }
    if (pd && pd.p === a && pd.kind === 'discard') { s = act(s, { t: 'discard', p: a, oid: s.zones[a].hand[0] }); discarded++; continue; }
    if (pd && pd.p === a && pd.kind === 'pick') {
      pickOpened = true;
      const opts = E.legalActions(s, a);
      const one = opts.find(x => x.t === 'pick');
      if (one && (picked === 0 || pd.min > pd.picked.length)) { s = act(s, one); picked++; }
      else if (opts.some(x => x.t === 'pick_done')) s = act(s, { t: 'pick_done', p: a });
      else break;
      continue;
    }
    if (pd) break;
    if (s.stack.length) { s = resolve(s); continue; }
    break;
  }
  const isPermanentCard = !!PERM_TYPES[sc.name] || how === 'disturb' || how === 'omen' || how === 'transmute';
  if (!isPermanentCard && (!isLand || how.startsWith('activate')) && (how === 'cast' || how === 'madness' || how.startsWith('mode') || how.startsWith('alt'))) assert.equal(s.objects[oid].zone, 'graveyard', `${sc.name} deveria ir para o cemitério`);
  if (how === 'aura' || how === 'equip') assert.equal(s.objects[oid].attachedTo, ex.target === 'own-land' ? land : mine, `${sc.name} deveria estar anexada`);
  const o = s.objects[watchOverride || watch];
  for (const [check, value] of Object.entries(want)) {
    const msg = `${sc.name} · ${check}`;
    if (check === 'opponentLife') assert.equal(s.players[d].life - before.life[d], value, msg);
    if (check === 'selfLife') assert.equal(s.players[a].life - before.life[a], value, msg);
    if (check === 'gone') assert.equal(o.zone !== 'battlefield' && o.zone !== 'stack', value, msg);
    if (check === 'bounced') assert.equal(o.zone === 'hand', value, msg);
    if (check === 'countered') assert.equal(o.zone === 'graveyard' && !s.stack.includes(watch), value, msg);
    if (check === 'tapped') assert.equal(o.tapped, value, msg);
    if (check === 'pump') assert.deepEqual([o.pump.p, o.pump.t], [...value], msg);
    if (check === 'handDelta') assert.equal(s.zones[a].hand.length + discarded - (how.startsWith('activate') ? before.hand : before.hand - 1), value, msg);
    if (check === 'damaged') assert.ok(o.damage > 0 || (o.pump && o.pump.t < 0), msg);
    if (check === 'graveyardEmpty') assert.equal(s.zones[d].graveyard.length === 0, value, msg);
    if (check === 'stats') { const st = E.stats(s, s.objects[mine]); assert.deepEqual([st.power, st.toughness], [...value], msg); }
    if (check === 'keyword') assert.equal(E.hasKeyword(s, s.objects[mine], value) || E.hasKeyword(s, s.objects[oid], value), true, msg);
    if (check === 'attached') assert.equal(!!s.objects[oid].attachedTo, value, msg);
    if (check === 'mana') assert.notEqual(manaPower(), baseMana, msg + ': o terreno precisa produzir mais ou outra coisa');
    if (check === 'protected') assert.equal(E.protections(s, s.objects[mine]).length > 0, value, msg);
    if (check === 'prevented') assert.equal(E.prevented(s, s.objects[mine]), value, msg);
    if (check === 'tokens') assert.equal(tokensOf(s) - before.tokens, value, msg);
    if (check === 'discarded') assert.equal(discarded, value, msg);
    if (check === 'picked') assert.ok(pickOpened, msg + ': o cenário precisa abrir uma escolha de cartas');
    if (check === 'milled') assert.equal(s.zones[d].graveyard.length - 1, value, msg);
    if (check === 'exiled') assert.equal(s.objects[oid].zone === 'exile', value, msg);
    if (check === 'attacked') assert.equal(s.objects[oid].attacking != null, value, msg);
    if (check === 'returned') assert.equal(s.objects[buriedMine].zone === 'hand', value, msg);
    if (check === 'reanimated') assert.equal(s.objects[buriedMine].zone === 'battlefield', value, msg);
    if (check === 'poolAdded') assert.equal(E.COLORS.reduce((n, c) => n + s.players[a].pool[c], 0), value, msg);
    if (check === 'loyalty') assert.equal(s.objects[oid].counters.loyalty, value, msg);
    if (check === 'tappedOnEntry') assert.equal(s.objects[oid].tapped, value, msg);
    if (check === 'untapped') assert.equal(s.objects[mine].tapped, !value, msg);
    if (check === 'fogged') assert.equal(!!s.fogged, value, msg);
    if (check === 'preventedColor') assert.equal((s.preventedColors || []).length > 0, value, msg);
    if (check === 'transformed') assert.equal(s.objects[oid].name !== sc.name, value, msg);
  }
}

test('S8 · cada script da biblioteca passa no cenário que ele mesmo declara', () => {
  assert.ok(S.RAW_SCRIPTS.length >= 45, 'a biblioteca precisa cobrir as mágicas comuns');
  for (const sc of S.RAW_SCRIPTS) { try { runExample(sc); } catch (e) { throw new Error(`${sc.name}: ${e.message}`); } }
});

test('S2 · script que cobre só parte da carta conta como parcial', () => {
  const partial = S.RAW_SCRIPTS.find(sc => sc.covers === 'partial');
  assert.ok(partial && partial.note, 'scripts parciais precisam dizer o que falta');
  const cov = S.coverage({ name: partial.name, type_line: 'Instant', oracle_text: 'x' });
  assert.equal(cov.level, 'parcial');
  assert.match(cov.reason, /ainda não entra/);
});

test('S4 · exilar o cemitério do alvo e varredura só nas suas criaturas', () => {
  let s = game(9); const a = s.turn.active, d = 1 - a;
  let crypt, mine, theirs;
  [s, mine] = put(s, a, 'Grizzly Bear'); [s, theirs] = put(s, d, 'Grizzly Bear');
  s = JSON.parse(JSON.stringify(s));
  const buried = s.zones[d].library.pop(); s.zones[d].graveyard.push(buried); s.objects[buried].zone = 'graveyard';
  [s, crypt] = put(s, a, "Tormod's Crypt");
  s = resolve(act(s, { t: 'activate', p: a, oid: crypt, index: 0, targets: [{ player: d }] }));
  assert.equal(s.zones[d].graveyard.length, 0);
  assert.equal(s.objects[crypt].zone, 'graveyard', 'foi sacrificado no custo');

  let rally; [s, rally] = put(s, a, 'Rally the Peasants', 'hand');
  s = resolve(act(s, { t: 'cast', p: a, oid: rally }));
  assert.deepEqual([s.objects[mine].pump.p, s.objects[mine].pump.t], [2, 0]);
  assert.equal(s.objects[theirs].pump, undefined, 'a criatura do oponente não recebe nada');
});
