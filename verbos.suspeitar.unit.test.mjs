// V-12 · CR 701.60 · suspeitar. Texto oficial em .listas/oficiais-verbos.json (Oracle do Forge, 11/10/2026):
// Reasonable Doubt — "Counter target spell unless its controller pays {2}. Suspect up to one target creature."
// Person of Interest — "When Person of Interest enters, suspect it. Create a 2/2 white and blue Detective creature token."
// Absolving Lammasu — "When Absolving Lammasu enters, all suspected creatures are no longer suspected." (só texto: a unsuspect é sondada direto)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { E, J, act, poe, legais, mesa, comMana, tudo, criatura, conjura } from './verbos.mjs';
const { scripts: S, table: T } = loadModules();
const URSO = criatura('Urso de Teste 3/3', 3, 3), LOBO = criatura('Lobo de Teste 2/2', 2, 2);
// fora da biblioteca: o cenário S8 de permanente depende de fixtures.mjs (PERM_TYPES), que esta trilha não toca
const POI = { name: 'Person of Interest', abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'suspect', target: 'self-source' },
  { do: 'token', amount: 1, token: { name: 'Detective', types: ['creature'], subtypes: ['Detective'], colors: ['W', 'U'], power: 2, toughness: 2 } }] }],
  example: { action: 'etb', target: 'none', expect: { tokens: 1 } } };
const resolve = s => tudo(s, x => legais(x, x.pending.p)[0]);
const fonte = (p = 0) => ({ oid: 'h', name: 'T', controller: p, ability: true, source: null });
const faz = (s, eff, oid, p = 0) => { s = J(s); const ev = []; E.applyEffect(s, fonte(p), eff, oid == null ? null : { oid }, ev); return [s, ev]; };

test('CR 701.60 · suspeitar (a, c): a criatura fica suspeita, tem ameaçar e não pode bloquear; a de outro jogador também', () => {
  let s = mesa([URSO], [LOBO]), urso, lobo; [s, urso] = poe(s, 0, URSO); [s, lobo] = poe(s, 1, LOBO);
  assert.ok(E.eligibleBlockers(s, 1).includes(lobo));
  [s] = faz(s, { do: 'suspect', target: 'creature' }, lobo);
  assert.equal(E.ehSuspeita(s, s.objects[lobo]), true); assert.equal(E.hasKeyword(s, s.objects[lobo], 'menace'), true);
  assert.deepEqual(E.eligibleBlockers(s, 1), [], 'suspeita não bloqueia');
  assert.equal(E.ehSuspeita(s, s.objects[urso]), false); assert.equal(E.hasKeyword(s, s.objects[urso], 'menace'), false);
  assert.equal(s.objects[lobo].controller, 1);
});

test('CR 701.60 · suspeitar (a): dura além do turno e acaba quando a permanente sai do campo — de volta, é objeto novo, sem ameaçar e podendo bloquear', () => {
  let s = mesa([URSO], [LOBO]), lobo; [s, lobo] = poe(s, 1, LOBO);
  [s] = faz(s, { do: 'suspect', target: 'creature' }, lobo);
  for (let i = 0; i < 80 && s.turn.number < 3; i++) s = act(s, s.pending ? legais(s, s.pending.p)[0] : { t: 'pass', p: s.turn.priority });
  assert.ok(s.turn.number >= 3); assert.equal(E.ehSuspeita(s, s.objects[lobo]), true, 'não é "até o fim do turno"'); assert.equal(E.hasKeyword(s, s.objects[lobo], 'menace'), true);
  [s] = faz(s, { do: 'bounce', target: 'creature' }, lobo);
  assert.equal(s.objects[lobo].zone, 'hand'); assert.equal(E.ehSuspeita(s, s.objects[lobo]), false);
  s = J(s); E.moveObject(s, lobo, 'battlefield');
  assert.equal(E.ehSuspeita(s, s.objects[lobo]), false); assert.equal(E.hasKeyword(s, s.objects[lobo], 'menace'), false); assert.ok(E.eligibleBlockers(s, 1).includes(lobo));
});

