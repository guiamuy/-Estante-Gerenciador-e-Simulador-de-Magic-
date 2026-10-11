// V-7 · CR 701.10 dobrar e CR 701.11 triplicar. Texto oficial em .listas/oficiais-verbos.json (Oracle do Forge e mtggoldfish, 11/10/2026):
// Unleash Fury — "Double the power of target creature until end of turn." · Beacon of Immortality — "Double target player's life total.
// Shuffle Beacon of Immortality into its owner's library."
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { E, J, poe, mesa, comMana, tudo, criatura, conjura, passaAte } from './verbos.mjs';
const { scripts: S, table: T } = loadModules();
const URSO = criatura('Urso de Teste 3/3', 3, 3), LOBO = criatura('Lobo de Teste 2/4', 2, 4);
const fonte = (p = 0) => ({ oid: 'hab', name: 'Teste', controller: p, ability: true, source: null, effects: [], targets: [] });
const pt = (s, oid) => { const x = E.stats(s, s.objects[oid]); return [x.power, x.toughness]; };
const aplica = (s, eff, tgt) => { s = J(s); const ev = []; E.applyEffect(s, fonte(), eff, tgt, ev); return [s, ev]; };

test('CR 701.10 · dobrar o poder (b): a criatura recebe +X/+0, X = o poder dela ao resolver, até o fim do turno; não fixa o valor (a) — o que vier depois soma por cima', () => {
  let s = mesa(['Unleash Fury', URSO], []), m, urso; [s, m] = poe(s, 0, 'Unleash Fury', 'hand'); [s, urso] = poe(s, 0, URSO);
  s = J(s); s.objects[urso].counters.p1p1 = 1; // 4/4 ao resolver
  let r = tudo(conjura(comMana(s, 'RR'), 0, m, [urso]));
  assert.deepEqual(pt(r, urso), [8, 4], 'dobrou o poder de agora (4), a resistência fica');
  r = J(r); r.objects[urso].counters.p1p1 = 2; assert.deepEqual(pt(r, urso), [9, 5], 'efeito que soma: o marcador novo entra por cima do +4');
  const fim = passaAte(r, x => x.turn.active === 1); assert.deepEqual(pt(fim, urso), [5, 5], 'acaba no fim do turno');
});

test('CR 701.10 · dobrar poder e resistência (b) e valor negativo (c): a conta é a mesma — poder −2 dobrado vira −4', () => {
  let s = mesa([URSO, LOBO], []), urso, lobo; [s, urso] = poe(s, 0, URSO); [s, lobo] = poe(s, 0, LOBO);
  let [r] = aplica(s, { do: 'dobrar', o: 'poder-resistencia', target: 'creature' }, { oid: lobo }); assert.deepEqual(pt(r, lobo), [4, 8]);
  [r] = aplica(s, { do: 'dobrar', o: 'resistencia', target: 'creature' }, { oid: lobo }); assert.deepEqual(pt(r, lobo), [2, 8]);
  let n = J(s); E.applyEffect(n, fonte(), { do: 'pump', power: -5, toughness: 0, target: 'creature' }, { oid: urso }, []); assert.deepEqual(pt(n, urso), [-2, 3]);
  E.applyEffect(n, fonte(), { do: 'dobrar', o: 'poder-resistencia', target: 'creature' }, { oid: urso }, []);
  assert.deepEqual(pt(n, urso), [-4, 6], 'um valor negativo e o outro não: −X/+Y');
});

test('CR 701.11 · triplicar poder e resistência: +X/+Y com X e Y iguais a duas vezes os valores de agora', () => {
  let s = mesa([URSO], []), urso; [s, urso] = poe(s, 0, URSO);
  let [r] = aplica(s, { do: 'dobrar', vezes: 3, o: 'poder-resistencia', target: 'creature' }, { oid: urso }); assert.deepEqual(pt(r, urso), [9, 9]);
  [r] = aplica(s, { do: 'dobrar', vezes: 3, o: 'poder', target: 'creature' }, { oid: urso }); assert.deepEqual(pt(r, urso), [9, 3]);
  let n = J(s); E.applyEffect(n, fonte(), { do: 'pump', power: -4, toughness: 0, target: 'creature' }, { oid: urso }, []);
  E.applyEffect(n, fonte(), { do: 'dobrar', vezes: 3, o: 'poder', target: 'creature' }, { oid: urso }, []); assert.deepEqual(pt(n, urso), [-3, 3], '701.11c: −1 triplicado é −3');
});

