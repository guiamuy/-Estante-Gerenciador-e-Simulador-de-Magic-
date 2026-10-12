// Trilha keywords (CR4 · 702) · regras de palavra-chave lidas pelo motor a partir da palavra-chave impressa.
// Texto das regras: .regras/cr-2026-09-25.txt. Cada teste leva o número da regra e falha na versão anterior à leva citada.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { engine: E, scripts: S } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));
const act = (s, a) => E.apply(s, a).state;

const terra = n => ({ name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, colors: [], keywords: [], oracle_text: '' });
/** Partida livre em modo assistido, parada na 1ª fase principal, com as cartas e scripts dados (baralho: 4 de cada + 20 Florestas). */
function partida(cards, scripts = {}, seed = 3) {
  const all = { Forest: terra('Forest'), ...cards };
  const deck = Object.keys(all).filter(n => n !== 'Forest').map(name => ({ name, qty: 4, zone: 'main' })).concat([{ name: 'Forest', qty: 20, zone: 'main' }]);
  let s = E.createGame({ format: 'livre', seed, mode: 'assisted', manaCheck: false, cards: all, scripts, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  return s;
}
/** Tira a carta do grimório ou da mão e a põe na zona pedida, direto pelo estado. */
function poe(s, p, nome, zone = 'battlefield') {
  s = J(s);
  const oid = ['library', 'hand'].flatMap(z => s.zones[p][z]).find(o => s.objects[o].name === nome);
  if (!oid) throw new Error('não achei ' + nome);
  const de = s.zones[p][s.objects[oid].zone]; de.splice(de.indexOf(oid), 1);
  s.zones[p][zone].push(oid); Object.assign(s.objects[oid], { zone, sick: false, tapped: false });
  return [s, oid];
}
const resolve = s => { for (let i = 0; i < 12 && (s.stack.length || s.pending); i++) s = s.pending ? act(s, E.legalActions(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority }); return s; };

/* ---------------- K-1 · 702.73 metamorfo e 702.114 desprovido ---------------- */
const MUDA = { name: 'Muda', type_line: 'Creature — Shapeshifter', mana_cost: '{1}{G}', cmc: 2, colors: ['G'], power: '1', toughness: '1', keywords: ['Changeling'], oracle_text: 'Changeling' };
const CHEFE = { name: 'Chefe', type_line: 'Creature — Elf Warrior', mana_cost: '{3}{G}', cmc: 4, colors: ['G'], power: '2', toughness: '2', keywords: [], oracle_text: 'Whenever another Elf you control enters, you gain 1 life.' };
const SC_CHEFE = { name: 'Chefe', abilities: [{ kind: 'triggered', when: 'other-etb', filter: { types: ['creature'], subtype: 'Elf' }, effects: [{ do: 'gain', amount: 1 }] }], example: { action: 'etb', target: 'none', expect: { attached: false } } };

test('CR 702.73a · metamorfo lido da palavra-chave impressa (sem marca no script): o "outro Elfo entra" dispara', () => {
  let s = partida({ Muda: MUDA, Chefe: CHEFE }, { Chefe: SC_CHEFE }); const a = s.turn.active;
  let muda; [s] = poe(s, a, 'Chefe'); [s, muda] = poe(s, a, 'Muda', 'hand');
  const vida = s.players[a].life;
  s = resolve(act(s, { t: 'cast', p: a, oid: muda }));
  assert.equal(s.objects[muda].zone, 'battlefield');
  assert.equal(s.players[a].life, vida + 1, 'a Muda é todo tipo de criatura: é Elfo');
  assert.equal(E.metamorfoK(s, s.objects[muda], 'Elf'), true);
});

test('CR 702.73a · o metamorfo vale em toda zona: "busque uma carta de Elfo" acha a criatura com metamorfo no grimório', () => {
  const BUSCA = { name: 'Busca', type_line: 'Sorcery', mana_cost: '{G}', cmc: 1, colors: ['G'], keywords: [], oracle_text: 'Search your library for an Elf card, reveal it, put it into your hand, then shuffle.' };
  const SC = { Busca: { name: 'Busca', effects: [{ do: 'search', amount: 1, filter: { subtypes: ['Elf'] }, to: 'hand' }], example: { target: 'none', expect: { handDelta: 0 } } } };
  let s = partida({ Muda: MUDA, Busca: BUSCA }, SC); const a = s.turn.active;
  let b; [s, b] = poe(s, a, 'Busca', 'hand');
  s = act(s, { t: 'cast', p: a, oid: b });
  for (let i = 0; i < 6 && !s.pending; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.ok(s.pending, 'a busca abre a escolha');
  const opcoes = s.pending.from.map(x => s.objects[x].name);
  assert.ok(opcoes.includes('Muda'), 'a Muda é uma carta de Elfo no grimório: ' + JSON.stringify(opcoes));
});

test('CR 205.3m · o metamorfo só tem tipos de criatura: não é Floresta, nem Aura, nem Equipamento', () => {
  let s = partida({ Muda: MUDA }); const a = s.turn.active;
  let muda; [s, muda] = poe(s, a, 'Muda');
  const o = s.objects[muda];
  assert.equal(E.metamorfoK(s, o), true);
  for (const x of ['Elf', 'Goblin', 'Time Lord', 'C’tan', "Shi'ar", 'Assembly-Worker']) assert.equal(E.metamorfoK(s, o, x), true, x);
  for (const x of ['Forest', 'Aura', 'Equipment', 'Vehicle', 'Arcane', 'Saga']) assert.equal(E.metamorfoK(s, o, x), false, x);
});

test('CR 702.73a · ruling da Masked Vandal: perder todas as habilidades não tira os tipos; definir um tipo de criatura depois, sim; virada para baixo não tem tipo', () => {
  let s = partida({ Muda: MUDA }); const a = s.turn.active;
  let muda; [s, muda] = poe(s, a, 'Muda');
  s = J(s); s.objects[muda].mutavel = true; s.objects[muda].vira = [{ ts: 1, loseAbilities: true }];
  assert.equal(E.metamorfoK(s, s.objects[muda], 'Elf'), true, 'perdeu as habilidades (camada 6) e continua todo tipo (camada 4 veio antes)');
  s.objects[muda].vira = [{ ts: 2, types: ['creature'], subtypes: ['Frog'], base: [1, 1], loseAbilities: true }];
  assert.equal(E.metamorfoK(s, s.objects[muda], 'Elf'), false, 'virou Sapo: o tipo definido depois sobrepõe');
  assert.match(E.linhaDeTipo(s, s.objects[muda]), /Frog/);
  s.objects[muda].vira = []; s.objects[muda].faceDown = true;
  assert.equal(E.metamorfoK(s, s.objects[muda], 'Elf'), false, '708.2: virada para baixo é 2/2 sem subtipo');
});

test('CR 702.73a · metamorfo concedido pela carta da ficha conta; a palavra-chave entra no vocabulário do motor', () => {
  assert.ok(S.KEYWORDS.includes('changeling') && S.KEYWORDS.includes('devoid'));
  assert.deepEqual(J(S.validateScript({ name: 'T', effects: [{ do: 'token', amount: 1, token: { name: 'Muda Ficha', types: ['creature'], subtypes: ['Shapeshifter'], colors: ['U'], power: 1, toughness: 1, keywords: ['changeling'] } }], example: { target: 'none', expect: { tokens: 1 } } })), [], 'ficha com metamorfo passa no validador');
  const FAZ = { name: 'Faz', type_line: 'Sorcery', mana_cost: '{U}', cmc: 1, colors: ['U'], keywords: [], oracle_text: 'Create a 1/1 blue Shapeshifter creature token with changeling.' };
  const SC = { Faz: { name: 'Faz', effects: [{ do: 'token', amount: 1, token: { name: 'Muda Ficha', types: ['creature'], subtypes: ['Shapeshifter'], colors: ['U'], power: 1, toughness: 1, keywords: ['changeling'] } }], example: { target: 'none', expect: { tokens: 1 } } }, Chefe: SC_CHEFE };
  let s = partida({ Faz: FAZ, Chefe: CHEFE }, SC); const a = s.turn.active;
  let f; [s] = poe(s, a, 'Chefe'); [s, f] = poe(s, a, 'Faz', 'hand');
  const vida = s.players[a].life;
  s = resolve(act(s, { t: 'cast', p: a, oid: f }));
  assert.equal(s.players[a].life, vida + 1, 'a ficha com metamorfo entrou como Elfo');
});

test('CR 702.114a · desprovido lido da palavra-chave impressa: incolor mesmo com mana colorida no custo, em qualquer zona', () => {
  const ELD = { name: 'Eld', type_line: 'Creature — Eldrazi', mana_cost: '{2}{R}{G}', cmc: 4, colors: ['R', 'G'], power: '3', toughness: '3', keywords: ['Devoid'], oracle_text: 'Devoid' };
  let s = partida({ Eld: ELD }); const a = s.turn.active;
  assert.deepEqual(J(s.facts.Eld.colors), [], 'o fato da carta é incolor');
  let e; [s, e] = poe(s, a, 'Eld', 'hand');
  assert.deepEqual(J(E.colorsOf(s, s.objects[e])), [], 'na mão');
  s = resolve(act(s, { t: 'cast', p: a, oid: e }));
  assert.deepEqual(J(E.colorsOf(s, s.objects[e])), [], 'no campo');
});

/* ---------------- K-2 · 702.21 salvaguarda (ward) ---------------- */
const CRAB = { name: 'Crab', type_line: 'Creature — Crab', mana_cost: '{3}{U}', cmc: 4, colors: ['U'], power: '2', toughness: '5', keywords: ['Ward'], oracle_text: 'Ward {2}' };
const VIDA = { name: 'Vida', type_line: 'Creature — Spirit', mana_cost: '{B}', cmc: 1, colors: ['B'], power: '1', toughness: '4', keywords: ['Ward'], oracle_text: 'Ward—Pay 3 life.' };
const DESC = { name: 'Desc', type_line: 'Creature — Spirit', mana_cost: '{B}', cmc: 1, colors: ['B'], power: '1', toughness: '4', keywords: ['Ward'], oracle_text: 'Ward—Discard a card.' };
const RAIO = { name: 'Raio', type_line: 'Instant', mana_cost: '{R}', cmc: 1, colors: ['R'], keywords: [], oracle_text: 'Raio deals 3 damage to any target.' };
const SC_RAIO = { Raio: { name: 'Raio', effects: [{ do: 'damage', amount: 3, target: 'any' }], example: { target: 'opponent', expect: { opponentLife: 17 } } } };
const ward = (cards, scripts = {}) => partida({ Crab: CRAB, Vida: VIDA, Desc: DESC, Raio: RAIO, ...cards }, { ...SC_RAIO, ...scripts }, 5);
/** A conjura o Raio na permanente `alvo` de B; devolve o estado logo depois da conjuração. */
function raioEm(s, alvo) { const a = s.turn.active; let r; [s, r] = poe(s, a, 'Raio', 'hand'); return [act(s, { t: 'cast', p: a, oid: r, targets: [{ oid: alvo }] }), r]; }
const passaAteDecidir = s => { for (let i = 0; i < 8 && !s.pending && s.stack.length; i++) s = act(s, { t: 'pass', p: s.turn.priority }); return s; };

test('CR 702.21a · a salvaguarda é habilidade disparada: vai para a pilha acima da mágica, controlada por quem controla a permanente, e dá para responder', () => {
  let s = ward({}); const a = s.turn.active, d = 1 - a;
  let crab, raio; [s] = poe(s, a, 'Forest'); [s] = poe(s, a, 'Forest'); [s, crab] = poe(s, d, 'Crab'); [s, raio] = raioEm(s, crab);
  assert.equal(s.pending, null, 'nada é cobrado na conjuração');
  assert.equal(s.stack.length, 2); const topo = s.objects[s.stack[1]];
  assert.ok(topo.ability && topo.name === 'Crab' && topo.controller === d, 'a salvaguarda do Crab está no topo, de quem controla o Crab');
  assert.equal(s.stack[0], raio);
  assert.ok(E.legalActions(s, s.turn.priority).some(x => x.t === 'pass'), 'quem tem prioridade pode responder ou passar');
  s = passaAteDecidir(s);
  assert.equal(s.pending && s.pending.kind, 'may_pay'); assert.equal(s.pending.p, a, 'quem conjurou decide se paga'); assert.equal(s.pending.cost, '{2}');
  const recusou = passaAteDecidir(act(s, { t: 'decline', p: a }));
  assert.equal(recusou.objects[raio].zone, 'graveyard'); assert.equal(recusou.objects[crab].damage, 0, 'recusar anula a mágica');
  const pagou = passaAteDecidir(act(s, { t: 'pay', p: a }));
  assert.equal(pagou.objects[crab].damage, 3, 'pagar deixa a mágica passar');
});

test('CR 702.21a · só mágica ou habilidade de um oponente: a própria mágica não dispara a salvaguarda', () => {
  let s = ward({}); const a = s.turn.active;
  let crab; [s, crab] = poe(s, a, 'Crab'); [s] = raioEm(s, crab);
  assert.equal(s.stack.length, 1, 'sem salvaguarda na pilha');
});

test('CR 702.21a · a mágica que saiu da pilha antes de a salvaguarda resolver não é cobrada; sem como pagar, anula sem perguntar', () => {
  let s = ward({}); const a = s.turn.active, d = 1 - a;
  let crab, raio; [s, crab] = poe(s, d, 'Crab'); [s, raio] = raioEm(s, crab);
  let x = J(x0(s, raio)); x = passaAteDecidir(x);
  assert.equal(x.pending, null, 'nada a cobrar: a mágica já tinha saído');
  // com a conferência de mana ligada e nenhuma terra, {2} não dá para pagar: anula direto
  let y = J(s); y.manaCheck = true; y = passaAteDecidir(y);
  assert.equal(y.pending, null, 'não pergunta'); assert.equal(y.objects[raio].zone, 'graveyard'); assert.equal(y.objects[crab].damage, 0);
});
/** Tira a mágica da pilha (como se tivesse sido anulada por outro efeito). */
function x0(s, oid) { s = J(s); s.stack.splice(s.stack.indexOf(oid), 1); s.objects[oid].zone = 'graveyard'; s.zones[s.objects[oid].owner].graveyard.push(oid); return s; }

test('CR 702.21 · salvaguarda impressa lida do texto, com custo que não é mana: pagar vida (119.4: só a vida que tem) e descartar', () => {
  let s = ward({}); const a = s.turn.active, d = 1 - a;
  let vida, raio; [s, vida] = poe(s, d, 'Vida');
  assert.deepEqual(J(s.facts.Vida.wardImpresso), [{ pagarVida: 3 }]);
  [s, raio] = raioEm(s, vida); s = passaAteDecidir(s);
  assert.equal(s.pending.kind, 'may_pay'); assert.match(s.pending.name, /pagar 3 de vida/);
  const v0 = s.players[a].life; const pagou = passaAteDecidir(act(s, E.legalActions(s, a).find(x => x.t === 'pay')));
  assert.equal(pagou.players[a].life, v0 - 3, 'pagou 3 de vida'); assert.equal(pagou.objects[vida].damage, 3);
  let pobre = ward({}); let v2, r2; [pobre, v2] = poe(pobre, 1 - pobre.turn.active, 'Vida'); pobre = J(pobre); pobre.players[pobre.turn.active].life = 2;
  [pobre, r2] = raioEm(pobre, v2); pobre = passaAteDecidir(pobre);
  assert.equal(pobre.objects[r2].zone, 'graveyard', 'com 2 de vida não paga 3: anula sem perguntar'); assert.equal(pobre.players[pobre.turn.active].life, 2);
  // descartar: quem conjurou escolhe a carta
  let t = ward({}); const a2 = t.turn.active; let desc; [t, desc] = poe(t, 1 - a2, 'Desc'); [t] = raioEm(t, desc); t = passaAteDecidir(t);
  const pagar = E.legalActions(t, a2).filter(x => x.t === 'pay');
  assert.equal(pagar.length, t.zones[a2].hand.length > 0 ? new Set(t.zones[a2].hand).size : 0, 'uma forma de pagar por carta da mão');
  const mao = t.zones[a2].hand.length; const t2 = passaAteDecidir(act(t, pagar[0]));
  assert.equal(t2.zones[a2].hand.length, mao - 1, 'descartou uma'); assert.equal(t2.objects[desc].damage, 3);
});

test('CR 702.21 · salvaguarda de sacrifício, e cada instância dispara à parte', () => {
  const SAC = { name: 'Sac', type_line: 'Creature — Spirit', mana_cost: '{B}', cmc: 1, colors: ['B'], power: '1', toughness: '4', keywords: ['Ward'], oracle_text: 'Ward—Sacrifice a creature.' };
  let s = ward({ Sac: SAC }); const a = s.turn.active, d = 1 - a;
  assert.deepEqual(J(s.facts.Sac.wardImpresso), [{ sacrificeOther: { types: ['creature'] } }]);
  let sac, raio; [s, sac] = poe(s, d, 'Sac');
  let semCriatura = J(s); [semCriatura, raio] = raioEm(semCriatura, sac); semCriatura = passaAteDecidir(semCriatura);
  assert.equal(semCriatura.objects[raio].zone, 'graveyard', 'sem criatura para sacrificar, anula sem perguntar');
  let x; [s, x] = poe(s, a, 'Crab'); [s, raio] = raioEm(s, sac); s = passaAteDecidir(s);
  const pagar = E.legalActions(s, a).filter(y => y.t === 'pay'); assert.equal(pagar.length, 1, 'o Crab é a única criatura que serve');
  s = passaAteDecidir(act(s, pagar[0])); assert.equal(s.objects[x].zone, 'graveyard', 'sacrificou o Crab'); assert.equal(s.objects[sac].damage, 3);
  // duas instâncias (impressa + concedida)
  let u = ward({}); const a3 = u.turn.active; let crab; [u, crab] = poe(u, 1 - a3, 'Crab');
  u = J(u); u.objects[crab].vira = []; const dupla = { ...u.facts.Crab, script: { name: 'Crab', effects: [], abilities: [], self: { ward: ['{2}', { pagarVida: 1 }] } } }; u.facts.Crab = dupla;
  assert.equal(J(E.wardsDeK(u, u.objects[crab])).length, 2);
  [u] = raioEm(u, crab);
  assert.equal(u.pending && u.pending.kind, 'triggers', 'duas salvaguardas diferentes do mesmo jogador: ele escolhe a ordem (603.3b)'); assert.equal(u.queued.length, 2);
});

test('CR 702.21b · salvaguarda {X}: o X é decidido na resolução, não no disparo', () => {
  assert.deepEqual(J(S.validateScript({ name: 'T', self: { ward: { x: 'creatures-you-control' } }, example: { action: 'etb', target: 'none', expect: { attached: false } } })), []);
  assert.ok(S.validateScript({ name: 'T', self: { ward: { vida: 2 } }, example: { action: 'etb', target: 'none', expect: { attached: false } } }).length > 0, 'chave desconhecida é barrada');
  let s = ward({}, { Crab: { name: 'Crab', self: { ward: { x: 'creatures-you-control' } }, example: { action: 'etb', target: 'none', expect: { attached: false } } } });
  const a = s.turn.active, d = 1 - a; let crab; [s, crab] = poe(s, d, 'Crab'); [s] = raioEm(s, crab);
  let mais; [s, mais] = poe(s, d, 'Vida'); // outra criatura entra depois do disparo e antes da resolução
  s = passaAteDecidir(s);
  assert.equal(s.pending.cost, '{2}', 'X = 2 criaturas de quem controla o Crab, contadas na resolução');
});

test('CR 702.21a · perder todas as habilidades tira a salvaguarda impressa; virada para baixo não tem', () => {
  let s = ward({}); const a = s.turn.active, d = 1 - a;
  let crab; [s, crab] = poe(s, d, 'Crab');
  s = J(s); s.objects[crab].mutavel = true; s.objects[crab].vira = [{ ts: 1, loseAbilities: true }];
  assert.equal(J(E.wardsDeK(s, s.objects[crab])).length, 0);
  [s] = raioEm(s, crab); assert.equal(s.stack.length, 1, 'sem salvaguarda');
  let v = ward({}); let c2; [v, c2] = poe(v, 1 - v.turn.active, 'Crab'); v = J(v); v.objects[c2].faceDown = true;
  assert.equal(J(E.wardsDeK(v, v.objects[c2])).length, 0, '708.2: virada para baixo não tem habilidade');
});

/* ---------------- K-3 · 702.108 proeza ---------------- */
import { readFileSync } from 'node:fs';
const OFICIAIS_K = JSON.parse(readFileSync(new URL('./.listas/oficiais-keywords.json', import.meta.url), 'utf8')).cartas;
/** Carta com o texto oficial guardado; `keywords` como a Scryfall manda (palavras-chave das linhas só de palavra-chave). */
function oficial(nome) {
  const c = OFICIAIS_K.find(x => x.name === nome); if (!c) throw new Error('sem texto oficial: ' + nome);
  const kws = String(c.oracle_text).split('\n').flatMap(l => { const ps = l.replace(/\s*\([^)]*\)/g, '').split(/,\s*/).map(x => x.trim().replace(/ \d+$/, '')); return ps.every(x => S.KEYWORDS.includes(x.toLowerCase())) ? ps : []; }); // como a Scryfall: "Afterlife 2" → Afterlife
  const cores = [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))];
  return { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: (c.mana_cost.match(/\{[^}]+\}/g) || []).reduce((n, x) => n + (/^\{\d+\}$/.test(x) ? +x.slice(1, -1) : 1), 0), colors: cores, keywords: kws, oracle_text: c.oracle_text, ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) };
}
const URSO = { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, colors: ['G'], power: '2', toughness: '2', keywords: [], oracle_text: '' };

