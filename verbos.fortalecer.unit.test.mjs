// V-3 · CR 701.39 fortalecer e CR 701.41 apoiar. Texto oficial em .listas/oficiais-verbos.json (Oracle do Forge, 11/10/2026):
// Cached Defenses — "Bolster 3." · Shoulder to Shoulder — "Support 2. (Put a +1/+1 counter on each of up to two target creatures.) Draw a card."
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { E, J, act, poe, legais, mesa, comMana, tudo, criatura, conjura } from './verbos.mjs';
const { scripts: S, table: T } = loadModules();
const URSO = criatura('Urso de Teste 3/3', 3, 3), LOBO = criatura('Lobo de Teste 2/4', 2, 4), GATO = criatura('Gato de Teste 1/3', 1, 3), RATO = criatura('Rato de Teste 1/1', 1, 1),
  FANTASMA = criatura('Fantasma de Teste 2/2', 2, 2, { keywords: ['Hexproof'] });
function arma(magica, meus, deles, mana = 'GGG') {
  let s = mesa([magica, ...meus], deles), m, a = [], b = [];
  [s, m] = poe(s, 0, magica, 'hand');
  for (const n of meus) { let o; [s, o] = poe(s, 0, n); a.push(o); }
  for (const n of deles) { let o; [s, o] = poe(s, 1, n); b.push(o); }
  return [comMana(s, mana), m, a, b];
}
const ateDecisao = s => { for (let i = 0; i < 10 && !s.pending && s.stack.length; i++) s = act(s, { t: 'pass', p: s.turn.priority }); return s; };

test('CR 701.39 · fortalecer: os marcadores vão na sua criatura de menor resistência, sem alvo e sem pergunta quando só há uma', () => {
  const [s, m, [urso, rato], [rato2]] = arma('Cached Defenses', [URSO, RATO], [RATO]);
  const ofertas = legais(s, 0, a => a.t === 'cast' && a.oid === m);
  assert.ok(ofertas.length === 1 && !(ofertas[0].targets || []).length, 'não mira');
  const r = tudo(conjura(s, 0, m));
  assert.equal(r.objects[rato].counters.p1p1, 3); assert.equal(r.objects[urso].counters.p1p1 || 0, 0); assert.equal(r.objects[rato2].counters.p1p1 || 0, 0, 'a do oponente não conta');
});

test('CR 701.39 · fortalecer: com empate na menor resistência, quem controla escolhe entre as empatadas (e só entre elas)', () => {
  let [s, m, [urso, gato, lobo]] = arma('Cached Defenses', [URSO, GATO, LOBO], []);
  s = ateDecisao(conjura(s, 0, m));
  assert.equal(s.pending.kind, 'pick'); assert.deepEqual([...s.pending.from].sort(), [urso, gato].sort(), 'Urso 3/3 e Gato 1/3 empatam em resistência 3; o Lobo 2/4 fica de fora');
  assert.equal(s.pending.min, 1, 'a escolha é obrigatória');
  assert.throws(() => act(s, { t: 'pick_done', p: 0 }));
  s = tudo(act(s, { t: 'pick', p: 0, oid: gato }));
  assert.equal(s.objects[gato].counters.p1p1, 3); assert.equal(s.objects[urso].counters.p1p1 || 0, 0);
});

test('CR 701.39 · fortalecer: vale a resistência de agora (marcadores contam), funciona em criatura com resistência a magia, e sem criatura nada acontece', () => {
  let [s, m, [urso, gato]] = arma('Cached Defenses', [URSO, GATO], []);
  s = J(s); s.objects[gato].counters.p1p1 = 1; // Gato 2/4: agora o Urso 3/3 é o de menor resistência
  let r = tudo(conjura(s, 0, m)); assert.equal(r.objects[urso].counters.p1p1, 3); assert.equal(r.objects[gato].counters.p1p1, 1);
  const [h, mh, [fantasma]] = arma('Cached Defenses', [FANTASMA, URSO], []);
  r = tudo(conjura(h, 0, mh)); assert.equal(r.objects[fantasma].counters.p1p1, 3, 'não é alvo: a resistência a magia não impede');
  const [v, mv] = arma('Cached Defenses', [], [RATO]);
  r = tudo(conjura(v, 0, mv)); assert.equal(r.pending, null); assert.equal(r.objects[mv].zone, 'graveyard');
  const erros = effects => S.validateScript({ name: 'X', effects, example: { target: 'none', expect: { handDelta: 0 } } }).join(' | ');
  assert.match(erros([{ do: 'bolster' }]), /amount/); assert.match(erros([{ do: 'bolster', amount: 1 }, { do: 'damage', amount: 1, target: 'any' }]), /efeito com alvo depois de uma escolha/);
  assert.equal(T.descreveEfeitos(S.SCRIPTS['Cached Defenses'].effects), 'fortalece 3 (põe 3 marcadores +1/+1 na sua criatura de menor resistência)');
});

