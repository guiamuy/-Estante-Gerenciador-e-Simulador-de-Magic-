// T-22 · CR5 · Aura que entra no campo sem ser conjurada (Comprehensive Rules 303.4f e 303.4g, com 704.5m e 702.16).
// Texto da regra: .regras/cr-2026-09-25.txt. As cartas "de teste" são scripts sintéticos que isolam a regra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, S, J, act, poe, legais, passaAte } from './listas.mjs';

const C = {};
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
C.Plains = { name: 'Plains', type_line: 'Basic Land — Plains', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {W}.)', colors: [] };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = {
  // "Enchant creature · Enchanted creature gets +2/+2."
  'Armadura': { name: 'Armadura', aura: { enchant: 'creature' }, grants: { power: 2, toughness: 2 }, ...EX },
  // "Enchant creature you control · Enchanted creature gets +1/+1."
  'Escudo': { name: 'Escudo', aura: { enchant: 'creature-you-control' }, grants: { power: 1, toughness: 1 }, ...EX },
  // "Ponha no campo, sob seu controle, uma carta alvo do seu cemitério."
  'Retorno': { name: 'Retorno', effects: [{ do: 'mover', target: { zona: 'graveyard', de: 'you' }, para: 'battlefield' }], ...EX },
  // T-23 · cartas das divergências da auditoria
  'RetornaEVarre': { name: 'RetornaEVarre', effects: [{ do: 'mover', target: { zona: 'graveyard', de: 'you' }, para: 'battlefield' }, { do: 'destroy_all', types: ['enchantment'] }], ...EX },
  'RetornaEMata': { name: 'RetornaEMata', effects: [{ do: 'mover', target: { zona: 'graveyard', de: 'you' }, para: 'battlefield' }, { do: 'destroy', target: 'creature' }], ...EX },
  'Necromancia': { name: 'Necromancia', effects: [{ do: 'mover', target: { zona: 'graveyard' }, para: 'battlefield' }], ...EX },
};
carta('Armadura', 'Enchantment — Aura'); carta('Escudo', 'Enchantment — Aura'); carta('Retorno', 'Sorcery'); carta('RetornaEVarre', 'Sorcery'); carta('RetornaEMata', 'Sorcery'); carta('Necromancia', 'Sorcery');
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' });
carta('Lobo', 'Creature — Wolf', { power: '3', toughness: '3' });
carta('Sombra', 'Creature — Shade', { power: '1', toughness: '1', keywords: ['Hexproof'], oracle_text: 'Hexproof' });
carta('Muralha', 'Creature — Wall', { power: '0', toughness: '4', oracle_text: 'Protection from enchantments' });