test('CR 701.60 · suspeitar (d): a suspeita não fica suspeita de novo (nada muda, nenhuma segunda instância de ameaçar)', () => {
  let s = mesa([URSO], []), urso, ev; [s, urso] = poe(s, 0, URSO);
  [s] = faz(s, { do: 'suspect', target: 'creature' }, urso); const antes = JSON.stringify(s.objects[urso]);
  [s, ev] = faz(s, { do: 'suspect', target: 'creature' }, urso);
  assert.equal(JSON.stringify(s.objects[urso]), antes); assert.ok(ev.some(e => e.do === 'suspect' && e.amount === 0));
});

test('CR 701.60 · suspeitar (a, b): "deixa de ser suspeita" tira a designação, a ameaçar e a proibição de bloquear; "todas as criaturas suspeitas" vale para os dois lados; a designação não é copiada', () => {
  let s = mesa([URSO], [LOBO]), urso, lobo; [s, urso] = poe(s, 0, URSO); [s, lobo] = poe(s, 1, LOBO);
  [s] = faz(s, { do: 'suspect', target: 'creature' }, lobo); [s] = faz(s, { do: 'suspect', target: 'creature' }, urso);
  let [x] = faz(s, { do: 'unsuspect', target: 'creature' }, lobo);
  assert.equal(E.ehSuspeita(x, x.objects[lobo]), false); assert.equal(E.hasKeyword(x, x.objects[lobo], 'menace'), false); assert.ok(E.eligibleBlockers(x, 1).includes(lobo));
  assert.equal(E.ehSuspeita(x, x.objects[urso]), true, 'só a escolhida');
  [x] = faz(s, { do: 'unsuspect', target: 'each-creature' }, null);
  assert.equal(E.ehSuspeita(x, x.objects[lobo]), false); assert.equal(E.ehSuspeita(x, x.objects[urso]), false); assert.equal(x.objects[urso].temporarios, undefined);
  // depois de absolvida, pode ficar suspeita outra vez
  [x] = faz(x, { do: 'suspect', target: 'creature' }, urso); assert.equal(E.ehSuspeita(x, x.objects[urso]), true);
  // 701.60b: a cópia de uma criatura suspeita não é suspeita
  let c = J(s); const ev = []; E.applyEffect(c, fonte(0), { do: 'ficha_copia', target: 'creature' }, { oid: urso }, ev);
  const copia = Object.values(c.objects).find(o => o.zone === 'battlefield' && o.name === URSO && o.oid !== urso);
  assert.ok(copia, 'a cópia entrou'); assert.equal(E.ehSuspeita(c, copia), false); assert.equal(E.hasKeyword(c, copia, 'menace'), false);
});

test('CR 701.60 · suspeitar (c): ameaçar e "não pode bloquear" são habilidades — a suspeita que perde todas as habilidades depois continua suspeita, mas sem as duas', () => {
  let s = mesa([URSO], [LOBO]), lobo; [s, lobo] = poe(s, 1, LOBO);
  [s] = faz(s, { do: 'suspect', target: 'creature' }, lobo); s = J(s);
  E.aplicaTemporario(s, s.objects[lobo], { vira: { loseAbilities: true } }, 0);
  assert.equal(E.ehSuspeita(s, s.objects[lobo]), true); assert.equal(E.hasKeyword(s, s.objects[lobo], 'menace'), false); assert.ok(E.eligibleBlockers(s, 1).includes(lobo));
});

test('CR 701.60 · só criatura no campo fica suspeita; alvo que saiu não fica', () => {
  let s = mesa([URSO], []), urso, ev; [s, urso] = poe(s, 0, URSO, 'graveyard');
  [s, ev] = faz(s, { do: 'suspect', target: 'creature' }, urso);
  assert.equal(s.objects[urso].suspeita, undefined); assert.ok(ev.some(e => e.failed));
});

