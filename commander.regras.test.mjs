// R11 · cartas de Commander conferidas frase a frase contra o texto oficial (.listas/oficiais-commander.json, consultas de
// 05/10/2026). Cada teste cita a frase que o script precisa cumprir.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, comMana, tudo, alvos, passaAte, CARTAS } from './cmd.mjs';
import { S } from './listas.mjs';
import { readFileSync } from 'node:fs';
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

test('R11 · as cartas corrigidas na auditoria contam como completas', () => {
  // R11.2 · expectativa ajustada: Caves of Koilos, Shivan Reef e Tainted Field eram cobradas aqui como parciais declaradas (leva 189);
  // a regra de mana que faltava entrou, e os testes delas estão no bloco R11.2 abaixo.
  for (const n of ['Flusterstorm', 'Flickering Ward', 'Soul-Guide Lantern', 'Miscast', 'Utter End']) assert.equal(S.coverage(CARTAS[n]).level, 'completo', n);
});

/* ---------------- R11.2 · terrenos e pedras de mana ---------------- */
const jogaTerreno = (s, n) => { let o; [s, o] = poe(s, 0, n, 'hand'); s = act(s, { t: 'play_land', p: 0, oid: o }); return [s, o]; };
const prod = (s, o) => J(E.productions(s, s.objects[o])).map(x => x.join('')).sort();
const gera = (s, o, cor) => act(s, { t: 'tap_mana', p: 0, oid: o, option: J(E.productions(s, s.objects[o])).findIndex(x => x.join('') === cor) });
const completa = n => assert.equal(S.coverage(CARTAS[n]).level, 'completo', n + ' completa');

test('R11.2 · Caves of Koilos, Shivan Reef e os Talismãs: gerar cor causa 1 de dano a você; {C} não', () => {
  for (const [n, cor] of [['Caves of Koilos', 'W'], ['Caves of Koilos', 'B'], ['Shivan Reef', 'U'], ['Shivan Reef', 'R'], ['Talisman of Hierarchy', 'B'], ['Talisman of Hierarchy', 'W'], ['Talisman of Creativity', 'R'], ['Talisman of Creativity', 'U']]) {
    let s = mesa([n], []), o; [s, o] = poe(s, 0, n);
    const t = gera(s, o, cor); assert.equal(t.players[0].life, 19, `${n}: {${cor}} custa 1 de vida em dano`); assert.equal(t.players[0].pool[cor], 1);
    const c = gera(s, o, 'C'); assert.equal(c.players[0].life, 20, n + ': {C} não fere'); completa(n);
  }
});

test('R11.2 · pagamento automático não toma dano à toa: com a Caves, o genérico sai em {C}; só a cor exigida fere', () => {
  { let s = mesa(['Caves of Koilos', 'Mind Stone'], []), c, m; [s, c] = poe(s, 0, 'Caves of Koilos'); [s] = poe(s, 0, 'Plains'); [s, m] = poe(s, 0, 'Mind Stone', 'hand');
    s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === m)[0]); assert.equal(s.players[0].life, 20, 'Mind Stone {2}: Plains + {C} da Caves'); }
  { let s = mesa(['Caves of Koilos', 'Thraben Inspector'], []), c, i; [s, c] = poe(s, 0, 'Caves of Koilos'); [s, i] = poe(s, 0, 'Thraben Inspector', 'hand');
    s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === i)[0]); assert.equal(s.players[0].life, 19, 'Thraben Inspector {W}: só a Caves gera branco'); }
});

test('R11.2 · Tainted Field: cor só com um Swamp; Spire of Industry: cor só com um artefato, pagando 1 de vida', () => {
  { let s = mesa(['Tainted Field'], []), o; [s, o] = poe(s, 0, 'Tainted Field'); assert.deepEqual(prod(s, o), ['C'], 'sem Swamp'); [s] = poe(s, 0, 'Swamp'); assert.deepEqual(prod(s, o), ['B', 'C', 'W']); assert.equal(gera(s, o, 'W').players[0].life, 20); completa('Tainted Field'); }
  { let s = mesa(['Spire of Industry', 'Mind Stone'], []), o; [s, o] = poe(s, 0, 'Spire of Industry'); assert.deepEqual(prod(s, o), ['C'], 'sem artefato'); [s] = poe(s, 0, 'Mind Stone'); assert.deepEqual(prod(s, o), ['B', 'C', 'G', 'R', 'U', 'W']);
    assert.equal(gera(s, o, 'G').players[0].life, 19); assert.equal(gera(s, o, 'C').players[0].life, 20); completa('Spire of Industry'); }
});

