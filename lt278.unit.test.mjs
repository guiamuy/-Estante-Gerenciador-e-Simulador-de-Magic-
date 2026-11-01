// M-597 · leitor, competitivos na ordem gulosa da sentinela (texto da Scryfall de 25/10/2026 em cobertura/resumo.json): alvo
// "target noncreature artifact or noncreature enchantment" (Haywire Mite), custo "Pay N life" abrindo a habilidade (Griselbrand; 119.4)
// e "exile target nonland permanent an opponent controls with mana value 2 or less until ~ leaves the battlefield" (Portable Hole e
// Seam Rip; 610.3). Cartas de teste com nomes inventados; a aprovação das cartas do catálogo é da homologacao. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, act, poe, legais, passaAte, limpaMao } from './listas.mjs';
import { loadModules } from './_load.mjs';
const L = loadModules().leitor;
const C = {
  Acaro: { name: 'Acaro', mana_cost: '{G}', cmc: 1, type_line: 'Artifact Creature — Insect', oracle_text: 'When this creature dies, you gain 2 life.\n{G}, Sacrifice this creature: Exile target noncreature artifact or noncreature enchantment.', power: '1', toughness: '1', keywords: [], colors: ['G'] },
  Demonio: { name: 'Demonio', mana_cost: '{4}{B}{B}{B}{B}', cmc: 8, type_line: 'Legendary Creature — Demon', oracle_text: 'Flying, lifelink\nPay 7 life: Draw seven cards.', power: '7', toughness: '7', keywords: ['Flying', 'Lifelink'], colors: ['B'] },
  Buraco: { name: 'Buraco', mana_cost: '{W}', cmc: 1, type_line: 'Artifact', oracle_text: 'When this artifact enters, exile target nonland permanent an opponent controls with mana value 2 or less until this artifact leaves the battlefield.', keywords: [], colors: [] },
  Pedra: { name: 'Pedra', mana_cost: '{1}', cmc: 1, type_line: 'Artifact', oracle_text: '', keywords: [], colors: [] },
  Robo: { name: 'Robo', mana_cost: '{2}', cmc: 2, type_line: 'Artifact Creature — Construct', oracle_text: '', power: '2', toughness: '2', keywords: [], colors: [] },
  Gigante: { name: 'Gigante', mana_cost: '{3}', cmc: 3, type_line: 'Artifact', oracle_text: '', keywords: [], colors: [] },
  Forest: { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {G}.)', colors: [] },
  Plains: { name: 'Plains', type_line: 'Basic Land — Plains', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {W}.)', colors: [] },
};
const ex = { example: { target: 'none', expect: { selfLife: 0 } } };
const lido = n => { const r = L.ler(C[n]); assert.ok(r && r.completa, `${n} lida por inteiro`); return { ...r.script, ...ex }; };
const SC = { Acaro: lido('Acaro'), Demonio: lido('Demonio'), Buraco: lido('Buraco'), Pedra: { name: 'Pedra', ...ex }, Robo: { name: 'Robo', ...ex }, Gigante: { name: 'Gigante', ...ex } };
function mesa(seed = 278) {
  const d = xs => xs.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SC, first: 0, players: [{ name: 'A', deck: d([['Acaro', 2], ['Demonio', 2], ['Buraco', 2], ['Forest', 17], ['Plains', 17]]) }, { name: 'B', deck: d([['Pedra', 4], ['Robo', 4], ['Gigante', 4], ['Plains', 28]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = limpaMao(s, 0); const o = {}; for (const n of ['Pedra', 'Robo', 'Gigante']) [s, o[n]] = poe(s, 1, n); let pl; [s, pl] = poe(s, 1, 'Plains'); o.Plains = pl;
  return { s, o };
}
const resolve = s => { for (let i = 0; i < 40 && (s.stack.length || s.pending); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority }); return s; };
const tem = (of, oid) => of.some(x => JSON.stringify(x).includes(`"${oid}"`));

test('M-597 · leitura: alvo misto, "Pay 7 life" e exílio até sair com valor de mana', () => {
  assert.equal(JSON.stringify(SC.Acaro.abilities[1].effects[0].target), JSON.stringify({ ou: [{ tipos: ['artifact'], semTipos: ['creature'] }, { tipos: ['enchantment'], semTipos: ['creature'] }] }));
  assert.equal(JSON.stringify(SC.Demonio.abilities[0]), JSON.stringify({ kind: 'activated', cost: { life: 7 }, effects: [{ do: 'draw', amount: 7 }] }));
  assert.equal(JSON.stringify(SC.Buraco.abilities[0].effects[0]), JSON.stringify({ do: 'exile', ate: 'fonte-sair', target: { de: 'opponent', semTipos: ['land'], mvMax: 2 } }));
});

test('M-597 · Ácaro: exila artefato que não é criatura; a criatura-artefato e o terreno não são alvo', () => {
  let { s, o } = mesa(); let a; [s, a] = poe(s, 0, 'Acaro'); [s] = poe(s, 0, 'Forest');
  const of = legais(s, 0, x => x.t === 'activate' && x.oid === a);
  assert.ok(tem(of, o.Pedra) && tem(of, o.Gigante), 'artefatos que não são criatura'); assert.ok(!tem(of, o.Robo), 'a criatura-artefato não'); assert.ok(!tem(of, o.Plains), 'o terreno não');
  s = resolve(act(s, of.find(x => JSON.stringify(x).includes(`"${o.Gigante}"`))));
  assert.equal(s.objects[o.Gigante].zone, 'exile'); assert.equal(s.objects[a].zone, 'graveyard', 'sacrificou o Ácaro');
});

test('M-597 · 119.4: o Demônio paga 7 de vida e compra 7; sem vida bastante não ativa', () => {
  let { s } = mesa(); let d; [s, d] = poe(s, 0, 'Demonio'); const v = s.players[0].life, mao = s.zones[0].hand.length;
  s = resolve(act(s, legais(s, 0, x => x.t === 'activate' && x.oid === d)[0]));
  assert.equal(s.players[0].life, v - 7); assert.equal(s.zones[0].hand.length, mao + 7);
  s.players[0].life = 6; assert.ok(!legais(s, 0, x => x.t === 'activate' && x.oid === d).length, 'com 6 de vida não paga 7');
});

test('M-597 · 610.3: o Buraco exila só valor de mana 2 ou menos do oponente, até ele sair do campo', () => {
  let { s, o } = mesa(); let b; [s, b] = poe(s, 0, 'Buraco', 'hand'); [s] = poe(s, 0, 'Plains');
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === b)[0]); for (let i = 0; i < 10 && s.stack.length && !s.pending; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.ok(s.pending && s.pending.kind === 'pick_target', 'o gatilho pede o alvo');
  const op = s.pending.options.map(x => x.oid);
  assert.ok(op.includes(o.Pedra) && op.includes(o.Robo), 'valor 1 e 2 servem'); assert.ok(!op.includes(o.Gigante), 'valor 3 não'); assert.ok(!op.includes(o.Plains), 'terreno não');
  s = act(s, { t: 'pick_target', p: 0, index: op.indexOf(o.Robo) });
  s = resolve(s);
  assert.equal(s.objects[o.Robo].zone, 'exile', 'o Robô foi exilado');

});
