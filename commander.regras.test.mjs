// R11 · cartas de Commander conferidas frase a frase contra o texto oficial (.listas/oficiais-commander.json, consultas de
// 05/10/2026). Cada teste cita a frase que o script precisa cumprir.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, comMana, tudo, alvos, passaAte, CARTAS } from './cmd.mjs';
import { S, T } from './listas.mjs';
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

// ---------------------------------------------------------------- CR2c.1 · reforço e modal com vários modos
test('CR2c.1 · Into the Roil: devolve permanente que não é terreno; com reforço {1}{U} também compra uma carta', () => {
  for (const reforco of [false, true]) {
    let s = mesa(['Into the Roil'], ['Faerie Seer']), r, f; [s, r] = poe(s, 0, 'Into the Roil', 'hand'); [s, f] = poe(s, 1, 'Faerie Seer'); [s] = poe(s, 1, 'Island'); s = comMana(s, reforco ? 'UUCC' : 'UC');
    const as = legais(s, 0, x => x.t === 'cast' && x.oid === r && !!x.kick === reforco); assert.ok(as.length >= 1, 'oferece ' + (reforco ? 'com' : 'sem') + ' reforço');
    assert.equal(as.some(x => s.facts[s.objects[x.targets[0].oid].name].types.includes('land')), false, 'terreno não é alvo');
    const mao = s.zones[0].hand.length; s = tudo(act(s, as.find(x => x.targets[0].oid === f)));
    assert.equal(s.objects[f].zone, 'hand'); assert.equal(s.zones[0].hand.length, mao - 1 + (reforco ? 1 : 0), reforco ? 'If this spell was kicked, draw a card' : 'sem reforço, não compra');
  }
  let s = mesa(['Into the Roil'], ['Faerie Seer']), r; [s, r] = poe(s, 0, 'Into the Roil', 'hand'); [s] = poe(s, 1, 'Faerie Seer'); s = comMana(s, 'UC');
  assert.equal(legais(s, 0, x => x.t === 'cast' && x.oid === r && x.kick).length, 0, 'sem mana para o reforço, só a versão sem');
});

test('CR2c.1 · Benalish Sleeper: com reforço {B}, ao entrar cada jogador sacrifica uma criatura; sem reforço, nada', () => {
  for (const reforco of [false, true]) {
    let s = mesa(['Benalish Sleeper'], ['Faerie Seer']), b, f; [s, b] = poe(s, 0, 'Benalish Sleeper', 'hand'); [s, f] = poe(s, 1, 'Faerie Seer'); s = comMana(s, reforco ? 'WBC' : 'WC');
    s = tudo(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === b && !!x.kick === reforco)[0]));
    assert.equal(s.objects[f].zone, reforco ? 'graveyard' : 'battlefield'); assert.equal(s.objects[b].zone, reforco ? 'graveyard' : 'battlefield', reforco ? 'sozinha, ela mesma é sacrificada' : 'fica');
  }
});

test('CR2c.1 · Everflowing Chalice: multirreforço {2} — entra com um marcador de carga por reforço pago e gera {C} por marcador', () => {
  for (const vezes of [0, 1, 2]) {
    let s = mesa(['Everflowing Chalice']), c; [s, c] = poe(s, 0, 'Everflowing Chalice', 'hand'); s = comMana(s, 'CCCC');
    const a = legais(s, 0, x => x.t === 'cast' && x.oid === c && (x.kick || 0) === vezes)[0]; assert.ok(a, 'reforço ' + vezes + ' vezes'); s = tudo(act(s, a));
    assert.equal(s.objects[c].counters.charge || 0, vezes, 'marcadores de carga'); assert.equal(s.players[0].pool.C, 4 - 2 * vezes);
    s = J(s); s.players[0].pool.C = 0; const g = legais(s, 0, x => x.t === 'activate' && x.oid === c);
    if (!g.length) { assert.equal(vezes, 0); continue; } s = act(s, g[0]); assert.equal(s.players[0].pool.C, vezes, '{T}: Add {C} for each charge counter');
  }
});

test('CR2c.1 · Wretched Confluence: escolha três modos, podendo repetir; os efeitos saem na ordem impressa e cada modo tem o seu alvo', () => {
  let s = mesa(['Wretched Confluence', 'Faerie Seer'], ['Faerie Seer', 'Zulaport Cutthroat']), w, minha, f, z; [s, w] = poe(s, 0, 'Wretched Confluence', 'hand'); [s, minha] = poe(s, 0, 'Faerie Seer', 'graveyard'); [s, f] = poe(s, 1, 'Faerie Seer'); [s, z] = poe(s, 1, 'Zulaport Cutthroat'); s = comMana(s, 'BBCCC');
  const todas = legais(s, 0, x => x.t === 'cast' && x.oid === w); assert.ok(todas.every(x => Array.isArray(x.modes) && x.modes.length === 3), 'sempre três modos');
  assert.ok(todas.some(x => J(x.modes).join() === '1,1,1'), 'pode repetir o mesmo modo');
  // modo 2 (−2/−2) duas vezes, uma em cada criatura do oponente, e modo 3 (volta a minha criatura do cemitério para a mão)
  const a = todas.find(x => J(x.modes).join() === '1,1,2' && x.targets[0].oid === f && x.targets[1].oid === z); assert.ok(a, 'cada modo com o próprio alvo');
  s = tudo(act(s, a)); assert.deepEqual([f, z].map(o => s.objects[o].zone), ['graveyard', 'graveyard']); assert.equal(s.objects[minha].zone, 'hand');
  // compra e perde 1 de vida: o "e perde" é do mesmo jogador do modo, não do primeiro alvo da mágica
  let t = mesa(['Wretched Confluence'], ['Faerie Seer']), w2, f2; [t, w2] = poe(t, 0, 'Wretched Confluence', 'hand'); [t, f2] = poe(t, 1, 'Faerie Seer'); t = comMana(t, 'BBCCC');
  const b = legais(t, 0, x => x.t === 'cast' && x.oid === w2 && J(x.modes).join() === '0,1,1' && x.targets[0].player === 1 && x.targets[1].oid === f2 && x.targets[2].oid === f2);
  assert.equal(b.length, 1, 'o mesmo alvo vale em instâncias diferentes de "target"'); t = tudo(act(t, b[0])); assert.equal(t.players[1].life, 19); assert.equal(t.objects[f2].zone, 'graveyard');
});

// ---------------------------------------------------------------- CR2c.2 · "destroy all" com filtro e "target opponent sacrifices"
test('CR2c.2 · Austere Command: escolha dois entre quatro "destroy all"; o que é destruído sai do campo ao mesmo tempo e indestrutível fica', () => {
  const base = () => { let s = mesa(['Austere Command'], ['Zulaport Cutthroat', 'Faerie Seer', 'Kitchen Imp', 'Shield-Wall Sentinel', "Mishra's Bauble", 'Authority of the Consuls', 'Llanowar Elves']), o = {}; [s, o.a] = poe(s, 0, 'Austere Command', 'hand');
    for (const [k, n] of [['z', 'Zulaport Cutthroat'], ['f', 'Faerie Seer'], ['k', 'Kitchen Imp'], ['sw', 'Shield-Wall Sentinel'], ['mb', "Mishra's Bauble"], ['au', 'Authority of the Consuls'], ['le', 'Llanowar Elves']]) [s, o[k]] = poe(s, 1, n);
    s.objects[o.le].tempKeywords = ['indestructible']; return { s: comMana(s, 'WWCCCC'), ...o }; };
  { let { s, a, z, f, k, sw, mb, au, le } = base(); const todas = legais(s, 0, x => x.t === 'cast' && x.oid === a);
    assert.deepEqual([...new Set(todas.map(x => J(x.modes).join()))].sort(), ['0,1', '0,2', '0,3', '1,2', '1,3', '2,3'], 'Choose two: dois modos diferentes');
    const vida = s.players[0].life; s = tudo(act(s, todas.find(x => J(x.modes).join() === '0,2')));
    assert.deepEqual([z, f, sw, mb].map(o => s.objects[o].zone), ['graveyard', 'graveyard', 'graveyard', 'graveyard'], 'artefatos (a criatura-artefato de valor 4 também) e criaturas de valor 3 ou menos');
    assert.deepEqual([k, au, le].map(o => s.objects[o].zone), ['battlefield', 'battlefield', 'battlefield'], 'criatura de valor 4 que não é artefato, encantamento e a indestrutível ficam');
    assert.equal(s.players[0].life, vida - 3, 'Zulaport viu a própria morte, a da Faerie Seer e a da Shield-Wall Sentinel: saíram juntas (603.10a)'); }
  { let { s, a, z, f, k, sw, mb, au } = base(); s = tudo(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === a && J(x.modes).join() === '1,3')[0]));
    assert.deepEqual([au, k, sw].map(o => s.objects[o].zone), ['graveyard', 'graveyard', 'graveyard'], 'encantamentos e criaturas de valor 4 ou mais');
    assert.deepEqual([z, f, mb].map(o => s.objects[o].zone), ['battlefield', 'battlefield', 'battlefield']); }
});