test('R11.2 · Isolated Chapel e Sulfur Falls: entram viradas a menos que você controle um dos dois tipos de terreno', () => {
  for (const [n, tipo, outro] of [['Isolated Chapel', 'Swamp', 'Mountain'], ['Isolated Chapel', 'Plains', 'Island'], ['Sulfur Falls', 'Island', 'Plains'], ['Sulfur Falls', 'Mountain', 'Swamp']]) {
    { let s = mesa([n, tipo, outro], []), o; [s] = poe(s, 0, outro); [s, o] = jogaTerreno(s, n); assert.equal(s.objects[o].tapped, true, `${n} com ${outro}: virada`); }
    { let s = mesa([n, tipo, outro], []), o; [s] = poe(s, 0, tipo); [s, o] = jogaTerreno(s, n); assert.equal(s.objects[o].tapped, false, `${n} com ${tipo}: desvirada`); }
    completa(n);
  }
  { let s = mesa(['Isolated Chapel', 'Swamp'], ['Swamp']), o; [s] = poe(s, 1, 'Swamp'); [s, o] = jogaTerreno(s, 'Isolated Chapel'); assert.equal(s.objects[o].tapped, true, 'o Swamp do oponente não conta'); }
});

test('R11.2 · Orzhov Basilica, Temple of Silence, Secluded Steppe, The Dross Pits e The Fair Basilica', () => {
  { let s = mesa(['Orzhov Basilica'], []), o, p; [s, p] = poe(s, 0, 'Plains'); [s, o] = jogaTerreno(s, 'Orzhov Basilica'); assert.equal(s.objects[o].tapped, true);
    s = tudo(s, x => legais(x, x.pending.p, y => y.oid === p)[0] || legais(x, x.pending.p)[0]); assert.equal(s.objects[p].zone, 'hand', 'devolve um terreno seu'); assert.deepEqual(prod(s, o), ['WB']); completa('Orzhov Basilica'); }
  { let s = mesa(['Temple of Silence'], []), o; [s, o] = jogaTerreno(s, 'Temple of Silence'); assert.equal(s.objects[o].tapped, true);
    for (let i = 0; i < 5 && !s.pending; i++) s = act(s, { t: 'pass', p: s.turn.priority }); assert.equal(s.pending && s.pending.label, 'scry', 'vidência 1 ao entrar'); assert.deepEqual(prod(s, o), ['B', 'W']); completa('Temple of Silence'); }
  { let s = mesa(['Secluded Steppe'], []), o, h; [s, h] = poe(s, 0, 'Secluded Steppe', 'hand'); s = comMana(s, 'W'); const mao = s.zones[0].hand.length;
    const t = tudo(act(s, legais(s, 0, x => x.t === 'cycle' && x.oid === h)[0])); assert.equal(t.zones[0].hand.length, mao, 'reciclar {W}: troca por outra'); assert.equal(t.objects[h].zone, 'graveyard');
    [s, o] = jogaTerreno(s, 'Secluded Steppe'); assert.equal(s.objects[o].tapped, true); assert.deepEqual(prod(s, o), ['W']); completa('Secluded Steppe'); }
  for (const [n, cor] of [['The Dross Pits', 'B'], ['The Fair Basilica', 'W']]) { let s = mesa([n], []), o, e; [s, e] = jogaTerreno(s, n); assert.equal(s.objects[e].tapped, true, n + ' entra virada');
    [s, o] = poe(s, 0, n); assert.deepEqual(prod(s, o), [cor]); assert.equal(legais(s, 0, x => x.t === 'activate' && x.oid === o).length, 0, 'sem mana não ativa');
    s = comMana(s, 'C' + cor); const mao = s.zones[0].hand.length; s = tudo(act(s, legais(s, 0, x => x.t === 'activate' && x.oid === o)[0]));
    assert.equal(s.zones[0].hand.length, mao + 1); assert.equal(s.objects[o].zone, 'graveyard'); completa(n); }
});

test('R11.2 · Kher Keep cria a ficha Kobolds of Kher Keep 0/1 vermelha; Vault of the Archangel dá toque mortífero e vínculo com a vida às suas criaturas', () => {
  { let s = mesa(['Kher Keep'], []), o; [s, o] = poe(s, 0, 'Kher Keep'); s = comMana(s, 'CR'); s = tudo(act(s, legais(s, 0, x => x.t === 'activate' && x.oid === o)[0]));
    const k = s.zones[0].battlefield.map(x => s.objects[x]).find(x => x.token); assert.equal(k.name, 'Kobolds of Kher Keep'); const st = E.stats(s, k); assert.deepEqual([st.power, st.toughness], [0, 1]);
    assert.deepEqual(J(s.facts[k.name].colors), ['R']); assert.match(s.facts[k.name].typeText, /Kobold/); assert.equal(s.objects[o].tapped, true); completa('Kher Keep'); }
  { let s = mesa(['Vault of the Archangel', 'Thraben Inspector'], ['Faerie Seer']), o, i, d; [s, o] = poe(s, 0, 'Vault of the Archangel'); [s, i] = poe(s, 0, 'Thraben Inspector'); [s, d] = poe(s, 1, 'Faerie Seer'); s = comMana(s, 'CCWB');
    s = tudo(act(s, legais(s, 0, x => x.t === 'activate' && x.oid === o)[0]));
    for (const k of ['deathtouch', 'lifelink']) { assert.ok(E.hasKeyword(s, s.objects[i], k), k); assert.equal(E.hasKeyword(s, s.objects[d], k), false, 'só as suas'); } completa('Vault of the Archangel'); }
});

