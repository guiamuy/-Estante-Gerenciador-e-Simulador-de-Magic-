// M-411 · LT77 · "You may sacrifice an artifact or discard a card. If you do, draw N cards." (Vision of Love, K'un-Lun Warrior; texto da Scryfall de
// 17/10/2026 UTC, .listas/oficiais-revisadas.json), caminho de produção (APROVADAS): a escolha na resolução vai de uma carta da mão ou um artefato seu, ou nada
// (o "you may" é do efeito). Mesma decisão do Highway Robbery (Leva 107), agora com o tipo do sacrifício. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, palavrasDoTexto, valorDeMana, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Vision of Love', "K'un-Lun Warrior"];
const C = {}; for (const n of NOMES) { const c = OF.find(x => x.name === n); C[n] = { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: palavrasDoTexto(c.oracle_text), oracle_text: c.oracle_text, colors: ['R'], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; }
C.Pedra = { name: 'Pedra', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] };
C.Golem = { name: 'Golem', type_line: 'Artifact Creature — Golem', mana_cost: '{3}', cmc: 3, keywords: [], oracle_text: '', colors: [], power: '3', toughness: '3' };
C.Mountain = { name: 'Mountain', type_line: 'Basic Land — Mountain', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {R}.)', colors: [] };
function mesa(seed = 9) {
  const b = ns => ns.map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Pedra', 'Golem', 'Mountain']) }, { name: 'B', deck: b(['Pedra', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);
const escolhe = (s, oid) => { const a = legais(s, s.pending.p, x => x.t === 'pick' && (x.oid === oid || (x.oids || []).includes(oid))); assert.ok(a.length, JSON.stringify(legais(s, s.pending.p)).slice(0, 300)); return act(s, a[0]); };

test('LT77 · as duas jogam pelo leitor aprovado; o script diz o tipo do sacrifício', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-411'); }
  assert.deepEqual(JSON.parse(JSON.stringify(S.leitura(C['Vision of Love']).script.effects)), [{ do: 'discard_or_sacrifice_land_draw', amount: 2, tipo: 'artifact' }]);
  const g = S.leitura(C["K'un-Lun Warrior"]).script.abilities[0]; assert.equal(g.optional, true); assert.ok(!('obrigatorio' in g.effects[0]));
  assert.ok(S.validateScript({ name: 'Z', example: { target: 'none', expect: {} }, effects: [{ do: 'discard_or_sacrifice_land_draw', amount: 2, obrigatorio: true }] }).length, 'sem "you may" não é coberto');
});

test('LT77 · Vision of Love: escolhe uma carta da mão OU um artefato seu (não terreno, não do oponente); se fizer, compra duas; nada, não compra', () => {
  let s = mesa(), v, pe, go, pb, mt; [s, v] = poe(s, 0, 'Vision of Love', 'hand'); [s, pe] = poe(s, 0, 'Pedra'); [s, go] = poe(s, 0, 'Golem'); [s, pb] = poe(s, 1, 'Pedra'); [s, mt] = poe(s, 0, 'Mountain'); [s] = poe(s, 0, 'Mountain');
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === v)[0])); assert.equal(s.pending.kind, 'pick');
  const from = s.pending.from; assert.ok(from.includes(pe) && from.includes(go) && !from.includes(pb) && !from.includes(mt), JSON.stringify(from));
  assert.ok(s.zones[0].hand.every(o => from.includes(o)), 'toda a mão'); assert.equal(s.pending.min, 0); assert.equal(s.pending.max, 1);
  const mao = s.zones[0].hand.length, grim = s.zones[0].library.length;
  let a = passaAte(escolhe(s, pe), x => !x.pending || x.pending.kind !== 'pick'); a = passaAte(a, x => !x.stack.length || !!x.pending);
  assert.equal(a.objects[pe].zone, 'graveyard', 'sacrificou o artefato'); assert.equal(a.zones[0].hand.length, mao + 2); assert.equal(a.zones[0].library.length, grim - 2);
  const h0 = s.zones[0].hand[0]; let d = passaAte(escolhe(s, h0), x => !x.stack.length || !!x.pending);
  assert.equal(d.objects[h0].zone, 'graveyard', 'descartou'); assert.equal(d.zones[0].hand.length, mao - 1 + 2);
  const fim = legais(s, 0, x => x.t !== 'pick'); assert.ok(fim.length, 'pode não escolher nada'); let n = passaAte(act(s, fim[0]), x => !x.stack.length || !!x.pending);
  assert.equal(n.zones[0].hand.length, mao); assert.equal(n.objects[pe].zone, 'battlefield');
});

test('LT77 · K\'un-Lun Warrior: ao entrar, pode sacrificar um artefato ou descartar; se fizer, compra uma', () => {
  let s = mesa(), k, pe; [s, k] = poe(s, 0, "K'un-Lun Warrior", 'hand'); [s, pe] = poe(s, 0, 'Pedra'); [s] = poe(s, 0, 'Mountain'); [s] = poe(s, 0, 'Mountain');
  s = passaAte(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === k)[0]), x => !!x.pending);
  for (let i = 0; i < 3 && s.pending && s.pending.kind !== 'pick'; i++) { const sim = legais(s, s.pending.p).find(a => a.t === 'pay' || a.t === 'accept' || a.yes) || legais(s, s.pending.p)[0]; s = passaAte(act(s, sim), x => !!x.pending || !x.stack.length); }
  assert.equal(s.pending.kind, 'pick'); assert.ok(s.pending.from.includes(pe));
  const mao = s.zones[0].hand.length; s = passaAte(escolhe(s, pe), x => !x.stack.length || !!x.pending);
  assert.equal(s.objects[pe].zone, 'graveyard'); assert.equal(s.zones[0].hand.length, mao + 1);
});

test('LT77 · a pilha explicada diz o tipo e a quantia (antes: sempre "terreno" e "2")', async () => {
  const { loadModules } = await import('./_load.mjs'); const M = loadModules();
  assert.equal(M.table.descreveEfeitos([{ do: 'discard_or_sacrifice_land_draw', amount: 1, tipo: 'artifact' }]).replace(/\.$/, '').toLowerCase().includes('pode descartar uma carta ou sacrificar um artefato; se fizer, compra 1 carta'), true);
  assert.match(M.table.descreveEfeitos([{ do: 'discard_or_sacrifice_land_draw', amount: 2 }]), /sacrificar um terreno; se fizer, compra 2 cartas/);
});
