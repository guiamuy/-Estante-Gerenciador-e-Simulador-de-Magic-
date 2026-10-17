// M-460 · LT126 · Aurora Eidolon e Sandstorm Eidolon ("{W}, Sacrifice this creature: Prevent the next 3 damage that would be dealt to any target this
// turn." / "{R}, Sacrifice this creature: Target creature can't block this turn." / "Whenever you cast a multicolored spell, you may return this card
// from your graveyard to your hand."). Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json), caminho de produção (APROVADAS). Pedido
// da trilha `listas`. Gatilho que funciona do cemitério ao conjurar (113.6k, `fromGraveyard`); prevenção e "can't block this turn" pelo leitor.
// Terminate: .listas/oficiais.json. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], power: c.power, toughness: c.toughness }; };
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
const C = { 'Aurora Eidolon': of('Aurora Eidolon'), 'Sandstorm Eidolon': of('Sandstorm Eidolon'),
  Terminate: { name: 'Terminate', type_line: 'Instant', mana_cost: '{B}{R}', cmc: 2, keywords: [], oracle_text: "Destroy target creature. It can't be regenerated.", colors: ['B', 'R'] },
  'Lightning Bolt': { name: 'Lightning Bolt', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: 'Lightning Bolt deals 3 damage to any target.', colors: ['R'] },
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Swamp: terra('Swamp', 'Swamp', 'B'), Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W') };
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: 6, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 97, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Aurora Eidolon', 'Sandstorm Eidolon', 'Terminate', 'Lightning Bolt', 'Swamp', 'Mountain', 'Plains']) }, { name: 'B', deck: b(['Urso', 'Terminate', 'Swamp', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const ate = s => { for (let i = 0; i < 40; i++) { if (s.pending && s.pending.kind !== 'priority') { const y = legais(s, s.pending.p, a => a.t === 'yes' || a.t === 'accept'); s = act(s, y[0] || legais(s, s.pending.p)[0]); continue; } if (!s.stack.length) return s; s = act(s, { t: 'pass', p: s.turn.priority }); } return s; };

test('LT126 · os dois Eidolons jogam pelo leitor aprovado', () => {
  for (const n of ['Aurora Eidolon', 'Sandstorm Eidolon']) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-460', n); }
});

test('LT126 · no cemitério: conjurar uma multicolorida devolve o Eidolon à mão; monocolorida não', () => {
  let s = mesa(), se, tm, lb, u; [s, se] = poe(s, 0, 'Sandstorm Eidolon', 'graveyard'); [s, tm] = poe(s, 0, 'Terminate', 'hand'); [s, lb] = poe(s, 0, 'Lightning Bolt', 'hand'); [s, u] = poe(s, 1, 'Urso');
  [s] = poe(s, 0, 'Swamp'); [s] = poe(s, 0, 'Mountain'); [s] = poe(s, 0, 'Mountain');
  s = ate(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === lb && a.targets[0].player === 1)[0]));
  assert.equal(s.objects[se].zone, 'graveyard', 'Bolt é monocolorido');
  s = ate(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === tm && a.targets[0].oid === u)[0]));
  assert.equal(s.objects[se].zone, 'hand'); assert.equal(s.objects[u].zone, 'graveyard');
});

test('LT126 · no campo o gatilho não existe; a multicolorida do oponente também não devolve', () => {
  let s = mesa(), ae, se, tm, u; [s, ae] = poe(s, 0, 'Aurora Eidolon'); [s, se] = poe(s, 0, 'Sandstorm Eidolon', 'graveyard'); [s, u] = poe(s, 1, 'Urso');
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending, 400);
  [s, tm] = poe(s, 1, 'Terminate', 'hand'); [s] = poe(s, 1, 'Swamp'); [s] = poe(s, 1, 'Mountain');
  const n0 = s.stack.length; s = act(s, legais(s, 1, a => a.t === 'cast' && a.oid === tm && a.targets[0].oid === ae)[0]);
  assert.equal(s.stack.length, n0 + 1, 'só a mágica na pilha: nenhum gatilho');
  s = ate(s); assert.equal(s.objects[se].zone, 'graveyard'); assert.equal(s.objects[ae].zone, 'graveyard');
});

test('LT126 · Sandstorm: {R} e sacrificar — a criatura alvo não bloqueia neste turno; Aurora: previne 3', () => {
  let s = mesa(), se, ae, u; [s, se] = poe(s, 0, 'Sandstorm Eidolon'); [s, ae] = poe(s, 0, 'Aurora Eidolon'); [s, u] = poe(s, 1, 'Urso'); [s] = poe(s, 0, 'Mountain'); [s] = poe(s, 0, 'Plains');
  s = ate(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === se && a.targets && a.targets[0].oid === u)[0]));
  assert.equal(s.objects[se].zone, 'graveyard'); assert.equal(s.objects[u].naoBloqueiaM, s.turn.number);
  s = ate(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === ae && a.targets && a.targets[0].player === 0)[0]));
  assert.equal(s.objects[ae].zone, 'graveyard'); assert.ok((s.prevencoes || []).some(x => x.quantidade === 3 && x.alvo && x.alvo.player === 0), JSON.stringify(s.prevencoes));
});
