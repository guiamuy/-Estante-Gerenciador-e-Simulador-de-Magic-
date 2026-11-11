// M-618 · rotina Motor contínuo · campanha Modern, ordem gulosa: Teferi, Time Raveler, Emperor of Bones e Overlord of the Balemurk
// são as três únicas cartas que faltam em 12 listas Modern do catálogo (coleta de 10/11/2026). Textos da API da Scryfall
// (cobertura/modern.json do ramo catalogo, 10/11/2026), guardados em .listas/oficiais-revisadas.json.
// Regras novas: 307.5 (só quando poderia conjurar um feitiço: prioridade, a própria fase principal e a pilha vazia) e 601.3b
// (feitiços como se tivessem lampejo) como regras de jogador; 607.2a (cartas "exiled with this creature") e 122.1h (marcador de
// finalidade: iria ao cemitério vindo do campo, vai para o exílio); o filtro "non-<subtipo>" (Avatar) e o leitor de
// "whenever this permanent enters or attacks". Cada teste de partida falha no motor anterior (as três cartas não jogavam).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';

const M = loadModules(), E = M.engine, S = M.scripts, SF = M.scryfall;
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const T = 'Teferi, Time Raveler', EB = 'Emperor of Bones', OB = 'Overlord of the Balemurk';
const CMC = { [T]: 3, [EB]: 2, [OB]: 5 }, COR = { [T]: ['W', 'U'], [EB]: ['B'], [OB]: ['B'] };
const oficial = n => { const o = OF.find(x => x.name === n); assert.ok(o, `${n} em .listas/oficiais-revisadas.json`);
  return SF.normalizeCard({ object: 'card', layout: 'normal', ...o, cmc: CMC[n], colors: COR[n] }); };
const J = x => JSON.parse(JSON.stringify(x));

test('M-618 · os três textos da Scryfall de 10/11 guardados; Teferi e Emperor por script à mão, Overlord pelo script lido e aprovado', () => {
  for (const n of [T, EB, OB]) { const o = OF.find(x => x.name === n); assert.match(o.fonte, /api\.scryfall\.com/); assert.equal(o.consulta, '2026-11-10'); }
  assert.equal(OF.find(x => x.name === T).oracle_text, 'Each opponent can cast spells only any time they could cast a sorcery.\n+1: Until your next turn, you may cast sorcery spells as though they had flash.\n−3: Return up to one target artifact, creature, or enchantment to its owner\'s hand. Draw a card.');
  for (const n of [T, EB]) { assert.ok(S.SCRIPTS[n], `${n} tem script`); assert.equal(S.validateScript(S.SCRIPTS[n]).length, 0); assert.equal(S.coverage(oficial(n), S.SCRIPTS, n).level, 'completo'); }
  const c = oficial(OB); assert.ok(!S.SCRIPTS[OB]);
  assert.ok(S.APROVADAS[OB]); assert.equal(S.APROVADAS[OB].leva, 'M-618'); assert.equal(S.APROVADAS[OB].texto, S.assinaturaRevisao(c));
  assert.equal(S.coverage(c, S.SCRIPTS, OB).level, 'completo');
  const sc = J(S.scriptLido(c)), volta = { do: 'search', amount: 1, zona: 'graveyard', filter: { ou: [{ types: ['creature'], notSubtypes: ['Avatar'] }, { types: ['planeswalker'] }] }, to: 'hand', optional: true };
  assert.deepEqual(sc.abilities.map(a => a.when), ['etb', 'attacks'], 'entra ou ataca: dois gatilhos');
  for (const a of sc.abilities) assert.deepEqual(a.effects, [{ do: 'mill', amount: 4 }, volta]);
});

test('M-618 · o leitor: "this permanent enters or attacks" e "a non-X card or a Y card"; sem "may" a volta é obrigatória', () => {
  const le = t => M.leitor.ler(SF.normalizeCard({ name: 'Teste', type_line: 'Creature — Horror', mana_cost: '{2}{B}', power: '2', toughness: '2', oracle_text: t }));
  const r = le('Whenever this permanent enters or attacks, return a non-Zombie creature card or an artifact card from your graveyard to your hand.');
  assert.equal(r.completa, true);
  assert.deepEqual(J(r.script.abilities[0].effects), [{ do: 'search', amount: 1, zona: 'graveyard', filter: { ou: [{ types: ['creature'], notSubtypes: ['Zombie'] }, { types: ['artifact'] }] }, to: 'hand' }]);
});

