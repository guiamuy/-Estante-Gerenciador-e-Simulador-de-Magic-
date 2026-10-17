// T-108 · CR5 · Copiar a mágica alvo (Comprehensive Rules 707.10, 707.10c). T-109 · copiar habilidade (707.10b): Strionic Resonator e Lithoform Engine.
// "Vigia" e "Fonte" são cartas de teste.
// Texto da regra: .regras/cr-2026-09-25.txt. Cartas com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge, clone de 13/10/2026,
// conferido no master em 14/10/2026): Twincast, Reverberate, Reiterate, Increasing Vengeance, Geistblast, Nivix Guildmage e Dualcaster Mage.
// "Raio", "Choque" e "Urso" são cartas de teste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, T, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const NOMES = ['Twincast', 'Reverberate', 'Reiterate', 'Increasing Vengeance', 'Geistblast', 'Nivix Guildmage', 'Dualcaster Mage', 'Strionic Resonator', 'Lithoform Engine'];
const KW = { 'Dualcaster Mage': ['Flash'], 'Reiterate': ['Buyback'], 'Increasing Vengeance': ['Flashback'] };
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => NOMES.includes(x.name)))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: KW[c.name] || [], oracle_text: c.oracle_text, colors: [], power: c.power, toughness: c.toughness };
C.Island = { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: '', colors: ['R'], ...extra }; };
carta('Raio', 'Instant'); carta('Choque', 'Sorcery'); carta('Ciclo', 'Sorcery'); carta('Arremesso', 'Instant'); carta('Encanto', 'Enchantment — Aura'); carta('Vigia', 'Creature — Soldier', { power: '1', toughness: '1', keywords: ['Flash'], oracle_text: 'Flash' }); carta('Fonte', 'Artifact'); carta('Urso', 'Creature — Bear', { power: '2', toughness: '2', mana_cost: '{1}{G}', cmc: 2, colors: ['G'] });
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = { 'Ciclo': { name: 'Ciclo', effects: [{ do: 'gain', amount: 0 }], cycling: { mana: '{1}' }, example: { target: 'none', expect: { selfLife: 0 } } }, // "Cycling {1}"
  'Arremesso': { name: 'Arremesso', additional: { sacrificeOther: { types: ['creature'] } }, effects: [{ do: 'damage', amount: { per: 'sacrificed-power' }, target: 'any' }], example: { target: 'none', expect: { selfLife: 0 } } }, // "As an additional cost, sacrifice a creature. ~ deals damage equal to the sacrificed creature's power to any target."
  'Encanto': { name: 'Encanto', aura: { enchant: 'creature' }, grants: { power: 2, toughness: 0 }, example: { action: 'aura', target: 'own-creature', expect: { stats: [3, 1] } } }, // "Enchant creature · Enchanted creature gets +2/+0."
  'Vigia': { name: 'Vigia', abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'gain', amount: 3 }] }], example: { action: 'etb', target: 'none', expect: { selfLife: 3 } } }, // "When this enters, you gain 3 life."
  'Fonte': { name: 'Fonte', abilities: [{ kind: 'activated', cost: { mana: '{1}' }, effects: [{ do: 'gain', amount: 2 }] }], example: { action: 'activate:0', target: 'none', expect: { selfLife: 2 } } }, // "{1}: You gain 2 life."
  'Raio': { name: 'Raio', effects: [{ do: 'damage', amount: 3, target: 'any' }], ...EX }, 'Choque': { name: 'Choque', effects: [{ do: 'damage', amount: 2, target: 'any' }], ...EX } };