test('CR 701.10 · dobrar o total de vida (d): o jogador ganha (ou perde) o que falta para ficar com o dobro — Beacon of Immortality, que depois é embaralhada no grimório', () => {
  let s = mesa(['Beacon of Immortality'], []), m; [s, m] = poe(s, 0, 'Beacon of Immortality', 'hand'); s = J(s); s.players[1].life = 7;
  const beacon = { name: 'Beacon of Immortality', effects: [{ do: 'dobrar', o: 'vida', target: 'player' }, { do: 'embaralha_esta' }] }; // script fora da biblioteca: o cenário S8 exige cemitério (ver ROADMAP V-7)
  assert.deepEqual([...S.validateScript({ ...beacon, example: { target: 'self-player', expect: { selfLife: 20 } } })], []); s.facts['Beacon of Immortality'] = { ...s.facts['Beacon of Immortality'], script: beacon };
  const r = tudo(conjura(comMana(s, 'WWWWWW'), 0, m, [{ player: 1 }]));
  assert.equal(r.players[1].life, 14); assert.equal(r.players[0].life, 20); assert.equal(r.objects[m].zone, 'library', 'a mágica volta ao grimório do dono');
  let [n] = aplica(s, { do: 'dobrar', o: 'vida', target: 'self' }, null); assert.equal(n.players[0].life, 40); assert.equal(n.players[0].lifeGained || 20, 20, 'é ganho de vida');
  let neg = J(s); neg.players[0].life = -3; E.applyEffect(neg, fonte(), { do: 'dobrar', o: 'vida', target: 'self' }, null, []); assert.equal(neg.players[0].life, -6, 'total negativo: perde vida');
});

test('CR 701.10 · dobrar marcadores (e) e mana (f): recebe tantos quantos já tem daquele tipo; sem nenhum, nada', () => {
  let s = mesa([URSO, LOBO], []), urso, lobo; [s, urso] = poe(s, 0, URSO); [s, lobo] = poe(s, 0, LOBO); s = J(s); s.objects[urso].counters = { p1p1: 3, charge: 2 };
  let [r, ev] = aplica(s, { do: 'dobrar', o: 'marcadores', tipo: 'p1p1', target: 'creature' }, { oid: urso });
  assert.deepEqual(J(r.objects[urso].counters), { p1p1: 6, charge: 2 }, 'só o tipo pedido'); assert.ok(ev.some(e => e.do === 'counters' && e.amount === 3));
  [r] = aplica(s, { do: 'dobrar', o: 'marcadores', tipo: 'charge', target: 'permanent' }, { oid: urso }); assert.equal(r.objects[urso].counters.charge, 4);
  [r, ev] = aplica(s, { do: 'dobrar', o: 'marcadores', tipo: 'p1p1', target: 'creature' }, { oid: lobo }); assert.equal(r.objects[lobo].counters.p1p1 || 0, 0); assert.ok(!ev.some(e => e.do === 'counters'));
  let v = J(s); v.players[1].poison = 2; E.applyEffect(v, fonte(), { do: 'dobrar', o: 'marcadores', tipo: 'poison', target: 'opponent' }, { player: 1 }, []); assert.equal(v.players[1].poison, 4, 'marcadores de veneno do jogador');
  const comG = comMana(s, 'GGG'); [r] = aplica(comG, { do: 'dobrar', o: 'mana', cor: 'G' }, null); assert.equal(r.players[0].pool.G, 6); assert.equal(r.players[0].pool.R, 0);
});

test('CR 701.10 · dobrar: o validador e a frase em português', () => {
  const erros = effects => S.validateScript({ name: 'X', effects, example: { target: 'own-creature', expect: { stats: [4, 2] } } }).join(' | ');
  assert.match(erros([{ do: 'dobrar', target: 'creature' }]), /"o" precisa ser/); assert.match(erros([{ do: 'dobrar', o: 'poder', vezes: 4, target: 'creature' }]), /2 ou 3/);
  assert.match(erros([{ do: 'dobrar', o: 'vida', target: 'creature' }]), /é de jogador/); assert.match(erros([{ do: 'dobrar', o: 'marcadores', target: 'creature' }]), /precisa do tipo/);
  assert.match(erros([{ do: 'dobrar', o: 'poder', target: 'player' }]), /são de criatura/);
  assert.equal(T.descreveEfeitos(S.SCRIPTS['Unleash Fury'].effects), 'dobra o poder de uma criatura até o fim do turno');
  assert.equal(T.descreveEfeitos([{ do: 'dobrar', o: 'vida', target: 'player' }]), 'dobra o total de vida de um jogador');
  assert.equal(T.descreveEfeitos([{ do: 'dobrar', vezes: 3, o: 'poder-resistencia', target: 'self-source' }]), 'triplica o poder e a resistência de esta permanente até o fim do turno');
});