test('CR2c.2 · Silverquill Command: +3/+3 e voar; criatura de valor 2 ou menos do seu cemitério ao campo; jogador compra e perde 1; oponente alvo sacrifica uma criatura à escolha dele', () => {
  const base = () => { let s = mesa(['Silverquill Command', 'Faerie Seer', 'Zulaport Cutthroat', 'Kitchen Imp'], ['Llanowar Elves', 'Faerie Seer', 'Lightning Bolt']), o = {}; [s, o.c] = poe(s, 0, 'Silverquill Command', 'hand'); [s, o.minha] = poe(s, 0, 'Faerie Seer');
    [s, o.z] = poe(s, 0, 'Zulaport Cutthroat', 'graveyard'); [s, o.imp] = poe(s, 0, 'Kitchen Imp', 'graveyard'); [s, o.le] = poe(s, 1, 'Llanowar Elves'); [s, o.f2] = poe(s, 1, 'Faerie Seer');
    return { s: comMana(s, 'WBCC'), ...o }; };
  const conj = (s, c, f) => legais(s, 0, x => x.t === 'cast' && x.oid === c && f(x));
  { let { s, c, z, imp } = base(); const vol = conj(s, c, x => x.modes.includes(1)).map(x => x.targets[x.modes.indexOf(1)].oid);
    assert.ok(vol.includes(z) && !vol.includes(imp), 'Return target creature card with mana value 2 or less: Kitchen Imp (4) não é alvo'); }
  { let { s, c, minha, z } = base(); s = tudo(act(s, conj(s, c, x => J(x.modes).join() === '0,1' && x.targets[0].oid === minha && x.targets[1].oid === z)[0]));
    assert.equal(s.objects[z].zone, 'battlefield'); assert.equal(s.objects[z].controller, 0);
    assert.deepEqual(J(s.objects[minha].pump), { p: 3, t: 3 }, '+3/+3'); assert.ok(E.hasKeyword(s, s.objects[minha], 'flying'), 'and gains flying until end of turn'); }
  { let { s, c, le, f2 } = base(); const mao = s.zones[1].hand.length;
    s = act(s, conj(s, c, x => J(x.modes).join() === '2,3' && x.targets[0].player === 1 && x.targets[1].player === 1)[0]);
    for (let i = 0; i < 4 && !(s.pending && s.pending.kind === 'sacrifice'); i++) s = act(s, { t: 'pass', p: s.turn.priority });
    assert.equal(s.zones[1].hand.length, mao + 1, 'Target player draws a card'); assert.equal(s.players[1].life, 19, 'and loses 1 life');
    assert.equal(s.pending.kind, 'sacrifice'); assert.equal(s.pending.p, 1, 'of their choice: quem escolhe é o oponente'); assert.deepEqual(J(s.pending.options).sort(), [le, f2].sort());
    s = act(s, { t: 'sacrifice', p: 1, oid: f2 }); assert.equal(s.objects[f2].zone, 'graveyard'); assert.equal(s.objects[le].zone, 'battlefield'); }
  { // ruling de 16/04/2021: com um alvo ainda legal, ela resolve e faz o que puder
    let { s, c, minha, le, f2 } = base(), b; [s, b] = poe(s, 1, 'Lightning Bolt', 'hand'); s = comMana(s, 'R', 1);
    s = act(s, conj(s, c, x => J(x.modes).join() === '0,3' && x.targets[0].oid === minha)[0]); s = act(s, { t: 'pass', p: 0 });
    s = act(s, legais(s, 1, x => x.t === 'cast' && x.oid === b && x.targets[0].oid === minha)[0]);
    for (let i = 0; i < 8 && !(s.pending && s.pending.kind === 'sacrifice'); i++) s = act(s, legais(s, s.turn.priority, x => x.t === 'pass')[0]);
    assert.equal(s.objects[minha].zone, 'graveyard', 'o Bolt matou o alvo do +3/+3');
    assert.equal(s.pending && s.pending.kind, 'sacrifice', 'o modo do sacrifício ainda acontece'); assert.deepEqual(J(s.pending.options).sort(), [le, f2].sort()); }
});

// ---------------------------------------------------------------- CR2c.3 · X decide o alvo e quantos alvos cabem
test('CR2c.3 · Profane Command: o X escolhido decide quais cartas o modo de devolver pode mirar ("mana value X or less") e quantos alvos cabem ("up to X")', () => {
  const base = (mana) => { let s = mesa(['Profane Command', 'Faerie Seer', 'Zulaport Cutthroat', 'Kitchen Imp', 'Llanowar Elves'], ['Zulaport Cutthroat']), o = {}; [s, o.p] = poe(s, 0, 'Profane Command', 'hand');
    [s, o.fs] = poe(s, 0, 'Faerie Seer', 'graveyard'); [s, o.zc] = poe(s, 0, 'Zulaport Cutthroat', 'graveyard'); [s, o.imp] = poe(s, 0, 'Kitchen Imp', 'graveyard'); [s, o.le] = poe(s, 0, 'Llanowar Elves'); [s, o.inimiga] = poe(s, 1, 'Zulaport Cutthroat');
    return { s: comMana(s, mana), ...o }; };
  const conj = (s, p, f) => legais(s, 0, x => x.t === 'cast' && x.oid === p && f(x));
  { let { s, p, fs, zc, imp } = base('BBCCCC');
    const devolve = x => conj(s, p, a => a.x === x && a.modes.includes(1)).map(a => a.targets[a.modes.indexOf(1)].oid);
    assert.deepEqual([...new Set(devolve(1))], [fs], 'X = 1: só a Faerie Seer (valor 1)');
    assert.deepEqual([...new Set(devolve(2))].sort(), [fs, zc].sort(), 'X = 2: também a Zulaport (valor 2)');
    assert.ok([...new Set(devolve(4))].includes(imp), 'X = 4: a Kitchen Imp (valor 4) entra');
    assert.throws(() => act(s, { t: 'cast', p: 0, oid: p, x: 1, modes: [0, 1], targets: [{ player: 1 }, { oid: zc }] }), /alvo ilegal/, 'conferido também na conjuração');
    const t = tudo(act(s, conj(s, p, a => a.x === 2 && J(a.modes).join() === '0,1' && a.targets[0].player === 1 && a.targets[1].oid === zc)[0]));
    assert.equal(t.objects[zc].zone, 'battlefield'); assert.equal(t.players[1].life, 18, 'Target player loses X life'); }
  { let { s, p, le, inimiga } = base('BBCC');
    const medo = x => [...new Set(conj(s, p, a => a.x === x && J(a.modes).join() === '0,3' && a.targets[0].player === 1).map(a => a.targets.length - 1))].sort();
    assert.deepEqual(medo(0), [0], 'X = 0: nenhum alvo de medo'); assert.deepEqual(medo(1), [0, 1], 'X = 1: até um'); assert.deepEqual(medo(2), [0, 1, 2], 'X = 2: até dois');
    assert.throws(() => act(s, { t: 'cast', p: 0, oid: p, x: 1, modes: [0, 3], targets: [{ player: 1 }, { oid: le }, { oid: inimiga }] }), /alvo/, 'X = 1 não aceita dois alvos de medo');
    const t = tudo(act(s, conj(s, p, a => a.x === 2 && J(a.modes).join() === '0,3' && a.targets[0].player === 1 && a.targets.length === 3)[0]));
    assert.ok(E.hasKeyword(t, t.objects[le], 'fear') && E.hasKeyword(t, t.objects[inimiga], 'fear'), 'Up to X target creatures gain fear'); assert.equal(t.players[1].life, 18); }
  { let { s, p, inimiga } = base('BBCC'); const t = tudo(act(s, conj(s, p, a => a.x === 2 && J(a.modes).join() === '0,2' && a.targets[0].player === 1 && a.targets[1].oid === inimiga)[0]));
    assert.equal(t.objects[inimiga].zone, 'graveyard', 'Target creature gets -X/-X: a Zulaport (1/1) morre com X = 2'); }
});

