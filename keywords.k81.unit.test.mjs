// K-81 · CR 702.138 · fuga: "When ~ enters, sacrifice it unless it escaped." (Phlage, Uro) e "~ escapes with a +1/+1 counter on it."
// (Ox of Agonas), lidos pelo leitor. Textos da Scryfall (api.scryfall.com/cards/collection, pelo ramo catalogo de 25/10/2026) em
// .listas/oficiais-keywords.json. Antes, as duas frases não tinham padrão e o motor só marcava a fuga quando ela trazia marcadores.
// A aprovação (APROVADAS) é da homologação: aqui jogam pelo script lido passado à mão.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, J, act, poe, legais, passaAte } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-keywords.json', import.meta.url), 'utf8')).cartas;
const of = n => { const c = OF.find(x => x.name === n); assert.ok(c, 'sem texto oficial: ' + n);
  return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: (c.mana_cost.match(/\{[^}]+\}/g) || []).reduce((k, x) => k + (/^\{\d+\}$/.test(x) ? +x.slice(1, -1) : 1), 0), keywords: c.keywords, oracle_text: c.oracle_text, colors: [...new Set(c.mana_cost.match(/[WUBRG]/g) || [])], ...(c.power ? { power: c.power, toughness: c.toughness } : {}) }; };
const PH = "Phlage, Titan of Fire's Fury", URO = "Uro, Titan of Nature's Wrath";

test('K-81 · 702.138 · o leitor lê "sacrifice it unless it escaped" e "escapes with a +1/+1 counter"', () => {
  for (const n of [PH, URO, 'Ox of Agonas']) { const l = S.leitura(of(n)); assert.ok(l, `${n}: leitura completa`); assert.equal(l.aprovada, false); assert.equal(S.coverage(of(n)).level, 'lida', n); }
  const ph = S.leitura(of(PH)).script;
  assert.ok(ph.abilities.some(a => a.kind === 'triggered' && a.when === 'etb' && J(a.effects).length === 1 && a.effects[0].do === 'sacrifica_sem_fuga_k'), 'gatilho de entrada que sacrifica sem fuga');
  assert.deepEqual(J(S.leitura(of('Ox of Agonas')).script.escape), { mana: '{R}{R}', exileGraveyard: 8, comMarcadoresT: { p1p1: 1 } });
});

const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
const PEDRA = { name: 'Pedra', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] };
function mesa() {
  const C = { [PH]: of(PH), Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Pedra: PEDRA };
  const scripts = { [PH]: { ...S.leitura(C[PH]).script, lido: true, example: { action: 'etb', target: 'none', expect: { attached: false } } } };
  const b = ns => ns.map(name => ({ name, qty: 10, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 81, mode: 'full', cards: C, scripts, first: 0, players: [{ name: 'A', deck: b([PH, 'Mountain', 'Plains', 'Pedra']) }, { name: 'B', deck: b(['Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
/** Resolve a pilha: cada gatilho com alvo mira o oponente. */
function resolveTudo(s) {
  for (let i = 0; i < 60 && (s.stack.length || s.pending || (s.queued || []).length); i++) {
    const pd = s.pending; if (pd) { const op = legais(s, pd.p); const i1 = (pd.options || []).findIndex(o => o.player === 1); const a = (pd.kind === 'pick_target' && op.find(x => x.index === i1)) || op[0]; s = act(s, a); continue; }
    s = act(s, { t: 'pass', p: s.turn.priority });
  }
  return s;
}

test('K-81 · Phlage conjurada da mão é sacrificada ao entrar (e ainda causa 3); pela fuga, fica no campo', () => {
  let s = mesa(), ph; [s, ph] = poe(s, 0, PH, 'hand'); for (const n of ['Mountain', 'Mountain', 'Plains', 'Plains']) [s] = poe(s, 0, n);
  const vida = s.players[1].life;
  s = resolveTudo(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === ph && !x.escape)[0]));
  assert.equal(s.objects[ph].zone, 'graveyard', 'sem fuga: sacrificada'); assert.equal(s.players[1].life, vida - 3, 'o outro gatilho de entrada causa 3');
  for (let i = 0; i < 5; i++) [s] = poe(s, 0, 'Pedra', 'graveyard');
  s = J(s); for (const oid of s.zones[0].battlefield) s.objects[oid].tapped = false; // as terras de novo para a fuga
  const fg = legais(s, 0, x => x.t === 'cast' && x.oid === ph && x.escape); assert.ok(fg.length, 'a mesa oferece a fuga');
  s = resolveTudo(act(s, fg[0]));
  assert.equal(s.objects[ph].zone, 'battlefield', 'pela fuga: fica');
});
