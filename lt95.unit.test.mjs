// M-413 · LT79 · desenterrar (702.84a) e harmonizar (702.180a) pelo leitor: "Unearth {custo}" vira o desenterrar do motor (M-257) e "Harmonize {custo}"
// passa a ser lido como linha de palavra-chave (o motor lê o custo da carta, K-55). Texto da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json),
// caminho de produção (APROVADAS). Scrapwork Mutt e Unending Whisper travavam listas Pauper. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, palavrasDoTexto, valorDeMana, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const LOTE = ['Archfiend of Sorrows', 'Channeled Dragonfire', 'Combat Courier', 'Grixis Slavedriver', 'Mammoth Bellow', "Roamer's Routine", 'Scourge Devil', 'Scrapwork Cohort', 'Scrapwork Mutt', 'Shambling Remains', "Tocasia's Onulet", 'Undead Leotau', 'Unending Whisper', "Ureni's Rebuff", 'Viscera Dragger', 'Vithian Stinger'];
const cores = c => [...new Set((c || '').match(/[WUBRG]/g) || [])];
const C = {}; for (const n of LOTE) { const c = OF.find(x => x.name === n); C[n] = { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: palavrasDoTexto(c.oracle_text), oracle_text: c.oracle_text, colors: cores(c.mana_cost), ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; }
C.Gigante = { name: 'Gigante', type_line: 'Creature — Giant', mana_cost: '{4}{R}', cmc: 5, keywords: [], oracle_text: '', colors: ['R'], power: '5', toughness: '5' };
for (const [n, k] of Object.entries({ Mountain: 'R', Island: 'U' })) C[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
function mesa(seed = 13) {
  const b = ns => ns.map(name => ({ name, qty: 12, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Scrapwork Mutt', 'Unending Whisper', 'Gigante', 'Mountain', 'Island']) }, { name: 'B', deck: b(['Gigante', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);
const terrenos = (s, n, nome) => { for (let i = 0; i < n; i++) [s] = poe(s, 0, nome); return s; };

test('LT79 · as 16 da classe jogam pelo leitor aprovado; o desenterrar vai para o script e o harmonizar é linha de palavra-chave', () => {
  for (const n of LOTE) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-413', n); }
  assert.deepEqual(JSON.parse(JSON.stringify(S.leitura(C['Scrapwork Mutt']).script.unearth)), { mana: '{1}{R}' });
  assert.ok(!('harmonize' in S.leitura(C['Unending Whisper']).script));
});

test('LT79 · Scrapwork Mutt: desenterrar só do cemitério e como feitiço, com ímpeto; exilado no começo do próximo passo final', () => {
  let s = mesa(), m; [s, m] = poe(s, 0, 'Scrapwork Mutt', 'graveyard');
  assert.ok(!legais(s, 0, a => a.oid === m).length, 'sem {1}{R}, nada');
  s = terrenos(s, 2, 'Mountain'); const un = legais(s, 0, a => a.oid === m); assert.equal(un.length, 1, JSON.stringify(un));
  let t = passaAte(act(s, un[0]), x => !x.stack.length || !!x.pending);
  if (t.pending) t = passaAte(act(t, legais(t, t.pending.p).find(a => a.t === 'decline') || legais(t, t.pending.p)[0]), x => !x.stack.length && !x.pending);
  assert.equal(t.objects[m].zone, 'battlefield'); assert.equal(t.objects[m].desenterrada, true); assert.ok(E.has ? E.has(t, t.objects[m], 'haste') : JSON.stringify(t.objects[m]).includes('haste'), 'ganha ímpeto');
  t = passaAte(t, x => x.turn.active === 1, 200);
  assert.equal(t.objects[m].zone, 'exile', 'exilado no passo final');
  let o = J(s); o.turn.active = 1; o.turn.priority = 0; assert.ok(!legais(o, 0, a => a.oid === m).length, 'só como feitiço');
});

test('LT79 · achado da revisão (400.7): a carta que sai do cemitério e volta em resposta é outra; o desenterrar não a devolve', () => {
  let s = mesa(), m; [s, m] = poe(s, 0, 'Scrapwork Mutt', 'graveyard'); s = terrenos(s, 2, 'Mountain');
  let t = act(s, legais(s, 0, a => a.oid === m)[0]); assert.equal(t.stack.length, 1);
  t = J(t); t.objects[m].zc = (t.objects[m].zc || 0) + 1; // saiu e voltou ao cemitério enquanto a habilidade esperava
  t = passaAte(t, x => !x.stack.length || !!x.pending); assert.equal(t.objects[m].zone, 'graveyard');
});

test('LT79 · Unending Whisper: conjurada do cemitério pelo custo de harmonizar, virando uma criatura para reduzir; depois, exílio', () => {
  let s = mesa(), w, g; [s, w] = poe(s, 0, 'Unending Whisper', 'graveyard'); [s, g] = poe(s, 0, 'Gigante'); s = terrenos(s, 1, 'Island');
  const h = legais(s, 0, a => a.t === 'cast' && a.oid === w); assert.ok(h.length, 'harmonizar com {U} + o Gigante (poder 5) pagando {5}');
  const mao = s.zones[0].hand.length; const t = resolve(act(s, h[0]));
  assert.equal(t.objects[w].zone, 'exile'); assert.equal(t.zones[0].hand.length, mao + 1); assert.equal(t.objects[g].tapped, true);
});
