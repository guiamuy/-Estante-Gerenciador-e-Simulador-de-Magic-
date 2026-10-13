// T-51 · CR5 · Cartas de preparação (Comprehensive Rules 722, com 601.2i e 704.5e).
// Texto da regra: .regras/cr-2026-09-25.txt. Carta exemplo com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge, clone
// de 13/10/2026): Landscape Painter // Vibrant Idea. As cartas "de teste" são scripts sintéticos que isolam a regra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, T, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const LP = 'Landscape Painter', VI = 'Vibrant Idea';
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => x.name === LP))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: ['U'], power: c.power, toughness: c.toughness };
for (const [n, k] of Object.entries({ Island: 'U', Mountain: 'R' })) C[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: '', colors: ['R'], ...extra }; };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = {
  // "{1}: This creature becomes prepared." · "{2}: This creature becomes unprepared." · prepare spell: Faísca Estudada {R}, instantânea: 1 de dano a qualquer alvo
  'Aprendiz': { name: 'Aprendiz', self: { preparo: true }, abilities: [
    { kind: 'activated', cost: { mana: '{1}' }, effects: [{ do: 'preparar' }] },
    { kind: 'activated', cost: { mana: '{2}' }, effects: [{ do: 'despreparar' }] }],
    back: { name: 'Faisca Estudada', types: ['instant'], mana: '{R}', effects: [{ do: 'damage', amount: 1, target: 'any' }] }, ...EX },
  // "At the beginning of your upkeep, if this creature isn't prepared, it becomes prepared." · prepare spell: Estudo {U}, feitiço: compre 1
  'Estudiosa': { name: 'Estudiosa', self: { preparo: true }, abilities: [{ kind: 'triggered', when: 'upkeep', condition: { preparada: false }, effects: [{ do: 'preparar' }] }],
    back: { name: 'Estudo', types: ['sorcery'], mana: '{U}', effects: [{ do: 'draw', amount: 1 }] }, ...EX },
  'Volta': { name: 'Volta', effects: [{ do: 'bounce', target: 'creature' }], ...EX },
  'Nega': { name: 'Nega', effects: [{ do: 'counter', target: 'spell' }], ...EX },
};
carta('Aprendiz', 'Creature — Human Wizard', { power: '1', toughness: '1' });
carta('Estudiosa', 'Creature — Human Wizard', { power: '1', toughness: '2', mana_cost: '{U}', colors: ['U'] });
carta('Volta', 'Instant', { mana_cost: '{U}', colors: ['U'] });
carta('Nega', 'Instant', { mana_cost: '{U}', colors: ['U'] });

