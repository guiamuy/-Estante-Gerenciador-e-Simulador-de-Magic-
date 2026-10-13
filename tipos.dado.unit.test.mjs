// T-66 · CR5 · Rolar um dado (Comprehensive Rules 706). Texto da regra: .regras/cr-2026-09-25.txt. Cartas exemplo com o texto oficial de
// .listas/oficiais-tipos.json (Oracle do Forge, clone de 13/10/2026): Djinni Windseer, Sylvan Shepherd, Swarming Goblins e Contact Other
// Plane. As cartas "de teste" são scripts sintéticos que isolam a regra. O acaso sai da semente da partida (s.rng).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, T, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-tipos.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Djinni Windseer', 'Sylvan Shepherd', 'Swarming Goblins', 'Contact Other Plane'];
const C = {};
for (const c of OF.filter(x => NOMES.includes(x.name)))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: c.name === 'Djinni Windseer' ? ['Flying'] : c.name === 'Sylvan Shepherd' ? ['Vigilance'] : [], oracle_text: c.oracle_text, colors: [...new Set(c.mana_cost.match(/[WUBRG]/g) || [])], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) };
for (const [n, k] of Object.entries({ Forest: 'G', Island: 'U', Mountain: 'R' })) C[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
const SCRIPTS = {
  // "Roll a d6. You gain life equal to the result." (706.4: sem tabela)
  'Vida no Dado': { name: 'Vida no Dado', effects: [{ do: 'dado', lados: 6 }, { do: 'gain', amount: { per: 'resultado-do-dado' } }], ...EX },
  // "Roll a d4 and add 10. 1—12 | You gain 1 life. 13+ | You gain 100 life." (706.2: o modificador entra no resultado)
  'Dado Mais Dez': { name: 'Dado Mais Dez', effects: [{ do: 'dado', lados: 4, mais: 10 }, { do: 'gain', amount: 1, faixaDoDado: [1, 12] }, { do: 'gain', amount: 100, faixaDoDado: [13, null] }], ...EX },
  // "Roll two d20 and ignore the lower roll. You gain life equal to the result." (706.6)
  'Vantagem': { name: 'Vantagem', effects: [{ do: 'dado', lados: 20, quantos: 2, ignora: 'menor' }, { do: 'gain', amount: { per: 'resultado-do-dado' } }], ...EX },
  // "Roll two d6. If you rolled doubles, draw a card." (706.5)
  'Duplos': { name: 'Duplos', effects: [{ do: 'dado', lados: 6, quantos: 2 }, { do: 'draw', amount: 1, onlyIf: 'dado-duplos' }], ...EX },
};
carta('Vida no Dado', 'Sorcery'); carta('Dado Mais Dez', 'Sorcery'); carta('Vantagem', 'Sorcery'); carta('Duplos', 'Sorcery');

function mesa(seed = 1) {
  const deck = [...Object.keys(C).filter(n => !['Forest', 'Island', 'Mountain'].includes(n)).map(name => ({ name, qty: 2, zone: 'main' })), { name: 'Forest', qty: 8, zone: 'main' }, { name: 'Island', qty: 8, zone: 'main' }, { name: 'Mountain', qty: 8, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, first: 0, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += 9; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
/** conjura e resolve tudo, juntando os eventos (as escolhas pendentes vão pela primeira opção). */
function joga(s, nome, p = 0) {
  let m; [s, m] = poe(s, p, nome, 'hand'); s = mana(s, p);
  let r = E.apply(s, legais(s, p, a => a.t === 'cast' && a.oid === m)[0]); const evs = [...r.events]; let y = r.state;
  const escolhas = [];
  for (let i = 0; i < 40 && (y.stack.length || y.pending); i++) { if (y.pending) escolhas.push(y.pending.label || y.pending.kind); r = E.apply(y, y.pending ? legais(y, y.pending.p)[0] : { t: 'pass', p: y.turn.priority }); evs.push(...r.events); y = r.state; }
  return { s: y, m, evs, escolhas, dados: evs.filter(e => e.kind === 'effect' && e.do === 'dado') };
}

test('CR 706.1 / 706.4 · rolar um d6 sem tabela: o resultado (1 a 6) diz quanto se ganha; sai da semente da partida', () => {
  const vistos = new Set();
  for (let seed = 1; seed <= 30; seed++) {
    const s0 = mesa(seed); const v = s0.players[0].life; const { s, dados } = joga(s0, 'Vida no Dado');
    eq(dados.length, 1); const d = dados[0];
    assert.ok(d.natural >= 1 && d.natural <= 6 && d.resultado === d.natural, JSON.stringify(d));
    eq(s.players[0].life - v, d.resultado); vistos.add(d.resultado);
  }
  assert.ok(vistos.size >= 4, 'resultados variados: ' + [...vistos]);
  eq(joga(mesa(9), 'Vida no Dado').dados[0].resultado, joga(mesa(9), 'Vida no Dado').dados[0].resultado, 'a mesma semente, o mesmo dado');
});

test('CR 706.2 / 706.3a · o modificador entra no resultado (natural 1 a 4, resultado 11 a 14) e a tabela usa o resultado: "13+"', () => {
  const faixas = new Set();
  for (let seed = 1; seed <= 24; seed++) {
    const s0 = mesa(seed); const v = s0.players[0].life; const { s, dados } = joga(s0, 'Dado Mais Dez'); const d = dados[0];
    eq(d.resultado, d.natural + 10);
    eq(s.players[0].life - v, d.resultado >= 13 ? 100 : 1, `semente ${seed}: ${d.resultado}`); faixas.add(d.resultado >= 13);
  }
  eq([...faixas].sort(), [false, true]);
});

test('CR 706.6 · "roll two d20 and ignore the lower roll": o resultado é o maior; o menor é ignorado', () => {
  for (let seed = 1; seed <= 12; seed++) {
    const s0 = mesa(seed); const v = s0.players[0].life; const { s, dados } = joga(s0, 'Vantagem'); const d = dados[0];
    eq(d.rolagens.length, 2); eq(d.resultado, Math.max(...d.rolagens)); eq(d.ignorada, Math.min(...d.rolagens));
    eq(s.players[0].life - v, d.resultado);
  }
});

test('CR 706.5 · "if you rolled doubles": compra só quando os dois dados dão o mesmo número', () => {
  const vistos = new Set();
  for (let seed = 1; seed <= 60 && vistos.size < 2; seed++) {
    const s0 = mesa(seed); let m; let x; [x, m] = poe(s0, 0, 'Duplos', 'hand'); const h = x.zones[0].hand.length - 1;
    const { s, dados } = joga(s0, 'Duplos'); const d = dados[0]; const duplos = d.rolagens[0] === d.rolagens[1];
    eq(s.zones[0].hand.length - h, duplos ? 1 : 0, `semente ${seed}: ${d.rolagens}`); vistos.add(duplos);
  }
  eq([...vistos].sort(), [false, true]);
});

test('CR 706.3 · Sylvan Shepherd: ao atacar, d20 — 1–9 ganha 1, 10–19 ganha 2, 20 ganha 5', () => {
  for (let seed = 1; seed <= 10; seed++) {
    let s = mesa(seed); let k; [s, k] = poe(s, 0, 'Sylvan Shepherd', 'battlefield'); s = J(s); s.objects[k].sick = false;
    s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0);
    let r = E.apply(s, { t: 'attack', p: 0, attackers: [k] }); const evs = [...r.events]; let y = r.state; const v = s.players[0].life;
    for (let i = 0; i < 12 && !evs.some(e => e.kind === 'effect' && e.do === 'gain'); i++) { r = E.apply(y, y.pending ? legais(y, y.pending.p)[0] : { t: 'pass', p: y.turn.priority }); evs.push(...r.events); y = r.state; }
    const d = evs.find(e => e.kind === 'effect' && e.do === 'dado'); assert.ok(d, `semente ${seed}: rolou`);
    eq(y.players[0].life - v, d.resultado === 20 ? 5 : d.resultado >= 10 ? 2 : 1, `semente ${seed}: ${d.resultado}`);
  }
});

test('CR 706.3 · Swarming Goblins: ao entrar, d20 — 1, 2 ou 3 Goblins 1/1 vermelhos pela faixa', () => {
  for (let seed = 1; seed <= 10; seed++) {
    const { s, dados } = joga(mesa(seed), 'Swarming Goblins'); const d = dados[0];
    const gobs = s.zones[0].battlefield.map(o => s.objects[o]).filter(o => o.token && o.name === 'Goblin');
    eq(gobs.length, d.resultado === 20 ? 3 : d.resultado >= 10 ? 2 : 1, `semente ${seed}: ${d.resultado}`);
  }
});

test('CR 706.3 / 706.3b · Contact Other Plane e Djinni Windseer: a linha da tabela inteira acontece (vidência e compra), depois de uma decisão também', () => {
  const linhas = new Set();
  for (let seed = 1; seed <= 16; seed++) {
    const s0 = mesa(seed); let m; let x; [x, m] = poe(s0, 0, 'Contact Other Plane', 'hand'); const h = x.zones[0].hand.length - 1;
    const { s, dados, escolhas } = joga(s0, 'Contact Other Plane'); const d = dados[0];
    const scry = escolhas.filter(e => e === 'scry').length;
    eq([s.zones[0].hand.length - h, scry > 0], d.resultado === 20 ? [3, true] : d.resultado >= 10 ? [2, true] : [2, false], `semente ${seed}: ${d.resultado}`);
    linhas.add(d.resultado >= 10);
    const dj = joga(mesa(seed), 'Djinni Windseer'); assert.ok(dj.dados.length === 1, 'o Djinni rola ao entrar');
  }
  eq([...linhas].sort(), [false, true]);
});

test('Validador, frases e registro · o dado, a faixa e o resultado', () => {
  for (const n of Object.keys(SCRIPTS)) eq(SC.validateScript(SCRIPTS[n]), [], n);
  const ruim = efs => SC.validateScript({ name: 'X', effects: efs, ...EX });
  assert.ok(ruim([{ do: 'dado', lados: 1 }]).some(e => /dado/.test(e)), 'lados inteiro, 2 ou mais');
  assert.ok(ruim([{ do: 'dado', lados: 6, quantos: 3 }]).some(e => /dado/.test(e)), 'um ou dois dados');
  assert.ok(ruim([{ do: 'gain', amount: 1, faixaDoDado: [1, 9] }]).some(e => /dado/.test(e)), 'faixa sem dado antes');
  assert.ok(ruim([{ do: 'dado', lados: 20 }, { do: 'gain', amount: 1, faixaDoDado: [9, 1] }]).some(e => /dado/.test(e)), 'faixa ao contrário');
  assert.match(T.descreveEfeitos(SCRIPTS['Dado Mais Dez'].effects), /role um d4 e some 10/);
  assert.match(T.descreveEfeitos(SCRIPTS['Dado Mais Dez'].effects), /se o dado der 13 ou mais/);
  const s0 = mesa(3); let m; let s; [s, m] = poe(s0, 0, 'Vantagem', 'hand'); s = mana(s);
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === m)[0]); const r = E.apply(s, { t: 'pass', p: 0 }); const r2 = E.apply(r.state, { t: 'pass', p: 1 });
  const L = T.describe(r.state, { t: 'pass', p: 1 }, r2.events, r2.state).join(' | ');
  assert.match(L, /rolou 2d20 \(\d+ e \d+, ignorou o \d+\): \d+/, L);
});

/* ---------------- T-67 · correções da auditoria independente (T-65/T-66) ---------------- */
const EXA = { example: { action: 'etb', target: 'none', expect: { attached: false } } };
SCRIPTS['Oraculo Dado'] = { name: 'Oraculo Dado', abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'dado', lados: 20 }, { do: 'scry', amount: 1, faixaDoDado: [1, 20] }, { do: 'draw', amount: 1, faixaDoDado: [1, 20] }] }], ...EXA };
SCRIPTS['Oraculo Valor'] = { name: 'Oraculo Valor', abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'dado', lados: 6 }, { do: 'scry', amount: 1 }, { do: 'gain', amount: { per: 'resultado-do-dado' } }] }], ...EXA };
SCRIPTS['Vidente Velho'] = { name: 'Vidente Velho', abilities: [
  { kind: 'triggered', when: 'etb', optional: true, effects: [{ do: 'dado', lados: 20, mais: 100 }, { do: 'gain', amount: 1 }] },
  { kind: 'triggered', when: 'attacks', effects: [{ do: 'dado', lados: 6 }, { do: 'scry', amount: 1 }, { do: 'gain', amount: { per: 'resultado-do-dado' } }] }], ...EXA };
