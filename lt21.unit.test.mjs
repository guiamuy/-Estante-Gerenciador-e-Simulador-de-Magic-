// M-338 · LT21 · custos alternativos de exilar uma carta da mão (118.9): Force of Will ("pay 1 life and exile a blue card"), Force of Negation
// ("If it's not your turn, …"; "If that spell is countered this way, exile it"), evocar exilando (Grief, Solitude: o motor lê da carta, K-8) e
// "exile up to one other target creature. That creature's controller gains life equal to its power" (Solitude). Scripts lidos pelo leitor;
// texto oficial em .listas/oficiais-revisadas.json (Oracle do Forge, 12/10/2026). Cada teste falha no leitor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';
import { loadModules } from './_load.mjs';

const { leitor: L, scripts: S } = loadModules();
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const mv = m => [...m.matchAll(/\{([^}]+)\}/g)].reduce((n, x) => n + (/^\d+$/.test(x[1]) ? +x[1] : 1), 0);
const KW = { Grief: ['Menace'], Solitude: ['Flash', 'Lifelink'] };
const carta = n => { const c = OF.find(x => x.name === n); assert.ok(c, n); return { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: mv(c.mana_cost), keywords: KW[n] || [], oracle_text: c.oracle_text, colors: [...new Set(c.mana_cost.match(/[WUBRG]/g) || [])], ...(c.power ? { power: c.power, toughness: c.toughness } : {}) }; };
const NOMES = ['Force of Will', 'Force of Negation', 'Grief', 'Solitude', 'Syncopate'];
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: mv(mana_cost), keywords: [], oracle_text: '', colors: [...new Set(mana_cost.match(/[WUBRG]/g) || [])], ...extra });
const cards = { ...Object.fromEntries(NOMES.map(n => [n, carta(n)])), Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2' }),
  Azul: c0('Azul', 'Sorcery', '{U}'), Preta: c0('Preta', 'Sorcery', '{B}'), Branca: c0('Branca', 'Sorcery', '{W}'), Feitico: c0('Feitico', 'Sorcery', '{R}') };
const ex = { target: 'none', expect: { handDelta: 0 } };
const scripts = { ...Object.fromEntries(NOMES.map(n => [n, { ...L.ler(carta(n)).script, example: { action: 'etb', target: 'none', expect: { attached: false } } }])),
  Azul: { name: 'Azul', effects: [{ do: 'draw', amount: 1 }], example: ex }, Preta: { name: 'Preta', effects: [{ do: 'draw', amount: 1 }], example: ex },
  Branca: { name: 'Branca', effects: [{ do: 'draw', amount: 1 }], example: ex }, Feitico: { name: 'Feitico', effects: [{ do: 'damage', amount: 3, target: 'any' }], example: { target: 'opponent', expect: { opponentLife: -3 } } } };
scripts['Force of Will'].example = scripts['Force of Negation'].example = scripts.Syncopate.example = { target: 'none', expect: { countered: true } };
function mesaX(a = [], b = []) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 17, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Island', 'Plains', 'Swamp']) }, { name: 'B', deck: baralho([...b, 'Mountain', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = J(s); for (const p of [0, 1]) for (const oid of s.zones[p].hand.slice()) E.moveObject(s, oid, 'library'); // mão vazia: cada teste põe o que precisa
  return s;
}
const resolve = s => tudo(act(act(s, { t: 'pass', p: s.turn.priority }), { t: 'pass', p: 1 - s.turn.priority }));
/** B conjura o Feitiço (no turno dele) e A fica com a prioridade para responder. */
const feiticoDeB = s => { s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending); let f; [s, f] = poe(s, 1, 'Feitico', 'hand'); s = comMana(s, 'R', 1);
  s = act(s, legais(s, 1, x => x.t === 'cast' && x.oid === f && x.targets && x.targets[0].player === 0)[0]); return [act(s, { t: 'pass', p: 1 }), f]; };