test('R11.2 · Dwarven Ruins, Svyelunite Temple e Phyrexian Tower: sacrifício por duas manas; Fetid Heath filtra {W/B} em duas', () => {
  for (const [n, cor] of [['Dwarven Ruins', 'R'], ['Svyelunite Temple', 'U']]) { let s = mesa([n], []), e, o; [s, e] = jogaTerreno(s, n); assert.equal(s.objects[e].tapped, true, n + ' entra virado');
    [s, o] = poe(s, 0, n); assert.deepEqual(prod(s, o), [cor]); s = act(s, legais(s, 0, x => x.t === 'activate' && x.oid === o)[0]);
    assert.equal(s.players[0].pool[cor], 2); assert.equal(s.objects[o].zone, 'graveyard'); assert.equal(s.stack.length, 0, 'habilidade de mana não usa a pilha'); completa(n); }
  { let s = mesa(['Phyrexian Tower', 'Thraben Inspector'], []), o, i; [s, o] = poe(s, 0, 'Phyrexian Tower'); assert.deepEqual(prod(s, o), ['C']); assert.equal(legais(s, 0, x => x.t === 'activate' && x.oid === o).length, 0, 'sem criatura para sacrificar');
    [s, i] = poe(s, 0, 'Thraben Inspector'); s = act(s, legais(s, 0, x => x.t === 'activate' && x.oid === o)[0]); assert.equal(s.players[0].pool.B, 2); assert.equal(s.objects[i].zone, 'graveyard'); assert.equal(s.objects[o].tapped, true); completa('Phyrexian Tower'); }
  { let s = mesa(['Fetid Heath'], []), o; [s, o] = poe(s, 0, 'Fetid Heath'); assert.deepEqual(prod(s, o), ['C']); assert.equal(legais(s, 0, x => x.t === 'activate' && x.oid === o).length, 0, 'sem {W/B} não filtra');
    for (const paga of ['W', 'B']) { const t = comMana(s, paga); const as = legais(t, 0, x => x.t === 'activate' && x.oid === o); assert.equal(as.length, 3, 'WW, WB ou BB');
      const saidas = J(as).map(a => { const r = act(t, a); return 'W'.repeat(r.players[0].pool.W) + 'B'.repeat(r.players[0].pool.B); }).sort(); assert.deepEqual(saidas, ['BB', 'WB', 'WW'], 'pagando ' + paga); }
    completa('Fetid Heath'); }
});

test('R11.2 · a folha avisa o preço da cor: "Gerar {W} (1 de dano em você)" e "(paga 1 de vida)" (conferido no código da tela, sem partida guiada)', () => {
  const src = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  assert.match(src, /`Gerar \$\{opt\.map\(c => `\{\$\{c\}\}`\)\.join\(''\)\}\$\{custoDaMana\(f, opt\)\}`/); assert.match(src, /de dano em você\)/); assert.match(src, /\(paga \$\{r\.life\} de vida\)/);
});

// ---------------------------------------------------------------- CR2a.4 · cartas que as estruturas da leva destravam (decisão 7)
test('CR2a.4 · Accursed Marauder: "each player sacrifices a nontoken creature of their choice" — quem está na vez escolhe primeiro, depois o outro, e as escolhidas saem juntas', () => {
  let s = mesa(['Accursed Marauder', 'Faerie Seer'], ['Faerie Seer', 'Zulaport Cutthroat']), m, fa, fb, zb; [s, m] = poe(s, 0, 'Accursed Marauder', 'hand'); [s, fa] = poe(s, 0, 'Faerie Seer');
  [s, fb] = poe(s, 1, 'Faerie Seer'); [s, zb] = poe(s, 1, 'Zulaport Cutthroat'); s = comMana(s, 'BB');
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === m)[0]); for (let i = 0; i < 6 && !s.pending; i++) s = act(s, { t: 'pass', p: s.turn.priority }); // resolve até a primeira decisão
  assert.equal(s.pending.kind, 'sacrifice'); assert.equal(s.pending.p, 0, 'o jogador da vez escolhe primeiro'); assert.deepEqual(J(s.pending.options).sort(), [m, fa].sort(), 'pode sacrificar a própria Marauder');
  s = act(s, { t: 'sacrifice', p: 0, oid: fa }); assert.equal(s.objects[fa].zone, 'battlefield', 'nada sai antes de todos escolherem'); assert.equal(s.pending.p, 1);
  s = act(s, { t: 'sacrifice', p: 1, oid: fb }); assert.deepEqual([fa, fb, zb, m].map(o => s.objects[o].zone), ['graveyard', 'graveyard', 'battlefield', 'battlefield']);
  s = tudo(s); assert.equal(vidas(s), '19/21', 'o Zulaport de B viu a criatura de B morrer: A perde 1 e B ganha 1');
});