test('CR2c.3 · texto dos modos na folha da carta: "todas as criaturas", "−X/−X", "de valor de mana X ou menos" e "até X criaturas"', () => {
  const d = (n, i) => T.descreveEfeitos(S.SCRIPTS[n].modes[i].effects);
  assert.equal(d('Austere Command', 2), 'destrói todas as criaturas de valor de mana 3 ou menos', 'a M-218 escrevia "todos os criaturas"');
  assert.equal(d('Austere Command', 0), 'destrói todos os artefatos');
  assert.equal(d('Profane Command', 1), 'devolve uma criatura de valor de mana X ou menos do cemitério ao campo');
  assert.equal(d('Profane Command', 2), 'uma criatura recebe −X/−X até o fim do turno', 'antes saía "+X/+X"');
  assert.equal(d('Profane Command', 3), 'até X criaturas ganham medo até o fim do turno');
});

// ---------------------------------------------------------------- CR2c.4 · phyrexiano à escolha e custos alternativos novos
// a mão inicial da mesa já tem cartas (Ilhas, Faerie Seer) que também pagariam: os testes de custo começam com a mão vazia
const semMao = (s, p) => { s = J(s); for (const x of s.zones[p].hand) { s.objects[x].zone = 'library'; s.zones[p].library.push(x); } s.zones[p].hand = []; return s; };
test('CR2c.4 · Gitaxian Probe: {U/P} pago com {U} ou 2 de vida, à escolha de quem conjura; olha a mão do jogador alvo e compra uma carta', () => {
  const base = (mana, vida = 20) => { let s = mesa(['Gitaxian Probe'], ['Faerie Seer', 'Lightning Bolt']), g; [s, g] = poe(s, 0, 'Gitaxian Probe', 'hand'); [s] = poe(s, 1, 'Faerie Seer', 'hand'); s = comMana(s, mana); s.players[0].life = vida; return { s, g }; };
  const formas = (s, g) => [...new Set(legais(s, 0, x => x.t === 'cast' && x.oid === g).map(x => x.vida))].sort();
  { const { s, g } = base('U'); assert.deepEqual(formas(s, g), [0, 1], 'com {U}: pagar a mana ou 2 de vida'); }
  { const { s, g } = base(''); assert.deepEqual(formas(s, g), [1], 'sem mana: só a vida'); }
  { const { s, g } = base('U', 1); assert.deepEqual(formas(s, g), [0], 'com 1 de vida não dá para pagar 2 (119.4)');
    assert.throws(() => act(s, { t: 'cast', p: 0, oid: g, vida: 1, targets: [{ player: 1 }] }), /vida/); }
  { let { s, g } = base('U'); s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === g && x.vida === 0 && x.targets[0].player === 1)[0]);
    assert.equal(s.players[0].life, 20); assert.equal(s.players[0].pool.U, 0, 'escolheu pagar com {U}'); }
  { let { s, g } = base('U'); const maoDele = J(s.zones[1].hand), mao = s.zones[0].hand.length;
    s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === g && x.vida === 1 && x.targets[0].player === 1)[0]);
    assert.equal(s.players[0].life, 18, '2 de vida no lugar do {U}'); assert.equal(s.players[0].pool.U, 1, 'o {U} ficou na reserva');
    s = act(act(s, { t: 'pass', p: 0 }), { t: 'pass', p: 1 }); assert.equal(s.pending.kind, 'pick'); assert.deepEqual(J(s.pending.mostrar), maoDele, "Look at target player's hand");
    s = act(s, { t: 'pick_done', p: 0 }); assert.equal(s.zones[0].hand.length, mao - 1 + 1, 'Draw a card'); }
});

test('CR2c.4 · Foil: "discard an Island card and another card rather than pay this spell\'s mana cost" — uma das descartadas precisa ser Ilha', () => {
  const base = (mao) => { let s = semMao(mesa(['Foil', 'Lightning Bolt', ...mao], []), 0), o = {}; [s, o.f] = poe(s, 0, 'Foil', 'hand'); [s, o.b] = poe(s, 0, 'Lightning Bolt', 'hand'); o.mao = []; for (const n of mao) { let x; [s, x] = poe(s, 0, n, 'hand'); o.mao.push(x); }
    s = comMana(s, 'R'); s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === o.b && x.targets[0].player === 1)[0]); return { s, ...o }; };
  { const { s, f } = base(['Faerie Seer', 'Opt']); assert.equal(legais(s, 0, x => x.oid === f && x.alt === 0).length, 0, 'sem Ilha na mão, o custo alternativo não aparece'); }
  { let { s, f, b, mao: [ilha, seer, opt] } = base(['Island', 'Faerie Seer', 'Opt']); const alts = legais(s, 0, x => x.oid === f && x.alt === 0 && x.targets[0].oid === b);
    assert.ok(alts.length >= 2 && alts.every(x => x.pay.discard.includes(ilha)), 'toda forma de pagar inclui a Ilha');
    assert.throws(() => act(s, { t: 'cast', p: 0, oid: f, alt: 0, targets: [{ oid: b }], pay: { discard: [seer, opt] } }), /Ilha/);
    s = tudo(act(s, alts.find(x => x.pay.discard.includes(seer)))); assert.equal(s.players[1].life, 20, 'Counter target spell'); assert.deepEqual([ilha, seer].map(x => s.objects[x].zone), ['graveyard', 'graveyard']); assert.equal(s.objects[opt].zone, 'hand'); }
});

test('CR2c.4 · Snapback: "exile a blue card from your hand rather than pay this spell\'s mana cost"; devolve a criatura alvo à mão do dono', () => {
  let s = semMao(mesa(['Snapback', 'Faerie Seer', 'Island'], ['Zulaport Cutthroat']), 0), sn, seer, ilha, z; [s, sn] = poe(s, 0, 'Snapback', 'hand'); [s, seer] = poe(s, 0, 'Faerie Seer', 'hand'); [s, ilha] = poe(s, 0, 'Island', 'hand'); [s, z] = poe(s, 1, 'Zulaport Cutthroat');
  const alts = legais(s, 0, x => x.oid === sn && x.alt === 0); assert.ok(alts.length >= 1); assert.ok(alts.every(x => x.pay.exileHand === seer), 'só a carta azul paga (a Ilha é incolor, e a própria Snapback não conta)');
  s = tudo(act(s, alts.find(x => x.targets[0].oid === z))); assert.equal(s.objects[z].zone, 'hand'); assert.equal(s.objects[seer].zone, 'exile'); assert.equal(s.objects[ilha].zone, 'hand');
});

test('CR2c.4 · Mogg Salvage: de graça se um oponente controla uma Ilha e você controla uma Montanha; destrói o artefato alvo', () => {
  const base = (minha, dele) => { let s = mesa(['Mogg Salvage', ...(minha ? ['Mountain'] : [])], ["Mishra's Bauble", ...(dele ? ['Island'] : [])]), m, b; [s, m] = poe(s, 0, 'Mogg Salvage', 'hand'); [s, b] = poe(s, 1, "Mishra's Bauble");
    if (minha) [s] = poe(s, 0, 'Mountain'); if (dele) [s] = poe(s, 1, 'Island'); return { s, m, b }; };
  for (const [minha, dele] of [[true, false], [false, true]]) { const { s, m } = base(minha, dele); assert.equal(legais(s, 0, x => x.oid === m && x.alt === 0).length, 0, 'falta ' + (minha ? 'a Ilha dele' : 'a sua Montanha')); }
  let { s, m, b } = base(true, true); const a = legais(s, 0, x => x.oid === m && x.alt === 0 && x.targets[0].oid === b)[0]; assert.ok(a, 'sem mana nenhuma, de graça');
  s = tudo(act(s, a)); assert.equal(s.objects[b].zone, 'graveyard'); assert.equal(s.zones[0].battlefield.filter(x => s.objects[x].tapped).length, 0, 'a Montanha não foi virada');
});

