// R11 · cartas de Commander conferidas frase a frase contra o texto oficial (.listas/oficiais-commander.json, consultas de
// 05/10/2026). Cada teste cita a frase que o script precisa cumprir.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, comMana, tudo, alvos, CARTAS } from './cmd.mjs';
import { S } from './listas.mjs';
const vidas = s => s.players.map(p => p.life).join('/');
const noCampo = (s, p, n) => s.zones[p].battlefield.some(o => s.objects[o].name === n);

test('R11 · Anguished Unmaking e Utter End: "Exile target nonland permanent" — terreno não é alvo', () => {
  let s = mesa(['Anguished Unmaking', 'Utter End'], ['Faerie Seer']), a, u; [s, a] = poe(s, 0, 'Anguished Unmaking', 'hand'); [s, u] = poe(s, 0, 'Utter End', 'hand');
  [s] = poe(s, 1, 'Island'); [s] = poe(s, 1, 'Faerie Seer'); [s] = poe(s, 0, 'Plains'); s = comMana(s, 'WWBB');
  assert.deepEqual(alvos(s, 0, a), ['Faerie Seer']); assert.deepEqual(alvos(s, 0, u), ['Faerie Seer']);
  s = tudo(act(s, legais(s, 0, x => x.oid === a)[0])); assert.equal(noCampo(s, 1, 'Faerie Seer'), false); assert.equal(vidas(s), '17/20', '"You lose 3 life."');
});

test('R11 · Miscast: "Counter target instant or sorcery spell unless its controller pays {3}"', () => {
  const base = () => { let s = mesa(['Miscast', 'Lightning Bolt', 'Faithless Looting', 'Faerie Seer'], []), m, b, l, f; [s, m] = poe(s, 0, 'Miscast', 'hand'); [s, b] = poe(s, 0, 'Lightning Bolt', 'hand'); [s, l] = poe(s, 0, 'Faithless Looting', 'hand'); [s, f] = poe(s, 0, 'Faerie Seer', 'hand'); return { s, m, b, l, f }; };
  { let { s, m, b, l } = base(); s = comMana(s, 'RRU'); s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === l)[0]); s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === b)[0]);
    assert.deepEqual(alvos(s, 0, m), ['Faithless Looting', 'Lightning Bolt'], 'instantânea e feitiço'); }
  { let { s, m, f } = base(); s = comMana(s, 'UU'); s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === f)[0]); assert.deepEqual(alvos(s, 0, m), [], 'mágica de criatura não é alvo'); }
  { let { s, m, b } = base(); s = comMana(s, 'RUCC'); s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === b && x.targets[0].player === 1)[0]); s = act(s, legais(s, 0, x => x.oid === m)[0]);
    s = tudo(s, x => legais(x, x.pending.p, y => y.t === 'decline')[0] || legais(x, x.pending.p)[0]); assert.equal(vidas(s), '20/20', 'com só {2} sobrando o controlador não paga {3}: o Bolt é anulado'); }
  { let { s, m, b } = base(); s = comMana(s, 'RUCCC'); s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === b && x.targets[0].player === 1)[0]); s = act(s, legais(s, 0, x => x.oid === m)[0]);
    s = tudo(s, x => legais(x, x.pending.p, y => y.t === 'pay')[0] || legais(x, x.pending.p)[0]); assert.equal(vidas(s), '20/17', 'pagando {3} o Bolt resolve'); assert.equal(s.players[0].pool.C, 0, 'os três foram cobrados'); }
});

test('R11 · Flusterstorm: mira instantânea OU feitiço, cobra {1}, e tem rajada (uma cópia por mágica conjurada antes no turno)', () => {
  let s = mesa(['Flusterstorm', 'Lightning Bolt', 'Faithless Looting'], []), f, b, l; [s, f] = poe(s, 0, 'Flusterstorm', 'hand'); [s, b] = poe(s, 0, 'Lightning Bolt', 'hand'); [s, l] = poe(s, 0, 'Faithless Looting', 'hand');
  s = comMana(s, 'RRU'); s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === l)[0]); s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === b && x.targets[0].player === 1)[0]);
  assert.deepEqual(alvos(s, 0, f), ['Faithless Looting', 'Lightning Bolt']);
  const antes = s.stack.length; s = act(s, legais(s, 0, x => x.oid === f && x.targets[0].oid === b)[0]);
  for (let i = 0; i < 6 && s.pending; i++) s = act(s, legais(s, s.pending.p)[0]); // cada cópia escolhe o próprio alvo
  assert.equal(s.stack.length - antes, 3, 'a Flusterstorm e duas cópias (duas mágicas antes dela no turno)');
});

test('R11 · Zulaport Cutthroat e Cruel Celebrant: "Whenever this creature or another creature you control dies" — a própria morte também dispara', () => {
  for (const n of ['Zulaport Cutthroat', 'Cruel Celebrant']) {
    let s = mesa([n, 'Thraben Inspector', 'Lightning Bolt'], ['Faerie Seer']), c, i, o, b; [s, c] = poe(s, 0, n); [s, i] = poe(s, 0, 'Thraben Inspector'); [s, o] = poe(s, 1, 'Faerie Seer'); [s, b] = poe(s, 0, 'Lightning Bolt', 'hand'); s = comMana(s, 'R');
    const mata = alvo => vidas(tudo(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === b && x.targets[0].oid === alvo)[0])));
    assert.equal(mata(i), '21/19', n + ': outra criatura sua'); assert.equal(mata(c), '21/19', n + ': ela mesma'); assert.equal(mata(o), '20/20', n + ': criatura do oponente não dispara');
  }
});

