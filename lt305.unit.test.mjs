// M-628 · rotina Motor contínuo · campanha Modern, ordem gulosa (coleta de 12/11/2026 13h50 UTC; com M-624 no main e M-625/M-626/M-627
// na fila, Kaito, Bane of Nightmares é a próxima: 13 listas Modern, única pendência de uma e par com Cling to Dust e Drown in the Loch).
// Regras novas: 611.3a/613 · habilidade estática própria "During your turn, as long as ~ has one or more loyalty counters on him, he's a 3/4
// Ninja creature and has hexproof" (self.criaturaNoSeuTurnoM: camada 4 só criatura Ninja — ruling: deixa de ser planeswalker —, 7b 3/4 e 6
// resistência a magia); 114.1/114.4 · emblema com habilidade estática na zona de comando ("Ninjas you control get +1/+1"); "draw a card for
// each opponent who lost life this turn" (perda de vida, não a vida de agora); 120.3c pelo tipo de agora (o dano de efeito no Kaito criatura
// fica marcado e não tira lealdade). Texto da API da Scryfall de 13/11/2026 (.listas/oficiais-revisadas.json) e rulings de 20/09/2024.
// Tudo falha no motor anterior: a carta não tinha script, nem o motor o emblema com estática, a contagem e a criatura no seu turno.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';

const M = loadModules(), E = M.engine, S = M.scripts, SF = M.scryfall, T = M.table;
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const KA = 'Kaito, Bane of Nightmares', EMB = 'Kaito, Bane of Nightmares Emblem';
const oficial = n => { const o = OF.find(x => x.name === n); assert.ok(o, `${n} em .listas/oficiais-revisadas.json`);
  return SF.normalizeCard({ object: 'card', layout: 'normal', ...o, cmc: 4, colors: ['B', 'U'] }); };
const J = x => JSON.parse(JSON.stringify(x));

test('M-628 · texto da Scryfall de 13/11 guardado; script à mão válido e cobertura completa', () => {
  const o = OF.find(x => x.name === KA);
  assert.match(o.fonte, /api\.scryfall\.com/); assert.equal(o.consulta, '2026-11-13'); assert.equal(o.loyalty, '4');
  assert.equal(o.oracle_text, 'Ninjutsu {1}{U}{B} ({1}{U}{B}, Return an unblocked attacker you control to hand: Put this card onto the battlefield from your hand tapped and attacking.)\nDuring your turn, as long as Kaito has one or more loyalty counters on him, he\'s a 3/4 Ninja creature and has hexproof.\n+1: You get an emblem with "Ninjas you control get +1/+1."\n0: Surveil 2. Then draw a card for each opponent who lost life this turn.\n−2: Tap target creature. Put two stun counters on it.');
  assert.ok(S.SCRIPTS[KA]); assert.equal(S.validateScript(S.SCRIPTS[KA]).length, 0);
  assert.equal(S.coverage(oficial(KA), S.SCRIPTS, KA).level, 'completo');
});

