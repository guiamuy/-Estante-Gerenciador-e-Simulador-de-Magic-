// M-543 · LT205 · revisão por lote CLXXXI (texto da Scryfall de 20/10/2026): Biotech Specialist ("When this creature enters, create a Lander
// token. (It's an artifact with "{2}, {T}, Sacrifice this token: Search your library for a basic land card, put it onto the battlefield tapped,
// then shuffle.") / Whenever you sacrifice an artifact, this creature deals 2 damage to target opponent."). Ficha Lander (111.10t) e gatilho
// de sacrificar artefato. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const BS = 'Biotech Specialist';
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: ['R', 'G'], power: c.power, toughness: c.toughness }; };
const C = { [BS]: of(BS) };
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Mountain: terra('Mountain', 'Mountain', 'R'), Forest: terra('Forest', 'Forest', 'G'),
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] },
  Altar: { name: 'Altar', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] } });
const SCRIPTS = { Altar: { name: 'Altar', abilities: [{ kind: 'activated', cost: { sacrificeOther: { types: ['artifact', 'creature'] } }, effects: [{ do: 'gain', amount: 1 }] }], example: { action: 'activate:0', target: 'none', expect: { selfLife: 0 } } } };
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 225, mode: 'full', cards: C, scripts: SCRIPTS, first: 0, players: [{ name: 'A', deck: b([BS, 'Altar', 'Urso', 'Mountain', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Altar', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const terras = (s, p, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, p, n); return s; };
const limpa = s => passaAte(s, x => !x.stack.length && !x.pending && !(x.queued || []).length);
const lander = (s, p) => s.zones[p].battlefield.find(o => s.objects[o].name === 'Lander');

test('M-543 · Biotech Specialist joga (lido e aprovado)', () => { assert.equal(S.coverage(of(BS)).level, 'completo'); });

test('M-543 · ao entrar cria um Lander; o Lander ({2}, virar, sacrificar) busca um terreno básico virado; o sacrifício causa 2 ao oponente', () => {
  let s = mesa(), bs; [s, bs] = poe(s, 0, BS, 'hand'); s = terras(s, 0, 'Mountain', 1); s = terras(s, 0, 'Forest', 3);
  s = limpa(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === bs)[0])); const l = lander(s, 0); assert.ok(l, 'Lander no campo');
  assert.ok(s.objects[l].token);
  const vida = s.players[1].life, antes = s.zones[0].battlefield.filter(o => /Land/.test((C[s.objects[o].name] || {}).type_line || '')), nT = antes.length;
  s = act(s, legais(s, 0, a => a.t === 'activate' && a.oid === l)[0]); s = passaAte(s, x => !!x.pending || (!x.stack.length && !(x.queued || []).length));
  for (let i = 0; i < 6 && s.pending; i++) { const pk = s.pending; s = act(s, pk.kind === 'pick' ? { t: 'pick', p: 0, oid: pk.from[0] } : legais(s, pk.p)[0]); s = passaAte(s, x => !!x.pending || (!x.stack.length && !(x.queued || []).length)); }
  s = limpa(s); assert.equal(s.players[1].life, vida - 2, 'sacrificar o Lander (artefato) causa 2');
  const nT2 = s.zones[0].battlefield.filter(o => /Land/.test((C[s.objects[o].name] || {}).type_line || '')).length; assert.equal(nT2, nT + 1, 'um terreno a mais');
  const novo = s.zones[0].battlefield.find(o => /Land/.test((C[s.objects[o].name] || {}).type_line || '') && !antes.includes(o)); assert.ok(novo && s.objects[novo].tapped, 'entra virado');
});

test('M-543 · sacrificar artefato dispara; criatura não; o sacrifício do oponente não', () => {
  const sacrifica = (quem, nome) => { let s = mesa(), a, x; [s] = poe(s, 0, BS); [s, a] = poe(s, quem, 'Altar'); [s, x] = poe(s, quem, nome);
    if (quem === 1) s = passaAte(s, y => y.turn.active === 1 && y.turn.step === 'main1' && !y.stack.length && !y.pending);
    const alvo = quem === 0 ? 1 : 0, v = [s.players[0].life, s.players[1].life];
    s = limpa(act(s, legais(s, quem, k => k.t === 'activate' && k.oid === a && k.pay && [].concat(k.pay.sacrifice)[0] === x)[0]));
    return [v[0] - s.players[0].life, v[1] - s.players[1].life]; };
  assert.deepEqual(sacrifica(0, 'Altar'), [-1, 2], 'artefato seu: 2 no oponente (o Altar de teste dá 1 de vida)');
  assert.deepEqual(sacrifica(0, 'Urso'), [-1, 0], 'criatura: nada');
  assert.deepEqual(sacrifica(1, 'Altar'), [0, -1], 'o oponente sacrificou: nada');
});

test('M-543 · achado da revisão: o Lander é artefato, não terreno ("Lander" contém "land")', () => {
  let s = mesa(), bs; [s, bs] = poe(s, 0, BS, 'hand'); s = terras(s, 0, 'Mountain', 1); s = terras(s, 0, 'Forest', 1);
  s = limpa(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === bs)[0])); const l = lander(s, 0);
  assert.deepEqual(Array.from(s.facts[s.objects[l].name].types), ['artifact']);
});
