// R11 · cartas de Commander conferidas frase a frase contra o texto oficial (.listas/oficiais-commander.json, consultas de
// 05/10/2026). Cada teste cita a frase que o script precisa cumprir.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, comMana, tudo, alvos, CARTAS } from './cmd.mjs';
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