for (const n of ['Oraculo Dado', 'Oraculo Valor', 'Vidente Velho']) carta(n, 'Creature — Human', { power: '2', toughness: '2' });

test('CR 706.3b / 706.4 · gatilho com dado e uma escolha no meio (vidência): a linha da tabela e o "igual ao resultado" depois da escolha usam o dado desta resolução', () => {
  for (let seed = 1; seed <= 6; seed++) {
    const s0 = mesa(seed); let m, x; [x, m] = poe(s0, 0, 'Oraculo Dado', 'hand'); const h = x.zones[0].hand.length - 1;
    const r = joga(s0, 'Oraculo Dado'); assert.ok(r.escolhas.includes('scry'), 'houve a vidência');
    eq(r.s.zones[0].hand.length - h, 1, `semente ${seed}: compra 1 depois da vidência`);
    const v = s0.players[0].life; const r2 = joga(s0, 'Oraculo Valor');
    eq(r2.s.players[0].life - v, r2.dados[0].resultado, `semente ${seed}: ganha o d6`);
  }
});

test('CR 400.7 · o dado de uma resolução antiga não vaza: o gatilho de ataque retomado depois da vidência usa o d6 dele, não o d20+100 da entrada', () => {
  let s = mesa(8); let m; [s, m] = poe(s, 0, 'Vidente Velho', 'hand'); s = mana(s);
  let r = E.apply(s, legais(s, 0, a => a.t === 'cast' && a.oid === m)[0]); let y = r.state;
  for (let i = 0; i < 40 && (y.stack.length || y.pending); i++) y = E.apply(y, y.pending ? legais(y, y.pending.p)[0] : { t: 'pass', p: y.turn.priority }).state;
  y = J(y); y.objects[m].sick = false;
  y = passaAte(y, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0, 800);
  const v = y.players[0].life; r = E.apply(y, { t: 'attack', p: 0, attackers: [m] }); const evs = [...r.events]; y = r.state;
  for (let i = 0; i < 20 && !evs.some(e => e.kind === 'effect' && e.do === 'gain'); i++) { r = E.apply(y, y.pending ? legais(y, y.pending.p)[0] : { t: 'pass', p: y.turn.priority }); evs.push(...r.events); y = r.state; }
  const d6 = evs.filter(e => e.kind === 'effect' && e.do === 'dado').pop();
  eq([d6.lados, y.players[0].life - v], [6, d6.resultado]);
});

