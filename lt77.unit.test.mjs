// M-394 · LT61 · 201.5 · O leitor lê "this creature/artifact/Equipment…" (redação Oracle desde 2024) como o nome da carta (~), fora das aspas.
// Skateboard, Meteor Sword e White Auracite (Oracle do Forge, consulta de 12/10/2026; .listas/oficiais-revisadas.json), caminho de produção
// (APROVADAS). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';
import { valorDeMana, palavrasDoTexto } from './listas.mjs';
import { loadModules } from './_load.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const of = n => { const r = OF.find(x => x.name === n); return { name: r.name, type_line: r.type_line, mana_cost: r.mana_cost, cmc: valorDeMana(r.mana_cost), keywords: palavrasDoTexto(r.oracle_text), oracle_text: r.oracle_text, colors: [] }; };
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: valorDeMana(mana_cost), keywords: [], oracle_text: '', colors: [], ...extra });
const CARDS = { ...CARTAS, Skateboard: of('Skateboard'), 'White Auracite': { ...of('White Auracite'), colors: [] },
  Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2', colors: ['G'] }) };
function mesa() {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 61, mode: 'full', cards: CARDS, first: 0,
    players: [{ name: 'A', deck: baralho(['Skateboard', 'White Auracite', 'Plains']) }, { name: 'B', deck: baralho(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);

test('LT61 · leitor: "When this Equipment enters" e "until this artifact leaves the battlefield" viram ~; dentro de aspas, "this land" fica', () => {
  const L = loadModules().leitor;
  const r = L.ler({ name: 'X', type_line: 'Artifact', mana_cost: '{1}', oracle_text: 'When this artifact enters, draw a card.' });
  assert.ok(r.completa, JSON.stringify(r.frases));
  const q = L.ler({ name: 'Y', type_line: 'Sorcery', mana_cost: '{B}', oracle_text: 'Until end of turn, lands you control gain "Sacrifice this land: Add {B}."' });
  assert.ok(!q.completa, 'a habilidade concedida não vira "Sacrifice ~"');
});

test('LT61 · Skateboard entra e vira a permanente alvo; White Auracite exila o Urso até sair do campo', () => {
  let s = mesa(), sk, wa, u; [s, sk] = poe(s, 0, 'Skateboard', 'hand'); [s, wa] = poe(s, 0, 'White Auracite', 'hand'); for (let i = 0; i < 5; i++) [s] = poe(s, 0, 'Plains'); [s, u] = poe(s, 1, 'Urso');
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === sk)[0]));
  const mira = (s, oid) => { const i = s.pending.options.findIndex(o => o.oid === oid); return act(s, { t: 'pick_target', p: 0, index: i }); };
  assert.equal(s.pending && s.pending.kind, 'pick_target'); s = resolve(mira(s, u));
  assert.equal(s.objects[u].tapped, true, 'o Urso virou');
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === wa)[0]));
  s = resolve(s.pending && s.pending.kind === 'pick_target' ? mira(s, u) : s);
  assert.equal(s.objects[u].zone, 'exile', 'exilado');
});

test('LT61 · achado da revisão: custo de ativação que o leitor não conhece continua marcado como não lido (sem exceção, sem custo vazio)', () => {
  const L = loadModules().leitor;
  const g = L.ler({ name: 'Gilded Goose', type_line: 'Creature — Bird', mana_cost: '{G}', oracle_text: 'Flying\nWhen this creature enters, create a Food token.\n{1}{G}, {T}: Create a Food token.\n{T}, Sacrifice a Food: Add one mana of any color.', power: '0', toughness: '2' });
  assert.ok(!g.completa); assert.ok(g.frases.some(f => !f.lida && /Sacrifice a Food/i.test(f.texto)), JSON.stringify(g.frases));
  assert.ok(!JSON.stringify(g.script || {}).includes('"cost":null'), 'nenhuma habilidade com custo vazio');
});
