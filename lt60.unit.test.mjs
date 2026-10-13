// M-377 · LT45 · revisão por lote XXXVI (Pauper): Balustrade Spy ("target player reveals cards from the top of their library until they reveal a land
// card, then puts those cards into their graveyard"), Gatecreeper Vine ("a basic land card or a Gate card") e Desert ("Activate only during the end
// of combat step", "target attacking creature"). Oracle do Forge, consulta de 12/10/2026 (.listas/oficiais-revisadas.json); caminho de produção
// (APROVADAS). Os testes falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';
import { valorDeMana, palavrasDoTexto } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const cores = c => [...new Set((c || '').match(/[WUBRG]/g) || [])];
const carta = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost || '', cmc: valorDeMana(c.mana_cost), keywords: palavrasDoTexto(c.oracle_text), oracle_text: c.oracle_text, colors: cores(c.mana_cost), ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: valorDeMana(mana_cost), keywords: [], oracle_text: '', colors: cores(mana_cost), ...extra });
const CARDS = { ...CARTAS, 'Balustrade Spy': carta('Balustrade Spy'), 'Gatecreeper Vine': carta('Gatecreeper Vine'), Desert: carta('Desert'),
  Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2' }), Esquilo: c0('Esquilo', 'Creature — Squirrel', '{G}', { power: '1', toughness: '1' }),
  Portao: c0('Portao', 'Land — Gate', ''), Torre: c0('Torre', 'Land', '') };
function mesa(seed = 7) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 6, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: CARDS, first: 0,
    players: [{ name: 'A', deck: baralho(['Balustrade Spy', 'Gatecreeper Vine', 'Desert', 'Swamp', 'Forest', 'Portao', 'Torre']) }, { name: 'B', deck: baralho(['Urso', 'Esquilo', 'Forest', 'Island']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);
const topo = (s, p, nomes) => { const lib = s.zones[p].library; const os = nomes.map(n => lib.find(o => s.objects[o].name === n && !nomes.__usados?.includes(o))); return os; };

test('LT45 · Balustrade Spy: o oponente revela até um terreno; as reveladas (o terreno também) vão para o cemitério dele, o resto fica', () => {
  let s = mesa(), sp; [s, sp] = poe(s, 0, 'Balustrade Spy', 'hand'); [s] = poe(s, 0, 'Swamp'); [s] = poe(s, 0, 'Swamp'); [s] = poe(s, 0, 'Swamp'); [s] = poe(s, 0, 'Swamp');
  const lib = s.zones[1].library, u = lib.find(o => s.objects[o].name === 'Urso'), e = lib.find(o => s.objects[o].name === 'Esquilo'), f = lib.find(o => s.objects[o].name === 'Forest'), u2 = lib.find(o => s.objects[o].name === 'Urso' && o !== u);
  s.zones[1].library = [u, e, f, u2, ...lib.filter(o => ![u, e, f, u2].includes(o))];
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === sp)[0]); s = resolve(s);
  if (s.pending && s.pending.kind === 'pick_target') s = act(s, { t: 'pick_target', p: 0, index: s.pending.options.findIndex(o => o.player === 1) });
  s = resolve(s);
  assert.deepEqual([u, e, f].map(o => s.objects[o].zone), ['graveyard', 'graveyard', 'graveyard']);
  assert.equal(s.zones[1].library[0], u2, 'o que veio depois do terreno fica no topo');
});

test('LT45 · Gatecreeper Vine: "you may" — oferece terreno básico e Portão, não terreno não básico; o escolhido vai para a mão', () => {
  let s = mesa(), gv; [s, gv] = poe(s, 0, 'Gatecreeper Vine', 'hand'); [s] = poe(s, 0, 'Forest'); [s] = poe(s, 0, 'Forest');
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === gv)[0]));
  for (let i = 0; i < 4 && s.pending && s.pending.kind !== 'pick'; i++) s = act(s, legais(s, 0).find(a => a.t === 'pay' || a.t === 'accept' || a.t === 'yes') || legais(s, 0)[0]);
  assert.equal(s.pending && s.pending.kind, 'pick');
  const nomes = new Set(legais(s, 0, a => a.t === 'pick').map(a => s.objects[a.oid].name));
  assert.ok(nomes.has('Swamp') && nomes.has('Forest') && nomes.has('Portao'), [...nomes].join(','));
  assert.ok(!nomes.has('Torre') && !nomes.has('Balustrade Spy') && !nomes.has('Desert'), [...nomes].join(','));
  const pt = legais(s, 0, a => a.t === 'pick' && s.objects[a.oid].name === 'Portao')[0]; s = act(s, pt); if (s.pending) s = act(s, { t: 'pick_done', p: 0 });
  assert.equal(s.objects[pt.oid].zone, 'hand');
});

test('LT45 · Desert: a ativação de dano só no passo final de combate, só na criatura atacante', () => {
  let s = passaAte(mesa(), x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending), d, es, u;
  [s, d] = poe(s, 0, 'Desert'); [s, es] = poe(s, 1, 'Esquilo'); [s, u] = poe(s, 1, 'Urso'); s.objects[es].sick = false; s.objects[u].sick = false;
  const dano = x => legais(x, 0, a => a.t === 'activate' && a.oid === d && (a.targets || []).length);
  assert.equal(dano(s).length, 0, 'no principal, não');
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers'); s = act(s, { t: 'attack', p: 1, attackers: [es] });
  s = passaAte(s, x => x.turn.step === 'combat_end' && x.turn.priority === 0);
  const ofs = dano(s); assert.ok(ofs.length, 'no passo final de combate, sim');
  assert.ok(ofs.every(a => a.targets[0].oid === es), 'só a atacante (o Urso não atacou)');
  s = resolve(act(s, ofs[0])); assert.equal(s.objects[es].zone, 'graveyard');
});