test('CR 702.108a · proeza (Monastery Swiftspear, texto oficial): mágica que não é criatura dá +1/+1 até o fim do turno; de criatura, não; a do oponente, não', () => {
  const SW = oficial('Monastery Swiftspear'); assert.deepEqual(J(SW.keywords), ['Haste', 'Prowess']);
  let s = partida({ 'Monastery Swiftspear': SW, Raio: RAIO, Urso: URSO }, SC_RAIO); const a = s.turn.active, d = 1 - a;
  let sw; [s, sw] = poe(s, a, 'Monastery Swiftspear');
  let r; [s, r] = poe(s, a, 'Raio', 'hand');
  s = act(s, { t: 'cast', p: a, oid: r, targets: [{ player: d }] });
  assert.equal(s.stack.length, 2, 'a proeza disparou e está acima do Raio');
  s = resolve(s);
  assert.equal(E.stats(s, s.objects[sw]).power, 2); assert.equal(E.stats(s, s.objects[sw]).toughness, 3, '+1/+1');
  let u; [s, u] = poe(s, a, 'Urso', 'hand'); s = act(s, { t: 'cast', p: a, oid: u });
  assert.equal(s.stack.length, 1, 'mágica de criatura não dispara'); s = resolve(s);
  let ro; [s, ro] = poe(s, d, 'Raio', 'hand'); s = J(s); s.turn.priority = d;
  s = act(s, { t: 'cast', p: d, oid: ro, targets: [{ player: a }] });
  assert.equal(s.stack.length, 1, 'a mágica do oponente não dispara a sua proeza'); s = resolve(s);
  for (let i = 0; i < 60 && s.turn.active === a; i++) s = s.pending ? act(s, E.legalActions(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(E.stats(s, s.objects[sw]).power, 1, 'acabou no fim do turno');
});

test('CR 702.108b · cada instância de proeza dispara à parte (impressa + concedida); quem perde as habilidades não dispara', () => {
  const SW = oficial('Monastery Swiftspear');
  const MESTRE = { name: 'Mestre', type_line: 'Enchantment', mana_cost: '{2}{R}', cmc: 3, colors: ['R'], keywords: [], oracle_text: 'Creatures you control have prowess.' };
  const SC = { ...SC_RAIO, Mestre: { name: 'Mestre', grantsAll: { keywords: ['prowess'] }, example: { action: 'etb', target: 'none', expect: { attached: false } } } };
  let s = partida({ 'Monastery Swiftspear': SW, Raio: RAIO, Mestre: MESTRE, Urso: URSO }, SC); const a = s.turn.active, d = 1 - a;
  let sw, urso; [s, sw] = poe(s, a, 'Monastery Swiftspear'); [s] = poe(s, a, 'Mestre'); [s, urso] = poe(s, a, 'Urso');
  assert.equal(E.instanciasK(s, s.objects[sw], 'prowess'), 2); assert.equal(E.instanciasK(s, s.objects[urso], 'prowess'), 1);
  let r; [s, r] = poe(s, a, 'Raio', 'hand'); s = act(s, { t: 'cast', p: a, oid: r, targets: [{ player: d }] });
  for (let i = 0; i < 6 && s.pending && s.pending.kind === 'triggers'; i++) s = act(s, E.legalActions(s, s.pending.p)[0]);
  assert.equal(s.stack.length + s.queued.length, 4, 'três proezas (duas da Swiftspear, uma do Urso) acima do Raio');
  s = resolve(s);
  assert.equal(E.stats(s, s.objects[sw]).power, 3, 'Swiftspear +2/+2'); assert.equal(E.stats(s, s.objects[urso]).power, 3, 'Urso +1/+1');
  let t = partida({ 'Monastery Swiftspear': SW, Raio: RAIO }, SC_RAIO); const a2 = t.turn.active; let sw2; [t, sw2] = poe(t, a2, 'Monastery Swiftspear');
  t = J(t); t.objects[sw2].mutavel = true; t.objects[sw2].vira = [{ ts: 1, loseAbilities: true }];
  let r2; [t, r2] = poe(t, a2, 'Raio', 'hand'); t = act(t, { t: 'cast', p: a2, oid: r2, targets: [{ player: 1 - a2 }] });
  assert.equal(t.stack.length, 1, 'sem habilidades, sem proeza');
});

/* ---------------- K-4 · 702.79 persistir e 702.93 imortal ---------------- */
const MATA = { name: 'Mata', type_line: 'Instant', mana_cost: '{B}', cmc: 1, colors: ['B'], keywords: [], oracle_text: 'Destroy target creature.' };
const SC_MATA = { Mata: { name: 'Mata', effects: [{ do: 'destroy', target: 'creature' }], example: { target: 'enemy-creature', expect: { gone: true } } } };
/** O jogador ativo mata a criatura `alvo` com a Mata e resolve tudo. */
function mata(s, alvo) { const a = s.turn.active; let m; [s, m] = poe(s, a, 'Mata', 'hand'); return resolve(act(s, { t: 'cast', p: a, oid: m, targets: [{ oid: alvo }] })); }

test('CR 702.79a · persistir (Kitchen Finks, texto oficial): morre sem -1/-1 e volta com um, sob o controle do dono; com o marcador, não volta mais', () => {
  const KF = oficial('Kitchen Finks'); assert.ok(KF.keywords.includes('Persist'));
  let s = partida({ 'Kitchen Finks': KF, Mata: MATA }, SC_MATA); const a = s.turn.active, d = 1 - a;
  let kf; [s, kf] = poe(s, d, 'Kitchen Finks');
  s = mata(s, kf);
  assert.equal(s.objects[kf].zone, 'battlefield', 'voltou'); assert.equal(s.objects[kf].controller, d);
  assert.equal(s.objects[kf].counters.m1m1, 1, 'com um marcador -1/-1'); assert.equal(E.stats(s, s.objects[kf]).power, 2);
  s = mata(s, kf);
  assert.equal(s.objects[kf].zone, 'graveyard', 'com o marcador, a persistência não dispara');
});

test('CR 702.93a · imortal (Young Wolf, texto oficial): volta com +1/+1; já com o marcador, não; a condição é como ela era no campo', () => {
  const YW = oficial('Young Wolf');
  let s = partida({ 'Young Wolf': YW, Mata: MATA }, SC_MATA); const a = s.turn.active, d = 1 - a;
  let yw; [s, yw] = poe(s, d, 'Young Wolf');
  s = mata(s, yw);
  assert.equal(s.objects[yw].zone, 'battlefield'); assert.equal(s.objects[yw].counters.p1p1, 1); assert.equal(E.stats(s, s.objects[yw]).power, 2);
  s = mata(s, yw);
  assert.equal(s.objects[yw].zone, 'graveyard', 'com +1/+1, não volta');
});

test('CR 702.79a / 400.7 · a carta que saiu do cemitério antes de o gatilho resolver não volta; quem perdeu as habilidades no campo não dispara', () => {
  const YW = oficial('Young Wolf');
  let s = partida({ 'Young Wolf': YW, Mata: MATA }, SC_MATA); const a = s.turn.active, d = 1 - a;
  let yw, m; [s, yw] = poe(s, d, 'Young Wolf'); [s, m] = poe(s, a, 'Mata', 'hand');
  s = act(s, { t: 'cast', p: a, oid: m, targets: [{ oid: yw }] });
  for (let i = 0; i < 6 && !s.stack.some(x => s.objects[x].ability); i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.ok(s.stack.some(x => s.objects[x].ability && s.objects[x].name === 'Young Wolf'), 'o imortal está na pilha');
  s = J(s); const gy = s.zones[d].graveyard; gy.splice(gy.indexOf(yw), 1); s.zones[d].exile.push(yw); s.objects[yw].zone = 'exile'; s.objects[yw].zc = (s.objects[yw].zc || 0) + 1; // exilada em resposta
  s = resolve(s);
  assert.equal(s.objects[yw].zone, 'exile', 'é outro objeto: não volta');
  let t = partida({ 'Young Wolf': YW, Mata: MATA }, SC_MATA); let y2; [t, y2] = poe(t, 1 - t.turn.active, 'Young Wolf');
  t = J(t); t.objects[y2].mutavel = true; t.objects[y2].vira = [{ ts: 1, loseAbilities: true }];
  t = mata(t, y2); assert.equal(t.objects[y2].zone, 'graveyard', 'sem habilidades no campo, não há imortal');
});

test('CR 702.79a · persistir concedido (ficha): a ficha vai ao cemitério e deixa de existir — o gatilho não devolve nada', () => {
  const FAZ = { name: 'Faz', type_line: 'Sorcery', mana_cost: '{B}', cmc: 1, colors: ['B'], keywords: [], oracle_text: 'Create a 2/2 black Zombie creature token with persist.' };
  const SC = { ...SC_MATA, Faz: { name: 'Faz', effects: [{ do: 'token', amount: 1, token: { name: 'Zumbi K', types: ['creature'], subtypes: ['Zombie'], colors: ['B'], power: 2, toughness: 2, keywords: ['persist'] } }], example: { target: 'none', expect: { tokens: 1 } } } };
  let s = partida({ Faz: FAZ, Mata: MATA }, SC); const a = s.turn.active;
  let f; [s, f] = poe(s, a, 'Faz', 'hand'); s = resolve(act(s, { t: 'cast', p: a, oid: f }));
  const z = s.zones[a].battlefield.find(x => s.objects[x].name === 'Zumbi K'); assert.ok(z);
  s = mata(s, z);
  assert.ok(!s.zones[a].battlefield.some(x => s.objects[x] && s.objects[x].name === 'Zumbi K'), 'a ficha não volta');
});

/* ---------------- K-5 · 702.83 exaltado ---------------- */
/** Vai ao passo de ataque e declara os atacantes; devolve o estado com os gatilhos de ataque resolvidos. */
function ataca(s, atacantes) {
  for (let i = 0; i < 40 && s.turn.step !== 'combat_attackers'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  s = act(s, { t: 'attack', p: s.turn.active, attackers: atacantes });
  for (let i = 0; i < 8 && (s.stack.length || (s.pending && s.pending.kind === 'triggers')); i++) s = s.pending ? act(s, E.legalActions(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
  return s;
}
test('CR 702.83a/b · exaltado (Akrasan Squire, texto oficial): a criatura que ataca sozinha recebe +1/+1 por instância de exaltado de quem ataca; com duas atacando, nada', () => {
  const AS = oficial('Akrasan Squire'); assert.deepEqual(J(AS.keywords), ['Exalted']);
  let s = partida({ 'Akrasan Squire': AS, Urso: URSO }); const a = s.turn.active, d = 1 - a;
  let q1, q2, u, u2, qd; [s, q1] = poe(s, a, 'Akrasan Squire'); [s, q2] = poe(s, a, 'Akrasan Squire'); [s, u] = poe(s, a, 'Urso'); [s, u2] = poe(s, a, 'Urso'); [s, qd] = poe(s, d, 'Akrasan Squire');
  const so = ataca(s, [u]);
  assert.equal(E.stats(so, so.objects[u]).power, 4, 'Urso 2/2 + duas exaltadas suas (a do oponente não conta) = 4/4');
  const exaltada = ataca(s, [q1]);
  assert.equal(E.stats(exaltada, exaltada.objects[q1]).power, 3, 'a própria exaltada atacando sozinha conta a dela também (1 + 2)');
  const duas = ataca(s, [u, u2]);
  assert.equal(E.stats(duas, duas.objects[u]).power, 2, 'duas atacando: ninguém ataca sozinha');
});

/* ---------------- K-6 · 702.135 pós-vida ---------------- */
test('CR 702.135a · pós-vida (Ministrant of Obligation, texto oficial: "Afterlife 2"): ao morrer, cria duas fichas 1/1 brancas e pretas de Espírito, voando, para quem a controlava', () => {
  const MO = oficial('Ministrant of Obligation');
  assert.deepEqual(J(E.numerosDaPalavraK(MO)), { afterlife: [2] });
  assert.equal(S.coverage(MO).level, 'completo', 'só a palavra-chave numerada: a carta joga sem script');
  let s = partida({ 'Ministrant of Obligation': MO, Mata: MATA }, SC_MATA); const a = s.turn.active, d = 1 - a;
  let mo; [s, mo] = poe(s, d, 'Ministrant of Obligation');
  s = mata(s, mo);
  const fichas = s.zones[d].battlefield.filter(x => s.objects[x].token);
  assert.equal(fichas.length, 2, 'duas fichas, do lado de quem a controlava');
  const f = s.objects[fichas[0]];
  assert.deepEqual(J(E.colorsOf(s, f)).sort(), ['B', 'W']); assert.equal(E.stats(s, f).power, 1); assert.ok(E.hasKeyword(s, f, 'flying')); assert.match(E.linhaDeTipo(s, f), /Spirit/);
});

test('CR 702.135b · cada instância de pós-vida dispara à parte', () => {
  const MO = oficial('Ministrant of Obligation');
  const FAZ = { name: 'Alma', type_line: 'Enchantment', mana_cost: '{1}{B}', cmc: 2, colors: ['B'], keywords: [], oracle_text: 'Creatures you control have afterlife 1.' };
  const SC = { ...SC_MATA, Alma: { name: 'Alma', grantsAll: { keywords: ['afterlife'] }, example: { action: 'etb', target: 'none', expect: { attached: false } } } };
  let s = partida({ 'Ministrant of Obligation': MO, Mata: MATA, Alma: FAZ }, SC); const a = s.turn.active, d = 1 - a;
  let mo; [s, mo] = poe(s, d, 'Ministrant of Obligation'); [s] = poe(s, d, 'Alma');
  assert.equal(E.instanciasK(s, s.objects[mo], 'afterlife'), 2);
  s = mata(s, mo);
  assert.equal(s.zones[d].battlefield.filter(x => s.objects[x].token).length, 3, 'a impressa cria 2, a concedida ("afterlife 1") cria 1');
});

/* ---------------- K-7 · 702.85 cascata ---------------- */
const GRANDAO = { name: 'Grandao', type_line: 'Creature — Giant', mana_cost: '{4}{G}', cmc: 5, colors: ['G'], power: '5', toughness: '5', keywords: [], oracle_text: '' };
/** Põe as cartas pedidas (pelo nome) no topo do grimório de `p`, na ordem dada. */
function noTopo(s, p, nomes) {
  s = J(s); const lib = s.zones[p].library;
  const pegos = nomes.map(n => { const i = lib.findIndex(o => s.objects[o].name === n && !pegosSet.has(o)); const o = lib[i]; pegosSet.add(o); return o; });
  for (const o of pegos) lib.splice(lib.indexOf(o), 1);
  lib.unshift(...pegos); pegosSet.clear(); return [s, pegos];
}
const pegosSet = new Set();
test('CR 702.85a · cascata (Bloodbraid Elf, texto oficial): exila até achar mágica que não é terreno de valor menor; pode conjurá-la sem pagar; o resto vai para o fundo', () => {
  const BBE = oficial('Bloodbraid Elf'); assert.ok(BBE.keywords.includes('Cascade'));
  let s = partida({ 'Bloodbraid Elf': BBE, Urso: URSO, Grandao: GRANDAO }); const a = s.turn.active;
  let bbe, topo; [s, bbe] = poe(s, a, 'Bloodbraid Elf', 'hand'); [s, topo] = noTopo(s, a, ['Forest', 'Grandao', 'Urso', 'Forest']);
  s = act(s, { t: 'cast', p: a, oid: bbe });
  assert.equal(s.stack.length, 2, 'a cascata dispara ao conjurar e fica acima do elfo'); assert.ok(s.objects[s.stack[1]].ability);
  for (let i = 0; i < 4 && !s.pending; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.pending.kind, 'free_cast'); assert.deepEqual(J(s.pending.options), [topo[2]], 'parou no Urso (valor 2 < 4); o Grandão (5) passou');
  assert.ok(['exile'].includes(s.objects[topo[0]].zone) && s.objects[topo[1]].zone === 'exile');
  const conjurou = act(s, { t: 'cast_free', p: a, oid: topo[2] });
  assert.equal(conjurou.objects[topo[2]].zone, 'stack', 'conjurou sem pagar');
  const fundo = conjurou.zones[a].library.slice(-2);
  assert.deepEqual(new Set(fundo), new Set([topo[0], topo[1]]), 'a Floresta e o Grandão foram para o fundo'); assert.equal(conjurou.objects[topo[3]].zone, 'library');
  const recusou = act(s, { t: 'decline_free', p: a });
  assert.deepEqual(new Set(recusou.zones[a].library.slice(-3)), new Set(topo.slice(0, 3)), 'recusando, as três exiladas vão para o fundo');
});

test('CR 702.85c · cada instância de cascata dispara à parte (Apex Devastator: "Cascade, cascade, cascade, cascade"); sem achar, tudo volta ao fundo', () => {
  const AD = oficial('Apex Devastator');
  assert.deepEqual(J(E.numerosDaPalavraK(AD)), { cascade: [1, 1, 1, 1] });
  let s = partida({ 'Apex Devastator': AD }); const a = s.turn.active;
  let ad; [s, ad] = poe(s, a, 'Apex Devastator', 'hand');
  s = act(s, { t: 'cast', p: a, oid: ad });
  assert.equal(s.stack.length + s.queued.length, 5, 'quatro cascatas e a mágica');
  let t = partida({ 'Bloodbraid Elf': oficial('Bloodbraid Elf') }); const a2 = t.turn.active; let b2; [t, b2] = poe(t, a2, 'Bloodbraid Elf', 'hand');
  t = J(t); t.zones[a2].library = t.zones[a2].library.filter(o => t.objects[o].name === 'Forest').slice(0, 3); // só terrenos
  t = act(t, { t: 'cast', p: a2, oid: b2 }); for (let i = 0; i < 4 && t.stack.length > 1; i++) t = act(t, { t: 'pass', p: t.turn.priority });
  assert.equal(t.pending, null, 'nada para conjurar'); assert.equal(t.zones[a2].library.length, 3, 'as três voltaram ao grimório');
});

/* ---------------- K-8 · 702.74 evocar ---------------- */
const SC_MULL = { name: 'Mulldrifter', abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'draw', amount: 2 }] }], example: { action: 'etb', target: 'none', expect: { handDelta: 2 } } };
const MULL = (kws = ['Flying', 'Evoke']) => ({ ...oficial('Mulldrifter'), keywords: kws }); // `keywords` como a Scryfall manda
const BOUNCE = { name: 'Volta', type_line: 'Instant', mana_cost: '{U}', cmc: 1, colors: ['U'], keywords: [], oracle_text: 'Return target creature to its owner\'s hand.' };
const SC_BOUNCE = { name: 'Volta', effects: [{ do: 'bounce', target: 'creature' }], example: { action: 'cast', target: 'own-creature', expect: { bounced: true } } };

test('CR 702.74a · evocar (Mulldrifter, texto oficial): a mesa oferece o custo de evocar; a evocada entra, compra duas e é sacrificada; pelo custo normal, fica', () => {
  assert.deepEqual(J(E.evocarImpressoK(oficial('Mulldrifter'))), { mana: '{2}{U}' });
  for (const kws of [['Flying', 'Evoke'], ['Flying']]) { // com a lista da Scryfall e só com o texto
    let s = partida({ Mulldrifter: MULL(kws) }, { Mulldrifter: SC_MULL }); const a = s.turn.active;
    let m; [s, m] = poe(s, a, 'Mulldrifter', 'hand');
    const ofertas = E.legalActions(s, a).filter(x => x.t === 'cast' && x.oid === m);
    const ev = ofertas.find(x => x.alt != null), normal = ofertas.find(x => x.alt == null);
    assert.ok(ev && normal, 'as duas formas de conjurar');
    assert.equal(s.facts.Mulldrifter.script.alt[ev.alt].label, 'Evocar {2}{U}', 'o rótulo diz o custo');
    const mao = s.zones[a].hand.length;
    let e = act(s, ev); assert.equal(e.objects[m].evocadaK, true, 'a mágica sabe que foi evocada');
    e = resolve(e);
    assert.equal(e.objects[m].zone, 'graveyard', 'sacrificada ao entrar');
    assert.equal(e.zones[a].hand.length, mao - 1 + 2, 'e a compra de duas aconteceu');
    assert.ok(!e.objects[m].evocadaK, '400.7: a marca não vai para o cemitério');
    const n = resolve(act(s, normal));
    assert.equal(n.objects[m].zone, 'battlefield', 'pelo custo normal, fica'); assert.equal(n.stack.length, 0);
  }
});

test('CR 702.74a · o custo de evocar é o que se paga (601.2f): três terrenos pagam a evocada, não a de custo cheio', () => {
  const ilha = terra('Island');
  const deck = [{ name: 'Mulldrifter', qty: 4, zone: 'main' }, { name: 'Island', qty: 26, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed: 5, mode: 'assisted', manaCheck: true, cards: { Island: ilha, Mulldrifter: MULL() }, scripts: { Mulldrifter: SC_MULL }, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active; let m; [s, m] = poe(s, a, 'Mulldrifter', 'hand');
  for (let i = 0; i < 3; i++) [s] = poe(s, a, 'Island');
  const ofertas = E.legalActions(s, a).filter(x => x.t === 'cast' && x.oid === m);
  assert.ok(ofertas.length && ofertas.every(x => x.alt != null), 'só a evocada cabe em três terrenos');
  const e = act(s, ofertas[0]);
  assert.equal(e.zones[a].battlefield.filter(x => e.objects[x].name === 'Island' && e.objects[x].tapped).length, 3, '{2}{U} pago');
});

test('CR 702.74a · evocar com custo que não é mana (Endurance, texto oficial: "Evoke—Exile a green card from your hand."): só com outra carta verde na mão; ela é exilada', () => {
  const END = oficial('Endurance');
  assert.deepEqual(J(E.evocarImpressoK(END)), { exileHandColor: 'G' });
  let s = partida({ Endurance: END, Urso: URSO }); const a = s.turn.active;
  s = J(s); s.zones[a].library.push(...s.zones[a].hand.splice(0)); for (const x of s.zones[a].library) s.objects[x].zone = 'library';
  let en; [s, en] = poe(s, a, 'Endurance', 'hand');
  assert.ok(!E.legalActions(s, a).some(x => x.t === 'cast' && x.oid === en && x.alt != null), 'a própria Endurance não paga o custo');
  let u; [s, u] = poe(s, a, 'Urso', 'hand');
  const ev = E.legalActions(s, a).find(x => x.t === 'cast' && x.oid === en && x.alt != null);
  assert.ok(ev, 'com o Urso verde na mão, dá para evocar');
  const r = resolve(act(s, ev));
  assert.equal(r.objects[u].zone, 'exile', 'o Urso pagou o custo'); assert.equal(r.objects[en].zone, 'graveyard', 'e a Endurance foi sacrificada');
});

test('CR 702.74a / 603.4 / 400.7 · a evocada que sai do campo antes do gatilho resolver não é sacrificada; de volta, é outro objeto e fica', () => {
  let s = partida({ Mulldrifter: MULL(), Volta: BOUNCE }, { Mulldrifter: SC_MULL, Volta: SC_BOUNCE }); const a = s.turn.active;
  let m, v; [s, m] = poe(s, a, 'Mulldrifter', 'hand'); [s, v] = poe(s, a, 'Volta', 'hand');
  s = act(s, E.legalActions(s, a).find(x => x.t === 'cast' && x.oid === m && x.alt != null));
  for (let i = 0; i < 4 && s.objects[m].zone !== 'battlefield'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  for (let i = 0; i < 4 && s.pending; i++) s = act(s, E.legalActions(s, s.pending.p)[0]);
  assert.equal(s.objects[m].zone, 'battlefield'); assert.ok(s.stack.length >= 1, 'o sacrifício está na pilha');
  s = J(s); s.turn.priority = a;
  s = act(s, { t: 'cast', p: a, oid: v, targets: [{ oid: m }] });
  s = resolve(s);
  assert.equal(s.objects[m].zone, 'hand', 'voltou para a mão e o gatilho não a achou');
  assert.ok(!s.objects[m].evocadaK, 'na mão, a marca já não existe');
  s = resolve(act(s, E.legalActions(s, a).find(x => x.t === 'cast' && x.oid === m && x.alt == null)));
  assert.equal(s.objects[m].zone, 'battlefield', 'conjurada de novo pelo custo normal, fica');
});

test('CR 702.74a · a linha "Evoke <custo>" conta como palavra-chave na cobertura; custo que o motor não paga, não', () => {
  const c = t => S.coverage({ name: 'Z', type_line: 'Creature — Elemental', oracle_text: t }).level;
  assert.equal(c('Flash\nReach\nEvoke—Exile a green card from your hand.'), 'completo');
  assert.equal(c('Flying\nEvoke {2}{U} (You may cast this spell for its evoke cost. If you do, it\'s sacrificed when it enters.)'), 'completo');
  assert.equal(c('Evoke—Sacrifice a creature.'), 'manual');
});

/* ---------------- K-9 · 702.109 arremeter ---------------- */
const SCOUT = (kws = ['Dash']) => ({ ...oficial('Mardu Scout'), keywords: kws });
/** Passa a prioridade (respondendo pendências com a primeira ação) até o turno de `p` acabar. */
function ateFimDoTurno(s, p) { for (let i = 0; i < 80 && s.turn.active === p; i++) s = s.pending ? act(s, E.legalActions(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority }); return s; }

test('CR 702.109a · arremeter (Mardu Scout, texto oficial, sem script): a arremetida tem ímpeto e volta para a mão do dono no início do próximo passo final; pelo custo normal, não', () => {
  assert.deepEqual(J(E.arremeterImpressoK(oficial('Mardu Scout'))), { mana: '{1}{R}' });
  for (const kws of [['Dash'], []]) {
    let s = partida({ 'Mardu Scout': SCOUT(kws) }); const a = s.turn.active;
    let m; [s, m] = poe(s, a, 'Mardu Scout', 'hand');
    const ofertas = E.legalActions(s, a).filter(x => x.t === 'cast' && x.oid === m);
    const ar = ofertas.find(x => x.alt != null), normal = ofertas.find(x => x.alt == null);
    assert.ok(ar && normal, 'as duas formas de conjurar');
    let d = resolve(act(s, ar));
    assert.equal(d.objects[m].zone, 'battlefield'); assert.ok(E.hasKeyword(d, d.objects[m], 'haste'), 'arremetida: ímpeto');
    d = ateFimDoTurno(d, a);
    assert.equal(d.objects[m].zone, 'hand', 'voltou para a mão no passo final');
    assert.ok(!d.objects[m].arremetidaK, '400.7: a marca não vai para a mão');
    let n = resolve(act(s, normal));
    assert.ok(!E.hasKeyword(n, n.objects[m], 'haste'), 'pelo custo normal, sem ímpeto');
    n = ateFimDoTurno(n, a);
    assert.equal(n.objects[m].zone, 'battlefield', 'e fica');
  }
});

test('CR 702.109a / 400.7 · a arremetida que sai do campo e volta é outro objeto: não tem ímpeto nem volta para a mão', () => {
  let s = partida({ 'Mardu Scout': SCOUT(), Volta: BOUNCE }, { Volta: SC_BOUNCE }); const a = s.turn.active;
  let m, v; [s, m] = poe(s, a, 'Mardu Scout', 'hand'); [s, v] = poe(s, a, 'Volta', 'hand');
  s = resolve(act(s, E.legalActions(s, a).find(x => x.t === 'cast' && x.oid === m && x.alt != null)));
  s = resolve(act(s, { t: 'cast', p: a, oid: v, targets: [{ oid: m }] }));
  assert.equal(s.objects[m].zone, 'hand');
  s = resolve(act(s, E.legalActions(s, a).find(x => x.t === 'cast' && x.oid === m && x.alt == null)));
  assert.ok(!E.hasKeyword(s, s.objects[m], 'haste'), 'o objeto novo não foi arremetido');
  s = ateFimDoTurno(s, a);
  assert.equal(s.objects[m].zone, 'battlefield', 'o gatilho atrasado não acha a encarnação nova (603.7c)');
});

test('CR 702.109a · o custo de arremeter é o que se paga: Floresta e Montanha pagam {1}{R}, não {R}{R}', () => {
  const deck = [{ name: 'Mardu Scout', qty: 4, zone: 'main' }, { name: 'Mountain', qty: 13, zone: 'main' }, { name: 'Forest', qty: 13, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed: 5, mode: 'assisted', manaCheck: true, cards: { Mountain: terra('Mountain'), Forest: terra('Forest'), 'Mardu Scout': SCOUT() }, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active; let m; [s, m] = poe(s, a, 'Mardu Scout', 'hand'); [s] = poe(s, a, 'Mountain'); [s] = poe(s, a, 'Forest');
  const ofertas = E.legalActions(s, a).filter(x => x.t === 'cast' && x.oid === m);
  assert.ok(ofertas.length && ofertas.every(x => x.alt != null), 'só a arremetida cabe em Floresta + Montanha');
});

test('CR 702.109a · a linha "Dash <custo>" conta como palavra-chave na cobertura', () => {
  assert.equal(S.coverage(oficial('Mardu Scout')).level, 'completo');
});

/* ---------------- K-10 · 702.133 recomeçar ---------------- */
const IDEA = () => ({ ...oficial('Radical Idea'), keywords: ['Jump-start'] });
const ANULA = { name: 'Anula', type_line: 'Instant', mana_cost: '{U}{U}', cmc: 2, colors: ['U'], keywords: [], oracle_text: 'Counter target spell.' };
const SC_ANULA = { name: 'Anula', effects: [{ do: 'counter', target: 'spell' }], example: { action: 'cast', target: 'enemy-spell', expect: { countered: true } } };

test('CR 702.133a · recomeçar (Radical Idea, texto oficial): do cemitério, descartando uma carta escolhida; a mágica resolve e é exilada', () => {
  assert.equal(E.recomecarImpressoK(oficial('Radical Idea')), true);
  let s = partida({ 'Radical Idea': IDEA(), Urso: URSO }); const a = s.turn.active;
  let r, u; [s, r] = poe(s, a, 'Radical Idea', 'graveyard'); [s, u] = poe(s, a, 'Urso', 'hand');
  const ofertas = E.legalActions(s, a).filter(x => x.t === 'cast' && x.oid === r);
  assert.ok(ofertas.length >= 2 && ofertas.every(x => x.recomecarK), 'uma oferta por carta da mão para descartar');
  assert.ok(ofertas.some(x => x.pay.discard[0] === u));
  const mao = s.zones[a].hand.length;
  let t = act(s, ofertas.find(x => x.pay.discard[0] === u));
  assert.equal(t.objects[u].zone, 'graveyard', 'o Urso foi descartado (custo adicional)');
  t = resolve(t);
  assert.equal(t.objects[r].zone, 'exile', 'recomeçada: exilada ao sair da pilha');
  assert.equal(t.zones[a].hand.length, mao - 1 + 1, 'descartou uma e comprou uma');
});

test('CR 702.133a · recomeçada anulada também vai para o exílio; sem carta na mão, não há oferta; carta sem recomeçar não sai do cemitério', () => {
  let s = partida({ 'Radical Idea': IDEA(), Urso: URSO, Anula: ANULA }, { Anula: SC_ANULA }); const a = s.turn.active;
  s = J(s); s.zones[a].library.push(...s.zones[a].hand.splice(0)); for (const x of s.zones[a].library) s.objects[x].zone = 'library';
  let r; [s, r] = poe(s, a, 'Radical Idea', 'graveyard');
  assert.ok(!E.legalActions(s, a).some(x => x.t === 'cast' && x.oid === r), 'mão vazia: nada para descartar');
  let u; [s, u] = poe(s, a, 'Urso', 'hand');
  assert.throws(() => act(s, { t: 'cast', p: a, oid: r }), /só conjura da mão/, 'sem recomeçar, do cemitério não');
  s = act(s, E.legalActions(s, a).find(x => x.t === 'cast' && x.oid === r && x.recomecarK));
  const d = 1 - a; let an; [s, an] = poe(s, d, 'Anula', 'hand'); s = J(s); s.turn.priority = d;
  s = resolve(act(s, { t: 'cast', p: d, oid: an, targets: [{ oid: r }] }));
  assert.equal(s.objects[r].zone, 'exile', 'anulada: exílio, não cemitério');
});

test('CR 702.133a · o custo de mana é o normal, com o descarte por cima (não é custo alternativo)', () => {
  const deck = [{ name: 'Radical Idea', qty: 4, zone: 'main' }, { name: 'Island', qty: 26, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed: 5, mode: 'assisted', manaCheck: true, cards: { Island: terra('Island'), 'Radical Idea': IDEA() }, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const a = s.turn.active; let r; [s, r] = poe(s, a, 'Radical Idea', 'graveyard'); [s] = poe(s, a, 'Island');
  assert.ok(!E.legalActions(s, a).some(x => x.t === 'cast' && x.oid === r), 'uma Ilha não paga {1}{U}');
  [s] = poe(s, a, 'Island');
  const of = E.legalActions(s, a).find(x => x.t === 'cast' && x.oid === r);
  assert.ok(of && of.recomecarK, 'duas Ilhas pagam');
  const t = act(s, of);
  assert.equal(t.zones[a].battlefield.filter(x => t.objects[x].tapped).length, 2, '{1}{U} pago');
});

test('CR 702.133a · a linha "Jump-start" conta como palavra-chave na cobertura (o efeito da mágica continua pedindo script)', () => {
  assert.equal(S.coverage({ name: 'Z', type_line: 'Creature — Elf', oracle_text: 'Jump-start' }).level, 'completo');
  assert.equal(S.coverage(oficial('Radical Idea')).level, 'completo', 'Radical Idea tem script');
});

/* ---------------- K-11 · 702.100 evoluir ---------------- */
const RAPTOR = () => oficial('Cloudfin Raptor');
const NANICO = { name: 'Nanico', type_line: 'Creature — Elf', mana_cost: '{G}', cmc: 1, colors: ['G'], power: '1', toughness: '1', keywords: [], oracle_text: '' };
const LAMPEJO = { name: 'Lampejo', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, colors: ['G'], power: '3', toughness: '3', keywords: ['Flash'], oracle_text: 'Flash' };
const pilhaDe = (s, nome) => s.stack.filter(x => s.objects[x].ability && s.objects[x].name === nome).length + s.queued.filter(q => q.name === nome).length;

test('CR 702.100a · evoluir (Cloudfin Raptor, texto oficial, sem script): criatura sua maior entra e ele ganha +1/+1; menor ou igual, não; a do oponente, não', () => {
  let s = partida({ 'Cloudfin Raptor': RAPTOR(), Urso: URSO, Nanico: NANICO, Lampejo: LAMPEJO }); const a = s.turn.active, d = 1 - a;
  let r, u, n; [s, r] = poe(s, a, 'Cloudfin Raptor'); [s, u] = poe(s, a, 'Urso', 'hand');
  s = act(s, { t: 'cast', p: a, oid: u }); s = resolve(s);
  assert.equal(E.stats(s, s.objects[r]).power, 1, '0/1 → 1/2 com o Urso 2/2'); assert.equal(E.stats(s, s.objects[r]).toughness, 2);
  [s, n] = poe(s, a, 'Nanico', 'hand'); s = act(s, { t: 'cast', p: a, oid: n });
  for (let i = 0; i < 3 && s.stack.length; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(pilhaDe(s, 'Cloudfin Raptor'), 0, 'o 1/1 não é maior que o 1/2: não dispara');
  let uo; [s, uo] = poe(s, d, 'Lampejo', 'hand'); s = J(s); s.turn.priority = d; s = resolve(act(s, { t: 'cast', p: d, oid: uo }));
  assert.equal(E.stats(s, s.objects[r]).power, 1, 'a criatura do oponente não conta');
});

test('CR 702.100a / 603.4 · a condição confere de novo na resolução; a que entrou e saiu vale como era (608.2h)', () => {
  let s = partida({ 'Cloudfin Raptor': RAPTOR(), Urso: URSO, Volta: BOUNCE }, { Volta: SC_BOUNCE }); const a = s.turn.active;
  let r, u, v; [s, r] = poe(s, a, 'Cloudfin Raptor'); [s, u] = poe(s, a, 'Urso', 'hand'); [s, v] = poe(s, a, 'Volta', 'hand');
  const comGatilho = st => { for (let i = 0; i < 4 && !st.stack.some(x => st.objects[x].ability); i++) st = act(st, { t: 'pass', p: st.turn.priority }); return st; };
  let base = comGatilho(act(s, { t: 'cast', p: a, oid: u }));
  assert.equal(pilhaDe(base, 'Cloudfin Raptor'), 1, 'disparou');
  let cresceu = J(base); cresceu.objects[r].counters.p1p1 = 3; cresceu = resolve(cresceu); // agora 3/4: o Urso 2/2 já não é maior
  assert.equal(cresceu.objects[r].counters.p1p1, 3, 'na resolução a condição falhou: nada');
  let saiu = J(base); saiu.turn.priority = a; saiu = resolve(act(saiu, { t: 'cast', p: a, oid: v, targets: [{ oid: u }] }));
  assert.equal(saiu.objects[u].zone, 'hand'); assert.equal(saiu.objects[r].counters.p1p1, 1, 'o Urso saiu, mas era 2/2: evoluiu');
});

test('CR 702.100d · cada instância de evoluir dispara à parte, e cada uma confere a condição de novo ao resolver', () => {
  const DUPLO = { ...RAPTOR(), name: 'Duplo', oracle_text: 'Evolve, evolve', keywords: ['Evolve'] };
  let s = partida({ Duplo: DUPLO, Urso: URSO }); const a = s.turn.active;
  let r, u; [s, r] = poe(s, a, 'Duplo'); [s, u] = poe(s, a, 'Urso', 'hand');
  s = act(s, { t: 'cast', p: a, oid: u }); for (let i = 0; i < 3 && !s.stack.some(x => s.objects[x].ability); i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(pilhaDe(s, 'Duplo'), 2, 'duas instâncias, dois gatilhos');
  s = resolve(s); assert.equal(s.objects[r].counters.p1p1, 2, 'a segunda confere de novo: o 1/2 ainda tem poder menor que o Urso 2/2 → evolui também');
  let t2 = partida({ Duplo: DUPLO, Urso: URSO }); const a2 = t2.turn.active; let r2, u2; [t2, r2] = poe(t2, a2, 'Duplo'); [t2, u2] = poe(t2, a2, 'Urso', 'hand');
  t2 = J(t2); t2.objects[r2].counters.p1p1 = 1; // 1/2: só a primeira passa? as duas conferem ao disparar (o Urso 2/2 é maior no poder)
  t2 = resolve(act(t2, { t: 'cast', p: a2, oid: u2 }));
  assert.equal(t2.objects[r2].counters.p1p1, 2, 'com 1/2: a primeira dá 2/3; a segunda, na resolução, vê 2 contra 2 e 2 contra 3: não evolui');
});

/* ---------------- K-12 · 702.110 explorar ---------------- */
const FAITHFUL = () => ({ ...oficial("Sidisi's Faithful"), keywords: ['Exploit'] });
const SC_FAITHFUL_MAP = () => ({ "Sidisi's Faithful": SC_FAITHFUL });
const SC_FAITHFUL = { name: "Sidisi's Faithful", abilities: [{ kind: 'triggered', when: 'exploits', effects: [{ do: 'bounce', target: 'creature' }] }], example: { action: 'etb', target: 'enemy-creature', expect: { bounced: true } } };
/** Resolve a pilha respondendo cada pendência com `escolhe(acoes, pendencia)` (ou a primeira ação). */
function resolveCom(s, escolhe) {
  for (let i = 0; i < 20 && (s.stack.length || s.pending); i++) {
    if (s.pending) { const la = E.legalActions(s, s.pending.p); s = act(s, escolhe(la, s.pending, s) || la[0]); } else s = act(s, { t: 'pass', p: s.turn.priority });
  }
  return s;
}

test('CR 702.110a · explorar (Sidisi’s Faithful, texto oficial): ao entrar você pode sacrificar uma criatura; sacrificando, a habilidade "quando explora" dispara (702.110b); recusando, nada', () => {
  let s = partida({ "Sidisi's Faithful": FAITHFUL(), Urso: URSO }, { "Sidisi's Faithful": SC_FAITHFUL }); const a = s.turn.active, d = 1 - a;
  let f, u, uo; [s, u] = poe(s, a, 'Urso'); [s, uo] = poe(s, d, 'Urso'); [s, f] = poe(s, a, "Sidisi's Faithful", 'hand');
  s = act(s, { t: 'cast', p: a, oid: f });
  const sim = resolveCom(s, (la, pk, st) => pk.kind === 'may_pay' ? la.find(x => x.t === 'pay') : pk.kind === 'sacrifice' ? la.find(x => x.oid === u)
    : pk.kind === 'pick_target' ? la.find(x => (st.pending.options || [])[x.index] && JSON.stringify(st.pending.options[x.index]).includes(uo)) : null);
  assert.equal(sim.objects[u].zone, 'graveyard', 'sacrificou o Urso'); assert.equal(sim.objects[uo].zone, 'hand', 'explorou: o Urso do oponente voltou para a mão');
  const nao = resolveCom(s, (la, pk) => pk.kind === 'may_pay' ? la.find(x => x.t === 'decline') : null);
  assert.equal(nao.objects[u].zone, 'battlefield'); assert.equal(nao.objects[uo].zone, 'battlefield', 'recusou: ninguém explora');
});

test('CR 702.110b · sacrificar a própria criatura com explorar faz a habilidade dela disparar (olha como era no campo); se ela saiu antes, o sacrifício não é "explorar"', () => {
  let s = partida({ "Sidisi's Faithful": FAITHFUL(), Urso: URSO, Volta: BOUNCE }, { "Sidisi's Faithful": SC_FAITHFUL, Volta: SC_BOUNCE }); const a = s.turn.active, d = 1 - a;
  let f, u, uo, v; [s, u] = poe(s, a, 'Urso'); [s, uo] = poe(s, d, 'Urso'); [s, f] = poe(s, a, "Sidisi's Faithful", 'hand'); [s, v] = poe(s, a, 'Volta', 'hand');
  s = act(s, { t: 'cast', p: a, oid: f });
  const ela = resolveCom(s, (la, pk) => pk.kind === 'may_pay' ? la.find(x => x.t === 'pay') : pk.kind === 'sacrifice' ? la.find(x => x.oid === f) : null);
  assert.equal(ela.objects[f].zone, 'graveyard'); assert.ok(ela.objects[uo].zone === 'hand' || ela.objects[u].zone === 'hand', 'sacrificou a si mesma e a volta disparou');
  let t = s; for (let i = 0; i < 4 && !t.stack.some(x => t.objects[x].ability); i++) t = act(t, { t: 'pass', p: t.turn.priority });
  t = J(t); t.turn.priority = a; t = act(t, { t: 'cast', p: a, oid: v, targets: [{ oid: f }] });
  t = resolveCom(t, (la, pk) => pk.kind === 'may_pay' ? la.find(x => x.t === 'pay') : pk.kind === 'sacrifice' ? la.find(x => x.oid === u) : null);
  assert.equal(t.objects[f].zone, 'hand'); assert.equal(t.objects[u].zone, 'graveyard', 'o sacrifício aconteceu');
  assert.equal(t.objects[uo].zone, 'battlefield', 'mas a Faithful já tinha saído: não explorou');
});

test('CR 702.110a · explorar sem script: a carta com só "Exploit" joga, e a palavra-chave conta na cobertura', () => {
  assert.equal(S.coverage({ name: 'Z', type_line: 'Creature — Zombie', oracle_text: 'Exploit (When this creature enters, you may sacrifice a creature.)' }).level, 'completo');
  assert.equal(S.coverage(oficial('Silumgar Butcher')).level, 'parcial', 'a habilidade "quando explora" continua pedindo script');
});

/* ---------------- K-13 · 702.51 convocar e 702.126 improvisar ---------------- */
const BRANCO = { name: 'Branco', type_line: 'Creature — Soldier', mana_cost: '{W}', cmc: 1, colors: ['W'], power: '1', toughness: '1', keywords: [], oracle_text: '' };
const PECA = { name: 'Peca', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, colors: [], keywords: [], oracle_text: '' };
/** Partida com o mana conferido: só as cartas pedidas no grimório (mais terrenos básicos), parada na 1ª fase principal. */
function comMana(cards, scripts = {}) {
  const all = { Forest: terra('Forest'), Island: terra('Island'), ...cards };
  const deck = Object.keys(all).map(name => ({ name, qty: 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 7, mode: 'assisted', manaCheck: true, cards: all, scripts, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  s = J(s); for (let p = 0; p < 2; p++) { s.zones[p].library.push(...s.zones[p].hand.splice(0)); for (const x of s.zones[p].library) s.objects[x].zone = 'library'; }
  return s;
}

test('CR 702.51a · convocar (Siege Wurm, texto oficial, sem script): três Florestas e quatro criaturas pagam {5}{G}{G}; as verdes pagam {G}, as outras o genérico; com enjoo também serve', () => {
  assert.deepEqual(J(E.tapaImpressoK(oficial('Siege Wurm'))), ['convoke']);
  let s = comMana({ 'Siege Wurm': oficial('Siege Wurm'), Urso: URSO, Branco: BRANCO }); const a = s.turn.active;
  let w; [s, w] = poe(s, a, 'Siege Wurm', 'hand');
  for (let i = 0; i < 3; i++) [s] = poe(s, a, 'Forest');
  const cr = []; for (const n of ['Urso', 'Urso', 'Branco', 'Branco']) { let x; [s, x] = poe(s, a, n); cr.push(x); }
  s = J(s); s.objects[cr[0]].sick = true; // 702.51: virar para convocar não é habilidade {T}
  const of = E.legalActions(s, a).filter(x => x.t === 'cast' && x.oid === w);
  assert.ok(of.length && of.every(x => x.tapaK), 'sem convocar não paga');
  const todas = of.find(x => x.tapaK.length === 4); assert.ok(todas, 'as quatro criaturas pagam GG + 2');
  const r = act(s, todas);
  assert.equal(r.objects[w].zone, 'stack'); assert.ok(cr.every(x => r.objects[x].tapped), 'as quatro viraram');
  assert.equal(r.zones[a].battlefield.filter(x => r.objects[x].name === 'Forest' && r.objects[x].tapped).length, 3, 'e as três Florestas pagaram o resto');
  assert.throws(() => act(s, { ...todas, tapaK: [cr[2], cr[3]], pay: { tapOther: [cr[2], cr[3]] } }), /mana insuficiente/, 'duas brancas não pagam o {G}{G}');
});

test('CR 702.51a · convocar: criatura que não paga nada (cor errada, sem genérico) não entra no grupo; só a da cor', () => {
  const VERDINHO = { name: 'Verdinho', type_line: 'Instant', mana_cost: '{G}', cmc: 1, colors: ['G'], keywords: ['Convoke'], oracle_text: 'Convoke\nYou gain 1 life.' };
  const SC_V = { name: 'Verdinho', effects: [{ do: 'gain', amount: 1 }], example: { target: 'none', expect: { selfLife: 1 } } };
  let s = comMana({ Verdinho: VERDINHO, Urso: URSO, Branco: BRANCO }, { Verdinho: SC_V }); const a = s.turn.active;
  let v, b, u; [s, v] = poe(s, a, 'Verdinho', 'hand'); [s, b] = poe(s, a, 'Branco');
  assert.ok(!E.legalActions(s, a).some(x => x.t === 'cast' && x.oid === v), 'a branca não paga {G}');
  [s, u] = poe(s, a, 'Urso');
  const of = E.legalActions(s, a).filter(x => x.t === 'cast' && x.oid === v);
  assert.deepEqual(J(of.map(x => x.tapaK)), [[u]], 'só o Urso verde');
  const r = resolve(act(s, of[0])); assert.equal(r.players[a].life, s.players[a].life + 1);
});

test('CR 702.126a · improvisar (Metallic Rebuke, texto oficial): artefatos pagam só o genérico; Ilha + dois artefatos pagam {2}{U}; três artefatos sem Ilha, não', () => {
  assert.deepEqual(J(E.tapaImpressoK(oficial('Metallic Rebuke'))), ['improvise']);
  let s = comMana({ 'Metallic Rebuke': oficial('Metallic Rebuke'), Peca: PECA, Raio: RAIO }, SC_RAIO); const a = s.turn.active, d = 1 - a;
  let m; [s, m] = poe(s, a, 'Metallic Rebuke', 'hand');
  const ps = []; for (let i = 0; i < 3; i++) { let x; [s, x] = poe(s, a, 'Peca'); ps.push(x); }
  let ro; [s, ro] = poe(s, d, 'Raio', 'hand'); s = J(s); s.manaCheck = false; s.turn.priority = d; s = act(s, { t: 'cast', p: d, oid: ro, targets: [{ player: a }] }); s = J(s); s.manaCheck = true;
  s = J(s); s.turn.priority = a;
  assert.ok(!E.legalActions(s, a).some(x => x.t === 'cast' && x.oid === m), 'sem Ilha: o {U} não sai de artefato');
  [s] = poe(s, a, 'Island'); s = J(s); s.turn.priority = a;
  const of = E.legalActions(s, a).filter(x => x.t === 'cast' && x.oid === m);
  assert.ok(of.length && of.every(x => x.tapaK.length === 2), 'dois artefatos pagam o {2}');
  const r = act(s, of[0]); assert.equal(r.objects[m].zone, 'stack');
});

test('CR 702.51a / 702.126a · as linhas "Convoke" e "Improvise" contam como palavra-chave na cobertura', () => {
  assert.equal(S.coverage(oficial('Siege Wurm')).level, 'completo');
  assert.equal(S.coverage(oficial('Metallic Rebuke')).level, 'completo', 'Metallic Rebuke tem script');
});

/* ---------------- K-14 · correções da auditoria independente da onda 1 (palavras-chave disparadas) ---------------- */
const IRA = { name: 'Ira', type_line: 'Sorcery', mana_cost: '{2}{W}{W}', cmc: 4, colors: ['W'], keywords: [], oracle_text: 'Destroy all creatures.' };
const SC_IRA = { Ira: { name: 'Ira', effects: [{ do: 'destroy_all', types: ['creature'] }], example: { target: 'none', expect: { selfLife: 0 } } } };
const LORDE = k => ({ name: 'Lorde', type_line: 'Creature — Zombie Cleric', mana_cost: '{1}{B}', cmc: 2, colors: ['B'], power: '2', toughness: '2', keywords: [], oracle_text: `Creatures you control have ${k}.` });
const SC_LORDE = k => ({ Lorde: { name: 'Lorde', grantsAll: { keywords: [k] }, example: { action: 'etb', target: 'none', expect: { attached: false } } } });
const CLONE = { name: 'Clone', type_line: 'Creature — Shapeshifter', mana_cost: '{3}{U}', cmc: 4, colors: ['U'], power: '0', toughness: '0', keywords: [], oracle_text: 'You may have Clone enter as a copy of any creature on the battlefield.' };
const SC_CLONE = { Clone: { name: 'Clone', entraComoCopia: { de: { tipos: ['creature'] } }, example: { action: 'etb', target: 'none', expect: { attached: false } } } };

test('CR 702.108a / 400.7 · auditoria K-14: a proeza que resolve depois de a criatura sair e voltar não dá +1/+1 ao objeto novo', () => {
  const PZ = { name: 'Monge', type_line: 'Creature — Human Monk', mana_cost: '{R}', cmc: 1, colors: ['R'], power: '1', toughness: '2', keywords: ['Flash', 'Prowess'], oracle_text: 'Flash\nProwess' };
  let s = partida({ Monge: PZ, Raio: RAIO, Volta: BOUNCE }, { ...SC_RAIO, Volta: SC_BOUNCE }); const a = s.turn.active, d = 1 - a;
  let m, r, v; [s, m] = poe(s, a, 'Monge'); [s, r] = poe(s, a, 'Raio', 'hand'); [s, v] = poe(s, a, 'Volta', 'hand');
  s = act(s, { t: 'cast', p: a, oid: r, targets: [{ player: d }] }); // a proeza dispara (fica acima do Raio)
  s = act(s, { t: 'cast', p: a, oid: v, targets: [{ oid: m }] }); // e o Monge volta para a mão antes de ela resolver
  for (let i = 0; i < 10 && s.objects[m].zone === 'battlefield'; i++) s = s.pending ? act(s, E.legalActions(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
  s = J(s); s.turn.priority = a; s = act(s, { t: 'cast', p: a, oid: m }); // conjurado de novo, com lampejo, por cima da proeza antiga
  s = resolve(s);
  assert.equal(s.objects[m].zone, 'battlefield'); assert.equal(E.stats(s, s.objects[m]).power, 1, 'o Monge novo não ganhou o +1/+1 da proeza do antigo');
});

test('CR 702.93a / 702.79a / 702.135a / 603.10a · auditoria K-14: a palavra-chave concedida conta como era no campo — quem a concede morrendo sozinho ou junto', () => {
  for (const k of ['undying', 'persist', 'afterlife']) {
    // sozinho: o Lorde ("suas criaturas têm …") também a tem
    let s = partida({ Lorde: LORDE(k), Mata: MATA }, { ...SC_MATA, ...SC_LORDE(k) }); const a = s.turn.active;
    let l, mt; [s, l] = poe(s, a, 'Lorde'); [s, mt] = poe(s, a, 'Mata', 'hand');
    s = resolve(act(s, { t: 'cast', p: a, oid: mt, targets: [{ oid: l }] }));
    if (k === 'afterlife') assert.equal(s.zones[a].battlefield.filter(x => s.objects[x].token).length, 1, `${k}: o Lorde sozinho deixa a ficha`);
    else assert.equal(s.objects[l].zone, 'battlefield', `${k}: o Lorde sozinho volta`);
    for (const ordem of ['lorde-primeiro', 'urso-primeiro']) { // juntos: cada uma vê o Lorde como era (603.10a)
      let t = partida({ Lorde: LORDE(k), Urso: URSO, Ira: IRA }, { ...SC_IRA, ...SC_LORDE(k) }); const b = t.turn.active;
      let lo, u, ira;
      if (ordem === 'lorde-primeiro') { [t, lo] = poe(t, b, 'Lorde'); [t, u] = poe(t, b, 'Urso'); } else { [t, u] = poe(t, b, 'Urso'); [t, lo] = poe(t, b, 'Lorde'); }
      [t, ira] = poe(t, b, 'Ira', 'hand');
      t = resolve(act(t, { t: 'cast', p: b, oid: ira }));
      if (k === 'afterlife') assert.equal(t.zones[b].battlefield.filter(x => t.objects[x].token).length, 2, `${k} (${ordem}): duas fichas`);
      else { assert.equal(t.objects[lo].zone, 'battlefield', `${k} (${ordem}): o Lorde volta`); assert.equal(t.objects[u].zone, 'battlefield', `${k} (${ordem}): o Urso volta`); }
    }
  }
});

test('CR 702.110b / 603.10a · auditoria K-14: o Clone copiando a Sidisi’s Faithful que sacrifica a si mesmo explora', () => {
  let s = partida({ "Sidisi's Faithful": FAITHFUL(), Clone: CLONE, Urso: URSO }, { ...SC_FAITHFUL_MAP(), ...SC_CLONE }); const a = s.turn.active, d = 1 - a;
  let f, c, uo; [s, f] = poe(s, a, "Sidisi's Faithful"); [s, uo] = poe(s, d, 'Urso'); [s, c] = poe(s, a, 'Clone', 'hand');
  s = act(s, { t: 'cast', p: a, oid: c });
  s = resolveCom(s, (la, pk, st) => la.find(x => JSON.stringify(x).includes(`"${f}"`) && pk.kind !== 'sacrifice' && pk.kind !== 'pick_target') && pk.kind !== 'may_pay' ? la.find(x => JSON.stringify(x).includes(`"${f}"`))
    : pk.kind === 'may_pay' ? la.find(x => x.t === 'pay') : pk.kind === 'sacrifice' ? la.find(x => x.oid === c)
    : pk.kind === 'pick_target' ? la.find(x => JSON.stringify((st.pending.options || [])[x.index] || '').includes(uo)) : null);
  assert.equal(s.objects[c].zone, 'graveyard', 'o Clone sacrificou a si mesmo'); assert.equal(s.objects[uo].zone, 'hand', 'e explorou: o Urso do oponente voltou');
});

test('CR 702.21a / 707.10 · auditoria K-14: a cópia de mágica que mira a permanente com salvaguarda também dispara a salvaguarda', () => {
  const CRAB = { name: 'Crab', type_line: 'Creature — Crab', mana_cost: '{3}{U}', cmc: 4, colors: ['U'], power: '2', toughness: '5', keywords: ['Ward'], oracle_text: 'Ward {2}' };
  const ECO = { name: 'Eco', type_line: 'Sorcery', mana_cost: '{R}', cmc: 1, colors: ['R'], keywords: [], oracle_text: 'Eco deals 1 damage to any target. You may copy this spell. You may choose a new target for the copy.' };
  const SC_ECO = { Eco: { name: 'Eco', effects: [{ do: 'damage', amount: 1, target: 'any' }, { do: 'copiar_esta' }], example: { target: 'opponent', expect: { opponentLife: 19 } } } };
  let s = partida({ Crab: CRAB, Eco: ECO }, SC_ECO, 5); const a = s.turn.active, d = 1 - a;
  let crab, e; [s, crab] = poe(s, d, 'Crab'); [s, e] = poe(s, a, 'Eco', 'hand');
  s = act(s, { t: 'cast', p: a, oid: e, targets: [{ player: d }] });
  let viu = false;
  for (let i = 0; i < 30 && (s.stack.length || s.pending); i++) {
    if (s.pending) { const la = E.legalActions(s, s.pending.p); s = act(s, la.find(y => JSON.stringify(y).includes(crab)) || la.find(y => y.t === 'decline') || la[0]); }
    else s = act(s, { t: 'pass', p: s.turn.priority });
    if (s.stack.some(x => s.objects[x].ability && s.objects[x].name === 'Crab') || s.queued.some(q => q.name === 'Crab')) viu = true;
  }
  assert.ok(viu, 'a salvaguarda do Crab disparou contra a cópia');
});

/* ---------------- K-15 · correções da auditoria independente da onda 1 (custos e característica) ---------------- */
test('CR 702.51a · auditoria K-15: a criatura de duas cores paga o símbolo de qualquer uma das cores dela (o motor acha a forma que fecha o custo)', () => {
  const JUNTOS = { name: 'Juntos', type_line: 'Instant', mana_cost: '{G}{W}', cmc: 2, colors: ['G', 'W'], keywords: ['Convoke'], oracle_text: 'Convoke\nYou gain 1 life.' };
  const SC_J = { Juntos: { name: 'Juntos', effects: [{ do: 'gain', amount: 1 }], example: { target: 'none', expect: { selfLife: 1 } } } };
  for (const [terreno, cores] of [['Forest', ['G', 'W']], ['Plains', ['G', 'W']], ['Forest', ['W', 'G']]]) {
    const DUPLA = { name: 'Dupla', type_line: 'Creature — Elf Soldier', mana_cost: '{G}{W}', cmc: 2, colors: cores, power: '2', toughness: '2', keywords: [], oracle_text: '' };
    let s = comMana({ Juntos: JUNTOS, Dupla: DUPLA, Plains: terra('Plains') }, SC_J); const a = s.turn.active;
    let m, d; [s, m] = poe(s, a, 'Juntos', 'hand'); [s, d] = poe(s, a, 'Dupla'); [s] = poe(s, a, terreno);
    const of = E.legalActions(s, a).find(x => x.t === 'cast' && x.oid === m && x.tapaK);
    assert.ok(of, `${terreno} + criatura ${cores.join('')}: oferecido`);
    const r = resolve(act(s, of)); assert.equal(r.players[a].life, s.players[a].life + 1, `${terreno} + ${cores.join('')}: conjurada`);
  }
});

test('CR 702.51a / 702.126a · auditoria K-15: convocar vale fora da mão — comandante na zona de comando e carta no exílio com permissão de jogar', () => {
  const RESG = { name: 'Resgatador', type_line: 'Legendary Creature — Human Samurai', mana_cost: '{3}{W}{W}', cmc: 5, colors: ['W'], color_identity: ['W'], power: '3', toughness: '2', keywords: ['Convoke'], oracle_text: 'Convoke' };
  const cards = { Plains: terra('Plains'), Branco: BRANCO, Resgatador: RESG };
  const deck = [{ name: 'Resgatador', qty: 1, zone: 'commander' }, { name: 'Plains', qty: 60, zone: 'main' }, { name: 'Branco', qty: 39, zone: 'main' }];
  let s = E.createGame({ format: 'commander', seed: 3, mode: 'assisted', manaCheck: true, cards, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  s = J(s); const a = s.turn.active;
  for (let p = 0; p < 2; p++) { s.zones[p].library.push(...s.zones[p].hand.splice(0)); for (const x of s.zones[p].library) s.objects[x].zone = 'library'; }
  const cr = []; for (let i = 0; i < 5; i++) { let x; [s, x] = poe(s, a, 'Branco'); cr.push(x); }
  const cmd = s.zones[a].command[0];
  assert.ok(E.legalActions(s, a).some(x => x.t === 'cast' && x.oid === cmd && x.tapaK && x.tapaK.length === 5), 'da zona de comando, as cinco criaturas pagam');
  let t = J(s); t.zones[a].command.splice(t.zones[a].command.indexOf(cmd), 1); t.zones[a].exile.push(cmd); Object.assign(t.objects[cmd], { zone: 'exile', playableFromExile: a });
  assert.ok(E.legalActions(t, a).some(x => x.t === 'cast' && x.oid === cmd && x.tapaK), 'do exílio com permissão de jogar também');
});

test('CR 702.51a · auditoria K-15: com muitas criaturas, cada tamanho de grupo é oferecido — inclusive virar todas e deixar os terrenos desvirados', () => {
  let s = comMana({ 'Siege Wurm': oficial('Siege Wurm'), Urso: URSO, Branco: BRANCO }); const a = s.turn.active;
  let w; [s, w] = poe(s, a, 'Siege Wurm', 'hand');
  for (let i = 0; i < 4; i++) [s] = poe(s, a, 'Forest');
  for (const n of ['Urso', 'Urso', 'Urso', 'Branco', 'Branco', 'Branco', 'Branco']) [s] = poe(s, a, n);
  const tamanhos = new Set(E.legalActions(s, a).filter(x => x.t === 'cast' && x.oid === w && x.tapaK).map(x => x.tapaK.length));
  assert.deepEqual([...tamanhos].sort((x, y) => x - y), [3, 4, 5, 6, 7], 'de 3 (o mínimo com 4 Florestas) a 7 (todas)');
});

test('CR 702.73a / 702.114a · auditoria K-15: metamorfo e desprovido valem pela linha do texto também quando o dado da carta vem sem a lista de palavras-chave', () => {
  let s = partida({ Muda: { ...MUDA, keywords: [] }, Chefe: CHEFE }, { Chefe: SC_CHEFE }); const a = s.turn.active;
  let muda; [s] = poe(s, a, 'Chefe'); [s, muda] = poe(s, a, 'Muda', 'hand');
  const vida = s.players[a].life; s = resolve(act(s, { t: 'cast', p: a, oid: muda }));
  assert.equal(s.players[a].life, vida + 1, 'o metamorfo só com o texto conta como Elfo');
  const DESP = { name: 'Desprovida', type_line: 'Creature — Eldrazi', mana_cost: '{1}{G}', cmc: 2, colors: ['G'], power: '2', toughness: '2', keywords: [], oracle_text: 'Devoid' };
  const t = partida({ Desprovida: DESP });
  assert.deepEqual(J(t.facts.Desprovida.colors), [], 'a desprovida só com o texto é incolor');
});

/* ---------------- K-16 · 702.29 ciclar ---------------- */
test('CR 702.29a · ciclar é habilidade ativada: o descarte é custo e a compra vai para a pilha (o oponente pode responder antes)', () => {
  let s = partida({ 'Renewed Faith': oficial('Renewed Faith') }); const a = s.turn.active, d = 1 - a;
  let r; [s, r] = poe(s, a, 'Renewed Faith', 'hand');
  const mao = s.zones[a].hand.length;
  s = act(s, { t: 'cycle', p: a, oid: r });
  assert.equal(s.objects[r].zone, 'graveyard', 'descartada no custo'); assert.equal(s.zones[a].hand.length, mao - 1, 'ainda não comprou');
  assert.ok(s.stack.some(x => s.objects[x].ability && s.objects[x].name === 'Renewed Faith'), 'a compra está na pilha');
  s = act(s, { t: 'pass', p: a }); assert.equal(s.turn.priority, d, 'o oponente recebe a prioridade com a compra na pilha');
});

test('CR 702.29c · "When you cycle Renewed Faith, you may gain 2 life" (texto oficial) dispara do cemitério; recusando, nada', () => {
  let s = partida({ 'Renewed Faith': oficial('Renewed Faith') }); const a = s.turn.active;
  let r; [s, r] = poe(s, a, 'Renewed Faith', 'hand'); const vida = s.players[a].life, mao = s.zones[a].hand.length;
  const sim = resolveCom(act(s, { t: 'cycle', p: a, oid: r }), (la, pk) => pk.kind === 'may_pay' ? la.find(x => x.t === 'pay') : null);
  assert.equal(sim.players[a].life, vida + 2, 'ganhou 2'); assert.equal(sim.zones[a].hand.length, mao, 'e comprou uma');
  const nao = resolveCom(act(s, { t: 'cycle', p: a, oid: r }), (la, pk) => pk.kind === 'may_pay' ? la.find(x => x.t === 'decline') : null);
  assert.equal(nao.players[a].life, vida, 'recusou: não ganha');
});

test('CR 702.29e · tipociclar (Ash Barrens, texto oficial: "Basic landcycling {1}"): procura um terreno básico, põe na mão e embaralha; terreno não básico não serve', () => {
  const ASH = { ...oficial('Ash Barrens'), cmc: 0 };
  const DESERTO = { name: 'Deserto', type_line: 'Land — Desert', mana_cost: '', cmc: 0, colors: [], keywords: [], oracle_text: '' };
  const SC_ASH = { 'Ash Barrens': { name: 'Ash Barrens', produces: [['C']], cycling: { mana: '{1}', busca: { types: ['land'], basic: true } }, example: { action: 'etb', target: 'none', expect: { attached: false } } } };
  let s = partida({ 'Ash Barrens': ASH, Deserto: DESERTO }, SC_ASH); const a = s.turn.active;
  let ab; [s, ab] = poe(s, a, 'Ash Barrens', 'hand');
  s = resolveCom(act(s, { t: 'cycle', p: a, oid: ab }), (la, pk, st) => pk.kind === 'pick' ? la.find(x => x.oid && st.objects[x.oid].name === 'Forest') : null);
  assert.equal(s.objects[ab].zone, 'graveyard');
  assert.ok(s.zones[a].hand.some(x => s.objects[x].name === 'Forest'), 'a Floresta veio para a mão');
  let t = partida({ 'Ash Barrens': ASH, Deserto: DESERTO }, SC_ASH); const b = t.turn.active; let ab2; [t, ab2] = poe(t, b, 'Ash Barrens', 'hand');
  t = act(t, { t: 'cycle', p: b, oid: ab2 }); t = act(act(t, { t: 'pass', p: b }), { t: 'pass', p: 1 - b });
  assert.ok(t.pending && t.pending.kind === 'pick'); assert.ok(t.pending.from.every(x => t.objects[x].name === 'Forest'), 'só os básicos são opções (o Deserto não)');
});

/* ---------------- K-17 · 702.16 proteção com qualquer qualidade ---------------- */
const CHAPLAIN = () => ({ ...oficial('Beloved Chaplain'), keywords: ['Protection'] });
const GOBLIN = { name: 'Goblin', type_line: 'Creature — Goblin', mana_cost: '{R}', cmc: 1, colors: ['R'], power: '1', toughness: '1', keywords: [], oracle_text: '' };
/** Declara o ataque de `atk` e devolve se `blk` pode bloqueá-lo (pela lista de bloqueios legais da mesa). */
function podeBloquear(s, atk, blk) {
  const a = s.turn.active; let t = s;
  for (let i = 0; i < 6 && t.turn.step !== 'combat_attackers'; i++) t = act(t, { t: 'pass', p: t.turn.priority });
  t = act(t, { t: 'attack', p: a, attackers: [atk] });
  for (let i = 0; i < 6 && !(t.pending && t.pending.kind === 'blockers'); i++) t = act(t, { t: 'pass', p: t.turn.priority });
  try { act(t, { t: 'block', p: 1 - a, blocks: [[blk, atk]] }); return true; } catch (e) { return false; }
}

test('CR 702.16a/f · proteção contra criaturas (Beloved Chaplain, texto oficial): não é bloqueada por criatura; mágica que não é criatura mira normalmente', () => {
  assert.deepEqual(J(E.protecaoQualidadesK(oficial('Beloved Chaplain'))), ['tipo:creature']);
  let s = partida({ 'Beloved Chaplain': CHAPLAIN(), Urso: URSO, Raio: RAIO }, SC_RAIO); const a = s.turn.active, d = 1 - a;
  let c, u; [s, c] = poe(s, a, 'Beloved Chaplain'); [s, u] = poe(s, d, 'Urso');
  assert.equal(podeBloquear(s, c, u), false, 'o Urso não bloqueia');
  let r; [s, r] = poe(s, d, 'Raio', 'hand'); s = J(s); s.turn.priority = d;
  s = resolve(act(s, { t: 'cast', p: d, oid: r, targets: [{ oid: c }] }));
  assert.equal(s.objects[c].zone, 'graveyard', 'o Raio (instantânea) mira e mata');
});

test('CR 702.16 · proteção contra subtipo, multicolorido e tudo: bloqueio e alvo conferem a qualidade', () => {
  const cre = (nome, txt) => ({ name: nome, type_line: 'Creature — Soldier', mana_cost: '{W}', cmc: 1, colors: ['W'], power: '2', toughness: '2', keywords: ['Protection'], oracle_text: txt });
  const OURO = { name: 'Ouro', type_line: 'Instant', mana_cost: '{R}{G}', cmc: 2, colors: ['R', 'G'], keywords: [], oracle_text: 'Ouro deals 3 damage to any target.' };
  const SC_OURO = { Ouro: { name: 'Ouro', effects: [{ do: 'damage', amount: 3, target: 'any' }], example: { target: 'opponent', expect: { opponentLife: 17 } } } };
  let s = partida({ AntiGoblin: cre('AntiGoblin', 'Protection from Goblins'), Goblin: GOBLIN, Urso: URSO }); const a = s.turn.active, d = 1 - a;
  let x, g, u; [s, x] = poe(s, a, 'AntiGoblin'); [s, g] = poe(s, d, 'Goblin'); [s, u] = poe(s, d, 'Urso');
  assert.equal(podeBloquear(s, x, g), false, 'o Goblin não bloqueia'); assert.equal(podeBloquear(s, x, u), true, 'o Urso bloqueia');
  let t = partida({ AntiOuro: cre('AntiOuro', 'Protection from multicolored'), Ouro: OURO, Raio: RAIO }, { ...SC_RAIO, ...SC_OURO }); const b = t.turn.active;
  let y; [t, y] = poe(t, b, 'AntiOuro');
  let o; [t, o] = poe(t, b, 'Ouro', 'hand'); assert.throws(() => act(t, { t: 'cast', p: b, oid: o, targets: [{ oid: y }] }), /alvo/, 'a multicolorida não mira');
  let r; [t, r] = poe(t, b, 'Raio', 'hand'); const rr = resolve(act(t, { t: 'cast', p: b, oid: r, targets: [{ oid: y }] }));
  assert.equal(rr.objects[y].zone, 'graveyard', 'a monocolorida mira');
  let w = partida({ Tudo: cre('Tudo', 'Protection from everything'), Raio: RAIO, Urso: URSO }, SC_RAIO); const c0 = w.turn.active, d0 = 1 - c0;
  let z, u2; [w, z] = poe(w, c0, 'Tudo'); [w, u2] = poe(w, d0, 'Urso');
  let r2; [w, r2] = poe(w, c0, 'Raio', 'hand'); assert.throws(() => act(w, { t: 'cast', p: c0, oid: r2, targets: [{ oid: z }] }), /alvo/, 'nada mira');
  assert.equal(podeBloquear(w, z, u2), false, 'nada bloqueia');
});

test('CR 702.16a · a linha "Protection from <qualidade>" conta como palavra-chave na cobertura só quando o motor confere a qualidade', () => {
  const c = t => S.coverage({ name: 'Z', type_line: 'Creature — Human', oracle_text: t }).level;
  assert.equal(c('Protection from creatures'), 'completo'); assert.equal(c('Flying, protection from Humans'), 'completo'); assert.equal(c('Protection from white and from blue'), 'completo');
  assert.equal(c('Protection from the chosen player'), 'manual');
});

/* ---------------- K-18 · 702.11d resistência a magia contra uma qualidade ---------------- */
test('CR 702.11d · "Hexproof from black" (Knight of Grace, texto oficial) é lida da linha impressa e não vira resistência a magia completa', () => {
  const k = { ...oficial('Knight of Grace'), keywords: ['First strike', 'Hexproof from'] };
  const f = E.cardFacts(k);
  assert.deepEqual(J(f.hexK), ['B']); assert.ok(!f.kw.includes('hexproof'), 'não é "hexproof" puro');
});

test('CR 702.11d/f · resistência a magia contra monocolorida: a mágica monocolorida do oponente não mira; a multicolorida mira; a sua, também', () => {
  const RES = { name: 'Resistente', type_line: 'Creature — Soldier', mana_cost: '{W}', cmc: 1, colors: ['W'], power: '2', toughness: '2', keywords: ['Hexproof from'], oracle_text: 'Hexproof from monocolored' };
  const OURO = { name: 'Ouro', type_line: 'Instant', mana_cost: '{R}{G}', cmc: 2, colors: ['R', 'G'], keywords: [], oracle_text: 'Ouro deals 3 damage to any target.' };
  const SC_OURO = { Ouro: { name: 'Ouro', effects: [{ do: 'damage', amount: 3, target: 'any' }], example: { target: 'opponent', expect: { opponentLife: 17 } } } };
  let s = partida({ Resistente: RES, Raio: RAIO, Ouro: OURO }, { ...SC_RAIO, ...SC_OURO }); const a = s.turn.active, d = 1 - a;
  let x; [s, x] = poe(s, a, 'Resistente');
  let r; [s, r] = poe(s, d, 'Raio', 'hand'); let t = J(s); t.turn.priority = d;
  assert.throws(() => act(t, { t: 'cast', p: d, oid: r, targets: [{ oid: x }] }), /alvo/, 'o Raio (monocolorido) do oponente não mira');
  let o; [t, o] = poe(t, d, 'Ouro', 'hand'); t = J(t); t.turn.priority = d;
  assert.equal(resolve(act(t, { t: 'cast', p: d, oid: o, targets: [{ oid: x }] })).objects[x].zone, 'graveyard', 'o Ouro (multicolorido) mira');
  let r2; [s, r2] = poe(s, a, 'Raio', 'hand');
  assert.equal(resolve(act(s, { t: 'cast', p: a, oid: r2, targets: [{ oid: x }] })).objects[x].zone, 'graveyard', 'o Raio de quem a controla mira');
});

/* ---------------- K-19 · 702.19b atropelar com um bloqueador ---------------- */
test('CR 702.19b · atropelar bloqueado por uma criatura: quem ataca escolhe entre o letal no bloqueador (e o resto no jogador) e tudo no bloqueador', () => {
  const ATR = { name: 'Atropela', type_line: 'Creature — Beast', mana_cost: '{3}{G}', cmc: 4, colors: ['G'], power: '4', toughness: '4', keywords: ['Trample'], oracle_text: 'Trample' };
  const fim = (s, escolha) => { const a = s.turn.active;
    for (let i = 0; i < 6 && s.turn.step !== 'combat_attackers'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
    return s; };
  let s = partida({ Atropela: ATR, Urso: URSO }); const a = s.turn.active, d = 1 - a;
  let at, u; [s, at] = poe(s, a, 'Atropela'); [s, u] = poe(s, d, 'Urso');
  s = fim(s); s = act(s, { t: 'attack', p: a, attackers: [at] });
  for (let i = 0; i < 6 && !(s.pending && s.pending.kind === 'blockers'); i++) s = act(s, { t: 'pass', p: s.turn.priority });
  s = act(s, { t: 'block', p: d, blocks: [[u, at]] });
  for (let i = 0; i < 6 && !(s.pending && s.pending.kind === 'dividir_dano'); i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.pending && s.pending.kind, 'dividir_dano', 'a mesa pergunta'); assert.equal(s.pending.opcoes.length, 2);
  const vida = s.players[d].life;
  const padrao = act(s, { t: 'dividir_dano', p: a, index: 0 }), tudo = act(s, { t: 'dividir_dano', p: a, index: 1 });
  assert.equal(padrao.players[d].life, vida - 2, '2 no Urso, 2 no jogador'); assert.equal(padrao.objects[u].zone, 'graveyard');
  assert.equal(tudo.players[d].life, vida, 'tudo no Urso'); assert.equal(tudo.objects[u].zone, 'graveyard');
});

test('CR 702.19b · sem excedente (o atacante não passa do letal) ou sem atropelar, um bloqueador não abre pergunta', () => {
  const PEQ = { name: 'Pequeno', type_line: 'Creature — Beast', mana_cost: '{G}', cmc: 1, colors: ['G'], power: '2', toughness: '2', keywords: ['Trample'], oracle_text: 'Trample' };
  let s = partida({ Pequeno: PEQ, Urso: URSO }); const a = s.turn.active, d = 1 - a;
  let at, u; [s, at] = poe(s, a, 'Pequeno'); [s, u] = poe(s, d, 'Urso');
  assert.equal(E.opcoesAtropelarUmK(s, s.objects[at], s.objects[u], 2), null, '2 contra um 2/2: nada passa');
  assert.equal(E.opcoesAtropelarUmK(s, s.objects[u], s.objects[at], 3), null, 'sem atropelar');
});

/* ---------------- K-20 · 702.7c e 702.4c-d · iniciativa e golpe duplo ganhos ou perdidos entre os dois passos de dano ---------------- */
const NORMAL = { name: 'Normal', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, colors: ['G'], power: '2', toughness: '2', keywords: [], oracle_text: '' };
const RAPIDO = { name: 'Rapido', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, colors: ['G'], power: '1', toughness: '1', keywords: ['First strike'], oracle_text: 'First strike' };
const DUPLO = { name: 'Duplo', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, colors: ['G'], power: '1', toughness: '1', keywords: ['Double strike'], oracle_text: 'Double strike' };
/** Ataca sem bloqueio com `atacantes`, para na janela entre o dano de iniciativa e o normal, aplica `muda` e vai até o fim do combate. */
function entrePassos(s, atacantes, muda) {
  const a = s.turn.active;
  for (let i = 0; i < 6 && s.turn.step !== 'combat_attackers'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  s = act(s, { t: 'attack', p: a, attackers: atacantes });
  for (let i = 0; i < 20 && !(s.turn.step === 'combat_damage' && ((s.combat || {}).passosFeitos || []).length === 1); i++) s = s.pending ? act(s, E.legalActions(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
  assert.deepEqual(J(s.combat.passosFeitos), ['first'], 'parou entre os passos');
  s = J(s); muda(s);
  for (let i = 0; i < 20 && s.turn.step !== 'main2'; i++) s = s.pending ? act(s, E.legalActions(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
  return s;
}
const ganha = (s, o, k) => { o.tempKeywords = [...(o.tempKeywords || []), k]; o.tempTs = [...(o.tempTs || []), 1e9]; };
const perde = (s, o, k) => { o.temporarios = [...(o.temporarios || []), { perde: [k], ts: 1e9 }]; };

test('CR 702.7c · ganhar iniciativa depois do primeiro passo não impede o dano no segundo; perder depois de causar não dá um segundo dano', () => {
  let s = partida({ Normal: NORMAL, Rapido: RAPIDO }); const a = s.turn.active, d = 1 - a;
  let n, r; [s, n] = poe(s, a, 'Normal'); [s, r] = poe(s, a, 'Rapido');
  const v = s.players[d].life;
  const g = entrePassos(s, [n, r], t => ganha(t, t.objects[n], 'first strike'));
  assert.equal(g.players[d].life, v - 3, 'o Normal ganhou iniciativa entre os passos e ainda causa os 2 dele');
  const p = entrePassos(s, [n, r], t => perde(t, t.objects[r], 'first strike'));
  assert.equal(p.players[d].life, v - 3, 'o Rápido perdeu a iniciativa depois de causar: não causa de novo');
});

test('CR 702.4c-d · perder o golpe duplo no primeiro passo tira o segundo dano; ganhar golpe duplo (com iniciativa) depois do primeiro dá o segundo', () => {
  let s = partida({ Duplo: DUPLO, Rapido: RAPIDO }); const a = s.turn.active, d = 1 - a;
  let du, r; [s, du] = poe(s, a, 'Duplo'); [s, r] = poe(s, a, 'Rapido');
  const v = s.players[d].life;
  const sem = entrePassos(s, [du], t => perde(t, t.objects[du], 'double strike'));
  assert.equal(sem.players[d].life, v - 1, '702.4c: só o primeiro dano');
  const com = entrePassos(s, [r], t => ganha(t, t.objects[r], 'double strike'));
  assert.equal(com.players[d].life, v - 2, '702.4d: o Rápido ganhou golpe duplo e causa no segundo passo também');
});

/* ---------------- K-21 · 702.14 travessia com qualidade ---------------- */
const ERMO = { name: 'Ermo', type_line: 'Land', mana_cost: '', cmc: 0, colors: [], keywords: [], oracle_text: '{T}: Add {C}.' };
const DESERTO_K = { name: 'Deserto', type_line: 'Land — Desert', mana_cost: '', cmc: 0, colors: [], keywords: [], oracle_text: '' };
test('CR 702.14c · travessia de terreno não básico (Dryad Sophisticate, texto oficial): só com terreno não básico do defensor ela não é bloqueada', () => {
  const DS = { ...oficial('Dryad Sophisticate'), keywords: ['Nonbasic landwalk'] };
  let s = partida({ 'Dryad Sophisticate': DS, Urso: URSO, Ermo: ERMO }); const a = s.turn.active, d = 1 - a;
  let x, u; [s, x] = poe(s, a, 'Dryad Sophisticate'); [s, u] = poe(s, d, 'Urso'); [s] = poe(s, d, 'Forest');
  assert.equal(podeBloquear(s, x, u), true, 'só Floresta (básica): bloqueia');
  [s] = poe(s, d, 'Ermo');
  assert.equal(podeBloquear(s, x, u), false, 'com o Ermo (não básico): não bloqueia');
});
test('CR 702.14a/c · travessia de deserto (Desert Nomads, texto oficial) olha o subtipo do terreno do defensor; virada para baixo é bloqueada', () => {
  let s = partida({ 'Desert Nomads': oficial('Desert Nomads'), Urso: URSO, Deserto: DESERTO_K }); const a = s.turn.active, d = 1 - a;
  let x, u; [s, x] = poe(s, a, 'Desert Nomads'); [s, u] = poe(s, d, 'Urso');
  assert.equal(podeBloquear(s, x, u), true, 'sem Deserto: bloqueia');
  [s] = poe(s, d, 'Deserto');
  assert.equal(podeBloquear(s, x, u), false, 'com Deserto: não bloqueia');
  s = J(s); s.objects[x].faceDown = true; assert.equal(podeBloquear(s, x, u), true, 'virada para baixo não tem a habilidade');
});

/* ---------------- K-22 · 702.62 suspender (a ação especial) ---------------- */
test('CR 702.62a · suspender (Rift Bolt, texto oficial): da mão, pagando {R}, exila com 1 marcador sem usar a pilha; na manutenção seguinte sai o marcador e você conjura sem pagar', () => {
  assert.deepEqual(J(E.suspenderImpressoK(oficial('Rift Bolt'))), { n: 1, mana: '{R}' });
  let s = partida({ 'Rift Bolt': oficial('Rift Bolt') }); const a = s.turn.active, d = 1 - a;
  let r; [s, r] = poe(s, a, 'Rift Bolt', 'hand');
  // K-24 · a oferta saiu do legalActions até a mesa ter o botão (tela.acoes: toda ação oferecida tem botão); o motor a calcula em ofertasSuspenderK
  const of = E.ofertasSuspenderK(s, a).find(x => x.oid === r); assert.ok(of, 'o motor oferece suspender');
  s = act(s, of);
  assert.equal(s.objects[r].zone, 'exile'); assert.equal(s.objects[r].counters.time, 1); assert.equal(s.stack.length, 0, 'não usa a pilha');
  for (let i = 0; i < 200 && !(s.pending && s.pending.kind === 'free_cast'); i++) s = s.pending ? act(s, E.legalActions(s, s.pending.p).find(x => x.t !== 'concede') || E.legalActions(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.turn.active, a, 'no próximo turno de quem suspendeu'); assert.equal(s.turn.step, 'upkeep');
  const v = s.players[d].life;
  s = resolve(act(s, { t: 'cast_free', p: a, oid: r, targets: [{ player: d }] }));
  assert.equal(s.players[d].life, v - 3, 'conjurada sem pagar: 3 de dano');
});

test('CR 702.62a · suspender só quando a carta poderia ser conjurada: feitiço não suspende no turno do oponente nem com a pilha ocupada', () => {
  let s = partida({ 'Rift Bolt': oficial('Rift Bolt'), Raio: RAIO }, SC_RAIO); const a = s.turn.active, d = 1 - a;
  let r, ra; [s, r] = poe(s, a, 'Rift Bolt', 'hand'); [s, ra] = poe(s, a, 'Raio', 'hand');
  s = act(s, { t: 'cast', p: a, oid: ra, targets: [{ player: d }] });
  assert.ok(!E.ofertasSuspenderK(s, a).length, 'com o Raio na pilha, não'); // K-24 · ver acima
  assert.throws(() => act(s, { t: 'suspender_k', p: a, oid: r }), /só quando/);
  assert.equal(S.coverage(oficial('Rift Bolt')).level, 'completo', 'Rift Bolt tem script; a linha do suspender conta como palavra-chave');
});

/* ---------------- K-23 · 702.37b megamorfose ---------------- */
test('CR 702.37b · megamorfose (Aerie Bowmasters, texto oficial): virada para cima pagando a megamorfose ganha um marcador +1/+1; metamorfose comum, não', () => {
  const AB = { ...oficial('Aerie Bowmasters'), keywords: ['Reach', 'Megamorph'] };
  const sc = mega => ({ 'Aerie Bowmasters': { name: 'Aerie Bowmasters', morph: { mana: '{5}{G}', ...(mega ? { mega: true } : {}) }, example: { action: 'etb', target: 'none', expect: { attached: false } } } });
  for (const mega of [true, false]) {
    let s = partida({ 'Aerie Bowmasters': AB }, sc(mega)); const a = s.turn.active;
    let b; [s, b] = poe(s, a, 'Aerie Bowmasters', 'hand');
    const fd = E.legalActions(s, a).find(x => x.t === 'cast' && x.oid === b && x.faceDown); assert.ok(fd, 'conjura virada para baixo');
    s = resolve(act(s, fd)); assert.equal(E.stats(s, s.objects[b]).power, 2, '2/2 virada para baixo');
    s = act(s, { t: 'unmorph', p: a, oid: b });
    assert.equal(s.objects[b].faceDown, undefined);
    assert.equal(E.stats(s, s.objects[b]).power, mega ? 4 : 3, mega ? 'megamorfose: 3/4 + 1/1' : 'metamorfose: 3/4');
  }
});

test('CR 702.37a / 708.2 · virada para baixo é incolor: a proteção contra verde não previne o dano da carta verde virada para baixo', () => {
  const AB = { ...oficial('Aerie Bowmasters'), keywords: ['Reach', 'Megamorph'] };
  const SC_AB = { 'Aerie Bowmasters': { name: 'Aerie Bowmasters', morph: { mana: '{5}{G}', mega: true }, example: { action: 'etb', target: 'none', expect: { attached: false } } } };
  const PV = { name: 'Paladino', type_line: 'Creature — Knight', mana_cost: '{W}', cmc: 1, colors: ['W'], power: '1', toughness: '2', keywords: ['Protection'], oracle_text: 'Protection from green' };
  let s = partida({ 'Aerie Bowmasters': AB, Paladino: PV }, SC_AB); const a = s.turn.active, d = 1 - a;
  let b, pv; [s, b] = poe(s, a, 'Aerie Bowmasters', 'hand'); [s, pv] = poe(s, d, 'Paladino');
  s = resolve(act(s, E.legalActions(s, a).find(x => x.t === 'cast' && x.oid === b && x.faceDown)));
  s = J(s); s.objects[b].sick = false;
  for (let i = 0; i < 6 && s.turn.step !== 'combat_attackers'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  s = act(s, { t: 'attack', p: a, attackers: [b] });
  for (let i = 0; i < 6 && !(s.pending && s.pending.kind === 'blockers'); i++) s = act(s, { t: 'pass', p: s.turn.priority });
  s = act(s, { t: 'block', p: d, blocks: [[pv, b]] });
  for (let i = 0; i < 12 && s.turn.step !== 'main2'; i++) s = s.pending ? act(s, E.legalActions(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.objects[pv].zone, 'graveyard', 'os 2 de dano da 2/2 incolor não foram prevenidos');
});

/* ---------------- K-24 · correções da auditoria independente da onda 2 (K-16 a K-23) ---------------- */
test('CR 702.7b / 510.4 · auditoria K-24: quem tinha iniciativa quando o 1º passo começou não causa dano no 2º, mesmo com poder 0 no 1º e +3 entre os passos', () => {
  const ZERO = { name: 'Zero', type_line: 'Creature — Bear', mana_cost: '{G}', cmc: 1, colors: ['G'], power: '0', toughness: '1', keywords: ['First strike'], oracle_text: 'First strike' };
  let s = partida({ Normal: NORMAL, Zero: ZERO }); const a = s.turn.active, d = 1 - a;
  let n, z; [s, n] = poe(s, a, 'Normal'); [s, z] = poe(s, a, 'Zero');
  const v = s.players[d].life;
  const t = entrePassos(s, [n, z], st => { st.objects[z].counters.p1p1 = 3; });
  assert.equal(t.players[d].life, v - 2, 'só os 2 do Normal: a Zero tinha iniciativa no começo do 1º passo');
});

test('CR 702.29d / 702.35a · auditoria K-24: ciclar uma carta com insanidade é descartar — "sempre que você descarta" dispara uma vez', () => {
  const LOUCA = { name: 'Louca', type_line: 'Instant', mana_cost: '{1}{R}', cmc: 2, colors: ['R'], keywords: ['Cycling', 'Madness'], oracle_text: 'Louca deals 1 damage to any target.\nMadness {R}\nCycling {0}' };
  const OLHO = { name: 'Olho', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, colors: ['G'], power: '2', toughness: '2', keywords: [], oracle_text: 'Whenever you discard a card, you gain 1 life.' };
  const SC = { Louca: { name: 'Louca', effects: [{ do: 'damage', amount: 1, target: 'any' }], madness: { mana: '{R}' }, cycling: { mana: '{0}' }, example: { target: 'opponent', expect: { opponentLife: -1 } } },
    Olho: { name: 'Olho', abilities: [{ kind: 'triggered', when: 'you-discard', effects: [{ do: 'gain', amount: 1 }] }], example: { action: 'etb', target: 'none', expect: { attached: false } } } };
  let s = partida({ Louca: LOUCA, Olho: OLHO }, SC); const a = s.turn.active;
  let l; [s, l] = poe(s, a, 'Louca', 'hand'); [s] = poe(s, a, 'Olho');
  const vida = s.players[a].life;
  s = act(s, { t: 'cycle', p: a, oid: l });
  assert.equal(s.objects[l].zone, 'exile', 'insanidade: ao exílio');
  s = resolveCom(s, (la, pk) => pk.kind === 'madness' ? la.find(x => x.t === 'decline_madness') : null);
  assert.equal(s.players[a].life, vida + 1, 'o gatilho de descarte viu o descarte');
});

test('CR 702.62a / 702.61a · auditoria K-24: com fração de segundo na pilha não se conjura, então não se suspende — e a oferta concorda com o apply', () => {
  const INST = { name: 'Inst', type_line: 'Instant', mana_cost: '{3}{U}', cmc: 4, colors: ['U'], keywords: ['Suspend'], oracle_text: 'Draw two cards.\nSuspend 2—{U}' };
  const FRACAO = { name: 'Fracao', type_line: 'Instant', mana_cost: '{R}', cmc: 1, colors: ['R'], keywords: ['Split second'], oracle_text: 'Split second\nFracao deals 2 damage to any target.' };
  const SC = { Inst: { name: 'Inst', effects: [{ do: 'draw', amount: 2 }], example: { target: 'none', expect: { handDelta: 2 } } },
    Fracao: { name: 'Fracao', effects: [{ do: 'damage', amount: 2, target: 'any' }], example: { target: 'opponent', expect: { opponentLife: -2 } } } };
  let s = partida({ Inst: INST, Fracao: FRACAO }, SC); const a = s.turn.active, d = 1 - a;
  let fr, i; [s, fr] = poe(s, a, 'Fracao', 'hand'); [s, i] = poe(s, d, 'Inst', 'hand');
  const livre = act(s, { t: 'pass', p: a });
  assert.ok(E.ofertasSuspenderK(livre, d).some(x => x.oid === i), 'sem a fração de segundo, a instantânea suspende no turno do oponente');
  s = act(act(s, { t: 'cast', p: a, oid: fr, targets: [{ player: d }] }), { t: 'pass', p: a });
  assert.equal(E.podeSuspenderAgoraK(s, d, s.facts.Inst), false);
  assert.ok(!E.ofertasSuspenderK(s, d).some(x => x.oid === i), 'com a fração de segundo, nada a oferecer');
  assert.throws(() => act(s, { t: 'suspender_k', p: d, oid: i }));
});

test('CR 702.16a · auditoria K-24: proteção contra fichas, Auras, Equipamentos e Veículos é lida e conferida; plural que o motor não entende não conta como coberto', () => {
  const q = t => J(E.protecaoQualidadesK({ oracle_text: t }) || []);
  assert.deepEqual(q('Protection from tokens'), ['ficha']); assert.deepEqual(q('Protection from Auras'), ['sub:aura']);
  assert.deepEqual(q('Protection from Equipment'), ['sub:equipment']); assert.deepEqual(q('Protection from Vehicles'), ['sub:vehicle']);
  const c = t => S.coverage({ name: 'Z', type_line: 'Creature — Human', oracle_text: t }).level;
  for (const t of ['Protection from tokens', 'Protection from Auras', 'Protection from Vehicles', 'Protection from Elves', 'Protection from Wolves', 'Protection from Demons']) assert.equal(c(t), 'completo', t);
  assert.equal(c('Protection from blorbs'), 'manual', 'palavra que não é qualidade conhecida');
  const PF = { name: 'Paladino', type_line: 'Creature — Knight', mana_cost: '{W}', cmc: 1, colors: ['W'], power: '2', toughness: '2', keywords: ['Protection'], oracle_text: 'Protection from tokens' };
  let s = partida({ Paladino: PF, Urso: URSO }); const a = s.turn.active, d = 1 - a;
  let x, u; [s, x] = poe(s, a, 'Paladino'); [s, u] = poe(s, d, 'Urso');
  assert.equal(podeBloquear(s, x, u), true, 'carta comum bloqueia');
  s = J(s); s.objects[u].token = true;
  assert.equal(podeBloquear(s, x, u), false, 'ficha não bloqueia');
});

test('CR 702.19b · auditoria K-24: atacando um planeswalker, a opção do excedente diz "no planeswalker", não "no jogador"', () => {
  const ATR = { name: 'Atropela', type_line: 'Creature — Beast', mana_cost: '{3}{G}', cmc: 4, colors: ['G'], power: '4', toughness: '4', keywords: ['Trample'], oracle_text: 'Trample' };
  let s = partida({ Atropela: ATR, Urso: URSO }); const a = s.turn.active, d = 1 - a;
  let at, u, pw; [s, at] = poe(s, a, 'Atropela'); [s, u] = poe(s, d, 'Urso'); [s, pw] = poe(s, d, 'Forest');
  assert.match(E.opcoesAtropelarUmK(s, s.objects[at], s.objects[u], 4)[0].rotulo, /2 no jogador/);
  s = J(s); s.objects[at].atacandoPw = pw;
  assert.match(E.opcoesAtropelarUmK(s, s.objects[at], s.objects[u], 4)[0].rotulo, /2 no planeswalker/);
});

/* ---------------- K-25 · 702.40 tempestade: um gatilho só ---------------- */
const OFICIAIS_PAUPER = JSON.parse(readFileSync(new URL('./.listas/oficiais.json', import.meta.url), 'utf8')).cartas;
const WTS = () => { const c = OFICIAIS_PAUPER.find(x => x.name === 'Weather the Storm'); return { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: 2, colors: ['G'], keywords: ['Storm'], oracle_text: c.oracle_text }; };
test('CR 702.40a · tempestade é UM gatilho (Weather the Storm, texto oficial): vai para a pilha por cima da mágica e as cópias saem quando ele resolve; tirado da pilha, nenhuma cópia', () => {
  let s = partida({ 'Weather the Storm': WTS(), Raio: RAIO }, SC_RAIO); const a = s.turn.active, d = 1 - a;
  let r1, r2, w; [s, r1] = poe(s, a, 'Raio', 'hand'); [s, r2] = poe(s, a, 'Raio', 'hand'); [s, w] = poe(s, a, 'Weather the Storm', 'hand');
  s = resolve(act(s, { t: 'cast', p: a, oid: r1, targets: [{ player: d }] })); s = resolve(act(s, { t: 'cast', p: a, oid: r2, targets: [{ player: d }] }));
  const vida = s.players[a].life;
  s = act(s, { t: 'cast', p: a, oid: w });
  assert.equal(s.stack.length, 2, 'a mágica e o gatilho'); const topo = s.objects[s.stack[1]];
  assert.ok(topo.ability && !topo.copiaDeMagia, 'no topo, a habilidade (não uma cópia)');
  const anulado = J(s); anulado.stack.pop();
  assert.equal(resolve(anulado).players[a].life, vida + 3, 'sem o gatilho, só a original');
  const t = act(act(s, { t: 'pass', p: a }), { t: 'pass', p: d });
  assert.equal(t.stack.filter(x => t.objects[x].copiaDeMagia).length, 2, 'resolveu: duas cópias, mágicas na pilha (707.10)');
  assert.equal(resolve(t).players[a].life, vida + 9);
  const semOriginal = J(s); E.moveObject(semOriginal, w, 'graveyard');
  assert.equal(resolve(semOriginal).players[a].life, vida + 6, 'a original saiu da pilha antes: as cópias saem do mesmo jeito (pela última informação)');
});

test('CR 702.40a · a mesa descreve o gatilho e os efeitos da trilha (antes a pilha mostrava "tempestade k", "proeza k")', () => {
  const { table: TM } = loadModules();
  assert.match(TM.descreveEfeito({ do: 'tempestade_k', n: 2 }), /^copia esta mágica 2 vezes/);
  assert.match(TM.descreveEfeito({ do: 'proeza_k' }), /\+1\/\+1 até o fim do turno \(proeza\)/);
  assert.equal(S.TRIGGER_PT['storm-gatilho'], 'quando você a conjura (tempestade)');
});

/* ---------------- K-26 · 702.11c resistência a magia e 702.18a manto do jogador ---------------- */
test('CR 702.18a · "You have shroud." (True Believer, texto oficial): ninguém mira quem a controla — nem o oponente, nem ele mesmo', () => {
  let s = partida({ 'True Believer': oficial('True Believer'), Raio: RAIO }, SC_RAIO); const a = s.turn.active, d = 1 - a;
  [s] = poe(s, a, 'True Believer');
  let r; [s, r] = poe(s, a, 'Raio', 'hand');
  const alvos = E.legalActions(s, a).filter(x => x.oid === r && x.t === 'cast').map(x => J(x.targets[0]));
  assert.ok(!alvos.some(x => x.player === a), 'não mira a si mesmo'); assert.ok(alvos.some(x => x.player === d), 'mira o oponente');
  let t = J(s); let r2; [t, r2] = poe(t, d, 'Raio', 'hand'); t.turn.priority = d;
  assert.ok(!E.legalActions(t, d).some(x => x.oid === r2 && x.targets && x.targets[0].player === a), 'o oponente não mira');
  assert.equal(S.coverage(oficial('True Believer')).level, 'completo', 'a linha "You have shroud." conta');
});

test('CR 702.11c · "You have hexproof." (Aegis of the Gods, texto oficial): o oponente não mira; quem a controla, sim; ganhar depois de mirado deixa o alvo ilegal (608.2b)', () => {
  let s = partida({ 'Aegis of the Gods': oficial('Aegis of the Gods'), Raio: RAIO }, SC_RAIO); const a = s.turn.active, d = 1 - a;
  let ag; [s, ag] = poe(s, a, 'Aegis of the Gods', 'hand');
  let r; [s, r] = poe(s, a, 'Raio', 'hand');
  const vida = s.players[a].life;
  s = act(s, { t: 'cast', p: a, oid: r, targets: [{ player: a }] }); // mira a si mesmo antes de ter a resistência
  s = J(s); const z = s.zones[a].hand; z.splice(z.indexOf(ag), 1); s.zones[a].battlefield.push(ag); Object.assign(s.objects[ag], { zone: 'battlefield' });
  assert.equal(resolve(s).players[a].life, vida - 3, 'quem a controla pode ser alvo das próprias mágicas');
  let t = partida({ 'Aegis of the Gods': oficial('Aegis of the Gods'), Raio: RAIO }, SC_RAIO); const b = t.turn.active, e = 1 - b;
  let r2, ag2; [t, r2] = poe(t, e, 'Raio', 'hand'); [t, ag2] = poe(t, b, 'Aegis of the Gods', 'hand'); t = J(t); t.turn.priority = e;
  t = act(t, { t: 'cast', p: e, oid: r2, targets: [{ player: b }] });
  t = J(t); const z2 = t.zones[b].hand; z2.splice(z2.indexOf(ag2), 1); t.zones[b].battlefield.push(ag2); Object.assign(t.objects[ag2], { zone: 'battlefield' });
  const vb = t.players[b].life; assert.equal(resolve(t).players[b].life, vb, 'ganhou resistência com o Raio na pilha: alvo ilegal, nada');
  assert.ok(!E.legalActions(t, e).some(x => x.targets && x.targets.some(y => y.player === b)), 'e o oponente não mira mais');
  assert.equal(S.coverage(oficial('Aegis of the Gods')).level, 'completo');
});

/* ---------------- K-27 · 702.49d ninjutsu de comandante ---------------- */
test('CR 702.49d · ninjutsu de comandante (Yuriko, texto oficial): da zona de comando, devolvendo um atacante sem bloqueio — entra virada e atacando, e o imposto de comandante não sobe', () => {
  const YU = { ...oficial("Yuriko, the Tiger's Shadow"), keywords: ['Commander ninjutsu'] };
  const SC_YU = { "Yuriko, the Tiger's Shadow": { name: "Yuriko, the Tiger's Shadow", ninjutsu: { mana: '{U}{B}', comandante: true }, self: {}, covers: 'partial', note: 'só o ninjutsu de comandante (teste)', example: { action: 'ninjutsu', target: 'none', expect: { attacked: true } } } };
  let s = partida({ "Yuriko, the Tiger's Shadow": YU, Urso: URSO }, SC_YU); const a = s.turn.active, d = 1 - a;
  let y, u; [s, y] = poe(s, a, "Yuriko, the Tiger's Shadow", 'command'); [s, u] = poe(s, a, 'Urso');
  s = J(s); s.objects[y].commander = true;
  const imposto = E.commanderTax(s, a, y);
  for (let i = 0; i < 6 && s.turn.step !== 'combat_attackers'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  s = act(s, { t: 'attack', p: a, attackers: [u] });
  const ofertaDe = st => st.turn.priority === a && E.legalActions(st, a).find(x => x.t === 'ninjutsu' && x.oid === y && x.attacker === u);
  for (let i = 0; i < 8 && !ofertaDe(s); i++) s = s.pending && s.pending.kind === 'blockers' ? act(s, { t: 'block', p: d, blocks: [] }) : act(s, { t: 'pass', p: s.turn.priority });
  const of = ofertaDe(s); assert.ok(of, 'oferecido da zona de comando'); assert.equal(s.turn.step, 'combat_blockers');
  s = act(s, of); assert.equal(s.objects[u].zone, 'hand', 'o atacante volta (custo)');
  s = act(act(s, { t: 'pass', p: a }), { t: 'pass', p: d });
  assert.equal(s.objects[y].zone, 'battlefield'); assert.equal(s.objects[y].tapped, true); assert.ok(s.objects[y].attacking != null, 'atacando');
  assert.equal(E.commanderTax(s, a, y), imposto, 'não foi conjurada: o imposto não sobe');
  const sem = { ...SC_YU["Yuriko, the Tiger's Shadow"], ninjutsu: { mana: '{U}{B}' } };
  let t = partida({ "Yuriko, the Tiger's Shadow": YU, Urso: URSO }, { "Yuriko, the Tiger's Shadow": sem }); let y2; [t, y2] = poe(t, t.turn.active, "Yuriko, the Tiger's Shadow", 'command');
  assert.ok(!E.legalActions(t, t.turn.active).some(x => x.t === 'ninjutsu' && x.oid === y2), 'ninjutsu comum não sai da zona de comando');
});

/* ---------------- K-28 · 702.6c-d equipar com qualidade e mais de uma habilidade de equipar ---------------- */
test('CR 702.6c-d · Blackblade Reforged (texto oficial: "Equip legendary creature {3}" e "Equip {7}"): as duas habilidades existem; a de {3} só mira criatura lendária sua', () => {
  const BB = { ...oficial('Blackblade Reforged'), keywords: ['Equip'] };
  const LENDA = { name: 'Lenda', type_line: 'Legendary Creature — Human Knight', mana_cost: '{1}{W}', cmc: 2, colors: ['W'], power: '2', toughness: '2', keywords: [], oracle_text: '' };
  const SC_BB = { 'Blackblade Reforged': { name: 'Blackblade Reforged', equip: { enchant: 'creature', cost: { mana: '{7}' } }, self: {}, covers: 'partial', note: 'sem o +1/+1 por terreno (teste)', example: { action: 'equip', target: 'own-creature', expect: { attached: true } } } };
  assert.deepEqual(J(E.equipesImpressosK(BB)), [{ mana: '{3}', qualidade: 'legendary creature', sel: { lendaria: true } }]);
  let s = partida({ 'Blackblade Reforged': BB, Lenda: LENDA, Urso: URSO }, SC_BB); const a = s.turn.active;
  let bb, l, u; [s, bb] = poe(s, a, 'Blackblade Reforged'); [s, l] = poe(s, a, 'Lenda'); [s, u] = poe(s, a, 'Urso');
  const eqs = E.legalActions(s, a).filter(x => x.t === 'activate' && x.oid === bb);
  const porIndice = {}; for (const x of eqs) (porIndice[x.index || 0] = porIndice[x.index || 0] || []).push(x.targets[0].oid);
  const ks = Object.keys(porIndice); assert.equal(ks.length, 2, 'duas habilidades de equipar');
  const lend = ks.find(k => porIndice[k].length === 1), todas = ks.find(k => porIndice[k].length === 2);
  assert.deepEqual(porIndice[lend], [l], 'a de {3}: só a lendária'); assert.deepEqual(porIndice[todas].sort(), [l, u].sort(), 'a de {7}: qualquer criatura sua');
  s = resolve(act(s, eqs.find(x => String(x.index || 0) === lend)));
  assert.equal(s.objects[bb].attachedTo, l, 'equipou a lendária');
  const c = J(E.cardFacts({ ...oficial('Blackblade Reforged') }).equipesK || []); assert.equal(c.length, 1);
});

/* ---------------- K-29 · auditoria da onda 2 (K-24 a K-28) ---------------- */
test('CR 702.11c / 702.18a · auditoria K-29: "You have hexproof." dá resistência ao jogador, não à permanente — mesmo quando os dados da carta trazem a palavra-chave "Hexproof"', () => {
  const AG = { ...oficial('Aegis of the Gods'), keywords: ['Hexproof'] }, TB = { ...oficial('True Believer'), keywords: ['Shroud'] };
  assert.ok(!E.cardFacts(AG).kw.includes('hexproof')); assert.ok(!E.cardFacts(TB).kw.includes('shroud'));
  const KH = { name: 'Dupla', type_line: 'Creature — Soldier', mana_cost: '{W}', cmc: 1, colors: ['W'], power: '1', toughness: '1', keywords: ['Hexproof'], oracle_text: 'Hexproof\nYou have hexproof.' };
  assert.ok(E.cardFacts(KH).kw.includes('hexproof'), 'com a linha "Hexproof" também, a permanente tem');
  let s = partida({ 'Aegis of the Gods': AG, Raio: RAIO }, SC_RAIO); const a = s.turn.active, d = 1 - a;
  let ag, r; [s, ag] = poe(s, a, 'Aegis of the Gods'); [s, r] = poe(s, d, 'Raio', 'hand'); s = J(s); s.turn.priority = d;
  assert.ok(E.legalActions(s, d).some(x => x.oid === r && x.targets && x.targets[0].oid === ag), 'o oponente mira a criatura');
});

/* ---------------- K-30 · gatilhos de combate: grito de guerra 702.91, alvoroço 702.23, flanquear 702.25, bushido 702.45 ---------------- */
/** Ataca com `atacantes`, declara `blocos` ([bloqueador, atacante]) e vai até o fim do passo de dano; devolve o estado (os efeitos "até o fim do turno" ainda valem). */
function ateODano(s, atacantes, blocos = []) {
  const a = s.turn.active;
  for (let i = 0; i < 6 && s.turn.step !== 'combat_attackers'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  s = act(s, { t: 'attack', p: a, attackers: atacantes });
  for (let i = 0; i < 12 && !(s.pending && s.pending.kind === 'blockers') && s.turn.step !== 'combat_damage' && s.turn.step !== 'main2'; i++) s = s.pending ? act(s, E.legalActions(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
  if (s.pending && s.pending.kind === 'blockers') s = act(s, { t: 'block', p: 1 - a, blocks: blocos });
  for (let i = 0; i < 30 && s.turn.step !== 'main2'; i++) s = s.pending ? act(s, E.legalActions(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
  return s;
}
test('CR 702.91a · grito de guerra (Goblin Wardriver, texto oficial): ao atacar, cada OUTRA criatura atacante recebe +1/+0; com dois, cada um dá ao outro', () => {
  let s = partida({ 'Goblin Wardriver': oficial('Goblin Wardriver'), Urso: URSO }); const a = s.turn.active, d = 1 - a;
  let g, u; [s, g] = poe(s, a, 'Goblin Wardriver'); [s, u] = poe(s, a, 'Urso');
  const v = s.players[d].life;
  assert.equal(ateODano(s, [g, u]).players[d].life, v - 5, 'Urso 2+1, Wardriver 2 (não se dá o bônus)');
  let g2; [s, g2] = poe(s, a, 'Goblin Wardriver');
  assert.equal(ateODano(s, [g, g2]).players[d].life, v - 6, 'dois Wardrivers: cada um dá +1/+0 ao outro (3 + 3)');
});

test('CR 702.23a-b · alvoroço 2 (Wolverine Pack, texto oficial): bloqueada por três, +4/+4 (dois além do primeiro), calculado na resolução; por um, nada', () => {
  const WP = oficial('Wolverine Pack');
  let s = partida({ 'Wolverine Pack': WP, Urso: URSO }); const a = s.turn.active, d = 1 - a;
  let w; [s, w] = poe(s, a, 'Wolverine Pack'); const us = []; for (let i = 0; i < 3; i++) { let u; [s, u] = poe(s, d, 'Urso'); us.push(u); }
  const tres = ateODano(s, [w], us.map(u => [u, w]));
  assert.equal(E.stats(tres, tres.objects[w]).power, 6, '2 + 2×2'); assert.equal(tres.objects[w].zone, 'battlefield', '6/8 sobrevive aos 6 de dano');
  const um = ateODano(s, [w], [[us[0], w]]);
  assert.equal(E.stats(um, um.objects[w]).power, 2, 'um bloqueador só: sem bônus');
});

test('CR 702.25a · flanquear (Mtenda Herder, texto oficial): cada bloqueador sem flanquear recebe -1/-1, um gatilho por bloqueador; o que tem flanquear, não', () => {
  const MH = oficial('Mtenda Herder');
  let s = partida({ 'Mtenda Herder': MH, Urso: URSO }); const a = s.turn.active, d = 1 - a;
  let m, u1, u2; [s, m] = poe(s, a, 'Mtenda Herder'); [s, u1] = poe(s, d, 'Urso'); [s, u2] = poe(s, d, 'Urso');
  const r = ateODano(s, [m], [[u1, m], [u2, m]]);
  const mortos = [u1, u2].filter(x => r.objects[x].zone === 'graveyard'), vivo = [u1, u2].find(x => r.objects[x].zone === 'battlefield');
  assert.equal(mortos.length, 1, 'os dois viraram 1/1: o 1 de dano do Herder mata um'); assert.equal(E.stats(r, r.objects[vivo]).power, 1, 'o outro está 1/1');
  let t = partida({ 'Mtenda Herder': MH }); const b = t.turn.active; let m1, m2; [t, m1] = poe(t, b, 'Mtenda Herder'); [t, m2] = poe(t, 1 - b, 'Mtenda Herder');
  const r2 = ateODano(t, [m1], [[m2, m1]]);
  assert.equal(r2.objects[m2].zone, 'graveyard', 'o bloqueador com flanquear não encolhe: 1/1 contra 1/1, os dois morrem'); assert.equal(r2.objects[m1].zone, 'graveyard');
});

test('CR 702.45a · bushido 1 (Devoted Retainer, texto oficial): ao bloquear ou ser bloqueada, +1/+1 até o fim do turno', () => {
  const DR = oficial('Devoted Retainer');
  let s = partida({ 'Devoted Retainer': DR, Goblin: GOBLIN }); const a = s.turn.active, d = 1 - a;
  let r, u; [s, r] = poe(s, a, 'Devoted Retainer'); [s, u] = poe(s, d, 'Goblin');
  const bloqueada = ateODano(s, [r], [[u, r]]);
  assert.equal(E.stats(bloqueada, bloqueada.objects[r]).power, 2, 'bloqueada: 2/2'); assert.equal(bloqueada.objects[r].zone, 'battlefield', 'sobrevive ao Goblin 1/1'); assert.equal(bloqueada.objects[u].zone, 'graveyard');
  let t = partida({ 'Devoted Retainer': DR, Goblin: GOBLIN }); const b = t.turn.active; let r2, u2; [t, u2] = poe(t, b, 'Goblin'); [t, r2] = poe(t, 1 - b, 'Devoted Retainer');
  const bloqueou = ateODano(t, [u2], [[r2, u2]]);
  assert.equal(bloqueou.objects[r2].zone, 'battlefield', 'bloqueando: 2/2 sobrevive ao Goblin'); assert.equal(bloqueou.objects[u2].zone, 'graveyard');
  const fora = ateODano(t, [u2]); assert.equal(E.stats(fora, fora.objects[r2]).power, 1, 'sem combate, sem bônus');
});

/* ---------------- K-31 · gatilhos de ataque: aflição 702.130, refrega 702.121, mentor 702.134, treinamento 702.149 ---------------- */
const GRANDE = { name: 'Grande', type_line: 'Creature — Giant', mana_cost: '{3}{R}', cmc: 4, colors: ['R'], power: '3', toughness: '3', keywords: [], oracle_text: '' };
test('CR 702.130a · aflição 1 (Khenra Eternal, texto oficial): bloqueada, o jogador defensor perde 1; sem bloqueio, nada além do dano', () => {
  let s = partida({ 'Khenra Eternal': oficial('Khenra Eternal'), Urso: URSO }); const a = s.turn.active, d = 1 - a;
  let k, u; [s, k] = poe(s, a, 'Khenra Eternal'); [s, u] = poe(s, d, 'Urso');
  const v = s.players[d].life;
  assert.equal(ateODano(s, [k], [[u, k]]).players[d].life, v - 1, 'bloqueada: perde 1');
  assert.equal(ateODano(s, [k]).players[d].life, v - 2, 'sem bloqueio: só os 2 de dano');
});

test('CR 702.121a · refrega (Wings of the Guard, texto oficial): ao atacar, +1/+1 por oponente atacado neste combate', () => {
  let s = partida({ 'Wings of the Guard': oficial('Wings of the Guard') }); const a = s.turn.active, d = 1 - a;
  let w; [s, w] = poe(s, a, 'Wings of the Guard');
  const v = s.players[d].life, r = ateODano(s, [w]);
  assert.equal(r.players[d].life, v - 2, '1/1 vira 2/2'); assert.equal(E.stats(r, r.objects[w]).power, 2);
});

test('CR 702.134a · mentor (Sunhome Stalwart, texto oficial): ao atacar, um marcador +1/+1 na criatura atacante alvo de poder menor; com poder igual, sem alvo', () => {
  let s = partida({ 'Sunhome Stalwart': oficial('Sunhome Stalwart'), Goblin: GOBLIN, Urso: URSO }); const a = s.turn.active;
  let st, g, u; [s, st] = poe(s, a, 'Sunhome Stalwart'); [s, g] = poe(s, a, 'Goblin'); [s, u] = poe(s, a, 'Urso');
  const r = ateODano(s, [st, g, u]);
  assert.equal(r.objects[g].counters.p1p1, 1, 'o Goblin (1) ganha o marcador'); assert.ok(!r.objects[u].counters.p1p1, 'o Urso (2, igual) não é alvo');
  const t = ateODano(s, [st, u]); assert.ok(!t.objects[u].counters.p1p1 && !t.objects[st].counters.p1p1, 'sem alvo de poder menor, nada');
});

test('CR 702.149a · treinamento (Gryff Rider, texto oficial): atacando junto de outra criatura de poder maior, ganha um marcador +1/+1; com poder igual ou sozinha, não', () => {
  let s = partida({ 'Gryff Rider': oficial('Gryff Rider'), Urso: URSO, Grande: GRANDE }); const a = s.turn.active;
  let gr, u, gd; [s, gr] = poe(s, a, 'Gryff Rider'); [s, u] = poe(s, a, 'Urso'); [s, gd] = poe(s, a, 'Grande');
  assert.equal(ateODano(s, [gr, gd]).objects[gr].counters.p1p1, 1, 'com o 3/3: treina');
  assert.ok(!ateODano(s, [gr, u]).objects[gr].counters.p1p1, 'com o 2/2 (igual): não');
  assert.ok(!ateODano(s, [gr]).objects[gr].counters.p1p1, 'sozinha: não');
});

/* ---------------- K-32 · custos alternativos com condição: espetáculo 702.137 e surto 702.117 ---------------- */
test('CR 702.137a · espetáculo (Skewer the Critics, texto oficial): o custo {R} só aparece depois que um oponente perdeu vida no turno', () => {
  let s = partida({ 'Skewer the Critics': oficial('Skewer the Critics'), Raio: RAIO }, SC_RAIO); const a = s.turn.active, d = 1 - a;
  let k, r; [s, k] = poe(s, a, 'Skewer the Critics', 'hand'); [s, r] = poe(s, a, 'Raio', 'hand');
  const alt = st => E.legalActions(st, a).filter(x => x.t === 'cast' && x.oid === k && x.alt != null);
  assert.equal(alt(s).length, 0, 'ninguém perdeu vida: só o custo normal');
  s = resolve(act(s, { t: 'cast', p: a, oid: r, targets: [{ player: d }] }));
  const of = alt(s); assert.ok(of.length, 'depois do Raio no oponente: espetáculo');
  assert.equal(s.facts['Skewer the Critics'].script.alt[of[0].alt].cost.mana, '{R}');
  const v = s.players[d].life; s = resolve(act(s, { ...of.find(x => x.targets[0].player === d) }));
  assert.equal(s.players[d].life, v - 3); assert.equal(s.objects[k].zone, 'graveyard');
  let t = partida({ 'Skewer the Critics': oficial('Skewer the Critics') }); let k2; [t, k2] = poe(t, t.turn.active, 'Skewer the Critics', 'hand'); t = J(t); t.players[t.turn.active].lifeLost = 3;
  assert.equal(E.legalActions(t, t.turn.active).filter(x => x.oid === k2 && x.alt != null).length, 0, 'a vida perdida por você mesmo não conta');
});

test('CR 702.117a · surto (Comparative Analysis, texto oficial): o custo {2}{U} só depois que você conjurou outra mágica no turno; a do oponente não conta', () => {
  let s = partida({ 'Comparative Analysis': oficial('Comparative Analysis'), Raio: RAIO }, SC_RAIO); const a = s.turn.active, d = 1 - a;
  let c, r, r2; [s, c] = poe(s, a, 'Comparative Analysis', 'hand'); [s, r] = poe(s, a, 'Raio', 'hand'); [s, r2] = poe(s, d, 'Raio', 'hand');
  const alt = st => E.legalActions(st, a).filter(x => x.t === 'cast' && x.oid === c && x.alt != null);
  assert.equal(alt(s).length, 0, 'nenhuma mágica antes');
  let t = J(s); t.turn.priority = d; t = resolve(act(t, { t: 'cast', p: d, oid: r2, targets: [{ player: a }] })); t = J(t); t.turn.priority = a;
  assert.equal(alt(t).length, 0, 'a mágica do oponente não conta');
  s = resolve(act(s, { t: 'cast', p: a, oid: r, targets: [{ player: d }] }));
  const of = alt(s); assert.ok(of.length, 'depois do Raio: surto');
  assert.equal(s.facts['Comparative Analysis'].script.alt[of[0].alt].cost.mana, '{2}{U}');
  const mao = s.zones[a].hand.length; s = resolve(act(s, of.find(x => x.targets[0].player === a)));
  assert.equal(s.zones[a].hand.length, mao - 1 + 2, 'comprou duas');
});

/* ---------------- K-33 · recompra 702.27 ---------------- */
/** Põe n terrenos `nome` do grimório no campo de p (desvirados). */
/** comMana com oito de cada terreno básico no grimório. */
function comManaK33(cards, scripts = {}) {
  const all = { Forest: terra('Forest'), Island: terra('Island'), ...cards };
  const deck = Object.keys(all).map(name => ({ name, qty: /^(Forest|Island)$/.test(name) ? 8 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 7, mode: 'assisted', manaCheck: true, cards: all, scripts, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  s = J(s); for (let p = 0; p < 2; p++) { s.zones[p].library.push(...s.zones[p].hand.splice(0)); for (const x of s.zones[p].library) s.objects[x].zone = 'library'; }
  return s;
}
const battlefieldDe = (s, p) => s.zones[p].battlefield.map(x => s.objects[x]);
function terrenos(s, p, nome, n) { for (let i = 0; i < n; i++) [s] = poe(s, p, nome); return s; }
const ALVO_K33 = { name: 'Alvo', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, colors: [], keywords: [], oracle_text: '' };

test('CR 702.27a · recompra (Capsize, texto oficial): "Buyback {3}" é custo adicional opcional; pago, a mágica volta para a mão do dono ao resolver; sem pagar, cemitério', () => {
  assert.deepEqual(J(E.recompraImpressaK(oficial('Capsize'))), { mana: '{3}' });
  let s = comManaK33({ Capsize: oficial('Capsize'), Alvo: ALVO_K33 }); const a = s.turn.active, d = 1 - a;
  s = terrenos(s, a, 'Island', 5); let c, al; [s, c] = poe(s, a, 'Capsize', 'hand'); [s, al] = poe(s, d, 'Alvo');
  const ofertas = st => E.legalActions(st, a).filter(x => x.t === 'cast' && x.oid === c);
  assert.ok(ofertas(s).length && !ofertas(s).some(x => x.recompraK), 'com cinco terrenos, {1}{U}{U} + {3} não fecha: só o custo normal');
  s = terrenos(s, a, 'Island', 1);
  const comR = ofertas(s).find(x => x.recompraK && x.targets[0].oid === al); assert.ok(comR, 'com seis: a conjuração com recompra');
  assert.ok(ofertas(s).some(x => !x.recompraK && x.targets[0].oid === al), 'e a sem recompra continua oferecida (é opcional)');
  let t = act(s, comR);
  assert.equal(battlefieldDe(t, a).filter(x => x.tapped).length, 6, 'pagou {1}{U}{U} e mais {3}');
  t = resolve(t);
  assert.equal(t.objects[al].zone, 'hand', 'devolveu o alvo'); assert.equal(t.objects[c].zone, 'hand', 'a Capsize volta para a mão do dono');
  assert.ok(!t.objects[c].recompraK, 'a marca não sobrevive à mudança de zona (400.7)');
  const sem = resolve(act(s, ofertas(s).find(x => !x.recompraK && x.targets[0].oid === al)));
  assert.equal(sem.objects[c].zone, 'graveyard', 'sem recompra: cemitério');
});

test('CR 702.27a · a recompra só vale "as it resolves": com o alvo ilegal a mágica não resolve (608.2b) e vai para o cemitério; anulada também', () => {
  let s = comManaK33({ Capsize: oficial('Capsize'), Alvo: ALVO_K33 }); const a = s.turn.active, d = 1 - a;
  s = terrenos(s, a, 'Island', 6); let c, al; [s, c] = poe(s, a, 'Capsize', 'hand'); [s, al] = poe(s, d, 'Alvo');
  s = act(s, E.legalActions(s, a).find(x => x.t === 'cast' && x.oid === c && x.recompraK && x.targets[0].oid === al));
  let t = J(s); const z = t.zones[d].battlefield; z.splice(z.indexOf(al), 1); t.zones[d].graveyard.push(al); t.objects[al].zone = 'graveyard';
  t = resolve(t);
  assert.equal(t.objects[c].zone, 'graveyard', 'sem alvo legal não resolve: cemitério, não a mão');
  let u = J(s); u.mode = 'assisted'; u = act(u, { t: 'move', p: a, oid: c, to: 'graveyard' });
  assert.equal(u.objects[c].zone, 'graveyard');
});

test('CR 702.27a · recompra com custo que não é mana (Constant Mists, texto oficial: "Buyback—Sacrifice a land"): uma oferta por terreno; o escolhido é sacrificado e a carta volta para a mão', () => {
  assert.deepEqual(J(E.recompraImpressaK(oficial('Constant Mists'))), { extra: { sacrificeOther: { types: ['land'] } } });
  let s = comManaK33({ 'Constant Mists': oficial('Constant Mists') }); const a = s.turn.active;
  s = terrenos(s, a, 'Forest', 2); s = terrenos(s, a, 'Island', 1); let c; [s, c] = poe(s, a, 'Constant Mists', 'hand');
  const comR = E.legalActions(s, a).filter(x => x.t === 'cast' && x.oid === c && x.recompraK);
  assert.equal(comR.length, 3, 'qualquer um dos três terrenos pode ser o sacrificado (quem paga escolhe)');
  const ilha = s.zones[a].battlefield.find(x => s.objects[x].name === 'Island');
  const esc = comR.find(x => x.pay.recompraK.sacrifice === ilha || [].concat(x.pay.recompraK.sacrifice).includes(ilha)); assert.ok(esc, 'oferta que sacrifica a Ilha');
  let t = resolve(act(s, esc));
  assert.equal(t.objects[ilha].zone, 'graveyard', 'a Ilha foi o custo');
  assert.equal(t.objects[c].zone, 'hand', 'Constant Mists volta para a mão'); assert.equal(t.fogged, true);
});

test('CR 702.27a · carta sem a palavra não tem recompra (o motor recusa a ação)', () => {
  let s = comManaK33({ Capsize: oficial('Capsize'), Alvo: ALVO_K33 }); const a = s.turn.active, d = 1 - a;
  s = terrenos(s, a, 'Island', 6); let c, al; [s, c] = poe(s, a, 'Capsize', 'hand'); [s, al] = poe(s, d, 'Alvo');
  const base = E.legalActions(s, a).find(x => x.t === 'cast' && x.oid === c && !x.recompraK);
  let s2 = partida({ Raio: RAIO }, SC_RAIO); let r; [s2, r] = poe(s2, s2.turn.active, 'Raio', 'hand');
  assert.throws(() => E.apply(s2, { t: 'cast', p: s2.turn.active, oid: r, targets: [{ player: 1 - s2.turn.active }], recompraK: true }), /recompra/);
  assert.ok(base);
});

/* ---------------- K-34 · entrelaçar 702.42 ---------------- */
const SC_RAIN = { 'Rain of Rust': { name: 'Rain of Rust', modes: [{ label: 'Destruir um artefato', effects: [{ do: 'destroy', target: 'artifact' }] }, { label: 'Destruir um terreno', effects: [{ do: 'destroy', target: 'land' }] }], example: { action: 'mode:0', target: 'none', expect: {} } } };
const ART_K34 = { name: 'Peça', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, colors: [], keywords: [], oracle_text: '' };

test('CR 702.42a · entrelaçar (Rain of Rust, texto oficial): "Entwine {3}{R}" vira a opção de escolher os dois modos pagando {3}{R} a mais, oferecida só quando o total fecha; resolve os dois, na ordem impressa (702.42b)', () => {
  assert.deepEqual(J(E.entrelacarImpressoK(oficial('Rain of Rust'))), { mana: '{3}{R}' });
  let s = comManaK33({ 'Rain of Rust': oficial('Rain of Rust'), Peça: ART_K34, Mountain: terra('Mountain') }); const a = s.turn.active, d = 1 - a;
  s = terrenos(s, a, 'Mountain', 4); s = terrenos(s, a, 'Island', 5);
  let r, pc, ter; [s, r] = poe(s, a, 'Rain of Rust', 'hand'); [s, pc] = poe(s, d, 'Peça'); [s, ter] = poe(s, d, 'Forest');
  const modos = s.facts['Rain of Rust'].script.modes; assert.equal(modos.length, 3, 'os dois modos impressos e o entrelaçado');
  const ie = modos.findIndex(m => m.entrelacarK); assert.equal(ie, 2);
  const ofertas = st => E.legalActions(st, a).filter(x => x.t === 'cast' && x.oid === r && x.mode === ie);
  let pouco = J(s); for (const x of pouco.zones[a].battlefield.slice(0, 2)) pouco.objects[x].tapped = true;
  assert.equal(ofertas(pouco).length, 0, 'com sete terrenos desvirados, {3}{R}{R} + {3}{R} não fecha');
  const of = ofertas(s).find(x => x.targets.some(t => t.oid === pc) && x.targets.some(t => t.oid === ter)); assert.ok(of, 'com nove: os dois modos, um alvo para cada');
  let t = resolve(act(s, of));
  assert.equal(t.objects[pc].zone, 'graveyard'); assert.equal(t.objects[ter].zone, 'graveyard', 'destruiu o artefato e o terreno');
  assert.equal(t.zones[a].battlefield.filter(x => t.objects[x].tapped).length, 9, 'pagou {3}{R}{R} + {3}{R}');
  assert.ok(E.legalActions(s, a).some(x => x.t === 'cast' && x.oid === r && x.mode === 0), 'um modo só continua oferecido');
});

test('CR 702.42a · sem pagar o entrelaçar não há os dois modos: o motor recusa o modo entrelaçado sem mana para o custo a mais', () => {
  let s = comManaK33({ 'Rain of Rust': oficial('Rain of Rust'), Peça: ART_K34, Mountain: terra('Mountain') }); const a = s.turn.active, d = 1 - a;
  s = terrenos(s, a, 'Mountain', 4); s = terrenos(s, a, 'Island', 2);
  let r, pc, ter; [s, r] = poe(s, a, 'Rain of Rust', 'hand'); [s, pc] = poe(s, d, 'Peça'); [s, ter] = poe(s, d, 'Forest');
  assert.throws(() => E.apply(s, { t: 'cast', p: a, oid: r, mode: 2, targets: [{ oid: pc }, { oid: ter }] }), /mana|custo/);
});

test('CR 702.42a · entrelaçar que não é mana (Betrayal of Flesh, texto oficial: "Entwine—Sacrifice three lands"): uma oferta por trio de terrenos; destrói e devolve', () => {
  assert.deepEqual(J(E.entrelacarImpressoK(oficial('Betrayal of Flesh'))), { extra: { sacrificeOther: { types: ['land'], amount: 3 } } });
  const SC = { 'Betrayal of Flesh': { name: 'Betrayal of Flesh', modes: [{ label: 'Destruir uma criatura', effects: [{ do: 'destroy', target: 'creature' }] }, { label: 'Criatura do seu cemitério ao campo', effects: [{ do: 'reanimate', target: 'creature-in-your-graveyard' }] }], example: { action: 'mode:0', target: 'enemy-creature', expect: { gone: true } } } };
  let s = partida({ 'Betrayal of Flesh': oficial('Betrayal of Flesh'), Urso: URSO }, SC); const a = s.turn.active, d = 1 - a;
  let b, u1, u2; [s, b] = poe(s, a, 'Betrayal of Flesh', 'hand'); [s, u1] = poe(s, d, 'Urso'); [s, u2] = poe(s, a, 'Urso', 'graveyard');
  for (let i = 0; i < 4; i++) [s] = poe(s, a, 'Forest');
  const ie = s.facts['Betrayal of Flesh'].script.modes.findIndex(m => m.entrelacarK);
  const ofs = E.legalActions(s, a).filter(x => x.t === 'cast' && x.oid === b && x.mode === ie && x.targets[0].oid === u1);
  assert.equal(ofs.length, 4, 'quatro Florestas: quatro trios');
  let t = resolve(act(s, ofs[0]));
  assert.equal(t.objects[u1].zone, 'graveyard'); assert.equal(t.objects[u2].zone, 'battlefield');
  assert.equal(t.zones[a].battlefield.filter(x => t.objects[x].name === 'Forest').length, 1, 'três terrenos sacrificados');
  let v = J(s); for (const x of v.zones[a].battlefield.filter(x => v.objects[x].name === 'Forest').slice(0, 2)) { const z = v.zones[a].battlefield; z.splice(z.indexOf(x), 1); v.zones[a].graveyard.push(x); v.objects[x].zone = 'graveyard'; }
  assert.equal(E.legalActions(v, a).filter(x => x.t === 'cast' && x.oid === b && x.mode === ie).length, 0, 'com dois terrenos, sem entrelaçar');
});

/* ---------------- K-35 · ricochete 702.88 ---------------- */
const SC_STAGGER = { Staggershock: { name: 'Staggershock', effects: [{ do: 'damage', amount: 2, target: 'any' }], example: { target: 'opponent', expect: { opponentLife: -2 } } } };
/** Passa até o começo do passo `passo` do turno do jogador `quem` (ou até uma decisão pendente aparecer). */
function ateK35(s, quem, passo) { for (let i = 0; i < 200 && !(s.turn.active === quem && s.turn.step === passo) && !(s.pending && s.pending.kind === 'free_cast'); i++) s = s.pending ? act(s, E.legalActions(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority }); return s; }

test('CR 702.88a · ricochete (Staggershock, texto oficial): conjurada da mão, vai para o exílio ao resolver; na SUA próxima manutenção (não na do oponente) você pode conjurá-la sem pagar, e aí vai para o cemitério', () => {
  let s = partida({ Staggershock: oficial('Staggershock') }, SC_STAGGER); const a = s.turn.active, d = 1 - a;
  let k; [s, k] = poe(s, a, 'Staggershock', 'hand');
  const v = s.players[d].life;
  s = resolve(act(s, { t: 'cast', p: a, oid: k, targets: [{ player: d }] }));
  assert.equal(s.players[d].life, v - 2); assert.equal(s.objects[k].zone, 'exile', 'ricocheteou: exílio, não cemitério');
  s = ateK35(s, d, 'upkeep'); s = act(s, { t: 'pass', p: s.turn.priority });
  assert.ok(!(s.pending && s.pending.kind === 'free_cast'), 'na manutenção do oponente, nada');
  s = ateK35(s, a, 'upkeep');
  for (let i = 0; i < 6 && !s.pending; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal((s.pending || {}).kind, 'free_cast', 'na sua manutenção: pode conjurar sem pagar'); assert.deepEqual(J(s.pending.options), [k]);
  const of = E.legalActions(s, a).find(x => x.t === 'cast_free' && x.oid === k); assert.ok(of, 'a mesa oferece conjurar');
  const v2 = s.players[d].life;
  s = act(s, { ...of, targets: [{ player: d }] }); s = resolve(s);
  assert.equal(s.players[d].life, v2 - 2); assert.equal(s.objects[k].zone, 'graveyard', 'conjurada do exílio: não ricocheteia de novo');
});

test('CR 702.88a · ricochete: recusar deixa a carta no exílio (sem permissão de jogar depois); tirada da pilha sem resolver, cemitério', () => {
  let s = partida({ Staggershock: oficial('Staggershock') }, SC_STAGGER); const a = s.turn.active, d = 1 - a;
  let k; [s, k] = poe(s, a, 'Staggershock', 'hand');
  s = resolve(act(s, { t: 'cast', p: a, oid: k, targets: [{ player: d }] }));
  s = ateK35(s, a, 'upkeep'); for (let i = 0; i < 6 && !s.pending; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  s = act(s, E.legalActions(s, a).find(x => x.t === 'decline_free'));
  assert.equal(s.objects[k].zone, 'exile'); assert.ok(!s.objects[k].playableFromExile, 'recusou: continua exilada, sem permissão');
  s = ateK35(s, a, 'main1');
  assert.ok(!E.legalActions(s, a).some(x => x.t === 'cast' && x.oid === k), 'não conjura depois');
  let u = partida({ Staggershock: oficial('Staggershock') }, SC_STAGGER); const au = u.turn.active; let k3; [u, k3] = poe(u, au, 'Staggershock', 'hand');
  u = act(u, { t: 'cast', p: au, oid: k3, targets: [{ player: 1 - au }] }); u = act(u, { t: 'move', p: au, oid: k3, to: 'graveyard' });
  assert.equal(u.objects[k3].zone, 'graveyard', 'tirada da pilha sem resolver: cemitério');
});

test('CR 702.88a · ricochete com o alvo ilegal (608.2b): não resolve, cemitério', () => {
  const SC = { "Prey's Vengeance": { name: "Prey's Vengeance", effects: [{ do: 'pump', power: 2, toughness: 2, target: 'creature' }], example: { target: 'own-creature', expect: {} } } };
  let s = partida({ "Prey's Vengeance": oficial("Prey's Vengeance"), Urso: URSO }, SC); const a = s.turn.active;
  let k, u; [s, k] = poe(s, a, "Prey's Vengeance", 'hand'); [s, u] = poe(s, a, 'Urso');
  s = act(s, { t: 'cast', p: a, oid: k, targets: [{ oid: u }] });
  s = J(s); const z = s.zones[a].battlefield; z.splice(z.indexOf(u), 1); s.zones[a].graveyard.push(u); s.objects[u].zone = 'graveyard';
  s = resolve(s); assert.equal(s.objects[k].zone, 'graveyard');
});

/* ---------------- K-36 · eco 702.30 ---------------- */
const JAGUAR = () => ({ ...oficial('Pouncing Jaguar'), keywords: ['Echo'] }); // a Scryfall lista "Echo" nas palavras-chave
/** Avança até a manutenção de `quem` e para no "pague ou sacrifique" (ou no começo da principal, se não houver). */
function ateEcoK36(s, quem) {
  s = ateK35(s, quem, 'upkeep');
  for (let i = 0; i < 8 && !(s.pending && s.pending.kind === 'may_pay') && !(s.turn.active === quem && s.turn.step === 'main1'); i++) s = s.pending ? act(s, E.legalActions(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
  return s;
}

test('CR 702.30a · eco (Pouncing Jaguar, texto oficial): na sua manutenção seguinte, "sacrifique a menos que pague {G}"; pago, fica e não pergunta de novo na outra; a manutenção do oponente não conta', () => {
  assert.deepEqual(J(E.custoDaLinhaK(JAGUAR(), 'Echo')), { mana: '{G}' });
  let s = partida({ 'Pouncing Jaguar': JAGUAR() }); const a = s.turn.active, d = 1 - a;
  let j; [s] = poe(s, a, 'Forest'); [s, j] = poe(s, a, 'Pouncing Jaguar', 'hand');
  s = resolve(act(s, { t: 'cast', p: a, oid: j }));
  assert.equal(s.objects[j].zone, 'battlefield');
  s = ateK35(s, d, 'upkeep'); s = act(s, { t: 'pass', p: s.turn.priority });
  assert.ok(!(s.pending && s.pending.kind === 'may_pay'), 'na manutenção do oponente, nada');
  s = ateEcoK36(s, a);
  assert.equal((s.pending || {}).kind, 'may_pay', 'na sua: pague o eco'); assert.equal(s.pending.cost, '{G}');
  s = act(s, { t: 'pay', p: a });
  assert.equal(s.objects[j].zone, 'battlefield', 'pagou: fica');
  s = ateK35(s, d, 'upkeep'); s = ateEcoK36(s, a);
  assert.ok(!(s.pending && s.pending.kind === 'may_pay'), 'está sob seu controle desde antes da última manutenção: o eco não dispara de novo');
  assert.equal(s.objects[j].zone, 'battlefield');
});

test('CR 702.30a · eco: recusar sacrifica; sem mana para pagar, sacrifica sem perguntar', () => {
  let s = partida({ 'Pouncing Jaguar': JAGUAR() }); const a = s.turn.active, d = 1 - a;
  let j; [s, j] = poe(s, a, 'Pouncing Jaguar', 'hand');
  s = resolve(act(s, { t: 'cast', p: a, oid: j }));
  s = ateK35(s, d, 'upkeep'); s = ateEcoK36(s, a);
  let t = act(s, { t: 'decline', p: a });
  assert.equal(t.objects[j].zone, 'graveyard', 'não pagou: sacrificada');
  let v = comManaK33({ 'Pouncing Jaguar': JAGUAR() }); const av = v.turn.active; let j2; [v, j2] = poe(v, av, 'Pouncing Jaguar');
  v = J(v); v.objects[j2].ts = (v.relogio || 0) + 1; v.relogio = v.objects[j2].ts; v = ateK35(v, 1 - av, 'upkeep'); v = ateEcoK36(v, av);
  assert.equal(v.objects[j2].zone, 'graveyard', 'sem terreno para pagar {G}: sacrificada direto');
});

/* ---------------- K-37 · desvanecer 702.32 e sumir 702.63 ---------------- */
const SC_AVEN = { 'Aven Riftwatcher': { name: 'Aven Riftwatcher', abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'gain', amount: 2 }] }, { kind: 'triggered', when: 'leaves-battlefield', effects: [{ do: 'gain', amount: 2 }] }], example: { action: 'etb', target: 'none', expect: { selfLife: 2 } } } };
/** Passa as manutenções do jogador `quem`, n vezes, respondendo às decisões pelo padrão; devolve o estado no começo da principal. */
function manutencoesK37(s, quem, n) { for (let k = 0; k < n; k++) { const t0 = s.turn.number; for (let i = 0; i < 300 && !(s.turn.active === quem && s.turn.step === 'main1' && s.turn.number > t0); i++) s = s.pending ? act(s, E.legalActions(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority }); } return s; }

test('CR 702.32a · desvanecer (Blastoderm, texto oficial): entra com 3 marcadores de desvanecer; tira um em cada manutenção sua; quando não dá, é sacrificado', () => {
  let s = partida({ Blastoderm: oficial('Blastoderm') }); const a = s.turn.active;
  let b; [s, b] = poe(s, a, 'Blastoderm', 'hand');
  s = resolve(act(s, { t: 'cast', p: a, oid: b }));
  assert.equal(s.objects[b].counters.fade, 3, 'entra com três');
  s = manutencoesK37(s, a, 1); assert.equal(s.objects[b].counters.fade, 2);
  s = manutencoesK37(s, a, 2); assert.equal(s.objects[b].counters.fade || 0, 0); assert.equal(s.objects[b].zone, 'battlefield', 'com zero ainda fica');
  s = manutencoesK37(s, a, 1); assert.equal(s.objects[b].zone, 'graveyard', 'não deu para tirar: sacrificado');
});

test('CR 702.63a · sumir (Aven Riftwatcher, texto oficial): entra com 3 marcadores de tempo e ganha 2; tira um por manutenção; quando sai o último, é sacrificado (e ganha 2 ao sair)', () => {
  let s = partida({ 'Aven Riftwatcher': oficial('Aven Riftwatcher') }, SC_AVEN); const a = s.turn.active;
  let r; [s, r] = poe(s, a, 'Aven Riftwatcher', 'hand'); const v = s.players[a].life;
  s = resolve(act(s, { t: 'cast', p: a, oid: r }));
  assert.equal(s.objects[r].counters.time, 3); assert.equal(s.players[a].life, v + 2);
  s = manutencoesK37(s, a, 2); assert.equal(s.objects[r].counters.time, 1); assert.equal(s.objects[r].zone, 'battlefield');
  s = manutencoesK37(s, a, 1); assert.equal(s.objects[r].zone, 'graveyard', 'saiu o último: sacrificada'); assert.equal(s.players[a].life, v + 4, 'e ganhou 2 ao sair');
});

test('CR 702.63a · sumir: sem marcador de tempo (tirados por outro meio) o gatilho da manutenção não dispara e nada é sacrificado', () => {
  let s = partida({ 'Aven Riftwatcher': oficial('Aven Riftwatcher') }, SC_AVEN); const a = s.turn.active;
  let r; [s, r] = poe(s, a, 'Aven Riftwatcher', 'hand');
  s = resolve(act(s, { t: 'cast', p: a, oid: r })); s = J(s); s.objects[r].counters = {};
  s = manutencoesK37(s, a, 2); assert.equal(s.objects[r].zone, 'battlefield');
});
