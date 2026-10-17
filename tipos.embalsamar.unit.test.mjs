// T-111 · CR5 · Embalsamar (Comprehensive Rules 702.128, com 707.9b, 707.2 e 602.5d).
// Texto da regra: .regras/cr-2026-09-25.txt. Carta exemplo com o texto oficial de .listas/oficiais-tipos.json (Scryfall, consulta de
// 17/10/2026, com os rulings de 18/04/2017 e 14/07/2017): Sacred Cat. As cartas "de teste" são scripts sintéticos que isolam a regra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => x.name === 'Sacred Cat'))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: ['Lifelink', 'Embalm'], oracle_text: c.oracle_text, colors: ['W'], power: c.power, toughness: c.toughness };
for (const [n, k] of Object.entries({ Plains: 'W', Island: 'U' })) C[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = {
  // carta azul de três manas com embalsamar: mostra o "branca em vez das outras cores" e o "sem custo de mana"
  'Gato Azul': { name: 'Gato Azul', self: { embalsamar: '{1}{U}' }, example: { action: 'etb', target: 'none', expect: { attached: false } } },
  'Copia Rapida': { name: 'Copia Rapida', effects: [{ do: 'ficha_copia', amount: 1, palavras: ['haste'], target: 'creature-you-control' }], example: { target: 'none', expect: { selfLife: 0 } } },
  'Copia Ficha': { name: 'Copia Ficha', effects: [{ do: 'ficha_copia', amount: 1, target: 'creature-you-control' }], example: { target: 'none', expect: { selfLife: 0 } } },
  'Mata Zumbi': { name: 'Mata Zumbi', effects: [{ do: 'destroy', target: { tipos: ['creature'], subtipos: ['Zombie'] } }], example: { target: 'none', expect: { selfLife: 0 } } },
};
carta('Gato Azul', 'Creature — Cat', { mana_cost: '{2}{U}', cmc: 3, colors: ['U'], power: '2', toughness: '2', keywords: ['Embalm'] });
carta('Copia Ficha', 'Instant'); carta('Copia Rapida', 'Instant'); carta('Mata Zumbi', 'Instant');

const SCAT = 'Sacred Cat';
function mesa(seed = 1) {
  const deck = [{ name: SCAT, qty: 6, zone: 'main' }, ...Object.keys(SCRIPTS).map(name => ({ name, qty: 3, zone: 'main' })), { name: 'Plains', qty: 12, zone: 'main' }, { name: 'Island', qty: 12, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, cores = { W: 1 }) => { s = J(s); for (const [c, n] of Object.entries(cores)) s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const embalsamas = (s, p, oid) => legais(s, p, a => a.t === 'activate' && a.oid === oid && a.fromGraveyard);
const resolveTudo = s => passaAte(s, x => !x.stack.length || !!x.pending);
const fichasDe = (s, p, nome) => s.zones[p].battlefield.filter(o => s.objects[o].token && s.objects[o].name === nome);
const embalsama = (s, p, oid) => { const a = embalsamas(s, p, oid)[0]; assert.ok(a, 'embalsamar oferecido'); return resolveTudo(act(s, a)); };

test('CR 702.128a · Sacred Cat (texto oficial): do cemitério, {W} e exilar a carta, cria uma ficha que é cópia dela — Zumbi Gato branca, 1/1, com vínculo com a vida', () => {
  let s = mesa(); let g; [s, g] = poe(s, 0, SCAT, 'graveyard'); s = mana(s);
  eq(embalsamas(s, 0, g).length, 1, 'uma oferta, do cemitério');
  { const b = [{ label: 'Ativar', action: embalsamas(s, 0, g)[0] }]; E.rotulosDaClasseT(s, g, b, () => ''); eq(b[0].label, 'Embalsamar · {W}', 'o botão da mesa diz embalsamar'); }
  s = embalsama(s, 0, g);
  eq(s.objects[g].zone, 'exile', 'a carta foi exilada como custo');
  const [t] = fichasDe(s, 0, SCAT); assert.ok(t, 'a ficha entrou');
  const st = E.stats(s, s.objects[t]);
  eq([st.power, st.toughness], [1, 1]);
  eq(E.coresDe(s, s.objects[t]), ['W']);
  assert.match(E.linhaDeTipo(s, s.objects[t]), /Creature — .*Cat/);
  assert.match(E.linhaDeTipo(s, s.objects[t]), /\bZombie\b/, 'Zumbi além dos outros tipos');
  eq(E.manaValueT(s, s.objects[t]), 0, 'sem custo de mana: valor de mana 0');
  assert.ok(E.hasKeyword(s, s.objects[t], 'lifelink'), 'a cópia tem o que está impresso (vínculo com a vida)');
});

test('CR 702.128a · embalsamar de carta azul de três manas: a ficha é branca em vez das outras cores, Zumbi e de valor de mana 0; um seletor de Zumbi a encontra', () => {
  let s = mesa(); let g; [s, g] = poe(s, 0, 'Gato Azul', 'graveyard'); s = mana(s, 0, { U: 1, C: 1 });
  s = embalsama(s, 0, g);
  const [t] = fichasDe(s, 0, 'Gato Azul'); const o = s.objects[t];
  eq(E.coresDe(s, o), ['W'], 'branca, não azul');
  eq(E.manaValueT(s, o), 0);
  eq(E.valorDaSalaT(s, o), 0, 'o mesmo valor nos seletores de "valor de mana"');
  let mz; [s, mz] = poe(s, 0, 'Mata Zumbi', 'hand'); s = mana(s, 0, { C: 1 });
  eq(legais(s, 0, a => a.t === 'cast' && a.oid === mz).flatMap(a => (a.targets || []).map(x => s.objects[x.oid].name)), ['Gato Azul'], 'só a ficha é Zumbi');
  eq(E.mutacao(s, o).subtypes.includes('Cat'), true, 'continua Gato');
  const carta = s.objects[g]; eq([carta.zone, E.coresDe(s, carta)], ['exile', ['U']], 'a carta exilada não muda');
});

test('CR 702.128a · "Activate only as a sorcery": sem oferta no turno do oponente, com a pilha cheia ou no combate; o pedido direto é recusado', () => {
  let s = mesa(); let g; [s, g] = poe(s, 0, SCAT, 'graveyard'); s = mana(s);
  const a = embalsamas(s, 0, g)[0];
  // no turno do oponente
  let o = J(s); o.turn.active = 1; o = mana(o);
  eq(embalsamas(o, 0, g).length, 0, 'turno do oponente');
  assert.throws(() => E.apply(o, a), /feitiço|sorcery|principal|tempo/i);
  // fora da fase principal
  let c = J(s); c.turn.step = 'begin_combat';
  eq(embalsamas(c, 0, g).length, 0, 'fora da principal');
  // sem mana
  let z = J(s); z.players[0].pool.W = 0; for (const oid of z.zones[0].battlefield) z.objects[oid].tapped = true;
  eq(embalsamas(z, 0, g).length, 0, 'sem {W}');
});

test('CR 702.128a · funciona só no cemitério: da mão e do exílio não há embalsamar; a ficha não volta a ser embalsamada', () => {
  let s = mesa(); let h, x; [s, h] = poe(s, 0, SCAT, 'hand'); [s, x] = poe(s, 0, SCAT, 'exile'); s = mana(s, 0, { W: 3 });
  eq([embalsamas(s, 0, h).length, embalsamas(s, 0, x).length], [0, 0]);
  let g; [s, g] = poe(s, 0, SCAT, 'graveyard'); s = embalsama(s, 0, g);
  const [t] = fichasDe(s, 0, SCAT);
  eq(legais(s, 0, a => a.t === 'activate' && a.oid === t).length, 0, 'a ficha no campo não ativa embalsamar');
});

test('CR 702.128a · o custo exila a carta na hora (ruling de 14/07/2017): com a habilidade na pilha, a carta já está no exílio, fora do alcance de quem quisesse exilar o cemitério', () => {
  let s = mesa(); let g; [s, g] = poe(s, 0, SCAT, 'graveyard'); s = mana(s);
  s = act(s, embalsamas(s, 0, g)[0]);
  eq([s.objects[g].zone, s.stack.length], ['exile', 1]);
  eq(s.zones[0].graveyard.includes(g), false);
  s = resolveTudo(s);
  eq(fichasDe(s, 0, SCAT).length, 1, 'a ficha entra mesmo assim');
});

test('CR 707.9b · a exceção do embalsamar é valor copiável (ruling de 18/04/2017): a ficha que copia a ficha embalsamada também é branca, Zumbi e de valor de mana 0', () => {
  let s = mesa(); let g, cf; [s, g] = poe(s, 0, 'Gato Azul', 'graveyard'); [s, cf] = poe(s, 0, 'Copia Ficha', 'hand'); s = mana(s, 0, { U: 1, C: 2 });
  s = embalsama(s, 0, g);
  const [t] = fichasDe(s, 0, 'Gato Azul');
  const c = legais(s, 0, a => a.t === 'cast' && a.oid === cf && (a.targets || []).some(x => x.oid === t))[0]; assert.ok(c, 'copiar a ficha');
  s = resolveTudo(act(s, c));
  const nova = fichasDe(s, 0, 'Gato Azul').find(o => o !== t); assert.ok(nova, 'a cópia entrou');
  const o = s.objects[nova];
  eq([E.coresDe(s, o), E.manaValueT(s, o), /\bZombie\b/.test(E.linhaDeTipo(s, o))], [['W'], 0, true]);
});

test('CR 702.128a · validador: self.embalsamar é o custo de "Embalm [custo]"', () => {
  const v = sc => SC.validateScript(sc).filter(e => /embalsamar/.test(e));
  eq(v({ name: 'X', self: { embalsamar: '{W}' } }), []);
  assert.ok(v({ name: 'X', self: { embalsamar: true } }).length, 'sem custo');
  assert.ok(v({ name: 'X', self: { embalsamar: 'W' } }).length, 'custo sem símbolo');
});

test('CR 707.9b · auditoria D1 (T-112): cópia com exceção própria ("except it has haste") da ficha embalsamada continua branca, Zumbi e de valor 0, e ganha ímpeto', () => {
  let s = mesa(); let g, cr; [s, g] = poe(s, 0, 'Gato Azul', 'graveyard'); [s, cr] = poe(s, 0, 'Copia Rapida', 'hand'); s = mana(s, 0, { U: 1, C: 2 });
  s = embalsama(s, 0, g);
  const [t] = fichasDe(s, 0, 'Gato Azul');
  const c = legais(s, 0, a => a.t === 'cast' && a.oid === cr && (a.targets || []).some(x => x.oid === t))[0]; assert.ok(c);
  s = resolveTudo(act(s, c));
  const o = s.objects[fichasDe(s, 0, 'Gato Azul').find(x => x !== t)];
  eq([E.coresDe(s, o), E.manaValueT(s, o), /\bZombie\b/.test(E.linhaDeTipo(s, o)), E.hasKeyword(s, o, 'haste')], [['W'], 0, true, true]);
});
