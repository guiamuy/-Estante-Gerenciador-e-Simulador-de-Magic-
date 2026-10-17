// M-426 · LT92 · correções da revisão independente de M-416…M-421: (1) Ghostly Flicker devolve as duas cartas no mesmo evento — as que entram juntas se
// veem (603.6a); antes, uma de cada vez, Essence Warden + Soul Warden davam +1 em vez de +2; (2) o registro diz "criatura" quando o gatilho é de criatura
// (Hissing Iguanar, Mortician Beetle), não "permanente"; (3) a pilha explicada do Nested Shambler diz que as fichas entram viradas e que X é o poder.
// Textos da Scryfall (.listas/oficiais-revisadas.json). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, T, act, poe, legais, passaAte, palavrasDoTexto, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Ghostly Flicker', 'Essence Warden', 'Soul Warden', 'Hissing Iguanar', 'Mortician Beetle', 'Nested Shambler'];
const cores = c => [...new Set((c || '').match(/[WUBRG]/g) || [])];
const C = {}; for (const n of NOMES) { const c = OF.find(x => x.name === n); C[n] = { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: palavrasDoTexto(c.oracle_text), oracle_text: c.oracle_text, colors: cores(c.mana_cost), ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; }
C.Urso = { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' };
C.Island = { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] };
function mesa(seed = 36) {
  const b = ns => ns.map(name => ({ name, qty: name === 'Island' ? 20 : 5, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Urso', 'Island']) }, { name: 'B', deck: b(['Urso', 'Island']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
// resolve tudo: responde às decisões (ordem dos gatilhos) com a primeira opção; a fila de gatilhos vai para a pilha na ação seguinte (virar uma Island livre)
const resolve = s => {
  for (let i = 0; i < 60; i++) {
    if (s.pending && s.pending.kind !== 'priority') { s = act(s, legais(s, s.pending.p)[0]); continue; }
    if (s.stack.length) { s = passaAte(s, x => !x.stack.length || (!!x.pending && x.pending.kind !== 'priority'), 40); continue; }
    if (s.queued && s.queued.length) { const f = s.zones[0].battlefield.find(o => s.objects[o].name === 'Island' && !s.objects[o].tapped); s = act(s, { t: 'tap_mana', p: 0, oid: f, option: 0 }); continue; }
    return s;
  }
  return s;
};

test('LT92 · Ghostly Flicker em Essence Warden e Soul Warden: as duas voltam juntas e cada uma vê a outra entrar (603.6a) — +2', () => {
  let s = mesa(), gf, ew, sw; [s, gf] = poe(s, 0, 'Ghostly Flicker', 'hand'); 
  [s, ew] = poe(s, 0, 'Essence Warden'); [s, sw] = poe(s, 0, 'Soul Warden'); // as criaturas antes dos terrenos: a lista de pares de alvos oferecidos é limitada
  for (let i = 0; i < 4; i++) [s] = poe(s, 0, 'Island'); // três para o custo e uma para a ação que põe os gatilhos na pilha
  s = J(s); s.queued = [];
  const vida = s.players[0].life;
  const as = legais(s, 0, x => x.t === 'cast' && x.oid === gf && x.targets && x.targets.length === 2 && x.targets.some(t => t.oid === ew) && x.targets.some(t => t.oid === sw));
  assert.ok(as.length, 'os dois alvos');
  for (const a of as) { const t = resolve(act(s, a));
    assert.equal(t.objects[ew].zone, 'battlefield'); assert.equal(t.objects[sw].zone, 'battlefield');
    assert.equal(t.players[0].life, vida + 2, 'cada uma ganha 1 pela outra, na ordem de alvos oferecida');
  }
});

test('LT92 · Ghostly Flicker em Essence Warden e outra criatura: +1 nas duas ordens de alvo', () => {
  let s = mesa(), gf, ew, u; [s, gf] = poe(s, 0, 'Ghostly Flicker', 'hand'); 
  [s, ew] = poe(s, 0, 'Essence Warden'); [s, u] = poe(s, 0, 'Urso');
  for (let i = 0; i < 4; i++) [s] = poe(s, 0, 'Island');
  s = J(s); s.queued = [];
  const vida = s.players[0].life;
  const as = legais(s, 0, x => x.t === 'cast' && x.oid === gf && x.targets && x.targets.length === 2 && x.targets.some(t => t.oid === ew) && x.targets.some(t => t.oid === u));
  assert.ok(as.length, 'os dois alvos');
  for (const a of as) { const t = resolve(act(s, a)); assert.equal(t.players[0].life, vida + 1, JSON.stringify(a.targets.map(o => s.objects[o.oid].name)));
  }
});

test('LT92 · o registro: "quando outra criatura morre" (Hissing Iguanar) e "quando um jogador sacrifica outra criatura" (Mortician Beetle)', () => {
  const s = mesa();
  const linha = n => { const w = s.facts[n].script.abilities.find(a => a.kind === 'triggered').when; return T.describe(s, { t: 'pass', p: 0 }, [{ kind: 'trigger', name: n, when: w, oid: 1 }], s).join(' | '); };
  assert.match(linha('Hissing Iguanar'), /quando outra criatura morre/);
  assert.match(linha('Mortician Beetle'), /quando um jogador sacrifica outra criatura/);
  assert.match(linha('Essence Warden'), /outra criatura/);
});

test('LT92 · Nested Shambler: a pilha explicada diz que as fichas entram viradas e que X é o poder dela', () => {
  const s = mesa(); const ef = s.facts['Nested Shambler'].script.abilities.find(a => a.kind === 'triggered').effects[0];
  const txt = T.descreveEfeito(ef); assert.match(txt, /viradas/); assert.match(txt, /X = o poder dela/);
});
