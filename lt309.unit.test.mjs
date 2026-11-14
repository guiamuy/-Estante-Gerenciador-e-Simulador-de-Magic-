// M-634 · rotina Motor contínuo · 712.8a/712.8d/712.8f + 715.4: a carta de duas faces (e a de aventura) tem só a linha de tipo da face de
// cima. Achado do revisor da M-632: com a Saga para cima, Fable of the Mirror-Breaker respondia a "Goblin" e a "creature" pela linha de tipo
// das duas faces juntas ("Enchantment — Saga // Enchantment Creature — Goblin Shaman", como a Scryfall entrega o dado), no campo e fora dele.
// Os tipos (`types`) já saíam só da frente; a linha de tipo (`typeText`, que os filtros de subtipo, supertipo e "creature card" leem) não.
// A dividida (709.4) continua com as duas metades juntas fora da pilha. Linhas de tipo da API da Scryfall guardadas em
// .listas/oficiais-revisadas.json (Fable 13/11/2026, Murderous Rider 19/10/2026, Pinnacle Monk 25/10/2026). Tudo falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';

const M = loadModules(), E = M.engine;
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const FA = 'Fable of the Mirror-Breaker', RK = 'Reflection of Kiki-Jiki', MR = 'Murderous Rider // Swift End', PM = 'Pinnacle Monk // Mystic Peak';
const J = x => JSON.parse(JSON.stringify(x));
const da = nome => { const x = OF.find(c => c.name === nome); assert.ok(x, nome + ' em .listas/oficiais-revisadas.json'); return x; };
const carta = (x, extra = {}) => ({ name: x.name, type_line: x.type_line, mana_cost: x.mana_cost, cmc: x.cmc != null ? x.cmc : 3, keywords: x.keywords || [], oracle_text: x.oracle_text || '', colors: x.colors || [], layout: x.layout, faces: x.faces, power: x.power, toughness: x.toughness, ...extra });
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: [...mana_cost.matchAll(/\{([^}]+)\}/g)].reduce((n, [, x]) => n + (/^\d+$/.test(x) ? +x : 1), 0), keywords: [], oracle_text: '', colors: [], ...extra });
const C = {
  [FA]: carta(da(FA), { cmc: 3, colors: ['R'] }),
  [MR]: carta(da(MR), { cmc: 3, colors: ['B'] }),
  [PM]: carta(da(PM), { cmc: 3, colors: ['R'] }),
  'Metade Um // Metade Dois': c0('Metade Um // Metade Dois', 'Instant // Sorcery', '{R} // {1}{U}', { layout: 'split' }),
  Mountain: c0('Mountain', 'Basic Land — Mountain', '', { oracle_text: '({T}: Add {R}.)' }),
};
const ex = { example: { target: 'none', expect: { selfLife: 0 } } };
// "Destroy target Goblin." (mágica de teste): o alvo é o subtipo de agora (CR2d.2, linhaDeTipo)
const CACA = { do: 'destroy', target: 'permanent', targetSubtype: 'Goblin' };
const SCR = { 'Metade Um // Metade Dois': { name: 'Metade Um // Metade Dois', ...ex } };
const act = (s, a) => { const r = E.apply(s, a); if (r.error) throw new Error(JSON.stringify(r.error)); return r.state; };
function passaAte(s, fim, max = 400) {
  for (let i = 0; i < max && !fim(s); i++) { const pd = s.pending;
    if (pd && pd.kind === 'discard' && pd.reason !== 'effect') s = act(s, { t: 'discard', p: pd.p, oid: s.zones[pd.p].hand[0] });
    else if (pd && pd.kind === 'attackers') s = act(s, { t: 'attack', p: pd.p, attackers: [] });
    else if (pd && pd.kind === 'blockers') s = act(s, { t: 'block', p: pd.p, blocks: [] });
    else if (pd) return s; else s = act(s, { t: 'pass', p: s.turn.priority }); }
  return s;
}
function poe(s, p, name, zone = 'battlefield') {
  s = J(s);
  const from = ['library', 'hand', 'graveyard'].map(z => s.zones[p][z]).find(z => z.some(o => s.objects[o].name === name));
  if (!from) throw new Error(name + ' ausente');
  const oid = from.find(o => s.objects[o].name === name); from.splice(from.indexOf(oid), 1); s.zones[p][zone].push(oid);
  Object.assign(s.objects[oid], { zone, sick: false, tapped: false, controller: p });
  return [s, oid];
}
const terras = (s, p, n) => { let o; for (let i = 0; i < n; i++) [s, o] = poe(s, p, 'Mountain'); return s; };
function mesa(seed = 634) {
  const d = ns => ns.map(name => ({ name, qty: 6, zone: 'main' }));
  const todos = [FA, MR, PM, 'Metade Um // Metade Dois', 'Mountain'];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCR, first: 0, players: [{ name: 'A', deck: d(todos) }, { name: 'B', deck: d(todos) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolveTudo = s => { for (let i = 0; i < 80 && (s.stack.length || (s.queued || []).length) && !s.pending; i++) s = act(s, { t: 'pass', p: s.turn.priority }); return s; };
const nomeDe = (s, n) => Object.keys(s.facts).find(k => k === n || k.split(' // ')[0] === n.split(' // ')[0]);

test('M-634 · 712.8a/715.4: fora do campo, a linha de tipo é só a da face de cima (transformar, modal e aventura)', () => {
  const s = mesa();
  assert.equal(s.facts[nomeDe(s, FA)].typeText, 'Enchantment — Saga', 'Fable: só a Saga');
  assert.equal(s.facts[nomeDe(s, MR)].typeText, 'Creature — Zombie Knight', 'aventura: só a criatura (715.4)');
  assert.equal(s.facts[nomeDe(s, PM)].typeText, 'Creature — Djinn Monk', 'modal: só a frente (712.8a)');
  assert.deepEqual(J(s.facts[nomeDe(s, FA)].types), ['enchantment']);
});

test('M-634 · 709.4: a dividida continua com as duas metades na linha de tipo', () => {
  const s = mesa();
  assert.equal(s.facts['Metade Um // Metade Dois'].typeText, 'Instant // Sorcery');
});

test('M-634 · 712.8d: com a Saga para cima, Fable não é Goblin nem criatura; com o verso para cima, é Goblin Shaman', () => {
  let s = mesa(), fa; [s, fa] = poe(s, 0, FA, 'hand'); s = terras(s, 0, 3);
  const c = E.legalActions(s, 0).find(a => a.t === 'cast' && a.oid === fa); assert.ok(c, 'Fable conjurável');
  s = resolveTudo(act(s, c));
  assert.equal(s.objects[fa].zone, 'battlefield');
  const o = s.objects[fa];
  assert.equal(E.linhaDeTipo(s, o), 'Enchantment — Saga');
  assert.equal(E.targetAllowed(s, CACA, { oid: fa }, null), false, '"target Goblin" não mira a Saga');
  const gob = s.zones[0].battlefield.find(x => s.objects[x].name === 'Goblin Shaman');
  assert.ok(gob, 'a ficha do capítulo I');
  assert.equal(E.targetAllowed(s, CACA, { oid: gob }, null), true, 'a ficha Goblin Shaman continua alvo');
  // verso para cima (712.8d): o objeto passa a ter as características de Reflection of Kiki-Jiki
  const t = J(s); const ov = t.objects[fa];
  if (ov.frontName == null) ov.frontName = ov.name; ov.name = RK;
  assert.match(E.linhaDeTipo(t, t.objects[fa]), /Goblin Shaman/);
  assert.equal(E.targetAllowed(t, CACA, { oid: fa }, null), true, 'o verso é Goblin');
});

test('M-634 · sem `layout` no dado (lista antiga, sem rede): a marca do script à mão (dupla face) também corta a linha', () => {
  const semLayout = Object.fromEntries(Object.entries(C).map(([n, c]) => [n, c.layout === 'split' ? c : { ...c, layout: undefined, faces: undefined }]));
  const d = ns => ns.map(name => ({ name, qty: 6, zone: 'main' }));
  const todos = [FA, MR, PM, 'Mountain'];
  const s = E.createGame({ format: 'livre', seed: 6341, mode: 'full', cards: semLayout, scripts: SCR, first: 0, players: [{ name: 'A', deck: d(todos) }, { name: 'B', deck: d(todos) }] });
  assert.equal(s.facts[nomeDe(s, FA)].typeText, 'Enchantment — Saga');
});
