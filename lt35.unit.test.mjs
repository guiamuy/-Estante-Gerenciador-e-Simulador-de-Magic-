// M-352 · LT33 · Frases do Pauper: habilidade ativada do cemitério (Bramble Wurm, 113.6), "this spell costs {1} less for each card you've
// drawn this turn" + "second from the top or on the bottom" (Deem Inferior), "if this spell wasn't cast from your hand, draw two instead" e
// lampejo com descarte (Twinned Vision), redução por cor (Goblin Anarchomancer, Thornscape Familiar, 601.2f) e impulso até o fim do turno
// (Experimental Synthesizer). Texto oficial em .listas/oficiais-revisadas.json (Oracle do Forge, 12/10/2026). Cada teste de regra falha no
// leitor/motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';
import { loadModules } from './_load.mjs';
import { T } from './listas.mjs';

const { leitor: L, scripts: S } = loadModules();
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const mv = m => [...m.matchAll(/\{([^}]+)\}/g)].reduce((n, x) => n + (/^\d+$/.test(x[1]) ? +x[1] : x[1] === 'X' ? 0 : 1), 0);
const cores = m => [...new Set((m.match(/[WUBRG]/g) || []))];
const carta = n => { const c = OF.find(x => x.name === n); assert.ok(c, n); return { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: mv(c.mana_cost), keywords: /^Reach, trample/m.test(c.oracle_text) ? ['Reach', 'Trample'] : [], oracle_text: c.oracle_text, colors: cores(c.mana_cost), ...(c.power ? { power: c.power, toughness: c.toughness } : {}) }; };
const NOMES = ['Bramble Wurm', 'Deem Inferior', 'Twinned Vision', 'Goblin Anarchomancer', 'Thornscape Familiar', 'Experimental Synthesizer'];
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: mv(mana_cost), keywords: [], oracle_text: '', colors: cores(mana_cost), ...extra });
const cards = { ...Object.fromEntries(NOMES.map(n => [n, carta(n)])), Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2' }), Choque: c0('Choque', 'Instant', '{1}{R}'), Fagulha: c0('Fagulha', 'Instant', '{R}'), Fenix: c0('Fenix', 'Sorcery', '{3}{R}'), Azul: c0('Azul', 'Instant', '{1}{U}'), Arte: c0('Arte', 'Artifact', '{1}') };
const ex = { action: 'etb', target: 'none', expect: { attached: false } };
const scripts = { ...Object.fromEntries(NOMES.map(n => [n, { ...L.ler(carta(n)).script, example: ex }])),
  Choque: { name: 'Choque', effects: [{ do: 'damage', amount: 2, target: 'any' }], example: { target: 'enemy-creature', expect: { gone: true } } },
  Fagulha: { name: 'Fagulha', kicker: { mana: '{4}' }, effects: [{ do: 'gain', amount: 1 }, { do: 'draw', amount: 1, onlyIf: 'kicked' }], example: { target: 'none', expect: { selfLife: 1 } } },
  Fenix: { name: 'Fenix', escape: { mana: '{2}{R}', exileGraveyard: 1 }, effects: [{ do: 'gain', amount: 1 }], example: { target: 'none', expect: { selfLife: 1 } } },
  Azul: { name: 'Azul', effects: [{ do: 'draw', amount: 1 }], example: { target: 'none', expect: { handDelta: 1 } } } };
function mesaX(a = [], b = [], seed = 61) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Forest', 'Island', 'Mountain']) }, { name: 'B', deck: baralho([...b, 'Plains', 'Swamp']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolveSo = s => act(act(s, { t: 'pass', p: s.turn.priority }), { t: 'pass', p: 1 - s.turn.priority });
const resolve = s => tudo(resolveSo(s));

test('LT33 · Bramble Wurm: do cemitério, {2}{G} e exilá-la dão 5 de vida (usa a pilha); do campo, não; sem mana, não', () => {
  let s = mesaX(['Bramble Wurm']), bw;
  [s, bw] = poe(s, 0, 'Bramble Wurm', 'graveyard');
  assert.equal(legais(s, 0, x => x.t === 'activate' && x.oid === bw).length, 0, 'sem mana, nada');
  const m = comMana(s, 'GGG'), a = legais(m, 0, x => x.t === 'activate' && x.oid === bw); assert.equal(a.length, 1); assert.equal(a[0].fromGraveyard, true);
  const v = s.players[0].life; let t = act(m, a[0]);
  assert.equal(t.objects[bw].zone, 'exile', 'exilada como custo'); assert.equal(t.stack.length, 1, 'a habilidade usa a pilha');
  t = resolve(t); assert.equal(t.players[0].life, v + 5);
  let u = s; [u, bw] = poe(u, 0, 'Bramble Wurm');
  assert.equal(legais(comMana(u, 'GGG'), 0, x => x.t === 'activate' && x.oid === bw).length, 0, 'no campo a habilidade do cemitério não existe');
  assert.throws(() => E.apply(comMana(u, 'GGG'), { t: 'activate', p: 0, oid: bw, index: 0 }), /cemitério/);
});

test('LT33 · Deem Inferior: {1} a menos por carta comprada no turno; o dono põe a permanente em segundo do topo ou no fundo', () => {
  let s = mesaX(['Deem Inferior', 'Azul'], ['Urso']), di, u;
  [s, di] = poe(s, 0, 'Deem Inferior', 'hand'); [s, u] = poe(s, 1, 'Urso');
  assert.equal(legais(comMana(s, 'UU'), 0, x => x.t === 'cast' && x.oid === di).length, 0, 'sem compras: custa {3}{U}');
  s = J(s); s.players[0].drawnThisTurn = 2;
  const ofs = legais(comMana(s, 'UU'), 0, x => x.t === 'cast' && x.oid === di && x.targets[0].oid === u); assert.ok(ofs.length, 'com duas compras: {1}{U}');
  let t = resolveSo(act(comMana(s, 'UU'), ofs[0]));
  assert.equal(t.pending.kind, 'topo_fundo'); assert.equal(t.pending.p, 1, 'quem escolhe é o dono'); assert.equal(t.pending.segundo, true);
  const topoAntes = t.zones[1].library[0];
  const a = tudo(act(t, { t: 'topo_fundo', p: 1, topo: true }));
  assert.equal(a.zones[1].library[1], u, 'em segundo do topo'); assert.equal(a.zones[1].library[0], topoAntes, 'a de cima continua em cima');
  const b = tudo(act(t, { t: 'topo_fundo', p: 1, topo: false }));
  assert.equal(b.zones[1].library[b.zones[1].library.length - 1], u, 'no fundo');
  assert.equal(legais(comMana(s, 'UU'), 0, x => x.t === 'cast' && x.oid === di && x.targets.some(y => y.oid != null && (s.facts[s.objects[y.oid].name].types || []).includes('land'))).length, 0, 'terreno não é alvo');
});

test('LT33 · Twinned Vision: da mão compra 1; pelo lampejo (com descarte escolhido) compra 2', () => {
  let s = mesaX(['Twinned Vision', 'Urso', 'Choque']), tv, d1, d2;
  [s, tv] = poe(s, 0, 'Twinned Vision', 'hand');
  let h = s.zones[0].hand.length, t = resolve(act(comMana(s, 'UU'), legais(comMana(s, 'UU'), 0, x => x.t === 'cast' && x.oid === tv)[0]));
  assert.equal(t.zones[0].hand.length, h - 1 + 1, 'da mão: uma');
  let u = s; u = J(u); u.zones[0].hand = u.zones[0].hand.filter(x => x !== tv); u.zones[0].graveyard.push(tv); u.objects[tv].zone = 'graveyard';
  [u, d1] = poe(u, 0, 'Urso', 'hand'); [u, d2] = poe(u, 0, 'Choque', 'hand');
  const fb = legais(comMana(u, 'UUU'), 0, x => x.t === 'cast' && x.oid === tv && x.flashback);
  assert.ok(fb.length >= 2, 'uma oferta por carta a descartar'); const comD2 = fb.find(x => [].concat(x.pay.discard).includes(d2)); assert.ok(comD2);
  h = u.zones[0].hand.length; t = act(comMana(u, 'UUU'), comD2);
  assert.equal(t.objects[d2].zone, 'graveyard', 'descartou a escolhida'); assert.equal(t.objects[d1].zone, 'hand');
  t = resolve(t); assert.equal(t.zones[0].hand.length, h - 1 + 2, 'pelo lampejo: duas'); assert.equal(t.objects[tv].zone, 'exile');
});

test('LT33 · Goblin Anarchomancer e Thornscape Familiar: mágica vermelha/verde (ou vermelha/branca) custa {1} a menos, só no genérico; as outras não', () => {
  let s = mesaX(['Goblin Anarchomancer', 'Choque', 'Azul', 'Thornscape Familiar']), ga, ch, az, tf;
  [s, ch] = poe(s, 0, 'Choque', 'hand'); [s, az] = poe(s, 0, 'Azul', 'hand');
  const pode = (st, oid, m) => legais(comMana(st, m), 0, x => x.t === 'cast' && x.oid === oid).length > 0;
  assert.equal(pode(s, ch, 'R'), false, 'sem redução: {1}{R} não sai com R');
  [s, ga] = poe(s, 0, 'Goblin Anarchomancer');
  assert.equal(pode(s, ch, 'R'), true, 'Anarchomancer: Choque vermelho por {R}'); assert.equal(pode(s, az, 'U'), false, 'azul não');
  [s, tf] = poe(s, 0, 'Thornscape Familiar');
  assert.equal(pode(s, ch, ''), false, 'as duas reduções não tiram o {R} colorido');
  let u = s; u = J(u); u.zones[0].battlefield = u.zones[0].battlefield.filter(x => x !== ga); u.zones[0].graveyard.push(ga); u.objects[ga].zone = 'graveyard';
  assert.equal(pode(u, ch, 'R'), true, 'Thornscape sozinha: vermelha também por {R}'); assert.equal(pode(u, az, 'U'), false);
});

test('achado da revisão do lote XXIV · 601.2f: a redução por cor tira do custo total — reforço genérico de mágica sem genérico impresso e custo de fuga', () => {
  let s = mesaX(['Goblin Anarchomancer', 'Fagulha', 'Fenix', 'Urso']), fg, fx;
  [s, fg] = poe(s, 0, 'Fagulha', 'hand'); [s, fx] = poe(s, 0, 'Fenix', 'graveyard'); [s] = poe(s, 0, 'Urso', 'graveyard');
  const kick = (st, m) => legais(comMana(st, m), 0, x => x.t === 'cast' && x.oid === fg && x.kick).length > 0;
  const fuga = (st, m) => legais(comMana(st, m), 0, x => x.t === 'cast' && x.oid === fx && x.escape).length > 0;
  assert.equal(kick(s, 'RRRR'), false, 'sem redução, {R}+{4} pede cinco'); assert.equal(fuga(s, 'RR'), false, 'sem redução, a fuga pede {2}{R}');
  [s] = poe(s, 0, 'Goblin Anarchomancer');
  assert.equal(kick(s, 'RRRR'), true, 'com o Anarchomancer, {R}+{4} sai por quatro'); assert.equal(kick(s, 'RRR'), false);
  assert.doesNotThrow(() => E.apply(comMana(s, 'RRRR'), { t: 'cast', p: 0, oid: fg, kick: 1 }));
  assert.equal(fuga(s, 'RR'), true, 'a fuga sai por {1}{R}');
  const t = act(comMana(s, 'RRR'), legais(comMana(s, 'RRR'), 0, x => x.t === 'cast' && x.oid === fx && x.escape)[0]);
  assert.equal(t.players[0].pool.R, 1, 'pagando a fuga com RRR sobra um R');
});

test('LT33 · Experimental Synthesizer: ao entrar e ao sair, exila a do topo e ela é jogável só até o fim do turno; {2}{R}, sacrifique: Samurai 2/2 com vigilância (só como feitiço)', () => {
  let s = mesaX(['Experimental Synthesizer']), es;
  [s, es] = poe(s, 0, 'Experimental Synthesizer', 'hand');
  const topo = s.zones[0].library[0];
  let t = resolve(act(comMana(s, 'R'), legais(comMana(s, 'R'), 0, x => x.t === 'cast' && x.oid === es)[0])); if (t.stack.length) t = resolve(t);
  assert.equal(t.objects[topo].zone, 'exile'); assert.equal(t.objects[topo].jogavelSoNesteTurno, true);
  const topo2 = t.zones[0].library[0];
  let u = resolve(act(comMana(t, 'RRR'), legais(comMana(t, 'RRR'), 0, x => x.t === 'activate' && x.oid === es)[0]));
  const sam = u.zones[0].battlefield.find(o => u.objects[o].name === 'Samurai'); assert.ok(sam, 'Samurai'); assert.ok(E.hasKeyword(u, u.objects[sam], 'vigilance'));
  assert.equal(u.objects[topo2].zone, 'exile', 'ao sair, outra do topo');
  const v = passaAte(act(u, { t: 'pass', p: u.turn.priority }), x => x.turn.active === 1 && x.turn.step === 'main1');
  assert.ok(!v.objects[topo].playableFromExile && !v.objects[topo2].playableFromExile, 'acabou com o turno');
});

test('M-352 · pilha explicada dos efeitos novos em português, sem NaN', () => {
  for (const n of NOMES) { const sc = scripts[n]; for (const e of [...(sc.effects || []), ...(sc.abilities || []).flatMap(a => a.effects || [])]) { const d = T.descreveEfeitos([e]); assert.ok(d && !/NaN|undefined|_/.test(d), n + ': ' + d); } }
  assert.match(T.descreveEfeitos(scripts['Deem Inferior'].effects), /em segundo do topo ou no fundo/);
  assert.match(T.descreveEfeitos(scripts['Experimental Synthesizer'].abilities[0].effects), /até o fim do turno/);
});

test('M-352 · as do lote XXIV revisadas jogam (decisão A)', () => {
  for (const n of NOMES) assert.equal(S.coverage(carta(n)).level, 'completo', n + ' joga');
});