test('LT21 · Force of Will: pagar 1 de vida e exilar uma carta azul da mão (não ela mesma) em vez do custo; sem carta azul, não', () => {
  let s = mesaX(['Force of Will', 'Azul'], ['Feitico']), fw, az, f;
  [s, fw] = poe(s, 0, 'Force of Will', 'hand');
  [s, f] = feiticoDeB(s);
  assert.equal(s.turn.priority, 0);
  assert.ok(!legais(s, 0, x => x.t === 'cast' && x.oid === fw && x.alt != null).length, 'só ela de azul na mão: não paga com ela mesma');
  [s, az] = poe(s, 0, 'Azul', 'hand');
  const a = legais(s, 0, x => x.t === 'cast' && x.oid === fw && x.alt != null)[0]; assert.ok(a, 'com outra azul, o custo alternativo aparece');
  const vida = s.players[0].life;
  s = tudo(act(s, a));
  assert.equal(s.players[0].life, vida - 1, 'pagou 1 de vida'); assert.equal(s.objects[az].zone, 'exile', 'exilou a azul');
  assert.equal(s.objects[f].zone, 'graveyard', 'o Feitiço foi anulado');
});

test('LT21 · Force of Negation: o custo alternativo só fora do seu turno; anula mágica não criatura e a exila', () => {
  let s = mesaX(['Force of Negation', 'Azul'], ['Feitico']), fn, az, f;
  [s, fn] = poe(s, 0, 'Force of Negation', 'hand'); [s, az] = poe(s, 0, 'Azul', 'hand');
  assert.ok(!legais(s, 0, x => x.t === 'cast' && x.oid === fn && x.alt != null).length, 'no seu turno, não');
  [s, f] = feiticoDeB(s);
  const a = legais(s, 0, x => x.t === 'cast' && x.oid === fn && x.alt != null)[0]; assert.ok(a, 'no turno do oponente, sim');
  s = tudo(act(s, a));
  assert.equal(s.objects[az].zone, 'exile');
  assert.equal(s.objects[f].zone, 'exile', 'anulado assim, vai para o exílio');
});

test('LT21 · Grief evocada exilando uma carta preta: entra, o descarte escolhido acontece e ela é sacrificada', () => {
  let s = mesaX(['Grief', 'Preta'], ['Urso']), g, pr;
  [s, g] = poe(s, 0, 'Grief', 'hand'); [s, pr] = poe(s, 0, 'Preta', 'hand');
  const ev = legais(s, 0, x => x.t === 'cast' && x.oid === g && x.alt != null)[0]; assert.ok(ev, 'evocar exilando é oferecido sem mana');
  s = act(s, ev); assert.equal(s.objects[pr].zone, 'exile');
  s = tudo(resolve(s), x => legais(x, x.pending.p, y => y.t === 'pick')[0] || legais(x, x.pending.p, y => y.t === 'pick_done')[0] || legais(x, x.pending.p)[0]);
  assert.equal(s.objects[g].zone, 'graveyard', 'evocada: sacrificada ao entrar');
});

test('LT21 · Solitude: exila até uma OUTRA criatura e o controlador dela ganha vida igual ao poder', () => {
  let s = mesaX(['Solitude'], ['Urso']), so, u;
  [s, so] = poe(s, 0, 'Solitude', 'hand'); [s, u] = poe(s, 1, 'Urso');
  const vB = s.players[1].life;
  s = resolve(act(comMana(s, 'WWWWW'), legais(comMana(s, 'WWWWW'), 0, x => x.t === 'cast' && x.oid === so && x.alt == null)[0]));
  s = passaAte(s, x => !!x.pending || !x.stack.length);
  if (s.pending) { assert.ok(!s.pending.options || !s.pending.options.some(o => o.oid === so), 'não mira a si mesma (other)'); s = act(s, legais(s, 0, x => x.t === 'pick_target' ? s.pending.options[x.index].oid === u : true)[0]); }
  s = tudo(s);
  assert.equal(s.objects[u].zone, 'exile'); assert.equal(s.players[1].life, vB + 2, 'B ganha 2');
  assert.equal(s.objects[so].zone, 'battlefield', 'conjurada normal, fica');
});

