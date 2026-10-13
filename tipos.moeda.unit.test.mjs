// T-65 · CR5 · Jogar uma moeda (Comprehensive Rules 705). Texto da regra: .regras/cr-2026-09-25.txt. Cartas exemplo com o texto oficial
// de .listas/oficiais-tipos.json (Oracle do Forge, clone de 13/10/2026): Stitch in Time, Winter Sky, Wild Wurm, Skyclaw Thrash e Crazed
// Firecat. As cartas "de teste" são scripts sintéticos que isolam a regra. O acaso sai da semente da partida (s.rng): a mesma semente dá o
// mesmo lance; `fixa` (705.3) força o resultado nos testes de cada ramo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, T, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-tipos.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Stitch in Time', 'Winter Sky', 'Wild Wurm', 'Skyclaw Thrash', 'Crazed Firecat'];
const C = {};
for (const c of OF.filter(x => NOMES.includes(x.name)))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [...new Set(c.mana_cost.match(/[WUBRG]/g) || [])], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) };
for (const [n, k] of Object.entries({ Mountain: 'R', Island: 'U' })) C[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
const SCRIPTS = {
  // "Flip a coin. If you win the flip, you gain 5 life. If you lose the flip, you lose 1 life." (705.2), com o resultado forçado (705.3)
  'Ganha': { name: 'Ganha', effects: [{ do: 'moeda', fixa: 'ganha' }, { do: 'gain', amount: 5, onlyIf: 'ganhou-moeda' }, { do: 'lose', amount: 1, target: 'self', onlyIf: 'perdeu-moeda' }], ...EX },
  'Perde': { name: 'Perde', effects: [{ do: 'moeda', fixa: 'perde' }, { do: 'gain', amount: 5, onlyIf: 'ganhou-moeda' }, { do: 'lose', amount: 1, target: 'self', onlyIf: 'perdeu-moeda' }], ...EX },
  'Aposta': { name: 'Aposta', effects: [{ do: 'moeda' }, { do: 'gain', amount: 5, onlyIf: 'ganhou-moeda' }, { do: 'lose', amount: 1, target: 'self', onlyIf: 'perdeu-moeda' }], ...EX },
  // "Flip a coin. If it comes up heads, draw a card. If it comes up tails, you gain 2 life." (705.2: ninguém ganha nem perde)
  'Cara': { name: 'Cara', effects: [{ do: 'moeda', resultado: true, fixa: 'cara' }, { do: 'draw', amount: 1, onlyIf: 'deu-cara' }, { do: 'gain', amount: 2, onlyIf: 'deu-coroa' }], ...EX },
  'Coroa': { name: 'Coroa', effects: [{ do: 'moeda', resultado: true, fixa: 'coroa' }, { do: 'draw', amount: 1, onlyIf: 'deu-cara' }, { do: 'gain', amount: 2, onlyIf: 'deu-coroa' }], ...EX },
};
for (const n of Object.keys(SCRIPTS)) carta(n, 'Sorcery');

function mesa(seed = 1) {
  const deck = [...Object.keys(C).filter(n => !['Mountain', 'Island'].includes(n)).map(name => ({ name, qty: 2, zone: 'main' })), { name: 'Mountain', qty: 12, zone: 'main' }, { name: 'Island', qty: 10, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, first: 0, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += 9; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const esvazia = s => { for (let i = 0; i < 30; i++) { s = passaAte(s, x => !x.stack.length || !!x.pending); if (!s.pending) return s; const os = legais(s, s.pending.p); if (!os.length) return s; s = act(s, os.find(a => a.t === 'pick') || os[0]); } return s; };
const conjura = (s, nome, p = 0) => { let m; [s, m] = poe(s, p, nome, 'hand'); s = mana(s, p); const a = legais(s, p, x => x.t === 'cast' && x.oid === m)[0]; assert.ok(a, `conjurar ${nome}`); return [esvazia(act(s, a)), m]; };
const lances = r => r.events.filter(e => e.kind === 'effect' && e.do === 'moeda');

test('CR 705.2 · ganhar o lance: o efeito "if you win the flip" acontece e o "if you lose" não; perder, o contrário', () => {
  let s = mesa(); const v = s.players[0].life;
  let [x] = conjura(s, 'Ganha'); eq(x.players[0].life - v, 5);
  [x] = conjura(s, 'Perde'); eq(x.players[0].life - v, -1);
});

test('CR 705.2 · "if it comes up heads/tails": o resultado decide; ninguém ganha nem perde o lance', () => {
  for (const [nome, esperado] of [['Cara', [1, 0]], ['Coroa', [0, 2]]]) {
    let s = mesa(); let m; [s, m] = poe(s, 0, nome, 'hand'); s = mana(s);
    const h = s.zones[0].hand.length - 1, v = s.players[0].life;
    const x = esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === m)[0]));
    eq([x.zones[0].hand.length - h, x.players[0].life - v], esperado, nome);
  }
  let s = mesa();
  let m; [s, m] = poe(s, 0, 'Cara', 'hand'); s = mana(s);
  const r = E.apply(s, legais(s, 0, a => a.t === 'cast' && a.oid === m)[0]); let y = r.state; const evs = [];
  for (let i = 0; i < 4 && y.stack.length; i++) { const r2 = E.apply(y, { t: 'pass', p: y.turn.priority }); evs.push(...r2.events); y = r2.state; }
  const l = evs.filter(e => e.kind === 'effect' && e.do === 'moeda');
  eq(l.map(e => [e.resultado, e.ganhou]), [['cara', null]], 'o lance só de resultado não tem ganhador');
});

test('CR 705.1 / 705.2 · sem resultado forçado, o lance sai do acaso da partida: a mesma semente dá o mesmo resultado; sementes diferentes dão os dois', () => {
  const vidas = new Set(), porSemente = {};
  for (let seed = 1; seed <= 24; seed++) {
    const s = mesa(seed); const v = s.players[0].life;
    const [x] = conjura(s, 'Aposta'); const d = x.players[0].life - v;
    assert.ok(d === 5 || d === -1, `semente ${seed}: ${d}`); vidas.add(d); porSemente[seed] = d;
  }
  eq([...vidas].sort((a, b) => a - b), [-1, 5], 'os dois resultados aparecem');
  const [y] = conjura(mesa(7), 'Aposta'); eq(y.players[0].life - mesa(7).players[0].life, porSemente[7], 'determinístico');
});

test('CR 705.2 · Stitch in Time: ganhando o lance, um turno extra depois deste; perdendo, nada', () => {
  let ganhou = 0, perdeu = 0;
  for (let seed = 1; seed <= 16 && !(ganhou && perdeu); seed++) {
    const s = mesa(seed); let m; let y; [y, m] = poe(s, 0, 'Stitch in Time', 'hand'); y = mana(y);
    const r = E.apply(y, legais(y, 0, a => a.t === 'cast' && a.oid === m)[0]); y = r.state; const evs = [];
    for (let i = 0; i < 4 && y.stack.length; i++) { const r2 = E.apply(y, { t: 'pass', p: y.turn.priority }); evs.push(...r2.events); y = r2.state; }
    const l = evs.find(e => e.kind === 'effect' && e.do === 'moeda'); assert.ok(l, 'jogou a moeda');
    const extras = (y.turnosExtras || []).filter(q => q === 0).length;
    if (l.ganhou) { ganhou++; eq(extras, 1, 'turno extra'); } else { perdeu++; eq(extras, 0); }
  }
  assert.ok(ganhou && perdeu, 'os dois lados exercitados');
});

test('CR 705.2 · Winter Sky: ganhando, 1 de dano em cada criatura e cada jogador; perdendo, cada jogador compra uma carta', () => {
  const vistos = new Set();
  for (let seed = 1; seed <= 16 && vistos.size < 2; seed++) {
    let s = mesa(seed); let w; [s, w] = poe(s, 1, 'Wild Wurm', 'battlefield');
    const vA = s.players[0].life, vB = s.players[1].life, hB = s.zones[1].hand.length;
    const [x] = conjura(s, 'Winter Sky');
    const dano = x.players[0].life === vA - 1 && x.players[1].life === vB - 1 && (x.objects[w].damage || 0) === 1;
    const compra = x.players[1].life === vB && x.zones[1].hand.length === hB + 1;
    assert.ok(dano !== compra, `semente ${seed}: um ramo só`); vistos.add(dano ? 'dano' : 'compra');
  }
  eq([...vistos].sort(), ['compra', 'dano']);
});

test('CR 705.2 · Wild Wurm: ao entrar, perdendo o lance volta para a mão; ganhando, fica', () => {
  const vistos = new Set();
  for (let seed = 1; seed <= 16 && vistos.size < 2; seed++) {
    const [x, w] = conjura(mesa(seed), 'Wild Wurm');
    vistos.add(x.objects[w] && x.objects[w].zone === 'battlefield' ? 'fica' : (x.zones[0].hand.some(o => x.objects[o].name === 'Wild Wurm') ? 'volta' : '?'));
  }
  eq([...vistos].sort(), ['fica', 'volta']);
});

test('CR 705.2 · Crazed Firecat: joga até perder; um marcador +1/+1 por lance ganho', () => {
  const vistos = new Set();
  for (let seed = 1; seed <= 20; seed++) {
    let s = mesa(seed); let m; [s, m] = poe(s, 0, 'Crazed Firecat', 'hand'); s = mana(s);
    const r = E.apply(s, legais(s, 0, a => a.t === 'cast' && a.oid === m)[0]); let y = r.state; const evs = [];
    for (let i = 0; i < 8 && (y.stack.length || y.pending); i++) { const r2 = E.apply(y, y.pending ? legais(y, y.pending.p)[0] : { t: 'pass', p: y.turn.priority }); evs.push(...r2.events); y = r2.state; }
    const l = evs.filter(e => e.kind === 'effect' && e.do === 'moeda');
    assert.ok(l.length >= 1 && l.every((e, i) => e.ganhou === (i < l.length - 1)), `semente ${seed}: ganha, ganha, …, perde`);
    eq(((y.objects[m].counters || {}).p1p1 || 0), l.length - 1, `semente ${seed}`); vistos.add(l.length - 1);
  }
  assert.ok(vistos.has(0) && [...vistos].some(n => n >= 1), 'com e sem lance ganho');
});

test('CR 705.2 · Skyclaw Thrash: ao atacar, ganhando o lance fica 5/5 com voar até o fim do turno', () => {
  const vistos = new Set();
  for (let seed = 1; seed <= 16 && vistos.size < 2; seed++) {
    let s = mesa(seed); let k; [s, k] = poe(s, 0, 'Skyclaw Thrash', 'battlefield'); s = J(s); s.objects[k].sick = false;
    s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0);
    s = act(s, { t: 'attack', p: 0, attackers: [k] });
    s = passaAte(s, x => x.stack.length === 0 && !x.pending && (x.turn.step === 'declare-blockers' || x.turn.step === 'blockers' || x.turn.step === 'combat-damage' || x.turn.step === 'damage' || x.turn.step === 'end-combat' || x.turn.step === 'main2'), 200);
    const st = E.stats(s, s.objects[k]), voa = E.hasKeyword(s, s.objects[k], 'flying');
    if (st.power === 5) { assert.ok(voa); vistos.add('ganhou'); } else { eq([st.power, voa], [4, false]); vistos.add('perdeu'); }
  }
  eq([...vistos].sort(), ['ganhou', 'perdeu']);
});

