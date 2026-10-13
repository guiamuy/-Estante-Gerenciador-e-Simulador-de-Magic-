// T-48 · CR5 · Dia e noite (Comprehensive Rules 702.145, 731 e 502.2).
// Texto da regra: .regras/cr-2026-09-25.txt. Carta exemplo com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge, clone
// de 13/10/2026): Tavern Ruffian // Tavern Smasher. As cartas "de teste" são scripts sintéticos que isolam a regra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, T, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => x.name === 'Tavern Ruffian'))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: ['Daybound'], oracle_text: c.oracle_text, colors: ['R'], power: c.power, toughness: c.toughness };
for (const [n, k] of Object.entries({ Mountain: 'R' })) C[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: '', colors: ['R'], ...extra }; };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = {
  'Faisca': { name: 'Faisca', effects: [{ do: 'damage', amount: 1, target: 'player' }], ...EX },
  // dupla face de teste: daybound na frente; o verso ganha 3 de vida "quando transforma" (701.27e) e tem nightbound
  'Totem Lunar': { name: 'Totem Lunar', self: { duplaFace: true }, back: { name: 'Fera Lunar', types: ['creature'], subtypes: ['Werewolf'], colors: ['R'], power: 4, toughness: 4, keywords: ['Nightbound'] }, ...EX },
  'Lobo Teste': { name: 'Lobo Teste', self: { duplaFace: true }, abilities: [{ kind: 'activated', cost: { mana: '{1}' }, effects: [{ do: 'transformar' }] }],
    back: { name: 'Lobo Noturno', types: ['creature'], subtypes: ['Werewolf'], colors: ['R'], power: 5, toughness: 5, keywords: ['Nightbound'],
      abilities: [{ kind: 'triggered', when: 'transforms', effects: [{ do: 'gain', amount: 3 }] }] }, ...EX },
};
carta('Faisca', 'Instant');
carta('Lobo Teste', 'Creature — Human Werewolf', { power: '1', toughness: '1', keywords: ['Daybound'], mana_cost: '{1}{R}', cmc: 2 });
carta('Lua Cheia', 'Creature — Wolf', { power: '2', toughness: '2', keywords: ['Nightbound'] }); // só nightbound (702.145g), sem dupla face
carta('Totem Lunar', 'Artifact', { keywords: ['Daybound'], mana_cost: '{2}', cmc: 2 }); // frente que não é criatura; o verso é (T-50)
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2', mana_cost: '{1}{R}', cmc: 2 });

