// M-349 · LT31 · Frases do Pauper: "exile the top N cards; until the end of your next turn, you may play them" (Wrenn's Resolve, Clockwork Percussionist),
// Glint Hawk ("sacrifice it unless you return an artifact"), Gingerbread Cabin ("enters tapped unless you control three or more other Forests";
// "when ~ enters untapped"), Cryogen Relic ("enters or leaves the battlefield"; "stun counter on up to one target tapped creature"), Ephemerate (pisca),
// Distortion Strike, Troll of Khazad-dûm ("except by three or more creatures") e Melded Moxite (ficha que entra virada). Texto oficial em
// .listas/oficiais-revisadas.json (Oracle do Forge, 12/10/2026). Cada teste de regra falha no leitor/motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';
import { loadModules } from './_load.mjs';

const { leitor: L, scripts: S } = loadModules();
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const mv = m => [...m.matchAll(/\{([^}]+)\}/g)].reduce((n, x) => n + (/^\d+$/.test(x[1]) ? +x[1] : x[1] === 'X' ? 0 : 1), 0);
const carta = n => { const c = OF.find(x => x.name === n); assert.ok(c, n); return { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: mv(c.mana_cost), keywords: /^Flying/m.test(c.oracle_text) ? ['Flying'] : /^Haste/m.test(c.oracle_text) ? ['Haste'] : [], oracle_text: c.oracle_text, colors: [...new Set(c.mana_cost.match(/[WUBRG]/g) || [])], ...(c.power ? { power: c.power, toughness: c.toughness } : {}) }; };
const NOMES = ["Wrenn's Resolve", 'Clockwork Percussionist', 'Glint Hawk', 'Gingerbread Cabin', 'Cryogen Relic', 'Ephemerate', 'Distortion Strike', 'Troll of Khazad-dûm', 'Melded Moxite'];
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: mv(mana_cost), keywords: [], oracle_text: '', colors: [...new Set(mana_cost.match(/[WUBRG]/g) || [])], ...extra });
const cards = { ...Object.fromEntries(NOMES.map(n => [n, carta(n)])), Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2' }), Arte: c0('Arte', 'Artifact', '{1}'), Mata: c0('Mata', 'Instant', '{B}'), Bosque: c0('Bosque', 'Land — Forest', ''), Capa: c0('Capa', 'Enchantment — Aura', '{G}'), Lamina: c0('Lamina', 'Artifact — Equipment', '{1}') };
const ex = { action: 'etb', target: 'none', expect: { attached: false } };
const scripts = { ...Object.fromEntries(NOMES.map(n => [n, { ...L.ler(carta(n)).script, example: ex }])), Mata: { name: 'Mata', effects: [{ do: 'destroy', target: 'creature' }], example: { target: 'enemy-creature', expect: { gone: true } } },
  Capa: { name: 'Capa', aura: { enchant: 'creature' }, grants: { power: 2, toughness: 2 }, example: { action: 'etb', target: 'own-creature', expect: { attached: true } } },
  Lamina: { name: 'Lamina', equip: { enchant: 'creature', cost: { mana: '{1}' } }, grants: { power: 1, toughness: 1 }, example: ex } };
function mesaX(a = [], b = [], seed = 53) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Mountain', 'Plains', 'Island']) }, { name: 'B', deck: baralho([...b, 'Forest', 'Swamp']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolveSo = s => act(act(s, { t: 'pass', p: s.turn.priority }), { t: 'pass', p: 1 - s.turn.priority });
const resolve = s => tudo(resolveSo(s));
const proximoTurnoDe = (s, p) => passaAte(act(s, { t: 'pass', p: s.turn.priority }), x => x.turn.active === p && x.turn.step === 'main1' && !x.stack.length && !x.pending && x.turn.number > s.turn.number);

test("LT31 · Wrenn's Resolve: exila as duas de cima; dá para jogá-las neste turno e no seu próximo; depois, não", () => {
  let s = mesaX(["Wrenn's Resolve"]), wr;
  [s, wr] = poe(s, 0, "Wrenn's Resolve", 'hand');
  const topo = s.zones[0].library.slice(0, 2);
  s = resolve(act(comMana(s, 'RR'), legais(comMana(s, 'RR'), 0, x => x.t === 'cast' && x.oid === wr)[0]));
  assert.ok(topo.every(o => s.objects[o].zone === 'exile'));
  const jog = t => legais(t, 0, x => (x.t === 'cast' || x.t === 'play_land') && topo.includes(x.oid)).length;
  assert.ok(jog(comMana(s, 'RRRRRR')) > 0, 'neste turno');
  let u = proximoTurnoDe(s, 1); assert.equal(jog(u), 0, 'no turno do oponente não (é o jogador ativo que joga)');
  let v = proximoTurnoDe(u, 0); assert.ok(jog(comMana(v, 'RRRRRR')) > 0, 'no seu próximo turno, sim');
  let w = proximoTurnoDe(proximoTurnoDe(v, 1), 0); assert.equal(jog(comMana(w, 'RRRRRR')), 0, 'no turno seguinte, acabou');
});

test('LT31 · Glint Hawk: ao entrar, devolve um artefato seu à mão ou é sacrificada; sem artefato, sacrificada direto', () => {
  let s = mesaX(['Glint Hawk', 'Arte']), gh, ar;
  [s, gh] = poe(s, 0, 'Glint Hawk', 'hand'); [s, ar] = poe(s, 0, 'Arte');
  let t = resolveSo(act(comMana(s, 'W'), legais(comMana(s, 'W'), 0, x => x.t === 'cast' && x.oid === gh)[0])); t = passaAte(t, x => !!x.pending || !x.stack.length);
  if (!t.pending) t = passaAte(resolveSo(t), x => !!x.pending || !x.stack.length);
  assert.equal(t.pending && t.pending.kind, 'pick', 'escolhe o artefato');
  const dev = tudo(act(t, { t: 'pick', p: 0, oid: ar })); assert.equal(dev.objects[ar].zone, 'hand'); assert.equal(dev.objects[gh].zone, 'battlefield');
  const nao = tudo(act(t, { t: 'pick_done', p: 0 })); assert.equal(nao.objects[gh].zone, 'graveyard', 'não devolveu: sacrificada'); assert.equal(nao.objects[ar].zone, 'battlefield');
  let q = J(s); q.zones[0].battlefield = q.zones[0].battlefield.filter(o => o !== ar); q.zones[0].library.push(ar); q.objects[ar].zone = 'library';
  q = resolveSo(act(comMana(q, 'W'), legais(comMana(q, 'W'), 0, x => x.t === 'cast' && x.oid === gh)[0])); q = tudo(passaAte(resolveSo(passaAte(q, x => !!x.pending || !x.stack.length)), x => !!x.pending || !x.stack.length));
  assert.equal(q.objects[gh].zone, 'graveyard', 'sem artefato: sacrificada');
});

test('LT31 · Gingerbread Cabin: entra virada com menos de três outras Florestas; desvirada com três, e cria uma Comida', () => {
  let s = mesaX(['Gingerbread Cabin', 'Bosque']), gc;
  [s, gc] = poe(s, 0, 'Gingerbread Cabin', 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Bosque');
  const t = tudo(act(s, { t: 'play_land', p: 0, oid: gc })); assert.equal(t.objects[gc].tapped, true); assert.equal(t.zones[0].battlefield.filter(o => t.objects[o].name === 'Food').length, 0, 'virada: sem Comida');
  let u; [u] = poe(s, 0, 'Bosque'); u = tudo(act(u, { t: 'play_land', p: 0, oid: gc }));
  assert.equal(u.objects[gc].tapped, false); assert.equal(u.zones[0].battlefield.filter(o => u.objects[o].name === 'Food').length, 1, 'desvirada: uma Comida');
});

test('LT31 · Cryogen Relic: compra ao entrar e ao sair; o marcador de atordoamento só vai em criatura virada', () => {
  let s = mesaX(['Cryogen Relic', 'Mata'], ['Urso']), cr, u, m;
  [s, cr] = poe(s, 0, 'Cryogen Relic', 'hand'); [s, u] = poe(s, 1, 'Urso'); [s, m] = poe(s, 0, 'Mata', 'hand');
  const h = s.zones[0].hand.length;
  let t = resolve(act(comMana(s, 'UU'), legais(comMana(s, 'UU'), 0, x => x.t === 'cast' && x.oid === cr)[0]));
  assert.equal(t.zones[0].hand.length, h - 1 + 1, 'entrou: compra');
  assert.equal(legais(comMana(t, 'UU'), 0, x => x.t === 'activate' && x.oid === cr && x.targets && x.targets[0] && x.targets[0].oid === u).length, 0, 'Urso desvirada não é alvo');
  const v = J(t); v.objects[u].tapped = true;
  const a = legais(comMana(v, 'UU'), 0, x => x.t === 'activate' && x.oid === cr && x.targets && x.targets[0] && x.targets[0].oid === u)[0]; assert.ok(a, 'virada: é alvo');
  const r = resolve(act(comMana(v, 'UU'), a)); assert.equal(r.objects[u].counters.stun, 1); assert.equal(r.objects[cr].zone, 'graveyard'); assert.equal(r.zones[0].hand.length, h - 1 + 1 + 1, 'saiu: compra de novo');
});

test('LT31 · Ephemerate pisca a sua criatura (objeto novo, entra desvirada); Distortion Strike dá +1/+0 e imbloqueável; Troll só bloqueado por três', () => {
  let s = mesaX(['Ephemerate', 'Urso', 'Distortion Strike', 'Troll of Khazad-dûm'], ['Urso']), ep, u, ds, tr, u1, u2, u3;
  [s, ep] = poe(s, 0, 'Ephemerate', 'hand'); [s, u] = poe(s, 0, 'Urso'); [s, ds] = poe(s, 0, 'Distortion Strike', 'hand'); [s, tr] = poe(s, 0, 'Troll of Khazad-dûm');
  s = J(s); s.objects[u].tapped = true;
  let t = resolve(act(comMana(s, 'W'), legais(comMana(s, 'W'), 0, x => x.t === 'cast' && x.oid === ep && x.targets[0].oid === u)[0]));
  assert.equal(t.objects[u].zone, 'battlefield'); assert.equal(t.objects[u].tapped, false, 'voltou desvirada'); assert.equal(t.objects[ep].zone, 'exile', 'ricochete');
  const d = resolve(act(comMana(s, 'U'), legais(comMana(s, 'U'), 0, x => x.t === 'cast' && x.oid === ds && x.targets[0].oid === u)[0]));
  assert.equal(E.stats(d, d.objects[u]).power, 3); assert.equal(d.objects[u].tempImbloqueavel, true);
  let b = s; [b, u1] = poe(b, 1, 'Urso'); [b, u2] = poe(b, 1, 'Urso'); [b, u3] = poe(b, 1, 'Urso');
  b = passaAte(b, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0); b = act(b, { t: 'attack', p: 0, attackers: [tr] });
  b = passaAte(b, x => x.pending && x.pending.kind === 'blockers');
  assert.throws(() => E.apply(b, { t: 'block', p: 1, blocks: [[u1, tr], [u2, tr]] }), /três/);
  const ofertas = legais(b, 1, x => x.t === 'block'); assert.ok(ofertas.some(x => x.blocks.length === 3) && !ofertas.some(x => x.blocks.length > 0 && x.blocks.length < 3), 'só a oferta com três');
  const c = act(b, { t: 'block', p: 1, blocks: [[u1, tr], [u2, tr], [u3, tr]] }); assert.equal(c.objects[u1].blocking, tr);
});

test('LT31 · Melded Moxite: {3}, sacrifique: um Robô 2/2 artefato criatura incolor entra virado', () => {
  let s = mesaX(['Melded Moxite']), mm;
  [s, mm] = poe(s, 0, 'Melded Moxite');
  const t = resolve(act(comMana(s, 'CCC'), legais(comMana(s, 'CCC'), 0, x => x.t === 'activate' && x.oid === mm)[0]));
  const robo = t.zones[0].battlefield.find(o => t.objects[o].name === 'Robot'); assert.ok(robo); assert.equal(t.objects[robo].tapped, true);
  assert.ok(E.tiposDe(t, t.objects[robo]).includes('artifact') && E.tiposDe(t, t.objects[robo]).includes('creature'));
});

test('achado da revisão do lote XXII · 400.7/704.5m/704.5n: a criatura piscada é outro objeto — a Aura vai ao cemitério e o Equipamento fica solto', () => {
  let s = mesaX(['Ephemerate', 'Urso', 'Capa', 'Lamina']), ep, u, capa, lam;
  [s, ep] = poe(s, 0, 'Ephemerate', 'hand'); [s, u] = poe(s, 0, 'Urso'); [s, capa] = poe(s, 0, 'Capa', 'hand'); [s, lam] = poe(s, 0, 'Lamina');
  s = resolve(act(comMana(s, 'G'), legais(comMana(s, 'G'), 0, x => x.t === 'cast' && x.oid === capa && x.targets[0].oid === u)[0]));
  s = resolve(act(comMana(s, 'C'), legais(comMana(s, 'C'), 0, x => x.t === 'activate' && x.oid === lam && x.targets && x.targets[0].oid === u)[0]));
  assert.equal(s.objects[capa].attachedTo, u); assert.equal(s.objects[lam].attachedTo, u); assert.equal(E.stats(s, s.objects[u]).power, 5, 'antes: 2+2+1');
  const t = resolve(act(comMana(s, 'W'), legais(comMana(s, 'W'), 0, x => x.t === 'cast' && x.oid === ep && x.targets[0].oid === u)[0]));
  assert.equal(t.objects[u].zone, 'battlefield'); assert.equal(t.objects[capa].zone, 'graveyard', 'Aura sem hospedeira vai ao cemitério (704.5m)');
  assert.equal(t.objects[lam].zone, 'battlefield'); assert.equal(t.objects[lam].attachedTo, undefined, 'Equipamento fica no campo, desanexado (704.5n)');
  assert.equal(E.stats(t, t.objects[u]).power, 2, 'o Urso volta 2/2');
});

test('achado da revisão do lote XXII · 111.8: ficha piscada pela Ephemerate não volta ao campo', () => {
  let s = mesaX(['Ephemerate', 'Melded Moxite']), ep, mm;
  [s, ep] = poe(s, 0, 'Ephemerate', 'hand'); [s, mm] = poe(s, 0, 'Melded Moxite');
  s = resolve(act(comMana(s, 'CCC'), legais(comMana(s, 'CCC'), 0, x => x.t === 'activate' && x.oid === mm)[0]));
  const robo = s.zones[0].battlefield.find(o => s.objects[o].name === 'Robot'); assert.ok(robo);
  const t = resolve(act(comMana(s, 'W'), legais(comMana(s, 'W'), 0, x => x.t === 'cast' && x.oid === ep && x.targets[0].oid === robo)[0]));
  assert.ok(!t.zones[0].battlefield.includes(robo), 'a ficha não volta'); assert.equal(t.objects[robo], undefined, 'e deixa de existir (704.5d)');
  assert.equal(t.objects[ep].zone, 'exile', 'a Ephemerate ricocheteia normalmente');
});

test('M-349 · as do lote XXII revisadas jogam (decisão A)', () => {
  for (const n of [...NOMES, 'Reckless Impulse']) assert.equal(S.coverage(carta(n)).level, 'completo', n + ' joga');
});
