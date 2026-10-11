// V-1 · CR 701.14 · lutar. Texto oficial das cartas em .listas/oficiais-verbos.json (mtg.wtf e Oracle do Forge, 11/10/2026):
// Prey Upon — "Target creature you control fights target creature you don't control."
// Epic Confrontation — "Target creature you control gets +1/+2 until end of turn. It fights target creature you don't control."
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { E, J, poe, legais, mesa, comMana, tudo, criatura, conjura } from './verbos.mjs';
const { scripts: S, table: T } = loadModules();
const URSO = criatura('Urso de Teste 3/3', 3, 3, { colors: ['G'] }), LOBO = criatura('Lobo de Teste 2/4', 2, 4, { colors: ['R'] }), MURO = criatura('Muro de Teste 0/5', 0, 5),
  VIBORA = criatura('Víbora de Teste 1/1', 1, 1, { keywords: ['Deathtouch'] }), CLERIGO = criatura('Clériga de Teste 2/2', 2, 2, { keywords: ['Lifelink'] });
/** Mesa com as criaturas pedidas em campo e a mágica na mão de A, com mana. */
function arma(magica, meus, deles) {
  let s = mesa([magica, ...meus], deles), m, a = [], b = [];
  [s, m] = poe(s, 0, magica, 'hand');
  for (const n of meus) { let o; [s, o] = poe(s, 0, n); a.push(o); }
  for (const n of deles) { let o; [s, o] = poe(s, 1, n); b.push(o); }
  return [comMana(s, 'GG'), m, a, b];
}
const fonte = (s, oid) => ({ oid: 'hab', name: s.objects[oid].name, controller: s.objects[oid].controller, ability: true, source: oid, effects: [], targets: [] });

test('CR 701.14 · lutar (a): cada criatura causa dano igual ao próprio poder à outra, e a mágica só é oferecida com os dois alvos', () => {
  let [s, m, [urso], [lobo]] = arma('Prey Upon', [URSO], [LOBO]);
  const ofertas = legais(s, 0, a => a.t === 'cast' && a.oid === m);
  assert.ok(ofertas.length > 0 && ofertas.every(a => a.targets.length === 2 && a.targets[0].oid === urso && a.targets[1].oid === lobo), 'um alvo seu e um do oponente');
  const r = tudo(conjura(s, 0, m, [urso, lobo]));
  assert.equal(r.objects[lobo].damage, 3, 'o Urso 3/3 causou 3 ao Lobo'); assert.equal(r.objects[urso].damage, 2, 'o Lobo 2/4 causou 2 ao Urso');
  assert.equal(r.objects[urso].zone, 'battlefield'); assert.equal(r.objects[lobo].zone, 'battlefield'); assert.equal(r.players[1].life, 20, 'ninguém perde vida');
  // sem criatura do outro lado, a mágica não tem como ser conjurada
  const [v, mv] = arma('Prey Upon', [URSO], []);
  assert.equal(legais(v, 0, a => a.t === 'cast' && a.oid === mv).length, 0);
});

test('CR 701.14 · lutar (a): o poder de agora conta — Epic Confrontation dá +1/+2 antes da luta', () => {
  let [s, m, [urso], [lobo]] = arma('Epic Confrontation', [URSO], [LOBO]);
  const r = tudo(conjura(comMana(s, 'C'), 0, m, [urso, lobo]));
  assert.equal(r.objects[lobo].zone, 'graveyard', '4 de dano no Lobo 2/4'); assert.equal(r.objects[urso].damage, 2); assert.equal(E.stats(r, r.objects[urso]).toughness, 5);
});

test('CR 701.14 · lutar (b): se uma das duas saiu do campo ou virou alvo ilegal, nenhuma luta nem causa dano', () => {
  const [s, m, [urso], [lobo]] = arma('Prey Upon', [URSO], [LOBO]);
  const naPilha = conjura(s, 0, m, [urso, lobo]);
  const sai = (st, oid, p) => { st = J(st); st.zones[p].battlefield.splice(st.zones[p].battlefield.indexOf(oid), 1); st.zones[p].exile.push(oid); st.objects[oid].zone = 'exile'; return st; };
  let r = tudo(sai(naPilha, lobo, 1)); assert.equal(r.objects[urso].damage, 0, 'o alvo do oponente saiu: o Urso não recebe dano');
  r = tudo(sai(naPilha, urso, 0)); assert.equal(r.objects[lobo].damage, 0, 'a sua criatura saiu: o Lobo não recebe dano'); assert.equal(r.objects[lobo].zone, 'battlefield');
  // alvo ilegal sem sair do campo: o Lobo passa para o seu controle ("creature you don't control" deixa de valer)
  let x = J(naPilha); x.zones[1].battlefield.splice(x.zones[1].battlefield.indexOf(lobo), 1); x.zones[0].battlefield.push(lobo); x.objects[lobo].controller = 0;
  r = tudo(x); assert.equal(r.objects[urso].damage, 0); assert.equal(r.objects[lobo].damage, 0, 'nenhuma das duas causa dano');
  // deixou de ser criatura (a fonte luta: "~ fights target creature"): nada acontece
  let y = J(s); y.objects[urso].zone = 'graveyard'; y.zones[0].battlefield.splice(y.zones[0].battlefield.indexOf(urso), 1); y.zones[0].graveyard.push(urso);
  const ev = []; E.applyEffect(y, fonte(y, urso), { do: 'fight', quem: 'self-source', target: 'creature' }, { oid: lobo }, ev);
  assert.equal(y.objects[lobo].damage, 0, 'a fonte saiu do campo: não luta'); assert.ok(ev.some(e => e.do === 'fight' && e.failed));
});