// ── partidas ──
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: [...mana_cost.matchAll(/\{([^}]+)\}/g)].reduce((n, [, x]) => n + (/^\d+$/.test(x) ? +x : 1), 0), keywords: [], oracle_text: '', colors: [], ...extra });
const C = {
  [T]: oficial(T), [EB]: oficial(EB), [OB]: oficial(OB),
  Plains: c0('Plains', 'Basic Land — Plains', '', { oracle_text: '({T}: Add {W}.)' }),
  Island: c0('Island', 'Basic Land — Island', '', { oracle_text: '({T}: Add {U}.)' }),
  Swamp: c0('Swamp', 'Basic Land — Swamp', '', { oracle_text: '({T}: Add {B}.)' }),
  Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2', colors: ['G'] }),
  Gigante: c0('Gigante', 'Creature — Giant', '{2}{G}', { power: '3', toughness: '3', colors: ['G'] }),
  Avatar: c0('Avatar', 'Creature — Avatar', '{2}{B}', { power: '3', toughness: '3', colors: ['B'] }),
  Mutante: c0('Mutante', 'Creature — Shapeshifter', '{2}', { power: '1', toughness: '1', oracle_text: 'Changeling', keywords: ['Changeling'] }),
  Estudo: c0('Estudo', 'Instant', '{U}', { colors: ['U'] }),
  Leitura: c0('Leitura', 'Sorcery', '{U}', { colors: ['U'] }),
  Raio: c0('Raio', 'Instant', '{B}', { colors: ['B'] }),
};
const SCR = {
  Urso: { name: 'Urso', example: { target: 'none', expect: { selfLife: 0 } } },
  Gigante: { name: 'Gigante', example: { target: 'none', expect: { selfLife: 0 } } },
  Avatar: { name: 'Avatar', example: { target: 'none', expect: { selfLife: 0 } } },
  Mutante: { name: 'Mutante', self: { changeling: true }, example: { target: 'none', expect: { selfLife: 0 } } },
  Estudo: { name: 'Estudo', effects: [{ do: 'draw', amount: 1 }], example: { target: 'none', expect: { handDelta: 0 } } },
  Leitura: { name: 'Leitura', effects: [{ do: 'draw', amount: 1 }], example: { target: 'none', expect: { handDelta: 0 } } },
  Raio: { name: 'Raio', effects: [{ do: 'destroy', target: 'creature' }], example: { target: 'enemy-creature', expect: { gone: true } } },
};
const act = (s, a) => { const r = E.apply(s, a); if (r.error) throw new Error(JSON.stringify(r.error)); return r.state; };
const recusa = (s, a, re) => { const r = (() => { try { return E.apply(s, a); } catch (e) { return { error: { message: e.message } }; } })(); assert.ok(r.error, `devia recusar ${JSON.stringify(a)}`); if (re) assert.match(JSON.stringify(r.error), re); };
function passaAte(s, fim, max = 400) {
  for (let i = 0; i < max && !fim(s); i++) { const pd = s.pending;
    if (pd && pd.kind === 'discard' && pd.reason !== 'effect') s = act(s, { t: 'discard', p: pd.p, oid: s.zones[pd.p].hand[0] });
    else if (pd && pd.kind === 'attackers') s = act(s, { t: 'attack', p: pd.p, attackers: [] });
    else if (pd && pd.kind === 'blockers') s = act(s, { t: 'block', p: pd.p, blocks: [] });
    else if (pd) return s; else s = act(s, { t: 'pass', p: s.turn.priority }); }
  return s;
}
function poe(s, p, name, zone = 'battlefield') {
  s = J(s);
  const from = ['library', 'hand', 'graveyard'].map(z => s.zones[p][z]).find(z => z.some(o => s.objects[o].name === name));
  if (!from) throw new Error(name + ' ausente');
  const oid = from.find(o => s.objects[o].name === name); from.splice(from.indexOf(oid), 1); s.zones[p][zone].push(oid);
  Object.assign(s.objects[oid], { zone, sick: false, tapped: false, controller: p });
  if (zone === 'battlefield' && name === T) s.objects[oid].counters = { ...(s.objects[oid].counters || {}), loyalty: 4 };
  return [s, oid];
}
const limpaMao = (s, p) => { s = J(s); for (const oid of s.zones[p].hand.slice()) { s.zones[p].hand.splice(s.zones[p].hand.indexOf(oid), 1); s.zones[p].library.unshift(oid); s.objects[oid].zone = 'library'; } return s; };
const naMesa = (s, oid) => !!s.objects[oid] && s.objects[oid].zone === 'battlefield';
const resolve = s => { for (let i = 0; i < 40 && (s.stack.length || s.pending); i++) { if (s.pending) return s; s = act(s, { t: 'pass', p: s.turn.priority }); } return s; };
/** A no próprio main1; os dois baralhos têm de tudo. */
function mesa() {
  const d = ns => ns.map(name => ({ name, qty: 6, zone: 'main' }));
  const todos = [T, EB, OB, 'Plains', 'Island', 'Swamp', 'Urso', 'Gigante', 'Avatar', 'Mutante', 'Estudo', 'Leitura', 'Raio'];
  let s = E.createGame({ format: 'livre', seed: 618, mode: 'full', cards: C, scripts: SCR, first: 0, players: [{ name: 'A', deck: d(todos) }, { name: 'B', deck: d(todos) }] });
  assert.ok(s.facts[OB] && s.facts[OB].script && !S.SCRIPTS[OB], `${OB} joga pelo script lido`);
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = limpaMao(s, 0); s = limpaMao(s, 1);
  return s;
}
const castsDe = (s, p, oid) => E.legalActions(s, p).filter(a => a.t === 'cast' && a.oid === oid);

