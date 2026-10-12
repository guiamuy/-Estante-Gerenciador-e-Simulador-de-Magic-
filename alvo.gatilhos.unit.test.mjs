// CR2b.9 · "whenever ~ becomes the target of …" (603.2, 115.9): Bonecrusher Giant ("becomes the target of a spell": 2 de dano em quem
// controla a mágica; texto oficial em .listas/oficiais-motor.json, Oracle do Forge, 12/10/2026) e valente (207.2c, "becomes the target of a
// spell or ability you control for the first time each turn"). Dispara quando a mágica ou habilidade vai para a pilha, uma vez por mágica.
// Cada teste falha no motor anterior (o gatilho não existia).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';

const BC = JSON.parse(readFileSync(new URL('./.listas/oficiais-motor.json', import.meta.url), 'utf8')).cartas.find(c => c.name === 'Bonecrusher Giant');
const c = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: 1, keywords: [], oracle_text: '', colors: [...new Set((mana_cost.match(/[WUBRG]/g) || []))], ...extra });
const cards = { 'Bonecrusher Giant': { name: BC.name, type_line: BC.type_line, mana_cost: BC.mana_cost, cmc: 3, keywords: [], oracle_text: BC.oracle_text, colors: ['R'], power: BC.power, toughness: BC.toughness },
  Forca: c('Forca', 'Instant', '{R}'), Dupla: c('Dupla', 'Sorcery', '{R}'), Pinga: c('Pinga', 'Creature — Wizard', '{R}', { power: '1', toughness: '1' }),
  Valente: c('Valente', 'Creature — Mouse', '{R}', { power: '1', toughness: '1' }), Ursa: c('Ursa', 'Creature — Bear', '{G}', { power: '2', toughness: '2' }) };
const EX = { action: 'etb', target: 'none', expect: { attached: false } };
const scripts = {
  Forca: { name: 'Forca', effects: [{ do: 'pump', power: 1, toughness: 1, target: 'creature' }], example: { target: 'own-creature', expect: { pump: [1, 1] } } },
  Dupla: { name: 'Dupla', effects: [{ do: 'pump', power: 1, toughness: 0, target: 'creature' }, { do: 'pump', power: 0, toughness: 1, target: 'creature' }], example: { target: 'own-creature', expect: { pump: [1, 0] } } },
  Pinga: { name: 'Pinga', abilities: [{ kind: 'activated', cost: { tap: true }, effects: [{ do: 'pump', power: 1, toughness: 0, target: 'creature' }] }], example: EX },
  Valente: { name: 'Valente', abilities: [{ kind: 'triggered', when: 'becomes-target', alvoDoControlador: true, primeiraVezNoTurno: true, effects: [{ do: 'counters', amount: 1, target: 'self-source' }] }], example: EX }
};
function mesaX(a = [], b = []) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 12, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Mountain']) }, { name: 'B', deck: baralho([...b, 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const pronta = (s, o) => { s = J(s); s.objects[o].sick = false; return s; };
const conjura = (s, p, oid, alvos) => { s = comMana(s, 'R', p); s = J(s); s.turn.priority = p; const a = legais(s, p, x => x.t === 'cast' && x.oid === oid && alvos.every((t, i) => x.targets && x.targets[i] && x.targets[i].oid === t))[0]; assert.ok(a, 'conjurar mirando'); return act(s, a); };
const ativa = (s, p, oid, alvo) => { s = J(s); s.turn.priority = p; const a = legais(s, p, x => x.t === 'activate' && x.oid === oid && x.targets && x.targets[0].oid === alvo)[0]; assert.ok(a, 'ativar mirando'); return act(s, a); };
const resolve = (s, p = 0) => tudo(act(act(s, { t: 'pass', p }), { t: 'pass', p: p === 0 ? 1 : 0 }));
const gatilhosDe = (s, fonte) => s.stack.filter(o => s.objects[o].ability && s.objects[o].source === fonte).length;

