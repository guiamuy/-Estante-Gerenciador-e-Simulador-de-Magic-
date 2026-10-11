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
