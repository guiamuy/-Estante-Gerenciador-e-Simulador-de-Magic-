// M-608 · leitor, competitivos na ordem gulosa da sentinela (texto da Scryfall de 01/11/2026 em cobertura/<formato>.json):
// Shadowspear — "{1}: Permanents your opponents control lose hexproof and indestructible until end of turn." (611.2c: vale para as
// permanentes que o oponente controla quando a habilidade resolve; a que entrar depois não perde nada; termina na limpeza). O equipar e o
// "+1/+1, atropelar e vínculo com a vida" o leitor já lia. Cartas de teste com nomes inventados; a aprovação das cartas do catálogo é da
// homologacao. Falha no motor anterior (a frase ficava sem leitura).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, act, poe, legais, passaAte, limpaMao } from './listas.mjs';
import { loadModules } from './_load.mjs';
const L = loadModules().leitor;
const C = {
  Lanca: { name: 'Lanca', mana_cost: '{1}', cmc: 1, type_line: 'Legendary Artifact — Equipment', oracle_text: 'Equipped creature gets +1/+1 and has trample and lifelink.\n{1}: Permanents your opponents control lose hexproof and indestructible until end of turn.\nEquip {2}', keywords: ['Equip'], colors: [] },
  Muralha: { name: 'Muralha', mana_cost: '{2}{G}', cmc: 3, type_line: 'Creature — Wall', oracle_text: 'Hexproof, indestructible', power: '0', toughness: '4', keywords: ['Hexproof', 'Indestructible'], colors: ['G'] },
  Cidadela: { name: 'Cidadela', mana_cost: '', cmc: 0, type_line: 'Artifact Land', oracle_text: 'Indestructible\n{T}: Add {C}.', keywords: ['Indestructible'], colors: [] },
  Minha: { name: 'Minha', mana_cost: '{2}{G}', cmc: 3, type_line: 'Creature — Wall', oracle_text: 'Hexproof, indestructible', power: '0', toughness: '4', keywords: ['Hexproof', 'Indestructible'], colors: ['G'] },
  Island: { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] },
  Forest: { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {G}.)', colors: [] },
};
const ex = { example: { target: 'none', expect: { selfLife: 0 } } };
const lido = n => { const r = L.ler(C[n]); assert.ok(r && r.completa, `${n} lida por inteiro`); return { ...r.script, ...ex }; };
const SC = { Lanca: lido('Lanca'), Muralha: { name: 'Muralha', ...ex }, Minha: { name: 'Minha', ...ex }, Cidadela: { name: 'Cidadela', produces: [['C']], ...ex } };
function mesa(seed = 288) {
  const d = xs => xs.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SC, first: 0, players: [{ name: 'A', deck: d([['Lanca', 2], ['Minha', 2], ['Island', 36]]) }, { name: 'B', deck: d([['Muralha', 4], ['Cidadela', 4], ['Forest', 32]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  return limpaMao(s, 0);
}
const passa = s => act(s, { t: 'pass', p: s.turn.priority });
const resolve = s => { for (let i = 0; i < 40 && (s.stack.length || s.pending); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : passa(s); return s; };
const tem = (s, o, k) => E.hasKeyword(s, s.objects[o], k);

test('M-608 · leitura: as permanentes dos oponentes perdem resistência a magia e indestrutível até o fim do turno', () => {
  const at = SC.Lanca.abilities.find(a => a.kind === 'activated' && a.cost && a.cost.mana === '{1}' && !a.equip);
  assert.ok(at, 'a ativada de {1}');
  assert.equal(JSON.stringify(at.effects), JSON.stringify([{ do: 'continuo', cada: { de: 'opponent' }, perde: ['hexproof', 'indestructible'] }]));
  assert.equal(loadModules().scripts.validateScript(SC.Lanca).length, 0);
});

test('M-608 · 611.2c: perdem as do oponente que estão no campo agora (criatura e terreno); as suas não; acaba na limpeza', () => {
  let s = mesa(), l, mu, ci, mi, mu2; [s, l] = poe(s, 0, 'Lanca'); [s, mi] = poe(s, 0, 'Minha'); [s, mu] = poe(s, 1, 'Muralha'); [s, ci] = poe(s, 1, 'Cidadela'); [s] = poe(s, 0, 'Island');
  assert.ok(tem(s, mu, 'hexproof') && tem(s, mu, 'indestructible') && tem(s, ci, 'indestructible'));
  const ativa = legais(s, 0, a => a.t === 'activate' && a.oid === l && !JSON.stringify(a).includes('equip'));
  assert.ok(ativa.length, 'a ativada é oferecida');
  s = resolve(act(s, ativa[0]));
  assert.equal(tem(s, mu, 'hexproof'), false, 'a Muralha perdeu a resistência a magia');
  assert.equal(tem(s, mu, 'indestructible'), false, 'e o indestrutível');
  assert.equal(tem(s, ci, 'indestructible'), false, 'o terreno também (permanente, não só criatura)');
  assert.ok(tem(s, mi, 'hexproof') && tem(s, mi, 'indestructible'), 'as suas continuam');
  [s, mu2] = poe(s, 1, 'Muralha'); assert.ok(tem(s, mu2, 'hexproof'), 'a que entrou depois não perde nada');
  const prox = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  assert.ok(tem(prox, mu, 'hexproof') && tem(prox, mu, 'indestructible'), 'no turno seguinte, voltou');
});