test('M-618 · Teferi (307.5): com ele no campo de A, B só conjura instantâneas na própria fase principal, com a pilha vazia', () => {
  let s = mesa(), ted, est, ilha;
  [s, ted] = poe(s, 0, T); [s, est] = poe(s, 1, 'Estudo', 'hand'); [s, ilha] = poe(s, 1, 'Island');
  // no turno de A, B recebe prioridade (A passa no main1): sem a instantânea
  s = act(s, { t: 'pass', p: 0 });
  assert.equal(s.turn.priority, 1);
  assert.equal(castsDe(s, 1, est).length, 0, 'no turno de A, B não conjura');
  recusa(s, { t: 'cast', p: 1, oid: est }, /Teferi, Time Raveler: você só pode conjurar mágicas quando poderia conjurar um feitiço/);
  // sem Teferi, a mesma janela deixa conjurar (o caminho de antes não muda)
  { let s2 = J(s); s2.zones[0].battlefield.splice(s2.zones[0].battlefield.indexOf(ted), 1); s2.zones[0].graveyard.push(ted); s2.objects[ted].zone = 'graveyard';
    assert.equal(castsDe(s2, 1, est).length, 1, 'sem Teferi a instantânea é oferecida'); }
  // no main1 de B, pilha vazia: pode
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending && x.turn.priority === 1);
  s = J(s); s.objects[ilha].tapped = false;
  assert.equal(castsDe(s, 1, est).length, 1, 'no próprio main1, com a pilha vazia, conjura');
});

