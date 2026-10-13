// M-369 · LT40 · "Return a creature card at random from your graveyard to your hand" — revisão por lote XXXI: Haunted Fengraf (texto: corpus do Oracle
// do Forge, consulta de 12/10/2026, guardado em .listas/oficiais-revisadas.json). Os testes falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, CARTAS } from './cmd.mjs';
import { loadModules } from './_load.mjs';
const { leitor: L, scripts: S } = loadModules();
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const hf = OF.find(x => x.name === 'Haunted Fengraf');
const carta = { name: hf.name, type_line: hf.type_line, mana_cost: '', cmc: 0, keywords: [], oracle_text: hf.oracle_text, colors: [] };
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: 2, keywords: [], oracle_text: '', colors: [...new Set((mana_cost.match(/[WUBRG]/g) || []))], ...extra });
const lido = L.ler(carta);
const cards = { 'Haunted Fengraf': carta, Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2' }), Lobo: c0('Lobo', 'Creature — Wolf', '{1}{G}', { power: '2', toughness: '2' }), Raio: c0('Raio', 'Instant', '{R}') };
const scripts = { 'Haunted Fengraf': { ...lido.script, example: { action: 'etb', target: 'none', expect: { attached: false } } } };
function mesaH(seed) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho(['Haunted Fengraf', 'Urso', 'Lobo', 'Raio', 'Forest']) }, { name: 'B', deck: baralho(['Plains', 'Island']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const usa = (s, hf) => { const m = comMana(s, 'GGG'); const a = legais(m, 0, x => x.t === 'activate' && x.oid === hf)[0]; assert.ok(a, 'oferecida'); return act(act(act(m, a), { t: 'pass', p: 0 }), { t: 'pass', p: 1 }); };

test('LT40 · leitor: Haunted Fengraf lida por inteiro e válida', () => {
  assert.equal(lido.completa, true, JSON.stringify(lido.frases));
  assert.deepEqual(JSON.parse(JSON.stringify(lido.script.abilities[0])), { kind: 'activated', cost: { mana: '{3}', tap: true, sacrifice: true }, effects: [{ do: 'volta_ao_acaso', tipos: ['creature'] }] });
  assert.deepEqual([...S.validateScript(scripts['Haunted Fengraf'])], []);
});

test('LT40 · a carta de criatura volta ao acaso (só criatura, nunca a mágica); com sementes diferentes, as duas criaturas aparecem; sem criatura, nada', () => {
  const vistas = new Set();
  for (const seed of [3, 5, 7, 11, 13, 17, 19, 23]) {
    let s = mesaH(seed), hf, u, l, r; [s, hf] = poe(s, 0, 'Haunted Fengraf'); [s, u] = poe(s, 0, 'Urso', 'graveyard'); [s, l] = poe(s, 0, 'Lobo', 'graveyard'); [s, r] = poe(s, 0, 'Raio', 'graveyard');
    const t = usa(s, hf);
    assert.equal(t.objects[hf].zone, 'graveyard', 'sacrificada como custo');
    assert.equal(t.objects[r].zone, 'graveyard', 'a mágica nunca volta');
    const volta = [u, l].filter(x => t.objects[x].zone === 'hand'); assert.equal(volta.length, 1, 'exatamente uma criatura volta');
    vistas.add(t.objects[volta[0]].name);
  }
  assert.equal(vistas.size, 2, 'o acaso escolhe as duas em sementes diferentes');
  let s = mesaH(29), hf, r; [s, hf] = poe(s, 0, 'Haunted Fengraf'); [s, r] = poe(s, 0, 'Raio', 'graveyard');
  const t = usa(s, hf); assert.equal(t.objects[r].zone, 'graveyard');
});

test('LT40 · 113.8 / 602.2a (achado da revisão): a Fengraf roubada é ativada por quem a controla — volta a criatura do cemitério DELE, não do dono', () => {
  let s = mesaH(31), hf, l, u;
  [s, hf] = poe(s, 0, 'Haunted Fengraf'); [s, l] = poe(s, 0, 'Lobo', 'graveyard');
  s = J(s); s.objects[hf].owner = 1; s.zones[0].battlefield = s.zones[0].battlefield.filter(x => x !== hf); s.zones[0].battlefield.push(hf);
  const ub = Object.values(s.objects).find(o => o.owner === 1 && o.zone === 'library'); // uma carta qualquer no cemitério do dono s.zones[1].library = s.zones[1].library.filter(x => x !== ub.oid); s.zones[1].graveyard.push(ub.oid); s.objects[ub.oid].zone = 'graveyard';
  const m = comMana(s, 'GGG'); const a = legais(m, 0, x => x.t === 'activate' && x.oid === hf)[0]; assert.ok(a);
  const pilha = act(m, a); const hab = pilha.objects[pilha.stack[pilha.stack.length - 1]]; assert.equal(hab.controller, 0, 'a habilidade é de quem ativou');
  const t = act(act(pilha, { t: 'pass', p: 0 }), { t: 'pass', p: 1 });
  assert.equal(t.objects[l].zone, 'hand'); assert.equal(t.zones[0].hand.includes(l), true, 'o Lobo volta para a mão de A');
});
