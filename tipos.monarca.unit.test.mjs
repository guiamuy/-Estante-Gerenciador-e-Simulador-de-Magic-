// T-62 · CR5 · O monarca nas condições (725.5, com 603.4 e 611.2): "if you're the monarch", "if an opponent is the monarch" e
// "as long as you're the monarch". Texto da regra: .regras/cr-2026-09-25.txt. Cartas exemplo com o texto oficial de
// .listas/oficiais-tipos.json (Oracle do Forge, clone de 13/10/2026): Throne Warden, Garrulous Sycophant e Queen Marchesa.
// As cartas "de teste" são scripts sintéticos que isolam a regra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, T, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-tipos.json', import.meta.url), 'utf8')).cartas;
const TW = 'Throne Warden', GS = 'Garrulous Sycophant', QM = 'Queen Marchesa';
const C = {};
for (const c of OF.filter(x => [TW, GS, QM].includes(x.name)))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: c.name === QM ? ['Deathtouch', 'Haste'] : [], oracle_text: c.oracle_text, colors: [...new Set(c.mana_cost.match(/[WUBRG]/g) || [])], power: c.power, toughness: c.toughness };
C.Plains = { name: 'Plains', type_line: 'Basic Land — Plains', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {W}.)', colors: [] };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
const SCRIPTS = {
  'Coroa': { name: 'Coroa', effects: [{ do: 'monarch' }], ...EX }, // "You become the monarch."
  // "As long as you're the monarch, this creature gets +2/+2."
  'Pajem': { name: 'Pajem', continuo: [{ afetados: 'self', poder: 2, resistencia: 2, se: { monarca: 'voce' } }], ...EX },
  // "As long as an opponent is the monarch, this creature gets +1/+0."
  'Invejoso': { name: 'Invejoso', continuo: [{ afetados: 'self', poder: 1, resistencia: 0, se: { monarca: 'oponente' } }], ...EX },
  // "Draw a card. If you're the monarch, draw two cards instead."
  'Tributo': { name: 'Tributo', effects: [{ do: 'draw', amount: { per: 'se', se: 'monarca', sim: 2, nao: 1 } }], ...EX },
  // "You gain 3 life. If an opponent is the monarch, you become the monarch."
  'Golpe': { name: 'Golpe', effects: [{ do: 'gain', amount: 3 }, { do: 'monarch', onlyIf: 'oponente-monarca' }], ...EX },
};
carta('Coroa', 'Instant'); carta('Tributo', 'Instant'); carta('Golpe', 'Instant');
carta('Pajem', 'Creature — Human', { power: '1', toughness: '1' });
carta('Invejoso', 'Creature — Human', { power: '1', toughness: '1' });

