// K-84 · CR 714.2 / 714.3a / 714.3b · leitor de Sagas: "I —", "I, II —" e "IV — Nome — …" viram as habilidades de capítulo da T-1
// (`when: 'chapter'`, `chapters`), a Saga entra com um marcador de lore (714.3a) e "Read ahead" vira `self.readAhead` (714.3b, sem o
// marcador de entrada). Antes, a linha de capítulo não tinha padrão. Textos: Scryfall pelo ramo catalogo (31/10/2026) em
// .listas/oficiais-keywords.json (Summon: Bahamut, The Antiquities War, Urza's Saga) e .listas/oficiais-tipos.json (History of Benalia).
// O efeito de cada capítulo é lido pelos padrões de sempre: capítulo com frase sem padrão continua sem leitura, e a carta também.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, J, act, poe, legais, passaAte } from './listas.mjs';
import { loadModules } from './_load.mjs';
const { leitor: L } = loadModules();
const OF = [...JSON.parse(readFileSync(new URL('./.listas/oficiais-keywords.json', import.meta.url), 'utf8')).cartas, ...JSON.parse(readFileSync(new URL('./.listas/oficiais-tipos.json', import.meta.url), 'utf8')).cartas];
const of = n => { const c = OF.find(x => x.name === n); assert.ok(c, 'sem texto oficial: ' + n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost || '', cmc: 3, keywords: c.keywords || [], oracle_text: c.oracle_text, colors: [], ...(c.power ? { power: c.power, toughness: c.toughness } : {}) }; };
const caps = r => J((r.script.abilities || []).filter(a => a.when === 'chapter').map(a => a.chapters));

test('K-84 · 714.2 · "I, II —" é um capítulo por número; o nome da habilidade antes do efeito sai (Summon: Bahamut)', () => {
  const r = L.ler(of('Summon: Bahamut'));
  assert.deepEqual(caps(r), [[1, 2], [3]], 'I, II e III lidos');
  assert.ok(r.frases.some(f => !f.lida && /^IV — Mega Flare/.test(f.texto)), 'o IV (dano pela soma dos valores de mana) continua sem leitura: a carta não fica lida');
  assert.equal(r.completa, false);
  assert.deepEqual(J(r.script.entra), [{ afetados: 'self', marcadores: { lore: 1 } }], '714.3a: entra com um marcador de lore');
});

test('K-84 · Saga com todos os capítulos lidos fica lida e passa no validador da T-1 (sem e com read ahead)', () => {
  const saga = (txt, ra) => ({ name: 'Saga de Teste', type_line: 'Enchantment — Saga', mana_cost: '{2}{G}', cmc: 3, keywords: ra ? ['Read ahead'] : [], colors: ['G'],
    oracle_text: `${ra ? 'Read ahead (Choose a chapter and start with that many lore counters. Add one after your draw step. Skipped chapters don\'t trigger.)\n' : ''}(As this Saga enters and after your draw step, add a lore counter. Sacrifice after III.)\n${txt}` });
  const txt = 'I — You gain 3 life.\nII, III — Draw a card.';
  const r = L.ler(saga(txt)); assert.ok(r.completa, 'lida por inteiro'); assert.deepEqual(caps(r), [[1], [2, 3]]);
  assert.deepEqual(J(S.validateScript({ ...r.script, example: { action: 'etb', target: 'none', expect: { attached: false } } })), []);
  const ra = L.ler(saga(txt, true)); assert.ok(ra.completa, 'read ahead lido'); assert.equal(ra.script.self.readAhead, true); assert.equal(ra.script.entra, undefined, '714.3b: sem marcador de entrada');
  assert.deepEqual(J(S.validateScript({ ...ra.script, example: { action: 'etb', target: 'none', expect: { attached: false } } })), []);
  const falta = L.ler(saga('I — You gain 3 life.\nIII — Draw a card.')); assert.equal(falta.completa, false, 'faltando o capítulo II: o validador da T-1 recusa');
});

test('K-84 · na partida, a Saga lida ganha o capítulo I ao entrar e o II na fase principal seguinte', () => {
  const C = { 'Saga de Teste': { name: 'Saga de Teste', type_line: 'Enchantment — Saga', mana_cost: '{G}', cmc: 1, keywords: [], colors: ['G'], oracle_text: '(As this Saga enters and after your draw step, add a lore counter. Sacrifice after II.)\nI — You gain 3 life.\nII — You gain 2 life.' },
    Forest: { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {G}.)', colors: [] } };
  const scripts = { 'Saga de Teste': { ...L.ler(C['Saga de Teste']).script, example: { action: 'etb', target: 'none', expect: { attached: false } } } };
  const b = ns => ns.map(name => ({ name, qty: 10, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 84, mode: 'full', cards: C, scripts, first: 0, players: [{ name: 'A', deck: b(['Saga de Teste', 'Forest']) }, { name: 'B', deck: b(['Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  let sg; [s, sg] = poe(s, 0, 'Saga de Teste', 'hand'); [s] = poe(s, 0, 'Forest');
  s = passaAte(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === sg)[0]), x => !x.stack.length && !x.pending && !(x.queued || []).length);
  assert.equal(s.players[0].life, 23, 'capítulo I'); assert.equal(s.objects[sg].counters.lore, 1);
  const t = s.turn.number; s = passaAte(s, x => x.turn.number > t + 1 && x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending && !(x.queued || []).length, 900);
  assert.equal(s.players[0].life, 25, 'capítulo II'); assert.equal(s.objects[sg].zone, 'graveyard', '714.4: sacrificada depois do último capítulo');
});

test("K-84 · Urza's Saga: a linha de capítulo é lida; os três efeitos ficam para a K-85", () => {
  const r = L.ler(of("Urza's Saga"));
  assert.equal(r.frases.filter(f => !f.lida && /^(I|II|III) — /.test(f.texto)).length, 3, 'os três capítulos esperam os efeitos da K-85');
});
