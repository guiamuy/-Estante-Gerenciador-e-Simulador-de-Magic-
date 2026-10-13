// M-359 · 111.4 · fichas diferentes com o mesmo nome não dividem os fatos (achado da revisão independente da M-358): o Elemental 4/4 azul e
// vermelho do Resculpt (script publicado) e o Elemental de P/T por contagem da Seize the Storm nasciam com os dados da ficha criada antes.
// Os testes falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, legais, passaAte } from './listas.mjs';
import { CARTAS, comMana } from './cmd.mjs';

const X = { per: 'soma', partes: [{ per: 'instants-sorceries-in-your-graveyard' }, { per: 'flashback-cards-you-own-in-exile' }] };
const SEIZE_EL = { name: 'Elemental', types: ['creature'], subtypes: ['Elemental'], colors: ['R'], keywords: ['trample'], power: 0, toughness: 0, self: { ptDefinido: { poder: X, resistencia: X } } };
const RESC_EL = { name: 'Elemental', types: ['creature'], subtypes: ['Elemental'], colors: ['U', 'R'], power: 4, toughness: 4 };
const PIRO_EL = { name: 'Elemental', types: ['creature'], subtypes: ['Elemental'], colors: ['R'], power: 1, toughness: 1 };
const REI = { name: 'Rei', types: ['creature'], subtypes: ['Human'], colors: ['W'], power: 2, toughness: 2 }, REI_L = { ...REI, legendary: true };
const ESP = { name: 'Spirit', types: ['creature'], subtypes: ['Spirit'], colors: ['W'], power: 1, toughness: 1 }, ESP_H = { ...ESP, abilities: [{ kind: 'activated', cost: { sacrifice: true }, effects: [{ do: 'gain', amount: 2 }] }] };
const DEFS = [RESC_EL, SEIZE_EL, PIRO_EL, REI, REI_L, ESP, ESP_H], NOMES = ['Molde', 'Tempestade', 'Piro', 'Coroa', 'Coroa2', 'Alma', 'Alma2'];
const inst = n => ({ name: n, type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: '', colors: ['R'] });
const cards = Object.fromEntries(NOMES.map(n => [n, inst(n)]));
const scripts = Object.fromEntries(NOMES.map((n, i) => [n, { name: n, effects: [{ do: 'token', amount: 1, token: DEFS[i] }], example: { action: 'cast', target: 'none', expect: { selfLife: 20 } } }]));
function jogo() {
  const baralho = ns => ns.map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 5, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...NOMES, 'Mountain']) }, { name: 'B', deck: baralho(['Plains', 'Swamp']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const cria = (s, def) => { const nome = NOMES[DEFS.indexOf(def)] || NOMES[DEFS.findIndex(d => JSON.stringify(d) === JSON.stringify(def))];
  s = J(s); const oid = s.zones[0].library.find(o => s.objects[o].name === nome); s.zones[0].library = s.zones[0].library.filter(o => o !== oid); s.zones[0].hand.push(oid); s.objects[oid].zone = 'hand';
  const antes = new Set(Object.keys(s.objects)); const m = comMana(s, 'R');
  s = act(act(act(m, legais(m, 0, a => a.t === 'cast' && a.oid === oid)[0]), { t: 'pass', p: 0 }), { t: 'pass', p: 1 });
  return [s, Object.keys(s.objects).find(k => !antes.has(k) && s.objects[k].token)]; };
const pt = (s, oid) => { const st = E.stats(s, s.objects[oid]); return [st.power, st.toughness]; };

test('M-359 · 111.4: Elemental do Resculpt e Elemental da Seize the Storm na mesma partida, em qualquer ordem, cada um com o seu P/T, cor e atropelar', () => {
  for (const ordem of [[RESC_EL, SEIZE_EL], [SEIZE_EL, RESC_EL]]) {
    let s = jogo(), a, b;
    [s, a] = cria(s, ordem[0]); [s, b] = cria(s, ordem[1]);
    const r = ordem[0] === RESC_EL ? a : b, z = ordem[0] === RESC_EL ? b : a;
    assert.deepEqual(pt(s, r), [4, 4], 'Resculpt: 4/4');
    assert.deepEqual([...s.facts[s.objects[r].name].colors].sort(), ['R', 'U']);
    assert.ok(!s.facts[s.objects[r].name].kw.includes('trample'));
    assert.deepEqual(pt(s, z), [2, 2], 'Seize: a contagem (as duas instantâneas de teste no cemitério)');
    assert.ok(s.facts[s.objects[z].name].kw.includes('trample'));
    assert.deepEqual([...s.facts[s.objects[z].name].colors], ['R']);
    for (const o of [r, z]) assert.equal(s.objects[o].name.replace(/\u200b/g, ''), 'Elemental', 'o nome visível é o mesmo');
  }
});

test('M-359 · fichas com a mesma definição continuam dividindo os fatos (sem chave nova); três definições diferentes, três chaves', () => {
  let s = jogo(), a, b, c, d;
  [s, a] = cria(s, PIRO_EL); [s, b] = cria(s, { ...PIRO_EL });
  assert.equal(s.objects[a].name, s.objects[b].name);
  assert.equal(s.objects[a].name, 'Elemental');
  [s, c] = cria(s, RESC_EL); [s, d] = cria(s, SEIZE_EL);
  assert.equal(new Set([a, c, d].map(o => s.objects[o].name)).size, 3);
  assert.deepEqual([pt(s, a), pt(s, c)], [[1, 1], [4, 4]]);
});

test('M-359 · achados da revisão: lendária e comum com o mesmo nome não dividem fatos (704.5j); habilidade em só uma das definições também separa, nas duas ordens', () => {
  let s = jogo(), a, b;
  [s, a] = cria(s, REI); [s, b] = cria(s, REI_L);
  assert.equal(!!s.facts[s.objects[a].name].legendary, false); assert.equal(!!s.facts[s.objects[b].name].legendary, true);
  for (const ordem of [[ESP, ESP_H], [ESP_H, ESP]]) {
    let t = jogo(), x, y; [t, x] = cria(t, ordem[0]); [t, y] = cria(t, ordem[1]);
    const hab = o => ((t.facts[t.objects[o].name].script || {}).abilities || []).length;
    assert.deepEqual([hab(x), hab(y)], ordem[0] === ESP ? [0, 1] : [1, 0]);
  }
});