test('CR2c.4 · Wash Away: anula mágica que não foi conjurada da mão do dono; com clivar {1}{U}{U}, anula qualquer mágica', () => {
  const base = () => { let s = mesa(['Wash Away', 'Faithless Looting', 'Lightning Bolt'], []), o = {}; [s, o.w] = poe(s, 0, 'Wash Away', 'hand'); [s, o.l] = poe(s, 0, 'Faithless Looting', 'graveyard'); [s, o.b] = poe(s, 0, 'Lightning Bolt', 'hand'); return { s: comMana(s, 'RRRRUUUC'), ...o }; };
  { let { s, w, b } = base(); s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === b && x.targets[0].player === 1)[0]);
    assert.equal(legais(s, 0, x => x.t === 'cast' && x.oid === w && x.alt == null && x.targets.some(t => t.oid === b)).length, 0, 'o Bolt veio da mão: sem clivar não é alvo');
    const cl = legais(s, 0, x => x.t === 'cast' && x.oid === w && x.alt === 0 && x.targets[0].oid === b); assert.equal(cl.length, 1, 'com clivar é');
    s = tudo(act(s, cl[0])); assert.equal(s.players[1].life, 20); }
  { let { s, w, l } = base(); s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === l && x.flashback)[0]);
    const a = legais(s, 0, x => x.t === 'cast' && x.oid === w && x.alt == null && x.targets[0].oid === l); assert.equal(a.length, 1, 'conjurada do cemitério (lampejo do passado): é alvo pelo custo normal');
    s = act(s, a[0]); s = act(act(s, { t: 'pass', p: 0 }), { t: 'pass', p: 1 }); assert.equal(s.objects[l].zone, 'exile', 'anulada; o lampejo do passado a exila'); }
});

// ---------------------------------------------------------------- CR2c.5 · devolver do cemitério por valor de mana
test('CR2c.5 · Patch Up: "up to three target creature cards with total mana value 3 or less" — a soma dos alvos é conferida na oferta e na conjuração', () => {
  let s = semMao(mesa(['Patch Up', 'Faerie Seer', 'Faerie Seer', 'Llanowar Elves', 'Zulaport Cutthroat', 'Kitchen Imp'], []), 0), pu, f1, f2, le, zc, imp;
  [s, pu] = poe(s, 0, 'Patch Up', 'hand'); [s, f1] = poe(s, 0, 'Faerie Seer', 'graveyard'); [s, f2] = poe(s, 0, 'Faerie Seer', 'graveyard'); [s, le] = poe(s, 0, 'Llanowar Elves', 'graveyard'); [s, zc] = poe(s, 0, 'Zulaport Cutthroat', 'graveyard'); [s, imp] = poe(s, 0, 'Kitchen Imp', 'graveyard'); s = comMana(s, 'WCC');
  const mv = { [f1]: 1, [f2]: 1, [le]: 1, [zc]: 2, [imp]: 4 };
  const ofertas = legais(s, 0, x => x.t === 'cast' && x.oid === pu);
  assert.ok(ofertas.length > 1 && ofertas.every(x => (x.targets || []).reduce((n, t) => n + mv[t.oid], 0) <= 3), 'nenhuma combinação passa de 3');
  assert.ok(ofertas.some(x => (x.targets || []).length === 3), 'três alvos de valor 1'); assert.ok(ofertas.some(x => J((x.targets || []).map(t => t.oid)).sort().join() === [zc, f1].sort().join()), 'Zulaport (2) + Faerie Seer (1)');
  assert.ok(ofertas.some(x => !(x.targets || []).length), 'up to: nenhum alvo também vale');
  assert.throws(() => act(s, { t: 'cast', p: 0, oid: pu, targets: [{ oid: zc }, { oid: f1 }, { oid: le }] }), /valor de mana/, 'soma 4 recusada');
  s = tudo(act(s, ofertas.find(x => (x.targets || []).length === 3))); assert.deepEqual([f1, f2, le].map(o => s.objects[o].zone), ['battlefield', 'battlefield', 'battlefield']); assert.equal(s.objects[imp].zone, 'graveyard');
});

test('CR2c.5 · Call of the Death-Dweller: até dois alvos com valor total 3; marcador de toque mortífero em qualquer um deles, depois marcador de ameaça em qualquer um deles', () => {
  const base = () => { let s = semMao(mesa(['Call of the Death-Dweller', 'Faerie Seer', 'Zulaport Cutthroat'], []), 0), o = {}; [s, o.c] = poe(s, 0, 'Call of the Death-Dweller', 'hand'); [s, o.fs] = poe(s, 0, 'Faerie Seer', 'graveyard'); [s, o.zc] = poe(s, 0, 'Zulaport Cutthroat', 'graveyard'); return { s: comMana(s, 'BCC'), ...o }; };
  { let { s, c, fs, zc } = base(); s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === c && (x.targets || []).length === 2)[0]); s = act(act(s, { t: 'pass', p: 0 }), { t: 'pass', p: 1 });
    assert.equal(s.pending.kind, 'choose_mode', 'quem conjurou escolhe onde vai o toque mortífero'); assert.deepEqual(J(s.pending.options).sort(), ['Faerie Seer', 'Zulaport Cutthroat']);
    s = act(s, { t: 'choose_mode', p: 0, index: s.pending.options.indexOf('Faerie Seer') }); assert.equal(s.pending.kind, 'choose_mode', 'Then put a menace counter on either of them');
    s = act(s, { t: 'choose_mode', p: 0, index: s.pending.options.indexOf('Faerie Seer') });
    assert.equal(s.objects[fs].counters.deathtouch, 1); assert.equal(s.objects[fs].counters.menace, 1, 'os dois na mesma criatura (ruling)');
    assert.ok(E.hasKeyword(s, s.objects[fs], 'deathtouch') && E.hasKeyword(s, s.objects[fs], 'menace'), '122.1b: marcador de palavra-chave dá a habilidade'); assert.equal(E.hasKeyword(s, s.objects[zc], 'menace'), false); }
  { let { s, c, zc } = base(); s = tudo(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === c && (x.targets || []).length === 1 && x.targets[0].oid === zc)[0]));
    assert.deepEqual([s.objects[zc].counters.deathtouch, s.objects[zc].counters.menace], [1, 1], 'um alvo só: os dois marcadores nele, sem pergunta'); }
  { let { s, c } = base(); const n = s.zones[0].battlefield.length; s = tudo(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === c && !(x.targets || []).length)[0]));
    assert.equal(s.zones[0].battlefield.length, n, 'nenhuma criatura devolvida: nenhum marcador (ruling)'); }
});

test('CR2c.5 · Ascend from Avernus: devolve todas as criaturas e planeswalkers de valor X ou menos do seu cemitério; depois se exila', () => {
  let s = semMao(mesa(['Ascend from Avernus', 'Faerie Seer', 'Kitchen Imp', 'Narset, Parter of Veils', 'Llanowar Elves', 'Lightning Bolt', 'Island'], []), 0), a, fs, imp, nar, le, b, il;
  [s, a] = poe(s, 0, 'Ascend from Avernus', 'hand'); [s, fs] = poe(s, 0, 'Faerie Seer', 'graveyard'); [s, imp] = poe(s, 0, 'Kitchen Imp', 'graveyard'); [s, nar] = poe(s, 0, 'Narset, Parter of Veils', 'graveyard'); [s, le] = poe(s, 0, 'Llanowar Elves', 'graveyard'); [s, b] = poe(s, 0, 'Lightning Bolt', 'graveyard'); [s, il] = poe(s, 0, 'Island', 'graveyard');
  s = comMana(s, 'WWWCCC'); s = tudo(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === a && x.x === 3)[0]));
  assert.deepEqual([fs, nar, le].map(o => s.objects[o].zone), ['battlefield', 'battlefield', 'battlefield'], 'criaturas e planeswalker de valor até 3');
  assert.deepEqual([imp, b, il].map(o => s.objects[o].zone), ['graveyard', 'graveyard', 'graveyard'], 'valor 4, instantânea e terreno ficam'); assert.equal(s.objects[a].zone, 'exile', 'Exile Ascend from Avernus');
});

