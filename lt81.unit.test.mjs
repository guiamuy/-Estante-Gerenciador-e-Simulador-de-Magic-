// M-398 · LT65 · Cauldron Familiar: "When Cauldron Familiar enters, each opponent loses 1 life and you gain 1 life. Sacrifice a Food: Return
// Cauldron Familiar from your graveyard to the battlefield." (Oracle do Forge, consulta de 12/10/2026; .listas/oficiais-revisadas.json), caminho de
// produção (APROVADAS). 113.6: habilidade que funciona do cemitério; custo "sacrifique uma Comida". Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';
import { valorDeMana, palavrasDoTexto } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const r = OF.find(x => x.name === 'Cauldron Familiar');
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: valorDeMana(mana_cost), keywords: [], oracle_text: '', colors: [], ...extra });
const CARDS = { ...CARTAS, 'Cauldron Familiar': { name: r.name, type_line: r.type_line, mana_cost: r.mana_cost, cmc: valorDeMana(r.mana_cost), keywords: palavrasDoTexto(r.oracle_text), oracle_text: r.oracle_text, colors: ['B'], power: r.power, toughness: r.toughness },
  Comida: c0('Comida', 'Artifact — Food', '{1}'), Pedra: c0('Pedra', 'Artifact', '{1}') };
function mesa() {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 79, mode: 'full', cards: CARDS, first: 0,
    players: [{ name: 'A', deck: baralho(['Cauldron Familiar', 'Comida', 'Pedra', 'Swamp']) }, { name: 'B', deck: baralho(['Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);

test('LT65 · Cauldron Familiar no cemitério: sacrificar uma Comida (não outro artefato) o devolve ao campo, e o gatilho de entrada dispara', () => {
  let s = mesa(), cf, co, pe; [s, cf] = poe(s, 0, 'Cauldron Familiar', 'graveyard'); [s, co] = poe(s, 0, 'Comida'); [s, pe] = poe(s, 0, 'Pedra');
  const os = legais(s, 0, a => a.t === 'activate' && a.oid === cf);
  assert.ok(os.length >= 1 && os.every(a => a.pay && [].concat(a.pay.sacrifice).includes(co) && ![].concat(a.pay.sacrifice).includes(pe)), JSON.stringify(os));
  s = resolve(act(s, os[0])); s = resolve(s);
  assert.equal(s.objects[cf].zone, 'battlefield'); assert.equal(s.objects[co].zone, 'graveyard');
  assert.equal(s.players[1].life, 19); assert.equal(s.players[0].life, 21, 'o gatilho de entrada');
  let t = mesa(), cf2; [t, cf2] = poe(t, 0, 'Cauldron Familiar', 'graveyard'); [t] = poe(t, 0, 'Pedra');
  assert.equal(legais(t, 0, a => a.t === 'activate' && a.oid === cf2).length, 0, 'sem Comida, sem oferta');
});

test('LT65 · achado da revisão (400.7): a segunda ativação não devolve o Familiar que voltou ao cemitério como objeto novo', () => {
  let s = mesa(), cf, c1, c2; [s, cf] = poe(s, 0, 'Cauldron Familiar', 'graveyard'); [s, c1] = poe(s, 0, 'Comida'); [s, c2] = poe(s, 0, 'Comida');
  s = act(s, legais(s, 0, a => a.t === 'activate' && a.oid === cf && [].concat(a.pay.sacrifice).includes(c1))[0]);
  s = act(s, legais(s, 0, a => a.t === 'activate' && a.oid === cf && [].concat(a.pay.sacrifice).includes(c2))[0]);
  s = passaAte(s, x => x.stack.length === 1 || !!x.pending); // a de cima resolveu: o Familiar voltou
  if (s.pending) s = passaAte(s, x => !x.pending && x.stack.length <= 2);
  assert.equal(s.objects[cf].zone, 'battlefield');
  s = JSON.parse(JSON.stringify(s)); const zc = s.objects[cf].zc || 0; // sai de novo e volta ao cemitério: objeto novo
  s.zones[0].battlefield = s.zones[0].battlefield.filter(x => x !== cf); s.zones[0].graveyard.push(cf); s.objects[cf].zone = 'graveyard'; s.objects[cf].zc = zc + 1;
  s = passaAte(s, x => !x.stack.length || !!x.pending);
  assert.equal(s.objects[cf].zone, 'graveyard', 'a segunda habilidade não faz nada');
});