test('M-338 · leitor: custo alternativo de exilar lido com a condição e a anulação que exila', () => {
  const fn = L.ler(carta('Force of Negation')).script;
  assert.equal(JSON.stringify(fn.alt[0].when), JSON.stringify({ naoSeuTurno: true }));
  assert.equal(fn.effects[0].exila, true);
  assert.equal(JSON.stringify(L.ler(carta('Force of Will')).script.alt[0].cost), JSON.stringify({ life: 1, exileHandColor: 'U' }));
});

test('achado da revisão do lote XII · 603.3d: "up to one other target creature" deixa escolher nenhum alvo (com uma só opção, pergunta)', () => {
  let s = mesaX(['Solitude', 'Urso']), so, u;
  [s, so] = poe(s, 0, 'Solitude', 'hand'); [s, u] = poe(s, 0, 'Urso');
  s = act(comMana(s, 'WWWWW'), legais(comMana(s, 'WWWWW'), 0, x => x.t === 'cast' && x.oid === so && x.alt == null)[0]);
  s = passaAte(act(act(s, { t: 'pass', p: 0 }), { t: 'pass', p: 1 }), x => !!x.pending || !x.stack.length);
  assert.equal(s.pending && s.pending.kind, 'pick_target', 'com uma só criatura (a sua), pergunta');
  const nenhum = legais(s, 0, x => x.t === 'pick_target' && x.nenhum)[0]; assert.ok(nenhum, '"nenhum alvo" é oferecido');
  const vida = s.players[0].life;
  s = tudo(act(s, nenhum));
  assert.equal(s.objects[u].zone, 'battlefield', 'a sua criatura fica'); assert.equal(s.players[0].life, vida, 'ninguém ganha vida');
});

test('achado da revisão do lote XII · 107.3a / 118.12a: Syncopate "a menos que pague {X}" cobra o X anunciado', () => {
  let s = mesaX(['Syncopate'], ['Feitico']), sy, f;
  [s, sy] = poe(s, 0, 'Syncopate', 'hand');
  [s, f] = feiticoDeB(s);
  const a = legais(comMana(s, 'UUUU'), 0, x => x.t === 'cast' && x.oid === sy && x.x === 3)[0]; assert.ok(a, 'X = 3');
  let t = act(comMana(s, 'UUUU'), a); t = act(t, { t: 'pass', p: 0 }); t = act(t, { t: 'pass', p: 1 });
  t = passaAte(t, x => !!x.pending || !x.stack.includes(f));
  assert.ok(!(t.pending && t.pending.kind === 'may_pay'), 'B sem mana: não há pergunta');
  assert.equal(t.objects[f].zone, 'exile', 'anulada e exilada');
  let w = act(comMana(s, 'UUUU'), a); w = comMana(w, 'RRR', 1); w = act(w, { t: 'pass', p: 0 }); w = act(w, { t: 'pass', p: 1 });
  w = passaAte(w, x => !!x.pending || !x.stack.includes(f));
  assert.equal(w.pending && w.pending.kind, 'may_pay'); assert.equal(w.pending.cost, '{3}', 'pede {3}');
});

test('M-338 · as 15 do lote XII revisadas jogam (decisão A)', () => {
  for (const n of ['Force of Will', 'Force of Negation', 'Solitude', 'No More Lies', 'Unmask', 'Raise the Alarm', 'Grief', 'Mogg Alarm', 'Void Shatter', 'Spell Shrivel', 'Syncopate', 'Assert Authority', 'Rouse', 'Dissipate', 'Deny Existence'])
    assert.equal(S.coverage(carta(n)).level, 'completo', n + ' joga');
});
