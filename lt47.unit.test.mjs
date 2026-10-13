// M-364 · LT37 · Frase do Pauper: "revele as duas de cima, uma para a mão e a outra para o cemitério; se a da mão for artefato, ganhe 3" —
// revisão por lote XXVIII: Chrome Courier (texto: corpus
// do Oracle do Forge, consulta de 12/10/2026, guardado em .listas/oficiais-revisadas.json). O teste falha no motor anterior.
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
const NOMES = ['Chrome Courier'];
const EX = { example: { action: 'etb', target: 'none', expect: { attached: false } } };
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: mv(mana_cost), keywords: [], oracle_text: '', colors: cores(mana_cost), ...extra });
const cards = { ...Object.fromEntries(NOMES.map(n => [n, carta(n)])), Anula: c0('Anula', 'Instant', '{U}'), Engenho: c0('Engenho', 'Artifact', '{1}'), Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2' }) };
const scripts = { ...Object.fromEntries(NOMES.map(n => [n, { ...L.ler(carta(n)).script, ...EX }])), Anula: { name: 'Anula', effects: [{ do: 'counter', target: 'spell' }], example: { target: 'none', expect: { selfLife: 20 } } } };
function mesaX(a = [], b = [], seed = 67) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Mountain', 'Island']) }, { name: 'B', deck: baralho([...b, 'Island', 'Plains']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const semCampo = (s, p) => { s = J(s); for (const o of s.zones[p].battlefield.slice()) { s.zones[p].battlefield = s.zones[p].battlefield.filter(x => x !== o); s.zones[p].library.push(o); s.objects[o].zone = 'library'; } return s; };

test('LT37 · Chrome Courier: ao entrar revela as duas de cima; uma vai para a mão (obrigatória), a outra para o cemitério; artefato na mão dá 3 de vida', () => {
  for (const pegaArtefato of [true, false]) {
    let s = mesaX(['Chrome Courier', 'Engenho', 'Urso']), cc;
    [s, cc] = poe(s, 0, 'Chrome Courier', 'hand');
    s = J(s); const lib = s.zones[0].library; const e = lib.find(o => s.objects[o].name === 'Engenho'), u = lib.find(o => s.objects[o].name === 'Urso');
    s.zones[0].library = [e, u, ...lib.filter(o => o !== e && o !== u)];
    const vida = s.players[0].life;
    let m = comMana(s, 'WUU'); let t = act(m, legais(m, 0, a => a.t === 'cast' && a.oid === cc)[0]);
    for (let i = 0; i < 8 && !(t.pending && t.pending.kind === 'pick'); i++) t = t.pending ? act(t, legais(t, t.pending.p)[0]) : act(t, { t: 'pass', p: t.turn.priority });
    assert.equal(t.pending.kind, 'pick'); assert.equal(t.pending.min, 1, 'uma vai para a mão, obrigatoriamente');
    t = act(t, { t: 'pick', p: 0, oid: pegaArtefato ? e : u });
    for (let i = 0; i < 6 && (t.pending || t.stack.length); i++) t = t.pending ? act(t, legais(t, t.pending.p)[0]) : act(t, { t: 'pass', p: t.turn.priority });
    assert.equal(t.objects[pegaArtefato ? e : u].zone, 'hand'); assert.equal(t.objects[pegaArtefato ? u : e].zone, 'graveyard');
    assert.equal(t.players[0].life, vida + (pegaArtefato ? 3 : 0));
  }
});
