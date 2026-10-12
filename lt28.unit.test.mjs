// M-345 · D3 (opção C, parte 2, decisão do dono de 12/10/2026) · 106.6 · "Spend this mana only…" impresso na linha de mana de carta sem script.
// Mishra's Workshop, Eldrazi Temple e Delighted Halfling jogavam pela cobertura do texto com a mana livre (opção A provisória). Agora a mana dessa
// linha guarda a restrição até ser gasta: só paga o que a frase permite, a sobra continua restrita, e a de Delighted Halfling torna a mágica
// impossível de anular. As três continuam jogando. Texto oficial: Oracle do Forge (12/10/2026). Cada teste de regra falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';
import { loadModules } from './_load.mjs';

const { scripts: S } = loadModules();
const terra = (name, oracle_text) => ({ name, type_line: 'Land', mana_cost: '', cmc: 0, keywords: [], colors: [], oracle_text });
const mv = m => [...m.matchAll(/\{([^}]+)\}/g)].reduce((n, x) => n + (/^\d+$/.test(x[1]) ? +x[1] : 1), 0);
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: mv(mana_cost), keywords: [], oracle_text: '', colors: [...new Set(mana_cost.match(/[WUBRG]/g) || [])], ...extra });
const WS = terra("Mishra's Workshop", '{T}: Add {C}{C}{C}. Spend this mana only to cast artifact spells.');
const ET = terra('Eldrazi Temple', '{T}: Add {C}.\n{T}: Add {C}{C}. Spend this mana only to cast colorless Eldrazi spells or activate abilities of colorless Eldrazi.');
const DH = c0('Delighted Halfling', 'Creature — Halfling Citizen', '{G}', { power: '1', toughness: '2', oracle_text: '{T}: Add {C}\n{T}: Add one mana of any color. Spend this mana only to cast a legendary spell, and that spell can\'t be countered.' });
const cards = { ...CARTAS, [WS.name]: WS, [ET.name]: ET, [DH.name]: DH,
  Golem: c0('Golem', 'Artifact Creature — Golem', '{3}', { power: '3', toughness: '3' }), Bugiganga: c0('Bugiganga', 'Artifact', '{1}'),
  Urso: c0('Urso', 'Creature — Bear', '{2}', { power: '2', toughness: '2' }), Vazio: c0('Vazio', 'Creature — Eldrazi', '{3}', { power: '4', toughness: '4' }),
  Rei: c0('Rei', 'Legendary Creature — Human', '{G}', { power: '2', toughness: '2' }), Plebeu: c0('Plebeu', 'Creature — Human', '{G}', { power: '1', toughness: '1' }),
  Nao: c0('Nao', 'Instant', '{U}') };
const scripts = { Vazio: { name: 'Vazio', abilities: [{ kind: 'activated', cost: { mana: '{2}' }, effects: [{ do: 'draw', amount: 1 }] }], example: { action: 'etb', target: 'none', expect: { attached: false } } },
  Nao: { name: 'Nao', effects: [{ do: 'counter', target: 'spell' }], example: { target: 'enemy-spell', expect: { countered: true } } } };
