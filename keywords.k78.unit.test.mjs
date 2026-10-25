// K-78 · CR 702.122a · "Crew N" lido pelo leitor: a habilidade ativada de tripular na forma canônica da T-4 ({ crew: N } e o efeito
// `tripulada`: o Veículo vira criatura artefato até o fim do turno e avisa "becomes crewed"). Textos: Oracle do Forge (consulta de
// 25/10/2026; a Scryfall não respondeu nesta sessão), em .listas/oficiais-keywords.json: Sky Skiff e Renegade Freighter. Antes, a linha
// "Crew N" não tinha padrão e as duas ficavam parciais/manuais. A aprovação (APROVADAS) é da homologação.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, J, act, poe, legais, passaAte } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-keywords.json', import.meta.url), 'utf8')).cartas;
const of = n => { const c = OF.find(x => x.name === n); assert.ok(c, 'sem texto oficial: ' + n);
  return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: (c.mana_cost.match(/\d+/) || [0])[0] * 1, keywords: c.keywords, oracle_text: c.oracle_text, colors: [], power: c.power, toughness: c.toughness }; };

test('K-78 · 702.122a · o leitor lê "Crew N" do Veículo como a habilidade de tripular', () => {
  for (const [n, k] of [['Sky Skiff', 1], ['Renegade Freighter', 2]]) {
    const l = S.leitura(of(n)); assert.ok(l, `${n}: leitura completa`); assert.equal(l.aprovada, false); assert.equal(S.coverage(of(n)).level, 'lida', n);
    assert.deepEqual(J(l.script.abilities.filter(a => a.cost && a.cost.crew != null)), [{ kind: 'activated', label: `Tripular ${k}`, cost: { crew: k }, effects: [{ do: 'tripulada' }] }], n);
  }
  const naoVeiculo = { ...of('Sky Skiff'), name: 'Não Veículo', type_line: 'Artifact', oracle_text: 'Crew 1' };
  assert.equal(S.leitura(naoVeiculo), null, '"Crew N" só no Veículo');
});

const terra = { name: 'Plains', type_line: 'Basic Land — Plains', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {W}.)', colors: [] };
const URSO = { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] };
test('K-78 · Sky Skiff tripulado pelo Urso: vira criatura artefato 2/3 com voar até o fim do turno', () => {
  const C = { 'Sky Skiff': of('Sky Skiff'), Plains: terra, Urso: URSO };
  const scripts = { 'Sky Skiff': { ...S.leitura(C['Sky Skiff']).script, lido: true, example: { action: 'etb', target: 'none', expect: { attached: false } } } };
  const b = ns => ns.map(name => ({ name, qty: 10, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 78, mode: 'full', cards: C, scripts, first: 0, players: [{ name: 'A', deck: b(['Sky Skiff', 'Urso', 'Plains']) }, { name: 'B', deck: b(['Plains']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  let sk, u; [s, sk] = poe(s, 0, 'Sky Skiff'); [s, u] = poe(s, 0, 'Urso');
  assert.equal(E.isCreature(s, s.objects[sk]), false);
  const a = legais(s, 0, x => (x.t === 'activate' || x.t === 'tripular') && x.oid === sk); assert.ok(a.length, 'a mesa oferece tripular');
  s = act(s, a[0]);
  if (s.pending && s.pending.kind === 'tripular') { s = act(s, legais(s, 0, x => x.t === 'tripular_escolhe' || (x.oid === u && x.t !== 'activate'))[0] || legais(s, 0)[0]); if (s.pending && s.pending.kind === 'tripular') s = act(s, legais(s, 0, x => x.t === 'tripular_pronto')[0]); }
  s = passaAte(s, x => !x.stack.length && !x.pending);
  const o = s.objects[sk];
  assert.equal(s.objects[u].tapped, true, 'o Urso virou para tripular');
  assert.equal(E.isCreature(s, o), true); assert.match(E.linhaDeTipo(s, o), /Artifact Creature/); assert.equal(E.hasKeyword(s, o, 'flying'), true);
  assert.deepEqual(J(E.stats(s, o)), { power: 2, toughness: 3 });
});
