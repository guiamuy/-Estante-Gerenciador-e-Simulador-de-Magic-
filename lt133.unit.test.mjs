// M-451 · LT117 · Pentad Prism ("Sunburst (This artifact enters with a charge counter on it for each color of mana spent to cast it.) / Remove a charge
// counter from this artifact: Add one mana of any color."). Texto da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Primitiva nova:
// as cores gastas na conjuração (702.44a). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, act, poe, legais, passaAte, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const c0 = OF.find(x => x.name === 'Pentad Prism');
const terra = (name, sub, m) => ({ name, type_line: `Basic Land${sub ? ' — ' + sub : ''}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
const C = { 'Pentad Prism': { name: c0.name, type_line: c0.type_line, mana_cost: c0.mana_cost, cmc: 2, keywords: ['Sunburst'], oracle_text: c0.oracle_text, colors: [] },
  Forest: terra('Forest', 'Forest', 'G'), Island: terra('Island', 'Island', 'U'), Wastes: { name: 'Wastes', type_line: 'Basic Land', mana_cost: '', cmc: 0, keywords: [], oracle_text: '{T}: Add {C}.', colors: [] } }; // Wastes: texto da Scryfall de 17/10/2026
function mesa(seed = 17) {
  const b = ns => ns.map(name => ({ name, qty: 6, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Pentad Prism', 'Forest', 'Island', 'Wastes']) }, { name: 'B', deck: b(['Forest', 'Island', 'Wastes']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length && !x.pending, 40);
function conjura(terras) {
  let s = mesa(), pp; [s, pp] = poe(s, 0, 'Pentad Prism', 'hand'); for (const t of terras) [s] = poe(s, 0, t);
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === pp)[0]));
  assert.equal(s.objects[pp].zone, 'battlefield'); return { s, pp };
}
const carga = (s, pp) => (s.objects[pp].counters || {}).charge || 0;

test('LT117 · Pentad Prism joga pelo leitor aprovado', () => {
  assert.equal(S.coverage(C['Pentad Prism']).level, 'completo'); assert.equal(S.APROVADAS['Pentad Prism'].leva, 'M-451');
});

test('LT117 · duas cores gastas: dois marcadores de carga; uma cor só: um; incolor não é cor: nenhum', () => {
  let { s, pp } = conjura(['Forest', 'Island']); assert.equal(carga(s, pp), 2);
  ({ s, pp } = conjura(['Forest', 'Forest'])); assert.equal(carga(s, pp), 1);
  ({ s, pp } = conjura(['Wastes', 'Wastes'])); assert.equal(carga(s, pp), 0);
  ({ s, pp } = conjura(['Wastes', 'Island'])); assert.equal(carga(s, pp), 1);
});

test('LT117 · tirar um marcador dá uma mana de qualquer cor; sem marcador, a habilidade some', () => {
  let { s, pp } = conjura(['Forest', 'Forest']); assert.equal(carga(s, pp), 1);
  const ab = legais(s, 0, a => a.oid === pp && a.t !== 'cast');
  assert.ok(ab.length > 0, 'oferece a habilidade de mana');
  s = act(s, ab[0]);
  assert.equal(carga(s, pp), 0);
  assert.equal(Object.values(s.players[0].pool).reduce((n, x) => n + x, 0), 1);
  assert.equal(legais(s, 0, a => a.oid === pp && a.t !== 'cast').length, 0);
});