test('CR 603.2/115.9 · Bonecrusher Giant: mágica do oponente que o mira → 2 de dano em quem a conjurou, antes da mágica; habilidade não dispara', () => {
  let s = mesaX(['Bonecrusher Giant'], ['Forca', 'Pinga']), g, f, pi;
  [s, g] = poe(s, 0, 'Bonecrusher Giant'); [s, f] = poe(s, 1, 'Forca', 'hand'); [s, pi] = poe(s, 1, 'Pinga'); s = pronta(s, pi);
  s = ativa(s, 1, pi, g);
  assert.equal(gatilhosDe(s, g), 0, 'habilidade ativada mirando: não é mágica');
  s = resolve(s, 1);
  const v = s.players[1].life;
  s = conjura(s, 1, f, [g]);
  assert.equal(gatilhosDe(s, g), 1, 'a mágica mirou: um gatilho');
  assert.equal(s.objects[s.stack[s.stack.length - 1]].source, g, 'o gatilho fica por cima da mágica');
  s = resolve(s, 1);
  assert.equal(v - s.players[1].life, 2, 'dois de dano em quem controlava a mágica');
});

test('CR 603.2 · mágica minha que o mira também dispara (dano em mim); a mágica com dois alvos dispara só pelo Gigante mirado', () => {
  let s = mesaX(['Bonecrusher Giant', 'Forca', 'Dupla', 'Ursa']), g, f, d, u;
  [s, g] = poe(s, 0, 'Bonecrusher Giant'); [s, f] = poe(s, 0, 'Forca', 'hand'); [s, d] = poe(s, 0, 'Dupla', 'hand'); [s, u] = poe(s, 0, 'Ursa');
  const v = s.players[0].life;
  s = resolve(conjura(s, 0, f, [g]));
  assert.equal(v - s.players[0].life, 2, '"that spell\'s controller": eu mesmo');
  s = conjura(s, 0, d, [u, g]);
  assert.equal(gatilhosDe(s, g), 1, 'mirou a Ursa e o Gigante: um gatilho, do Gigante');
  assert.equal(s.stack.filter(o => s.objects[o].ability).length, 1, 'a Ursa não tem gatilho');
});

test('CR 207.2c · valente: mágica ou habilidade sua, só a primeira vez em cada turno; a do oponente não dispara nem gasta; outro turno, de novo', () => {
  let s = mesaX(['Valente', 'Forca', 'Pinga'], ['Forca']), v, f, pi, fo;
  [s, v] = poe(s, 0, 'Valente'); [s, f] = poe(s, 0, 'Forca', 'hand'); [s, pi] = poe(s, 0, 'Pinga'); [s, fo] = poe(s, 1, 'Forca', 'hand'); s = pronta(s, pi);
  s = resolve(conjura(s, 1, fo, [v]), 1);
  assert.equal(s.objects[v].counters.p1p1 || 0, 0, 'mágica do oponente: nada');
  s = resolve(ativa(s, 0, pi, v));
  assert.equal(s.objects[v].counters.p1p1, 1, 'habilidade minha: a primeira vez no turno');
  s = resolve(conjura(s, 0, f, [v]));
  assert.equal(s.objects[v].counters.p1p1, 1, 'segunda vez no mesmo turno: nada');
  let t = J(s); t.turn.number += 1; t.objects[pi].tapped = false;
  t = resolve(ativa(t, 0, pi, v));
  assert.equal(t.objects[v].counters.p1p1, 2, 'outro turno: de novo');
});

test('CR 715 · a Aventura do Gigante (Stomp): 2 de dano a qualquer alvo, o dano não pode ser prevenido, e a carta vai para o exílio de onde pode virar o Gigante', () => {
  let s = mesaX(['Bonecrusher Giant']), g;
  [s, g] = poe(s, 0, 'Bonecrusher Giant', 'hand'); s = comMana(s, 'RRRRR');
  const st = legais(s, 0, x => x.t === 'cast' && x.oid === g && x.omen && x.targets && x.targets[0].player === 1)[0];
  assert.ok(st, 'Stomp no oponente');
  const v = s.players[1].life;
  s = resolve(act(s, st));
  assert.equal(v - s.players[1].life, 2);
  assert.equal(s.noPrevention, true, '"Damage can\'t be prevented this turn"');
  assert.equal(s.objects[g].zone, 'exile');
  assert.ok(legais(s, 0, x => x.t === 'cast' && x.oid === g && !x.omen).length, 'do exílio, o Gigante');
});