const TR = 'Tavern Ruffian';
const deckCom = extra => [{ name: 'Mountain', qty: 24, zone: 'main' }, { name: 'Faisca', qty: 10, zone: 'main' }, { name: 'Urso', qty: 10, zone: 'main' }, ...extra];
function mesa(seed = 1, extra = [{ name: TR, qty: 4, zone: 'main' }, { name: 'Lobo Teste', qty: 4, zone: 'main' }, { name: 'Lua Cheia', qty: 2, zone: 'main' }, { name: 'Totem Lunar', qty: 2, zone: 'main' }]) {
  const deck = deckCom(extra);
  const nomes = new Set(deck.map(d => d.name)), cards = Object.fromEntries(Object.entries(C).filter(([n]) => nomes.has(n))); // os fatos da partida são as cartas das listas (como no app)
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const esvazia = s => { for (let i = 0; i < 30; i++) { s = passaAte(s, x => !x.stack.length || !!x.pending); if (!s.pending) return s; const os = legais(s, s.pending.p); if (!os.length) return s; s = act(s, os.find(a => a.t === 'pick') || os[0]); } return s; };
/** Passa até a principal 1 do turno do jogador `p` (um turno inteiro do outro no meio, sem conjurar nada). */
const ateTurnoDe = (s, p) => passaAte(s, x => x.turn.active === p && x.turn.step === 'main1' && !x.stack.length && !x.pending && x.turn.number > s.turn.number);
const conjura = (s, p, nome, filtro = () => true) => { let o; [s, o] = poe(s, p, nome, 'hand'); s = mana(s, p); const of = legais(s, p, a => a.t === 'cast' && a.oid === o && filtro(a)); assert.ok(of.length, `${nome}: conjurável`); return [esvazia(act(s, of[0])), o]; };
const ciclo = s => s.cicloT || null;
const linhas = (s, a) => { const r = E.apply(s, a); return T.describe(s, a, r.events, r.state).map(String); };

test('CR 731.1 / 702.145d · a partida começa sem dia nem noite; controlar uma permanente com daybound faz virar dia', () => {
  let s = mesa();
  eq(ciclo(s), null, 'nem dia nem noite');
  let r; [s, r] = conjura(s, 0, TR);
  eq([s.objects[r].zone, ciclo(s)], ['battlefield', 'dia']);
});

test('CR 731.2a / 502.2 / 702.145b · de dia, o jogador ativo que não conjura nada no turno dele faz virar noite no desvirar seguinte; Tavern Ruffian transforma em Tavern Smasher 6/5', () => {
  let s = mesa(); let r; [s, r] = conjura(s, 0, TR);
  s = ateTurnoDe(s, 1); // o turno de A acabou com uma mágica (o Ruffian): continua dia
  eq(ciclo(s), 'dia', 'A conjurou uma mágica no turno dele');
  s = ateTurnoDe(s, 0); // B não conjurou nada no turno dele
  const o = s.objects[r], st = E.stats(s, o);
  eq([ciclo(s), o.name, st.power, st.toughness], ['noite', 'Tavern Smasher', 6, 5]);
});

test('CR 731.2b / 702.145e · de noite, duas mágicas do jogador ativo no turno dele fazem virar dia; uma só, não', () => {
  let s = mesa(); let r; [s, r] = conjura(s, 0, TR);
  s = ateTurnoDe(s, 1); s = ateTurnoDe(s, 0); eq(ciclo(s), 'noite');
  [s] = conjura(s, 0, 'Faisca');
  s = ateTurnoDe(s, 1);
  eq([ciclo(s), s.objects[r].name], ['noite', 'Tavern Smasher'], 'uma mágica: continua noite');
  s = ateTurnoDe(s, 0);
  [s] = conjura(s, 0, 'Faisca'); [s] = conjura(s, 0, 'Faisca');
  s = ateTurnoDe(s, 1);
  eq([ciclo(s), s.objects[r].name], ['dia', TR], 'duas mágicas: virou dia e o lobisomem voltou à frente');
});

test('CR 731.2a · só contam as mágicas do jogador ATIVO: a instantânea do oponente no meu turno não segura o dia', () => {
  let s = mesa(); [s] = conjura(s, 0, TR);
  s = ateTurnoDe(s, 1);
  // no turno de B, A conjura uma instantânea (B passa a prioridade); B não conjura nada
  s = act(s, { t: 'pass', p: 1 }); eq(s.turn.priority, 0);
  [s] = conjura(s, 0, 'Faisca');
  s = ateTurnoDe(s, 0);
  eq(ciclo(s), 'noite');
});

test('CR 702.145b · de noite, a dupla face com daybound entra transformada — e entrar transformada não é transformar (o gatilho do verso não dispara)', () => {
  let s = mesa(); [s] = conjura(s, 0, TR);
  s = ateTurnoDe(s, 1); s = ateTurnoDe(s, 0); eq(ciclo(s), 'noite');
  const vida = s.players[0].life; let l; [s, l] = conjura(s, 0, 'Lobo Teste');
  eq([s.objects[l].name, s.players[0].life - vida], ['Lobo Noturno', 0], 'entrou com o verso para cima, sem ganhar vida');
  [s] = conjura(s, 0, 'Faisca'); // duas mágicas neste turno (Lobo Teste + Faisca)
  s = ateTurnoDe(s, 1);
  eq([ciclo(s), s.objects[l].name], ['dia', 'Lobo Teste']);
});

test('CR 702.145b / 701.27e · virar noite transforma de verdade: "quando transforma" do verso dispara', () => {
  let s = mesa(); let l; [s, l] = conjura(s, 0, 'Lobo Teste');
  eq([ciclo(s), s.objects[l].name], ['dia', 'Lobo Teste']);
  s = ateTurnoDe(s, 1); const vida = s.players[0].life;
  s = ateTurnoDe(s, 0); // B não conjurou nada: virou noite no desvirar de A
  eq([ciclo(s), s.objects[l].name, s.players[0].life - vida], ['noite', 'Lobo Noturno', 3]);
});

test('CR 702.145b/e · "só transforma pelo próprio dia e noite": a habilidade "transforme" da carta não a transforma', () => {
  let s = mesa(); let l; [s, l] = conjura(s, 0, 'Lobo Teste');
  eq(ciclo(s), 'dia');
  s = mana(s); const of = legais(s, 0, a => a.t === 'activate' && a.oid === l);
  if (of.length) s = esvazia(act(s, of[0]));
  eq(s.objects[l].name, 'Lobo Teste', 'continua com a frente para cima');
});

test('CR 702.145g · sem dia nem noite, uma permanente com nightbound (e nenhuma com daybound no campo) faz virar noite', () => {
  let s = mesa(); [s] = poe(s, 0, 'Lua Cheia', 'battlefield');
  s = act(s, { t: 'pass', p: s.turn.priority });
  eq(ciclo(s), 'noite');
});

test('CR 731.2c · sem dia nem noite a checagem não acontece: turnos sem conjurar nada não fazem virar noite', () => {
  let s = mesa();
  s = ateTurnoDe(s, 1); s = ateTurnoDe(s, 0);
  eq(ciclo(s), null);
});

test('Registro · "Virou dia" e "Virou noite (nenhuma mágica no turno anterior)"; o lobisomem transforma no registro', () => {
  let s = mesa(); let r; [s, r] = poe(s, 0, TR, 'battlefield');
  const ls = linhas(s, { t: 'pass', p: s.turn.priority });
  assert.ok(ls.some(x => /^Virou dia/.test(x)), JSON.stringify(ls));
  s = act(s, { t: 'pass', p: s.turn.priority });
  s = ateTurnoDe(s, 1);
  // o desvirar de B: A não conjurou nada no turno dele (o Ruffian foi posto, não conjurado)
  eq(ciclo(s), 'noite');
});

test('Estado · partida sem carta de dia e noite não guarda contagem nem designação (as partidas-referência não mudam)', () => {
  let s = mesa(3, []);
  [s] = conjura(s, 0, 'Faisca'); s = ateTurnoDe(s, 1); s = ateTurnoDe(s, 0);
  eq([s.cicloT, s.magiasDoAtivoT, s.cicloEvT], [undefined, undefined, undefined]);
});

test('Validador · daybound e nightbound são palavras que o motor resolve (face de trás com nightbound)', () => {
  eq(SC.validateScript(SCRIPTS['Lobo Teste']), []);
  assert.ok(SC.KEYWORDS.includes('daybound') && SC.KEYWORDS.includes('nightbound'));
});

test('CR 702.145 · passeio aleatório com lobisomens: nada oferecido é recusado, e o dia e a noite se alternam', () => {
  const vistos = new Set();
  for (let seed = 1; seed <= 4; seed++) {
    let s = mesa(seed), r = seed * 7919;
    for (let i = 0; i < 400 && s.status !== 'over'; i++) {
      const p = s.pending ? s.pending.p : s.turn.priority;
      if (i % 7 === 0 && !s.pending) s = mana(s, p, 2);
      const acoes = E.legalActions(s, p).filter(a => a.t !== 'concede');
      assert.ok(acoes.length, `semente ${seed}, passo ${i}: sem ação`);
      r = (r * 1103515245 + 12345) & 0x7fffffff;
      const pref = acoes.filter(a => a.t === 'cast');
      const a = pref.length && r % 4 === 0 ? pref[r % pref.length] : acoes[r % acoes.length];
      s = E.apply(s, a).state;
      if (s.cicloT) vistos.add(s.cicloT);
    }
  }
  eq([...vistos].sort(), ['dia', 'noite']);
});

/* ---------------- T-50 · correções da auditoria independente ---------------- */
test('CR 702.145b / 302.6 · de noite, a dupla face cuja frente não é criatura entra transformada numa criatura: enjoada, não ataca no turno em que entrou', () => {
  let s = mesa(); [s] = conjura(s, 0, TR);
  s = ateTurnoDe(s, 1); s = ateTurnoDe(s, 0); eq(ciclo(s), 'noite');
  let x; [s, x] = conjura(s, 0, 'Totem Lunar');
  eq([s.objects[x].name, E.tiposDe(s, s.objects[x]).includes('creature'), !!s.objects[x].sick], ['Fera Lunar', true, true]);
  s = passaAte(s, y => y.turn.step === 'combat_attackers' || (!!y.pending && y.pending.kind !== 'attackers'));
  assert.ok(!E.legalActions(s, 0).some(a => a.t === 'attack' && (a.attackers || []).includes(x)), 'não é oferecida para atacar');
});
