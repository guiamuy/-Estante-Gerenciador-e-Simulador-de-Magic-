// K-83 · CR 601.2f / 602.2b · "This ability costs {1} less to activate for each legendary creature you control." — a redução do custo
// do canalizar das terras lendárias de Kamigawa (Boseiju, Otawara, Takenuma, Eiganjo, Sokenzan: 633 listas-carta competitivas; texto da
// Scryfall pelo ramo catalogo de 25/10/2026 em .listas/oficiais-keywords.json). Antes, o motor não reduzia custo de habilidade ativada
// e o leitor não lia a frase. Só tira do genérico (601.2f). As cinco seguem parciais pelo efeito do canalizar (frases da trilha motor).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, J, act, poe, legais, passaAte } from './listas.mjs';
import { loadModules } from './_load.mjs';
const { leitor: L } = loadModules();
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-keywords.json', import.meta.url), 'utf8')).cartas;
const of = n => { const c = OF.find(x => x.name === n); assert.ok(c, 'sem texto oficial: ' + n); return { name: n, type_line: c.type_line, mana_cost: '', cmc: 0, keywords: c.keywords, oracle_text: c.oracle_text, colors: [] }; };
const FRASE = 'This ability costs {1} less to activate for each legendary creature you control';

test('K-83 · o leitor lê a redução do canalizar nas cinco terras (o efeito delas continua com a trilha motor)', () => {
  for (const n of ['Boseiju, Who Endures', 'Otawara, Soaring City', 'Takenuma, Abandoned Mire', 'Eiganjo, Seat of the Empire', 'Sokenzan, Crucible of Defiance']) {
    const r = L.ler(of(n)); assert.ok(r.frases.some(f => f.lida && f.texto === FRASE), `${n}: a frase da redução é lida`);
  }
});

const CANAL = { name: 'Canal de Teste', type_line: 'Legendary Land', mana_cost: '', cmc: 0, keywords: ['Channel'], colors: [],
  oracle_text: '{T}: Add {G}.\nChannel — {2}{G}, Discard this card: Draw a card. This ability costs {1} less to activate for each legendary creature you control.' };
const LENDA = { name: 'Lenda', type_line: 'Legendary Creature — Human', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', power: '1', toughness: '1', colors: [] };
const FLORESTA = { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {G}.)', colors: [] };

test('K-83 · a redução vira campo do custo e só tira do genérico', () => {
  const r = L.ler(CANAL); assert.ok(r.completa, 'carta de teste lida por inteiro');
  const ab = J(r.script.abilities.find(a => a.cost && a.cost.fromHand));
  assert.deepEqual(ab.cost.reduzPorK, { generic: 1, per: 'legendary-creatures-you-control' });
  assert.deepEqual(J(S.validateScript({ ...r.script, example: { action: 'etb', target: 'none', expect: { attached: false } } })), []);
});

function mesa() {
  const C = { 'Canal de Teste': CANAL, Lenda: LENDA, Forest: FLORESTA };
  const scripts = { 'Canal de Teste': { ...L.ler(CANAL).script, example: { action: 'etb', target: 'none', expect: { attached: false } } } };
  const b = ns => ns.map(name => ({ name, qty: 10, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 83, mode: 'full', cards: C, scripts, first: 0, players: [{ name: 'A', deck: b(['Canal de Teste', 'Lenda', 'Forest']) }, { name: 'B', deck: b(['Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const canaliza = (s, oid) => legais(s, 0, x => x.t === 'activate' && x.oid === oid && x.fromHand);

test('K-83 · sem lendária, {2}{G} com duas Florestas não dá; com uma lendária, custa {1}{G}; com três, ainda {G} (601.2f)', () => {
  let s = mesa(), cn; [s, cn] = poe(s, 0, 'Canal de Teste', 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Forest');
  assert.equal(canaliza(s, cn).length, 0, 'sem lendária: faltam manas');
  [s] = poe(s, 0, 'Lenda');
  const a = canaliza(s, cn); assert.ok(a.length, 'uma lendária: {1}{G}');
  const mao = s.zones[0].hand.length; s = passaAte(act(s, a[0]), x => !x.stack.length && !x.pending);
  assert.equal(s.objects[cn].zone, 'graveyard', 'descartada como custo'); assert.equal(s.zones[0].hand.length, mao, 'comprou uma (a descartada saiu, a comprada entrou)');
  assert.equal(s.zones[0].battlefield.filter(o => s.objects[o].name === 'Forest' && s.objects[o].tapped).length, 2, 'pagou as duas');
  let t = mesa(), c2; [t, c2] = poe(t, 0, 'Canal de Teste', 'hand'); [t] = poe(t, 0, 'Forest'); for (let i = 0; i < 3; i++) [t] = poe(t, 0, 'Lenda');
  const b = canaliza(t, c2); assert.ok(b.length, 'três lendárias: só o {G}');
  t = passaAte(act(t, b[0]), x => !x.stack.length && !x.pending); assert.equal(t.objects[c2].zone, 'graveyard');
});

test('K-83 · o validador recusa a redução sem contagem conhecida ou sem genérico no custo', () => {
  const sc = cost => ({ name: 'X', abilities: [{ kind: 'activated', cost, effects: [{ do: 'draw', amount: 1 }] }], example: { action: 'etb', target: 'none', expect: { attached: false } } });
  assert.deepEqual(J(S.validateScript(sc({ mana: '{2}{G}', reduzPorK: { generic: 1, per: 'legendary-creatures-you-control' } }))), []);
  assert.ok(S.validateScript(sc({ mana: '{G}', reduzPorK: { generic: 1, per: 'legendary-creatures-you-control' } })).length, 'sem genérico');
  assert.ok(S.validateScript(sc({ mana: '{2}{G}', reduzPorK: { generic: 1, per: 'qualquer-coisa' } })).length, 'contagem desconhecida');
});