test('CR2a.4 · Accursed Marauder: ficha não serve ("nontoken") e quem só tem uma criatura que serve não escolhe', () => {
  let s = mesa(['Accursed Marauder'], ['Faerie Seer', 'Zulaport Cutthroat']), m, fb, zb; [s, m] = poe(s, 0, 'Accursed Marauder', 'hand'); [s, fb] = poe(s, 1, 'Faerie Seer', 'battlefield', { token: true }); [s, zb] = poe(s, 1, 'Zulaport Cutthroat'); s = comMana(s, 'BB');
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === m)[0]); s = tudo(s);
  assert.equal(s.objects[m].zone, 'graveyard', 'sozinha, a Marauder é sacrificada'); assert.equal(s.objects[zb].zone, 'graveyard'); assert.equal(s.objects[fb].zone, 'battlefield', 'a ficha fica');
});

test('CR2a.4 · Ayli, Eternal Pilgrim: "You gain life equal to the sacrificed creature\'s toughness" lê a resistência que a criatura tinha no campo', () => {
  let s = mesa(['Ayli, Eternal Pilgrim', 'Faerie Seer']), a, z; [s, a] = poe(s, 0, 'Ayli, Eternal Pilgrim'); [s, z] = poe(s, 0, 'Faerie Seer'); s = comMana(s, 'C'); s = J(s); s.objects[z].counters = { p1p1: 2 };
  assert.equal(s.facts['Ayli, Eternal Pilgrim'].kw.includes('deathtouch'), true, 'Deathtouch');
  const hab = legais(s, 0, x => x.t === 'activate' && x.oid === a && x.index === 0); assert.equal(hab.length, 1, '{1}, sacrificar outra criatura: a única outra é a Faerie Seer'); assert.equal(hab[0].pay.sacrifice, z);
  s = tudo(act(s, hab[0])); assert.equal(s.objects[z].zone, 'graveyard'); assert.equal(vidas(s), '23/20', 'resistência 1 + dois marcadores +1/+1 = 3');
});

test('CR2a.4 · Ayli, Eternal Pilgrim: a segunda habilidade exila permanente que não é terreno e só ativa com 10 de vida acima da inicial', () => {
  let s = mesa(['Ayli, Eternal Pilgrim', 'Zulaport Cutthroat'], ['Faerie Seer']), a, z, f; [s, a] = poe(s, 0, 'Ayli, Eternal Pilgrim'); [s, z] = poe(s, 0, 'Zulaport Cutthroat'); [s, f] = poe(s, 1, 'Faerie Seer'); [s] = poe(s, 1, 'Island'); s = comMana(s, 'CWB');
  const seg = t => legais(t, 0, x => x.t === 'activate' && x.oid === a && x.index === 1);
  s = J(s); s.players[0].life = 29; assert.equal(seg(s).length, 0, 'com 29 (inicial 20) não ativa'); assert.throws(() => act(s, { t: 'activate', p: 0, oid: a, index: 1, pay: { sacrifice: z }, targets: [{ oid: f }] }), /vida/);
  s.players[0].life = 30; const as = seg(s); assert.ok(as.length >= 1); assert.equal(as.some(x => E.cardFacts && s.facts[s.objects[x.targets[0].oid].name].types.includes('land')), false, 'terreno não é alvo');
  s = tudo(act(s, as.find(x => x.targets[0].oid === f))); assert.equal(s.objects[f].zone, 'exile'); assert.equal(s.objects[z].zone, 'graveyard');
});