test('CR2c.5 · Priest of Fell Rites: "{T}, Pay 3 life, Sacrifice this creature: Return target creature card from your graveyard to the battlefield. Activate only as a sorcery."', () => {
  let s = semMao(mesa(['Priest of Fell Rites', 'Kitchen Imp', 'Lightning Bolt'], []), 0), pr, imp; [s, pr] = poe(s, 0, 'Priest of Fell Rites'); [s, imp] = poe(s, 0, 'Kitchen Imp', 'graveyard'); s = J(s); s.objects[pr].sick = false;
  const hab = legais(s, 0, x => x.t === 'activate' && x.oid === pr); assert.equal(hab.length, 1); assert.equal(hab[0].targets[0].oid, imp, 'só criatura do seu cemitério (ela mesma ainda está no campo ao escolher)');
  s = act(s, hab[0]); assert.equal(s.players[0].life, 17, 'Pay 3 life'); assert.equal(s.objects[pr].zone, 'graveyard', 'Sacrifice this creature');
  s = tudo(s); assert.equal(s.objects[imp].zone, 'battlefield'); assert.equal(s.objects[imp].controller, 0);
  let t = semMao(mesa(['Priest of Fell Rites', 'Kitchen Imp', 'Lightning Bolt'], []), 0), pr2, b; [t, pr2] = poe(t, 0, 'Priest of Fell Rites'); [t] = poe(t, 0, 'Kitchen Imp', 'graveyard'); [t, b] = poe(t, 0, 'Lightning Bolt', 'hand'); t = J(t); t.objects[pr2].sick = false; t = comMana(t, 'R');
  t = act(t, legais(t, 0, x => x.t === 'cast' && x.oid === b && x.targets[0].player === 1)[0]); assert.equal(legais(t, 0, x => x.t === 'activate' && x.oid === pr2).length, 0, 'Activate only as a sorcery: com a pilha ocupada, não');
});

// ---------------------------------------------------------------- M-222 · revelar do topo até achar
/** Põe no topo do grimório de p, nesta ordem, uma cópia de cada nome; tira do grimório (para o exílio) as cartas que `sem` reprovar. */
const topoDoGrimorio = (s, p, nomes, sem) => { s = J(s); const lib = s.zones[p].library, frente = [];
  for (const n of nomes) { const oid = lib.find(x => s.objects[x].name === n && !frente.includes(x)); assert.ok(oid, n + ' no grimório'); frente.push(oid); }
  let resto = lib.filter(x => !frente.includes(x));
  if (sem) { for (const x of resto.filter(y => sem(s.facts[s.objects[y].name]))) { s.objects[x].zone = 'exile'; s.zones[p].exile.push(x); } resto = resto.filter(y => !sem(s.facts[s.objects[y].name])); }
  s.zones[p].library = [...frente, ...resto]; return [s, frente]; };
const ehCriatura = f => (f.types || []).includes('creature');

test('M-222 · Polymorph: destrói a criatura alvo; o controlador dela revela do topo até uma carta de criatura, põe no campo e embaralha as outras reveladas', () => {
  const base = () => { let s = semMao(mesa(['Polymorph'], ['Zulaport Cutthroat', 'Kitchen Imp', 'Lightning Bolt']), 0), po, z, top; [s, po] = poe(s, 0, 'Polymorph', 'hand'); [s, z] = poe(s, 1, 'Zulaport Cutthroat');
    [s, top] = topoDoGrimorio(s, 1, ['Island', 'Lightning Bolt', 'Kitchen Imp']); return { s: comMana(s, 'UCCC'), po, z, top }; };
  { let { s, po, z, top: [il, bolt, imp] } = base(); const n = s.zones[1].library.length;
    s = tudo(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === po && x.targets[0].oid === z)[0]));
    assert.equal(s.objects[z].zone, 'graveyard'); assert.equal(s.objects[imp].zone, 'battlefield'); assert.equal(s.objects[imp].controller, 1, 'no campo de quem revelou');
    assert.deepEqual([il, bolt].map(x => s.objects[x].zone), ['library', 'library'], 'as outras reveladas voltam embaralhadas'); assert.equal(s.zones[1].library.length, n - 1); }
  { let { s, po, z, top: [, , imp] } = base(); s.objects[z].tempKeywords = ['indestructible'];
    s = tudo(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === po && x.targets[0].oid === z)[0]));
    assert.equal(s.objects[z].zone, 'battlefield', 'indestrutível: não é destruída'); assert.equal(s.objects[imp].zone, 'battlefield', 'ruling 2013: a revelação acontece mesmo assim'); }
  { let s = semMao(mesa(['Polymorph'], ['Zulaport Cutthroat']), 0), po, z; [s, po] = poe(s, 0, 'Polymorph', 'hand'); [s, z] = poe(s, 1, 'Zulaport Cutthroat'); [s] = topoDoGrimorio(s, 1, [], ehCriatura); s = comMana(s, 'UCCC');
    const n = s.zones[1].library.length, campo = s.zones[1].battlefield.length; s = tudo(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === po && x.targets[0].oid === z)[0]));
    assert.equal(s.zones[1].library.length, n, 'sem criatura no grimório: revela tudo e embaralha'); assert.equal(s.zones[1].battlefield.length, campo - 1); }
});

test('M-222 · Transmogrify: exila a criatura alvo; o controlador dela revela até uma carta de criatura e põe no campo', () => {
  let s = semMao(mesa(['Transmogrify'], ['Zulaport Cutthroat', 'Kitchen Imp']), 0), tr, z, top; [s, tr] = poe(s, 0, 'Transmogrify', 'hand'); [s, z] = poe(s, 1, 'Zulaport Cutthroat'); [s, top] = topoDoGrimorio(s, 1, ['Mountain', 'Kitchen Imp']); s = comMana(s, 'RCCC');
  s = tudo(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === tr && x.targets[0].oid === z)[0])); assert.equal(s.objects[z].zone, 'exile'); assert.equal(s.objects[top[1]].zone, 'battlefield'); assert.equal(s.objects[top[0]].zone, 'library');
});

test('M-222 · Reality Scramble: põe a sua permanente alvo no fundo do grimório e revela até uma carta que divida um tipo com ela; as outras vão para o fundo; retraçar descartando um terreno', () => {
  const base = (zona) => { let s = semMao(mesa(['Reality Scramble', 'Faerie Seer', 'Kitchen Imp', 'Opt'], ['Zulaport Cutthroat']), 0), o = {}; [s, o.rs] = poe(s, 0, 'Reality Scramble', zona); [s, o.fs] = poe(s, 0, 'Faerie Seer'); [s, o.inimiga] = poe(s, 1, 'Zulaport Cutthroat');
    [s, o.top] = topoDoGrimorio(s, 0, ['Plains', 'Opt', 'Kitchen Imp']); return { s: comMana(s, 'RRCC'), ...o }; };
  { let { s, rs, fs, inimiga, top: [pl, opt, imp] } = base('hand'); const alvos = legais(s, 0, x => x.t === 'cast' && x.oid === rs).map(x => x.targets[0].oid);
    assert.ok(alvos.includes(fs) && !alvos.includes(inimiga), 'target permanent you own');
    s = tudo(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === rs && x.targets[0].oid === fs)[0])); const lib = s.zones[0].library;
    assert.equal(s.objects[imp].zone, 'battlefield', 'a primeira criatura revelada'); assert.deepEqual(J(lib.slice(-2)).sort(), [pl, opt].sort(), 'as outras reveladas no fundo'); assert.equal(lib[lib.length - 3], fs, 'a Faerie Seer foi para o fundo antes');
    assert.equal(s.objects[rs].zone, 'graveyard'); }
  { let { s, rs } = base('graveyard'); assert.equal(legais(s, 0, x => x.t === 'cast' && x.oid === rs).length, 0, 'retraçar pede um terreno na mão');
    let il; [s, il] = poe(s, 0, 'Plains', 'hand'); const a = legais(s, 0, x => x.t === 'cast' && x.oid === rs && x.retrace); assert.ok(a.length >= 1 && a.every(x => x.pay.retrace === il), 'descarta o terreno da mão');
    s = tudo(act(s, a[0])); assert.equal(s.objects[il].zone, 'graveyard'); assert.equal(s.objects[rs].zone, 'graveyard', 'retraçar devolve ao cemitério, não exila'); }
});

