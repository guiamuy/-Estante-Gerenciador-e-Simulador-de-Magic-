// M-602 · leitor e núcleo, competitivos na ordem gulosa da sentinela (texto da Scryfall de 01/11/2026 em cobertura/<formato>.json):
// Emry, Lurker of the Loch — "{T}: Choose target artifact card in your graveyard. You may cast that card this turn. (You still pay its
// costs. Timing rules still apply.)" A carta escolhida pode ser conjurada do cemitério neste turno, pelo custo e no tempo normais (601.2);
// a permissão é de quem ativou, acaba com o turno e some se a carta mudar de zona (400.7). Cartas de teste com nomes inventados; a aprovação
// das cartas do catálogo é da homologacao. Falha no motor anterior (as frases ficavam sem leitura).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, act, poe, legais, passaAte, limpaMao } from './listas.mjs';
import { loadModules } from './_load.mjs';
const L = loadModules().leitor;
const C = {
  Lontra: { name: 'Lontra', mana_cost: '{6}{U}', cmc: 7, type_line: 'Legendary Creature — Merfolk Wizard', oracle_text: 'Affinity for artifacts (This spell costs {1} less to cast for each artifact you control.)\nWhen Lontra enters, mill four cards.\n{T}: Choose target artifact card in your graveyard. You may cast that card this turn. (You still pay its costs. Timing rules still apply.)', power: '1', toughness: '2', keywords: ['Affinity for'], colors: ['U'] },
  Pedra: { name: 'Pedra', mana_cost: '{1}', cmc: 1, type_line: 'Artifact', oracle_text: '', keywords: [], colors: [] },
  Urso: { name: 'Urso', mana_cost: '{1}{G}', cmc: 2, type_line: 'Creature — Bear', oracle_text: '', power: '2', toughness: '2', keywords: [], colors: ['G'] },
  Island: { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] },
  Forest: { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {G}.)', colors: [] },
};
const ex = { example: { target: 'none', expect: { selfLife: 0 } } };
const lido = n => { const r = L.ler(C[n]); assert.ok(r && r.completa, `${n} lida por inteiro`); return { ...r.script, ...ex }; };
const SC = { Lontra: lido('Lontra'), Pedra: { name: 'Pedra', ...ex }, Urso: { name: 'Urso', ...ex } };
function mesa(seed = 283) {
  const d = xs => xs.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SC, first: 0, players: [{ name: 'A', deck: d([['Lontra', 2], ['Pedra', 4], ['Urso', 4], ['Island', 30]]) }, { name: 'B', deck: d([['Forest', 40]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  return limpaMao(s, 0);
}
const passa = s => act(s, { t: 'pass', p: s.turn.priority });
const resolve = s => { for (let i = 0; i < 40 && (s.stack.length || s.pending); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : passa(s); return s; };
const doCemiterio = (s, oid) => legais(s, 0, a => a.t === 'cast' && a.oid === oid && a.permissao === oid);
function preparada() {
  let s = mesa(), l, pe, u; [s, l] = poe(s, 0, 'Lontra'); [s, pe] = poe(s, 0, 'Pedra', 'graveyard'); [s, u] = poe(s, 0, 'Urso', 'graveyard'); [s] = poe(s, 0, 'Island');
  return { s, l, pe, u };
}

test('M-602 · leitura: virar para escolher um artefato do seu cemitério e poder conjurá-lo neste turno', () => {
  const at = SC.Lontra.abilities.find(a => a.kind === 'activated');
  assert.equal(JSON.stringify(at.cost), JSON.stringify({ tap: true }));
  assert.equal(JSON.stringify(at.effects), JSON.stringify([{ do: 'conjuravel_cemiterio_m', target: 'card-in-your-graveyard', targetTypes: ['artifact'] }]));
  assert.equal(loadModules().scripts.validateScript(SC.Lontra).length, 0);
});

test('M-602 · 601.2: o artefato escolhido é conjurado do cemitério pelo custo normal; a criatura do cemitério não pode ser escolhida', () => {
  let { s, l, pe, u } = preparada();
  assert.equal(doCemiterio(s, pe).length, 0, 'antes de ativar, nada se conjura do cemitério');
  const ativa = legais(s, 0, a => a.t === 'activate' && a.oid === l);
  assert.ok(ativa.length, 'a ativada é oferecida');
  assert.ok(!ativa.some(a => JSON.stringify(a).includes(`"${u}"`)), 'a criatura do cemitério não é alvo');
  s = act(s, ativa.find(a => JSON.stringify(a).includes(`"${pe}"`)) || ativa[0]);
  if (s.pending) { const op = legais(s, s.pending.p); s = act(s, op.find(a => JSON.stringify(a).includes(`"${pe}"`)) || op[0]); }
  s = resolve(s);
  const casts = doCemiterio(s, pe); assert.ok(casts.length, 'depois de resolver, a Pedra pode ser conjurada do cemitério');
  s = resolve(act(s, casts[0]));
  assert.equal(s.objects[pe].zone, 'battlefield', 'a Pedra entrou'); assert.ok(!s.objects[pe].conjuravelCemM, '400.7: a permissão não segue a carta para o campo');
  assert.equal(doCemiterio(s, u).length, 0, 'o Urso continua no cemitério sem permissão');
});

test('M-602 · a permissão acaba com o turno; e a carta que muda de zona é outra (400.7)', () => {
  let { s, l, pe } = preparada();
  const ativa = legais(s, 0, a => a.t === 'activate' && a.oid === l);
  s = act(s, ativa.find(a => JSON.stringify(a).includes(`"${pe}"`)) || ativa[0]);
  if (s.pending) { const op = legais(s, s.pending.p); s = act(s, op.find(a => JSON.stringify(a).includes(`"${pe}"`)) || op[0]); }
  s = resolve(s); assert.ok(doCemiterio(s, pe).length);
  const prox = passaAte(s, x => x.turn.active === 0 && x.turn.number > s.turn.number && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  assert.equal(doCemiterio(prox, pe).length, 0, 'no turno seguinte, sem permissão');
  // 400.7: a carta que sai do cemitério e volta é outro objeto, sem a permissão
  const o = JSON.parse(JSON.stringify(s)); E.moveObject(o, pe, 'hand'); E.moveObject(o, pe, 'graveyard');
  assert.equal(o.objects[pe].zone, 'graveyard'); assert.equal(doCemiterio(o, pe).length, 0, 'voltou ao cemitério sem a permissão');
  // e é de quem ativou: o oponente não ganha a oferta
  assert.equal(legais(s, 1, a => a.t === 'cast' && a.oid === pe).length, 0);
});