// ---------------------------------------------------------------- CR2b.1 · gatilho atrasado
test('CR2b.1 · Arcane Denial: anula; na manutenção do próximo turno o dono da mágica anulada escolhe comprar 0, 1 ou 2 e quem conjurou compra 1', () => {
  for (const [rotulo, compradas] of [['Comprar 2', 2], ['Comprar 1', 1], ['Não comprar', 0]]) {
    let s = mesa(['Arcane Denial'], ['Faerie Seer']), d, f; [s, d] = poe(s, 0, 'Arcane Denial', 'hand'); [s, f] = poe(s, 1, 'Faerie Seer', 'hand');
    s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending); s = comMana(comMana(s, 'UU'), 'U', 1);
    s = act(s, legais(s, 1, x => x.t === 'cast' && x.oid === f)[0]); s = act(s, { t: 'pass', p: 1 }); s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === d)[0]);
    s = act(act(s, { t: 'pass', p: 0 }), { t: 'pass', p: 1 }); assert.equal(s.objects[f].zone, 'graveyard', 'Counter target spell'); assert.equal(s.atrasados.length, 2);
    const turno = s.turn.number;
    s = passaAte(s, x => x.turn.number === turno + 1 && x.turn.step === 'upkeep' && (x.stack.length > 0 || !!x.pending));
    const maoA = s.zones[0].hand.length, maoB = s.zones[1].hand.length; assert.equal(s.stack.length + s.queued.length, 2, 'dois gatilhos atrasados no começo da manutenção (quem conjurou escolhe a ordem)'); // mãos medidas aqui: a limpeza do turno anterior já descartou
    s = tudo(s, x => x.pending.kind === 'choose_mode' ? (assert.equal(x.pending.p, 1, 'quem escolhe é o dono da mágica anulada'), legais(x, 1, y => y.t === 'choose_mode' && y.label === rotulo)[0]) : legais(x, x.pending.p)[0]);
    assert.equal(s.turn.step, 'upkeep'); assert.equal(s.zones[0].hand.length, maoA + 1, 'You draw a card'); assert.equal(s.zones[1].hand.length, maoB + compradas, rotulo);
  }
});

test("CR2b.1 · Mishra's Bauble: olha o topo do grimório do jogador alvo e compra uma carta na manutenção do próximo turno", () => {
  let s = mesa(["Mishra's Bauble"], []), b; [s, b] = poe(s, 0, "Mishra's Bauble");
  const hab = legais(s, 0, x => x.t === 'activate' && x.oid === b); assert.deepEqual(J(hab.map(x => x.targets[0].player)).sort(), [0, 1], 'target player');
  const topo = s.zones[1].library[0]; const mao = s.zones[0].hand.length, turno = s.turn.number;
  s = act(s, hab.find(x => x.targets[0].player === 1)); assert.equal(s.objects[b].zone, 'graveyard', '{T}, Sacrifice'); s = act(act(s, { t: 'pass', p: 0 }), { t: 'pass', p: 1 });
  assert.equal(s.pending.kind, 'pick'); assert.equal(s.pending.p, 0); assert.deepEqual(J(s.pending.mostrar), [topo], 'só quem ativou vê a carta do topo'); s = act(s, { t: 'pick_done', p: 0 });
  assert.equal(s.zones[1].library[0], topo, 'a carta continua no topo'); assert.equal(s.zones[0].hand.length, mao, 'nada de compra agora');
  s = passaAte(s, x => x.turn.number === turno + 1 && x.turn.step === 'upkeep' && x.stack.length > 0); const naManutencao = s.zones[0].hand.length; s = tudo(s); assert.equal(s.zones[0].hand.length, naManutencao + 1, 'Draw a card at the beginning of the next turn\'s upkeep');
});

// ---------------------------------------------------------------- CR2b.3 · pontos de disparo novos
const anexa = (s, aura, host) => { s = J(s); s.objects[aura].attachedTo = host; return s; };
const ateDecisao = s => { for (let i = 0; i < 10 && !s.pending && (s.stack.length || s.queued.length); i++) s = act(s, { t: 'pass', p: s.turn.priority }); return s; };

test('CR2b.3 · Skullclamp: "Whenever equipped creature dies, draw two cards"', () => {
  let s = mesa(['Skullclamp', 'Cruel Celebrant']), k, c; [s, k] = poe(s, 0, 'Skullclamp'); [s, c] = poe(s, 0, 'Cruel Celebrant'); s = anexa(s, k, c); s.objects[c].damage = 1; // 1/2 com +1/-1 vira 2/1
  const mao = s.zones[0].hand.length; s = tudo(act(s, { t: 'pass', p: 0 }));
  assert.equal(s.objects[c].zone, 'graveyard'); assert.equal(s.objects[k].zone, 'battlefield', 'o Equipamento fica'); assert.equal(s.zones[0].hand.length, mao + 2);
});