test('M-222 · Reweave: o controlador sacrifica a permanente alvo e revela até uma carta de permanente que divida um tipo com ela, põe no campo e embaralha', () => {
  let s = semMao(mesa(['Reweave'], ['Zulaport Cutthroat', 'Kitchen Imp', 'Lightning Bolt']), 0), rw, z, top; [s, rw] = poe(s, 0, 'Reweave', 'hand'); [s, z] = poe(s, 1, 'Zulaport Cutthroat'); [s, top] = topoDoGrimorio(s, 1, ['Lightning Bolt', 'Island', 'Kitchen Imp']); s = comMana(s, 'UCCCCC');
  s = tudo(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === rw && x.targets[0].oid === z)[0]));
  assert.equal(s.objects[z].zone, 'graveyard'); assert.equal(s.objects[top[2]].zone, 'battlefield', 'a primeira de tipo criatura'); assert.equal(s.objects[top[2]].controller, 1); assert.deepEqual([top[0], top[1]].map(x => s.objects[x].zone), ['library', 'library']);
});

test('M-222 · Lukka, Coppercoat Outcast (−2): exila a sua criatura alvo e revela até uma criatura de valor de mana maior; põe no campo e o resto vai para o fundo', () => {
  let s = semMao(mesa(['Lukka, Coppercoat Outcast', 'Faerie Seer', 'Llanowar Elves', 'Kitchen Imp'], []), 0), lk, fs, top; [s, lk] = poe(s, 0, 'Lukka, Coppercoat Outcast', 'hand'); [s, fs] = poe(s, 0, 'Faerie Seer'); [s, top] = topoDoGrimorio(s, 0, ['Llanowar Elves', 'Plains', 'Kitchen Imp']);
  s = tudo(act(comMana(s, 'RRCCC'), legais(comMana(s, 'RRCCC'), 0, x => x.t === 'cast' && x.oid === lk)[0])); assert.equal(s.objects[lk].counters.loyalty, 5, 'entra com 5 de lealdade');
  const hab = legais(s, 0, x => x.t === 'activate' && x.oid === lk && x.targets && x.targets[0].oid === fs); assert.equal(hab.length, 1);
  s = tudo(act(s, hab[0])); assert.equal(s.objects[lk].counters.loyalty, 3, '−2'); assert.equal(s.objects[fs].zone, 'exile');
  assert.equal(s.objects[top[2]].zone, 'battlefield', 'Kitchen Imp (4) > Faerie Seer (1); Llanowar Elves (1) não serve'); assert.deepEqual(J(s.zones[0].library.slice(-2)).sort(), [top[0], top[1]].sort());
});

// ---------------------------------------------------------------- CR2d.1 · 613 · Auras que redefinem a criatura (camadas 4, 6 e 7b) com carimbo de tempo
const encanta = (s, aura, alvo, mana) => { s = comMana(s, mana); return tudo(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === aura && x.targets[0].oid === alvo)[0])); };
const st = (s, oid) => { const v = E.stats(s, s.objects[oid]); return `${v.power}/${v.toughness}`; };

test('CR2d.1 · Darksteel Mutation: a criatura encantada é um Inseto artefato criatura 0/1 base, indestrutível, e perde as outras habilidades e tipos', () => {
  let s = semMao(mesa(['Darksteel Mutation', 'Ancient Grudge', 'Lightning Bolt'], ['Zulaport Cutthroat', 'Llanowar Elves']), 0), dm, ag, b, z, le;
  [s, dm] = poe(s, 0, 'Darksteel Mutation', 'hand'); [s, ag] = poe(s, 0, 'Ancient Grudge', 'hand'); [s, b] = poe(s, 0, 'Lightning Bolt', 'hand'); [s, z] = poe(s, 1, 'Zulaport Cutthroat'); [s, le] = poe(s, 1, 'Llanowar Elves'); s = J(s); s.objects[le].sick = false;
  assert.ok(E.productions(s, s.objects[le]).length > 0, 'antes: Llanowar Elves gera mana');
  s = encanta(s, dm, le, 'WC'); assert.equal(s.objects[dm].attachedTo, le);
  assert.equal(st(s, le), '0/1', 'base power and toughness 0/1'); assert.ok(E.hasKeyword(s, s.objects[le], 'indestructible'));
  assert.equal(E.productions(s, s.objects[le]).length, 0, 'perdeu a habilidade de mana');
  { const g = comMana(s, 'RC'); assert.ok(alvos(g, 0, ag).includes('Llanowar Elves'), 'é artefato: Ancient Grudge (destruir artefato) mira'); assert.equal(alvos(g, 0, ag).includes('Zulaport Cutthroat'), false); }
  s = tudo(act(comMana(s, 'R'), legais(comMana(s, 'R'), 0, x => x.t === 'cast' && x.oid === b && x.targets[0] && x.targets[0].oid === le)[0])); assert.equal(s.objects[le].zone, 'battlefield', 'indestrutível: 3 de dano não a destrói');
});

test('CR2d.1 · Reprobation: perde todas as habilidades e é uma criatura Covarde 0/1 base; o que muda o P/T sem fixar continua (7c); gatilho de morte não dispara', () => {
  let s = semMao(mesa(['Reprobation', 'Lightning Bolt'], ['Zulaport Cutthroat', 'Faerie Seer']), 0), rp, b, z, fs; [s, rp] = poe(s, 0, 'Reprobation', 'hand'); [s, b] = poe(s, 0, 'Lightning Bolt', 'hand'); [s, z] = poe(s, 1, 'Zulaport Cutthroat'); [s, fs] = poe(s, 1, 'Faerie Seer');
  s = encanta(s, rp, fs, 'WC'); assert.equal(st(s, fs), '0/1'); assert.equal(E.hasKeyword(s, s.objects[fs], 'flying'), false, 'Faerie Seer perde voar');
  let u = semMao(mesa(['Reprobation', 'Lightning Bolt'], ['Zulaport Cutthroat']), 0), rp2, b2, z2; [u, rp2] = poe(u, 0, 'Reprobation', 'hand'); [u, b2] = poe(u, 0, 'Lightning Bolt', 'hand'); [u, z2] = poe(u, 1, 'Zulaport Cutthroat');
  u = encanta(u, rp2, z2, 'WC'); const vida = u.players[0].life;
  u = tudo(act(comMana(u, 'R'), legais(comMana(u, 'R'), 0, x => x.t === 'cast' && x.oid === b2 && x.targets[0] && x.targets[0].oid === z2)[0]));
  assert.equal(u.objects[z2].zone, 'graveyard'); assert.equal(u.players[0].life, vida, 'a Zulaport morreu sem a habilidade: ninguém perde vida (603.10a, última informação)');
});