function mesa(seed = 2) {
  const deck = [...Object.keys(C).filter(n => n !== 'Plains').map(name => ({ name, qty: 2, zone: 'main' })), { name: 'Plains', qty: 24, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, first: 0, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += 9; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const esvazia = s => { for (let i = 0; i < 30; i++) { s = passaAte(s, x => !x.stack.length || !!x.pending); if (!s.pending) return s; const os = legais(s, s.pending.p); if (!os.length) return s; s = act(s, os.find(a => a.t === 'pick') || os[0]); } return s; };
const conjura = (s, p, nome) => { let m; [s, m] = poe(s, p, nome, 'hand'); s = mana(s, p); const a = legais(s, p, x => x.t === 'cast' && x.oid === m)[0]; assert.ok(a, `conjurar ${nome}`); return esvazia(act(s, a)); };
const pt = (s, oid) => [E.stats(s, s.objects[oid]).power, E.stats(s, s.objects[oid]).toughness];
const monarca = (s, p) => { s = J(s); s.monarca = p; return s; };
/** até o começo do passo pedido de quem está ativo, parando com algo na pilha (ou sem nada, se não disparou). */
const ordena = s => { while (s.pending && s.pending.kind === 'triggers') s = act(s, legais(s, s.pending.p)[0]); return s; }
const aoPasso = (s, ativo, passo) => ordena(passaAte(s, x => x.turn.active === ativo && x.turn.step === passo));
const naPilha = (s, nome) => s.stack.filter(o => s.objects[o].name === nome).length;

test('CR 725.5 / 603.4 · Throne Warden: no seu passo final, se você é o monarca, ganha um marcador +1/+1; sem ser o monarca, nem dispara', () => {
  let s = mesa(); let w; [s, w] = poe(s, 0, TW, 'battlefield');
  let x = aoPasso(s, 0, 'end');
  eq(naPilha(x, TW), 0, 'sem monarca no jogo: o "se" é falso, não dispara');
  s = conjura(s, 0, 'Coroa'); eq(s.monarca, 0);
  x = aoPasso(s, 0, 'end'); eq(naPilha(x, TW), 1, 'o monarca: dispara');
  x = esvazia(x); eq((x.objects[w].counters || {}).p1p1 || 0, 1);
  x = aoPasso(x, 1, 'end'); eq(naPilha(x, TW), 0, 'no passo final do oponente, nada (é "your end step")');
});

test('CR 603.4 · Throne Warden: se a coroa muda de mãos com o gatilho na pilha, ele não faz nada na resolução', () => {
  let s = mesa(); let w; [s, w] = poe(s, 0, TW, 'battlefield'); s = monarca(s, 0);
  let x = aoPasso(s, 0, 'end'); eq(naPilha(x, TW), 1);
  x = monarca(x, 1); x = esvazia(x);
  eq((x.objects[w].counters || {}).p1p1 || 0, 0, 'na resolução, A já não é o monarca');
});

test('CR 725.5 · Garrulous Sycophant: sendo o monarca, cada oponente perde 1 e você ganha 1; com o oponente monarca, nada', () => {
  let s = mesa(); [s] = poe(s, 0, GS, 'battlefield'); s = monarca(s, 0);
  const [a, b] = [s.players[0].life, s.players[1].life];
  let x = esvazia(aoPasso(s, 0, 'end'));
  eq([x.players[0].life - a, x.players[1].life - b], [1, -1]);
  let y = monarca(s, 1); y = aoPasso(y, 0, 'end'); eq(naPilha(y, GS), 0, 'o oponente é o monarca: não dispara');
});

test('CR 725.5 · Queen Marchesa: na sua manutenção, se um oponente é o monarca, cria um Assassino 1/1 com toque mortífero e ímpeto; sendo você o monarca, ou sem monarca, nada', () => {
  let s = mesa(); let q; [s, q] = poe(s, 0, QM, 'battlefield');
  let x = aoPasso(s, 1, 'upkeep'); x = aoPasso(x, 0, 'upkeep'); eq(naPilha(x, QM), 0, 'sem monarca no jogo');
  let y = aoPasso(monarca(s, 0), 1, 'upkeep'); y = aoPasso(y, 0, 'upkeep'); eq(naPilha(y, QM), 0, 'você é o monarca');
  let z = aoPasso(monarca(s, 1), 1, 'upkeep'); z = aoPasso(z, 0, 'upkeep'); eq(naPilha(z, QM), 1, 'o oponente é o monarca');
  z = esvazia(z);
  const fichas = z.zones[0].battlefield.map(o => z.objects[o]).filter(o => o.token);
  eq(fichas.map(o => [o.name, ...pt(z, o.oid), E.hasKeyword(z, o, 'deathtouch'), E.hasKeyword(z, o, 'haste')]), [['Assassin', 1, 1, true, true]]);
});

test('CR 725.5 / 611.2 · "enquanto você é o monarca" (efeito contínuo): sem monarca no jogo o efeito não faz nada; vale enquanto você é o monarca e para quando a coroa sai', () => {
  let s = mesa(); let p, i; [s, p] = poe(s, 0, 'Pajem', 'battlefield'); [s, i] = poe(s, 1, 'Invejoso', 'battlefield');
  eq([pt(s, p), pt(s, i)], [[1, 1], [1, 1]], 'sem monarca: nada (725.5)');
  s = conjura(s, 0, 'Coroa');
  eq([pt(s, p), pt(s, i)], [[3, 3], [2, 1]], 'A é o monarca: o Pajem de A ganha; o Invejoso de B também (o oponente dele é o monarca)');
  s = monarca(s, 1);
  eq([pt(s, p), pt(s, i)], [[1, 1], [1, 1]], 'B é o monarca: nenhum dos dois');
});

test('CR 725.5 / 608.2c · efeitos com "se você é o monarca" e "se um oponente é o monarca" olham a coroa na resolução', () => {
  let s = mesa(); const h = s.zones[0].hand.length;
  let x = conjura(s, 0, 'Tributo'); eq(x.zones[0].hand.length - h, 1, 'sem coroa: compra 1');
  x = conjura(monarca(s, 0), 0, 'Tributo'); eq(x.zones[0].hand.length - h, 2, 'monarca: compra 2');
  x = conjura(s, 0, 'Golpe'); assert.equal(x.monarca, undefined, 'sem monarca no jogo, "if an opponent is the monarch" é falso');
  x = conjura(monarca(s, 1), 0, 'Golpe'); eq(x.monarca, 0, 'B era o monarca: A toma a coroa');
  x = conjura(monarca(s, 0), 0, 'Golpe'); eq(x.monarca, 0);
});

test('Validador e frases · a condição do monarca no gatilho, no efeito e no efeito contínuo', () => {
  for (const n of Object.keys(SCRIPTS)) eq(SC.validateScript(SCRIPTS[n]), [], n);
  const ruim = { name: 'X', abilities: [{ kind: 'triggered', when: 'end-step', condition: { monarca: 'todos' }, effects: [{ do: 'gain', amount: 1 }] }], ...EX };
  assert.ok(SC.validateScript(ruim).some(e => /monarca/.test(e)), 'condição de monarca com valor desconhecido');
  assert.ok(SC.validateScript({ ...SCRIPTS.Pajem, continuo: [{ afetados: 'self', poder: 1, resistencia: 1, se: { monarca: true } }] }).length, '"se" do contínuo: voce ou oponente');
  assert.match(T.descreveEfeitos(SCRIPTS.Golpe.effects), /se um oponente é o monarca/);
  assert.match(T.descreveEfeitos([{ do: 'draw', amount: 1, onlyIf: 'monarca' }]), /se você é o monarca/);
});