test('CR 701.14 · lutar (c): a criatura que luta consigo mesma causa a si o dobro do próprio poder', () => {
  const [s, , [urso]] = arma('Prey Upon', [URSO], [LOBO]);
  const y = J(s), ev = []; E.applyEffect(y, fonte(y, urso), { do: 'fight', quem: 'self-source', target: 'creature' }, { oid: urso }, ev);
  assert.equal(y.objects[urso].damage, 6); assert.equal(ev.filter(e => e.do === 'damage').length, 1, 'um dano só, de 6');
});

test('CR 701.14 · lutar (d): não é dano de combate — prevenir "todo o dano de combate" não impede, e a fonte do dano é a criatura (toque mortífero, vínculo com a vida)', () => {
  let [s, m, [vibora, cleriga], [lobo]] = arma('Prey Upon', [VIBORA, CLERIGO], [LOBO]);
  s = J(s); s.prevencoes = [{ todos: true, combate: true }];
  const r = tudo(conjura(s, 0, m, [vibora, lobo]));
  assert.equal(r.objects[lobo].zone, 'graveyard', 'toque mortífero da Víbora: 1 de dano destrói o Lobo'); assert.equal(r.objects[vibora].zone, 'graveyard', 'e o Lobo causou 2 à Víbora 1/1');
  const [t, m2, [, cleriga2], [lobo2]] = arma('Prey Upon', [VIBORA, CLERIGO], [LOBO]);
  const r2 = tudo(conjura(t, 0, m2, [cleriga2, lobo2]));
  assert.equal(r2.players[0].life, 22, 'vínculo com a vida: a Clériga causou 2 de dano'); assert.equal(r2.objects[lobo2].damage, 2);
});

test('CR 701.14 · lutar: poder 0 não causa dano (120.8) e a outra ainda causa o dela; proteção contra a cor da criatura previne o dano dela', () => {
  let [s, m, [muro], [lobo]] = arma('Prey Upon', [MURO], [LOBO]);
  let r = tudo(conjura(s, 0, m, [muro, lobo]));
  assert.equal(r.objects[lobo].damage, 0); assert.equal(r.objects[muro].damage, 2);
  // proteção contra verde no Lobo: o Urso verde não causa dano a ele, mas recebe o do Lobo
  let [p, , [u2], [l2]] = arma('Prey Upon', [URSO], [LOBO]); p = J(p);
  p.objects[l2].tempProtection = ['G'];
  const ev2 = []; E.applyEffect(p, fonte(p, u2), { do: 'fight', quem: 'self-source', target: 'creature' }, { oid: l2 }, ev2);
  assert.equal(p.objects[l2].damage, 0, 'dano do Urso verde prevenido'); assert.equal(p.objects[u2].damage, 2);
  assert.ok(ev2.some(e => e.do === 'damage' && e.prevented), 'o registro diz que foi prevenido');
});

test('CR 701.14 · lutar: o script só vale com quem luta e com alvo, e a mesa descreve em português', () => {
  const ex = { target: 'own-creature', expect: { gone: true } };
  const erros = effects => S.validateScript({ name: 'X', effects, example: ex }).join(' | ');
  assert.match(erros([{ do: 'fight', target: 'creature' }]), /"quem" precisa ser/);
  assert.match(erros([{ do: 'fight', quem: 'primeiro-alvo', target: 'creature' }]), /precisa de um alvo escolhido antes/);
  assert.match(erros([{ do: 'lutador', target: 'creature-you-control' }]), /precisa ser seguido da luta/);
  assert.match(erros([{ do: 'fight', quem: 'self-source' }]), /lutar precisa de um alvo/);
  assert.equal(erros([{ do: 'fight', quem: 'self-source', target: 'creature-opponent-controls' }]), '');
  assert.equal(T.descreveEfeitos(S.SCRIPTS['Prey Upon'].effects), 'escolhe uma criatura sua para lutar; ela luta com uma criatura de um oponente (cada uma causa dano igual ao próprio poder à outra)');
  assert.equal(T.descreveEfeitos([{ do: 'fight', quem: 'self-source', target: 'creature' }]), 'esta criatura luta com uma criatura (cada uma causa dano igual ao próprio poder à outra)');
});
