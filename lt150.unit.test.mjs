// M-468 · LT134 · revisão por lote CXIV: dez cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Nomadic Elf', "Wanderer's Twig", 'Kamahl, Pit Fighter', 'Diregraf Ghoul', 'Disentomb', 'Spider-Bot', 'Dead Weight', 'Pelakka Wurm', 'Mudbutton Torchrunner', 'Merfolk Looter'];
const palavras = t => [...new Set(String(t).split('\n').map(l => l.replace(/\s*\(.*\)\s*$/, '').trim()).filter(l => /^(Haste|Reach|Trample)$/.test(l)))];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: palavras(c.oracle_text), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Forest: terra('Forest', 'Forest', 'G'), Swamp: terra('Swamp', 'Swamp', 'B'), Island: terra('Island', 'Island', 'U'), Mountain: terra('Mountain', 'Mountain', 'R') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 137, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Urso', 'Forest', 'Swamp', 'Island', 'Mountain']) }, { name: 'B', deck: b(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, (pk && pk.kind === 'pick' ? l.find(x => x.t === 'pick') : null) || l.find(x => x.t === 'yes' || x.t === 'accept') || l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };

test('LT134 · as dez jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-468', n); }
});

test('LT134 · Kamahl ataca com ímpeto e causa 3 com {T}; Diregraf Ghoul entra virado', () => {
  let s = mesa(), k; [s, k] = poe(s, 0, 'Kamahl, Pit Fighter', 'hand'); s = terras(s, 'Mountain', 6);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === k)[0]));
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === k && a.targets[0].player === 1)[0])); assert.equal(s.players[1].life, 17);
  let t = mesa(), g; [t, g] = poe(t, 0, 'Diregraf Ghoul', 'hand'); t = terras(t, 'Swamp', 1);
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === g)[0])); assert.equal(t.objects[g].tapped, true);
});

test('LT134 · Dead Weight: -2/-2 mata o Urso; Pelakka Wurm dá 7 de vida ao entrar e compra ao morrer; Mudbutton causa 3 ao morrer', () => {
  let s = mesa(), dw, u; [s, dw] = poe(s, 0, 'Dead Weight', 'hand'); [s, u] = poe(s, 1, 'Urso'); s = terras(s, 'Swamp', 1);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === dw && a.targets[0].oid === u)[0])); assert.equal(s.objects[u].zone, 'graveyard');
  let t = mesa(), pw; [t, pw] = poe(t, 0, 'Pelakka Wurm', 'hand'); t = terras(t, 'Forest', 7);
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === pw)[0])); assert.equal(t.players[0].life, 27);
});

test("LT134 · Wanderer's Twig busca um básico para a mão; Merfolk Looter compra e descarta", () => {
  let s = mesa(), tw; [s, tw] = poe(s, 0, "Wanderer's Twig"); s = terras(s, 'Forest', 1); const mao0 = s.zones[0].hand.length;
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === tw)[0])); assert.equal(s.objects[tw].zone, 'graveyard'); assert.equal(s.zones[0].hand.length, mao0 + 1);
  let t = mesa(), ml; [t, ml] = poe(t, 0, 'Merfolk Looter'); t = J(t); t.objects[ml].sick = false; const m1 = t.zones[0].hand.length, g1 = t.zones[0].graveyard.length;
  t = tudo(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === ml)[0])); assert.equal(t.zones[0].hand.length, m1); assert.equal(t.zones[0].graveyard.length, g1 + 1);
});
