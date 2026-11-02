// M-604 · leitor, competitivos na ordem gulosa da sentinela (texto da Scryfall de 01/11/2026 em cobertura/<formato>.json):
// Demolition Field — "{2}, {T}, Sacrifice this land: Destroy target nonbasic land an opponent controls. That land's controller may search
// their library for a basic land card, put it onto the battlefield, then shuffle. You may search your library for a basic land card, put it
// onto the battlefield, then shuffle." (205.4: só terreno não básico do oponente é alvo; as duas buscas são opcionais e o terreno entra
// desvirado). Cartas de teste com nomes inventados; a aprovação das cartas do catálogo é da homologacao. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, act, poe, legais, passaAte, limpaMao } from './listas.mjs';
import { loadModules } from './_load.mjs';
const L = loadModules().leitor;
const C = {
  Campo: { name: 'Campo', mana_cost: '', cmc: 0, type_line: 'Land', oracle_text: "{T}: Add {C}.\n{2}, {T}, Sacrifice this land: Destroy target nonbasic land an opponent controls. That land's controller may search their library for a basic land card, put it onto the battlefield, then shuffle. You may search your library for a basic land card, put it onto the battlefield, then shuffle.", keywords: [], colors: [] },
  Vale: { name: 'Vale', mana_cost: '', cmc: 0, type_line: 'Land', oracle_text: '{T}: Add {G}.', keywords: [], colors: [] },
  Island: { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] },
  Forest: { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {G}.)', colors: [] },
};
const ex = { example: { target: 'none', expect: { selfLife: 0 } } };
const lido = n => { const r = L.ler(C[n]); assert.ok(r && r.completa, `${n} lida por inteiro`); return { ...r.script, ...ex }; };
const SC = { Campo: lido('Campo'), Vale: { name: 'Vale', produces: [['G']], ...ex } };
function mesa(seed = 285) {
  const d = xs => xs.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SC, first: 0, players: [{ name: 'A', deck: d([['Campo', 2], ['Island', 38]]) }, { name: 'B', deck: d([['Vale', 4], ['Forest', 36]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  return limpaMao(s, 0);
}
const passa = s => act(s, { t: 'pass', p: s.turn.priority });
const campo = (s, p, n) => s.zones[p].battlefield.filter(o => s.objects[o].name === n);
function prepara() { let s = mesa(), c, v, fb; [s, c] = poe(s, 0, 'Campo'); [s] = poe(s, 0, 'Island'); [s] = poe(s, 0, 'Island'); [s, v] = poe(s, 1, 'Vale'); [s, fb] = poe(s, 1, 'Forest'); return { s, c, v, fb }; }

test('M-604 · leitura: destruir terreno não básico do oponente; busca opcional do controlador dele e sua, terreno desvirado', () => {
  const at = SC.Campo.abilities[0];
  assert.equal(JSON.stringify(at.cost), JSON.stringify({ mana: '{2}', tap: true, sacrifice: true }));
  assert.equal(JSON.stringify(at.effects[0]), JSON.stringify({ do: 'destroy', target: { tipos: ['land'], terrenoBasico: false, de: 'opponent' } }));
  assert.equal(at.effects[1].target, 'target-controller'); assert.equal(at.effects[1].optional, true); assert.equal(at.effects[1].to, 'battlefield');
  assert.equal(at.effects[2].target, undefined); assert.equal(at.effects[2].optional, true); assert.equal(at.effects[2].to, 'battlefield');
  assert.equal(loadModules().scripts.validateScript(SC.Campo).length, 0);
});

test('M-604 · 205.4: só o terreno não básico do oponente é alvo; os dois buscam um básico, que entra desvirado', () => {
  let { s, c, v, fb } = prepara();
  const ativa = legais(s, 0, a => a.t === 'activate' && a.oid === c);
  assert.ok(ativa.length, 'a ativada é oferecida');
  assert.ok(!ativa.some(a => JSON.stringify(a).includes(`"${fb}"`)), 'o básico do oponente não é alvo');
  s = act(s, ativa.find(a => JSON.stringify(a).includes(`"${v}"`)) || ativa[0]);
  if (s.pending && s.pending.kind === 'pick_target') { const op = legais(s, s.pending.p); const i = (s.pending.options || []).findIndex(o => o.oid === v); s = act(s, op.find(x => x.index === i) || op[0]); }
  const antesA = campo(s, 0, 'Island').length, antesB = campo(s, 1, 'Forest').length;
  for (let i = 0; i < 40 && (s.stack.length || s.pending); i++) {
    if (s.pending) { const op = legais(s, s.pending.p); s = act(s, op.find(x => x.t === 'pick') || op.find(x => !/decline|recus|nao/i.test(x.t)) || op[0]); } else s = passa(s); }
  assert.equal(s.objects[v].zone, 'graveyard', 'o Vale foi destruído'); assert.equal(s.objects[c].zone, 'graveyard', 'o Campo foi sacrificado');
  assert.equal(campo(s, 1, 'Forest').length, antesB + 1, 'o oponente buscou uma Forest');
  assert.equal(campo(s, 0, 'Island').length, antesA + 1, 'você buscou uma Island');
  assert.ok(campo(s, 1, 'Forest').every(o => o === fb || !s.objects[o].tapped), 'a Forest buscada entra desvirada');
});

test('M-604 · as buscas são opcionais: recusar não traz terreno', () => {
  let { s, c, v } = prepara();
  s = act(s, legais(s, 0, a => a.t === 'activate' && a.oid === c && JSON.stringify(a).includes(`"${v}"`))[0] || legais(s, 0, a => a.t === 'activate' && a.oid === c)[0]);
  if (s.pending && s.pending.kind === 'pick_target') { const op = legais(s, s.pending.p); const i = (s.pending.options || []).findIndex(o => o.oid === v); s = act(s, op.find(x => x.index === i) || op[0]); }
  const antesB = campo(s, 1, 'Forest').length, antesA = campo(s, 0, 'Island').length; let recusas = 0;
  for (let i = 0; i < 40 && (s.stack.length || s.pending); i++) {
    if (s.pending) { const op = legais(s, s.pending.p); const nao = op.find(x => /decline|done|pick_done|nao|skip/i.test(x.t)); if (nao) recusas++; s = act(s, nao || op[0]); } else s = passa(s); }
  assert.ok(recusas >= 2, 'as duas buscas oferecem recusar');
  assert.equal(campo(s, 1, 'Forest').length, antesB); assert.equal(campo(s, 0, 'Island').length, antesA);
});
