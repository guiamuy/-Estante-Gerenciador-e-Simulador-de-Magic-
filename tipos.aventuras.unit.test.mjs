// T-5 · CR5 · cartas de aventura (Comprehensive Rules 715).
// Texto da regra: .regras/cr-2026-09-25.txt. Cartas exemplo com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge,
// clone de 11/10/2026): Foulmire Knight // Profane Insight, Ardenvale Tactician // Dizzying Swoop e Shepherd of the Flock // Usher to
// Safety. As cartas "de teste" são scripts sintéticos que isolam a regra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, T, J, act, poe, legais, passaAte, resolveUm, palavrasDoTexto, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const cores = c => [...new Set((c || '').match(/[WUBRG]/g) || [])];
const CARTAS = {};
for (const c of L('oficiais-tipos.json')) CARTAS[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: palavrasDoTexto(c.oracle_text), oracle_text: c.oracle_text, colors: cores(c.mana_cost), ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) };
for (const [n, k] of Object.entries({ Island: 'U', Mountain: 'R', Forest: 'G', Plains: 'W', Swamp: 'B' })) CARTAS[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
const carta = (name, type_line, extra = {}) => { CARTAS[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } }; // os scripts sintéticos não passam pelo S8; o campo é exigido pelo validador
const ganha = amount => [{ do: 'gain', amount }];
const SCRIPTS = {
  // criatura {1} com a aventura "Passeio" (feitiço, {2}): você ganha 5 de vida
  'Andarilho': { name: 'Andarilho', self: { aventura: true }, omen: { mana: '{2}' }, back: { name: 'Passeio', types: ['sorcery'], effects: ganha(5) }, abilities: [{ kind: 'triggered', when: 'etb', effects: ganha(100) }], ...EX },
  // criatura {1} com a aventura "Golpe" (instantânea, {R}): 2 de dano a qualquer alvo
  'Duelista': { name: 'Duelista', self: { aventura: true }, omen: { mana: '{R}' }, back: { name: 'Golpe', types: ['instant'], colors: ['R'], effects: [{ do: 'damage', amount: 2, target: 'any' }] }, ...EX },
  'Anula': { name: 'Anula', effects: [{ do: 'counter', target: 'spell' }], ...EX },
  'Anula Criatura': { name: 'Anula Criatura', effects: [{ do: 'counter', target: 'creature-spell' }], ...EX },
  'Sopro': { name: 'Sopro', effects: [{ do: 'bounce', target: 'permanent' }], ...EX },
  'Mata': { name: 'Mata', effects: [{ do: 'destroy', target: 'creature' }], ...EX },
  'Imitação': { name: 'Imitação', effects: [{ do: 'ficha_copia', amount: 1, target: 'permanent' }], ...EX },
};
carta('Andarilho', 'Creature — Human Scout', { power: '2', toughness: '2' });
carta('Duelista', 'Creature — Human Warrior', { power: '1', toughness: '1', mana_cost: '{3}', cmc: 3 });
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' });
carta('Anula', 'Instant'); carta('Anula Criatura', 'Instant'); carta('Sopro', 'Instant'); carta('Mata', 'Instant'); carta('Imitação', 'Sorcery');

const baralho = nomes => { const u = [...new Set(nomes)]; return u.map(name => ({ name, qty: Math.max(4, Math.ceil(40 / u.length)), zone: 'main' })); };
/** Partida livre no modo completo, parada na 1ª fase principal de A, com a pilha vazia. */
function mesa(a = [], b = a, seed = 1) {
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: CARTAS, scripts: SCRIPTS, players: [{ name: 'A', deck: baralho([...a, 'Plains', 'Forest']) }, { name: 'B', deck: baralho([...b, 'Island', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p, n = 9) => { s = J(s); for (const c of 'WUBRG') s.players[p].pool[c] += n; return s; };
const semMana = (s, p) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] = 0; for (const oid of s.zones[p].battlefield) s.objects[oid].tapped = true; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const naMao = (s, p, nome) => { let oid; [s, oid] = poe(s, p, nome, 'hand'); return [s, oid]; };
const conjuras = (s, p, oid) => legais(s, p, a => a.t === 'cast' && a.oid === oid);
const normal = (s, p, oid) => conjuras(s, p, oid).filter(a => !a.omen);
const aventura = (s, p, oid) => conjuras(s, p, oid).filter(a => a.omen);
const alvo = oid => a => (a.targets || [])[0] && a.targets[0].oid === oid;
const noJogador = p => a => (a.targets || [])[0] && a.targets[0].player === p;
function conjura(s, p, nome, f = () => true) { let oid; [s, oid] = naMao(s, p, nome); s = mana(s, p); const a = conjuras(s, p, oid).filter(x => !x.omen).find(f); assert.ok(a, `conjurar ${nome}: nenhuma ação legal`); return [act(s, a), oid]; }
const esvazia = s => passaAte(s, x => !x.stack.length || !!x.pending);
const vida = (s, p = 0) => s.players[p].life - 20;
const zona = (s, oid) => s.objects[oid].zone;
const nome = (s, oid) => s.objects[oid].name;
const tipos = (s, oid) => J(s.facts[s.objects[oid].name].types);

/* ---------------- 715.3 · conjurar normalmente ou como Aventura ---------------- */
test('CR 715.3 · da mão, o jogador escolhe: a carta normal (criatura) ou a Aventura — duas ofertas, cada uma com o seu custo e o seu tempo', () => {
  let s, c; [s, c] = naMao(mesa(['Andarilho']), 0, 'Andarilho'); s = mana(s, 0);
  assert.equal(normal(s, 0, c).length, 1, 'criatura'); assert.equal(aventura(s, 0, c).length, 1, 'Aventura');
  // 715.3a · só as características alternativas contam para a Aventura: com {2} só de mana incolor nenhuma cor é pedida
  let t = semMana(s, 0); t.players[0].pool.C = 1;
  assert.equal(normal(t, 0, c).length, 1, 'com {1}: só a criatura'); assert.equal(aventura(t, 0, c).length, 0, 'a Aventura custa {2}');
  // a Aventura é feitiço: só no tempo de feitiço; a criatura também
  t = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1'); t = mana(J(t), 0);
  assert.equal(conjuras(t, 0, c).length, 0, 'no turno do oponente, nem a criatura nem a Aventura de feitiço');
});

test('CR 715.3a · Aventura instantânea de uma criatura sem lampejo: no turno do oponente só a Aventura é oferecida, e o custo dela é o da Aventura', () => {
  let s, c; [s, c] = naMao(mesa(['Duelista']), 0, 'Duelista');
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && x.turn.priority === 1);
  s = act(s, { t: 'pass', p: 1 }); // prioridade para A, no turno de B
  assert.equal(s.turn.priority, 0);
  let t = semMana(s, 0); t.players[0].pool.R = 1;
  assert.equal(normal(t, 0, c).length, 0, 'a criatura não tem lampejo');
  assert.ok(aventura(t, 0, c).length >= 2, 'a Aventura (instantânea, {R}) é oferecida com os alvos dela: ' + aventura(t, 0, c).length);
  assert.throws(() => act(t, { t: 'cast', p: 0, oid: c }), /fase principal|tempo/);
});

/* ---------------- 715.3b · na pilha, só as características alternativas ---------------- */
test('CR 715.3b · na pilha como Aventura a mágica tem só as características da Aventura: nome, tipo e cor; "anule a mágica de criatura alvo" não a alcança', () => {
  let s, c, x; [s, c] = naMao(mesa(['Duelista', 'Anula Criatura']), 0, 'Duelista'); s = mana(s, 0);
  s = act(s, aventura(s, 0, c).find(noJogador(1)));
  assert.equal(zona(s, c), 'stack'); assert.equal(nome(s, c), 'Golpe'); eq(tipos(s, c), ['instant']);
  eq(E.coresDe(s, s.objects[c]), ['R']);
  let anula; [s, anula] = naMao(s, 1, 'Anula Criatura'); s = mana(s, 1); s = act(s, { t: 'pass', p: 0 });
  assert.equal(conjuras(s, 1, anula).length, 0, 'a Aventura na pilha não é mágica de criatura');
  // conjurada normalmente, é mágica de criatura
  let t, d; [t, d] = naMao(mesa(['Duelista', 'Anula Criatura']), 0, 'Duelista'); t = mana(t, 0); t = act(t, normal(t, 0, d)[0]);
  assert.equal(nome(t, d), 'Duelista'); eq(tipos(t, d), ['creature']);
  [t, anula] = naMao(t, 1, 'Anula Criatura'); t = mana(t, 1); t = act(t, { t: 'pass', p: 0 });
  assert.equal(conjuras(t, 1, anula).length, 1);
});

/* ---------------- 715.3d · exílio e conjurar depois ---------------- */
test('CR 715.3d · ao resolver, a Aventura é exilada pelo controlador (não vai ao cemitério) e ele pode conjurar a carta do exílio — como criatura, pelo custo e no tempo dela', () => {
  let s, c; [s, c] = naMao(mesa(['Andarilho']), 0, 'Andarilho'); s = mana(s, 0);
  const r = E.apply(s, aventura(s, 0, c)[0]); s = r.state;
  assert.equal(nome(s, c), 'Passeio');
  s = esvazia(s);
  assert.equal(vida(s), 5, 'o efeito da Aventura'); assert.equal(zona(s, c), 'exile', 'exilada, não no cemitério');
  assert.equal(nome(s, c), 'Andarilho', '715.4: fora da pilha, as características normais'); eq(tipos(s, c), ['creature']);
  s = mana(s, 0);
  assert.equal(normal(s, 0, c).length, 1, 'pode conjurar a criatura do exílio');
  assert.equal(aventura(s, 0, c).length, 0, 'do exílio não se conjura como Aventura');
  assert.throws(() => act(s, { t: 'cast', p: 0, oid: c, omen: true }), /Aventura/, 'e o motor recusa se alguém pedir');
  assert.equal(legais(s, 1, a => a.oid === c).length, 0, 'o oponente não pode');
  s = esvazia(act(s, normal(s, 0, c)[0]));
  assert.equal(zona(s, c), 'battlefield'); assert.equal(vida(s), 105, 'entrou no campo como criatura (gatilho de entrada)');
});

test('CR 715.3d · "enquanto a carta ficar exilada": a permissão vale nos turnos seguintes, respeita o custo e o tempo da criatura, e acaba quando a carta sai do exílio', () => {
  let s, c, x; [s, c] = naMao(mesa(['Andarilho', 'Mata']), 0, 'Andarilho'); s = mana(s, 0);
  s = esvazia(act(s, aventura(s, 0, c)[0]));
  const t = semMana(s, 0); assert.equal(conjuras(t, 0, c).length, 0, 'sem mana, não conjura');
  let u = passaAte(s, y => y.turn.active === 1 && y.turn.step === 'main1'); u = mana(J(u), 0);
  assert.equal(conjuras(u, 0, c).length, 0, 'no turno do oponente a criatura sem lampejo não é conjurada');
  u = passaAte(u, y => y.turn.active === 0 && y.turn.step === 'main1' && !y.stack.length); u = mana(u, 0);
  assert.equal(normal(u, 0, c).length, 1, 'dois turnos depois, ainda pode');
  u = esvazia(act(u, normal(u, 0, c)[0]));
  [u, x] = conjura(u, 0, 'Mata', alvo(c)); u = esvazia(u);
  assert.equal(zona(u, c), 'graveyard'); u = mana(u, 0);
  assert.equal(conjuras(u, 0, c).length, 0, 'do cemitério não: a permissão era do exílio');
  assert.equal(u.objects[c].playableFromExile, undefined);
});

test('CR 715.3d · só a Aventura que RESOLVE é exilada: anulada vai ao cemitério; sem alvo legal ao resolver, também (608.2b) — e nenhuma das duas pode ser conjurada depois', () => {
  let s, c, x; [s, c] = naMao(mesa(['Andarilho', 'Anula']), 0, 'Andarilho'); s = mana(s, 0);
  s = act(s, aventura(s, 0, c)[0]);
  [s, x] = naMao(s, 1, 'Anula'); s = mana(s, 1); s = act(s, { t: 'pass', p: 0 });
  s = esvazia(act(s, conjuras(s, 1, x).find(alvo(c))));
  assert.equal(zona(s, c), 'graveyard', 'anulada: cemitério'); assert.equal(nome(s, c), 'Andarilho'); assert.equal(vida(s), 0);
  s = mana(s, 0); assert.equal(conjuras(s, 0, c).length, 0);
  // alvo ilegal na resolução
  let t, d, u, sopro; [t, d] = naMao(mesa(['Duelista', 'Urso', 'Sopro']), 0, 'Duelista'); [t, u] = poe(t, 1, 'Urso', 'battlefield'); t = mana(t, 0);
  t = act(t, aventura(t, 0, d).find(alvo(u)));
  [t, sopro] = naMao(t, 0, 'Sopro'); t = mana(t, 0); t = act(t, conjuras(t, 0, sopro).find(alvo(u))); t = esvazia(t);
  assert.equal(zona(t, u), 'hand'); assert.equal(zona(t, d), 'graveyard', 'sem alvo legal: não resolve, vai ao cemitério');
  t = mana(t, 0); assert.equal(conjuras(t, 0, d).length, 0);
});

/* ---------------- 715.4 · fora da pilha ---------------- */
test('CR 715.4 · 715.2c · em toda zona fora da pilha a carta tem só as características normais e é uma carta só: mão, cemitério, exílio e campo', () => {
  let s, c, x; [s, c] = naMao(mesa(['Duelista', 'Mata']), 0, 'Duelista');
  const antes = s.zones[0].hand.length;
  assert.equal(nome(s, c), 'Duelista'); eq(tipos(s, c), ['creature']);
  assert.ok(!Object.values(s.objects).some(o => o.name === 'Golpe'), 'não existe um objeto "Golpe" na mão');
  s = mana(s, 0); s = esvazia(act(s, normal(s, 0, c)[0]));
  assert.equal(s.zones[0].hand.length, antes - 1, 'uma carta saiu da mão');
  assert.equal(zona(s, c), 'battlefield'); assert.equal(nome(s, c), 'Duelista'); assert.ok(E.isCreature(s, s.objects[c]));
  [s, x] = conjura(s, 0, 'Mata', alvo(c)); s = esvazia(s);
  assert.equal(zona(s, c), 'graveyard'); assert.equal(nome(s, c), 'Duelista');
  assert.equal(s.objects[c].frontName, undefined); assert.equal(s.objects[c].omen, undefined);
});

/* ---------------- 715.2a · "has an Adventure" ---------------- */
test('CR 715.2a · "tem uma Aventura": o motor responde para a carta em qualquer zona, mesmo quando ela não está usando as características da Aventura', () => {
  let s, c, u; [s, c] = naMao(mesa(['Andarilho', 'Urso']), 0, 'Andarilho'); [s, u] = poe(s, 0, 'Urso', 'battlefield');
  eq(E.aventuraDe(s, c), { nome: 'Passeio', mana: '{2}' }); assert.equal(E.aventuraDe(s, u), null);
  s = mana(s, 0); s = act(s, aventura(s, 0, c)[0]);
  eq(E.aventuraDe(s, c), { nome: 'Passeio', mana: '{2}' }, 'na pilha, como Aventura');
  s = esvazia(s); eq(E.aventuraDe(s, c), { nome: 'Passeio', mana: '{2}' }, 'no exílio');
});

test('CR 715.2b · as características da Aventura fazem parte dos valores copiáveis: a ficha que é cópia de uma criatura com Aventura também "tem uma Aventura"', () => {
  let s, c, x; [s, c] = poe(mesa(['Andarilho', 'Imitação']), 0, 'Andarilho', 'battlefield');
  [s, x] = conjura(s, 0, 'Imitação', alvo(c)); s = esvazia(s);
  const ficha = Object.values(s.objects).find(o => o.token && o.zone === 'battlefield');
  assert.ok(ficha, 'a cópia entrou'); assert.equal(ficha.name, 'Andarilho');
  eq(E.aventuraDe(s, ficha), { nome: 'Passeio', mana: '{2}' });
});

/* ---------------- cartas exemplo ---------------- */
test('S8 · Foulmire Knight // Profane Insight: a Aventura compra uma carta e custa 1 de vida; depois o Cavaleiro 1/1 com toque mortífero é conjurado do exílio', () => {
  let s, c; [s, c] = naMao(mesa(['Foulmire Knight']), 0, 'Foulmire Knight'); s = mana(s, 0);
  const mao = s.zones[0].hand.length;
  s = esvazia(act(s, aventura(s, 0, c)[0]));
  assert.equal(vida(s), -1); assert.equal(s.zones[0].hand.length, mao - 1 + 1, 'saiu a carta, comprou uma'); assert.equal(zona(s, c), 'exile');
  s = mana(s, 0); s = esvazia(act(s, normal(s, 0, c)[0]));
  assert.equal(zona(s, c), 'battlefield'); eq(E.stats(s, s.objects[c]), { power: 1, toughness: 1 }); assert.ok(E.hasKeyword(s, s.objects[c], 'deathtouch'));
});

test('S8 · Ardenvale Tactician // Dizzying Swoop: "vire até duas criaturas alvo" aceita duas, uma ou nenhuma; Shepherd of the Flock // Usher to Safety devolve uma permanente sua à mão do dono', () => {
  let s, c, u1, u2; [s, c] = naMao(mesa(['Ardenvale Tactician', 'Urso']), 0, 'Ardenvale Tactician'); [s, u1] = poe(s, 1, 'Urso', 'battlefield'); [s, u2] = poe(s, 1, 'Urso', 'battlefield'); s = mana(s, 0);
  const ofertas = aventura(s, 0, c);
  eq([...new Set(ofertas.map(a => (a.targets || []).length))].sort(), [0, 1, 2], 'zero, um ou dois alvos');
  s = esvazia(act(s, ofertas.find(a => (a.targets || []).length === 2 && a.targets.every(t => [u1, u2].includes(t.oid)))));
  assert.ok(s.objects[u1].tapped && s.objects[u2].tapped); assert.equal(zona(s, c), 'exile');
  s = mana(s, 0); s = esvazia(act(s, normal(s, 0, c)[0]));
  eq(E.stats(s, s.objects[c]), { power: 2, toughness: 3 }); assert.ok(E.hasKeyword(s, s.objects[c], 'flying'));
  // Usher to Safety
  let t, p, meu, dele; [t, p] = naMao(mesa(['Shepherd of the Flock', 'Urso']), 0, 'Shepherd of the Flock'); [t, meu] = poe(t, 0, 'Urso', 'battlefield'); [t, dele] = poe(t, 1, 'Urso', 'battlefield'); t = mana(t, 0);
  const av = aventura(t, 0, p);
  assert.ok(av.some(alvo(meu)) && !av.some(alvo(dele)), 'só permanente sua');
  t = esvazia(act(t, av.find(alvo(meu))));
  assert.equal(zona(t, meu), 'hand'); assert.equal(zona(t, p), 'exile');
  for (const n of ['Foulmire Knight', 'Ardenvale Tactician', 'Shepherd of the Flock']) { const sc = S.SCRIPTS[n]; assert.ok(sc && sc.example, n); eq([...S.validateScript(sc)], [], n); }
});

/* ---------------- validador, mesa e guarda-corpos ---------------- */
test('CR 715 · validador: a Aventura é `self: { aventura: true }` com custo (omen.mana) e face de trás instantânea ou feitiço', () => {
  const v = sc => S.validateScript({ name: 'X', ...sc, ...EX }).join(' | ');
  assert.equal(v(SCRIPTS['Andarilho']), '');
  assert.match(v({ self: { aventura: 1 }, omen: { mana: '{1}' }, back: { name: 'Y', types: ['sorcery'], effects: ganha(1) } }), /self\.aventura só vale como true/);
  assert.match(v({ self: { aventura: true }, omen: { mana: '{1}' }, back: { name: 'Y', types: ['creature'], power: 1, toughness: 1 } }), /Aventura.*instantânea ou feitiço/);
  assert.match(v({ self: { aventura: true }, abilities: [{ kind: 'triggered', when: 'etb', effects: ganha(1) }] }), /falta o custo/);
});

test('CR 715.3 · mesa: o registro diz "como a aventura <nome>"; a folha tem o rótulo da Aventura (E.aventuraDe); partida sem aventura não ganha campo novo no estado', () => {
  let s, c; [s, c] = naMao(mesa(['Andarilho']), 0, 'Andarilho'); s = mana(s, 0);
  const a = aventura(s, 0, c)[0], depois = act(s, a);
  assert.match(T.describe(s, a, [], depois).join(' '), /A conjurou Andarilho como a aventura Passeio/);
  assert.doesNotMatch(T.describe(s, a, [], depois).join(' '), /presságio/);
  const src = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  assert.match(src, /`Aventura · \$\{av\.nome\} · \$\{av\.mana\}`/, 'o botão da folha diz Aventura, o nome e o custo');
});

test('CR 715 · partida sem a carta não ganha nada no estado: a face da Aventura (Profane Insight, Dizzying Swoop, Usher to Safety) só vira fato da partida que tem a carta — o hash das partidas existentes não muda', () => {
  // o app monta a partida só com as cartas das listas (setup.cards); a face de trás entra quando a carta da frente está entre elas
  const jogo = nomes => { const cards = Object.fromEntries(['Plains', 'Forest', 'Island', 'Mountain', ...nomes].map(n => [n, CARTAS[n]]));
    return E.createGame({ format: 'livre', seed: 1, mode: 'full', cards, scripts: {}, players: [{ name: 'A', deck: baralho([...nomes, 'Plains', 'Forest']) }, { name: 'B', deck: baralho([...nomes, 'Island', 'Mountain']) }] }); };
  const sem = jogo(['Urso']), com = jogo(['Urso', 'Foulmire Knight']);
  for (const n of ['Profane Insight', 'Dizzying Swoop', 'Usher to Safety']) assert.equal(sem.facts[n], undefined, n + ' fora da partida sem a carta');
  assert.ok(com.facts['Profane Insight'], 'na partida com o Foulmire Knight, a Aventura dele existe');
  assert.equal(com.facts['Dizzying Swoop'], undefined, 'e só a dele');
  assert.ok(sem.facts['Roost Seek'], 'as faces de trás anteriores à trilha seguem em toda partida, como eram (contrato dos goldens)');
});

test('CR 715 · passeio aleatório com aventuras nos dois lados: toda ação oferecida é aceita, as invariantes valem, e nenhuma carta fica com a face da Aventura fora da pilha', () => {
  let exiladas = 0, doExilio = 0;
  for (let seed = 1; seed <= 6; seed++) {
    let s = mesa(['Andarilho', 'Duelista', 'Foulmire Knight', 'Ardenvale Tactician', 'Shepherd of the Flock', 'Urso'], undefined, seed), r = seed * 104729;
    for (let i = 0; i < 400 && s.status !== 'over'; i++) {
      const p = s.pending ? s.pending.p : s.turn.priority;
      if (i % 9 === 0 && !s.pending) s = mana(s, p, 2);
      const acoes = E.legalActions(s, p).filter(a => a.t !== 'concede');
      assert.ok(acoes.length, `semente ${seed}, passo ${i}: sem ação`);
      r = (r * 1103515245 + 12345) & 0x7fffffff;
      const pref = acoes.filter(a => a.t === 'cast');
      const a = pref.length && r % 3 ? pref[r % pref.length] : acoes[r % acoes.length];
      if (a.t === 'cast' && s.objects[a.oid].zone === 'exile') doExilio++;
      let out; try { out = E.apply(s, a); } catch (e) { assert.fail(`semente ${seed}, passo ${i}: ação oferecida recusada ${JSON.stringify(a)} — ${e.message}`); }
      s = out.state;
      eq(E.invariants(s).filter(x => !/parado em passo sem prioridade/.test(x)), [], `semente ${seed}, passo ${i}, depois de ${a.t}`);
      for (const o of Object.values(s.objects)) if (!o.ability && o.zone !== 'stack' && o.zone !== 'battlefield') assert.ok(!o.frontName && !o.omen, `semente ${seed}, passo ${i}: ${o.name} com a face da Aventura em ${o.zone}`);
      exiladas = Math.max(exiladas, Object.values(s.objects).filter(o => o.zone === 'exile' && o.playableFromExile != null).length);
    }
  }
  assert.ok(exiladas > 0 && doExilio > 0, `aventuras exiladas (${exiladas}) e conjuradas do exílio (${doExilio}) no passeio`);
});

/* ---------------- T-6 · correções da auditoria independente (166 sondas e fuzz de 300 partidas; cada divergência nasceu aqui como teste que falhava) ---------------- */
Object.assign(SCRIPTS, {
  // Aventura {3}{R} sem `colors` no script: a cor sai do custo (202.2)
  'Batedor': { name: 'Batedor', self: { aventura: true }, omen: { mana: '{3}{R}' }, back: { name: 'Emboscada', types: ['instant'], effects: ganha(1) }, ...EX },
  'Anula Quatro': { name: 'Anula Quatro', effects: [{ do: 'counter', target: 'spell', targetMv: 4 }], ...EX },
});
carta('Batedor', 'Creature — Goblin Scout', { power: '1', toughness: '1' }); carta('Anula Quatro', 'Instant');

test('CR 202.3 · 715.3b · o valor de mana e o custo da Aventura na pilha são os dela (D1): Profane Insight 3, Dizzying Swoop 2, Usher to Safety 1; a carta normal segue com o dela', () => {
  let s = mesa(['Foulmire Knight', 'Ardenvale Tactician', 'Shepherd of the Flock', 'Batedor']);
  eq(['Profane Insight', 'Dizzying Swoop', 'Usher to Safety', 'Emboscada'].map(n => s.facts[n].cmc), [3, 2, 1, 4]);
  eq(['Foulmire Knight', 'Ardenvale Tactician', 'Shepherd of the Flock'].map(n => s.facts[n].cmc), [1, 3, 2]);
  assert.equal(s.facts['Profane Insight'].semCusto, false, 'a Aventura tem custo de mana');
  eq(s.facts['Profane Insight'].cost.colored, { B: 1 }); assert.equal(s.facts['Profane Insight'].cost.generic, 2);
});

test('CR 202.2 · a cor da Aventura sai do custo dela quando o script não declara (D7): Aventura {3}{R} é vermelha na pilha', () => {
  let s, c; [s, c] = naMao(mesa(['Batedor']), 0, 'Batedor'); s = mana(s, 0);
  s = act(s, aventura(s, 0, c)[0]);
  assert.equal(nome(s, c), 'Emboscada'); eq(E.coresDe(s, s.objects[c]), ['R']);
});

test('CR 107.3 · 601.2e · pedidos que o motor não oferece são recusados com mensagem, sem erro interno (D3, D6): X numa Aventura, e Aventura junto de lampejo, fuga ou outra forma de conjurar', () => {
  let s, c; [s, c] = naMao(mesa(['Andarilho']), 0, 'Andarilho'); s = mana(s, 0);
  for (const extra of [{ x: 3 }, { flashback: true }, { escape: true }, { disturb: true }, { plotted: true }, { faceDown: true }, { bestow: true }]) {
    assert.throws(() => act(s, { t: 'cast', p: 0, oid: c, omen: true, ...extra }), e => e.name === 'RuleError' || (e.code != null && typeof e.message === 'string' && !/Cannot read|undefined/.test(e.message)), 'recusa limpa para ' + JSON.stringify(extra));
  }
  const v = sc => S.validateScript({ name: 'X', ...sc, ...EX }).join(' | ');
  assert.match(v({ self: { aventura: true }, omen: { mana: '{X}{R}' }, back: { name: 'Y', types: ['sorcery'], effects: ganha(1) } }), /X no custo da Aventura/);
});

test('CR 715 · com os dados da carta como a Scryfall entrega (nome "A // B", custo "{B} // {2}{B}", duas faces): a carta normal custa {B}, a Aventura {2}{B}, pelo nome da lista ou pelo nome completo', () => {
  const scry = { name: 'Foulmire Knight // Profane Insight', layout: 'adventure', mana_cost: '{B} // {2}{B}', cmc: 1, type_line: 'Creature — Zombie Knight // Instant — Adventure',
    oracle_text: 'Deathtouch\n//\nYou draw a card and you lose 1 life. (Then exile this card. You may cast the creature later from exile.)', keywords: ['Deathtouch'], colors: ['B'], power: '1', toughness: '1',
    faces: [{ name: 'Foulmire Knight', mana_cost: '{B}', type_line: 'Creature — Zombie Knight', oracle_text: 'Deathtouch', power: '1', toughness: '1', colors: ['B'] },
      { name: 'Profane Insight', mana_cost: '{2}{B}', type_line: 'Instant — Adventure', oracle_text: 'You draw a card and you lose 1 life.', colors: ['B'] }] };
  for (const chave of ['Foulmire Knight', 'Foulmire Knight // Profane Insight']) {
    const cards = { [chave]: scry }; for (const n of ['Plains', 'Forest', 'Island', 'Mountain', 'Swamp']) cards[n] = CARTAS[n] || { name: n, type_line: 'Basic Land — Swamp', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {B}.)', colors: [] };
    let s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards, scripts: {}, players: [{ name: 'A', deck: [{ name: chave, qty: 20, zone: 'main' }, { name: 'Swamp', qty: 20, zone: 'main' }] }, { name: 'B', deck: [{ name: 'Island', qty: 40, zone: 'main' }] }] });
    for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
    s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
    const c = s.zones[0].hand.find(o => s.objects[o].name === chave) || (() => { let o; [s, o] = poe(s, 0, chave, 'hand'); return o; })();
    assert.ok(s.facts[chave].script, chave + ': a carta tem script na partida');
    eq(s.facts[chave].cost.colored, { B: 1 }, chave + ': custo da carta normal'); assert.equal(s.facts[chave].cost.generic, 0);
    eq(E.aventuraDe(s, c), { nome: 'Profane Insight', mana: '{2}{B}' });
    let t = semMana(s, 0); t.players[0].pool.B = 1;
    assert.equal(normal(t, 0, c).length, 1, chave + ': com {B}, a criatura'); assert.equal(aventura(t, 0, c).length, 0, chave + ': a Aventura custa {2}{B}');
    t.players[0].pool.B = 3;
    assert.equal(aventura(t, 0, c).length, 1);
    t = esvazia(act(t, aventura(t, 0, c)[0]));
    assert.equal(zona(t, c), 'exile'); assert.equal(nome(t, c), chave); assert.equal(vida(t), -1);
    t = mana(t, 0); t = esvazia(act(t, normal(t, 0, c)[0]));
    assert.equal(zona(t, c), 'battlefield'); assert.ok(E.hasKeyword(t, t.objects[c], 'deathtouch'));
  }
});

/* ---------------- T-40 · CR 715.3d, última frase: outros efeitos que deixam conjurar a carta ---------------- */
SCRIPTS['Impulso'] = { name: 'Impulso', effects: [{ do: 'exile_top_playable', amount: 1 }], ...EX };
SCRIPTS['Achado'] = { name: 'Achado', effects: [{ do: 'draw_free_cast', amount: 1 }], ...EX };
carta('Impulso', 'Sorcery'); carta('Achado', 'Sorcery');
const noTopo = (s, p, oid) => { s = J(s); const z = s.zones[p], o = s.objects[oid]; z[o.zone].splice(z[o.zone].indexOf(oid), 1); o.zone = 'library'; z.library.unshift(oid); return s; };

test('CR 715.3d · carta exilada por outro efeito que deixa jogá-la ("exile a do topo; você pode jogá-la"): do exílio, a carta normal ou a Aventura', () => {
  let s = mesa(['Andarilho', 'Impulso']); let a; [s, a] = naMao(s, 0, 'Andarilho'); s = noTopo(s, 0, a);
  let i; [s, i] = naMao(s, 0, 'Impulso'); s = mana(s, 0);
  s = resolveUm(act(s, conjuras(s, 0, i)[0]));
  eq(s.objects[a].zone, 'exile');
  const of = conjuras(s, 0, a);
  eq([of.some(x => x.omen), of.some(x => !x.omen)], [true, true], 'as duas ofertas');
  const vida = s.players[0].life;
  s = resolveUm(act(s, of.find(x => x.omen)));
  eq([s.players[0].life - vida, s.objects[a].zone], [5, 'exile'], 'a Aventura resolveu e foi exilada pela regra da Aventura');
  const de = conjuras(s, 0, a);
  eq([de.some(x => x.omen), de.some(x => !x.omen)], [false, true], 'exilada pela própria Aventura: só a carta normal (715.3d)');
  assert.throws(() => E.apply(s, { t: 'cast', p: 0, oid: a, omen: true }));
});

test('CR 715.3d · "conjure sem pagar" (compre uma e conjure-a sem pagar): a decisão oferece a carta normal e a Aventura; a Aventura resolve e vai ao exílio com a permissão', () => {
  let s = mesa(['Andarilho', 'Achado']); let a; [s, a] = naMao(s, 0, 'Andarilho'); s = noTopo(s, 0, a);
  let c; [s, c] = naMao(s, 0, 'Achado'); s = mana(s, 0);
  s = resolveUm(act(s, conjuras(s, 0, c)[0]));
  assert.ok(s.pending && s.pending.kind === 'free_cast', 'a decisão de conjurar sem pagar');
  const of = legais(s, 0, x => x.t === 'cast_free' && x.oid === a);
  eq([of.some(x => x.omen), of.some(x => !x.omen)], [true, true]);
  const vida = s.players[0].life;
  s = resolveUm(act(s, of.find(x => x.omen)));
  eq([s.players[0].life - vida, s.objects[a].zone], [5, 'exile']);
  assert.ok(conjuras(s, 0, a).some(x => !x.omen), 'do exílio, a carta normal');
});

test('CR 715.3d · sem permissão nenhuma, a Aventura não é conjurada do exílio nem do cemitério (pedido direto recusado)', () => {
  let s = mesa(['Andarilho']); let a; [s, a] = poe(s, 0, 'Andarilho', 'graveyard'); s = mana(s, 0);
  assert.throws(() => E.apply(s, { t: 'cast', p: 0, oid: a, omen: true }));
  s = J(s); const z = s.zones[0]; z.graveyard.splice(z.graveyard.indexOf(a), 1); z.exile.push(a); s.objects[a].zone = 'exile';
  eq(conjuras(s, 0, a).length, 0);
  assert.throws(() => E.apply(s, { t: 'cast', p: 0, oid: a, omen: true }));
});

test('CR 715.3d · mesa: na decisão "conjurar sem pagar", a Aventura é um grupo próprio com o nome dela (a carta normal fica no outro)', () => {
  let s = mesa(['Andarilho', 'Achado']); let a; [s, a] = naMao(s, 0, 'Andarilho'); s = noTopo(s, 0, a);
  let c; [s, c] = naMao(s, 0, 'Achado'); s = mana(s, 0);
  s = resolveUm(act(s, conjuras(s, 0, c)[0]));
  const gs = E.gruposGratisT(s, legais(s, 0, x => x.t === 'cast_free' && x.oid === a));
  eq(gs.map(g => g.nome).sort((x, y) => String(x).localeCompare(String(y))), [null, 'Passeio'].sort((x, y) => String(x).localeCompare(String(y))));
});
