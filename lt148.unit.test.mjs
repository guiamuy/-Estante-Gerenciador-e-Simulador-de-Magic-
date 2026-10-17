// M-466 · LT132 · Heaped Harvest ("When this artifact enters and when you sacrifice it, you may search your library for a basic land card, put it
// onto the battlefield tapped, then shuffle. / {2}, {T}, Sacrifice this artifact: You gain 3 life."). Texto da Scryfall de 17/10/2026 UTC
// (.listas/oficiais-revisadas.json), caminho de produção (APROVADAS). Pedido da trilha `listas`. Gatilho novo `sacrifica` da própria (603.10a).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const c0 = OF.find(x => x.name === 'Heaped Harvest');
const C = { 'Heaped Harvest': { name: c0.name, type_line: c0.type_line, mana_cost: c0.mana_cost, cmc: 3, keywords: [], oracle_text: c0.oracle_text, colors: ['G'] },
  Forest: { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {G}.)', colors: [] } };
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: 10, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 127, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Heaped Harvest', 'Forest']) }, { name: 'B', deck: b(['Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority);
  const a = pk && pk.kind === 'pick' ? (l.find(x => x.t === 'pick') || l.find(x => x.t !== 'pick')) : (l.find(x => x.t === 'yes' || x.t === 'accept') || l.find(x => x.t === 'pass') || l[0]); s = act(s, a); } return s; };
const florestasViradas = s => s.zones[0].battlefield.filter(o => s.objects[o].name === 'Forest' && s.objects[o].tapped).length;

test('LT132 · Heaped Harvest joga pelo leitor aprovado', () => {
  assert.equal(S.coverage(C['Heaped Harvest']).level, 'completo'); assert.equal(S.APROVADAS['Heaped Harvest'].leva, 'M-466');
});

test('LT132 · sacrificar pela própria habilidade: ganha 3 e busca uma Floresta virada', () => {
  let s = mesa(), h; [s, h] = poe(s, 0, 'Heaped Harvest'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Forest');
  const antes = s.zones[0].battlefield.filter(o => s.objects[o].name === 'Forest').length;
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === h)[0]));
  assert.equal(s.objects[h].zone, 'graveyard'); assert.equal(s.players[0].life, 23);
  assert.equal(s.zones[0].battlefield.filter(o => s.objects[o].name === 'Forest').length, antes + 1);
  assert.equal(florestasViradas(s), 3, 'as duas que pagaram e a que entrou virada');
});

test('LT132 · sacrificar outra permanente não dispara o Heaped Harvest que ficou no campo', () => {
  let s = mesa(), h1, h2; [s, h1] = poe(s, 0, 'Heaped Harvest'); [s, h2] = poe(s, 0, 'Heaped Harvest'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Forest');
  const r = E.apply(s, legais(s, 0, a => a.t === 'activate' && a.oid === h2)[0]);
  const fontes = [...r.state.stack.map(o => r.state.objects[o].source), ...(r.state.queued || []).map(q => q.source)];
  assert.ok(fontes.includes(h2)); assert.ok(!fontes.includes(h1));
});
