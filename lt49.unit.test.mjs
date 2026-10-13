// M-366 · Delver of Secrets // Insectile Aberration por script à mão (Oracle do Forge no GitHub, consulta de 13/10/2026, em .listas/oficiais-revisadas.json).
// Com o script de verdade do motor (não um de teste): falha no motor anterior, onde a carta não tinha script. Os achados da revisão independente
// (701.27f, 401.2 e a barreira de desfazer, no efeito revela_topo_transforma da M-353) viraram teste antes da correção.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';
import { loadModules } from './_load.mjs';
const { scripts: S } = loadModules();

const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const dv = OF.find(x => x.name === 'Delver of Secrets');
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: 1, keywords: [], oracle_text: '', colors: [...new Set((mana_cost.match(/[WUBRG]/g) || []))], ...extra });
const cards = { 'Delver of Secrets': { name: dv.name, type_line: dv.type_line, mana_cost: dv.mana_cost, cmc: 1, keywords: [], oracle_text: dv.oracle_text, colors: ['U'], power: dv.power, toughness: dv.toughness },
  Raio: c0('Raio', 'Instant', '{R}'), Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2' }) };
function mesaD(topo, seed = 23) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: { ...CARTAS, ...cards }, scripts: { Raio: { name: 'Raio', effects: [{ do: 'damage', amount: 3, target: 'any' }], example: { target: 'enemy-creature', expect: { gone: true } } } }, first: 0,
    players: [{ name: 'A', deck: baralho(['Delver of Secrets', 'Raio', 'Urso', 'Island']) }, { name: 'B', deck: baralho(['Plains', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  let d; [s, d] = poe(s, 0, 'Delver of Secrets');
  s = J(s); const lib = s.zones[0].library, t = lib.find(o => s.objects[o].name === topo); s.zones[0].library = [t, ...lib.filter(o => o !== t)];
  for (let i = 0; i < 300 && !(s.turn.active === 0 && s.turn.step === 'upkeep' && (s.pending || s.stack.length)); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
  return [s, d];
}
const ate = (s, f) => { for (let i = 0; i < 40 && !f(s); i++) s = s.pending ? act(s, legais(s, s.pending.p).find(a => a.t !== 'pay') || legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority }); return s; };

test('M-366 · o script de Delver of Secrets é válido e cobre a carta (inclusive pelo nome com a face de trás)', () => {
  assert.deepEqual([...S.validateScript(S.SCRIPTS['Delver of Secrets'])], []);
  for (const n of ['Delver of Secrets', 'Delver of Secrets // Insectile Aberration']) assert.equal(S.coverage({ ...cards['Delver of Secrets'], name: n }).level, 'completo', n);
});

test('M-366 · 701.28: na sua manutenção, com instantânea no topo, PODE revelar e transformar em Insectile Aberration 3/2 voadora azul; recusar mantém Delver', () => {
  let [s, d] = mesaD('Raio');
  s = ate(s, x => x.pending && x.pending.kind === 'may_pay');
  assert.doesNotMatch(s.pending.name, /Raio/, '401.2: a pergunta (e o registro, ao recusar) não diz qual é a carta'); assert.equal(s.pending.olhaTopo, true, 'a mesa trava o desfazer');
  const sim = act(s, legais(s, 0, a => a.t === 'pay')[0]);
  const t = ate(sim, x => !x.stack.length && !x.pending);
  assert.equal(t.objects[d].name, 'Insectile Aberration');
  const st = E.stats(t, t.objects[d]); assert.deepEqual([st.power, st.toughness], [3, 2]);
  assert.ok(t.facts['Insectile Aberration'].kw.includes('flying')); assert.deepEqual([...t.facts['Insectile Aberration'].colors], ['U']);
  const nao = ate(act(s, legais(s, 0, a => a.t === 'decline')[0]), x => !x.stack.length && !x.pending);
  assert.equal(nao.objects[d].name, 'Delver of Secrets');
});

test('M-366 · com uma criatura no topo, nada acontece (sem pergunta)', () => {
  let [s, d] = mesaD('Urso');
  const t = ate(s, x => !x.stack.length && !x.pending && x.turn.step !== 'upkeep');
  assert.equal(t.objects[d].name, 'Delver of Secrets');
});

test('M-366 · 701.27f (achado da revisão): transformada em resposta, com o gatilho na pilha, a Aberration não volta a ser Delver ao aceitar', () => {
  let [s, d] = mesaD('Raio');
  assert.ok(s.stack.length, 'o gatilho está na pilha');
  s = J(s); E.transformaT(s, s.objects[d], null, []); assert.equal(s.objects[d].name, 'Insectile Aberration');
  s = ate(s, x => x.pending && x.pending.kind === 'may_pay');
  const t = ate(act(s, legais(s, 0, a => a.t === 'pay')[0]), x => !x.stack.length && !x.pending);
  assert.equal(t.objects[d].name, 'Insectile Aberration');
});
