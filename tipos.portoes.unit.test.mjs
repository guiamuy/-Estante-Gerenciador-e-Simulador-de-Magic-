// T-90 · CR5 · Portões (Gate, 205.3i): "As this enters, choose a color other than X" (105.4 com 614.12) e "{T}: Add {X} or one mana of the
// chosen color" (106.1, 605.1a); "where X is the number of Gates you control" (Basilisk Gate).
// Texto da regra: .regras/cr-2026-09-25.txt. Cartas com o texto oficial já registrado em .listas/oficiais-cartas.json (Citadel Gate,
// Black Dragon Gate, Basilisk Gate), .listas/oficiais-listas.json (Sea Gate, Manor Gate) e .listas/oficiais-tipos.json (Cliffgate) — Oracle do
// Forge, conferido de novo em 14/10/2026.
// "Urso" é carta de teste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, J, act, poe, legais, passaAte } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const PORTOES = { 'Citadel Gate': 'W', 'Black Dragon Gate': 'B', 'Sea Gate': 'U', 'Manor Gate': 'G', 'Cliffgate': 'R' };
const C = {};
for (const c of [...L('oficiais-cartas.json'), ...L('oficiais-listas.json'), ...L('oficiais-tipos.json')].filter(x => PORTOES[x.name] || x.name === 'Basilisk Gate'))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: '', cmc: 0, keywords: [], oracle_text: c.oracle_text, colors: [] };
C.Plains = { name: 'Plains', type_line: 'Basic Land — Plains', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {W}.)', colors: [] };
C.Urso = { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], power: '2', toughness: '2' };
const CG = 'Citadel Gate', BG = 'Basilisk Gate';
function mesa(seed = 1) {
  const deck = [...Object.keys(C).filter(n => n !== 'Plains').map(name => ({ name, qty: 3, zone: 'main' })), { name: 'Plains', qty: 16, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const joga = (s, nome) => { let o; [s, o] = poe(s, 0, nome, 'hand'); const a = legais(s, 0, x => x.t === 'play_land' && x.oid === o)[0]; assert.ok(a, 'jogar ' + nome); return [act(s, a), o]; };
const cores = s => legais(s, s.pending.p, a => a.t === 'choose_color').map(a => a.color);

test('CR 105.4 / 614.12 · Citadel Gate (texto oficial): entra virada e pede uma cor que não seja branco', () => {
  let s = mesa(), g; [s, g] = joga(s, CG);
  eq([s.objects[g].zone, s.objects[g].tapped, s.pending && s.pending.kind], ['battlefield', true, 'choose_color']);
  eq(cores(s), ['U', 'B', 'R', 'G'], 'branco não é oferecido');
  assert.throws(() => E.apply(s, { t: 'choose_color', p: 0, color: 'W' }), /branco/, 'nem aceito à mão');
  s = act(s, { t: 'choose_color', p: 0, color: 'R' });
  eq([s.pending, s.objects[g].chosenColor], [null, 'R']);
});

test('CR 106.1 / 605.1a · "{T}: Add {W} or one mana of the chosen color": as duas opções, e só elas', () => {
  let s = mesa(), g; [s, g] = joga(s, CG); s = act(s, { t: 'choose_color', p: 0, color: 'R' });
  s = J(s); s.objects[g].tapped = false;
  eq(E.productions(s, s.objects[g]), [['W'], ['R']]);
  for (const [nome, cor] of Object.entries(PORTOES)) {
    let t = mesa(), o; [t, o] = joga(t, nome);
    eq(cores(t), ['W', 'U', 'B', 'R', 'G'].filter(c => c !== cor), nome + ': a cor própria fica de fora');
    const outra = cores(t)[0]; t = act(t, { t: 'choose_color', p: 0, color: outra });
    eq(E.productions(t, t.objects[o]), [[cor], [outra]], nome);
  }
});

test('CR 400.7 · a cor escolhida é de cada objeto: antes de escolher, só a cor própria; o segundo Citadel Gate pergunta de novo', () => {
  let s = mesa(), g; [s, g] = joga(s, CG);
  eq(E.productions(s, s.objects[g]), [['W']], 'sem a cor escolhida, a outra opção não existe');
  s = act(s, { t: 'choose_color', p: 0, color: 'U' });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.number > 2 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  let h; [s, h] = joga(s, CG);
  eq(s.pending && s.pending.kind, 'choose_color');
  s = act(s, { t: 'choose_color', p: 0, color: 'B' });
  eq([s.objects[g].chosenColor, s.objects[h].chosenColor], ['U', 'B']);
});

test('CR 105.4 · a cor vedada da decisão pendente (o goldfish e o banner da mesa leem dela); a escolha de mana livre não tem cor vedada', () => {
  let s = mesa(), g; [s, g] = joga(s, CG);
  const vedada = E.corVedadaT(s);
  eq(vedada, 'W');
  eq(E.corVedadaT(act(s, { t: 'choose_color', p: 0, color: 'G' })), null, 'sem decisão pendente, nada vedado');
  const m = J(s); m.pending = { ...m.pending, manaRestam: 1, manaTotal: 1 };
  eq(E.corVedadaT(m), null, '"one mana of any color" (manaRestam) não é a escolha da carta');
});

test('CR 205.3i · Basilisk Gate (texto oficial): {2},{T}: +X/+X, X = Portões que você controla; só como feitiço', () => {
  let s = mesa(), b, u; [s, b] = poe(s, 0, BG, 'battlefield'); [s, u] = poe(s, 0, 'Urso', 'battlefield');
  let g; [s, g] = poe(s, 0, CG, 'battlefield'); [s] = poe(s, 1, 'Sea Gate', 'battlefield');
  s = J(s); for (const c of 'WUBRGC') s.players[0].pool[c] = 3;
  const a = legais(s, 0, x => x.t === 'activate' && x.oid === b && x.targets && x.targets[0] && x.targets[0].oid === u)[0];
  assert.ok(a, 'ativa no Urso');
  s = passaAte(act(s, a), x => !x.stack.length || !!x.pending);
  const st = E.stats(s, s.objects[u]); eq([st.power, st.toughness], [4, 4], '2 Portões seus (o do oponente não conta)');
  eq(E.productions(s, s.objects[b]), [['C']], '{T}: Add {C}.');
  let t = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1'); t = J(t); t.objects[b].tapped = false; for (const c of 'WUBRGC') t.players[0].pool[c] = 3; t.turn.priority = 0;
  eq(legais(t, 0, x => x.t === 'activate' && x.oid === b && x.targets).length, 0, 'no turno do oponente, não');
});

test('CR 105.4 · validador: self.corExceto é uma cor e pede choose: "color"; a produção "escolhida" também', () => {
  const v = sc => J(SC.validateScript({ name: 'X', ...sc, example: { action: 'etb', target: 'none', expect: { attached: false } } }));
  eq(v({ choose: 'color', self: { corExceto: 'W' }, produces: [['W'], { escolhida: true }] }), []);
  assert.ok(v({ self: { corExceto: 'W' }, produces: [['W']] }).some(e => /corExceto/.test(e)), 'sem choose');
  assert.ok(v({ choose: 'color', self: { corExceto: 'C' }, produces: [['W']] }).some(e => /corExceto/.test(e)), 'incolor não é cor');
  assert.ok(v({ produces: [{ escolhida: true }] }).some(e => /escolhida/.test(e)), 'escolhida sem choose');
  assert.ok(v({ choose: 'color', produces: [{ escolhida: 1 }] }).some(e => /escolhida|símbolo/.test(e)));
});