test('CR 701.41 · apoiar N numa mágica: um marcador +1/+1 em cada uma de até N criaturas alvo — zero, uma ou duas, suas ou não, nunca a mesma duas vezes', () => {
  const [s, m, [urso, gato], [rato]] = arma('Shoulder to Shoulder', [URSO, GATO], [RATO], 'WWW');
  const ofertas = legais(s, 0, a => a.t === 'cast' && a.oid === m), n = k => ofertas.filter(a => (a.targets || []).filter(Boolean).length === k).length;
  assert.ok(n(0) >= 1, 'pode ser conjurada sem alvo'); assert.ok(n(1) >= 3, 'com um alvo: qualquer das três criaturas'); assert.ok(n(2) >= 3, 'com dois alvos');
  assert.ok(!ofertas.some(a => (a.targets || []).length === 2 && a.targets[0] && a.targets[1] && a.targets[0].oid === a.targets[1].oid), 'nunca a mesma criatura duas vezes');
  const mao = s.zones[0].hand.length;
  let r = tudo(conjura(s, 0, m, [urso, rato]));
  assert.equal(r.objects[urso].counters.p1p1, 1); assert.equal(r.objects[rato].counters.p1p1, 1, 'a do oponente também pode'); assert.equal(r.objects[gato].counters.p1p1 || 0, 0);
  assert.equal(r.zones[0].hand.length, mao, 'e compra a carta');
  r = tudo(act(s, ofertas.find(a => !(a.targets || []).filter(Boolean).length)));
  assert.equal(r.zones[0].hand.length, mao, 'sem alvo nenhum, ainda compra'); assert.equal(r.objects[urso].counters.p1p1 || 0, 0);
});

test('CR 701.41 · apoiar N numa permanente: "each of up to N other target creatures" — a própria fonte não é alvo', () => {
  let s = mesa([URSO, GATO], [RATO]), urso, gato, rato; [s, urso] = poe(s, 0, URSO); [s, gato] = poe(s, 0, GATO); [s, rato] = poe(s, 1, RATO);
  const apoio = { do: 'counters', amount: 1, target: { tipos: ['creature'], outra: true }, upTo: true, targetCount: 2 };
  assert.deepEqual([...S.validateScript({ name: 'X', abilities: [{ kind: 'triggered', when: 'etb', effects: [apoio] }], example: { action: 'etb', target: 'none', expect: { attached: false } } })], []);
  const alvos = [...E.legalTargets(s, 0, apoio.target, urso)].map(t => t.oid).sort();
  assert.deepEqual(alvos, [gato, rato].sort(), 'as outras criaturas, de qualquer jogador; a fonte não');
  // a habilidade na pilha, com os dois alvos escolhidos: um marcador em cada
  s = J(s); const um = { do: 'counters', amount: 1, target: apoio.target, upTo: true };
  s.objects.habv = { oid: 'habv', ability: true, name: 'Teste', source: urso, effects: [um, um], owner: 0, controller: 0, zone: 'stack', tapped: false, sick: false, damage: 0, counters: {}, targets: [{ oid: gato }, { oid: rato }] };
  s.stack.push('habv'); s = tudo(s);
  assert.equal(s.objects[gato].counters.p1p1, 1); assert.equal(s.objects[rato].counters.p1p1, 1); assert.equal(s.objects[urso].counters.p1p1 || 0, 0);
});
