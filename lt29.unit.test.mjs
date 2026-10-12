// M-345 · LT27 · Vampiric Tutor ("then shuffle and put that card on top. You lose 2 life."), Sensei's Divining Top ("put ~ on top of its owner's
// library"), Cultivate ("put one onto the battlefield tapped and the other into your hand"), terras-filtro ("{G/W}, {T}: Add {G}{G}, {G}{W}, or {W}{W}"),
// "Return up to two target creature cards from your graveyard to your hand" e "deals 2 damage to each of one or two targets". Scripts lidos pelo leitor;
// texto oficial em .listas/oficiais-revisadas.json (Oracle do Forge, 12/10/2026). Cada teste falha no leitor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';
import { loadModules } from './_load.mjs';

const { leitor: L, scripts: S } = loadModules();
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const mv = m => [...m.matchAll(/\{([^}]+)\}/g)].reduce((n, x) => n + (/^\d+$/.test(x[1]) ? +x[1] : x[1] === 'X' ? 0 : 1), 0);
const carta = n => { const c = OF.find(x => x.name === n); assert.ok(c, n); return { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: mv(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [...new Set(c.mana_cost.match(/[WUBRG]/g) || [])], ...(c.power ? { power: c.power, toughness: c.toughness } : {}) }; };
const NOMES = ['Vampiric Tutor', "Sensei's Divining Top", 'Cultivate', 'Wooded Bastion', 'Macabre Waltz', 'Storm of Steel'];
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: mv(mana_cost), keywords: [], oracle_text: '', colors: [...new Set(mana_cost.match(/[WUBRG]/g) || [])], ...extra });
const cards = { ...Object.fromEntries(NOMES.map(n => [n, carta(n)])), Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2' }) };
const ex = { action: 'etb', target: 'none', expect: { attached: false } };
const scripts = Object.fromEntries(NOMES.map(n => [n, { ...L.ler(carta(n)).script, example: ex }]));
function mesaX(a = [], b = [], seed = 41) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Plains', 'Swamp', 'Forest']) }, { name: 'B', deck: baralho([...b, 'Island', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolveSo = s => act(act(s, { t: 'pass', p: s.turn.priority }), { t: 'pass', p: 1 - s.turn.priority });

test('LT27 · Vampiric Tutor: a carta achada vai para o topo depois de embaralhar; perde 2 de vida', () => {
  let s = mesaX(['Vampiric Tutor', 'Urso']), vt;
  [s, vt] = poe(s, 0, 'Vampiric Tutor', 'hand');
  const v = s.players[0].life;
  s = resolveSo(act(comMana(s, 'B'), legais(comMana(s, 'B'), 0, x => x.t === 'cast' && x.oid === vt)[0]));
  assert.equal(s.pending && s.pending.kind, 'pick');
  const urso = s.pending.from.find(o => s.objects[o].name === 'Urso'); s = act(s, { t: 'pick', p: 0, oid: urso });
  if (s.pending && s.pending.kind === 'pick') s = act(s, { t: 'pick_done', p: 0 });
  s = tudo(s);
  assert.equal(s.zones[0].library[0], urso, 'no topo'); assert.equal(s.players[0].life, v - 2);
});

test("LT27 · Sensei's Divining Top: {T} compra uma e ela volta ao topo do grimório do dono", () => {
  let s = mesaX(["Sensei's Divining Top"]), top;
  [s, top] = poe(s, 0, "Sensei's Divining Top");
  const h = s.zones[0].hand.length, a = legais(s, 0, x => x.t === 'activate' && x.oid === top && x.index === 1)[0]; assert.ok(a);
  s = tudo(resolveSo(act(s, a)));
  assert.equal(s.zones[0].hand.length, h + 1, 'comprou'); assert.equal(s.zones[0].library[0], top, 'ela no topo');
});

test('LT27 · Cultivate: um básico entra virado e outro vai para a mão', () => {
  let s = mesaX(['Cultivate']), cu;
  [s, cu] = poe(s, 0, 'Cultivate', 'hand');
  const h = s.zones[0].hand.length, campo = s.zones[0].battlefield.length;
  s = act(comMana(s, 'GGG'), legais(comMana(s, 'GGG'), 0, x => x.t === 'cast' && x.oid === cu)[0]);
  s = tudo(resolveSo(s), x => x.pending.kind === 'pick' ? (x.pending.picked.length >= 2 ? { t: 'pick_done', p: 0 } : { t: 'pick', p: 0, oid: x.pending.from.find(o => !x.pending.picked.includes(o)) }) : legais(x, x.pending.p)[0]);
  assert.equal(s.zones[0].battlefield.length, campo + 1); assert.equal(s.objects[s.zones[0].battlefield[s.zones[0].battlefield.length - 1]].tapped, true, 'virado');
  assert.equal(s.zones[0].hand.length, h - 1 + 1, 'um básico na mão');
});

test('LT27 · Wooded Bastion: {G/W} e {T} dão {G}{G}, {G}{W} ou {W}{W}', () => {
  let s = mesaX(['Wooded Bastion']), wb;
  [s, wb] = poe(s, 0, 'Wooded Bastion');
  const as = legais(comMana(s, 'G'), 0, x => x.t === 'activate' && x.oid === wb); assert.equal(as.length, 3);
  const t = act(comMana(s, 'G'), as[1]); assert.equal(t.players[0].pool.G, 1); assert.equal(t.players[0].pool.W, 1);
});

test('LT27 · Macabre Waltz devolve até duas criaturas do cemitério (pode ser uma ou nenhuma); Storm of Steel causa 2 a um ou dois alvos', () => {
  let s = mesaX(['Macabre Waltz', 'Urso', 'Storm of Steel'], ['Urso']), mw, u1, u2, ss, ub;
  [s, mw] = poe(s, 0, 'Macabre Waltz', 'hand'); [s, u1] = poe(s, 0, 'Urso', 'graveyard'); [s, u2] = poe(s, 0, 'Urso', 'graveyard');
  const m = comMana(s, 'BB'), ofertas = legais(m, 0, x => x.t === 'cast' && x.oid === mw);
  assert.ok(ofertas.some(x => (x.targets || []).filter(Boolean).length === 2) && ofertas.some(x => (x.targets || []).filter(Boolean).length === 1));
  const t = tudo(resolveSo(act(m, ofertas.find(x => (x.targets || []).filter(Boolean).length === 2))));
  assert.equal(t.objects[u1].zone, 'hand'); assert.equal(t.objects[u2].zone, 'hand');
  [s, ss] = poe(s, 0, 'Storm of Steel', 'hand'); [s, ub] = poe(s, 1, 'Urso');
  const r = comMana(s, 'RRRR'), os = legais(r, 0, x => x.t === 'cast' && x.oid === ss);
  assert.ok(os.some(x => x.targets.filter(Boolean).length === 1), 'um alvo só'); assert.ok(!os.some(x => x.targets.filter(Boolean).length === 2 && x.targets[0].player === x.targets[1].player && x.targets[0].player != null), 'o mesmo jogador duas vezes, não (601.2c)');
  const z = tudo(resolveSo(act(r, os.find(x => x.targets.filter(Boolean).length === 2 && x.targets.some(t => t.oid === ub) && x.targets.some(t => t.player === 1)))));
  assert.equal(z.objects[ub].zone, 'graveyard'); assert.equal(z.players[1].life, s.players[1].life - 2);
});

test('achado da revisão do lote XVIII · Cultivate: achando um básico só, ele entra virado — não dá para mandar o único à mão (609.3; ruling de 15/08/2010)', () => {
  let s = mesaX(['Cultivate']), cu;
  [s, cu] = poe(s, 0, 'Cultivate', 'hand');
  const campo = s.zones[0].battlefield.length, h = s.zones[0].hand.length;
  s = resolveSo(act(comMana(s, 'GGG'), legais(comMana(s, 'GGG'), 0, x => x.t === 'cast' && x.oid === cu)[0]));
  assert.equal(s.pending.kind, 'pick'); assert.equal(s.pending.max, 2, 'uma busca só, de até dois');
  const um = s.pending.from[0]; s = act(s, { t: 'pick', p: 0, oid: um }); if (s.pending && s.pending.kind === 'pick') s = act(s, { t: 'pick_done', p: 0 });
  s = tudo(s);
  assert.equal(s.objects[um].zone, 'battlefield'); assert.equal(s.objects[um].tapped, true, 'o único achado entra virado');
  assert.equal(s.zones[0].hand.length, h - 1, 'nada na mão');
});

test("achado da revisão do lote XVIII · 400.7: a Sensei's Divining Top que saiu e voltou antes do {T} resolver é outro objeto e não vai para o topo", () => {
  let s = mesaX(["Sensei's Divining Top"]), top;
  [s, top] = poe(s, 0, "Sensei's Divining Top");
  s = act(s, legais(s, 0, x => x.t === 'activate' && x.oid === top && x.index === 1)[0]);
  s = J(s); s.objects[top].zc = (s.objects[top].zc || 0) + 2; s.objects[top].tapped = false; // saiu e voltou (objeto novo)
  s = tudo(resolveSo(s));
  assert.equal(s.objects[top].zone, 'battlefield', 'continua no campo');
});

test('M-345 · as 24 do lote XVIII revisadas jogam (decisão A)', () => {
  for (const n of ['Cultivate', 'Vampiric Tutor', "Sensei's Divining Top", 'Prismari Charm', 'Blood Fountain', 'Imperial Seal', "Kodama's Reach", 'Mystic Gate', 'Flooded Grove', 'Rugged Prairie', 'Cascade Bluffs', 'Twilight Mire', 'Vitu-Ghazi, the City-Tree', 'Tattered Mummy', 'Oakenform', 'Inspiring Overseer', 'Macabre Waltz', 'Dutiful Return', 'Storm of Steel', 'Wooded Bastion', 'Sunken Ruins', 'Graven Cairns', 'Fire-Lit Thicket', 'March of the Returned'])
    assert.equal(S.coverage(carta(n)).level, 'completo', n + ' joga');
});
