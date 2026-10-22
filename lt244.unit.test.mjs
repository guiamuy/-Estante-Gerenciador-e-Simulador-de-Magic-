// M-562 · LT221 · revisão por lote CXCVII (texto e rulings da Scryfall de 22/10/2026): Green Sun's Zenith — "Search your library for a green creature
// card with mana value X or less, put it onto the battlefield, then shuffle. Shuffle Green Sun's Zenith into its owner's library." Falha no motor
// anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, T, act, poe, legais, passaAte } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const GZ = "Green Sun's Zenith", gz = OF.find(x => x.name === GZ);
const cri = (n, custo, cmc, cor) => ({ name: n, type_line: 'Creature — Bear', mana_cost: custo, cmc, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: [cor] });
const C = { [GZ]: { name: GZ, type_line: gz.type_line, mana_cost: gz.mana_cost, cmc: 1, keywords: [], oracle_text: gz.oracle_text, colors: ['G'] },
  Forest: { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {G}.)', colors: [] },
  Island: { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] },
  Twincast: { name: 'Twincast', type_line: 'Instant', mana_cost: '{U}{U}', cmc: 2, keywords: [], oracle_text: 'Copy target instant or sorcery spell. You may choose new targets for the copy.', colors: ['U'] },
  Urso: cri('Urso', '{1}{G}', 2, 'G'), Grande: cri('Grande', '{2}{G}', 3, 'G'), Rubro: cri('Rubro', '{R}', 1, 'R') };
function mesa() {
  const b = ns => ns.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 244, mode: 'full', cards: C, first: 0, players: [
    { name: 'A', deck: b([[GZ, 2], ['Urso', 4], ['Grande', 4], ['Rubro', 4], ['Forest', 26]]) }, { name: 'B', deck: b([['Twincast', 2], ['Island', 38]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  let g; [s, g] = poe(s, 0, GZ, 'hand'); for (let i = 0; i < 4; i++) [s] = poe(s, 0, 'Forest');
  return [s, g];
}
const nome = (s, oid) => s.objects[oid].name;

test("M-562 · Green Sun's Zenith joga (lida e aprovada)", () => { assert.equal(S.coverage(C[GZ]).level, 'completo'); });

test("M-562 · X = 2: só criatura verde de valor 2 ou menos; entra no campo; a mágica volta ao grimório do dono", () => {
  let [s, g] = mesa(); const x2 = legais(s, 0, a => a.t === 'cast' && a.oid === g && a.x === 2)[0]; assert.ok(x2, 'X = 2 oferecido');
  s = passaAte(act(s, x2), x => !!x.pending || !x.stack.length); assert.equal(s.pending && s.pending.kind, 'pick');
  const nomes = new Set(legais(s, 0, a => a.t === 'pick').map(a => nome(s, a.oid))); assert.deepEqual([...nomes], ['Urso'], 'nem a verde de valor 3, nem a vermelha');
  const u = legais(s, 0, a => a.t === 'pick')[0].oid; s = act(s, legais(s, 0, a => a.t === 'pick')[0]); s = passaAte(s, x => !x.pending && !x.stack.length);
  assert.equal(s.objects[u].zone, 'battlefield'); assert.equal(s.objects[g].zone, 'library', 'embaralhada no grimório, não no cemitério');
  assert.ok(!s.zones[0].graveyard.includes(g));
});

test("M-562 · X = 0 sem criatura que sirva: nada entra, a mágica ainda volta ao grimório; a pilha explicada diz", () => {
  let [s, g] = mesa(); s = passaAte(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === g && a.x === 0)[0]), x => !!x.pending || !x.stack.length);
  if (s.pending) s = act(s, legais(s, 0, a => a.t === 'pick_done')[0]); s = passaAte(s, x => !x.pending && !x.stack.length);
  assert.equal(s.objects[g].zone, 'library');
  assert.match(String(T.descreveEfeitos([{ do: 'embaralha_esta' }])), /embaralha esta mágica no grimório do dono/);
  assert.ok([...S.validateScript({ name: 'X', effects: [{ do: 'search', amount: 1, filter: { cores: ['verde'] }, to: 'hand' }] })].some(e => /filtro de cor/.test(e)));
});

test("M-562 · achados da revisão: a cópia da Zenith sem criatura que sirva deixa de existir sem derrubar o motor (707.10a); a pilha explicada diz o que procura", () => {
  let [s, g] = mesa(); let tw; [s, tw] = poe(s, 1, 'Twincast', 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 1, 'Island');
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === g && a.x === 0)[0]);
  for (let i = 0; i < 5 && s.turn.priority !== 1; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  s = act(s, legais(s, 1, a => a.t === 'cast' && a.oid === tw && (a.targets || []).some(t => t.oid === g))[0]);
  s = passaAte(s, x => !x.stack.length || !!x.pending); if (s.pending && s.pending.kind === 'pick') s = act(s, legais(s, s.pending.p, a => a.t === 'pick_done')[0]);
  s = passaAte(s, x => !x.pending && !x.stack.length);
  assert.equal(s.objects[g].zone, 'library', 'a original volta ao grimório do dono');
  assert.ok(!Object.values(s.objects).some(o => o.name === "Green Sun's Zenith" && o.oid !== g && o.zone !== 'library' && o.zone !== 'hand'), 'a cópia não ficou em zona nenhuma');
  assert.match(String(T.descreveEfeitos([{ do: 'search', amount: 1, filter: { types: ['creature'], cores: ['G'], mvMax: { per: 'x' } }, to: 'battlefield' }])), /criatura verde de valor de mana X ou menos no grimório e põe no campo de batalha/);
});
