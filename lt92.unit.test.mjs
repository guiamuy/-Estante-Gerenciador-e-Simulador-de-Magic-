// M-410 · LT76 · reforçar (702.77a) e necrofagia (702.97a) pelo leitor: "Reinforce N—{custo}" e "Scavenge {custo}" (texto da Scryfall de 17/10/2026,
// .listas/oficiais-revisadas.json), caminho de produção (APROVADAS). Bannerhide Krushok e a classe lida por inteiro. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, palavrasDoTexto, valorDeMana, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Bannerhide Krushok', 'Burrenton Bombardier', 'Deadbridge Goliath', 'Dreg Mangler', 'Drudge Beetle', 'Earthbrawn', 'Hunting Triad', 'Korozda Monitor', 'Mosquito Guard', 'Sewer Shambler', 'Slitherhead', 'Sluiceway Scorpion', 'Terrus Wurm', 'Thrashing Mossdog', 'Zanikev Locust'];
const cores = c => [...new Set((c || '').match(/[WUBRG]/g) || [])];
const C = {}; for (const n of NOMES) { const c = OF.find(x => x.name === n); C[n] = { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: palavrasDoTexto(c.oracle_text), oracle_text: c.oracle_text, colors: cores(c.mana_cost), ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; }
C.Urso = { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' };
C.Raio = { name: 'Raio', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: '', colors: ['R'] };
for (const [n, k] of Object.entries({ Forest: 'G', Swamp: 'B', Plains: 'W' })) C[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
function mesa(seed = 7) {
  const b = ns => ns.map(name => ({ name, qty: 6, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Bannerhide Krushok', 'Hunting Triad', 'Slitherhead', 'Urso', 'Forest', 'Forest', 'Swamp']) }, { name: 'B', deck: b(['Urso', 'Raio', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);
const terrenos = (s, p, n, nome = 'Forest') => { for (let i = 0; i < n; i++) [s] = poe(s, p, nome); return s; };

test('LT76 · o leitor lê reforçar e necrofagia; as 15 da classe jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { const cov = S.coverage(C[n]); assert.equal(cov.level, 'completo', n + ': ' + JSON.stringify(cov)); assert.equal(S.APROVADAS[n].leva, 'M-410'); }
  const sc = S.leitura(C['Bannerhide Krushok']).script;
  assert.deepEqual(JSON.parse(JSON.stringify(sc.abilities)), [
    { kind: 'activated', label: 'Reforçar 2', cost: { mana: '{1}{G}', discardSelf: true, fromHand: true }, effects: [{ do: 'counters', amount: 2, target: 'creature' }] },
    { kind: 'activated', label: 'Necrofagia', cost: { mana: '{5}{G}{G}', fromGraveyard: true, exileSelf: true }, sorceryOnly: true, effects: [{ do: 'counters', amount: 4, target: 'creature' }] }]);
  assert.equal(S.leitura(C['Slitherhead']).script.abilities[0].effects[0].amount, 1, 'poder impresso 1');
  assert.equal(S.leitura({ ...C['Slitherhead'], power: '*' }), null, 'sem poder numérico, não lê');
});

test('LT76 · reforçar: da mão, a qualquer momento com prioridade (também no turno do oponente), paga {1}{G} e descarta a carta; a habilidade usa a pilha', () => {
  let s = mesa(), k, u, ub, ht; [s, k] = poe(s, 0, 'Bannerhide Krushok', 'hand'); [s, ht] = poe(s, 0, 'Hunting Triad', 'hand'); [s, u] = poe(s, 0, 'Urso'); [s, ub] = poe(s, 1, 'Urso');
  assert.ok(!legais(s, 0, a => a.oid === k && a.t === 'activate').length, 'sem mana, não oferece');
  s = terrenos(s, 0, 2);
  const at = legais(s, 0, a => a.oid === k && a.t === 'activate'); assert.deepEqual([...at.map(a => a.targets[0].oid)].sort(), [u, ub].sort(), 'qualquer criatura');
  let t = act(s, at.find(a => a.targets[0].oid === ub)); assert.equal(t.objects[k].zone, 'graveyard', 'descartada como custo'); assert.equal(t.stack.length, 1);
  assert.equal(t.zones[0].battlefield.filter(o => t.objects[o].tapped).length, 2, 'pagou {1}{G}');
  t = resolve(t); assert.equal(t.objects[ub].counters.p1p1, 2);
  // alvo que sai do campo antes: nada (608.2b)
  let f = act(s, at.find(a => a.targets[0].oid === u)); f = J(f); f.zones[0].battlefield.splice(f.zones[0].battlefield.indexOf(u), 1); f.zones[0].graveyard.push(u); f.objects[u].zone = 'graveyard'; f.objects[u].zc = (f.objects[u].zc || 0) + 1;
  f = resolve(f); assert.ok(!(f.objects[u].counters || {}).p1p1);
  // no turno do oponente, com prioridade (mágica de feitiço também reforça: Hunting Triad)
  let o = J(s); o.turn.active = 1; o.turn.priority = 0; o.turn.step = 'main1';
  assert.ok(legais(o, 0, a => a.oid === k && a.t === 'activate').length, 'reforçar fora do próprio turno');
  o = terrenos(o, 0, 2); assert.ok(legais(o, 0, a => a.oid === ht && a.t === 'activate').length, 'feitiço com reforçar, da mão, fora do próprio turno');
  assert.ok(!legais(o, 0, a => a.oid === ht && a.t === 'cast').length, 'o feitiço em si não é conjurável fora do próprio turno');
});

test('LT76 · necrofagia: só do cemitério, só como feitiço; exila a carta como custo e põe marcadores iguais ao poder impresso', () => {
  let s = mesa(), k, u, sl; [s, k] = poe(s, 0, 'Bannerhide Krushok', 'graveyard'); [s, sl] = poe(s, 0, 'Slitherhead', 'graveyard'); [s, u] = poe(s, 0, 'Urso');
  const sl0 = legais(s, 0, a => a.oid === sl && a.t === 'activate'); assert.equal(sl0.length, 1, 'Slitherhead: {0}');
  assert.ok(!legais(s, 0, a => a.oid === k && a.t === 'activate').length, 'sem {5}{G}{G}, não oferece');
  s = terrenos(s, 0, 7);
  const at = legais(s, 0, a => a.oid === k && a.t === 'activate'); assert.equal(at.length, 1); assert.equal(at[0].targets[0].oid, u);
  let t = act(s, at[0]); assert.equal(t.objects[k].zone, 'exile', 'exilada como custo'); t = resolve(t); assert.equal(t.objects[u].counters.p1p1, 4);
  let w = resolve(act(s, sl0[0])); assert.equal(w.objects[u].counters.p1p1, 1); assert.equal(w.objects[sl].zone, 'exile');
  // só como feitiço: com algo na pilha, ou no turno do oponente, não
  let p = act(s, legais(s, 0, a => a.oid === sl && a.t === 'activate')[0]); assert.ok(!legais(p, 0, a => a.oid === k && a.t === 'activate').length, 'pilha não vazia');
  let o = J(s); o.turn.active = 1; o.turn.priority = 0; assert.ok(!legais(o, 0, a => a.oid === k && a.t === 'activate').length, 'turno do oponente');
  // na mão, a necrofagia não existe; no cemitério, o reforçar não
  let m = mesa(), k2; [m, k2] = poe(m, 0, 'Bannerhide Krushok', 'hand'); m = terrenos(m, 0, 7); let u2; [m, u2] = poe(m, 0, 'Urso');
  assert.ok(legais(m, 0, a => a.oid === k2 && a.t === 'activate').every(a => a.fromHand && a.index === 0));
  assert.ok(at.every(a => a.fromGraveyard && a.index === 1));
});

test('LT76 · a pilha explicada diz os marcadores', async () => {
  const { loadModules } = await import('./_load.mjs'); const M = loadModules();
  assert.match(M.table.descreveEfeitos([{ do: 'counters', amount: 2, target: 'creature' }]), /2 marcadores \+1\/\+1/);
});