function mesa(seed = 1) {
  const deck = [...Object.keys(C).filter(n => n !== 'Island').map(name => ({ name, qty: 2, zone: 'main' })), { name: 'Island', qty: 16, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
/** passa a prioridade; na escolha do alvo da cópia, escolhe o alvo pedido (`alvoDaCopia(opcoes)` devolve o índice). */
const resolve = (s, alvoDaCopia = () => 0) => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) {
  if (s.pending) { const os = legais(s, s.pending.p); s = act(s, s.pending.kind === 'pick_target' ? os[alvoDaCopia(s)] || os[0] : os[0]); continue; }
  s = act(s, legais(s, s.turn.priority).find(x => x.t === 'pass')); } return s; };
const alvoJogador = p => s => (s.pending.options || s.pending.alvos || []).findIndex(x => x && x.player === p);
const conjura = (s, p, oid, f = () => true) => { s = J(s); s.turn.priority = p; const a = legais(s, p, x => x.t === 'cast' && x.oid === oid && f(x))[0]; assert.ok(a, 'conjurar ' + s.objects[oid].name); return act(s, a); };

test('CR 707.10 · Twincast (texto oficial): a cópia vai à pilha por cima, com alvo novo (aqui o mesmo jogador), e resolve antes da original — 6 de dano', () => {
  let s = mesa(); let r, t; [s, r] = poe(s, 0, 'Raio', 'hand'); [s, t] = poe(s, 0, 'Twincast', 'hand'); s = mana(s);
  s = conjura(s, 0, r, a => a.targets[0].player === 1);
  s = conjura(s, 0, t, a => a.targets[0].oid === r);
  s = act(s, { t: 'pass', p: 0 }); s = act(s, { t: 'pass', p: 1 }); // resolve o Twincast
  eq([s.pending && s.pending.kind, s.spellsThisTurn], ['pick_target', 2], 'a cópia pede o alvo; não conta como conjurada (707.10)');
  const op = legais(s, 0).find(x => x.t === 'pick_target' && JSON.stringify(s.pending).includes('"player":1') && x.index === (s.pending.options || []).findIndex(o => o && o.player === 1));
  s = act(s, op || legais(s, 0)[1]);
  eq(s.stack.map(o => !!s.objects[o].copiaDeMagia), [false, true], 'a cópia por cima da original');
  s = resolve(s);
  eq(s.players[1].life, 14);
});

test('CR 707.10 · a cópia é de quem copiou: o Raio de B mira A; A copia com Reverberate (texto oficial) e manda a cópia em B', () => {
  let s = mesa(); let r, v; [s, r] = poe(s, 1, 'Raio', 'hand'); [s, v] = poe(s, 0, 'Reverberate', 'hand'); s = mana(s, 0); s = mana(s, 1);
  s = conjura(s, 1, r, a => a.targets[0].player === 0);
  s = conjura(s, 0, v, a => a.targets[0].oid === r);
  s = act(s, { t: 'pass', p: 0 }); s = act(s, { t: 'pass', p: 1 });
  assert.equal(s.pending && s.pending.p, 0, 'quem escolhe o alvo da cópia é A');
  const k = (s.pending.options || []).findIndex(o => o && o.player === 1); s = act(s, legais(s, 0).find(x => x.t === 'pick_target' && x.index === k) || legais(s, 0)[0]);
  const copia = s.stack.map(o => s.objects[o]).find(o => o.copiaDeMagia);
  eq(copia && copia.controller, 0, 'a cópia é de A');
  s = resolve(s);
  eq([s.players[0].life, s.players[1].life], [17, 17]);
});

test('CR 707.10 · a mágica alvo saiu da pilha antes: nada é copiado', () => {
  let s = mesa(); let r, t, c; [s, r] = poe(s, 0, 'Raio', 'hand'); [s, t] = poe(s, 0, 'Twincast', 'hand'); s = mana(s);
  s = conjura(s, 0, r, a => a.targets[0].player === 1);
  s = conjura(s, 0, t, a => a.targets[0].oid === r);
  s = J(s); const i = s.stack.indexOf(r); s.stack.splice(i, 1); s.objects[r].zone = 'graveyard'; s.zones[0].graveyard.push(r); // a original foi anulada
  s = resolve(s);
  eq([s.players[1].life, s.stack.length], [20, 0]);
});

test('CR 707.10 · Increasing Vengeance (texto oficial): da mão, uma cópia; pelo lampejo do passado (do cemitério), duas', () => {
  let s = mesa(); let r, iv; [s, r] = poe(s, 0, 'Raio', 'hand'); [s, iv] = poe(s, 0, 'Increasing Vengeance', 'hand'); s = mana(s);
  s = conjura(s, 0, r, a => a.targets[0].player === 1); s = conjura(s, 0, iv, a => a.targets[0].oid === r);
  s = resolve(s, alvoJogador(1));
  eq(s.players[1].life, 14, 'da mão: original + uma cópia');
  let r2; [s, r2] = poe(s, 0, 'Raio', 'hand'); s = mana(s);
  s = conjura(s, 0, r2, a => a.targets[0].player === 1);
  s = J(s); s.turn.priority = 0; const fb = legais(s, 0, x => x.t === 'cast' && x.oid === iv && x.flashback)[0]; assert.ok(fb, 'lampejo do passado do cemitério');
  s = resolve(act(s, fb), alvoJogador(1));
  eq(s.players[1].life, 5, 'do cemitério: original + duas cópias (9)');
});

test('CR 702.27 / 707.10 · Reiterate (texto oficial) com recompra volta para a mão', () => {
  let s = mesa(); let r, re; [s, r] = poe(s, 0, 'Raio', 'hand'); [s, re] = poe(s, 0, 'Reiterate', 'hand'); s = mana(s);
  s = conjura(s, 0, r, a => a.targets[0].player === 1);
  s = conjura(s, 0, re, a => a.targets[0].oid === r && !!a.recompraK);
  s = resolve(s, alvoJogador(1));
  eq([s.players[1].life, s.objects[re].zone], [14, 'hand']);
});

test('CR 707.10 · Geistblast (texto oficial): do cemitério, exilando-se, copia uma mágica sua — não a do oponente', () => {
  let s = mesa(); let g, r, rb; [s, g] = poe(s, 0, 'Geistblast', 'graveyard'); [s, r] = poe(s, 0, 'Raio', 'hand'); [s, rb] = poe(s, 1, 'Raio', 'hand'); s = mana(s, 0); s = mana(s, 1);
  s = conjura(s, 1, rb, a => a.targets[0].player === 0);
  assert.ok(!legais(s, 0, x => x.t === 'activate' && x.oid === g).some(x => x.targets && x.targets[0].oid === rb), 'a do oponente não é alvo');
  s = resolve(s);
  s = conjura(s, 0, r, a => a.targets[0].player === 1);
  s = act(s, legais(s, 0, x => x.t === 'activate' && x.oid === g && x.targets[0].oid === r)[0]);
  eq(s.objects[g].zone, 'exile', 'exilou-se como custo');
  s = resolve(s, alvoJogador(1));
  eq(s.players[1].life, 14);
});

test('CR 707.10 · Dualcaster Mage (texto oficial): com lampejo, entra em resposta e o gatilho copia; Nivix Guildmage copia a sua', () => {
  let s = mesa(); let d, r, n; [s, d] = poe(s, 0, 'Dualcaster Mage', 'hand'); [s, r] = poe(s, 1, 'Raio', 'hand'); s = mana(s, 0); s = mana(s, 1);
  s = conjura(s, 1, r, a => a.targets[0].player === 0);
  s = conjura(s, 0, d);
  s = resolve(s, alvoJogador(1));
  eq([s.players[0].life, s.players[1].life, s.objects[d].zone], [17, 17, 'battlefield']);
  [s, n] = poe(s, 0, 'Nivix Guildmage', 'battlefield'); let c; [s, c] = poe(s, 0, 'Choque', 'hand'); s = mana(s);
  s = conjura(s, 0, c, a => a.targets[0].player === 1);
  s = act(s, legais(s, 0, x => x.t === 'activate' && x.oid === n && x.targets && x.targets[0].oid === c)[0]);
  s = resolve(s, alvoJogador(1));
  eq(s.players[1].life, 13, 'Choque e a cópia: 4');
});

test('CR 707.10 · validador e pilha explicada', () => {
  const v = sc => J(SC.validateScript({ name: 'X', ...sc, example: { target: 'none', expect: { selfLife: 0 } } }));
  eq(v({ effects: [{ do: 'copia_magia', target: { zona: 'stack', tipos: ['instant', 'sorcery'] } }] }), []);
  assert.match(T.descreveEfeitos([{ do: 'copia_magia', target: { zona: 'stack', tipos: ['instant', 'sorcery'], de: 'you' } }]), /copia uma mágica instantânea ou feitiço sua/);
});

test('CR 707.10b · T-109: Strionic Resonator (texto oficial) copia o gatilho de entrada seu — 6 de vida; não mira habilidade ativada nem gatilho do oponente', () => {
  let s = mesa(); let r, v, f, vb; [s, r] = poe(s, 0, 'Strionic Resonator', 'battlefield'); [s, f] = poe(s, 0, 'Fonte', 'battlefield'); [s, v] = poe(s, 0, 'Vigia', 'hand'); s = mana(s);
  const vida = s.players[0].life;
  s = conjura(s, 0, v); s = act(s, { t: 'pass', p: 0 }); s = act(s, { t: 'pass', p: 1 }); // a Vigia entra; o gatilho vai à pilha
  const gat = s.stack.find(o => s.objects[o].ability && s.objects[o].name === 'Vigia'); assert.ok(gat, 'o gatilho na pilha');
  s = J(s); s.turn.priority = 0;
  s = act(s, legais(s, 0, x => x.t === 'activate' && x.oid === r && x.targets && x.targets[0].oid === gat)[0]);
  s = resolve(s);
  eq(s.players[0].life - vida, 6, 'o gatilho e a cópia');
  s = mana(s); s = J(s); s.turn.priority = 0; s.objects[r].tapped = false;
  s = act(s, legais(s, 0, x => x.t === 'activate' && x.oid === f)[0]);
  const hab = s.stack.find(o => s.objects[o].ability && s.objects[o].name === 'Fonte');
  assert.ok(!legais(s, 0, x => x.t === 'activate' && x.oid === r).some(x => x.targets && x.targets[0].oid === hab), 'habilidade ativada não é alvo do Resonator');
  s = resolve(s);
  [s, vb] = poe(s, 1, 'Vigia', 'hand'); s = mana(s, 1); s = conjura(s, 1, vb); s = act(s, { t: 'pass', p: 1 }); s = act(s, { t: 'pass', p: 0 });
  const gb = s.stack.find(o => s.objects[o].ability && s.objects[o].name === 'Vigia');
  s = J(s); s.turn.priority = 0;
  assert.ok(gb && !legais(s, 0, x => x.t === 'activate' && x.oid === r).some(x => x.targets && x.targets[0].oid === gb), 'gatilho do oponente não é alvo');
});

test('CR 707.10b / 707.10c · T-109: Lithoform Engine (texto oficial) copia a habilidade ativada sua (4 de vida) e a mágica de permanente sua (a cópia vira ficha)', () => {
  let s = mesa(); let e, f, u; [s, e] = poe(s, 0, 'Lithoform Engine', 'battlefield'); [s, f] = poe(s, 0, 'Fonte', 'battlefield'); s = mana(s);
  const vida = s.players[0].life;
  s = act(s, legais(s, 0, x => x.t === 'activate' && x.oid === f)[0]);
  const hab = s.stack.find(o => s.objects[o].ability && s.objects[o].name === 'Fonte');
  s = act(s, legais(s, 0, x => x.t === 'activate' && x.oid === e && (x.index || 0) === 0 && x.targets[0].oid === hab)[0]);
  s = resolve(s);
  eq(s.players[0].life - vida, 4);
  s = J(s); s.objects[e].tapped = false; [s, u] = poe(s, 0, 'Urso', 'hand'); s = mana(s);
  s = conjura(s, 0, u);
  s = act(s, legais(s, 0, x => x.t === 'activate' && x.oid === e && x.index === 2 && x.targets[0].oid === u)[0]);
  s = resolve(s);
  const ursos = s.zones[0].battlefield.map(o => s.objects[o]).filter(o => o.name === 'Urso');
  eq([ursos.length, ursos.filter(o => o.token).length], [2, 1], 'a carta e a ficha');
});

test('CR 707.10b · T-109: validador do seletor de habilidade', () => {
  const v = sc => J(SC.validateScript({ name: 'X', ...sc, example: { target: 'none', expect: { selfLife: 0 } } }));
  eq(v({ effects: [{ do: 'copia_habilidade', target: { zona: 'stack', habilidades: 'disparadas', de: 'you' } }] }), []);
  assert.ok(v({ effects: [{ do: 'copia_habilidade', target: { zona: 'stack', habilidades: 'mana' } }] }).some(e => /habilidades/.test(e)));
});

test('CR 707.10b · T-110: o Strionic Resonator não mira a habilidade de ciclar (ativada, vai à pilha por outro caminho)', () => {
  let s = mesa(); let r, c; [s, r] = poe(s, 0, 'Strionic Resonator', 'battlefield'); [s, c] = poe(s, 0, 'Ciclo', 'hand'); s = mana(s);
  s = act(s, legais(s, 0, x => x.t === 'cycle' && x.oid === c)[0]);
  const hab = s.stack.find(o => s.objects[o].ability); assert.ok(hab, 'ciclar usa a pilha');
  assert.ok(!legais(s, 0, x => x.t === 'activate' && x.oid === r).some(x => x.targets && x.targets[0].oid === hab));
});

test('CR 707.10 · T-110: a cópia leva o custo adicional pago — a cópia do "sacrifique uma criatura" causa o mesmo dano', () => {
  let s = mesa(); let a, u, t; [s, a] = poe(s, 0, 'Arremesso', 'hand'); [s, u] = poe(s, 0, 'Urso', 'battlefield'); [s, t] = poe(s, 0, 'Twincast', 'hand'); s = mana(s);
  s = conjura(s, 0, a, x => x.targets[0].player === 1);
  eq(s.objects[u].zone, 'graveyard', 'sacrificou o Urso');
  s = conjura(s, 0, t, x => x.targets[0].oid === a);
  s = resolve(s, alvoJogador(1));
  eq(s.players[1].life, 16, '2 + 2');
});

test('CR 707.10 · T-110: Lithoform Engine copia uma Aura — a ficha encanta o mesmo alvo', () => {
  let s = mesa(); let e, en, u; [s, e] = poe(s, 0, 'Lithoform Engine', 'battlefield'); [s, en] = poe(s, 0, 'Encanto', 'hand'); [s, u] = poe(s, 0, 'Urso', 'battlefield'); s = mana(s);
  s = conjura(s, 0, en, x => x.targets && x.targets[0].oid === u);
  s = act(s, legais(s, 0, x => x.t === 'activate' && x.oid === e && x.index === 2 && x.targets[0].oid === en)[0]);
  s = resolve(s);
  eq(E.stats(s, s.objects[u]).power, 6, 'duas Auras de +2/+0');
});

test('CR 708.10 / 707.10b · T-110: textos — a cópia não revela a mágica virada para baixo; seletor de habilidade descrito; validador', () => {
  assert.match(T.descreveEfeitos([{ do: 'copia_habilidade', target: { zona: 'stack', habilidades: 'disparadas', de: 'you' } }]), /habilidade disparada sua/);
  assert.match(T.descreveEfeitos([{ do: 'copia_magia', target: { zona: 'stack', permanente: true, de: 'you' } }]), /mágica de permanente sua/);
  const v = sc => J(SC.validateScript({ name: 'X', ...sc, example: { target: 'none', expect: { selfLife: 0 } } }));
  assert.ok(v({ effects: [{ do: 'copia_magia', target: { tipos: ['instant'] } }] }).some(e => /stack/.test(e)), 'sem zona stack');
  assert.ok(v({ effects: [{ do: 'copia_habilidade', target: { zona: 'stack' } }] }).some(e => /habilidades/.test(e)), 'sem habilidades');
  assert.ok(v({ effects: [{ do: 'destroy', target: { habilidades: 'so' } }] }).some(e => /zona 'stack'/.test(e)), 'habilidades fora da pilha');
});
