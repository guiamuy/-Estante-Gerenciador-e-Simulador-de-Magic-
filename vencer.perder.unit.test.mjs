// CR2h.6 · vencer e perder o jogo por efeito (104.2a, 104.3e) e as condições "if you have N or more life" / "if there are N or more <tipo>
// counters on ~" (603.4: conferidas ao disparar e de novo ao resolver). Felidar Sovereign, Test of Endurance, Door to Nothingness e Helix Pinnacle
// (texto oficial em .listas/oficiais-motor.json, Oracle do Forge, 12/10/2026). Cada teste falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';

const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-motor.json', import.meta.url), 'utf8')).cartas;
const carta = (n, kw = []) => { const c = OF.find(x => x.name === n); return { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: 4, keywords: kw, oracle_text: c.oracle_text, colors: [], power: c.power, toughness: c.toughness }; };
const cards = { 'Felidar Sovereign': carta('Felidar Sovereign', ['Vigilance', 'Lifelink']), 'Test of Endurance': carta('Test of Endurance'), 'Door to Nothingness': carta('Door to Nothingness'), 'Helix Pinnacle': carta('Helix Pinnacle', ['Shroud']) };
function mesaX(a = []) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 12, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards: { ...CARTAS, ...cards }, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Plains']) }, { name: 'B', deck: baralho(['Island']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const ateMinhaManutencao = s => passaAte(s, x => x.turn.active === 0 && x.turn.number > s.turn.number && x.turn.step === 'upkeep' && x.turn.priority === 0);
const doGatilho = (s, oid) => s.stack.filter(o => s.objects[o].ability && s.objects[o].source === oid).length;
const resolve = s => tudo(act(act(s, { t: 'pass', p: 0 }), { t: 'pass', p: 1 }));

test('CR 104.2a/603.4 · Felidar Sovereign: com 40 de vida na manutenção você vence; com 39 não dispara; se a vida cai antes de resolver, não vence', () => {
  let s = mesaX(['Felidar Sovereign']), f;
  [s, f] = poe(s, 0, 'Felidar Sovereign'); s = J(s); s.players[0].life = 40;
  let t = ateMinhaManutencao(s);
  assert.equal(doGatilho(t, f), 1, '40 de vida: dispara');
  t = resolve(t);
  assert.equal(t.players[1].lost, true, 'o oponente perde');
  assert.equal(t.players[1].lossReason, 'o oponente venceu o jogo');
  let u = J(s); u.players[0].life = 39; u = ateMinhaManutencao(u);
  assert.equal(doGatilho(u, f), 0, '39: não dispara');
  let w = ateMinhaManutencao(s); w = J(w); w.players[0].life = 39; w = resolve(w);
  assert.equal(w.players[1].lost, false, 'a condição falha na resolução (603.4): ninguém vence');
});

test('CR 104.3e · Door to Nothingness: com as dez manas, virar e sacrificar faz o jogador alvo perder', () => {
  let s = mesaX(['Door to Nothingness']), d;
  [s, d] = poe(s, 0, 'Door to Nothingness'); s = comMana(s, 'WWUUBBRRGG');
  const a = legais(s, 0, x => x.t === 'activate' && x.oid === d && x.targets && x.targets[0].player === 1)[0];
  assert.ok(a, 'mirar o oponente');
  s = resolve(act(s, a));
  assert.equal(s.objects[d].zone, 'graveyard', 'sacrificada no custo');
  assert.equal(s.players[1].lost, true); assert.equal(s.players[1].lossReason, 'perdeu o jogo por efeito de carta');
});

test('CR 104.2a · Helix Pinnacle: com 100 marcadores de torre na sua manutenção você vence; com 99 não', () => {
  let s = mesaX(['Helix Pinnacle']), h;
  [s, h] = poe(s, 0, 'Helix Pinnacle'); s = comMana(s, 'WWW');
  s = resolve(act(s, { t: 'activate', p: 0, oid: h, index: 0, x: 3 }));
  assert.equal(s.objects[h].counters.tower, 3, '{X}: põe X marcadores de torre (CR2c.7)');
  let t = J(s); t.objects[h].counters.tower = 99; t = ateMinhaManutencao(t);
  assert.equal(doGatilho(t, h), 0, '99: nada');
  let u = J(s); u.objects[h].counters.tower = 100; u = resolve(ateMinhaManutencao(u));
  assert.equal(u.players[1].lost, true, '100: você vence');
});
