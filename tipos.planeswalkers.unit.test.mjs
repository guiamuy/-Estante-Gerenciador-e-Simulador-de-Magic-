// T-18 · CR5 · Planeswalker completo (Comprehensive Rules 306, com 606, 704.5i, 704.5j, 508.1b e 120.3c).
// Texto da regra: .regras/cr-2026-09-25.txt. Carta exemplo com o texto oficial de .listas/oficiais-commander.json: Narset, Parter of Veils.
// 306.7 (o redirecionamento de dano) não existe mais desde 2018: o teste prova que o motor não o faz. As cartas "de teste" são scripts
// sintéticos que isolam a regra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, palavrasDoTexto, valorDeMana } from './listas.mjs';

const L = n => { const o = JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')); return Array.isArray(o) ? o : o.cartas; };
const CARTAS = {};
for (const c of L('oficiais-commander.json').filter(x => x.name === 'Narset, Parter of Veils')) CARTAS[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: palavrasDoTexto(c.oracle_text), oracle_text: c.oracle_text, colors: ['U'], loyalty: String(c.loyalty) };
for (const [n, k] of Object.entries({ Island: 'U', Mountain: 'R' })) CARTAS[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
const carta = (name, type_line, extra = {}) => { CARTAS[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = {
  // Planeswalker de teste, lealdade 3: "+1: ganhe 1" e "−2: ganhe 5".
  'Sábio': { name: 'Sábio', loyalty: [{ cost: 1, label: '+1', effects: [{ do: 'gain', amount: 1 }] }, { cost: -2, label: '−2', effects: [{ do: 'gain', amount: 5 }] }], ...EX },
  'Raio': { name: 'Raio', effects: [{ do: 'damage', amount: 2, target: 'any' }], ...EX },
  'Faísca': { name: 'Faísca', effects: [{ do: 'damage', amount: 2, target: 'opponent' }], ...EX },
  'Roubo': { name: 'Roubo', effects: [{ do: 'ganhar_controle', target: 'permanent' }], ...EX },
  'Sopro': { name: 'Sopro', effects: [{ do: 'gain', amount: 1 }], ...EX },
  'Pergaminho': { name: 'Pergaminho', effects: [{ do: 'draw', amount: 2 }], ...EX },
  // Correções da auditoria: planeswalker-criatura 2/3 de lealdade 4; "{T}: 1 de dano a qualquer alvo" com toque mortífero e com infectar;
  // "cada planeswalker seu entra com um marcador de lealdade adicional".
  'Golem PW': { name: 'Golem PW', loyalty: [{ cost: 1, label: '+1', effects: [{ do: 'gain', amount: 1 }] }], ...EX },
  'Víbora': { name: 'Víbora', abilities: [{ kind: 'activated', cost: { tap: true }, effects: [{ do: 'damage', amount: 1, target: 'any' }] }], ...EX },
  'Peste': { name: 'Peste', abilities: [{ kind: 'activated', cost: { tap: true }, effects: [{ do: 'damage', amount: 2, target: 'any' }] }], ...EX },
  'Juramento': { name: 'Juramento', entra: [{ afetados: { tipos: ['planeswalker'], de: 'you', tiposDaCarta: true }, marcadores: { loyalty: 1 } }], ...EX },
};
carta('Sábio', 'Legendary Planeswalker — Sabio', { loyalty: '3' }); carta('Raio', 'Instant'); carta('Faísca', 'Instant'); carta('Roubo', 'Instant'); carta('Sopro', 'Instant'); carta('Pergaminho', 'Sorcery');
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' });
carta('Golem PW', 'Legendary Planeswalker Creature — Golem', { loyalty: '4', power: '2', toughness: '3' });
carta('Víbora', 'Creature — Snake', { power: '1', toughness: '1', keywords: ['Deathtouch'], oracle_text: 'Deathtouch' });
carta('Peste', 'Creature — Horror', { power: '1', toughness: '1', keywords: ['Infect'], oracle_text: 'Infect' });
carta('Juramento', 'Legendary Enchantment');

const baralho = nomes => { const u = [...new Set(nomes)]; return u.map(name => ({ name, qty: Math.max(4, Math.ceil(40 / u.length)), zone: 'main' })); };
const TODAS = ['Narset, Parter of Veils', 'Sábio', 'Raio', 'Faísca', 'Roubo', 'Sopro', 'Pergaminho', 'Urso', 'Golem PW', 'Víbora', 'Peste', 'Juramento'];
function mesa(seed = 1) {
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: CARTAS, scripts: SCRIPTS, players: [{ name: 'A', deck: baralho([...TODAS, 'Island']) }, { name: 'B', deck: baralho([...TODAS, 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p, n = 9) => { s = J(s); for (const c of 'WUBRG') s.players[p].pool[c] += n; return s; };
const esvazia = s => { for (let i = 0; i < 20; i++) { s = passaAte(s, x => !x.stack.length || !!x.pending); if (!s.pending || s.pending.kind !== 'triggers') return s; s = act(s, { t: 'order_trigger', p: s.pending.p, index: 0 }); } return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const lealdade = (s, oid) => (s.objects[oid].counters || {}).loyalty || 0;
function conjura(s, p, nome) { let oid; [s, oid] = poe(s, p, nome, 'hand'); s = mana(s, p); s = esvazia(act(s, legais(s, p, a => a.t === 'cast' && a.oid === oid)[0])); return [s, oid]; }
function mira(s, p, nome, alvo) {
  let oid; [s, oid] = poe(s, p, nome, 'hand'); s = mana(s, p);
  const a = legais(s, p, x => x.t === 'cast' && x.oid === oid && (x.targets || []).some(t => alvo.player != null ? t.player === alvo.player : t.oid === alvo))[0];
  assert.ok(a, `${nome} com o alvo pedido`); return act(s, a);
}
const deLealdade = (s, p, oid) => legais(s, p, a => a.t === 'activate' && a.oid === oid && E.abilitiesOf(s, s.objects[oid]).filter(x => x.kind === 'activated')[a.index || 0].loyalty != null);

test('CR 306.5b / 306.5c · o planeswalker entra com marcadores de lealdade iguais à lealdade impressa; no campo, a lealdade é o número de marcadores', () => {
  let [s, n] = conjura(mesa(), 0, 'Sábio');
  assert.equal(lealdade(s, n), 3);
  s = esvazia(act(s, deLealdade(s, 0, n).find(a => a.index === 0)));
  assert.equal(lealdade(s, n), 4, '+1 põe um marcador');
});

test('CR 306.5d / 606.3 · habilidade de lealdade: só no seu turno, na fase principal, com a pilha vazia e uma por turno por planeswalker', () => {
  let [s, n] = conjura(mesa(), 0, 'Sábio');
  assert.ok(deLealdade(s, 0, n).length >= 2, 'as duas oferecidas na principal');
  let r; [s, r] = poe(s, 0, 'Sopro', 'hand'); let t = act(mana(s, 0), legais(mana(s, 0), 0, a => a.t === 'cast' && a.oid === r)[0]);
  assert.equal(deLealdade(t, 0, n).length, 0, 'com a pilha ocupada, nenhuma');
  s = act(s, deLealdade(s, 0, n)[0]);
  s = esvazia(s);
  assert.equal(deLealdade(s, 0, n).length, 0, 'uma por turno');
  t = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  assert.equal(deLealdade(t, 0, n).length, 0, 'no turno do oponente, nenhuma');
  t = passaAte(t, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  assert.ok(deLealdade(t, 0, n).length > 0, 'no próximo turno, de novo');
});

test('CR 306.4 / 704.5j · dois planeswalkers lendários de mesmo nome sob o mesmo controlador: a regra das lendas pergunta qual fica', () => {
  let [s, a] = conjura(mesa(), 0, 'Sábio');
  let b; [s, b] = conjura(s, 0, 'Sábio');
  assert.equal(s.pending && s.pending.kind, 'legend');
  eq(J(s.pending.options).sort(), [a, b].sort());
});

test('CR 306.6 / 508.1b / 306.8 · o planeswalker do oponente pode ser atacado e o dano de combate tira lealdade, não vida', () => {
  let s = mesa(); let n; [s, n] = poe(s, 1, 'Sábio', 'battlefield', { counters: { loyalty: 3 } }); let u; [s, u] = poe(s, 0, 'Urso');
  const vida = s.players[1].life;
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0);
  s = act(s, { t: 'attack', p: 0, attackers: [u], alvos: { [u]: n } });
  s = passaAte(s, x => ['combat_end', 'main2'].includes(x.turn.step));
  eq([lealdade(s, n), s.players[1].life], [1, vida]);
});

test('CR 306.8 / 120.3c / 306.9 / 704.5i · dano de efeito tira lealdade; com lealdade 0 o planeswalker vai para o cemitério do DONO (mesmo roubado)', () => {
  let s = mesa(); let n; [s, n] = poe(s, 1, 'Sábio', 'battlefield', { counters: { loyalty: 3 } });
  s = esvazia(mira(s, 0, 'Raio', n));
  assert.equal(lealdade(s, n), 1);
  s = esvazia(mira(s, 0, 'Roubo', n));
  assert.equal(s.objects[n].controller, 0);
  s = esvazia(mira(s, 0, 'Raio', n));
  eq([s.objects[n].zone, s.zones[1].graveyard.includes(n)], ['graveyard', true]);
});

test('CR 306.7 · sem redirecionamento: o dano "ao oponente" vai ao jogador, nunca ao planeswalker dele', () => {
  let s = mesa(); let n; [s, n] = poe(s, 1, 'Sábio', 'battlefield', { counters: { loyalty: 3 } });
  const vida = s.players[1].life;
  s = esvazia(mira(s, 0, 'Faísca', { player: 1 }));
  eq([lealdade(s, n), s.players[1].life], [3, vida - 2]);
  assert.ok(!legais(mana(s, 0), 0, a => (a.targets || []).some(t => t.oid === n) && s.objects[a.oid] && s.objects[a.oid].name === 'Faísca').length);
});

test('Narset, Parter of Veils (texto oficial) · entra com 5 de lealdade; o oponente que já comprou no turno não compra mais nenhuma; a −2 é oferecida', () => {
  let [s, n] = conjura(mesa(), 0, 'Narset, Parter of Veils');
  assert.equal(lealdade(s, n), 5);
  assert.ok(deLealdade(s, 0, n).length >= 1, 'a −2 oferecida');
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  let o; [s, o] = poe(s, 1, 'Pergaminho', 'hand');
  const mao = s.zones[1].hand.length;
  s = esvazia(act(mana(s, 1), legais(mana(s, 1), 1, a => a.t === 'cast' && a.oid === o)[0]));
  assert.equal(s.zones[1].hand.length, mao - 1, 'B já comprou na etapa de compra: o "compre duas" não dá nenhuma');
});

/* ---------------- correções da auditoria independente ---------------- */
test('CR 306.5b / 614.1c · "cada planeswalker seu entra com um marcador de lealdade adicional" soma à lealdade impressa (antes a impressa sobrescrevia o marcador extra)', () => {
  let s = mesa(); let j; [s, j] = poe(s, 0, 'Juramento');
  let n; [s, n] = conjura(s, 0, 'Sábio');
  assert.equal(lealdade(s, n), 4);
});

test('CR 120.3c / 120.3e / 120.3d · dano de efeito num planeswalker-criatura tira lealdade E fica marcado; com infectar, tira lealdade e põe −1/−1; com toque mortífero, ele é destruído', () => {
  const comPw = () => { let s = mesa(); let g; [s, g] = poe(s, 1, 'Golem PW', 'battlefield', { counters: { loyalty: 4 } }); return [s, g]; };
  let [s, g] = comPw();
  s = esvazia(mira(s, 0, 'Raio', g));
  eq([lealdade(s, g), s.objects[g].damage], [2, 2], 'Raio: −2 de lealdade e 2 de dano marcado');
  [s, g] = comPw(); let p; [s, p] = poe(s, 0, 'Peste');
  s = esvazia(act(s, legais(s, 0, x => x.t === 'activate' && x.oid === p && (x.targets || []).some(t => t.oid === g))[0]));
  eq([lealdade(s, g), (s.objects[g].counters || {}).m1m1 || 0, s.objects[g].damage], [2, 2, 0], 'infectar: −2 de lealdade e dois −1/−1');
  [s, g] = comPw(); let v; [s, v] = poe(s, 0, 'Víbora');
  s = esvazia(act(s, legais(s, 0, x => x.t === 'activate' && x.oid === v && (x.targets || []).some(t => t.oid === g))[0]));
  assert.equal(s.objects[g].zone, 'graveyard', 'toque mortífero destrói');
});

test('CR 702.2b / 704.5h · toque mortífero de combate destrói o planeswalker-criatura atacado', () => {
  let s = mesa(); let g; [s, g] = poe(s, 1, 'Golem PW', 'battlefield', { counters: { loyalty: 4 } }); let v; [s, v] = poe(s, 0, 'Víbora');
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0);
  s = act(s, { t: 'attack', p: 0, attackers: [v], alvos: { [v]: g } });
  s = passaAte(s, x => ['combat_end', 'main2'].includes(x.turn.step) || (!!x.pending && x.pending.kind === 'blockers'));
  if (s.pending && s.pending.kind === 'blockers') s = act(s, { t: 'block', p: 1, blocks: [] });
  s = passaAte(s, x => ['combat_end', 'main2'].includes(x.turn.step));
  assert.equal(s.objects[g].zone, 'graveyard');
});