test('CR2d.1 · carimbo de tempo (613.7): o +3/+3 de antes continua (7c), o voar dado antes da Reprobation some, o dado depois fica', () => {
  const base = () => { let s = semMao(mesa(['Reprobation', 'Silverquill Command'], ['Zulaport Cutthroat']), 0), o = {}; [s, o.rp] = poe(s, 0, 'Reprobation', 'hand'); [s, o.sc] = poe(s, 0, 'Silverquill Command', 'hand'); [s, o.z] = poe(s, 1, 'Zulaport Cutthroat'); return { s, ...o }; };
  const comando = (s, sc, z) => { s = comMana(s, 'WBCC'); return tudo(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === sc && J(x.modes).join() === '0,2' && x.targets[0].oid === z && x.targets[1].player === 0)[0])); };
  { let { s, rp, sc, z } = base(); s = comando(s, sc, z); assert.equal(st(s, z), '4/4', 'Zulaport 1/1 + 3/3'); assert.ok(E.hasKeyword(s, s.objects[z], 'flying'));
    s = encanta(s, rp, z, 'WC'); assert.equal(st(s, z), '3/4', '0/1 base + 3/3 do Comando'); assert.equal(E.hasKeyword(s, s.objects[z], 'flying'), false, 'o voar veio antes da Aura: perdido'); }
  { let { s, rp, sc, z } = base(); s = encanta(s, rp, z, 'WC'); s = comando(s, sc, z); assert.equal(st(s, z), '3/4'); assert.ok(E.hasKeyword(s, s.objects[z], 'flying'), 'o voar veio depois da Aura: fica'); }
});

// ---------------------------------------------------------------- CR2d.2 · terreno que vira criatura até o fim do turno (camadas 4, 6 e 7b, "It's still a land")
const veterano = (s, oid) => { s = J(s); s.objects[oid].entrouNoTurno = s.turn.number - 1; s.objects[oid].sick = false; return s; }; // no campo desde antes deste turno

test("CR2d.2 · Mishra's Factory: {1} vira uma criatura artefato Assembly-Worker 2/2 até o fim do turno e continua terreno; {T}: Assembly-Worker alvo recebe +1/+1", () => {
  let s = semMao(mesa(["Mishra's Factory"], ['Faerie Seer']), 0), mf, fs; [s, mf] = poe(s, 0, "Mishra's Factory"); [s, fs] = poe(s, 1, 'Faerie Seer'); s = veterano(s, mf);
  assert.equal(E.eligibleAttackers(s, 0).includes(mf), false, 'antes: só terreno');
  const vira = legais(comMana(s, 'C'), 0, x => x.t === 'activate' && x.oid === mf && !x.targets); assert.equal(vira.length, 1, '{1}: vira criatura');
  s = tudo(act(comMana(s, 'C'), vira[0])); const v = E.stats(s, s.objects[mf]);
  assert.equal(`${v.power}/${v.toughness}`, '2/2'); assert.ok(E.eligibleAttackers(s, 0).includes(mf), 'pode atacar: estava sob seu controle desde o começo do turno');
  assert.ok(E.productions(s, s.objects[mf]).length > 0, "It's still a land: continua gerando {C}");
  const pump = legais(s, 0, x => x.t === 'activate' && x.oid === mf && x.targets); assert.deepEqual(J(pump.map(x => x.targets[0].oid)), [mf], 'Target Assembly-Worker creature: a Faerie Seer não é alvo');
  s = tudo(act(s, pump[0])); const w = E.stats(s, s.objects[mf]); assert.equal(`${w.power}/${w.toughness}`, '3/3'); assert.ok(s.objects[mf].tapped);
  const turno = s.turn.number; s = passaAte(s, x => x.turn.number > turno); assert.equal(E.eligibleAttackers(s, 0).includes(mf), false); const c = E.stats(s, s.objects[mf]);
  assert.ok(!E.legalTargets(s, 1, 'creature').some(x => x.oid === mf), 'no fim do turno deixa de ser criatura');
});

test('CR2d.2 · Blinkmoth Nexus: {1} vira uma criatura artefato Blinkmoth 1/1 com voar até o fim do turno; {1},{T}: Blinkmoth alvo recebe +1/+1', () => {
  let s = semMao(mesa(['Blinkmoth Nexus'], []), 0), bn; [s, bn] = poe(s, 0, 'Blinkmoth Nexus'); s = veterano(s, bn);
  s = tudo(act(comMana(s, 'C'), legais(comMana(s, 'C'), 0, x => x.t === 'activate' && x.oid === bn && !x.targets)[0]));
  assert.equal(`${E.stats(s, s.objects[bn]).power}/${E.stats(s, s.objects[bn]).toughness}`, '1/1'); assert.ok(E.hasKeyword(s, s.objects[bn], 'flying'), 'with flying');
  const pump = legais(comMana(s, 'C'), 0, x => x.t === 'activate' && x.oid === bn && x.targets); assert.equal(pump.length, 1, 'ruling: ela pode mirar a si mesma');
  s = tudo(act(comMana(s, 'C'), pump[0])); assert.equal(E.stats(s, s.objects[bn]).power, 2);
});

test('CR2d.2 · terreno que entrou neste turno e virou criatura não ataca nem usa {T} de criatura (ruling: controle contínuo desde o começo do turno)', () => {
  let s = semMao(mesa(["Mishra's Factory"], []), 0), mf; [s, mf] = poe(s, 0, "Mishra's Factory"); s = J(s); s.objects[mf].entrouNoTurno = s.turn.number;
  s = tudo(act(comMana(s, 'C'), legais(comMana(s, 'C'), 0, x => x.t === 'activate' && x.oid === mf && !x.targets)[0]));
  assert.equal(E.eligibleAttackers(s, 0).includes(mf), false, 'entrou agora: não ataca'); assert.equal(legais(s, 0, x => x.t === 'activate' && x.oid === mf && x.targets).length, 0, '{T} de criatura com enjoo');
});

// ---------------------------------------------------------------- CR2d.3 · Veículo e tripular (702.122, 301.7)
test("CR2d.3 · Smuggler's Copter: tripular 1 vira as outras criaturas com poder total 1 ou mais e o Veículo vira criatura artefato até o fim do turno", () => {
  let s = semMao(mesa(["Smuggler's Copter", 'Faerie Seer'], []), 0), cp, fs; [s, cp] = poe(s, 0, "Smuggler's Copter"); [s, fs] = poe(s, 0, 'Faerie Seer'); s = veterano(s, cp); s = J(s); s.objects[fs].sick = true; // a Faerie Seer acabou de entrar
  assert.equal(E.isCreature(s, s.objects[cp]), false, 'Veículo sem tripular não é criatura');
  const trip = legais(s, 0, x => x.t === 'activate' && x.oid === cp); assert.equal(trip.length, 1); assert.deepEqual(J(trip[0].pay.crew), [fs], 'criatura com enjoo pode tripular');
  s = tudo(act(s, trip[0])); assert.ok(s.objects[fs].tapped, 'a tripulante foi virada'); assert.ok(E.isCreature(s, s.objects[cp]));
  assert.equal(`${E.stats(s, s.objects[cp]).power}/${E.stats(s, s.objects[cp]).toughness}`, '3/3', 'P/T impresso'); assert.ok(E.hasKeyword(s, s.objects[cp], 'flying'));
  assert.equal(legais(s, 0, x => x.t === 'activate' && x.oid === cp).length, 0, '"other untapped creatures": ele não tripula a si mesmo');
  assert.ok(E.eligibleAttackers(s, 0).includes(cp));
  const turno = s.turn.number; s = passaAte(s, x => x.turn.number > turno); assert.equal(E.isCreature(s, s.objects[cp]), false, 'no fim do turno volta a ser só artefato');
});

test("CR2d.3 · Smuggler's Copter: ao atacar, você pode comprar uma carta; se comprar, descarta uma", () => {
  let s = semMao(mesa(["Smuggler's Copter", 'Faerie Seer', 'Opt'], []), 0), cp, fs, op; [s, cp] = poe(s, 0, "Smuggler's Copter"); [s, fs] = poe(s, 0, 'Faerie Seer'); [s, op] = poe(s, 0, 'Opt', 'hand'); s = veterano(s, cp);
  s = tudo(act(s, legais(s, 0, x => x.t === 'activate' && x.oid === cp)[0]));
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers'); s = act(s, { t: 'attack', p: 0, attackers: [cp] }); s = ateDecisao(s);
  assert.equal(s.pending.kind, 'may_pay', '"you may draw a card"'); const mao = s.zones[0].hand.length; s = act(s, { t: 'pay', p: 0 });
  assert.equal(s.zones[0].hand.length, mao + 1, 'comprou'); assert.equal(s.pending.kind, 'discard', 'If you do, discard a card'); s = act(s, { t: 'discard', p: 0, oid: op });
  assert.equal(s.zones[0].hand.length, mao); assert.equal(s.objects[op].zone, 'graveyard');
});

