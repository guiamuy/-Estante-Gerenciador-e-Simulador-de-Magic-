// M-330 · 614.12 · terras de choque: "As ~ enters, you may pay 2 life. If you don't, it enters tapped." — a terra entra virada e o controlador
// decide em seguida se paga 2 de vida para desvirá-la (sem a vida, 119.4, não há pergunta); vale também quando ela entra por efeito (fetchland).
// Steam Vents: texto oficial do Oracle do Forge, 12/10/2026 (.listas/oficiais-revisadas.json). Cada teste falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';

const EX = { action: 'etb', target: 'none', expect: { attached: false } };
const cards = { 'Steam Vents': { name: 'Steam Vents', type_line: 'Land — Island Mountain', mana_cost: '', cmc: 0, keywords: [], colors: [], oracle_text: "({T}: Add {U} or {R}.)\nAs Steam Vents enters, you may pay 2 life. If you don't, it enters tapped." },
  Busca: { name: 'Busca', type_line: 'Land', mana_cost: '', cmc: 0, keywords: [], colors: [], oracle_text: '' } };
const scripts = { 'Steam Vents': { name: 'Steam Vents', entersTappedUnless: { pagaVida: 2 }, example: EX },
  Busca: { name: 'Busca', abilities: [{ kind: 'activated', cost: { tap: true, sacrifice: true }, effects: [{ do: 'search', amount: 1, filter: { subtypes: ['Island'] }, to: 'battlefield' }] }], example: EX } };
function mesaX(a) {
  const baralho = ns => ns.map(name => ({ name, qty: 20, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 3, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho(a) }, { name: 'B', deck: baralho(['Island']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const joga = s => { const sv = s.zones[0].hand.find(o => s.objects[o].name === 'Steam Vents'); assert.ok(sv, 'Steam Vents na mão'); return [act(s, { t: 'play_land', p: 0, oid: sv }), sv]; };

test('M-330 · jogar a terra de choque pergunta: pagando 2 de vida entra desvirada; sem pagar, virada', () => {
  let s = mesaX(['Steam Vents']), sv;
  [s, sv] = joga(s);
  assert.equal(s.pending && s.pending.kind, 'may_pay'); assert.equal(s.pending.pagaVidaEntrada, 2); assert.equal(s.objects[sv].tapped, true, 'virada até decidir');
  const pago = act(s, { t: 'pay', p: 0 });
  assert.deepEqual([pago.players[0].life, pago.objects[sv].tapped, !!pago.pending], [18, false, false]);
  const nao = act(s, { t: 'decline', p: 0 });
  assert.deepEqual([nao.players[0].life, nao.objects[sv].tapped], [20, true]);
});

test('M-330 · com 1 de vida não há o que pagar (119.4): entra virada, sem pergunta', () => {
  let s = mesaX(['Steam Vents']), sv; s = J(s); s.players[0].life = 1;
  [s, sv] = joga(s);
  assert.equal(s.pending, null); assert.equal(s.objects[sv].tapped, true);
});

test('M-330 · posta no campo por efeito (busca) também pergunta', () => {
  let s = mesaX(['Busca', 'Steam Vents']), b;
  [s, b] = poe(s, 0, 'Busca');
  s = act(s, legais(s, 0, x => x.t === 'activate' && x.oid === b)[0]);
  s = act(act(s, { t: 'pass', p: 0 }), { t: 'pass', p: 1 });
  for (let i = 0; i < 4 && s.pending && s.pending.kind !== 'may_pay'; i++) { const op = legais(s, 0, x => x.t === 'pick' && x.oid && s.objects[x.oid].name === 'Steam Vents')[0] || legais(s, 0, x => x.t === 'pick_done')[0]; s = act(s, op); }
  assert.equal(s.pending && s.pending.pagaVidaEntrada, 2, 'pergunta depois de entrar pela busca');
  const v = Object.values(s.objects).find(o => o.name === 'Steam Vents' && o.zone === 'battlefield');
  s = act(s, { t: 'pay', p: 0 });
  assert.equal(s.objects[v.oid].tapped, false);
});

test('M-330 · 614.12 · buscada por efeito "onto the battlefield tapped", a terra de choque fica virada e não pergunta (achado da revisão do lote 4)', () => {
  const sc2 = { ...scripts, Busca: { ...scripts.Busca, abilities: [{ ...scripts.Busca.abilities[0], effects: [{ do: 'search', amount: 1, filter: { subtypes: ['Island'] }, to: 'battlefield-tapped' }] }] } };
  const baralho = ns => ns.map(name => ({ name, qty: 20, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 3, mode: 'full', cards: { ...CARTAS, ...cards }, scripts: sc2, first: 0, players: [{ name: 'A', deck: baralho(['Busca', 'Steam Vents']) }, { name: 'B', deck: baralho(['Island']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  let b; [s, b] = poe(s, 0, 'Busca');
  s = act(s, legais(s, 0, x => x.t === 'activate' && x.oid === b)[0]);
  s = act(act(s, { t: 'pass', p: 0 }), { t: 'pass', p: 1 });
  for (let i = 0; i < 4 && s.pending && s.pending.kind !== 'may_pay'; i++) { const op = legais(s, 0, x => x.t === 'pick' && x.oid && s.objects[x.oid].name === 'Steam Vents')[0] || legais(s, 0, x => x.t === 'pick_done')[0]; s = act(s, op); }
  const v = Object.values(s.objects).find(o => o.name === 'Steam Vents' && o.zone === 'battlefield');
  assert.ok(v, 'entrou'); assert.equal(v.tapped, true); assert.ok(!(s.pending && s.pending.kind === 'may_pay'), 'sem pergunta');
  assert.equal(s.players[0].life, 20);
});