test('R11 · Soul-Guide Lantern: exila uma carta de um cemitério ao entrar; {T}, sacrificar: exila o cemitério de cada oponente (sem alvo); {1}, {T}, sacrificar: compra', () => {
  let s = mesa(['Soul-Guide Lantern', 'Thraben Inspector'], ['Faerie Seer']), l, meu, dele; [s, l] = poe(s, 0, 'Soul-Guide Lantern', 'hand'); [s, meu] = poe(s, 0, 'Thraben Inspector', 'graveyard'); [s, dele] = poe(s, 1, 'Faerie Seer', 'graveyard'); let dele2; [s, dele2] = poe(s, 1, 'Faerie Seer', 'graveyard');
  s = comMana(s, 'CC'); s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === l)[0]);
  s = tudo(s, x => legais(x, x.pending.p, y => y.t === 'pick_target' && x.pending.options[y.index].oid === dele)[0] || legais(x, x.pending.p)[0]);
  assert.equal(s.objects[dele].zone, 'exile', 'gatilho de entrada exila a carta alvo'); assert.equal(s.objects[dele2].zone, 'graveyard');
  const acoes = legais(s, 0, x => x.t === 'activate' && x.oid === l);
  assert.deepEqual(J(acoes.map(x => [x.index, (x.targets || []).length])), [[0, 0], [1, 0]], 'duas habilidades, nenhuma com alvo');
  { const t = tudo(act(s, acoes[0])); assert.equal(t.objects[dele2].zone, 'exile'); assert.equal(t.objects[meu].zone, 'graveyard', 'só o cemitério dos oponentes'); assert.equal(t.objects[l].zone, 'graveyard'); }
  { const mao = s.zones[0].hand.length; const t = tudo(act(s, acoes[1])); assert.equal(t.zones[0].hand.length, mao + 1); assert.equal(t.players[0].pool.C, 0, 'cobrou {1}'); }
});

test('R11 · Angelic Gift: voar e "When this Aura enters, draw a card"', () => {
  let s = mesa(['Angelic Gift', 'Thraben Inspector'], []), g, i; [s, g] = poe(s, 0, 'Angelic Gift', 'hand'); [s, i] = poe(s, 0, 'Thraben Inspector'); s = comMana(s, 'WW');
  const mao = s.zones[0].hand.length; s = tudo(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === g && x.targets[0].oid === i)[0]));
  assert.equal(s.objects[g].attachedTo, i); assert.ok(E.hasKeyword(s, s.objects[i], 'flying')); assert.equal(s.zones[0].hand.length, mao, 'gastou a Aura e comprou uma');
  assert.equal(S.coverage(CARTAS['Angelic Gift']).level, 'completo', 'não é mais parcial');
});

test('R11 · Flickering Ward: proteção contra a cor escolhida ao entrar, sem derrubar a si mesma; {W}: volta para a mão do dono', () => {
  let s = mesa(['Flickering Ward', 'Thraben Inspector', 'Lightning Bolt'], []), w, i, b; [s, w] = poe(s, 0, 'Flickering Ward', 'hand'); [s, i] = poe(s, 0, 'Thraben Inspector'); [s, b] = poe(s, 0, 'Lightning Bolt', 'hand'); s = comMana(s, 'WWR');
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === w && x.targets[0].oid === i)[0]);
  s = tudo(s, x => legais(x, x.pending.p, y => y.t === 'choose_color' && y.color === 'W')[0] || legais(x, x.pending.p)[0]);
  assert.equal(s.objects[w].zone, 'battlefield', 'branca, com proteção contra branco: "This effect doesn\'t remove this Aura"'); assert.equal(s.objects[w].chosenColor, 'W');
  let outra; [s, outra] = poe(s, 0, 'Flickering Ward', 'hand'); assert.deepEqual(alvos(s, 0, outra), [], 'outra Aura branca não mira a criatura protegida');
  assert.ok(alvos(s, 0, b).includes('Thraben Inspector'), 'vermelho continua mirando');
  s = tudo(act(s, legais(s, 0, x => x.t === 'activate' && x.oid === w)[0])); assert.equal(s.objects[w].zone, 'hand'); assert.equal(s.players[0].pool.W, 0);
});

test('R11 · terrenos que o motor ainda não cumpre por inteiro ficam parciais, com o que falta escrito (nunca "completos" pelo texto)', () => {
  for (const n of ['Caves of Koilos', 'Shivan Reef', 'Tainted Field']) { const c = S.coverage(CARTAS[n]); assert.equal(c.level, 'parcial', n); assert.match(c.reason, n === 'Tainted Field' ? /Swamp/ : /1 de dano/); }
  for (const n of ['Flusterstorm', 'Flickering Ward', 'Soul-Guide Lantern', 'Miscast', 'Utter End']) assert.equal(S.coverage(CARTAS[n]).level, 'completo', n);
});
