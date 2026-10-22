// M-567 · LT226 · revisão por lote CCII (texto e rulings da Scryfall de 22/10/2026): Academic Dispute — "Target creature blocks this turn if able. You may
// have it gain reach until end of turn. Learn." A exigência de bloqueio (509.1c): virada, impedida ou sem atacante que possa bloquear, não precisa; o
// controlador escolhe qual atacante; o alcance é escolhido na resolução (rulings de 16/04/2021). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';
import { E, S, T, act, poe, legais, passaAte, limpaMao } from './listas.mjs';
const BOT = loadModules().bot;
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const AD = 'Academic Dispute', ad = OF.find(x => x.name === AD);
const C = { [AD]: { name: AD, type_line: ad.type_line, mana_cost: ad.mana_cost, cmc: 1, keywords: ['Learn'], oracle_text: ad.oracle_text, colors: ['R'] },
  Mountain: { name: 'Mountain', type_line: 'Basic Land — Mountain', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {R}.)', colors: [] },
  Island: { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] },
  Ogro: { name: 'Ogro', type_line: 'Creature — Ogre', mana_cost: '{2}{R}', cmc: 3, keywords: [], oracle_text: '', power: '3', toughness: '3', colors: ['R'] },
  Corvo: { name: 'Corvo', type_line: 'Creature — Bird', mana_cost: '{1}{R}', cmc: 2, keywords: ['Flying'], oracle_text: 'Flying', power: '1', toughness: '1', colors: ['R'] },
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{U}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['U'] } };
function mesa() {
  const b = ns => ns.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 249, mode: 'full', cards: C, first: 0, players: [
    { name: 'A', deck: b([[AD, 2], ['Ogro', 2], ['Corvo', 2], ['Mountain', 34]]) }, { name: 'B', deck: b([['Urso', 3], ['Island', 37]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = limpaMao(s, 0); let d, u, u2; [s, d] = poe(s, 0, AD, 'hand'); [s] = poe(s, 0, 'Mountain'); [s, u] = poe(s, 1, 'Urso'); [s, u2] = poe(s, 1, 'Urso');
  return [s, d, u, u2];
}
// conjura mirando o Urso; `alcance` responde à pergunta; aprender: recusa (sem carta na mão, nem pergunta)
function disputa(s, d, u, alcance = false) {
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === d && (a.targets || []).some(t => t.oid === u))[0]);
  for (let i = 0; i < 20 && (s.stack.length || s.pending); i++) { const pd = s.pending;
    if (pd && pd.kind === 'may_pay') s = act(s, { t: alcance ? 'pay' : 'decline', p: pd.p });
    else if (pd) s = act(s, legais(s, pd.p)[0]); else s = act(s, { t: 'pass', p: s.turn.priority }); }
  return s;
}
const ataca = (s, quem) => { s = passaAte(s, x => !!x.pending && x.pending.kind === 'attackers'); return act(s, { t: 'attack', p: 0, attackers: quem }); };
const naHoraDeBloquear = s => passaAte(s, x => !!x.pending && x.pending.kind === 'blockers');

test('M-567 · Academic Dispute joga (lido e aprovado)', () => { assert.equal(S.coverage(C[AD]).level, 'completo'); });

test('M-567 · a criatura alvo precisa bloquear: "sem bloqueio" é recusado, toda oferta a inclui, e o dono escolhe o atacante', () => {
  let [s, d, u, u2] = mesa(); let o1, o2; [s, o1] = poe(s, 0, 'Ogro'); [s, o2] = poe(s, 0, 'Ogro');
  s = disputa(s, d, u); assert.equal(s.objects[d].zone, 'graveyard');
  s = naHoraDeBloquear(ataca(s, [o1, o2]));
  assert.throws(() => E.apply(s, { t: 'block', p: 1, blocks: [] }), /precisa bloquear neste turno/);
  assert.throws(() => E.apply(s, { t: 'block', p: 1, blocks: [[u2, o1]] }), /precisa bloquear/, 'outro Urso no lugar não serve');
  const of = legais(s, 1, a => a.t === 'block'); assert.ok(of.length >= 3);
  assert.ok(of.every(a => a.blocks.some(([b]) => b === u)), 'toda oferta tem o Urso bloqueando');
  for (const a of of) E.apply(s, a); // todas aceitas
  const t = act(s, { t: 'block', p: 1, blocks: [[u, o2]] }); assert.equal(t.objects[u].blocking, o2, 'bloqueia o atacante que o dono escolheu');
  let [z] = mesa(); // sem a mágica, "sem bloqueio" continua valendo
  let o; [z, o] = poe(z, 0, 'Ogro'); z = naHoraDeBloquear(ataca(z, [o])); E.apply(z, { t: 'block', p: 1, blocks: [] });
});

test('M-567 · virada, ou só com voador atacando (sem alcance), não precisa bloquear; o alcance é escolhido na resolução e então a obriga contra o voador', () => {
  let [s, d, u] = mesa(); let c; [s, c] = poe(s, 0, 'Corvo');
  s = disputa(s, d, u, false); assert.ok(!E.hasKeyword(s, s.objects[u], 'reach'), 'recusou o alcance');
  let t = naHoraDeBloquear(ataca(s, [c])); E.apply(t, { t: 'block', p: 1, blocks: [] });
  let [s2, d2, u2] = mesa(); let c2; [s2, c2] = poe(s2, 0, 'Corvo');
  s2 = disputa(s2, d2, u2, true); assert.ok(E.hasKeyword(s2, s2.objects[u2], 'reach'), 'aceitou o alcance');
  let t2 = naHoraDeBloquear(ataca(s2, [c2])); assert.throws(() => E.apply(t2, { t: 'block', p: 1, blocks: [] }), /precisa bloquear/);
  let [s3, d3, u3] = mesa(); let o3; [s3, o3] = poe(s3, 0, 'Ogro');
  s3 = disputa(s3, d3, u3); s3 = JSON.parse(JSON.stringify(s3)); s3.objects[u3].tapped = true;
  let t3 = naHoraDeBloquear(ataca(s3, [o3])); E.apply(t3, { t: 'block', p: 1, blocks: [] });
});

test('M-567 · o Shark e o goldfish cumprem a exigência; no turno seguinte ela acabou', () => {
  let [s, d, u] = mesa(); let o; [s, o] = poe(s, 0, 'Ogro');
  s = disputa(s, d, u); s = naHoraDeBloquear(ataca(s, [o]));
  for (const f of [BOT.decideBloqueio, (x, p) => BOT.decideBloqueioProfissional(x, p, { duplo: true })]) {
    const b = f(s, 1).acao; assert.ok(b.blocks.some(([x]) => x === u), JSON.stringify(b)); E.apply(s, b);
  }
  assert.equal(JSON.stringify(E.completaBloqueiosM(s, 1, [])), JSON.stringify([[u, o]]));
  s = act(s, { t: 'block', p: 1, blocks: [[u, o]] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.number > 3 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  assert.equal(E.bloqueiosObrigatoriosM(s, 1).length, 0, 'a exigência era só daquele turno');
});

test('M-567 · achado da revisão: contra atacante com ameaça, a marcada precisa bloquear com uma companheira (509.1c: maximizar sem violar restrição); sem companheira, não', () => {
  const cards = { ...C, Bruto: { name: 'Bruto', type_line: 'Creature — Ogre', mana_cost: '{2}{R}', cmc: 3, keywords: ['Menace'], oracle_text: 'Menace', power: '3', toughness: '3', colors: ['R'] } };
  const b = ns => ns.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  const monta = () => { let s = E.createGame({ format: 'livre', seed: 249, mode: 'full', cards, first: 0, players: [
    { name: 'A', deck: b([[AD, 2], ['Bruto', 2], ['Mountain', 36]]) }, { name: 'B', deck: b([['Urso', 3], ['Island', 37]]) }] });
    for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
    s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
    s = limpaMao(s, 0); let d, u, br; [s, d] = poe(s, 0, AD, 'hand'); [s] = poe(s, 0, 'Mountain'); [s, u] = poe(s, 1, 'Urso'); [s, br] = poe(s, 0, 'Bruto'); return [s, d, u, br]; };
  let [s, d, u, br] = monta(); let u2; [s, u2] = poe(s, 1, 'Urso');
  s = naHoraDeBloquear(ataca(disputa(s, d, u), [br]));
  assert.throws(() => E.apply(s, { t: 'block', p: 1, blocks: [] }), /precisa bloquear/);
  E.apply(s, { t: 'block', p: 1, blocks: [[u, br], [u2, br]] });
  const of = legais(s, 1, a => a.t === 'block'); assert.ok(of.length && of.every(a => a.blocks.some(([x]) => x === u)));
  for (const a of of) E.apply(s, a);
  for (const f of [BOT.decideBloqueio, (x, p) => BOT.decideBloqueioProfissional(x, p, { duplo: true })]) E.apply(s, f(s, 1).acao);
  let [t, d2, u3, br2] = monta(); t = naHoraDeBloquear(ataca(disputa(t, d2, u3), [br2]));
  E.apply(t, { t: 'block', p: 1, blocks: [] }); // sozinha, não há bloqueio legal
});

test('M-567 · achado da revisão: o registro diz que a criatura ganhou alcance, e o "sim" sem custo não fala em pagar', () => {
  let [s, d, u] = mesa(); const log = [];
  const passo = a => { const r = E.apply(s, a); log.push(...(T.describe(s, a, r.events, r.state) || [])); s = r.state; };
  passo(legais(s, 0, a => a.t === 'cast' && a.oid === d && (a.targets || []).some(t => t.oid === u))[0]);
  for (let i = 0; i < 10 && !s.pending; i++) passo({ t: 'pass', p: s.turn.priority });
  passo({ t: 'pay', p: 0 });
  assert.ok(log.some(l => /Urso ganhou alcance até o fim do turno/.test(l)), log.join(' | '));
  assert.ok(!log.some(l => /pagou o custo/.test(l)) && log.some(l => /aceitou: Academic Dispute/.test(l)), log.join(' | '));
});