test('CR 706.5 / 706.6 / 706.4 · validador: "duplos" com rolagem ignorada, "duplos" no per: se sem dado e o resultado único de dois dados sem ignorar são recusados; o motor não conta duplos com a ignorada', () => {
  const ruim = efs => SC.validateScript({ name: 'X', effects: efs, ...EX });
  assert.ok(ruim([{ do: 'dado', lados: 2, quantos: 2, ignora: 'menor' }, { do: 'draw', amount: 1, onlyIf: 'dado-duplos' }]).some(e => /duplos/.test(e)));
  assert.ok(ruim([{ do: 'gain', amount: { per: 'se', se: 'dado-duplos', sim: 2, nao: 1 } }]).some(e => /dado/.test(e)));
  assert.ok(ruim([{ do: 'dado', lados: 6, quantos: 2 }, { do: 'gain', amount: { per: 'resultado-do-dado' } }]).some(e => /dois dados/.test(e)));
  assert.ok(ruim([{ do: 'dado', lados: 6, quantos: 2 }, { do: 'gain', amount: 1, faixaDoDado: [1, 3] }]).some(e => /dois dados/.test(e)));
  const s = J(mesa(1)); const src = { oid: 'zz', name: 'Teste', controller: 0, ability: true };
  let achou = false;
  for (let i = 0; i < 40 && !achou; i++) { const ev = []; E.applyEffect(s, src, { do: 'dado', lados: 2, quantos: 2, ignora: 'menor' }, null, ev); if (ev[0].rolagens[0] === ev[0].rolagens[1]) { achou = true; eq(src.dadoT.duplos, false, '1 e 1 com um ignorado: não são duplos'); } }
  assert.ok(achou, 'apareceu um par igual');
});