const deckCom = extra => [{ name: 'Island', qty: 14, zone: 'main' }, { name: 'Mountain', qty: 10, zone: 'main' }, { name: 'Volta', qty: 4, zone: 'main' }, { name: 'Nega', qty: 4, zone: 'main' }, ...extra];
function mesa(seed = 1, extra = [{ name: LP, qty: 4, zone: 'main' }, { name: 'Aprendiz', qty: 4, zone: 'main' }, { name: 'Estudiosa', qty: 2, zone: 'main' }]) {
  const deck = deckCom(extra);
  const nomes = new Set(deck.map(d => d.name)), cards = Object.fromEntries(Object.entries(C).filter(([n]) => nomes.has(n)));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const pool = (s, p = 0) => Object.values(s.players[p].pool).reduce((a, b) => a + b, 0);
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const esvazia = s => { for (let i = 0; i < 30; i++) { s = passaAte(s, x => !x.stack.length || !!x.pending); if (!s.pending) return s; const os = legais(s, s.pending.p); if (!os.length) return s; s = act(s, os.find(a => a.t === 'pick') || os[0]); } return s; };
const conjura = (s, p, nome, filtro = () => true) => { let o; [s, o] = poe(s, p, nome, 'hand'); s = mana(s, p); const of = legais(s, p, a => a.t === 'cast' && a.oid === o && filtro(a)); assert.ok(of.length, `${nome}: conjurável`); return [esvazia(act(s, of[0])), o]; };
/** As cópias de preparação no exílio de `p` (objetos que não são cartas). */
const copias = (s, p = 0) => s.zones[p].exile.map(x => s.objects[x]).filter(o => o && o.copiaPreparoT);
const ativa = (s, oid, i) => esvazia(act(mana(s), legais(s, 0, a => a.t === 'activate' && a.oid === oid && (a.index || 0) === i)[0]));

test('CR 722.3a / 722.3c · "This creature enters prepared": Landscape Painter entra preparada e uma cópia de Vibrant Idea fica no exílio de quem controla, conjurável', () => {
  let s = mesa(); let lp; [s, lp] = conjura(s, 0, LP);
  const cs = copias(s);
  eq([s.objects[lp].zone, E.preparadaT(s, s.objects[lp]), cs.length, cs[0] && cs[0].name], ['battlefield', true, 1, VI]);
  assert.equal(legais(s, 0, a => a.t === 'cast' && a.oid === cs[0].oid).length, 1, 'a cópia é oferecida para conjurar');
});

test('CR 722.3c / 601.2i / 704.5e · conjurar a cópia ({4}{U}) desprepara a permanente; resolvida, a cópia deixa de existir (não vai ao cemitério)', () => {
  let s = mesa(); let lp; [s, lp] = conjura(s, 0, LP); s = mana(s);
  const cp = copias(s)[0].oid, mao = s.zones[0].hand.length, gy = s.zones[0].graveyard.length, antes = pool(s);
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === cp)[0]);
  eq([antes - pool(s), E.preparadaT(s, s.objects[lp]), s.objects[cp] && s.objects[cp].zone], [5, false, 'stack'], 'despreparou ao conjurar');
  s = esvazia(s);
  eq([s.zones[0].hand.length - mao, s.zones[0].graveyard.length - gy, !!s.objects[cp], copias(s).length], [2, 0, false, 0]);
});

test('CR 722.3c · a permanente que sai do campo leva a cópia junto: a cópia deixa de existir', () => {
  let s = mesa(); let lp; [s, lp] = conjura(s, 0, LP);
  const cp = copias(s)[0].oid;
  [s] = conjura(s, 0, 'Volta', a => a.targets && a.targets[0] && a.targets[0].oid === lp);
  eq([s.objects[lp].zone, !!s.objects[cp], copias(s).length], ['hand', false, 0]);
});

test('CR 722.3a · "becomes prepared" de novo depois de conjurar cria outra cópia; já preparada, não cria uma segunda', () => {
  let s = mesa(); let a; [s, a] = conjura(s, 0, 'Aprendiz');
  eq([E.preparadaT(s, s.objects[a]), copias(s).length], [false, 0], 'não entra preparada');
  s = ativa(s, a, 0);
  eq([E.preparadaT(s, s.objects[a]), copias(s).length, copias(s)[0].name], [true, 1, 'Faisca Estudada']);
  s = ativa(s, a, 0);
  eq(copias(s).length, 1, 'já preparada: nada');
});

test('CR 722.3b · "becomes unprepared": perde a designação e a cópia deixa de existir', () => {
  let s = mesa(); let a; [s, a] = conjura(s, 0, 'Aprendiz'); s = ativa(s, a, 0);
  s = ativa(s, a, 1);
  eq([E.preparadaT(s, s.objects[a]), copias(s).length], [false, 0]);
});

test('CR 722.3c / 704.5e · a cópia conjurada e anulada também deixa de existir', () => {
  let s = mesa(); let a; [s, a] = conjura(s, 0, 'Aprendiz'); s = ativa(s, a, 0); s = mana(s);
  const cp = copias(s)[0].oid;
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === cp)[0]);
  s = act(s, { t: 'pass', p: 0 }); // B recebe prioridade
  let n; [s, n] = poe(s, 1, 'Nega', 'hand'); s = mana(s, 1);
  s = esvazia(act(s, legais(s, 1, x => x.t === 'cast' && x.oid === n && (x.targets || []).some(t => t.oid === cp))[0]));
  eq([!!s.objects[cp], s.zones[0].graveyard.some(x => (s.objects[x] || {}).name === 'Faisca Estudada'), E.preparadaT(s, s.objects[a])], [false, false, false]);
});