test('Validador, frases e registro · a moeda e as condições do lance', () => {
  for (const n of Object.keys(SCRIPTS)) eq(SC.validateScript(SCRIPTS[n]), [], n);
  assert.ok(SC.validateScript({ ...SCRIPTS.Ganha, effects: [{ do: 'moeda', fixa: 'sempre' }] }).some(e => /moeda/.test(e)));
  assert.ok(SC.validateScript({ ...SCRIPTS.Ganha, effects: [{ do: 'moeda', resultado: true }, { do: 'gain', amount: 1, onlyIf: 'ganhou-moeda' }] }).some(e => /moeda/.test(e)), 'lance só de resultado não tem "ganhou"');
  assert.match(T.descreveEfeitos(SCRIPTS.Ganha.effects), /jogue uma moeda/);
  assert.match(T.descreveEfeitos(SCRIPTS.Ganha.effects), /se ganhar o lance/);
  let s = mesa(); let m; [s, m] = poe(s, 0, 'Ganha', 'hand'); s = mana(s);
  let y = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === m)[0]);
  const r = E.apply(y, { t: 'pass', p: 0 }); let r2 = E.apply(r.state, { t: 'pass', p: 1 });
  const linhas = T.describe(r.state, { t: 'pass', p: 1 }, r2.events, r2.state).join(' | ');
  assert.match(linhas, /moeda: cara · ganhou/, linhas);
});
