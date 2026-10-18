// M-518 · LT180 · revisão por lote CLVI: quatro cartas que travavam listas do catálogo com uma ou duas pendências (textos da Scryfall de
// 18/10/2026). Primitivas: olhar o topo do grimório do jogador alvo e decidir (Eye Spy), "its owner gains N life" (Path of Peace, o dono do
// alvo), "+N/+N as long as it's attacking" (Grasping Scoundrel) e "destroy all lands" (Armageddon). Falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';
import { loadModules } from './_load.mjs';
const { leitor: L } = loadModules();
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Eye Spy', 'Path of Peace', 'Grasping Scoundrel', 'Armageddon'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G'),
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] } });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 200, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Plains', 'Island', 'Swamp', 'Urso']) }, { name: 'B', deck: b(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };
const limpa = s => passaAte(s, x => !x.stack.length && !x.pending && !(x.queued || []).length);
const conj = (s, oid, f = () => true) => { const a = legais(s, 0, x => x.t === 'cast' && x.oid === oid && f(x))[0]; assert.ok(a, 'conjurar ' + s.objects[oid].name); return act(s, a); };

test('M-518 · Eye Spy: quem conjurou olha o topo do grimório do jogador alvo e pode mandá-lo ao cemitério dele', () => {
  let s = mesa(), es; [s, es] = poe(s, 0, 'Eye Spy', 'hand'); [s] = poe(s, 0, 'Island'); const topo = s.zones[1].library[0];
  s = passaAte(conj(s, es, x => x.targets[0].player === 1), x => !!x.pending && x.pending.kind === 'pick');
  assert.equal(s.pending.p, 0, 'quem decide é quem conjurou'); assert.deepEqual([...s.pending.from], [topo]);
  s = act(s, legais(s, 0, a => a.t === 'pick' && a.oid === topo)[0]); if (s.pending && s.pending.kind === 'pick') s = act(s, legais(s, 0, a => a.t === 'pick_done')[0]);
  s = limpa(s); assert.equal(s.objects[topo].zone, 'graveyard'); assert.equal(s.objects[topo].owner, 1);
  let t = mesa(), es2; [t, es2] = poe(t, 0, 'Eye Spy', 'hand'); [t] = poe(t, 0, 'Island'); const topo2 = t.zones[1].library[0];
  t = passaAte(conj(t, es2, x => x.targets[0].player === 1), x => !!x.pending && x.pending.kind === 'pick'); t = limpa(act(t, legais(t, 0, a => a.t === 'pick_done')[0]));
  assert.equal(t.zones[1].library[0], topo2, 'recusou: continua no topo');
});

test('M-518 · Path of Peace destrói a criatura e o DONO dela ganha 4 de vida', () => {
  let s = mesa(), pp, u; [s, pp] = poe(s, 0, 'Path of Peace', 'hand'); s = terras(s, 'Plains', 4); [s, u] = poe(s, 1, 'Urso');
  const v0 = s.players[0].life, v1 = s.players[1].life;
  s = limpa(conj(s, pp, x => x.targets[0].oid === u)); assert.equal(s.objects[u].zone, 'graveyard'); assert.equal(s.players[1].life, v1 + 4); assert.equal(s.players[0].life, v0);
  let t = mesa(), pp2, u2; [t, pp2] = poe(t, 0, 'Path of Peace', 'hand'); t = terras(t, 'Plains', 4); [t, u2] = poe(t, 1, 'Urso'); t = J(t); t.objects[u2].controller = 0; // a Urso do oponente sob o seu controle
  const w0 = t.players[0].life, w1 = t.players[1].life; t = limpa(conj(t, pp2, x => x.targets[0].oid === u2)); assert.equal(t.players[1].life, w1 + 4, 'quem ganha é o dono'); assert.equal(t.players[0].life, w0);
});

test('M-518 · Grasping Scoundrel tem +1/+0 só enquanto ataca', () => {
  let s = mesa(), gs; [s, gs] = poe(s, 0, 'Grasping Scoundrel'); assert.equal(E.stats(s, s.objects[gs]).power, 1);
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0); s = act(s, { t: 'attack', p: 0, attackers: [gs] });
  assert.equal(E.stats(s, s.objects[gs]).power, 2, 'atacando: 2/1');
  const vB = s.players[1].life; s = passaAte(s, x => x.turn.step === 'main2'); assert.equal(s.players[1].life, vB - 2);
  s = passaAte(s, x => x.turn.active === 1); assert.equal(E.stats(s, s.objects[gs]).power, 1, 'fora do combate: 1/1');
});

test('M-518 · Armageddon destrói todos os terrenos, dos dois lados; o leitor lê "destroy all creatures" do mesmo jeito', () => {
  let s = mesa(), ar; [s, ar] = poe(s, 0, 'Armageddon', 'hand'); s = terras(s, 'Plains', 4); for (let i = 0; i < 2; i++) [s] = poe(s, 1, 'Forest');
  s = limpa(conj(s, ar)); assert.equal(s.zones[0].battlefield.filter(o => /Land/.test(C[s.objects[o].name].type_line)).length, 0); assert.equal(s.zones[1].battlefield.filter(o => s.objects[o].name === 'Forest').length, 0);
  const r = L.ler({ name: 'Teste', type_line: 'Sorcery', mana_cost: '{2}{W}{W}', oracle_text: 'Destroy all creatures.' });
  assert.equal(r.completa, true); assert.deepEqual(JSON.parse(JSON.stringify(r.script.effects)), [{ do: 'destroy_all', types: ['creature'] }]);
});