test('CR 722.4 / 722.2c · na mão e no grimório a carta só tem as características normais: é uma carta só, com o nome e o tipo da criatura', () => {
  let s = mesa(); let lp; [s, lp] = poe(s, 0, LP, 'hand');
  const o = s.objects[lp];
  eq([o.name, E.tiposDe(s, o)], [LP, ['creature']]);
  eq(legais(s, 0, a => a.t === 'cast' && a.oid === lp && a.face != null).length, 0, 'não há como conjurar a mágica de preparação da mão (722.3)');
});

test('CR 722.3a · "if this creature is not prepared, it becomes prepared": a condição olha a designação', () => {
  let s = mesa(); let e; [s, e] = conjura(s, 0, 'Estudiosa');
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  eq([E.preparadaT(s, s.objects[e]), copias(s).length], [true, 1], 'na manutenção, não estava preparada: ficou');
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  eq(copias(s).length, 1, 'já preparada: a condição não vale, nada de segunda cópia');
});

test('Registro · "<permanente> está preparada" e, ao conjurar a cópia, "<permanente> deixou de estar preparada"', () => {
  let s = mesa(); let a; [s, a] = conjura(s, 0, 'Aprendiz'); s = mana(s);
  let t = act(s, legais(s, 0, x => x.t === 'activate' && x.oid === a && (x.index || 0) === 0)[0]), linhas = [];
  for (let i = 0; i < 6 && t.stack.length; i++) { const pa = { t: 'pass', p: t.turn.priority }, r = E.apply(t, pa); linhas = linhas.concat(T.describe(t, pa, r.events, r.state).map(String)); t = r.state; }
  assert.ok(linhas.some(l => /Aprendiz está preparada \(pode conjurar uma cópia de Faisca Estudada\)/.test(l)), JSON.stringify(linhas));
});

test('Validador · self.preparo pede a mágica de preparação (back instantânea ou feitiço, com custo)', () => {
  eq(SC.validateScript(SCRIPTS.Aprendiz), []);
  assert.ok(SC.validateScript({ name: 'X', self: { preparo: true }, ...EX }).some(e => /preparação/.test(e)));
  assert.ok(SC.validateScript({ name: 'X', self: { preparo: true }, back: { name: 'Y', types: ['creature'], power: 1, toughness: 1 }, ...EX }).some(e => /preparação/.test(e)));
  assert.ok(SC.validateScript({ name: 'X', self: { preparo: true }, back: { name: 'Y', types: ['instant'], effects: [{ do: 'draw', amount: 1 }] }, ...EX }).some(e => /preparação/.test(e)), 'sem custo');
});

test('Estado · partida sem carta de preparação não guarda designação', () => {
  let s = mesa(3, []);
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  assert.equal(s.preparadasT, undefined); assert.equal(s.preparoEvT, undefined);
});

test('CR 722 · passeio aleatório com cartas de preparação: nada oferecido é recusado, e cópias são conjuradas', () => {
  let conjuradas = 0;
  for (let seed = 1; seed <= 4; seed++) {
    let s = mesa(seed), r = seed * 15485863;
    for (let i = 0; i < 300 && s.status !== 'over'; i++) {
      const p = s.pending ? s.pending.p : s.turn.priority;
      if (i % 6 === 0 && !s.pending) s = mana(s, p, 3);
      const acoes = E.legalActions(s, p).filter(a => a.t !== 'concede');
      assert.ok(acoes.length, `semente ${seed}, passo ${i}: sem ação`);
      r = (r * 1103515245 + 12345) & 0x7fffffff;
      const cop = acoes.filter(a => a.t === 'cast' && (s.objects[a.oid] || {}).copiaPreparoT), pref = acoes.filter(a => a.t === 'cast' || a.t === 'activate');
      const a = cop.length && r % 2 ? cop[r % cop.length] : pref.length && r % 3 ? pref[r % pref.length] : acoes[r % acoes.length];
      if (cop.includes(a)) conjuradas++;
      s = E.apply(s, a).state;
    }
  }
  assert.ok(conjuradas > 0, 'alguma cópia foi conjurada');
});
