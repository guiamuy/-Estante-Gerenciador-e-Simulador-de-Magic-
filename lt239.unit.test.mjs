// M-557 · LT216 · revisão por lote CXCII (textos e rulings da Scryfall de 21-22/10/2026): Fiery Impulse (maestria em feitiços, conferida na resolução,
// a própria mágica ainda na pilha), Stubborn Denial (ferocidade na resolução: "counter that spell instead" tira a opção de pagar), Fading Hope
// ("If its mana value was 3 or less, scry 1": o valor de mana do alvo antes de sair do campo, 608.2h) e Broadside Barrage. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, T, act, poe, legais, passaAte } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const of = n => OF.find(x => x.name === n);
const carta = (n, cmc, colors) => { const o = of(n); return { name: n, type_line: o.type_line, mana_cost: o.mana_cost, cmc, keywords: [], oracle_text: o.oracle_text, colors }; };
const FI = 'Fiery Impulse', SD = 'Stubborn Denial', FH = 'Fading Hope', BB = 'Broadside Barrage';
const C = { [FI]: carta(FI, 1, ['R']), [SD]: carta(SD, 1, ['U']), [FH]: carta(FH, 1, ['U']), [BB]: carta(BB, 3, ['U', 'R']),
  Mountain: { name: 'Mountain', type_line: 'Basic Land — Mountain', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {R}.)', colors: [] },
  Island: { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] },
  Tres: { name: 'Tres', type_line: 'Creature — Bear', mana_cost: '{2}{G}', cmc: 3, keywords: [], oracle_text: '', power: '3', toughness: '3', colors: ['G'] },
  Quatro: { name: 'Quatro', type_line: 'Creature — Bear', mana_cost: '{3}{G}', cmc: 4, keywords: [], oracle_text: '', power: '4', toughness: '4', colors: ['G'] },
  Rito: { name: 'Rito', type_line: 'Sorcery', mana_cost: '{U}', cmc: 1, keywords: [], oracle_text: '', colors: ['U'] },
  Raio: { name: 'Raio', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: '', colors: ['R'] } };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = Object.fromEntries(['Rito', 'Raio'].map(n => [n, { name: n, effects: [{ do: 'gain', amount: 1 }], ...EX }]));
function mesa() {
  const b = ns => ns.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 239, mode: 'full', cards: C, scripts: SCRIPTS, first: 0, players: [
    { name: 'A', deck: b([[FI, 2], [SD, 2], [FH, 2], [BB, 1], ['Rito', 4], ['Raio', 4], ['Quatro', 2], ['Tres', 2], ['Mountain', 12], ['Island', 12]]) },
    { name: 'B', deck: b([['Tres', 4], ['Quatro', 4], ['Island', 32]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const limpa = s => passaAte(s, x => !!x.pending || (!x.stack.length && !(x.queued || []).length));
const terras = (s, nome, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, nome); return s; };

test('M-557 · as quatro jogam (lidas e aprovadas)', () => { for (const n of [FI, SD, FH, BB]) assert.equal(S.coverage(C[n]).level, 'completo', n); });

test('M-557 · Fiery Impulse: 2 de dano; 3 com duas ou mais instantâneas e/ou feitiços no cemitério (ela mesma, na pilha, não conta)', () => {
  const dano = gy => { let s = mesa(), f, a; [s, a] = poe(s, 1, 'Tres'); for (const n of gy) [s] = poe(s, 0, n, 'graveyard'); s = terras(s, 'Mountain', 1); [s, f] = poe(s, 0, FI, 'hand');
    s = limpa(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === f && (x.targets || []).some(t => t.oid === a))[0])); return [s.objects[a].zone, s.objects[a].damage || 0]; };
  assert.deepEqual(dano(['Rito']), ['battlefield', 2], 'uma só: 2 de dano, o 3/3 fica');
  assert.equal(dano(['Rito', 'Raio'])[0], 'graveyard', 'feitiço e instantânea: 3 de dano, o 3/3 morre');
  assert.equal(dano(['Tres', 'Rito'])[0], 'battlefield', 'criatura no cemitério não conta');
  assert.match(String(T.descreveEfeitos([{ do: 'damage', amount: { per: 'se', se: 'spell-mastery', sim: 3, nao: 2 }, target: 'creature' }])), /2 \(3 com maestria em feitiços: duas ou mais/);
});

test('M-557 · Stubborn Denial: sem ferocidade o controlador pode pagar {1}; com criatura de poder 4+ na resolução, anula sem oferecer', () => {
  const tenta = feroz => { let s = mesa(), r, d; if (feroz) [s] = poe(s, 0, 'Quatro'); else [s] = poe(s, 0, 'Tres'); s = terras(s, 'Island', 3); [s, r] = poe(s, 0, 'Rito', 'hand'); [s, d] = poe(s, 0, SD, 'hand');
    s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === r)[0]);
    s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === d && (x.targets || []).some(t => t.oid === r))[0]);
    s = passaAte(s, x => !!x.pending || !x.stack.some(o => o.oid === d || o === d)); return [s, r]; };
  let [s, r] = tenta(false); assert.equal(s.pending && s.pending.kind, 'may_pay', 'sem ferocidade: decide se paga {1}');
  [s, r] = tenta(true); assert.ok(!(s.pending && s.pending.kind === 'may_pay'), 'com ferocidade: sem opção de pagar'); assert.equal(s.objects[r].zone, 'graveyard', 'o Rito foi anulado');
  const ef = [{ do: 'counter', target: 'noncreature-spell', unless: { mana: '{1}' }, semUnlessSe: 'ferocious' }];
  assert.match(String(T.descreveEfeitos(ef)), /a menos que o controlador dela pague \{1\} \(se você controlar uma criatura com poder 4 ou mais, sem a opção de pagar\)/);
  assert.ok([...S.validateScript({ name: 'X', effects: [{ do: 'damage', amount: 1, target: 'creature', semUnlessSe: 'ferocious' }] })].some(e => /semUnlessSe/.test(e)), 'o validador recusa semUnlessSe fora da anulação');
  assert.deepEqual([...S.validateScript({ name: 'X', effects: ef })].filter(e => /semUnlessSe/.test(e)), []);
});

test('M-557 · Fading Hope: devolve; vidência só se o valor de mana da criatura era 3 ou menos', () => {
  const tenta = nome => { let s = mesa(), f, a; [s, a] = poe(s, 1, nome); s = terras(s, 'Island', 1); [s, f] = poe(s, 0, FH, 'hand');
    s = limpa(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === f && (x.targets || []).some(t => t.oid === a))[0])); return [s, a]; };
  let [s, a] = tenta('Tres'); assert.equal(s.objects[a].zone, 'hand'); assert.equal(s.pending && s.pending.label, 'scry', 'valor 3: vidência 1');
  [s, a] = tenta('Quatro'); assert.equal(s.objects[a].zone, 'hand'); assert.ok(!(s.pending && s.pending.label === 'scry'), 'valor 4: sem vidência');
  assert.match(String(T.descreveEfeitos([{ do: 'scry', amount: 1, onlyIf: 'alvo-mv-3-ou-menos' }])), /se o valor de mana do alvo era 3 ou menos/);
});
