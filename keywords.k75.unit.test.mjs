// K-75 · CR 712.3 / 712.8f / 712.12 / 614.12 · dupla face modal com terreno no verso, lida pelo leitor. Textos da Scryfall (api.scryfall.com,
// consulta de 24/10/2026) em .listas/oficiais-keywords.json: Fell the Profane // Fell Mire, Jwari Disruption // Jwari Ruins, Waterlogged
// Teachings // Inundated Archive, Beyeen Veil // Beyeen Coast, Pinnacle Monk // Mystic Peak, Boggart Trawler // Boggart Bog.
// Antes, a linha "//" parava o leitor ("segunda face … o leitor ainda não lê") e as seis ficavam manuais ou parciais. A aprovação
// (APROVADAS) é da homologação: aqui as cartas jogam pelo script lido passado à mão, como a mesa faria depois de aprovadas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, J, act, poe, legais, passaAte } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-keywords.json', import.meta.url), 'utf8')).cartas;
const of = n => { const c = OF.find(x => x.name === n); assert.ok(c, 'sem texto oficial: ' + n);
  return { name: c.name, layout: c.layout, faces: c.faces, type_line: c.type_line, mana_cost: c.mana_cost, cmc: c.cmc, keywords: c.keywords, oracle_text: c.oracle_text,
    colors: c.faces[0].colors, ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const FP = 'Fell the Profane // Fell Mire', PM = 'Pinnacle Monk // Mystic Peak';
const SEIS = [FP, 'Jwari Disruption // Jwari Ruins', 'Waterlogged Teachings // Inundated Archive', 'Beyeen Veil // Beyeen Coast', PM, 'Boggart Trawler // Boggart Bog'];

test('K-75 · 712.3 · o leitor lê as seis por inteiro: a frente pelas frases dela e o verso como terreno (entra virado, ou a menos que pague vida)', () => {
  const versos = {
    [FP]: { name: 'Fell Mire', types: ['land'], produces: [['B']], entersTappedUnless: { pagaVida: 3 } },
    'Jwari Disruption // Jwari Ruins': { name: 'Jwari Ruins', types: ['land'], produces: [['U']], entersTapped: true },
    'Waterlogged Teachings // Inundated Archive': { name: 'Inundated Archive', types: ['land'], produces: [['U'], ['B']], entersTapped: true },
    'Beyeen Veil // Beyeen Coast': { name: 'Beyeen Coast', types: ['land'], produces: [['U']], entersTapped: true },
    [PM]: { name: 'Mystic Peak', types: ['land'], produces: [['R']], entersTappedUnless: { pagaVida: 3 } },
    'Boggart Trawler // Boggart Bog': { name: 'Boggart Bog', types: ['land'], produces: [['B']], entersTappedUnless: { pagaVida: 3 } } };
  for (const n of SEIS) {
    const l = S.leitura(of(n)); assert.ok(l, `${n}: leitura completa`);
    assert.equal(l.aprovada, false, `${n}: a aprovação é da homologação`); assert.equal(S.coverage(of(n)).level, 'lida', n);
    assert.equal(l.script.self.modal, true, n); assert.deepEqual(J(l.script.back), versos[n], n);
    assert.deepEqual(J(S.validateScript({ ...l.script, example: { action: 'etb', target: 'none', expect: { attached: false } } }).filter(e => /modal|face de trás/.test(e))), [], n);
  }
});

test('K-75 · o verso que não é só terreno simples continua sem leitura (nada aproximado)', () => {
  const c = of(FP), f = c.faces.map(x => ({ ...x }));
  f[1] = { ...f[1], oracle_text: f[1].oracle_text + '\nWhen this land enters, draw a card.' };
  assert.equal(S.leitura({ ...c, faces: f, oracle_text: f.map(x => x.oracle_text).join('\n//\n') }), null, 'verso com habilidade a mais');
  f[1] = { ...c.faces[1], type_line: 'Land — Swamp' };
  assert.equal(S.leitura({ ...c, faces: f }), null, 'verso com subtipo');
  f[1] = { ...c.faces[1], mana_cost: '{B}', type_line: 'Sorcery' };
  assert.equal(S.leitura({ ...c, faces: f, layout: 'modal_dfc' }), null, 'verso de mágica: outra leva');
});

test('K-75 · modalErros: back.entersTappedUnless só como { pagaVida: N }', () => {
  const sc = b => ({ name: 'X', self: { modal: true }, back: { name: 'Y', types: ['land'], produces: [['B']], ...b } });
  assert.deepEqual(J(S.modalErros(sc({ entersTappedUnless: { pagaVida: 3 } }))), []);
  for (const b of [{ entersTappedUnless: { pagaVida: 0 } }, { entersTappedUnless: { controlsSubtype: ['Swamp', 'Island'] } }, { entersTappedUnless: 3 }, { entersTapped: true, entersTappedUnless: { pagaVida: 3 } }])
    assert.ok(S.modalErros(sc(b)).length, JSON.stringify(b));
});

const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
const URSO = { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] };
function mesa(seed = 75) {
  const C = { 'Fell the Profane': of(FP), 'Pinnacle Monk': of(PM), Swamp: terra('Swamp', 'Swamp', 'B'), Mountain: terra('Mountain', 'Mountain', 'R'), Urso: URSO };
  const EX = { action: 'etb', target: 'none', expect: { attached: false } }; // o cenário S8 só para o validador da partida aceitar o script lido passado à mão
  const scripts = { 'Fell the Profane': { ...S.leitura(C['Fell the Profane']).script, lido: true, example: EX }, 'Pinnacle Monk': { ...S.leitura(C['Pinnacle Monk']).script, lido: true, example: EX } };
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line.split(' // ')[0]) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts, first: 0, players: [{ name: 'A', deck: b(['Fell the Profane', 'Pinnacle Monk', 'Swamp', 'Mountain']) }, { name: 'B', deck: b(['Urso', 'Swamp']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const limpa = s => passaAte(s, x => !x.stack.length && !x.pending && !(x.queued || []).length);
const jogaVerso = (s, oid) => { const a = legais(s, 0, x => x.t === 'play_land' && x.oid === oid && x.face === 'verso'); assert.equal(a.length, 1, 'jogar o verso como terreno'); return act(s, a[0]); };

test('K-75 · 712.12 / 614.12 · Fell Mire jogada como terreno: pagando 3 de vida entra desvirada; sem pagar, virada; gera {B}', () => {
  let s = mesa(), fp; [s, fp] = poe(s, 0, 'Fell the Profane', 'hand');
  s = jogaVerso(s, fp);
  assert.equal(s.objects[fp].name, 'Fell Mire'); assert.equal(s.objects[fp].zone, 'battlefield');
  assert.equal(s.pending && s.pending.kind, 'may_pay'); assert.equal(s.pending.pagaVidaEntrada, 3); assert.equal(s.objects[fp].tapped, true, 'virada até decidir');
  const pago = act(s, { t: 'pay', p: 0 }), nao = act(s, { t: 'decline', p: 0 });
  assert.deepEqual([pago.players[0].life, pago.objects[fp].tapped], [17, false]);
  assert.deepEqual([nao.players[0].life, nao.objects[fp].tapped], [20, true]);
  assert.deepEqual(J(pago.facts['Fell Mire'].produces), [['B']]);
});

test('K-75 · 712.8f · a frente custa só o dela: Fell the Profane ({2}{B}{B}) destrói a criatura alvo; o Pinnacle Monk não gera mana pela linha do verso', () => {
  let s = mesa(), fp, u; [s, fp] = poe(s, 0, 'Fell the Profane', 'hand'); [s, u] = poe(s, 1, 'Urso');
  for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Swamp');
  assert.equal(legais(s, 0, x => x.t === 'cast' && x.oid === fp && !x.face).length, 0, 'com três terras não paga {2}{B}{B}');
  [s] = poe(s, 0, 'Swamp');
  const c = legais(s, 0, x => x.t === 'cast' && x.oid === fp && !x.face && x.targets && x.targets[0] && x.targets[0].oid === u); assert.ok(c.length, 'mira o Urso');
  s = limpa(act(s, c[0])); assert.equal(s.objects[u].zone, 'graveyard'); assert.equal(s.objects[fp].zone, 'graveyard');
  assert.deepEqual(J(s.facts['Pinnacle Monk'].produces || []), [], 'a frente criatura não ganha o {T}: Add {R} do verso');
  assert.deepEqual(J(s.facts['Mystic Peak'].produces), [['R']]);
});
