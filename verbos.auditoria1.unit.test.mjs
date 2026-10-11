// V-5 · auditoria independente do lote 1 da trilha verbos (lutar, proliferar, fortalecer, apoiar, povoar), feita por revisor sem acesso
// à implementação, com o texto das Comprehensive Rules e sondas executadas. Cada divergência reproduzida virou teste aqui antes da correção.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { E, J, act, poe, legais, mesa, comMana, tudo, criatura, conjura, CARTAS } from './verbos.mjs';
const { scripts: S } = loadModules();
const A = criatura('Urso de Teste 3/3', 3, 3, { colors: ['G'] }), C = criatura('Rato de Teste 1/1', 1, 1), B = criatura('Lobo de Teste 2/4', 2, 4);
const BIRD = { name: 'Bird', types: ['creature'], subtypes: ['Bird'], colors: ['W'], power: 1, toughness: 1, keywords: ['flying'] };
const GATO = { name: 'Cat', types: ['creature'], subtypes: ['Cat'], colors: ['W'], power: 2, toughness: 2 };
const comScript = (s, name, sc) => { s = J(s); s.facts[name] = { ...s.facts[name], script: { name, effects: [], ...sc } }; return s; };
const fichas = (s, p = 0) => [...s.zones[p].battlefield].filter(o => s.objects[o].token).map(o => s.objects[o].name).sort();
/** Criatura com gatilho de entrada opcional ("you may"): conjura, responde "sim" e devolve o estado logo depois do sim. */
function gatilhoOpcional(nome, effects, prep = () => {}) {
  const T = criatura(nome, 1, 1);
  let s = mesa([T, A, C], [B]), t, a, c, b; [s, a] = poe(s, 0, A); [s, c] = poe(s, 0, C); [s, b] = poe(s, 1, B); [s, t] = poe(s, 0, T, 'hand');
  s = comScript(s, T, { abilities: [{ kind: 'triggered', when: 'etb', optional: true, effects }] }); prep(s, a, c);
  s = comMana(s, 'CC'); s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === t)[0]);
  for (let i = 0; i < 20 && !(s.pending && s.pending.kind === 'may_pay'); i++) s = act(s, s.pending ? legais(s, s.pending.p)[0] : { t: 'pass', p: s.turn.priority }); // alvos do gatilho (se houver) e passes até a pergunta
  return { s, a, c, b, t };
}
const sim = s => act(s, { t: 'pay', p: 0 });

test('V-5 · auditoria D2 (608.2c): num gatilho "você pode", o que vem depois de um verbo com escolha espera a escolha — proliferar e depois comprar', () => {
  let { s, a } = gatilhoOpcional('Opcional D2a', [{ do: 'proliferate' }, { do: 'draw', amount: 1 }], (st, x) => { st.objects[x].counters = { p1p1: 1 }; });
  const mao = s.zones[0].hand.length; s = sim(s);
  assert.equal(s.pending && s.pending.kind, 'pick'); assert.equal(s.zones[0].hand.length, mao, 'a compra espera a escolha');
  s = tudo(act(s, { t: 'pick', p: 0, oid: a }));
  assert.equal(s.objects[a].counters.p1p1, 2); assert.equal(s.zones[0].hand.length, mao + 1);
});

test('V-5 · auditoria D2: dois verbos com escolha no mesmo gatilho opcional acontecem os dois, em ordem (proliferar duas vezes; proliferar e povoar)', () => {
  let { s, a } = gatilhoOpcional('Opcional D2b', [{ do: 'proliferate' }, { do: 'proliferate' }], (st, x, y) => { st.objects[x].counters = { p1p1: 1 }; st.objects[y].counters = { p1p1: 1 }; });
  s = sim(s); s = act(act(s, { t: 'pick', p: 0, oid: a }), { t: 'pick_done', p: 0 });
  assert.equal(s.pending && s.pending.kind, 'pick', 'a segunda proliferação abre a própria escolha'); assert.equal(s.objects[a].counters.p1p1, 2);
  s = tudo(act(act(s, { t: 'pick', p: 0, oid: a }), { t: 'pick_done', p: 0 })); assert.equal(s.objects[a].counters.p1p1, 3);
  let r = gatilhoOpcional('Opcional D2c', [{ do: 'token', amount: 2, token: BIRD }, { do: 'proliferate' }, { do: 'populate' }], (st, x) => { st.objects[x].counters = { p1p1: 1 }; });
  s = sim(r.s); assert.equal(s.pending.label, 'proliferar', 'primeiro a escolha de proliferar');
  s = act(s, { t: 'pick', p: 0, oid: r.a }); // única permanente com marcador: a escolha fecha sozinha
  assert.equal(s.pending && s.pending.label, 'povoar'); s = tudo(act(s, { t: 'pick', p: 0, oid: s.pending.from[0] }));
  assert.equal(s.objects[r.a].counters.p1p1, 2, 'proliferou'); assert.deepEqual(fichas(s), ['Bird', 'Bird', 'Bird'], 'e povoou');
  assert.equal(s.proliferar, undefined); assert.equal(s.escolhaV, undefined); assert.equal(s.verbo, undefined);
});

