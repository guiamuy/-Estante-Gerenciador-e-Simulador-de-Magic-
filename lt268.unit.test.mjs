// M-583 · leitor, competitivos na ordem gulosa da sentinela (texto da Scryfall de 25/10/2026 em cobertura/resumo.json): alvo
// "target artifact, enchantment, or nonbasic land an opponent controls" (Boseiju, Who Endures; 205.4a: terreno não básico) e
// "That player may search their library for a land card with a basic land type, put it onto the battlefield, then shuffle"
// (205.3i: tipo básico de terreno; 701.23: busca opcional, quem busca é o controlador do alvo). O padrão geral de "Destroy target …"
// passa a aceitar vírgula. Cartas de teste com nomes inventados; a aprovação das cartas do catálogo é da homologacao. Falha no
// motor anterior (a frase do alvo e a da busca ficavam sem leitura).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, act, poe, legais, passaAte, limpaMao } from './listas.mjs';
import { loadModules } from './_load.mjs';
const L = loadModules().leitor;
const C = {
  Arvore: { name: 'Arvore', mana_cost: '', cmc: 0, type_line: 'Legendary Land', oracle_text: '{T}: Add {G}.\nChannel — {1}{G}, Discard this card: Destroy target artifact, enchantment, or nonbasic land an opponent controls. That player may search their library for a land card with a basic land type, put it onto the battlefield, then shuffle. This ability costs {1} less to activate for each legendary creature you control.', keywords: [], colors: [] },
  Pedra: { name: 'Pedra', mana_cost: '{1}', cmc: 1, type_line: 'Artifact', oracle_text: '', keywords: [], colors: [] },
  Ruina: { name: 'Ruina', mana_cost: '', cmc: 0, type_line: 'Land', oracle_text: '{T}: Add {C}.', keywords: [], colors: [] },
  Forest: { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {G}.)', colors: [] },
  Swamp: { name: 'Swamp', type_line: 'Basic Land — Swamp', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {B}.)', colors: [] },
};
const r0 = L.ler(C.Arvore);
const SC = { Arvore: { ...r0.script, example: { target: 'none', expect: { selfLife: 0 } } }, Ruina: { name: 'Ruina', produces: [['C']], example: { target: 'none', expect: { selfLife: 0 } } } };
function mesa(a, b, seed = 268) {
  const d = xs => xs.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SC, first: 0, players: [{ name: 'A', deck: d(a) }, { name: 'B', deck: d(b) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  return limpaMao(s, 0);
}
const passa = s => { for (let i = 0; i < 60 && s.stack.length && !s.pending; i++) s = act(s, { t: 'pass', p: s.turn.priority }); return s; };

test('M-583 · leitura: Boseiju lida por inteiro (alvo com "ou", busca do controlador do alvo)', () => {
  assert.ok(r0 && r0.completa, 'lida por inteiro');
  const ef = r0.script.abilities[0].effects;
  assert.equal(JSON.stringify(ef[0].target), JSON.stringify({ ou: [{ tipos: ['artifact', 'enchantment'], de: 'opponent' }, { tipos: ['land'], terrenoBasico: false, de: 'opponent' }] }));
  assert.equal(ef[1].do, 'search'); assert.equal(ef[1].target, 'target-controller'); assert.equal(ef[1].optional, true); assert.equal(ef[1].to, 'battlefield');
});

function prepara() {
  let s = mesa([['Arvore', 4], ['Ruina', 2], ['Forest', 34]], [['Pedra', 2], ['Ruina', 2], ['Swamp', 36]]), a, f1, f2, minha, p, ru, sw;
  [s, a] = poe(s, 0, 'Arvore', 'hand'); [s, f1] = poe(s, 0, 'Forest'); [s, f2] = poe(s, 0, 'Forest'); [s, minha] = poe(s, 0, 'Ruina');
  [s, p] = poe(s, 1, 'Pedra'); [s, ru] = poe(s, 1, 'Ruina'); [s, sw] = poe(s, 1, 'Swamp');
  return { s, a, minha, p, ru, sw };
}

test('M-583 · 205.4a: alvo é artefato ou terreno não básico do oponente; básico e o seu terreno não', () => {
  const { s, a, minha, p, ru, sw } = prepara();
  const of = legais(s, 0, x => x.oid === a && !/play/.test(x.t)); const tem = o => of.some(x => JSON.stringify(x).includes(`"${o}"`));
  assert.ok(tem(p), 'a Pedra é alvo'); assert.ok(tem(ru), 'a Ruína do oponente é alvo');
  assert.ok(!tem(sw), 'o Pântano básico não é alvo'); assert.ok(!tem(minha), 'o seu terreno não básico não é alvo');
});

test('M-583 · 701.23: o oponente pode buscar um terreno com tipo básico e pô-lo no campo; recusar não faz nada', () => {
  for (const aceita of [true, false]) {
    let { s, a, ru } = prepara();
    s = passa(act(s, legais(s, 0, x => x.oid === a && !/play/.test(x.t) && JSON.stringify(x).includes(`"${ru}"`))[0]));
    assert.equal(s.objects[ru].zone, 'graveyard', 'a Ruína foi destruída'); assert.equal(s.objects[a].zone, 'graveyard', 'canalizar descarta a carta');
    assert.ok(s.pending, 'a busca é uma decisão'); assert.equal(s.pending.p, 1, 'quem decide é o controlador do alvo');
    assert.equal(s.pending.min, 0, 'a busca é opcional ("may")');
    assert.ok(s.pending.from.length > 0 && s.pending.from.every(o => s.objects[o].name === 'Swamp'), 'só terreno com tipo básico; a Ruína do grimório fica de fora');
    const op = legais(s, 1); const campoAntes = s.zones[1].battlefield.length;
    const pega = op.find(x => x.t === 'pick'); const nao = op.find(x => x.t !== 'pick');
    assert.ok(nao, 'pode recusar'); assert.ok(pega, 'pode buscar');
    s = act(s, aceita ? pega : nao); if (aceita && s.pending && s.pending.kind === 'pick') s = act(s, legais(s, 1).find(x => x.t !== 'pick')); s = passa(s);
    const novos = s.zones[1].battlefield.slice(campoAntes).map(o => s.objects[o].name);
    if (aceita) { assert.equal(s.zones[1].battlefield.length, campoAntes + 1); assert.ok(novos.includes('Swamp'), 'um Pântano entrou'); }
    else assert.equal(s.zones[1].battlefield.length, campoAntes, 'recusou: nada entra');
  }
});