const TODAS = ['Armadura', 'Escudo', 'Retorno', 'RetornaEVarre', 'RetornaEMata', 'Necromancia', 'Urso', 'Lobo', 'Sombra', 'Muralha'];
function mesa() {
  const deck = [...TODAS.map(name => ({ name, qty: 4, zone: 'main' })), { name: 'Plains', qty: 12, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = s => { s = J(s); for (const c of 'WUBRG') s.players[0].pool[c] += 5; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const pt = (s, oid) => { const st = E.stats(s, s.objects[oid]); return [st.power, st.toughness]; };
/** A conjura Retorno trazendo `aura` do cemitério; para na primeira decisão (ou com a pilha vazia). */
function retorna(s, aura = 'Armadura') {
  let au = s.zones[0].graveyard.find(o => s.objects[o].name === aura), r; if (!au) [s, au] = poe(s, 0, aura, 'graveyard'); [s, r] = poe(s, 0, 'Retorno', 'hand'); s = mana(s);
  const a = legais(s, 0, x => x.t === 'cast' && x.oid === r && (x.targets || []).some(t => t.oid === au))[0]; assert.ok(a, 'Retorno mira a Aura');
  return [passaAte(act(s, a), x => !!x.pending || !x.stack.length), au];
}

test('CR 303.4f · Aura que entra sem ser conjurada, com uma só permanente que ela pode encantar: entra anexada a ela, sem perguntar', () => {
  let s = mesa(); let u; [s, u] = poe(s, 0, 'Urso');
  let au; [s, au] = retorna(s);
  eq([s.objects[au].zone, s.objects[au].attachedTo, s.pending, pt(s, u)], ['battlefield', u, null, [4, 4]]);
});

test('CR 303.4f · com mais de uma, quem a controla escolhe o que ela encanta (sem mirar: a criatura com resistência a magia do oponente vale; a com proteção contra encantamentos, não) — e ela não cai enquanto a escolha está aberta', () => {
  let s = mesa(); let u; [s, u] = poe(s, 0, 'Urso'); let l; [s, l] = poe(s, 1, 'Lobo'); let h; [s, h] = poe(s, 1, 'Sombra'); let m; [s, m] = poe(s, 1, 'Muralha');
  let au; [s, au] = retorna(s);
  eq([s.pending && s.pending.kind, s.pending && s.pending.p, s.objects[au].zone], ['aura_anexo', 0, 'battlefield'], 'a decisão abre e a Aura espera no campo');
  const ofertas = legais(s, 0, x => x.t === 'aura_anexo');
  eq(ofertas.map(x => x.oid).sort(), [u, l, h].sort(), 'Urso, Lobo e Sombra (resistência a magia não impede); a Muralha não');
  assert.throws(() => E.apply(s, { t: 'aura_anexo', p: 0, oid: m }), /encantar/);
  assert.throws(() => E.apply(s, { t: 'pass', p: 0 }));
  s = act(s, ofertas.find(x => x.oid === l));
  eq([s.objects[au].attachedTo, s.pending, pt(s, l), s.objects[au].controller], [l, null, [5, 5], 0], 'encanta o Lobo de B; a Aura continua de A');
});

test('CR 303.4g · sem nada que ela possa encantar, a Aura não entra: fica na zona em que estava', () => {
  let s = mesa(); let m; [s, m] = poe(s, 1, 'Muralha');
  let au; [s, au] = poe(s, 0, 'Armadura', 'graveyard'); const antes = s.objects[au].zc || 0;
  [s] = retorna(s);
  eq([s.objects[au].zone, s.pending, s.objects[au].zc || 0], ['graveyard', null, antes], 'nem passou pelo campo (o objeto é o mesmo: não entrou e caiu)');
});

test('CR 303.4f · "Enchant creature you control": só as criaturas de quem controla a Aura são opções', () => {
  let s = mesa(); let u; [s, u] = poe(s, 0, 'Urso'); let l; [s, l] = poe(s, 1, 'Lobo');
  let au; [s, au] = retorna(s, 'Escudo');
  eq([s.objects[au].attachedTo, s.pending, pt(s, u)], [u, null, [3, 3]], 'uma opção só (o Urso): sem perguntar');
});

/* ---------------- T-23 · correções da auditoria independente ---------------- */
test('CR 400.7 · a Aura que esperava a escolha e saiu do campo não leva a espera para a próxima vida: conjurada depois, entra no alvo dela, sem nova escolha', () => {
  let s = mesa(); let u; [s, u] = poe(s, 0, 'Urso'); let l; [s, l] = poe(s, 1, 'Lobo');
  let au; [s, au] = poe(s, 0, 'Armadura', 'graveyard'); let r; [s, r] = poe(s, 0, 'RetornaEVarre', 'hand'); s = mana(s);
  s = passaAte(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === r && (x.targets || []).some(t => t.oid === au))[0]), x => !!x.pending || !x.stack.length);
  eq([s.objects[au].zone, s.pending], ['graveyard', null], 'a Aura foi varrida na mesma resolução');
  s = J(s); const g = s.zones[0].graveyard; g.splice(g.indexOf(au), 1); s.zones[0].hand.push(au); s.objects[au].zone = 'hand'; s = mana(s);
  s = passaAte(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === au && (x.targets || []).some(t => t.oid === l))[0]), x => !!x.pending || !x.stack.length);
  eq([s.objects[au].attachedTo, s.pending], [l, null]);
});

test('CR 303.4f · a escolha é feita com as opções de quando a Aura entrou: a criatura destruída depois, na mesma resolução, continua opção (e a Aura cai se for a escolhida)', () => {
  const monta = () => { let s = mesa(); let u; [s, u] = poe(s, 0, 'Urso'); let l; [s, l] = poe(s, 1, 'Lobo');
    let au; [s, au] = poe(s, 0, 'Armadura', 'graveyard'); let r; [s, r] = poe(s, 0, 'RetornaEMata', 'hand'); s = mana(s);
    const a = legais(s, 0, x => x.t === 'cast' && x.oid === r && (x.targets || []).some(t => t.oid === au) && (x.targets || []).some(t => t.oid === l))[0]; assert.ok(a, 'oferta');
    return [passaAte(act(s, a), x => !!x.pending || !x.stack.length), u, l, au]; };
  let [s, u, l, au] = monta();
  eq([s.objects[l].zone, s.pending && s.pending.kind, J(s.pending.options).sort()], ['graveyard', 'aura_anexo', [u, l].sort()]);
  let t = act(s, { t: 'aura_anexo', p: 0, oid: l });
  assert.equal(t.objects[au].zone, 'graveyard', 'escolheu o Lobo, que já não está: a Aura cai (704.5m)');
  t = act(s, { t: 'aura_anexo', p: 0, oid: u });
  eq([t.objects[au].attachedTo, pt(t, u)], [u, [4, 4]]);
});

test('CR 303.4g · a Aura que não entra fica como estava: o efeito não muda quem a controla nem diz que a moveu', () => {
  let s = mesa(); let au; [s, au] = poe(s, 1, 'Armadura', 'graveyard'); let r; [s, r] = poe(s, 0, 'Necromancia', 'hand'); s = mana(s);
  const a = legais(s, 0, x => x.t === 'cast' && x.oid === r && (x.targets || []).some(t => t.oid === au))[0]; assert.ok(a, 'Necromancia mira a Aura do cemitério de B');
  const r1 = E.apply(act(s, a), { t: 'pass', p: 0 }), r2 = E.apply(r1.state, { t: 'pass', p: 1 });
  s = r2.state;
  eq([s.objects[au].zone, s.objects[au].controller], ['graveyard', 1]);
  assert.ok(!r2.events.some(e => e.do === 'mover' && !e.failed), 'nenhum evento de "foi para o campo": ' + JSON.stringify(r2.events.filter(e => e.do === 'mover')));
});
