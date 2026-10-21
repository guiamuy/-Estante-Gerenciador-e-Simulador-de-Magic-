// M-546 · LT208 · revisão por lote CLXXXIV (texto da Scryfall de 21/10/2026): Oni-Cult Anvil ("Whenever one or more artifacts you control leave
// the battlefield during your turn, create a 1/1 colorless Construct artifact creature token. This ability triggers only once each turn. / {T},
// Sacrifice an artifact: This artifact deals 1 damage to each opponent. You gain 1 life."). Gatilho de saída (olha para trás, 603.10a) só no seu
// turno, uma vez por turno (603.2h). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const OA = 'Oni-Cult Anvil';
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: ['B', 'R'] }; };
const C = { [OA]: of(OA) };
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Swamp: terra('Swamp', 'Swamp', 'B'), Mountain: terra('Mountain', 'Mountain', 'R'),
  Pedra: { name: 'Pedra', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] },
  Quebra: { name: 'Quebra', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: '', colors: ['R'] } });
const SCRIPTS = { Quebra: { name: 'Quebra', effects: [{ do: 'destroy', target: 'artifact' }], example: { target: 'none', expect: { selfLife: 0 } } } };
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 228, mode: 'full', cards: C, scripts: SCRIPTS, first: 0, players: [{ name: 'A', deck: b([OA, 'Pedra', 'Swamp']) }, { name: 'B', deck: b(['Quebra', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const limpa = s => passaAte(s, x => !x.stack.length && !x.pending && !(x.queued || []).length);
const construtos = s => s.zones[0].battlefield.filter(o => s.objects[o].name === 'Construct').length;
const sacrifica = (s, a, x) => limpa(act(s, legais(s, 0, k => k.t === 'activate' && k.oid === a && k.pay && [].concat(k.pay.sacrifice)[0] === x)[0]));

test('M-546 · Oni-Cult Anvil joga (lida e aprovada)', () => { assert.equal(S.coverage(of(OA)).level, 'completo'); });

test('M-546 · no seu turno, o primeiro artefato que sai cria um Construto; o segundo no mesmo turno não; no turno seguinte, de novo', () => {
  let s = mesa(), a, p1, p2; [s, a] = poe(s, 0, OA); [s, p1] = poe(s, 0, 'Pedra'); [s, p2] = poe(s, 0, 'Pedra');
  const v = [s.players[0].life, s.players[1].life]; s = sacrifica(s, a, p1);
  assert.equal(construtos(s), 1, 'um Construto'); assert.deepEqual([s.players[0].life - v[0], v[1] - s.players[1].life], [1, 1], 'ganha 1 e o oponente perde 1');
  s = J(s); s.objects[a].tapped = false; s = sacrifica(s, a, p2); assert.equal(construtos(s), 1, 'uma vez por turno');
  let t = mesa(), a2, q1, q2; [t, a2] = poe(t, 0, OA); [t, q1] = poe(t, 0, 'Pedra'); [t, q2] = poe(t, 0, 'Pedra'); t = sacrifica(t, a2, q1);
  t = passaAte(t, x => x.turn.active === 0 && x.turn.number > 2 && x.turn.step === 'main1' && !x.stack.length && !x.pending); t = sacrifica(t, a2, q2);
  assert.equal(construtos(t), 2, 'no turno seguinte seu, dispara de novo');
});

test('M-546 · no turno do oponente, não dispara; sacrificar a própria bigorna no seu turno dispara (olha para trás)', () => {
  let s = mesa(), a, p1; [s, a] = poe(s, 0, OA); [s, p1] = poe(s, 0, 'Pedra');
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending); s = act(s, { t: 'pass', p: 1 });
  s = sacrifica(s, a, p1); assert.equal(s.objects[p1].zone, 'graveyard'); assert.equal(construtos(s), 0, 'turno do oponente: nada');
  let t = mesa(), a2; [t, a2] = poe(t, 0, OA); t = sacrifica(t, a2, a2);
  assert.equal(t.objects[a2].zone, 'graveyard'); assert.equal(construtos(t), 1, 'a própria bigorna sacrificada: Construto');
});