test('M-618 · Teferi +1 (601.3b): A conjura feitiço no turno de B até o próprio turno seguinte; e só feitiço (não muda criatura)', () => {
  let s = mesa(), ted, lei, ilha, urso, f1, f2;
  [s, ted] = poe(s, 0, T); [s, lei] = poe(s, 0, 'Leitura', 'hand'); [s, urso] = poe(s, 0, 'Urso', 'hand');
  [s, ilha] = poe(s, 0, 'Island'); [s, f1] = poe(s, 0, 'Plains'); [s, f2] = poe(s, 0, 'Swamp');
  const sobe = E.legalActions(s, 0).find(a => a.t === 'activate' && a.oid === ted && a.index === 0);
  assert.ok(sobe, '+1 oferecido');
  s = resolve(act(s, sobe));
  assert.equal(s.objects[ted].counters.loyalty, 5);
  assert.ok((s.players[0].efeitos || []).some(e => e.feiticosComLampejo && e.ate === 'seu-proximo-turno'));
  // passa para o turno de B; no upkeep de B, A tem prioridade e pode conjurar o feitiço
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'upkeep' && x.turn.priority === 1 && !x.stack.length);
  s = act(s, { t: 'pass', p: 1 });
  assert.equal(s.turn.priority, 0);
  s = J(s); for (const o of [ilha, f1, f2]) s.objects[o].tapped = false;
  assert.equal(castsDe(s, 0, lei).length, 1, 'feitiço no turno do oponente');
  assert.equal(castsDe(s, 0, urso).length, 0, 'criatura continua no tempo de feitiço');
  const s1 = resolve(act(s, castsDe(s, 0, lei)[0]));
  assert.ok(s1.zones[0].graveyard.includes(lei), 'o feitiço resolveu');
  // no próximo turno de A o efeito acaba
  s = passaAte(s1, x => x.turn.active === 0 && x.turn.step === 'upkeep');
  assert.ok(!(s.players[0].efeitos || []).some(e => e.feiticosComLampejo), 'acaba quando o próximo turno de A começa');
});

test('M-618 · Teferi −3: devolve até um artefato, criatura ou encantamento à mão do dono e compra; sem alvo, só compra', () => {
  let s = mesa(), ted, urso;
  [s, ted] = poe(s, 0, T); [s, urso] = poe(s, 1, 'Urso');
  const desce = E.legalActions(s, 0).filter(a => a.t === 'activate' && a.oid === ted && a.index === 1);
  assert.ok(desce.length >= 2, 'com o Urso como alvo e sem alvo');
  const comUrso = desce.find(a => JSON.stringify(a.targets || []).includes(String(urso)));
  assert.ok(comUrso, 'o Urso de B é alvo');
  const mao = s.zones[0].hand.length;
  let s1 = resolve(act(s, comUrso));
  assert.ok(s1.zones[1].hand.includes(urso), 'o Urso volta para a mão do dono (B)');
  assert.equal(s1.zones[0].hand.length, mao + 1, 'A compra uma');
  assert.equal(s1.objects[ted].counters.loyalty, 1);
  const semAlvo = desce.find(a => !(a.targets || []).length);
  assert.ok(semAlvo, '"up to one": sem alvo também');
  let s2 = resolve(act(s, semAlvo));
  assert.ok(naMesa(s2, urso)); assert.equal(s2.zones[0].hand.length, mao + 1, 'sem alvo, ainda compra');
});

/** Emperor de A no campo, com B tendo `gB` no cemitério; passa para o início do combate de A. */
function combateDoImperador(gB = ['Gigante']) {
  let s = mesa(), em; const b = {};
  [s, em] = poe(s, 0, EB);
  for (const n of gB) [s, b[n]] = poe(s, 1, n, 'graveyard');
  for (const n of ['Swamp', 'Swamp']) [s] = poe(s, 0, n);
  s = passaAte(s, x => x.turn.step === 'combat_begin' || !!x.pending || x.stack.length > 0);
  return { s, em, b };
}

