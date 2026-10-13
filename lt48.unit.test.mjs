// M-365 · LT38 · Frase do Pauper: "As long as ~ is on the stack, spells that target it cost {2} more to cast" (601.2f), a taxa em todos os caminhos
// de custo e a oferta otimista sem cortar as ofertas das trilhas — revisão por lote XXIX: Kaervek's Torch (texto: corpus
// do Oracle do Forge, consulta de 12/10/2026, guardado em .listas/oficiais-revisadas.json). Os testes falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, CARTAS } from './cmd.mjs';
import { loadModules } from './_load.mjs';
const { leitor: L } = loadModules();

const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const mv = m => [...(m || '').matchAll(/\{([^}]+)\}/g)].reduce((n, x) => n + (/^\d+$/.test(x[1]) ? +x[1] : 1), 0);
const cores = m => [...new Set(((m || '').match(/[WUBRG]/g) || []))];
const carta = n => { const c = OF.find(x => x.name === n); assert.ok(c, n); return { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: mv(c.mana_cost), keywords: /^Flying/.test(c.oracle_text) ? ['Flying'] : [], oracle_text: c.oracle_text, colors: cores(c.mana_cost), ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const NOMES = ["Kaervek's Torch"];
const EX = { example: { action: 'etb', target: 'none', expect: { attached: false } } };
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: mv(mana_cost), keywords: [], oracle_text: '', colors: cores(mana_cost), ...extra });
const cards = { ...Object.fromEntries(NOMES.map(n => [n, carta(n)])), Anula: c0('Anula', 'Instant', '{U}'), AnulaFB: c0('AnulaFB', 'Instant', '{U}', { oracle_text: 'Counter target spell.\nFlashback {U}' }), DuplaLivre: c0('DuplaLivre', 'Instant', '{U}'), Convoca: c0('Convoca', 'Instant', '{3}{U}', { keywords: ['Convoke'], oracle_text: 'Convoke\nDraw a card.' }), Engenho: c0('Engenho', 'Artifact', '{1}'), Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2' }) };
const scripts = { ...Object.fromEntries(NOMES.map(n => [n, { ...L.ler(carta(n)).script, ...EX }])), Anula: { name: 'Anula', effects: [{ do: 'counter', target: 'spell' }], example: { target: 'none', expect: { selfLife: 20 } } },
  AnulaFB: { name: 'AnulaFB', effects: [{ do: 'counter', target: 'spell' }], flashback: { mana: '{U}' }, example: { target: 'none', expect: { selfLife: 20 } } },
  DuplaLivre: { name: 'DuplaLivre', effects: [{ do: 'counter', target: 'spell', alvoLivre: true }, { do: 'counter', target: 'spell', alvoLivre: true }], example: { target: 'none', expect: { selfLife: 20 } } },
  Convoca: { name: 'Convoca', effects: [{ do: 'draw', amount: 1 }], example: { target: 'none', expect: { selfLife: 20 } } } };
function mesaX(a = [], b = [], seed = 67) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Mountain', 'Island']) }, { name: 'B', deck: baralho([...b, 'Island', 'Plains']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const semCampo = (s, p) => { s = J(s); for (const o of s.zones[p].battlefield.slice()) { s.zones[p].battlefield = s.zones[p].battlefield.filter(x => x !== o); s.zones[p].library.push(o); s.objects[o].zone = 'library'; } return s; };

test("LT38 · 601.2f · Kaervek's Torch na pilha: anular custa {2} a mais — com {U} só não dá; com {U}+2, dá", () => {
  let s = semCampo(semCampo(mesaX(["Kaervek's Torch"], ['Anula']), 0), 1), kt, an;
  [s, kt] = poe(s, 0, "Kaervek's Torch", 'hand'); [s, an] = poe(s, 1, 'Anula', 'hand');
  let m = comMana(s, 'RRR'); s = act(m, legais(m, 0, a => a.t === 'cast' && a.oid === kt && a.x === 2 && (a.targets || []).some(t => t.player === 1))[0]);
  s = act(s, { t: 'pass', p: 0 });
  let b1 = comMana(s, 'U', 1);
  assert.equal(legais(b1, 1, a => a.t === 'cast' && a.oid === an).length, 0, 'com só {U}, anular a Tocha não é oferecido');
  assert.throws(() => E.apply(b1, { t: 'cast', p: 1, oid: an, targets: [{ oid: kt }] }), /mana/);
  let b3 = comMana(s, 'UUU', 1); const of = legais(b3, 1, a => a.t === 'cast' && a.oid === an && a.targets[0].oid === kt);
  assert.equal(of.length, 1, 'com {U} e mais duas, é oferecido');
  const t = act(b3, of[0]); assert.deepEqual([t.players[1].pool.U || 0], [0], 'pagou as três');
});


const comTocha = (b = []) => { let s = semCampo(semCampo(mesaX(["Kaervek's Torch"], ['Anula', 'Urso', ...b]), 0), 1), kt; [s, kt] = poe(s, 0, "Kaervek's Torch", 'hand');
  const m = comMana(s, 'RRR'); s = act(m, legais(m, 0, a => a.t === 'cast' && a.oid === kt && a.x === 2 && (a.targets || []).some(t => t.player === 1))[0]); return [act(s, { t: 'pass', p: 0 }), kt]; };

test('LT38 · 601.2f / 702.34a · a taxa soma ao lampejo do passado e ao custo alternativo (achados da revisão): lampejo {U} na Tocha custa {2}{U}; Daze por devolver Ilha custa {2}', () => {
  let [s, kt] = comTocha(['AnulaFB', 'Daze']), fb, dz, il;
  [s, fb] = poe(s, 1, 'AnulaFB', 'graveyard'); [s, dz] = poe(s, 1, 'Daze', 'hand'); [s, il] = poe(s, 1, 'Island');
  const fb1 = comMana(s, 'U', 1); assert.equal(legais(fb1, 1, a => a.t === 'cast' && a.oid === fb && a.flashback).length, 0, 'lampejo com só {U}: não');
  const fb3 = comMana(s, 'UUU', 1); const of = legais(fb3, 1, a => a.t === 'cast' && a.oid === fb && a.flashback); assert.equal(of.length, 1); assert.equal(act(fb3, of[0]).players[1].pool.U || 0, 0, 'pagou {2}{U}');
  const alt0 = J(s); alt0.objects[il].tapped = true; assert.equal(legais(alt0, 1, a => a.t === 'cast' && a.oid === dz && a.alt != null).length, 0, 'Daze sem mana: não');
  const alt2 = comMana(alt0, 'UU', 1); const od = legais(alt2, 1, a => a.t === 'cast' && a.oid === dz && a.alt != null && a.targets[0].oid === kt);
  assert.equal(od.length, 1, 'Daze devolvendo a Ilha e pagando {2}'); const t = act(alt2, od[0]); assert.equal(t.objects[il].zone, 'hand'); assert.equal(t.players[1].pool.U || 0, 0);
});

test('LT38 · uma vez por mágica: dois alvos na mesma Tocha pagam {2} uma vez; e com a Tocha na pilha as ofertas das trilhas continuam (convocar) — achados da revisão', () => {
  let [s, kt] = comTocha(['DuplaLivre', 'Convoca']), du, cv;
  [s, du] = poe(s, 1, 'DuplaLivre', 'hand'); [s, cv] = poe(s, 1, 'Convoca', 'hand');
  const m3 = comMana(s, 'UUU', 1); const od = legais(m3, 1, a => a.t === 'cast' && a.oid === du && a.targets.every(t => t.oid === kt));
  assert.equal(od.length, 1, '{U} + {2} uma vez'); assert.equal(legais(comMana(s, 'UU', 1), 1, a => a.t === 'cast' && a.oid === du && a.targets.every(t => t.oid === kt)).length, 0);
  for (let i = 0; i < 4; i++) [s] = poe(s, 1, 'Urso');
  let sem = J(s); for (const o of sem.zones[1].battlefield) if (sem.objects[o].name !== 'Urso') sem.objects[o].tapped = true; sem = comMana(sem, 'U', 1);
  assert.ok(legais(sem, 1, a => a.t === 'cast' && a.oid === cv).length > 0, 'Convoca por convocar continua oferecida com a Tocha na pilha');
});