test('Reasonable Doubt: anula a menos que pague {2} e suspeita até uma criatura alvo — com e sem o segundo alvo, pagando ou não', () => {
  let s = mesa(['Reasonable Doubt', 'Reasonable Doubt'], [LOBO, 'Deduce']), lobo, rd, ded;
  [s, lobo] = poe(s, 1, LOBO); [s, rd] = poe(s, 0, 'Reasonable Doubt', 'hand'); [s, ded] = poe(s, 1, 'Deduce', 'hand');
  s = J(s); s.turn.active = 1; s.turn.priority = 1; s.turn.step = 'main1';
  s = conjura(comMana(s, 'UU', 1), 1, ded); if (s.turn.priority !== 0) s = act(s, { t: 'pass', p: 1 });
  const ofertas = legais(comMana(s, 'UU'), 0, a => a.t === 'cast' && a.oid === rd).map(a => (a.targets || []).length);
  assert.ok(ofertas.includes(1) && ofertas.includes(2), 'conjurável só com a mágica como alvo ("até uma") e com a criatura também');
  let x = conjura(comMana(s, 'UU'), 0, rd, [ded, lobo]);
  x = tudo(x, y => legais(y, y.pending.p).find(a => a.t === 'decline' || a.pay === false || a.t === 'pass') || legais(y, y.pending.p).slice(-1)[0]);
  assert.equal(E.ehSuspeita(x, x.objects[lobo]), true, 'o resto da mágica resolve depois da decisão de pagar'); assert.equal(x.objects[rd].zone, 'graveyard');
  let y = conjura(comMana(s, 'UU'), 0, rd, [ded]); y = resolve(y);
  assert.equal(E.ehSuspeita(y, y.objects[lobo]), false, 'sem o segundo alvo, ninguém fica suspeita');
});

test('Person of Interest: ao entrar, fica suspeita e cria um Detetive 2/2 branco e azul; o validador e as frases em português', () => {
  let s = mesa(['Person of Interest'], []), poi; [s, poi] = poe(s, 0, 'Person of Interest', 'hand');
  assert.equal(S.validateScript(POI).join(), ''); s = J(s); s.facts['Person of Interest'] = { ...s.facts['Person of Interest'], script: { ...POI, effects: [] } };
  s = resolve(act(comMana(s, 'RRRR'), legais(comMana(s, 'RRRR'), 0, a => a.t === 'cast' && a.oid === poi)[0]));
  assert.equal(s.objects[poi].zone, 'battlefield'); assert.equal(E.ehSuspeita(s, s.objects[poi]), true); assert.equal(E.hasKeyword(s, s.objects[poi], 'menace'), true);
  const det = Object.values(s.objects).find(o => o.zone === 'battlefield' && o.name === 'Detective');
  assert.ok(det); assert.deepEqual([...E.colorsOf(s, det)].sort(), ['U', 'W']); assert.equal(E.stats(s, det).power, 2); assert.equal(E.ehSuspeita(s, det), false);
  assert.match(S.validateScript({ name: 'X', effects: [{ do: 'suspect', target: 'player' }], example: { target: 'opponent', expect: { handDelta: 0 } } }).join(), /suspect/);
  assert.equal(T.descreveEfeitos([{ do: 'suspect', target: 'self-source' }]), 'esta permanente fica suspeita (tem ameaçar e não pode bloquear)');
  assert.equal(T.descreveEfeitos([{ do: 'unsuspect', target: 'each-creature' }]), 'todas as criaturas suspeitas deixam de ser suspeitas');
});

test('CR 701.60 · suspeitar (c) e 613.7: quem perdeu todas as habilidades antes e fica suspeita depois tem ameaçar e não bloqueia (o carimbo da suspeita é mais novo)', () => {
  let s = mesa([URSO], [LOBO]), lobo; [s, lobo] = poe(s, 1, LOBO); s = J(s);
  E.aplicaTemporario(s, s.objects[lobo], { vira: { loseAbilities: true } }, 0);
  [s] = faz(s, { do: 'suspect', target: 'creature' }, lobo);
  assert.equal(E.hasKeyword(s, s.objects[lobo], 'menace'), true); assert.deepEqual(E.eligibleBlockers(s, 1), []);
});