test('M-628 · validador: criaturaNoSeuTurnoM e emblema só no formato certo', () => {
  const base = { name: 'Teste', example: { target: 'none', expect: { selfLife: 0 } } };
  const lea = [{ cost: 1, label: '+1', effects: [{ do: 'draw', amount: 1 }] }];
  assert.ok(S.validateScript({ ...base, loyalty: lea, self: { criaturaNoSeuTurnoM: { base: [3] } } }).length, 'P/R incompleto');
  assert.ok(S.validateScript({ ...base, loyalty: lea, self: { criaturaNoSeuTurnoM: { base: [3, 4], palavras: ['voo'] } } }).length, 'palavra desconhecida');
  assert.ok(S.validateScript({ ...base, loyalty: lea, self: { criaturaNoSeuTurnoM: { base: [3, 4], cor: 'U' } } }).length, 'chave desconhecida');
  assert.ok(S.validateScript({ ...base, effects: [{ do: 'draw', amount: 1 }], self: { criaturaNoSeuTurnoM: { base: [3, 4], comLealdade: true } } }).length, 'comLealdade fora de planeswalker');
  assert.equal(S.validateScript({ ...base, loyalty: lea, self: { criaturaNoSeuTurnoM: { base: [3, 4], subtipos: ['Ninja'], comLealdade: true } } }).length, 0);
  assert.ok(S.validateScript({ ...base, effects: [{ do: 'emblema', nome: 'E' }] }).length, 'emblema sem contínuo');
  assert.ok(S.validateScript({ ...base, effects: [{ do: 'emblema', continuo: [{ afetados: { tipos: ['creature'] }, poder: 1 }] }] }).length, 'emblema sem nome');
  assert.ok(S.validateScript({ ...base, effects: [{ do: 'emblema', nome: 'E', continuo: [{ afetados: 'self', poder: 1 }] }] }).length, 'emblema não afeta a si mesmo');
  assert.equal(S.validateScript({ ...base, effects: [{ do: 'emblema', nome: 'E', continuo: [{ afetados: { tipos: ['creature'], de: 'you' }, poder: 1, resistencia: 1 }] }] }).length, 0);
  assert.ok(S.validateScript({ ...base, effects: [{ do: 'draw', amount: { per: 'oponentes-que-perderam' } }] }).length, 'contagem desconhecida');
});

// ── partidas ──
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: [...mana_cost.matchAll(/\{([^}]+)\}/g)].reduce((n, [, x]) => n + (/^\d+$/.test(x) ? +x : 1), 0), keywords: [], oracle_text: '', colors: [], ...extra });
const C = {
  [KA]: oficial(KA),
  Island: c0('Island', 'Basic Land — Island', '', { oracle_text: '({T}: Add {U}.)' }),
  Swamp: c0('Swamp', 'Basic Land — Swamp', '', { oracle_text: '({T}: Add {B}.)' }),
  Mountain: c0('Mountain', 'Basic Land — Mountain', '', { oracle_text: '({T}: Add {R}.)' }),
  Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2', colors: ['G'] }),
  Sombra: c0('Sombra', 'Creature — Human Ninja', '{1}{U}', { power: '1', toughness: '1', colors: ['U'] }),
  Choque: c0('Choque', 'Instant', '{R}', { oracle_text: 'Choque deals 2 damage to any target.', colors: ['R'] }),
};
const ex = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCR = { Urso: { name: 'Urso', ...ex }, Sombra: { name: 'Sombra', ...ex },
  Choque: { name: 'Choque', effects: [{ do: 'damage', amount: 2, target: 'any' }], example: { target: 'enemy-creature', expect: { gone: true } } } };