test('V-5 · auditoria D2: fortalecer com empate e depois comprar, em gatilho opcional — a compra vem depois da escolha', () => {
  let { s, c } = gatilhoOpcional('Opcional D2d', [{ do: 'bolster', amount: 1 }, { do: 'draw', amount: 1 }], (st, x) => { st.objects[x].counters = { m1m1: 2 }; }); // Urso 1/1, Rato 1/1 e a própria 1/1 empatam
  const mao = s.zones[0].hand.length; s = sim(s);
  assert.equal(s.pending && s.pending.kind, 'pick'); assert.equal(s.zones[0].hand.length, mao);
  s = tudo(act(s, { t: 'pick', p: 0, oid: c })); assert.equal(s.objects[c].counters.p1p1, 1); assert.equal(s.zones[0].hand.length, mao + 1);
});

test('V-5 · auditoria D3 (701.14a): a luta de "criatura sua alvo luta com criatura alvo" acontece também num gatilho opcional', () => {
  let { s, a, b } = gatilhoOpcional('Opcional D3', [{ do: 'lutador', target: 'creature-you-control' }, { do: 'fight', quem: 'primeiro-alvo', target: 'creature-opponent-controls' }]);
  const alvos = s.pending.then.targets.map(t => t.oid); s = tudo(sim(s));
  const meu = alvos[0];
  assert.equal(s.objects[b].damage, E.stats(s, s.objects[meu]).power, 'o Lobo recebeu o poder da sua criatura'); assert.ok(s.objects[meu].damage === 2 || s.objects[meu].zone === 'graveyard', 'e ela recebeu 2 do Lobo');
});

test('V-5 · auditoria D4 (608.2b, 701.14b): a legalidade dos alvos é a do começo da resolução — um efeito anterior da mesma mágica que dá manto à sua criatura não cancela a luta', () => {
  CARTAS['Véu e Luta'] = { name: 'Véu e Luta', type_line: 'Sorcery', mana_cost: '{G}', cmc: 1, keywords: [], oracle_text: '', colors: ['G'] };
  let s = mesa(['Véu e Luta', A], [B]), m, a, b; [s, m] = poe(s, 0, 'Véu e Luta', 'hand'); [s, a] = poe(s, 0, A); [s, b] = poe(s, 1, B);
  const efeitos = [{ do: 'lutador', target: 'creature-you-control' }, { do: 'continuo', target: 'first-target', palavras: ['shroud'] }, { do: 'fight', quem: 'primeiro-alvo', target: 'creature-opponent-controls' }];
  assert.deepEqual([...S.validateScript({ name: 'Véu e Luta', effects: efeitos, example: { target: 'own-creature', expect: { gone: true } } })], []);
  s = comScript(s, 'Véu e Luta', { effects: efeitos });
  const r = tudo(conjura(comMana(s, 'G'), 0, m, [a, b]));
  assert.equal(r.objects[b].damage, 3); assert.equal(r.objects[a].damage, 2); assert.equal(E.hasKeyword(r, r.objects[a], 'shroud'), true);
  assert.equal(r.lutadorV, undefined, 'nada sobra no estado');
});

test('V-5 · auditoria D5 (701.36a): quem povoa é quem controla o efeito — a ficha vem para ele mesmo quando a mágica é de outro dono', () => {
  let s = mesa(['Eyes in the Skies'], []), m; [s, m] = poe(s, 0, 'Eyes in the Skies', 'hand'); s = J(comMana(s, 'WWWW'));
  E.applyEffect(s, { oid: 'x', name: 'F', controller: 0 }, { do: 'token', amount: 1, token: GATO }, null, []);
  s = J(conjura(s, 0, m)); s.objects[m].owner = 1;
  for (let i = 0; i < 10 && !s.pending && s.stack.length; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  s = tudo(act(s, { t: 'pick', p: 0, oid: s.pending.from[0] }));
  assert.equal(fichas(s, 0).length, 3); assert.equal(fichas(s, 1).length, 0);
});

test('V-5 · auditoria: o script de luta pede `lutador` antes de `fight` com primeiro-alvo, e o fortalecer com empate aparece no registro', () => {
  const erros = effects => S.validateScript({ name: 'X', effects, example: { target: 'own-creature', expect: { gone: true } } }).join(' | ');
  assert.match(erros([{ do: 'pump', power: 1, toughness: 1, target: 'creature-you-control' }, { do: 'fight', quem: 'primeiro-alvo', target: 'creature-opponent-controls' }]), /precisa de um `lutador` antes/);
  assert.deepEqual(J(S.SCRIPTS['Epic Confrontation'].effects.map(e => e.do)), ['lutador', 'pump', 'fight']);
});