test('M-618 · Emperor of Bones (607.2a + 122.1h): exila a criatura do cemitério de B; adaptar a traz para A com finalidade e ímpeto; no passo final é sacrificada e vai para o exílio', () => {
  let { s, em, b } = combateDoImperador(['Gigante']);
  const g = b.Gigante;
  if (s.pending && s.pending.kind === 'pick_target') s = act(s, { t: 'pick_target', p: 0, target: { oid: g } });
  s = resolve(s);
  assert.equal(s.objects[g].zone, 'exile', 'o Gigante foi exilado do cemitério de B');
  assert.ok(s.zones[1].exile.includes(g), 'no exílio do dono');
  assert.ok(s.objects[g].exiladaPorT && s.objects[g].exiladaPorT.oid === em, 'ligado ao Emperor');
  // ativa adaptar 2 (A tem dois Pântanos)
  s = passaAte(s, x => x.turn.step === 'main2' && x.turn.priority === 0 && !x.stack.length);
  const ad = E.legalActions(s, 0).find(a => a.t === 'activate' && a.oid === em && a.index === 0);
  assert.ok(ad, 'adaptar oferecido');
  s = resolve(act(s, ad));
  assert.equal(s.objects[em].counters.p1p1, 2);
  assert.ok(naMesa(s, g), 'o Gigante voltou ao campo');
  assert.equal(s.objects[g].controller, 0, 'sob o controle de A'); assert.equal(s.objects[g].owner, 1, 'o dono continua B');
  assert.equal(s.objects[g].counters.finality, 1, 'com um marcador de finalidade');
  assert.ok(E.hasKeyword(s, s.objects[g], 'haste'), 'com ímpeto');
  // passo final: o atrasado sacrifica; a finalidade manda para o exílio
  s = passaAte(s, x => x.turn.active === 1 || !naMesa(x, g));
  assert.equal(s.objects[g].zone, 'exile', 'sacrificado, foi para o exílio (122.1h)');
  assert.ok(s.zones[1].exile.includes(g), 'no exílio do dono');
});

test('M-618 · Emperor: sem criatura exilada com ele, os marcadores não trazem nada; a carta exilada que não é criatura não volta', () => {
  let { s, em, b } = combateDoImperador(['Leitura']);
  if (s.pending && s.pending.kind === 'pick_target') s = act(s, { t: 'pick_target', p: 0, target: { oid: b.Leitura } });
  s = resolve(s);
  assert.equal(s.objects[b.Leitura].zone, 'exile');
  s = passaAte(s, x => x.turn.step === 'main2' && x.turn.priority === 0 && !x.stack.length);
  s = resolve(act(s, E.legalActions(s, 0).find(a => a.t === 'activate' && a.oid === em && a.index === 0)));
  assert.equal(s.objects[em].counters.p1p1, 2);
  assert.equal(s.objects[b.Leitura].zone, 'exile', 'o feitiço exilado não volta');
});

test('M-618 · 122.1h: criatura com marcador de finalidade destruída vai para o exílio, não para o cemitério', () => {
  let s = mesa(), urso, raio;
  [s, urso] = poe(s, 1, 'Urso'); [s, raio] = poe(s, 0, 'Raio', 'hand'); [s] = poe(s, 0, 'Swamp');
  s = J(s); s.objects[urso].counters = { ...(s.objects[urso].counters || {}), finality: 1 };
  s = act(s, E.legalActions(s, 0).find(a => a.t === 'cast' && a.oid === raio));
  s = resolve(s);
  assert.equal(s.objects[urso].zone, 'exile'); assert.ok(s.zones[1].exile.includes(urso));
});

test('M-618 · Overlord of the Balemurk: entra (impending ou não), mói quatro e pode devolver criatura que não é Avatar ou planeswalker; Avatar e metamorfo não servem', () => {
  let s = mesa(), ov, av, mu, ur;
  [s, ov] = poe(s, 0, OB, 'hand'); for (const n of ['Swamp', 'Swamp']) [s] = poe(s, 0, n);
  [s, av] = poe(s, 0, 'Avatar', 'graveyard'); [s, mu] = poe(s, 0, 'Mutante', 'graveyard'); [s, ur] = poe(s, 0, 'Urso', 'graveyard');
  const im = E.legalActions(s, 0).find(a => a.t === 'cast' && a.oid === ov && a.alt === 0);
  assert.ok(im, 'conjurar pelo custo de impending ({1}{B})');
  s = resolve(act(s, im));
  assert.ok(naMesa(s, ov)); assert.equal(s.objects[ov].counters.time, 5);
  assert.equal(s.zones[0].graveyard.length >= 7, true, 'moeu quatro');
  assert.ok(s.pending && s.pending.kind === 'pick', 'escolhe no cemitério');
  assert.equal(s.pending.min, 0, '"you may": pode não devolver');
  assert.ok(s.pending.from.includes(ur), 'o Urso serve');
  assert.ok(!s.pending.from.includes(av), 'o Avatar não serve'); assert.ok(!s.pending.from.includes(mu), 'o metamorfo é Avatar: não serve');
});