const act = (s, a) => { const r = E.apply(s, a); if (r.error) throw new Error(JSON.stringify(r.error)); return r.state; };
function passaAte(s, fim, max = 400) {
  for (let i = 0; i < max && !fim(s); i++) { const pd = s.pending;
    if (pd && pd.kind === 'discard' && pd.reason !== 'effect') s = act(s, { t: 'discard', p: pd.p, oid: s.zones[pd.p].hand[0] });
    else if (pd && pd.kind === 'attackers') s = act(s, { t: 'attack', p: pd.p, attackers: [] });
    else if (pd && pd.kind === 'blockers') s = act(s, { t: 'block', p: pd.p, blocks: [] });
    else if (pd) return s; else s = act(s, { t: 'pass', p: s.turn.priority }); }
  return s;
}
function poe(s, p, name, zone = 'battlefield', lealdade = 4) {
  s = J(s);
  const from = ['library', 'hand', 'graveyard'].map(z => s.zones[p][z]).find(z => z.some(o => s.objects[o].name === name));
  if (!from) throw new Error(name + ' ausente');
  const oid = from.find(o => s.objects[o].name === name); from.splice(from.indexOf(oid), 1); s.zones[p][zone].push(oid);
  Object.assign(s.objects[oid], { zone, sick: false, tapped: false, controller: p });
  if (zone === 'battlefield' && name === KA) s.objects[oid].counters = { ...(s.objects[oid].counters || {}), loyalty: lealdade };
  return [s, oid];
}
const limpaMao = (s, p) => { s = J(s); for (const oid of s.zones[p].hand.slice()) { s.zones[p].hand.splice(s.zones[p].hand.indexOf(oid), 1); s.zones[p].library.unshift(oid); s.objects[oid].zone = 'library'; } return s; };
const resolve = s => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { if (s.pending) return s; s = act(s, { t: 'pass', p: s.turn.priority }); } return s; };
const terras = (s, p, nomes) => { let o; for (const n of nomes) [s, o] = poe(s, p, n); return s; };
function mesa(seed = 628) {
  const d = ns => ns.map(name => ({ name, qty: 6, zone: 'main' }));
  const todos = [KA, 'Island', 'Swamp', 'Mountain', 'Urso', 'Sombra', 'Choque'];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCR, first: 0, players: [{ name: 'A', deck: d(todos) }, { name: 'B', deck: d(todos) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  return limpaMao(limpaMao(s, 0), 1);
}
const ativa = (s, oid, index) => { const a = E.legalActions(s, s.objects[oid].controller).find(x => x.t === 'activate' && x.oid === oid && x.index === index && !x.targets); assert.ok(a, `habilidade ${index} oferecida`); return a; };
const ehCriatura = (s, oid) => E.isCreature(s, s.objects[oid]);
const pt = (s, oid) => { const x = E.stats(s, s.objects[oid]); return [x.power, x.toughness]; };
/** Vai ao main1 do próximo turno de `p`, sem ataques nem bloqueios. */
const proximoMain1 = (s, p) => passaAte(act(s, { t: 'pass', p: s.turn.priority }), x => x.turn.active === p && x.turn.step === 'main1' && !x.stack.length && !x.pending);

test('M-628 · no seu turno, com lealdade, Kaito é só criatura Ninja 3/4 com resistência a magia (lendário); no do oponente, planeswalker', () => {
  let s = mesa(), ka; [s, ka] = poe(s, 0, KA);
  assert.ok(ehCriatura(s, ka)); assert.deepEqual(J(E.tiposDe(s, s.objects[ka])), ['creature'], 'deixa de ser planeswalker (ruling)');
  assert.deepEqual(pt(s, ka), [3, 4]); assert.ok(E.hasKeyword(s, s.objects[ka], 'hexproof'));
  assert.match(E.linhaDeTipo(s, s.objects[ka]), /^Legendary Creature — Ninja$/, 'o supertipo lendário fica (205.4a)');
  // sem lealdade, no próprio turno, não é criatura (a condição é conferida a cada leitura, 611.3a)
  const s0 = J(s); s0.objects[ka].counters.loyalty = 0; assert.ok(!ehCriatura(s0, ka)); assert.ok(E.tiposDe(s0, s0.objects[ka]).includes('planeswalker'));
  s = proximoMain1(s, 1);
  assert.equal(s.objects[ka].zone, 'battlefield');
  assert.ok(!ehCriatura(s, ka), 'no turno de B é planeswalker'); assert.deepEqual(J(E.tiposDe(s, s.objects[ka])), ['planeswalker']);
  assert.ok(!E.hasKeyword(s, s.objects[ka], 'hexproof'));
});

test('M-628 · ninjutsu: o Urso não bloqueado volta à mão; Kaito entra virado e atacando com lealdade 4 e causa 3 ao defensor', () => {
  let s = mesa(), ka, urso; [s, ka] = poe(s, 0, KA, 'hand'); [s, urso] = poe(s, 0, 'Urso'); s = terras(s, 0, ['Island', 'Swamp', 'Swamp']);
  s = passaAte(act(s, { t: 'pass', p: 0 }), x => x.pending && x.pending.kind === 'attackers');
  s = act(s, { t: 'attack', p: 0, attackers: [urso] });
  s = passaAte(s, x => (x.pending && x.pending.kind === 'blockers') || x.turn.step === 'combat_blockers');
  if (s.pending && s.pending.kind === 'blockers') s = act(s, { t: 'block', p: 1, blocks: [] });
  s = passaAte(s, x => x.turn.step === 'combat_blockers' && x.turn.priority === 0 && !x.stack.length);
  const nj = E.legalActions(s, 0).find(a => a.t === 'ninjutsu' && a.oid === ka && a.attacker === urso);
  assert.ok(nj, 'ninjutsu oferecido para a carta de planeswalker');
  s = act(s, nj); assert.equal(s.objects[urso].zone, 'hand', 'devolver o atacante é custo');
  s = act(s, { t: 'pass', p: 0 }); s = act(s, { t: 'pass', p: 1 }); // a habilidade resolve
  const k = s.objects[ka];
  assert.equal(k.zone, 'battlefield'); assert.ok(k.tapped); assert.equal(k.counters.loyalty, 4, 'entra com a lealdade (306.5b)');
  assert.ok(s.combat.attackers.includes(ka)); assert.ok(ehCriatura(s, ka));
  const vida = s.players[1].life;
  s = passaAte(s, x => x.turn.step === 'main2');
  assert.equal(s.players[1].life, vida - 3, 'o Kaito 3/4 causa 3');
  assert.equal(s.objects[ka].counters.loyalty, 4);
});

test('M-628 · dano de efeito: no seu turno o Kaito criatura fica com o dano marcado e a lealdade não cai; no do oponente, cai', () => {
  let s = mesa(), ka, ch; [s, ka] = poe(s, 0, KA); [s, ch] = poe(s, 0, 'Choque', 'hand'); s = terras(s, 0, ['Mountain']);
  const alvo = E.legalActions(s, 0).find(a => a.t === 'cast' && a.oid === ch && JSON.stringify(a.targets || []).includes(ka));
  assert.ok(alvo, 'quem controla o Kaito pode mirá-lo (resistência a magia só vale contra oponentes)');
  s = resolve(act(s, alvo));
  assert.equal(s.objects[ka].counters.loyalty, 4, '120.3c pelo tipo de agora: não é planeswalker'); assert.equal(s.objects[ka].damage, 2);
  // B, no turno de A, não mira o Kaito (resistência a magia)
  let s1 = mesa(), k1, c1; [s1, k1] = poe(s1, 0, KA); [s1, c1] = poe(s1, 1, 'Choque', 'hand'); s1 = terras(s1, 1, ['Mountain']);
  s1 = act(s1, { t: 'pass', p: 0 });
  assert.ok(!E.legalActions(s1, 1).some(a => a.t === 'cast' && a.oid === c1 && JSON.stringify(a.targets || []).includes(k1)), 'hexproof no turno de A');
  // no turno de B, o Kaito é planeswalker: B mira e tira lealdade
  let s2 = mesa(), k2, c2; [s2, k2] = poe(s2, 0, KA); s2 = proximoMain1(s2, 1); [s2, c2] = poe(s2, 1, 'Choque', 'hand'); s2 = terras(s2, 1, ['Mountain']);
  const a2 = E.legalActions(s2, 1).find(a => a.t === 'cast' && a.oid === c2 && JSON.stringify(a.targets || []).includes(k2));
  assert.ok(a2); s2 = resolve(act(s2, a2));
  assert.equal(s2.objects[k2].counters.loyalty, 2); assert.equal(s2.objects[k2].damage || 0, 0);
});

test('M-628 · +1: emblema na zona de comando; Ninjas de quem o tem recebem +1/+1 (Kaito incluso), não os do oponente; dois emblemas somam', () => {
  let s = mesa(), ka, so, sb, ur; [s, ka] = poe(s, 0, KA); [s, so] = poe(s, 0, 'Sombra'); [s, sb] = poe(s, 1, 'Sombra'); [s, ur] = poe(s, 0, 'Urso');
  s = resolve(act(s, ativa(s, ka, 0)));
  assert.equal(s.objects[ka].counters.loyalty, 5);
  const emb = s.zones[0].command.map(o => s.objects[o]).filter(o => o.name === EMB);
  assert.equal(emb.length, 1); assert.ok(emb[0].emblemaV);
  assert.deepEqual(pt(s, ka), [4, 5]); assert.deepEqual(pt(s, so), [2, 2]); assert.deepEqual(pt(s, sb), [1, 1], 'o Ninja do oponente não'); assert.deepEqual(pt(s, ur), [2, 2], 'o não Ninja não');
  // no turno de B o Kaito não é Ninja; a Sombra de A continua com o bônus
  s = proximoMain1(s, 1);
  assert.deepEqual(pt(s, so), [2, 2]); assert.ok(!ehCriatura(s, ka));
  s = proximoMain1(s, 0);
  s = resolve(act(s, ativa(s, ka, 0)));
  assert.equal(s.zones[0].command.filter(o => s.objects[o].name === EMB).length, 2);
  assert.deepEqual(pt(s, so), [3, 3]); assert.deepEqual(pt(s, ka), [5, 6]);
  // o emblema não é carta (o fuzz e as invariantes contam as cartas)
  assert.deepEqual(J(E.invariants(s)), []);
  assert.match(T.descreveEfeito(S.SCRIPTS[KA].loyalty[0].effects[0]), /emblema: cada criatura Ninja que você controla recebe \+1\/\+1/);
});

test('M-628 · 0: vigiar 2 e uma carta por oponente que perdeu vida neste turno (perder conta mesmo se ganhou depois)', () => {
  const zeroCom = (perdeu) => {
    let s = mesa(), ka; [s, ka] = poe(s, 0, KA);
    s = J(s); if (perdeu) { s.players[1].life -= 1; s.players[1].lifeLost = 1; s.players[1].life += 3; }
    const mao = s.zones[0].hand.length, grim = s.zones[0].library.length;
    s = act(s, ativa(s, ka, 1)); s = act(s, { t: 'pass', p: 0 }); s = act(s, { t: 'pass', p: 1 });
    assert.equal(s.pending && s.pending.kind, 'pick', 'vigiar: quem controla escolhe');
    s = act(s, E.legalActions(s, 0).find(a => a.t === 'pick_done'));
    s = resolve(s);
    return { s, mao, grim };
  };
  const a = zeroCom(true); assert.equal(a.s.zones[0].hand.length, a.mao + 1, 'B perdeu vida: compra 1'); assert.equal(a.s.zones[0].graveyard.length, 2, 'as duas vigiadas foram para o cemitério');
  const b = zeroCom(false); assert.equal(b.s.zones[0].hand.length, b.mao, 'ninguém perdeu vida: não compra');
  assert.match(T.descreveEfeito(S.SCRIPTS[KA].loyalty[1].effects[1]), /oponente que perdeu vida neste turno/);
});

test('M-628 · −2: vira a criatura alvo e põe dois marcadores de atordoamento; ela não desvira nos dois próximos desviramentos', () => {
  let s = mesa(), ka, ur; [s, ka] = poe(s, 0, KA); [s, ur] = poe(s, 1, 'Urso');
  const a = E.legalActions(s, 0).find(x => x.t === 'activate' && x.oid === ka && x.index === 2 && JSON.stringify(x.targets || []).includes(ur));
  assert.ok(a, '−2 mira a criatura do oponente'); s = resolve(act(s, a));
  assert.equal(s.objects[ka].counters.loyalty, 2); assert.ok(s.objects[ur].tapped); assert.equal(s.objects[ur].counters.stun, 2);
  s = proximoMain1(s, 1); assert.ok(s.objects[ur].tapped); assert.equal(s.objects[ur].counters.stun, 1, '122.1d: tira um marcador em vez de desvirar');
  s = proximoMain1(s, 0); s = proximoMain1(s, 1); assert.ok(s.objects[ur].tapped); assert.ok(!s.objects[ur].counters.stun);
  s = proximoMain1(s, 0); s = proximoMain1(s, 1); assert.ok(!s.objects[ur].tapped, 'sem marcador, desvira');
});

test('M-628 · −2 com lealdade 2 leva a 0: deixa de ser criatura, volta a planeswalker e morre pela ação de estado (704.5i)', () => {
  let s = mesa(), ka, ur; [s, ka] = poe(s, 0, KA, 'battlefield', 2); [s, ur] = poe(s, 1, 'Urso');
  const a = E.legalActions(s, 0).find(x => x.t === 'activate' && x.oid === ka && x.index === 2 && JSON.stringify(x.targets || []).includes(ur));
  s = resolve(act(s, a));
  assert.equal(s.objects[ka].zone, 'graveyard');
});