test('CR2b.3 · High Priest of Penance: "Whenever this creature is dealt damage, you may destroy target nonland permanent" — dispara mesmo com dano letal', () => {
  let s = mesa(['High Priest of Penance', 'Lightning Bolt'], ['Faerie Seer', 'Zulaport Cutthroat']), h, b, f; [s, h] = poe(s, 0, 'High Priest of Penance'); [s, b] = poe(s, 0, 'Lightning Bolt', 'hand'); [s, f] = poe(s, 1, 'Faerie Seer'); [s] = poe(s, 1, 'Zulaport Cutthroat'); [s] = poe(s, 1, 'Island'); s = comMana(s, 'R');
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === b && x.targets[0].oid === h)[0]); s = ateDecisao(s);
  assert.equal(s.pending.kind, 'pick_target'); assert.equal(s.pending.options.some(o => s.facts[s.objects[o.oid].name].types.includes('land')), false, 'terreno não é alvo');
  s = act(s, { t: 'pick_target', p: 0, index: s.pending.options.findIndex(o => o.oid === f) }); s = ateDecisao(s); assert.equal(s.pending.kind, 'may_pay', '"you may"');
  s = tudo(act(s, { t: 'pay', p: 0 })); assert.equal(s.objects[f].zone, 'graveyard'); assert.equal(s.objects[h].zone, 'graveyard', 'o sacerdote morreu do raio e a habilidade resolveu assim mesmo');
});

test('CR2b.3 · Authority of the Consuls: criaturas dos oponentes entram viradas e cada uma que entra dá 1 de vida; as suas não', () => {
  let s = mesa(['Authority of the Consuls', 'Faerie Seer'], ['Faerie Seer']), fa, fb; [s] = poe(s, 0, 'Authority of the Consuls'); [s, fa] = poe(s, 0, 'Faerie Seer', 'hand'); [s, fb] = poe(s, 1, 'Faerie Seer', 'hand'); s = comMana(s, 'U');
  s = tudo(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === fa)[0]), x => legais(x, x.pending.p, y => y.t === 'pick_done')[0] || legais(x, x.pending.p)[0]);
  assert.equal(s.objects[fa].tapped, false, 'a sua entra desvirada'); assert.equal(vidas(s), '20/20');
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending); s = comMana(s, 'U', 1);
  s = tudo(act(s, legais(s, 1, x => x.t === 'cast' && x.oid === fb)[0]), x => legais(x, x.pending.p, y => y.t === 'pick_done')[0] || legais(x, x.pending.p)[0]);
  assert.equal(s.objects[fb].tapped, true, 'Creatures your opponents control enter tapped'); assert.equal(vidas(s), '21/20', 'you gain 1 life');
});

test("CR2b.3 · Kaya's Ghostform: a permanente encantada morre ou é exilada e volta ao campo sob o seu controle; só encanta criatura ou planeswalker seu", () => {
  { let s = mesa(["Kaya's Ghostform", 'Faerie Seer'], ['Faerie Seer']), g, f; [s, g] = poe(s, 0, "Kaya's Ghostform", 'hand'); [s, f] = poe(s, 0, 'Faerie Seer'); [s] = poe(s, 1, 'Faerie Seer'); s = comMana(s, 'B');
    assert.deepEqual(alvos(s, 0, g), ['Faerie Seer'].filter(() => true)); assert.equal(legais(s, 0, x => x.t === 'cast' && x.oid === g).every(x => s.objects[x.targets[0].oid].controller === 0), true, 'só permanente sua'); }
  for (const [carta, zona, mana, vida] of [['Lightning Bolt', 'graveyard', 'R', '20/20'], ['Anguished Unmaking', 'exile', 'WBC', '17/20']]) {
    let s = mesa(["Kaya's Ghostform", 'Faerie Seer', carta]), g, f, r; [s, g] = poe(s, 0, "Kaya's Ghostform"); [s, f] = poe(s, 0, 'Faerie Seer'); s = anexa(s, g, f); [s, r] = poe(s, 0, carta, 'hand'); s = comMana(s, mana);
    s = tudo(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === r && x.targets[0].oid === f)[0]), x => legais(x, x.pending.p, y => y.t === 'pick_done')[0] || legais(x, x.pending.p)[0]);
    assert.equal(s.objects[f].zone, 'battlefield', `${carta}: a carta voltou do ${zona}`); assert.equal(s.objects[f].controller, 0); assert.equal(s.objects[g].zone, 'graveyard', 'a Aura foi para o cemitério'); assert.equal(vidas(s), vida);
  }
  { let s = mesa(["Kaya's Ghostform", 'Faerie Seer']), g, f; [s, g] = poe(s, 0, "Kaya's Ghostform"); [s, f] = poe(s, 0, 'Faerie Seer', 'battlefield', { token: true }); s = anexa(s, g, f); s.objects[f].damage = 1;
    s = tudo(act(s, { t: 'pass', p: 0 })); assert.equal(s.objects[f], undefined, 'ficha não volta'); }
});

