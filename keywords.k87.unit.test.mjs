// K-87 · CR 305.7 / 613.1d / 305.6 / 614.12 · "Nonbasic lands are Mountains." (Blood Moon 67 listas competitivas, Harbinger of the Seas 14,
// Magus of the Moon 10; texto da Scryfall pelo ramo catalogo de 01/11/2026 em .listas/oficiais-keywords.json). Camada 4 com o carimbo da
// fonte: o terreno não básico troca os subtipos de terreno pelo novo, perde as habilidades do texto e fica com a mana intrínseca do subtipo;
// o básico não muda; as substituições de entrada impressas no terreno não valem (614.12). Antes, a frase não tinha leitura e as três eram manuais.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, J, act, poe, legais, passaAte } from './listas.mjs';
import { loadModules } from './_load.mjs';
const { leitor: L } = loadModules();
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-keywords.json', import.meta.url), 'utf8')).cartas;
const of = n => { const c = OF.find(x => x.name === n); assert.ok(c, 'sem texto oficial: ' + n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost || '', cmc: 3, keywords: c.keywords || [], oracle_text: c.oracle_text, colors: [], ...(c.power ? { power: c.power, toughness: c.toughness } : {}) }; };
const EX = { action: 'etb', target: 'none', expect: { attached: false } };

test('K-87 · leitura: Blood Moon e Magus viram Mountain, Harbinger vira Island; o validador confere a forma', () => {
  for (const [n, sub] of [['Blood Moon', 'Mountain'], ['Magus of the Moon', 'Mountain'], ['Harbinger of the Seas', 'Island']]) {
    const l = S.leitura(of(n)); assert.ok(l, n + ': leitura completa'); assert.equal(l.aprovada, false); assert.equal(S.coverage(of(n)).level, 'lida');
    assert.deepEqual(J(l.script.self.terrenosK), { quais: 'nao-basicos', subtipo: sub });
    assert.deepEqual(J(S.validateScript({ ...l.script, example: EX })), []);
  }
  assert.ok(S.validateScript({ name: 'X', self: { terrenosK: { quais: 'nao-basicos', subtipo: 'Desert' } }, example: EX }).length, 'só tipo básico');
  assert.ok(S.validateScript({ name: 'X', self: { terrenosK: { quais: 'todos', subtipo: 'Swamp' } }, example: EX }).length, '"todos" sem soma não vale (K-88: soma)');
});