test('CR2d.3 · Veículo que entrou neste turno e foi tripulado não ataca (302.6)', () => {
  let s = semMao(mesa(["Smuggler's Copter", 'Faerie Seer'], []), 0), cp; [s, cp] = poe(s, 0, "Smuggler's Copter"); [s] = poe(s, 0, 'Faerie Seer'); s = J(s); s.objects[cp].entrouNoTurno = s.turn.number;
  s = tudo(act(s, legais(s, 0, x => x.t === 'activate' && x.oid === cp)[0])); assert.ok(E.isCreature(s, s.objects[cp])); assert.equal(E.eligibleAttackers(s, 0).includes(cp), false);
});

// ---------------------------------------------------------------- CR2d.4 · Animate Dead (Aura em cemitério que reanima)
test('CR2d.4 · Animate Dead: encanta carta de criatura em qualquer cemitério; ao entrar devolve a criatura sob o seu controle, anexada, com −1/−0', () => {
  let s = semMao(mesa(['Animate Dead', 'Faerie Seer'], ['Kitchen Imp', 'Lightning Bolt']), 0), ad, minha, imp, bolt; [s, ad] = poe(s, 0, 'Animate Dead', 'hand'); [s, minha] = poe(s, 0, 'Faerie Seer', 'graveyard'); [s, imp] = poe(s, 1, 'Kitchen Imp', 'graveyard'); [s, bolt] = poe(s, 1, 'Lightning Bolt', 'graveyard');
  s = comMana(s, 'BC'); const alvos = legais(s, 0, x => x.t === 'cast' && x.oid === ad).map(x => x.targets[0].oid);
  assert.deepEqual(J(alvos).sort(), [minha, imp].sort(), 'creature card in a graveyard: dos dois cemitérios, só criatura');
  s = tudo(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === ad && x.targets[0].oid === imp)[0]));
  assert.equal(s.objects[imp].zone, 'battlefield'); assert.equal(s.objects[imp].controller, 0, 'under your control'); assert.equal(s.objects[ad].zone, 'battlefield'); assert.equal(s.objects[ad].attachedTo, imp, 'attach this Aura to it');
  const k = E.stats(s, s.objects[imp]), base = CARTAS['Kitchen Imp']; assert.equal(k.power, Number(base.power) - 1, 'Enchanted creature gets -1/-0'); assert.equal(k.toughness, Number(base.toughness));
});

test('CR2d.4 · Animate Dead: quando a Aura sai do campo, quem controla a criatura a sacrifica', () => {
  let s = semMao(mesa(['Animate Dead', 'Austere Command'], ['Zulaport Cutthroat']), 0), ad, ac, z; [s, ad] = poe(s, 0, 'Animate Dead', 'hand'); [s, ac] = poe(s, 0, 'Austere Command', 'hand'); [s, z] = poe(s, 1, 'Zulaport Cutthroat', 'graveyard');
  s = tudo(act(comMana(s, 'BC'), legais(comMana(s, 'BC'), 0, x => x.t === 'cast' && x.oid === ad && x.targets[0].oid === z)[0])); assert.equal(s.objects[z].controller, 0);
  const vida = s.players[1].life; s = comMana(s, 'WWCCCC');
  s = tudo(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === ac && J(x.modes).join() === '0,1')[0])); // destrói todos os artefatos e todos os encantamentos
  assert.equal(s.objects[ad].zone, 'graveyard'); assert.equal(s.objects[z].zone, 'graveyard', "that creature's controller sacrifices it");
  assert.equal(s.players[1].life, vida - 1, 'a Zulaport morreu sob o seu controle: o seu oponente perde 1');
});

// ---------------------------------------------------------------- CR2d.5 · Kytheon, Hero of Akros / Gideon, Battle-Forged (texto conferido em 05/10 e 08/10/2026)
const comoGideon = (s, k) => { s = J(s); const o = s.objects[k]; o.frontName = o.name; o.name = 'Gideon, Battle-Forged'; o.counters = { loyalty: 3 }; o.entrouNoTurno = s.turn.number - 1; return s; };

test('CR2d.5 · Kytheon: no fim do combate, se ele e mais duas criaturas atacaram, é exilado e volta transformado, sob o controle do dono (objeto novo)', () => {
  const base = (n) => { let s = semMao(mesa(['Kytheon, Hero of Akros', 'Faerie Seer', 'Faerie Seer'], []), 0), k, f1, f2; [s, k] = poe(s, 0, 'Kytheon, Hero of Akros'); [s, f1] = poe(s, 0, 'Faerie Seer'); [s, f2] = poe(s, 0, 'Faerie Seer');
    for (const x of [k, f1, f2]) s = veterano(s, x); return { s, k, atacam: [k, f1, f2].slice(0, n) }; };
  { let { s, k, atacam } = base(3); s = passaAte(s, x => x.pending && x.pending.kind === 'attackers'); s = act(s, { t: 'attack', p: 0, attackers: atacam });
    s = passaAte(s, x => x.turn.step === 'main2'); const g = s.objects[k];
    assert.equal(g.name, 'Gideon, Battle-Forged', 'voltou transformado'); assert.equal(g.zone, 'battlefield'); assert.equal(g.counters.loyalty, 3); assert.equal(g.tapped, false, 'objeto novo: volta desvirado'); assert.equal(g.controller, 0); }
  { let { s, k, atacam } = base(2); s = passaAte(s, x => x.pending && x.pending.kind === 'attackers'); s = act(s, { t: 'attack', p: 0, attackers: atacam }); s = passaAte(s, x => x.turn.step === 'main2');
    assert.equal(s.objects[k].name, 'Kytheon, Hero of Akros', 'só uma outra atacou: não transforma'); }
});

test('CR2d.5 · Gideon, Battle-Forged: +1 dá indestrutível até o seu próximo turno e desvira; 0 vira criatura 4/4 indestrutível que continua planeswalker, sem receber dano no turno', () => {
  let s = semMao(mesa(['Kytheon, Hero of Akros', 'Faerie Seer', 'Lightning Bolt'], []), 0), k, fs, b; [s, k] = poe(s, 0, 'Kytheon, Hero of Akros'); [s, fs] = poe(s, 0, 'Faerie Seer'); [s, b] = poe(s, 0, 'Lightning Bolt', 'hand'); s = comoGideon(s, k); s.objects[fs].tapped = true;
  const mais1 = legais(s, 0, x => x.t === 'activate' && x.oid === k && x.targets && x.targets[0].oid === fs); assert.equal(mais1.length, 1);
  let t = tudo(act(s, mais1[0])); assert.equal(t.objects[k].counters.loyalty, 4); assert.equal(t.objects[fs].tapped, false, 'Untap that creature'); assert.ok(E.hasKeyword(t, t.objects[fs], 'indestructible'));
  const turno = t.turn.number; t = passaAte(t, x => x.turn.number === turno + 1 && x.turn.step === 'main1'); assert.ok(E.hasKeyword(t, t.objects[fs], 'indestructible'), 'até o seu próximo turno: vale no turno do oponente');
  const zero = legais(s, 0, x => x.t === 'activate' && x.oid === k && !x.targets && E.isCreature(s, s.objects[k]) === false); assert.ok(zero.length >= 1);
  let u = tudo(act(s, zero.find(x => x.index === Math.max(...zero.map(y => y.index))))); const g = u.objects[k];
  assert.ok(E.isCreature(u, g) && E.tiposDe(u, g).includes('planeswalker'), "4/4 creature that's still a planeswalker"); assert.equal(`${E.stats(u, g).power}/${E.stats(u, g).toughness}`, '4/4'); assert.ok(E.hasKeyword(u, g, 'indestructible'));
  u = tudo(act(comMana(u, 'R'), legais(comMana(u, 'R'), 0, x => x.t === 'cast' && x.oid === b && x.targets[0].oid === k)[0])); assert.equal(u.objects[k].counters.loyalty, 3, 'Prevent all damage that would be dealt to him this turn'); assert.equal(u.objects[k].damage, 0);
});
