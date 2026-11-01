// M-594 · leitor e núcleo, competitivos na ordem gulosa da sentinela (texto da Scryfall de 25/10/2026 em cobertura/resumo.json):
// "You may play an additional land on each of your turns." e "You may play lands from your graveyard." (Icetill Explorer; o gatilho
// "Whenever a land you control enters, mill a card" já era lido). 305.2: jogadas de terreno a mais no seu turno; 305.1: jogar o terreno
// do cemitério usa a jogada de terreno do turno e só na sua fase principal com a pilha vazia. Cartas de teste com nomes inventados; a
// aprovação das cartas do catálogo é da homologacao. Falha no motor anterior (as duas frases ficavam sem leitura e o cemitério não jogava).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, act, poe, legais, passaAte, limpaMao } from './listas.mjs';
import { loadModules } from './_load.mjs';
const L = loadModules().leitor;
const C = {
  Explorador: { name: 'Explorador', mana_cost: '{2}{G}{G}', cmc: 4, type_line: 'Creature — Insect Scout', oracle_text: 'You may play an additional land on each of your turns.\nYou may play lands from your graveyard.\nWhenever a land you control enters, mill a card.', power: '2', toughness: '4', keywords: [], colors: ['G'] },
  Forest: { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {G}.)', colors: [] },
};
const ex = { example: { target: 'none', expect: { selfLife: 0 } } };
const r0 = L.ler(C.Explorador);
const SC = { Explorador: { ...r0.script, ...ex } };
function mesa(comExplorador, seed = 275) {
  const d = xs => xs.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SC, first: 0, players: [{ name: 'A', deck: d([['Explorador', 2], ['Forest', 38]]) }, { name: 'B', deck: d([['Forest', 40]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = limpaMao(s, 0); if (comExplorador) [s] = poe(s, 0, 'Explorador');
  let m1, m2, c1, c2; [s, m1] = poe(s, 0, 'Forest', 'hand'); [s, m2] = poe(s, 0, 'Forest', 'hand'); [s, c1] = poe(s, 0, 'Forest', 'graveyard'); [s, c2] = poe(s, 0, 'Forest', 'graveyard');
  return { s, m1, m2, c1, c2 };
}
const joga = (s, oid) => { s = act(s, { t: 'play_land', p: 0, oid }); for (let i = 0; i < 20 && (s.stack.length || s.pending); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority }); return s; };
const oferece = (s, oid) => legais(s, 0, x => x.t === 'play_land' && x.oid === oid).length > 0;

test('M-594 · leitura: duas regras de jogador e o gatilho de terreno', () => {
  assert.ok(r0 && r0.completa, 'lida por inteiro');
  assert.equal(JSON.stringify(r0.script.regraJogador), JSON.stringify([{ quem: 'voce', terrenosExtras: 1 }, { quem: 'voce', terrenosDoCemiterio: true }]));
  assert.equal(loadModules().scripts.validateScript(SC.Explorador).length, 0);
});

test('M-594 · sem o Explorador: um terreno por turno e nada do cemitério', () => {
  let { s, m1, m2, c1 } = mesa(false);
  assert.ok(!oferece(s, c1), 'o cemitério não joga'); assert.throws(() => act(s, { t: 'play_land', p: 0, oid: c1 }));
  s = joga(s, m1); assert.ok(!oferece(s, m2), 'só um terreno por turno');
});

test('M-594 · 305.1/305.2: com o Explorador, dois terrenos no turno, inclusive do cemitério; o terceiro não', () => {
  let { s, m1, m2, c1, c2 } = mesa(true);
  assert.ok(oferece(s, c1), 'o terreno do cemitério é oferecido');
  s = joga(s, c1); assert.equal(s.objects[c1].zone, 'battlefield', 'jogou do cemitério');
  assert.equal(s.players[0].landsPlayed, 1, 'usou a jogada de terreno');
  assert.ok(oferece(s, m1) && oferece(s, c2), 'a segunda jogada vale da mão ou do cemitério');
  s = joga(s, m1); assert.equal(s.players[0].landsPlayed, 2);
  assert.ok(!oferece(s, m2) && !oferece(s, c2), 'acabaram as jogadas do turno');
  assert.throws(() => act(s, { t: 'play_land', p: 0, oid: c2 }), /limite|já jogou/i);
});

test('M-594 · do cemitério só na sua fase principal, com a pilha vazia', () => {
  let { s, c1 } = mesa(true);
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  assert.ok(!oferece(s, c1), 'no turno do oponente não'); assert.throws(() => act(s, { t: 'play_land', p: 0, oid: c1 }));
});
