// M-565 · LT224 · revisão por lote CC (texto e rulings da Scryfall de 22/10/2026): Orcish Bowmasters — "Flash / When this creature enters and whenever an
// opponent draws a card except the first one they draw in each of their draw steps, this creature deals 1 damage to any target. Then amass Orcs 1."
// Um gatilho por carta comprada; a primeira comprada no passo de compra do oponente não conta. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, act, poe, legais, passaAte } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const OB = 'Orcish Bowmasters', ob = OF.find(x => x.name === OB);
const C = { [OB]: { name: OB, type_line: ob.type_line, mana_cost: ob.mana_cost, cmc: 2, keywords: ['Flash', 'Amass'], oracle_text: ob.oracle_text, power: '1', toughness: '1', colors: ['B'] },
  Swamp: { name: 'Swamp', type_line: 'Basic Land — Swamp', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {B}.)', colors: [] },
  Island: { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] },
  Tres: { name: 'Tres', type_line: 'Instant', mana_cost: '{U}', cmc: 1, keywords: [], oracle_text: '', colors: ['U'] } };
const SCRIPTS = { Tres: { name: 'Tres', effects: [{ do: 'draw', amount: 3 }], example: { target: 'none', expect: { handDelta: 2 } } } };
function mesa() {
  const b = ns => ns.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 247, mode: 'full', cards: C, scripts: SCRIPTS, first: 0, players: [
    { name: 'A', deck: b([[OB, 2], ['Swamp', 38]]) }, { name: 'B', deck: b([['Tres', 4], ['Island', 36]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
// resolve tudo mirando o oponente com o dano dos gatilhos
const limpa = s => { for (let i = 0; i < 200; i++) { const pd = s.pending;
  if (pd && pd.kind === 'pick_target') { const i = pd.options.findIndex(t => t && t.player === 1); s = act(s, { t: 'pick_target', p: pd.p, index: i >= 0 ? i : 0 }); continue; }
  if (pd && pd.kind === 'triggers') { s = act(s, legais(s, pd.p)[0]); continue; }
  if (pd) break; if (!s.stack.length && !(s.queued || []).length) break; s = act(s, { t: 'pass', p: s.turn.priority }); } return s; };
const exercito = s => s.zones[0].battlefield.map(o => s.objects[o]).find(o => /Army/.test(o.name));

test('M-565 · Orcish Bowmasters joga (lido e aprovado)', () => { assert.equal(S.coverage(C[OB]).level, 'completo'); });

test('M-565 · ao entrar: 1 de dano e amassar Orcs 1 (cria um Exército Orc 0/0 e põe um marcador)', () => {
  let s = mesa(), o; [s, o] = poe(s, 0, OB, 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Swamp');
  const vidaB = s.players[1].life; s = limpa(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === o)[0]));
  assert.equal(s.players[1].life, vidaB - 1); const ex = exercito(s); assert.ok(ex, 'há um Exército'); assert.equal(ex.counters.p1p1, 1); assert.match(ex.name, /Orc Army/);
});

test('M-565 · compras do oponente: a primeira do passo de compra dele não dispara; três cartas por efeito disparam três vezes', () => {
  let s = mesa(), o; [s, o] = poe(s, 0, OB); [s] = poe(s, 1, 'Island'); let t; [s, t] = poe(s, 1, 'Tres', 'hand');
  const v0 = s.players[1].life;
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending); s = limpa(s);
  assert.equal(s.players[1].life, v0, 'a compra do passo de compra não dispara');
  s = limpa(act(s, legais(s, 1, a => a.t === 'cast' && a.oid === t)[0]));
  assert.equal(s.players[1].life, v0 - 3, 'três cartas compradas: três gatilhos'); assert.equal(exercito(s).counters.p1p1, 3);
});

test('M-565 · achado da revisão: num passo de compra a mais do oponente, a primeira carta dele também não dispara ("each of their draw steps")', () => {
  const SPH = 'Esfinge';
  const cards = { ...C, [SPH]: { name: SPH, type_line: 'Creature — Sphinx', mana_cost: '{6}{U}', cmc: 7, keywords: [], oracle_text: 'Flying\nAt the beginning of each of your postcombat main phases, there is an additional beginning phase after this phase. (The beginning phase includes the untap, upkeep, and draw steps.)', power: '6', toughness: '6', colors: ['U'] } };
  const scr = { ...SCRIPTS, [SPH]: { name: SPH, abilities: [{ kind: 'triggered', when: 'main2', effects: [{ do: 'passo_extra', fase: 'inicial', target: 'self' }] }], example: { target: 'none', expect: { selfLife: 0 } } } };
  const b = ns => ns.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 3, mode: 'full', cards, scripts: scr, first: 0, players: [{ name: 'A', deck: b([[OB, 2], ['Swamp', 38]]) }, { name: 'B', deck: b([[SPH, 1], ['Island', 39]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  [s] = poe(s, 0, OB); [s] = poe(s, 1, SPH); let passos = 0, gatilhos = 0;
  for (let i = 0; i < 600 && !(s.turn.active === 0 && s.turn.number > 2); i++) { const pd = s.pending;
    if (pd && pd.kind === 'pick_target') { gatilhos++; s = act(s, { t: 'pick_target', p: pd.p, index: 0 }); continue; }
    if (pd && pd.kind === 'attackers') { s = act(s, { t: 'attack', p: pd.p, attackers: [] }); continue; }
    if (pd && pd.kind === 'blockers') { s = act(s, { t: 'block', p: pd.p, blocks: [] }); continue; }
    if (pd) { s = act(s, legais(s, pd.p)[0]); continue; }
    const antes = `${s.turn.active}:${s.turn.step}`; s = act(s, { t: 'pass', p: s.turn.priority });
    if (s.turn.active === 1 && s.turn.step === 'draw' && `${s.turn.active}:${s.turn.step}` !== antes) passos++;
  }
  assert.equal(passos, 2, 'dois passos de compra no turno de B'); assert.equal(gatilhos, 0, 'nenhuma das duas compras de passo dispara');
});
