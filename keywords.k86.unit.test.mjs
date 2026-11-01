// K-86 · Urza's Saga inteira (448 listas competitivas; texto da Scryfall pelo ramo catalogo de 31/10/2026 em .listas/oficiais-keywords.json):
// a ficha Construct "with 'This token gets +1/+1 for each artifact you control.'" (bônus estático da ficha, 613.4c, contagem nova) e a
// busca "an artifact card with mana cost {0} or {1}" (202.1: o custo impresso exato; carta sem custo de mana não casa, 202.1b). Com a
// K-84 (capítulos) e a K-85 (habilidade ganha), a carta fica lida por inteiro. A aprovação (APROVADAS) é da homologação.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, J, act, poe, legais, passaAte } from './listas.mjs';
import { loadModules } from './_load.mjs';
const { leitor: L } = loadModules();
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-keywords.json', import.meta.url), 'utf8')).cartas;
const of = n => { const c = OF.find(x => x.name === n); assert.ok(c, 'sem texto oficial: ' + n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost || '', cmc: 0, keywords: c.keywords || [], oracle_text: c.oracle_text, colors: [] }; };
const US = "Urza's Saga";

test("K-86 · Urza's Saga lida por inteiro: Construct com o bônus por artefato e a busca por custo exato", () => {
  const l = S.leitura(of(US)); assert.ok(l, 'leitura completa'); assert.equal(l.aprovada, false); assert.equal(S.coverage(of(US)).level, 'lida');
  const caps = J(l.script.abilities.filter(a => a.when === 'chapter'));
  assert.deepEqual(caps.map(a => a.chapters), [[1], [2], [3]]);
  assert.deepEqual(caps[1].effects[0].habilidade.effects, [{ do: 'token', amount: 1, token: { name: 'Construct', types: ['artifact', 'creature'], subtypes: ['Construct'], colors: [], power: 0, toughness: 0, self: { per: 'artifacts-you-control', perPower: 1, perToughness: 1 } } }]);
  assert.deepEqual(caps[2].effects, [{ do: 'search', amount: 1, filter: { types: ['artifact'], custosDeManaK: ['{0}', '{1}'] }, to: 'battlefield' }]);
  assert.deepEqual(J(S.validateScript({ ...l.script, example: { action: 'etb', target: 'none', expect: { attached: false } } })), []);
});

const art = (name, mana_cost) => ({ name, type_line: 'Artifact', mana_cost, cmc: (mana_cost.match(/\d+/) || [0])[0] * 1, keywords: [], oracle_text: '', colors: [] });
function mesa() {
  const C = { [US]: of(US), Peca0: art('Peca0', '{0}'), Peca1: art('Peca1', '{1}'), Peca2: art('Peca2', '{2}'),
    Wastes: { name: 'Wastes', type_line: 'Basic Land', mana_cost: '', cmc: 0, keywords: [], oracle_text: '{T}: Add {C}.', colors: [] } };
  const scripts = { [US]: { ...S.leitura(C[US]).script, lido: true, example: { action: 'etb', target: 'none', expect: { attached: false } } } };
  const b = ns => ns.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 86, mode: 'full', cards: C, scripts, first: 0, players: [{ name: 'A', deck: b([[US, 4], ['Peca0', 2], ['Peca1', 2], ['Peca2', 4], ['Wastes', 20]]) }, { name: 'B', deck: b([['Wastes', 30]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const limpa = s => passaAte(s, x => !x.stack.length && !x.pending && !(x.queued || []).length);
const proxima = s => { const t = s.turn.number; return passaAte(s, x => x.turn.number > t + 1 && x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !(x.queued || []).length && !(x.pending && x.pending.p === 1), 900); };

test("K-86 · na partida: terreno, {C}, Construct que cresce com os artefatos e, no III, só artefato de custo {0} ou {1}", () => {
  let s = mesa(), us; [s, us] = poe(s, 0, US, 'hand');
  s = limpa(act(s, legais(s, 0, x => x.t === 'play_land' && x.oid === us)[0]));
  assert.equal(s.objects[us].counters.lore, 1); assert.deepEqual(J(E.productions(s, s.objects[us])), [['C']], 'I: {T}: Add {C}');
  s = limpa(proxima(s)); assert.equal(s.objects[us].counters.lore, 2);
  for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Wastes');
  const a = legais(s, 0, x => x.t === 'activate' && x.oid === us); assert.ok(a.length, 'II: {2}, {T}: Construct');
  s = limpa(act(s, a[0]));
  const co = s.zones[0].battlefield.map(o => s.objects[o]).find(o => o.name === 'Construct'); assert.ok(co, 'a ficha nasceu');
  assert.deepEqual(J(E.stats(s, co)), { power: 1, toughness: 1 }, '0/0 + 1/1 por artefato: a Saga não é artefato; a ficha é e conta a si mesma');
  [s] = poe(s, 0, 'Peca2'); assert.deepEqual(J(E.stats(s, s.objects[co.oid])), { power: 2, toughness: 2 }, 'mais um artefato, +1/+1');
  s = proxima(s);
  if (s.pending) { // III: a busca mostra só Peca0 e Peca1
    const op = legais(s, s.pending.p); const nomes = new Set(op.map(x => x.oid && s.objects[x.oid] && s.objects[x.oid].name).filter(Boolean));
    assert.ok(!nomes.has('Peca2') && !nomes.has('Wastes'), 'custo {2} e terreno sem custo não casam: ' + [...nomes]);
    const pega = op.find(x => x.oid && s.objects[x.oid].name === 'Peca0') || op[0]; s = limpa(act(s, pega));
  }
  assert.ok(s.zones[0].battlefield.some(o => ['Peca0', 'Peca1'].includes(s.objects[o].name)), 'um artefato de custo {0} ou {1} entrou');
  assert.equal(s.zones[0].battlefield.filter(o => s.objects[o].name === 'Peca2').length, 1, 'nenhuma Peca2 ({2}) veio da busca');
  assert.equal(s.objects[us].zone, 'graveyard', '714.4: sacrificada depois do III');
});
