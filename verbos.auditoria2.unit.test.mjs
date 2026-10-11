// V-11 · auditoria independente do lote 2 da trilha verbos (monstruosidade, dobrar/triplicar, trocar, investigar, descobrir), feita por
// revisor sem acesso à implementação, com o texto das Comprehensive Rules e 11 sondas. Cada divergência do código da trilha virou teste
// aqui antes da correção; as que são de código anterior do motor estão declaradas no ROADMAP (V-11) e no mapa.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';
import { E, J, act, poe, legais, mesa, comMana, tudo, criatura, conjura, passaAte, CARTAS } from './verbos.mjs';
const { scripts: S } = loadModules();
for (const c of JSON.parse(readFileSync(new URL('./.listas/oficiais-motor.json', import.meta.url), 'utf8')).cartas) if (!CARTAS[c.name]) CARTAS[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost || '', cmc: 1, keywords: [], oracle_text: c.oracle_text || '', colors: [] };
const URSO = criatura('Urso de Teste 3/3', 3, 3), GATO = criatura('Gato de Teste 2/2', 2, 2), LOBO = criatura('Lobo de Teste 2/4', 2, 4), RATO = criatura('Rato de Teste 1/1', 1, 1);
const fonte = (p = 0) => ({ oid: 'hab', name: 'Teste', controller: p, ability: true, source: null, effects: [], targets: [] });
const pt = (s, o) => { const st = E.stats(s, s.objects[o]); return [st.power, st.toughness]; };
const sai = (st, oid, p) => { st = J(st); st.zones[p].battlefield.splice(st.zones[p].battlefield.indexOf(oid), 1); st.zones[p].exile.push(oid); st.objects[oid].zone = 'exile'; return st; };

test('V-11 · auditoria 1.3 (701.10e, 614.16): dobrar marcadores de qualquer tipo é pôr marcadores — o dobrador de marcadores (Doubling Season) vale também fora do +1/+1; o mesmo no proliferar', () => {
  let s = mesa([URSO, 'Doubling Season'], []), u; [s, u] = poe(s, 0, URSO); [s] = poe(s, 0, 'Doubling Season'); s = J(s);
  s.objects[u].counters = { p1p1: 3, charge: 2 };
  let a = J(s); E.applyEffect(a, fonte(), { do: 'dobrar', o: 'marcadores', tipo: 'charge', target: 'permanent' }, { oid: u }, []);
  assert.equal(a.objects[u].counters.charge, 6, '2 + (2 dobrados pela Doubling Season)');
  let b = J(s); E.applyEffect(b, fonte(), { do: 'proliferate' }, null, []); b = tudo(act(b, { t: 'pick', p: 0, oid: u }));
  assert.equal(b.objects[u].counters.charge, 4, 'proliferar: +1 vira +2'); assert.equal(b.objects[u].counters.p1p1, 5);
});

test('V-11 · auditoria 1.4 (701.12a, 608.2b): a anotação de "trocar com" e a de quem luta não sobrevivem para outra conjuração da mesma carta', () => {
  let s = mesa(['Switcheroo', URSO, GATO], [LOBO, RATO]), m, urso, gato, lobo, rato;
  [s, m] = poe(s, 0, 'Switcheroo', 'hand'); [s, urso] = poe(s, 0, URSO); [s, gato] = poe(s, 0, GATO); [s, lobo] = poe(s, 1, LOBO); [s, rato] = poe(s, 1, RATO);
  let r = tudo(sai(conjura(comMana(s, 'UUUUU'), 0, m, [urso, lobo]), lobo, 1)); // o segundo alvo saiu: nada trocado
  r = J(r); r.zones[0].graveyard.splice(r.zones[0].graveyard.indexOf(m), 1); r.zones[0].hand.push(m); r.objects[m].zone = 'hand'; r.objects[m].zc = (r.objects[m].zc || 0) + 1; // a mesma carta volta à mão
  const n = tudo(sai(conjura(comMana(r, 'UUUUU'), 0, m, [gato, rato]), gato, 0)); // agora o primeiro alvo saiu
  assert.equal(n.objects[urso].controller, 0, 'o Urso não era alvo desta vez'); assert.equal(n.objects[rato].controller, 1, 'e nada é trocado');
  // o mesmo com a luta
  let l = mesa(['Prey Upon', URSO, GATO], [LOBO, RATO]), p, u2, g2, l2, r2;
  [l, p] = poe(l, 0, 'Prey Upon', 'hand'); [l, u2] = poe(l, 0, URSO); [l, g2] = poe(l, 0, GATO); [l, l2] = poe(l, 1, LOBO); [l, r2] = poe(l, 1, RATO);
  let x = tudo(sai(conjura(comMana(l, 'GG'), 0, p, [u2, l2]), l2, 1));
  x = J(x); x.zones[0].graveyard.splice(x.zones[0].graveyard.indexOf(p), 1); x.zones[0].hand.push(p); x.objects[p].zone = 'hand'; x.objects[p].zc = (x.objects[p].zc || 0) + 1;
  const y = tudo(sai(conjura(comMana(x, 'GG'), 0, p, [g2, r2]), g2, 0));
  assert.equal(y.objects[r2].damage, 0, 'o Urso anotado na conjuração anterior não luta'); assert.equal(y.objects[r2].zone, 'battlefield');
});

test('V-11 · auditoria 1.1 (701.12g): trocar vida com a resistência fixa só a resistência — um "torna-se 1/1 até o fim do turno" que estava valendo não fica preso no poder para sempre', () => {
  let s = mesa(['Tree of Perdition'], []), arv; [s, arv] = poe(s, 0, 'Tree of Perdition'); s = J(s);
  s.facts['Tree of Perdition'] = { ...s.facts['Tree of Perdition'], script: { name: 'Tree of Perdition', effects: [], abilities: [{ kind: 'activated', cost: { tap: true }, effects: [{ do: 'trocar', o: 'vida-resistencia', target: 'opponent' }] }] } };
  let n = J(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === arv)[0]));
  E.applyEffect(n, fonte(1), { do: 'continuo', target: 'creature', torna: { base: [1, 1] }, ate: 'fim-do-turno' }, { oid: arv }, []);
  n = tudo(n); assert.equal(n.players[1].life, 1, 'a resistência era 1 ao resolver');
  n = passaAte(n, x => x.turn.active === 1 && x.turn.step === 'main1');
  assert.deepEqual(pt(n, arv), [0, 20], 'depois que o 1/1 acaba, só a resistência continua fixada em 20');
});

test('V-11 · auditoria 1.6 e validador: "Monstrosity X" com X no custo da habilidade ainda não existe — o validador recusa em vez de aceitar uma monstruosidade de zero; quantidades negativas não valem', () => {
  const hab = amount => S.validateScript({ name: 'X', abilities: [{ kind: 'activated', cost: { mana: '{X}{G}' }, effects: [{ do: 'monstrosity', amount }] }], example: { action: 'activate:0', target: 'none', expect: { counters: 1 } } }).join(' | ');
  assert.match(hab({ per: 'x' }), /X no custo de habilidade ativada/); assert.match(hab(0), /inteiro positivo/); assert.equal(hab(3), '');
  const inv = amount => S.validateScript({ name: 'X', effects: [{ do: 'investigate', amount }], example: { target: 'none', expect: { tokens: 1 } } }).join(' | ');
  assert.match(inv(-1), /não pode ser negativo/); assert.equal(inv(2), '');
});
