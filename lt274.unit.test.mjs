// M-593 · leitor e núcleo, competitivos na ordem gulosa da sentinela (texto da Scryfall de 25/10/2026 em cobertura/resumo.json):
// "Target opponent exiles a creature they control and their graveyard." (Strategic Betrayal). O oponente alvo escolhe a criatura
// (como no edito, 701.21a), mas ela é exilada: não é sacrifício (nada de "quando sacrificar"/"morrer"); o cemitério do mesmo jogador
// vai junto, mesmo sem criatura. Cartas de teste com nomes inventados; a aprovação das cartas do catálogo é da homologacao. Falha no
// motor anterior (frase sem leitura; o edito só sacrificava).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, act, poe, legais, passaAte, limpaMao } from './listas.mjs';
import { loadModules } from './_load.mjs';
const L = loadModules().leitor;
const C = {
  Traicao: { name: 'Traicao', mana_cost: '{1}{B}', cmc: 2, type_line: 'Sorcery', oracle_text: 'Target opponent exiles a creature they control and their graveyard.', keywords: [], colors: ['B'] },
  Urso: { name: 'Urso', mana_cost: '{1}{G}', cmc: 2, type_line: 'Creature — Bear', oracle_text: '', power: '2', toughness: '2', keywords: [], colors: ['G'] },
  Lobo: { name: 'Lobo', mana_cost: '{2}{G}', cmc: 3, type_line: 'Creature — Wolf', oracle_text: 'When this creature dies, you gain 3 life.', power: '3', toughness: '3', keywords: [], colors: ['G'] },
  Swamp: { name: 'Swamp', type_line: 'Basic Land — Swamp', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {B}.)', colors: [] },
  Forest: { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {G}.)', colors: [] },
};
const ex = { example: { target: 'none', expect: { selfLife: 0 } } };
const r0 = L.ler(C.Traicao);
const SC = { Traicao: { ...r0.script, ...ex }, Urso: { name: 'Urso', ...ex }, Lobo: { name: 'Lobo', abilities: [{ kind: 'triggered', when: 'dies', effects: [{ do: 'gain', amount: 3 }] }], ...ex } };
function mesa(criaturas, seed = 274) {
  const d = xs => xs.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SC, first: 0, players: [{ name: 'A', deck: d([['Traicao', 4], ['Swamp', 36]]) }, { name: 'B', deck: d([['Urso', 6], ['Lobo', 6], ['Forest', 28]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = limpaMao(s, 0); let t; [s, t] = poe(s, 0, 'Traicao', 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Swamp');
  const o = {}; for (const n of criaturas) [s, o[n]] = poe(s, 1, n);
  const gy = []; for (const n of ['Urso', 'Forest']) { let x; [s, x] = poe(s, 1, n, 'graveyard'); gy.push(x); }
  return { s, t, o, gy };
}
const conjura = (s, t) => { s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === t)[0]); for (let i = 0; i < 40 && s.stack.length && !s.pending; i++) s = act(s, { t: 'pass', p: s.turn.priority }); return s; };

test('M-593 · leitura: edito que exila e o cemitério do mesmo jogador', () => {
  assert.ok(r0 && r0.completa, 'lida por inteiro');
  assert.equal(JSON.stringify(r0.script.effects), JSON.stringify([{ do: 'edict', types: ['creature'], target: 'opponent', exilar: true }, { do: 'exile_graveyard', target: 'first-target' }]));
});

test('M-593 · o oponente escolhe qual criatura; ela vai para o exílio (não morre), e o cemitério dele também', () => {
  let { s, t, o, gy } = mesa(['Urso', 'Lobo']); const vidaB = s.players[1].life;
  s = conjura(s, t);
  assert.ok(s.pending && s.pending.p === 1, 'quem escolhe é o oponente');
  s = act(s, legais(s, 1).find(x => JSON.stringify(x).includes(`"${o.Lobo}"`)));
  for (let i = 0; i < 20 && (s.stack.length || s.pending); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.objects[o.Lobo].zone, 'exile', 'o Lobo foi exilado'); assert.equal(s.objects[o.Urso].zone, 'battlefield', 'o Urso ficou');
  assert.equal(s.players[1].life, vidaB, 'exilar não é morrer: o gatilho do Lobo não disparou');
  assert.ok(gy.every(x => s.objects[x].zone === 'exile'), 'o cemitério de B foi exilado');
  assert.equal(s.zones[1].graveyard.length, 0);
});

test('M-593 · sem criatura, o cemitério sai mesmo assim', () => {
  let { s, t, gy } = mesa([]);
  s = conjura(s, t);
  assert.ok(gy.every(x => s.objects[x].zone === 'exile'), 'o cemitério de B foi exilado');
  assert.equal(s.zones[0].graveyard.filter(x => s.objects[x].name !== 'Traicao').length, 0, 'o cemitério de A não foi tocado');
});
