// T-76 · CR5 · Salas: o texto de regras e o nome das portas (Comprehensive Rules 709.5, com 402.2 e 613).
// Texto da regra: .regras/cr-2026-09-25.txt. Carta exemplo com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge, consulta
// de 14/10/2026): Roaring Furnace // Steaming Sauna. As cartas "de teste" são scripts sintéticos que isolam a regra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const RF = 'Roaring Furnace // Steaming Sauna', OF = L('oficiais-tipos.json').find(x => x.name === RF);
const C = {};
if (OF) C[RF] = { name: RF, type_line: `${OF.type_line} // ${OF.verso.type_line}`, mana_cost: `${OF.mana_cost} // ${OF.verso.mana_cost}`, cmc: valorDeMana(OF.mana_cost) + valorDeMana(OF.verso.mana_cost), keywords: [], oracle_text: OF.oracle_text, colors: ['R', 'U'], layout: 'split' };
for (const [n, k] of Object.entries({ Mountain: 'R', Island: 'U', Plains: 'W' })) C[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SALA_EX = { action: 'etb', target: 'none', expect: { attached: false } };
const ST = 'Estúdio // Galeria';
const SCRIPTS = {
  // Sala de teste: Estúdio ({W}) "Creatures you control get +1/+0." · Galeria ({1}{W}) "Other permanents you control have hexproof."
  [ST]: { name: ST, self: { dividida: true, sala: true, mana: '{W}', types: ['enchantment'] }, abilities: [],
    continuo: [{ afetados: { tipos: ['creature'], de: 'you' }, poder: 1 }],
    back: { name: 'Galeria', types: ['enchantment'], mana: '{1}{W}', abilities: [], continuo: [{ afetados: { permanente: true, de: 'you', outra: true }, palavras: ['hexproof'] }] }, example: SALA_EX },
  'Tranca': { name: 'Tranca', effects: [{ do: 'porta', acao: 'trancar', target: { tipos: ['enchantment'], subtipos: ['Room'] } }], ...EX }, // "Lock a door of target Room."
  'Choque': { name: 'Choque', effects: [{ do: 'damage', amount: 2, target: 'creature' }], ...EX },
};
carta(ST, 'Enchantment — Room // Enchantment — Room', { mana_cost: '{W} // {1}{W}', cmc: 3, colors: ['W'], layout: 'split' });
carta('Tranca', 'Instant'); carta('Choque', 'Instant');
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' }); carta('Gigante', 'Creature — Giant', { power: '5', toughness: '5' }); carta('Muralha', 'Creature — Wall', { power: '0', toughness: '20' });
const TODAS = [RF, ST, 'Tranca', 'Choque', 'Urso', 'Gigante', 'Muralha'];
function mesa(seed = 1) {
  const deck = [...TODAS.map(name => ({ name, qty: 4, zone: 'main' })), { name: 'Mountain', qty: 6, zone: 'main' }, { name: 'Island', qty: 6, zone: 'main' }, { name: 'Plains', qty: 6, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const esvazia = s => { for (let i = 0; i < 30; i++) { s = passaAte(s, x => !x.stack.length || !!x.pending); if (!s.pending || !['triggers', 'pick_target', 'porta_escolha'].includes(s.pending.kind)) return s; s = act(s, legais(s, s.pending.p)[0]); } return s; };
const portas = (s, oid) => J(E.portasDaSalaT(s, s.objects[oid]));
const destranca = (s, oid) => { s = mana(s); const a = legais(s, 0, x => x.t === 'destrancar' && x.oid === oid)[0]; assert.ok(a, 'destrancar'); return esvazia(act(s, a)); };
const pt = (s, oid) => { const st = E.stats(s, s.objects[oid]); return [st.power, st.toughness]; };
function conjuraPorta(s, p, nome, lado) {
  let oid; [s, oid] = poe(s, p, nome, 'hand'); s = mana(s, p);
  const a = legais(s, p, x => x.t === 'cast' && x.oid === oid && x.face === lado)[0]; assert.ok(a, `conjurar ${lado} de ${nome}`);
  return [esvazia(act(s, a)), oid];
}
const alvosDoChoque = (s, p) => { let c; [s, c] = poe(s, p, 'Choque', 'hand'); s = mana(s, p); s = J(s); s.turn.priority = p; return legais(s, p, a => a.t === 'cast' && a.oid === c).map(a => a.targets[0].oid); };

test('CR 709.5 · o contínuo da porta esquerda só vale com ela destrancada: Estúdio dá +1/+0 às suas criaturas; trancada de novo, some', () => {
  let s = mesa(); let u; [s, u] = poe(s, 0, 'Urso', 'battlefield');
  let g; [s, g] = poe(s, 0, ST, 'battlefield');
  eq([portas(s, g), pt(s, u)], [{ esquerda: false, direita: false }, [2, 2]], 'posta no campo: as duas trancadas, nada vale');
  s = destranca(s, g);
  eq([portas(s, g).esquerda, pt(s, u)], [true, [3, 2]]);
  let t; [s, t] = poe(s, 0, 'Tranca', 'hand'); s = mana(s); s = esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === t)[0]));
  eq([portas(s, g), pt(s, u)], [{ esquerda: false, direita: false }, [2, 2]], 'trancada, a porta perde o texto');
});

test('CR 709.5 · o contínuo da porta direita só vale com ela destrancada: Galeria dá resistência a magia às suas outras permanentes (não a si mesma)', () => {
  let s = mesa(); let u; [s, u] = poe(s, 0, 'Urso', 'battlefield');
  let g; [s, g] = conjuraPorta(s, 0, ST, 'esquerda');
  assert.ok(alvosDoChoque(s, 1).includes(u), 'Galeria trancada: o oponente mira o Urso');
  s = mana(s); const d = legais(s, 0, x => x.t === 'destrancar' && x.oid === g); assert.equal(d.length, 1, 'só a direita está trancada'); s = esvazia(act(s, d[0]));
  eq(portas(s, g), { esquerda: true, direita: true });
  assert.ok(!alvosDoChoque(s, 1).includes(u), 'Galeria destrancada: o Urso tem resistência a magia');
  assert.ok(alvosDoChoque(s, 0).includes(u), 'resistência a magia não impede o próprio controlador');
  assert.ok(E.hasKeyword(s, s.objects[u], 'hexproof') && !E.hasKeyword(s, s.objects[g], 'hexproof'), '"outras": a Sala não ganha');
  eq(pt(s, u), [3, 2], 'e as duas portas valem juntas');
});

test('CR 709.5 / 402.2 · Steaming Sauna (texto oficial): "You have no maximum hand size" só com a porta destrancada; trancada, descarta para 7', () => {
  assert.ok(OF, 'texto oficial em .listas/oficiais-tipos.json');
  let s = mesa(); let g; [s, g] = poe(s, 0, RF, 'battlefield');
  const enche = x => { x = J(x); for (let i = 0; i < 10; i++) [x] = poe(x, 0, 'Urso', 'hand'); return x; };
  let t = passaAte(enche(s), x => !!x.pending || x.turn.active === 1);
  eq([t.pending && t.pending.kind, t.pending && t.pending.n > 0], ['discard', true], 'trancada: limpeza pede descarte');
  s = mana(s); s = esvazia(act(s, legais(s, 0, x => x.t === 'destrancar' && x.oid === g && x.porta === 'direita')[0]));
  t = passaAte(enche(s), x => (!!x.pending && x.pending.kind === 'discard') || x.turn.active === 1);
  assert.equal(t.turn.active, 1, 'destrancada: sem descarte');
});

test('CR 709.5d / 709.5h · Roaring Furnace (texto oficial): ao destrancar, dano igual às cartas na sua mão na criatura do oponente; Steaming Sauna compra na sua etapa final', () => {
  let s = mesa(); let u; [s, u] = poe(s, 1, 'Muralha', 'battlefield');
  const mao = s.zones[0].hand.length;
  let g; [s, g] = conjuraPorta(s, 0, RF, 'esquerda');
  eq([s.objects[g].zone, portas(s, g), s.objects[u].damage || 0], ['battlefield', { esquerda: true, direita: false }, mao], 'dano = cartas na mão na resolução do gatilho');
  const m1 = s.zones[0].hand.length;
  let t = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1');
  assert.equal(t.zones[0].hand.length, m1, 'Sauna trancada: sem compra na etapa final');
  s = mana(s); s = esvazia(act(s, legais(s, 0, x => x.t === 'destrancar' && x.oid === g)[0]));
  const m2 = s.zones[0].hand.length;
  t = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1');
  assert.equal(t.zones[0].hand.length, m2 + 1, 'Sauna destrancada: compra uma');
});

test('CR 709.5 · o nome da Sala no campo é o das portas destrancadas; trancada por inteiro, não tem nome; fora do campo, os dois', () => {
  let s = mesa(); let g; [s, g] = poe(s, 0, ST, 'hand');
  eq(E.nomesDe(s, s.objects[g]), ['Estúdio', 'Galeria'], 'na mão: os dois (709.4a)');
  [s, g] = poe(s, 0, ST, 'battlefield');
  eq(E.nomesDe(s, s.objects[g]), [], 'as duas trancadas: sem nome');
  s = mana(s); s = esvazia(act(s, legais(s, 0, x => x.t === 'destrancar' && x.oid === g && x.porta === 'direita')[0]));
  eq(E.nomesDe(s, s.objects[g]), ['Galeria']);
  s = destranca(s, g);
  eq(E.nomesDe(s, s.objects[g]), ['Estúdio', 'Galeria']);
});

test('CR 709.5 · validador: contínuo e regra de jogador valem nas portas; concessão, efeito de resolução e contínuo que tira habilidade, troca P/R ou muda cor numa porta direita são recusados', () => {
  const base = { name: 'X // Y', self: { dividida: true, sala: true, mana: '{W}', types: ['enchantment'] }, abilities: [], example: SALA_EX };
  const ok = sc => eq(SC.validateScript(sc), [], JSON.stringify(sc));
  const recusa = (sc, re) => assert.ok(SC.validateScript(sc).some(e => re.test(e)), JSON.stringify(SC.validateScript(sc)));
  ok({ ...base, continuo: [{ afetados: { tipos: ['creature'], de: 'you' }, poder: 1 }], back: { name: 'Y', types: ['enchantment'], mana: '{1}', abilities: [], regraJogador: [{ quem: 'voce', semLimiteDeMao: true }] } });
  recusa({ ...base, grants: { power: 1 }, back: { name: 'Y', types: ['enchantment'], mana: '{1}', abilities: [] } }, /sala/);
  recusa({ ...base, back: { name: 'Y', types: ['enchantment'], mana: '{1}', abilities: [], effects: [{ do: 'gain', amount: 1 }] } }, /porta direita: chave "effects"/);
  recusa({ ...base, back: { name: 'Y', types: ['enchantment'], mana: '{1}', abilities: [], continuo: [{ afetados: { tipos: ['creature'] }, perde: ['flying'] }] } }, /porta direita/);
  recusa({ ...base, back: { name: 'Y', types: ['enchantment'], mana: '{1}', abilities: [], continuo: [{ afetados: { tipos: ['creature'] }, poder: 'x' }] } }, /porta direita/);
});