test('CR2b.3 · Angelic Renewal: criatura sua vai do campo para o seu cemitério — você pode sacrificar o encantamento para devolvê-la; uma devolução só', () => {
  const base = n => { let s = mesa(['Angelic Renewal', 'Faerie Seer', 'Cruel Celebrant'], ['Faerie Seer']), r, ids = []; [s, r] = poe(s, 0, 'Angelic Renewal'); for (const c of ['Faerie Seer', 'Cruel Celebrant'].slice(0, n)) { let o; [s, o] = poe(s, 0, c); ids.push(o); } s = J(s); for (const o of ids) s.objects[o].damage = 5; return { s, r, ids }; };
  { let { s, r, ids } = base(1); s = ateDecisao(act(s, { t: 'pass', p: 0 })); assert.equal(s.pending.kind, 'may_pay'); s = tudo(act(s, { t: 'pay', p: 0 }));
    assert.equal(s.objects[r].zone, 'graveyard', 'sacrificou o encantamento'); assert.equal(s.objects[ids[0]].zone, 'battlefield', 'return that card to the battlefield'); assert.equal(s.objects[ids[0]].damage, 0); }
  { let { s, r, ids } = base(1); s = ateDecisao(act(s, { t: 'pass', p: 0 })); s = tudo(act(s, { t: 'decline', p: 0 })); assert.equal(s.objects[r].zone, 'battlefield'); assert.equal(s.objects[ids[0]].zone, 'graveyard'); }
  { let { s, r, ids } = base(2); s = tudo(act(s, { t: 'pass', p: 0 }), x => legais(x, x.pending.p, y => y.t === 'pay')[0] || legais(x, x.pending.p)[0]);
    assert.equal(ids.filter(o => s.objects[o].zone === 'battlefield').length, 1, 'duas morrem juntas: dois gatilhos, uma devolução'); assert.equal(s.objects[r].zone, 'graveyard'); }
  { let s = mesa(['Angelic Renewal'], ['Faerie Seer']), r, f; [s, r] = poe(s, 0, 'Angelic Renewal'); [s, f] = poe(s, 1, 'Faerie Seer'); s = J(s); s.objects[f].damage = 5; s = act(s, { t: 'pass', p: 0 });
    assert.equal(s.pending, null, 'criatura do oponente não dispara'); assert.equal(s.stack.length, 0); }
});

// ---------------------------------------------------------------- CR2b.4
test('CR2b.4 · Curiosity: "Whenever enchanted creature deals damage to an opponent, you may draw a card" — dano a oponente (de combate ou não), não a criatura', () => {
  let s = mesa(['Curiosity', 'Faerie Seer'], ['Zulaport Cutthroat']), c, f; [s, c] = poe(s, 0, 'Curiosity'); [s, f] = poe(s, 0, 'Faerie Seer'); s = anexa(s, c, f); [s] = poe(s, 1, 'Zulaport Cutthroat');
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers'); s = act(s, { t: 'attack', p: 0, attackers: [f] });
  s = passaAte(s, x => x.pending && x.pending.kind === 'blockers'); s = act(s, { t: 'block', p: 1, blocks: [] }); s = ateDecisao(passaAte(s, x => x.players[1].life === 19));
  assert.equal(s.pending.kind, 'may_pay', '"you may draw"'); assert.equal(s.pending.p, 0); const mao = s.zones[0].hand.length; s = act(s, { t: 'pay', p: 0 }); assert.equal(s.zones[0].hand.length, mao + 1);
  // bloqueada: o dano vai na criatura, não no oponente — não dispara
  let t = mesa(['Curiosity', 'Faerie Seer'], ['Faerie Seer']), c2, f2, b2; [t, c2] = poe(t, 0, 'Curiosity'); [t, f2] = poe(t, 0, 'Faerie Seer'); t = anexa(t, c2, f2); [t, b2] = poe(t, 1, 'Faerie Seer');
  t = passaAte(t, x => x.pending && x.pending.kind === 'attackers'); t = act(t, { t: 'attack', p: 0, attackers: [f2] }); t = passaAte(t, x => x.pending && x.pending.kind === 'blockers'); t = act(t, { t: 'block', p: 1, blocks: [[b2, f2]] });
  t = passaAte(t, x => x.turn.step === 'main2' || !!x.pending); assert.equal(t.pending, null, 'dano em criatura não dispara'); assert.equal(t.players[1].life, 20);
});