const ilha = { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] };
const C = {
  'Blood Moon': of('Blood Moon'), 'Harbinger of the Seas': of('Harbinger of the Seas'), Island: ilha,
  'Terra de Teste': { name: 'Terra de Teste', type_line: 'Land — Desert', mana_cost: '', cmc: 0, keywords: [], oracle_text: '{T}: Add {C}.\n{1}: You gain 1 life.', colors: [] },
  'Arvore de Teste': { name: 'Arvore de Teste', type_line: 'Land Creature — Forest Dryad', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {G}.)', colors: ['G'], power: '1', toughness: '1' },
  'Choque de Teste': { name: 'Choque de Teste', type_line: 'Land — Island Mountain', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U} or {R}.)\nAs this land enters, you may pay 2 life. If you don\'t, it enters tapped.', colors: [] },
};
const scripts = {
  'Blood Moon': { ...S.leitura(C['Blood Moon']).script, lido: true, example: EX },
  'Harbinger of the Seas': { ...S.leitura(C['Harbinger of the Seas']).script, lido: true, example: EX },
  'Terra de Teste': { name: 'Terra de Teste', produces: [['C']], abilities: [{ kind: 'activated', cost: { mana: '{1}' }, effects: [{ do: 'gain', amount: 1 }] }], example: EX },
  'Arvore de Teste': { name: 'Arvore de Teste', produces: [['G']], example: EX },
  'Choque de Teste': { name: 'Choque de Teste', produces: [['U'], ['R']], entersTappedUnless: { pagaVida: 2 }, example: EX },
};
function mesa() {
  const b = ns => ns.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 87, mode: 'full', cards: C, scripts, first: 0, players: [{ name: 'A', deck: b([['Island', 20], ['Choque de Teste', 4], ['Terra de Teste', 4], ['Arvore de Teste', 2]]) }, { name: 'B', deck: b([['Island', 26], ['Blood Moon', 2], ['Harbinger of the Seas', 2]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const prod = (s, oid) => J(E.productions(s, s.objects[oid])).map(x => x.join('')).sort();

test('K-87 · na partida: o não básico vira Montanha (só {R}, sem as habilidades do texto), o básico não muda, e tudo volta quando a fonte sai', () => {
  let s = mesa(), terra, arvore, ilhaO, bm;
  [s, terra] = poe(s, 0, 'Terra de Teste'); [s, arvore] = poe(s, 0, 'Arvore de Teste'); [s, ilhaO] = poe(s, 0, 'Island');
  assert.deepEqual(prod(s, terra), ['C']); assert.ok(legais(s, 0, x => x.t === 'activate' && x.oid === terra).length, 'antes: a ativada do texto');
  [s, bm] = poe(s, 1, 'Blood Moon');
  assert.deepEqual(prod(s, terra), ['R'], '305.7: só a mana intrínseca de Mountain');
  assert.equal(E.linhaDeTipo ? E.linhaDeTipo(s, s.objects[terra]) : 'Land — Mountain', 'Land — Mountain', 'o Desert sai (subtipo de terreno)');
  assert.equal(legais(s, 0, x => x.t === 'activate' && x.oid === terra).length, 0, 'perdeu a ativada do texto');
  assert.ok(legais(s, 0, x => x.t === 'tap_mana' && x.oid === terra).length, 'a mesa oferece o {R}');
  assert.deepEqual(prod(s, arvore), ['R'], 'Dryad Arbor: Forest vira Mountain');
  if (E.linhaDeTipo) assert.equal(E.linhaDeTipo(s, s.objects[arvore]), 'Land Creature — Dryad Mountain', 'o subtipo de criatura fica');
  assert.deepEqual(prod(s, ilhaO), ['U'], 'o básico não muda');
  const z = J(s); E.moveObject(z, bm, 'graveyard');
  assert.deepEqual(prod(z, terra), ['C'], 'sem a fonte, volta'); assert.ok(legais(z, 0, x => x.t === 'activate' && x.oid === terra).length);
});

test('K-87 · 614.12: o terreno que entra sob o efeito não tem a própria substituição (entra desvirado, sem pagar vida); sem o efeito, pergunta', () => {
  let s = mesa(), ch; [s] = poe(s, 1, 'Blood Moon'); [s, ch] = poe(s, 0, 'Choque de Teste', 'hand');
  const vida = s.players[0].life;
  const j = legais(s, 0, x => x.t === 'play_land' && x.oid === ch); assert.ok(j.length, 'jogar o terreno');
  s = passaAte(act(s, j[0]), x => !x.stack.length && !(x.pending && x.pending.p === 1));
  assert.ok(!s.pending, 'nenhuma pergunta de pagar vida: ' + JSON.stringify(s.pending && s.pending.kind));
  assert.equal(s.objects[ch].zone, 'battlefield'); assert.equal(!!s.objects[ch].tapped, false, 'desvirado'); assert.equal(s.players[0].life, vida);
  assert.deepEqual(prod(s, ch), ['R']);
  let t = mesa(), c2; [t, c2] = poe(t, 0, 'Choque de Teste', 'hand');
  t = act(t, legais(t, 0, x => x.t === 'play_land' && x.oid === c2)[0]);
  assert.ok(t.pending || t.objects[c2].tapped, 'sem o efeito, a substituição vale (pergunta ou entra virado)');
});

test('K-87 · Harbinger of the Seas: Island; a criatura sem habilidades (perdeu) deixa de valer como fonte', () => {
  let s = mesa(), terra, h; [s, terra] = poe(s, 0, 'Terra de Teste'); [s, h] = poe(s, 1, 'Harbinger of the Seas');
  assert.deepEqual(prod(s, terra), ['U']);
  const z = J(s); z.objects[h].faceDown = true; assert.deepEqual(prod(z, terra), ['C'], 'virada para baixo não tem a habilidade');
});
