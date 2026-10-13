// M-380 · LT48 · "it endures N" (Tarkir: Dragonstorm; texto de lembrete: "Put a +1/+1 counter on it or create a 1/1 white Spirit creature token") —
// revisão por lote XXXIX: Fortress Kin-Guard e Eureka Moment (Oracle do Forge, consulta de 12/10/2026; .listas/oficiais-revisadas.json), caminho
// de produção (APROVADAS). Os testes falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';
import { valorDeMana, palavrasDoTexto, limpaMao } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const cores = c => [...new Set((c || '').match(/[WUBRG]/g) || [])];
const carta = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost || '', cmc: valorDeMana(c.mana_cost), keywords: palavrasDoTexto(c.oracle_text), oracle_text: c.oracle_text, colors: cores(c.mana_cost), ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const CARDS = { ...CARTAS, 'Fortress Kin-Guard': carta('Fortress Kin-Guard'), 'Eureka Moment': carta('Eureka Moment') };
function mesa() {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 10, mode: 'full', cards: CARDS, first: 0,
    players: [{ name: 'A', deck: baralho(['Fortress Kin-Guard', 'Eureka Moment', 'Plains', 'Forest', 'Island']) }, { name: 'B', deck: baralho(['Mountain', 'Lightning Bolt']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);

test('LT48 · Fortress Kin-Guard: ao entrar, quem controla escolhe — marcador +1/+1 nela (2/3) ou um Espírito branco 1/1', () => {
  for (const idx of [0, 1]) {
    let s = mesa(), k; [s, k] = poe(s, 0, 'Fortress Kin-Guard', 'hand'); [s] = poe(s, 0, 'Plains'); [s] = poe(s, 0, 'Plains');
    s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === k)[0]));
    assert.equal(s.pending && s.pending.kind, 'choose_mode'); assert.equal(s.pending.p, 0);
    assert.equal(legais(s, 0, a => a.t === 'choose_mode').length, 2);
    s = resolve(act(s, { t: 'choose_mode', p: 0, index: idx }));
    const esp = s.zones[0].battlefield.filter(o => s.objects[o].name === 'Spirit');
    if (idx === 0) { assert.equal(E.stats(s, s.objects[k]).power, 2); assert.equal(esp.length, 0); }
    else { assert.equal(E.stats(s, s.objects[k]).power, 1); assert.equal(esp.length, 1); assert.equal(E.stats(s, s.objects[esp[0]]).power, 1); }
  }
});

test('LT48 · Eureka Moment: compra 2 e pode pôr um terreno da mão no campo (sem gastar a jogada de terreno)', () => {
  let s = limpaMao(mesa(), 0), em; [s, em] = poe(s, 0, 'Eureka Moment', 'hand'); for (const n of ['Forest', 'Island', 'Forest', 'Island']) [s] = poe(s, 0, n);
  let f; [s, f] = poe(s, 0, 'Forest', 'hand');
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === em)[0]));
  assert.equal(s.pending && s.pending.kind, 'pick');
  s = act(s, { t: 'pick', p: 0, oid: f }); if (s.pending) s = act(s, { t: 'pick_done', p: 0 });
  assert.equal(s.objects[f].zone, 'battlefield'); assert.equal(s.players[0].landsPlayed || 0, 0, 'a jogada de terreno continua livre');
});