test('CR2b.4 · Glint-Horn Buccaneer: ímpeto; cada descarte seu causa 1 de dano a cada oponente; "{1}{R}, Discard a card: Draw a card" só enquanto ataca', () => {
  let s = mesa(['Glint-Horn Buccaneer', 'Faerie Seer']), g, d; [s, g] = poe(s, 0, 'Glint-Horn Buccaneer', 'battlefield', { sick: true }); [s, d] = poe(s, 0, 'Faerie Seer', 'hand'); s = comMana(s, 'CR');
  assert.equal(s.facts['Glint-Horn Buccaneer'].kw.includes('haste'), true, 'Haste');
  assert.equal(legais(s, 0, x => x.t === 'activate' && x.oid === g).length, 0, 'fora do ataque não ativa'); assert.throws(() => act(s, { t: 'activate', p: 0, oid: g, index: 0, pay: { discard: [d] } }), /atacando/);
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers'); s = act(s, { t: 'attack', p: 0, attackers: [g] }); s = comMana(s, 'CR');
  const hab = legais(s, 0, x => x.t === 'activate' && x.oid === g && x.pay && x.pay.discard.includes(d)); assert.ok(hab.length >= 1, 'atacando, ativa'); const mao = s.zones[0].hand.length;
  s = act(s, hab[0]); assert.equal(s.objects[d].zone, 'graveyard', 'descartou como custo'); s = act(act(s, { t: 'pass', p: 0 }), { t: 'pass', p: 1 }); s = act(act(s, { t: 'pass', p: 0 }), { t: 'pass', p: 1 });
  assert.equal(s.players[1].life, 19, 'o descarte causou 1 de dano ao oponente'); assert.equal(s.zones[0].hand.length, mao - 1 + 1, 'Draw a card');
});

// ---------------------------------------------------------------- CR2b.5
test('CR2b.5 · Mystic Remora: "Whenever an opponent casts a noncreature spell, you may draw a card unless that player pays {4}"', () => {
  const base = (manaDeB) => { let s = mesa(['Mystic Remora', 'Lightning Bolt'], ['Lightning Bolt', 'Faerie Seer']), r, b, f, meu; [s, r] = poe(s, 0, 'Mystic Remora'); [s, b] = poe(s, 1, 'Lightning Bolt', 'hand'); [s, f] = poe(s, 1, 'Faerie Seer', 'hand'); [s, meu] = poe(s, 0, 'Lightning Bolt', 'hand');
    s = act(s, { t: 'pass', p: 0 }); s = comMana(s, manaDeB, 1); return { s, r, b, f, meu }; };
  const conjuraB = (s, oid) => ateDecisao(act(act(s, legais(s, 1, x => x.t === 'cast' && x.oid === oid && (!x.targets || x.targets[0].player === 0))[0]), { t: 'pass', p: 1 }));
  { let { s, b } = base('RCCCC'); s = conjuraB(s, b); assert.equal(s.pending.kind, 'may_pay'); assert.equal(s.pending.p, 1, 'quem decide pagar é quem conjurou'); assert.equal(s.pending.cost, '{4}');
    const mao = s.zones[0].hand.length; s = act(s, { t: 'decline', p: 1 }); assert.equal(s.pending.kind, 'choose_mode', '"you may draw"'); assert.equal(s.pending.p, 0);
    s = act(s, legais(s, 0, x => x.t === 'choose_mode' && x.label === 'Comprar 1')[0]); assert.equal(s.zones[0].hand.length, mao + 1); }
  { let { s, b } = base('RCCCC'); s = conjuraB(s, b); const mao = s.zones[0].hand.length; s = act(s, { t: 'pay', p: 1 }); assert.equal(s.pending, null, 'pagou {4}: ninguém compra'); assert.equal(s.zones[0].hand.length, mao); assert.equal(s.players[1].pool.C, 0); }
  { let { s, b } = base('R'); s = conjuraB(s, b); assert.equal(s.pending.kind, 'choose_mode', 'sem {4}, vai direto para a escolha de quem controla a Remora'); assert.equal(s.pending.p, 0); }
  { let { s, f } = base(''); s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending); s = comMana(s, 'U', 1);
    s = act(s, legais(s, 1, x => x.t === 'cast' && x.oid === f)[0]); assert.equal(s.stack.length, 1, 'mágica de criatura não dispara'); assert.equal(s.pending, null); }
  { let s = mesa(['Mystic Remora', 'Lightning Bolt']), meu; [s] = poe(s, 0, 'Mystic Remora'); [s, meu] = poe(s, 0, 'Lightning Bolt', 'hand'); s = comMana(s, 'R'); s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === meu)[0]); assert.equal(s.stack.length, 1, 'a sua mágica não dispara'); }
});

test('CR2b.5 · Mystic Remora: "Cumulative upkeep {1}" — marcador de idade a cada manutenção sua; sem pagar, é sacrificada', () => {
  let s = mesa(['Mystic Remora']), r; [s, r] = poe(s, 0, 'Mystic Remora'); const turno = s.turn.number;
  s = passaAte(s, x => x.turn.active === 0 && x.turn.number > turno && x.turn.step === 'draw'); assert.equal(s.objects[r].zone, 'graveyard', 'sem mana na manutenção: sacrificada');
  assert.equal(s.objects[r].ultima.counters.age, 1, 'o marcador de idade entrou antes');
});