function mesaX(a, b = ['Island']) {
  const baralho = ns => ns.map(name => ({ name, qty: 12, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 3, mode: 'full', cards, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Forest']) }, { name: 'B', deck: baralho(b) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = J(s); for (const z of ['hand', 'battlefield']) for (const o of s.zones[0][z].slice()) { s.zones[0][z] = s.zones[0][z].filter(x => x !== o); s.zones[0].library.push(o); s.objects[o].zone = 'library'; }
  return s;
}
const lancaveis = s => JSON.stringify(legais(s, 0, x => x.t === 'cast').map(x => s.objects[x.oid].name).sort());
const L = (...n) => JSON.stringify(n.sort());

test('M-345 · as três continuam jogando (cobertura por texto, sem script à mão)', () => {
  for (const c of [WS, ET, DH]) { assert.equal(!!S.SCRIPTS[c.name], false, c.name); assert.equal(S.coverage(c).level, 'completo', c.name); }
});

test("M-345 · Mishra's Workshop: {C}{C}{C} paga mágica de artefato e não paga criatura comum", () => {
  let s = mesaX([WS.name, 'Golem', 'Urso']), w, g;
  [s, w] = poe(s, 0, WS.name); [s, g] = poe(s, 0, 'Golem', 'hand'); [s] = poe(s, 0, 'Urso', 'hand');
  assert.equal(lancaveis(s), L('Golem'), 'só o artefato');
  const t = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === g)[0]);
  assert.equal(t.objects[w].tapped, true); assert.equal(t.objects[g].zone, 'stack');
});

test("M-345 · a sobra da mana restrita continua restrita e some no fim da etapa (106.4)", () => {
  let s = mesaX([WS.name, 'Bugiganga', 'Urso']), w, b;
  [s, w] = poe(s, 0, WS.name); [s, b] = poe(s, 0, 'Bugiganga', 'hand'); [s] = poe(s, 0, 'Urso', 'hand');
  s = act(s, { t: 'tap_mana', p: 0, oid: w, option: 0 });
  assert.equal(s.players[0].pool.C, 0, 'não vai para a reserva comum'); assert.equal(s.players[0].manaRestrita.length, 3);
  assert.equal(lancaveis(s), L('Bugiganga'), 'a restrita paga o artefato, não a Urso');
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === b)[0]);
  assert.equal(s.players[0].manaRestrita.length, 2, 'sobram duas, ainda restritas'); assert.ok(!JSON.parse(lancaveis(s)).includes('Urso'), 'e não pagam a Urso');
  s = tudo(act(act(s, { t: 'pass', p: 0 }), { t: 'pass', p: 1 }));
  s = passaAte(s, x => x.turn.step !== 'main1');
  assert.equal((s.players[0].manaRestrita || []).length, 0, 'esvaziou com a etapa');
});

test('M-345 · Eldrazi Temple: {C} paga qualquer coisa; {C}{C} só mágica Eldrazi incolor', () => {
  let s = mesaX([ET.name, 'Vazio', 'Urso']), et, f, v;
  [s, et] = poe(s, 0, ET.name); [s, f] = poe(s, 0, 'Forest'); [s, v] = poe(s, 0, 'Vazio', 'hand'); [s] = poe(s, 0, 'Urso', 'hand');
  assert.equal(lancaveis(s), L('Urso', 'Vazio'), 'Vazio com {C}{C} + Floresta; Urso com {C} + Floresta');
  const t = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === v)[0]); assert.equal(t.objects[v].zone, 'stack');
  let u = J(s); u.objects[f].tapped = true;
  assert.equal(lancaveis(u), L(), 'sem a Floresta: {C}{C} restrito não paga a Urso de 2 e não chega a 3 para o Vazio');
  let vz; [u, vz] = poe(u, 0, 'Vazio');
  const at = legais(u, 0, x => x.t === 'activate' && x.oid === vz)[0]; assert.ok(at, '{C}{C} paga a habilidade do Eldrazi incolor');
  assert.equal(act(u, at).objects[et].tapped, true);
});

test('M-345 · Delighted Halfling: a cor só paga mágica lendária, e essa mágica não pode ser anulada', () => {
  let s = mesaX([DH.name, 'Rei', 'Plebeu'], ['Island', 'Nao']), dh, rei;
  [s, dh] = poe(s, 0, DH.name); s = J(s); s.objects[dh].sick = false; delete s.objects[dh].entrouNoTurno;
  [s, rei] = poe(s, 0, 'Rei', 'hand'); [s] = poe(s, 0, 'Plebeu', 'hand');
  assert.equal(lancaveis(s), L('Rei'), '{G} da Halfling só para a lendária');
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === rei)[0]);
  assert.equal(s.objects[rei].naoAnulavel, true);
  let nao; [s, nao] = poe(s, 1, 'Nao', 'hand');
  s = act(s, { t: 'pass', p: 0 });
  s = act(comMana(s, 'U', 1), legais(comMana(s, 'U', 1), 1, x => x.t === 'cast' && x.oid === nao && x.targets && x.targets[0].oid === rei)[0]);
  s = tudo(act(act(s, { t: 'pass', p: 1 }), { t: 'pass', p: 0 }));
  s = tudo(act(act(s, { t: 'pass', p: s.turn.priority }), { t: 'pass', p: 1 - s.turn.priority }));
  assert.equal(s.objects[rei].zone, 'battlefield', 'a anulação não a impede (101.2)');
});
