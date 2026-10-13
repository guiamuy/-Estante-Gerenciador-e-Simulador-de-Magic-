// M-373 · LT42 · revisão por lote XXXIII (Pauper): Devoted Druid ("Untap ~"), Martyr's Soul ("if you control no tapped lands", 603.4),
// Heritage Reclamation ("up to one target card from a graveyard") e Thrilling Discovery ("you may discard two cards. If you do, draw three cards":
// todas ou nenhuma). Texto: corpus do Oracle do Forge, consulta de 12/10/2026, guardado em .listas/oficiais-revisadas.json. As cartas jogam pelo
// caminho de produção (APROVADAS, sem script passado). Os testes falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, act, poe, legais, passaAte, resolveUm, CARTAS } from './cmd.mjs';
import { valorDeMana, palavrasDoTexto, limpaMao } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const cores = c => [...new Set((c || '').match(/[WUBRG]/g) || [])];
const NOVAS = {};
for (const n of ['Devoted Druid', "Martyr's Soul", 'Heritage Reclamation', 'Thrilling Discovery']) { const c = OF.find(x => x.name === n);
  NOVAS[n] = { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: palavrasDoTexto(c.oracle_text), oracle_text: c.oracle_text, colors: cores(c.mana_cost), ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; }
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: 1, keywords: [], oracle_text: '', colors: cores(mana_cost), ...extra });
const EXTRA = { Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2' }), Soldado: c0('Soldado', 'Creature — Soldier', '{W}', { power: '1', toughness: '1' }) };
function mesa(a, seed = 5) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 6, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: { ...CARTAS, ...NOVAS, ...EXTRA }, first: 0,
    players: [{ name: 'A', deck: baralho([...a, 'Plains', 'Forest', 'Mountain']) }, { name: 'B', deck: baralho(['Island', 'Swamp']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);
const recusa = (s, a) => { try { E.apply(s, a); return false; } catch (e) { return true; } };

test('LT42 · Thrilling Discovery: ganha 2; com duas na mão, depois da primeira não dá para parar, e a segunda fecha: descarta as duas e compra três; recusar não faz nada; com uma só, nada é oferecido', () => {
  for (const n of [1, 2]) {
    let s = limpaMao(mesa(['Thrilling Discovery', 'Urso']), 0), td; [s, td] = poe(s, 0, 'Thrilling Discovery', 'hand');
    const mao = []; for (let i = 0; i < n; i++) { let o; [s, o] = poe(s, 0, 'Urso', 'hand'); mao.push(o); }
    [s] = poe(s, 0, 'Plains'); [s] = poe(s, 0, 'Mountain');
    const c = legais(s, 0, a => a.t === 'cast' && a.oid === td)[0]; assert.ok(c, 'a mesa chega na carta');
    s = resolve(act(s, c)); const lib = s.zones[0].library.length;
    assert.equal(s.players[0].life, 22);
    if (n === 1) { assert.ok(!s.pending, 'com uma carta não há o que descartar'); assert.equal(s.zones[0].hand.length, 1); continue; }
    assert.ok(legais(s, 0).some(a => a.t === 'pick_done'), '"you may": pode recusar');
    const r = resolve(act(s, { t: 'pick_done', p: 0 })); assert.equal(r.zones[0].hand.length, 2); assert.equal(r.zones[0].library.length, lib);
    let u = act(s, { t: 'pick', p: 0, oid: mao[0] });
    assert.ok(!legais(u, 0).some(a => a.t === 'pick_done'), 'depois da primeira, não oferece parar');
    assert.ok(recusa(u, { t: 'pick_done', p: 0 }), 'e o motor recusa parar com uma');
    u = resolve(act(u, { t: 'pick', p: 0, oid: mao[1] }));
    assert.equal(u.objects[mao[0]].zone, 'graveyard'); assert.equal(u.objects[mao[1]].zone, 'graveyard');
    assert.equal(u.zones[0].hand.length, 3); assert.equal(u.zones[0].library.length, lib - 3);
  }
});

test('LT42 · Devoted Druid: "Put a -1/-1 counter on ~: Untap ~" desvira (mesmo com enjoo: o custo não tem {T}); a segunda ativação a mata por ação de estado', () => {
  let s = mesa(['Devoted Druid']), d; [s, d] = poe(s, 0, 'Devoted Druid', 'battlefield'); s.objects[d].tapped = true;
  const a = legais(s, 0, x => x.t === 'activate' && x.oid === d)[0]; assert.ok(a, 'oferecida');
  s = resolve(act(s, a)); assert.equal(s.objects[d].tapped, false); assert.equal(E.stats(s, s.objects[d]).toughness, 1);
  s = resolve(act(s, legais(s, 0, x => x.t === 'activate' && x.oid === d)[0])); assert.equal(s.objects[d].zone, 'graveyard');
});

test('LT42 · Martyr\'s Soul: sem terreno virado, entra com dois marcadores; virando um terreno em resposta ao gatilho, não (603.4, conferido de novo ao resolver)', () => {
  const entra = (respondeVirando) => {
    let s = mesa(["Martyr's Soul", 'Soldado']), ms; [s, ms] = poe(s, 0, "Martyr's Soul", 'hand');
    const sold = []; for (let i = 0; i < 3; i++) { let o; [s, o] = poe(s, 0, 'Soldado', 'battlefield'); sold.push(o); }
    let pl; [s, pl] = poe(s, 0, 'Plains', 'battlefield');
    const c = legais(s, 0, a => a.t === 'cast' && a.oid === ms).find(a => sold.every(o => JSON.stringify(a).includes(String(o)))); assert.ok(c, 'conjura por convocar com os três soldados');
    s = resolveUm(act(s, c)); assert.equal(s.objects[ms].zone, 'battlefield'); assert.equal(s.stack.length, 1, 'gatilho na pilha');
    if (respondeVirando) { const tm = legais(s, 0, a => a.t === 'tap_mana' && a.oid === pl)[0]; assert.ok(tm, 'pode virar o terreno em resposta'); s = act(s, tm); }
    s = resolve(s); return E.stats(s, s.objects[ms]);
  };
  assert.equal(entra(false).power, 5); assert.equal(entra(true).power, 3);
});

test('LT42 · Heritage Reclamation: o terceiro modo com zero alvos compra uma carta', () => {
  let s = limpaMao(mesa(['Heritage Reclamation', 'Urso']), 0), hr; [s, hr] = poe(s, 0, 'Heritage Reclamation', 'hand'); [s] = poe(s, 0, 'Urso', 'graveyard'); [s] = poe(s, 0, 'Forest'); [s] = poe(s, 0, 'Forest');
  const c = legais(s, 0, a => a.t === 'cast' && a.oid === hr && !(a.targets || []).length)[0]; assert.ok(c, 'oferece o modo 3 sem alvo');
  s = resolve(act(s, c)); assert.equal(s.zones[0].hand.length, 1);
});
