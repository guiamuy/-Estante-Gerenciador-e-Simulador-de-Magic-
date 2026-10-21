// M-551 · LT213 · revisão por lote CLXXXIX (texto e rulings da Scryfall de 21/10/2026): Winternight Stories ("Draw three cards. Then discard two cards
// unless you discard a creature card. / Harmonize {4}{U}"). Quem descarta escolhe: uma carta de criatura, ou duas cartas (701.9); o descarte é um só,
// no fim. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const WS = 'Winternight Stories';
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: c.keywords || [], oracle_text: c.oracle_text, colors: ['U'] }; };
const C = { [WS]: of(WS) };
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Island: terra('Island', 'Island', 'U'),
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] },
  Pedra: { name: 'Pedra', type_line: 'Artifact', mana_cost: '{2}', cmc: 2, keywords: [], oracle_text: '', colors: [] } });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 233, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([WS, 'Pedra', 'Urso', 'Island']) }, { name: 'B', deck: b(['Urso', 'Island']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const ate = s => passaAte(s, x => !!x.pending || (!x.stack.length && !(x.queued || []).length));
const conjura = (s) => { let w; [s, w] = poe(s, 0, WS, 'hand'); for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Island'); return ate(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === w && !a.alt)[0])); };
const pega = (s, oid) => act(s, legais(s, 0, a => a.t === 'pick' && a.oid === oid)[0]);
const pronto = s => { const d = legais(s, 0, a => a.t === 'pick_done'); return d.length ? ate(act(s, d[0])) : s; };

test('M-551 · Winternight Stories joga (lida e aprovada)', () => { assert.equal(S.coverage(of(WS)).level, 'completo'); });

test('M-551 · descartando uma criatura, basta ela (a segunda é opcional); pode descartar outra junto', () => {
  let s = mesa(), u; [s, u] = poe(s, 0, 'Urso', 'hand'); s = conjura(s); assert.equal(s.pending && s.pending.kind, 'pick');
  const mao = s.zones[0].hand.length; s = ate(pega(s, u)); if (s.pending && s.pending.kind === 'pick' && Array.from(s.pending.picked).includes(u)) s = pronto(s);
  assert.equal(s.pending && s.pending.kind, 'pick', 'segunda escolha'); assert.equal(s.pending.min, 0, 'opcional'); s = pronto(s);
  assert.deepEqual([s.objects[u].zone, s.zones[0].hand.length], ['graveyard', mao - 1], 'só a criatura');
  let t = mesa(), u2; [t, u2] = poe(t, 0, 'Urso', 'hand'); t = conjura(t); const m2 = t.zones[0].hand.length; t = ate(pega(t, u2)); if (t.pending && Array.from(t.pending.picked).includes(u2)) t = pronto(t);
  const outra = t.zones[0].hand.find(o => o !== u2); t = ate(pega(t, outra)); if (t.pending && t.pending.kind === 'pick') t = pronto(t);
  assert.deepEqual([t.objects[u2].zone, t.objects[outra].zone, t.zones[0].hand.length], ['graveyard', 'graveyard', m2 - 2]);
});

test('M-551 · sem criatura, descarta duas (a segunda é obrigatória)', () => {
  let s = mesa(), pd; [s, pd] = poe(s, 0, 'Pedra', 'hand'); s = conjura(s); const mao = s.zones[0].hand.length;
  s = ate(pega(s, pd)); if (s.pending && Array.from(s.pending.picked).includes(pd)) s = pronto(s);
  assert.equal(s.pending.min, 1, 'obrigatória'); assert.equal(legais(s, 0, a => a.t === 'pick_done').length, 0, 'não dá para parar');
  const outra = s.pending.from[0]; s = ate(pega(s, outra)); if (s.pending && s.pending.kind === 'pick') s = pronto(s);
  assert.deepEqual([s.objects[pd].zone, s.objects[outra].zone, s.zones[0].hand.length], ['graveyard', 'graveyard', mao - 2]);
});
