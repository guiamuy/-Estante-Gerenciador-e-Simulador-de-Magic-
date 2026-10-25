// M-580 · Sentinela do Pauper (cobertura/pauper.json de 25/10/2026 11:55 UTC: 583 de 587 listas a 100% no app, 7 cartas pendentes).
// Texto da API da Scryfall de 25/10/2026 (campo `texto` do relatório). Seis cartas já lidas por inteiro passam pela revisão independente
// (Carrot Cake, Fields of Strife, Foot Headquarters, Hidden Grotto, Massive Might, Pilfer) e Curious Farm Animals ganha a leitura de
// "Destroy up to one target artifact or enchantment" (115.3: "up to one" aceita zero alvos). Falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, act, poe, legais, passaAte, limpaMao } from './listas.mjs';

const revisadas = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Carrot Cake', 'Curious Farm Animals', 'Fields of Strife', 'Foot Headquarters', 'Hidden Grotto', 'Massive Might', 'Pilfer'];
const carta = n => { const c = revisadas.find(x => x.name === n); assert.ok(c, `${n} com o texto da Scryfall em oficiais-revisadas.json`); return { keywords: [], colors: [], ...c }; };

const C = {
  'Curious Farm Animals': { name: 'Curious Farm Animals', mana_cost: '{W}', cmc: 1, type_line: 'Creature — Boar Elk Bird Ox', oracle_text: 'When this creature dies, you gain 3 life.\n{2}, Sacrifice this creature: Destroy up to one target artifact or enchantment.', keywords: [], colors: ['W'], power: '1', toughness: '1' },
  'Carrot Cake': { name: 'Carrot Cake', mana_cost: '{1}{W}', cmc: 2, type_line: 'Artifact — Food', oracle_text: 'When this artifact enters and when you sacrifice it, create a 1/1 white Rabbit creature token and scry 1. (Look at the top card of your library. You may put that card on the bottom.)\n{2}, {T}, Sacrifice this artifact: You gain 3 life.', keywords: ['Scry'], colors: ['W'] },
  Plains: { name: 'Plains', type_line: 'Basic Land — Plains', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {W}.)', colors: [] },
  Ornithopter: { name: 'Ornithopter', type_line: 'Artifact Creature — Thopter', mana_cost: '{0}', cmc: 0, keywords: ['Flying'], oracle_text: 'Flying', power: '0', toughness: '2', colors: [] },
};
function mesa() {
  const d = resto => resto.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'pauper', seed: 261, mode: 'full', cards: C, first: 0, players: [
    { name: 'A', deck: d([['Curious Farm Animals', 2], ['Carrot Cake', 2], ['Plains', 56]]) },
    { name: 'B', deck: d([['Ornithopter', 4], ['Carrot Cake', 2], ['Plains', 54]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = limpaMao(s, 0);
  [s] = poe(s, 0, 'Plains'); [s] = poe(s, 0, 'Plains');
  return s;
}
const resolve = (s, escolhe = (pd, ops) => ops[0]) => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pd = s.pending; s = pd ? act(s, escolhe(pd, legais(s, pd.p))) : act(s, { t: 'pass', p: s.turn.priority }); } return s; };
const ativa = (s, oid) => legais(s, 0, x => x.t === 'activate' && x.oid === oid);

test('M-580 · as sete pendentes da sentinela são lidas por inteiro e aprovadas (jogam no app)', () => {
  for (const n of NOMES) assert.equal(S.coverage(carta(n)).level, 'completo', n);
});

test('M-580 · Curious Farm Animals: {2} e sacrificar destrói o artefato do oponente escolhido', () => {
  let s = mesa(), a, o; [s, a] = poe(s, 0, 'Curious Farm Animals'); [s, o] = poe(s, 1, 'Ornithopter');
  const ofertas = ativa(s, a);
  const comAlvo = ofertas.find(x => (x.targets || []).some(t => t && t.oid === o));
  assert.ok(comAlvo, 'oferece o Ornithopter como alvo');
  s = resolve(act(s, comAlvo));
  assert.equal(s.objects[o].zone, 'graveyard', 'Ornithopter destruído');
  assert.equal(s.objects[a].zone, 'graveyard', 'Curious Farm Animals sacrificada');
});

test('M-580 · Curious Farm Animals: "up to one" deixa ativar sem alvo (115.3) e o morrer ganha 3 de vida', () => {
  let s = mesa(), a; [s, a] = poe(s, 0, 'Curious Farm Animals');
  const ofertas = ativa(s, a);
  assert.ok(ofertas.length >= 1, 'ativável sem artefato nem encantamento em campo');
  const vida = s.players[0].life;
  s = resolve(act(s, ofertas[0]));
  assert.equal(s.objects[a].zone, 'graveyard');
  assert.equal(s.players[0].life, vida + 3, 'o gatilho de morrer resolve');
});

test('M-580 · Carrot Cake: entrar e ser sacrificado criam um Coelho 1/1 cada, e a ativação ganha 3 de vida', () => {
  let s = mesa(), k; [s, k] = poe(s, 0, 'Carrot Cake', 'hand');
  const coelhos = t => t.zones[0].battlefield.filter(o => t.objects[o].name === 'Rabbit').length;
  s = resolve(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === k)[0]));
  assert.equal(s.objects[k].zone, 'battlefield'); assert.equal(coelhos(s), 1, 'Coelho da entrada');
  [s] = poe(s, 0, 'Plains'); [s] = poe(s, 0, 'Plains');
  const vida = s.players[0].life;
  s = resolve(act(s, ativa(s, k)[0]));
  assert.equal(s.objects[k].zone, 'graveyard');
  assert.equal(coelhos(s), 2, 'Coelho do sacrifício');
  assert.equal(s.players[0].life, vida + 3);
});
