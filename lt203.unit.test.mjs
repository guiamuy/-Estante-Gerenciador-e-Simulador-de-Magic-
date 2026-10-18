// M-521 · LT183 · revisão por lote CLIX: nove cartas que o leitor já lia por inteiro e que mais travam listas do catálogo (textos da
// Scryfall de 18/10/2026): Vivid Crag, Vivid Marsh, Sejiri Steppe, Silent Clearing, Llanowar Reborn, Eladamri's Call, Mana Tithe,
// Sword of the Animist e Light Up the Stage. Falham no motor anterior porque as cartas não estavam aprovadas; o gatilho da Sejiri Steppe pede a
// cor na resolução (M-521: antes o gatilho de "protection from the color of your choice" resolvia sem cor e não protegia).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const KW = { 'Llanowar Reborn': ['Graft'], 'Sword of the Animist': ['Equip'], 'Light Up the Stage': ['Spectacle'] }; // campo keywords da Scryfall
const NOMES = ['Vivid Crag', 'Sejiri Steppe', 'Silent Clearing', "Eladamri's Call", 'Mana Tithe', 'Sword of the Animist', 'Vivid Marsh', 'Llanowar Reborn', 'Light Up the Stage'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: KW[n] || [], oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Plains: terra('Plains', 'Plains', 'W'), Mountain: terra('Mountain', 'Mountain', 'R'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G'),
  'Lightning Bolt': { name: 'Lightning Bolt', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: 'Lightning Bolt deals 3 damage to any target.', colors: ['R'] },
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] } });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 203, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Plains', 'Mountain', 'Swamp', 'Forest', 'Urso', 'Lightning Bolt']) }, { name: 'B', deck: b(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };
const limpa = s => passaAte(s, x => !x.stack.length && !x.pending && !(x.queued || []).length);
const conj = (s, oid, f = () => true) => { const a = legais(s, 0, x => x.t === 'cast' && x.oid === oid && f(x))[0]; assert.ok(a, 'conjurar ' + s.objects[oid].name); return act(s, a); };
const joga = (s, oid) => act(s, legais(s, 0, a => a.t === 'play_land' && a.oid === oid)[0]);

test('M-521 · Vivid Crag e Vivid Marsh entram virados com dois marcadores; qualquer cor gasta um marcador', () => {
  for (const [n, cor] of [['Vivid Crag', 'R'], ['Vivid Marsh', 'B']]) {
    let s = mesa(), v; [s, v] = poe(s, 0, n, 'hand'); s = limpa(joga(s, v));
    assert.equal(s.objects[v].tapped, true, n); assert.equal(s.objects[v].counters.charge, 2);
    s = J(s); s.objects[v].tapped = false; assert.ok(legais(s, 0, a => a.oid === v && a.color === cor).length > 0);
    s = act(s, legais(s, 0, a => a.t === 'activate' && a.oid === v && a.color === 'G')[0]); assert.equal(s.objects[v].counters.charge, 1); assert.equal(s.players[0].pool.G, 1);
  }
});

test('M-521 · Sejiri Steppe entra virada; o gatilho pergunta a cor na resolução e dá proteção a uma criatura sua até o fim do turno', () => {
  let s = mesa(), st, u, lb; [s, st] = poe(s, 0, 'Sejiri Steppe', 'hand'); [s, u] = poe(s, 0, 'Urso'); [s, lb] = poe(s, 0, 'Lightning Bolt', 'hand'); [s] = poe(s, 0, 'Mountain');
  s = passaAte(joga(s, st), x => !!x.pending && x.pending.kind === 'choose_color');
  assert.equal(s.objects[st].tapped, true); assert.equal(s.pending.p, 0, 'quem controla escolhe'); assert.equal(s.objects[s.pending.oid].name, 'Sejiri Steppe', 'a pergunta mostra a fonte');
  s = limpa(act(s, legais(s, 0, a => a.t === 'choose_color' && a.color === 'R')[0]));
  assert.deepEqual([...(s.objects[u].tempProtection || [])], ['R']); assert.equal(s.objects[st].chosenColor, undefined, 'a cor não fica guardada na terra');
  assert.equal(legais(s, 0, a => a.t === 'cast' && a.oid === lb && a.targets && a.targets[0] && a.targets[0].oid === u).length, 0, 'proteção do vermelho: o Bolt não mira a Urso');
  s = passaAte(s, x => x.turn.active === 1); assert.equal((s.objects[u].tempProtection || []).length, 0, 'acabou no fim do turno');
});

test('M-521 · Silent Clearing: {T} e 1 de vida por {W} ou {B}; {1}, {T}, sacrifica: compra', () => {
  let s = mesa(), sc; [s, sc] = poe(s, 0, 'Silent Clearing'); const v = s.players[0].life;
  assert.deepEqual(JSON.parse(JSON.stringify(E.productions(s, s.objects[sc]))), [['W'], ['B']], 'só W ou B');
  s = act(s, { t: 'tap_mana', p: 0, oid: sc, option: 1 }); assert.equal(s.players[0].life, v - 1); assert.equal(s.players[0].pool.B, 1);
  let t = mesa(), sc2; [t, sc2] = poe(t, 0, 'Silent Clearing'); [t] = poe(t, 0, 'Forest'); const mao = t.zones[0].hand.length;
  t = limpa(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === sc2 && a.color == null)[0]));
  assert.equal(t.objects[sc2].zone, 'graveyard'); assert.equal(t.zones[0].hand.length, mao + 1);
});

test('M-521 · Llanowar Reborn entra virada com um +1/+1; quando uma criatura entra, pode mover o marcador para ela (enxerto 1)', () => {
  let s = mesa(), lr, u; [s, lr] = poe(s, 0, 'Llanowar Reborn', 'hand'); s = limpa(joga(s, lr));
  assert.equal(s.objects[lr].tapped, true); assert.equal(s.objects[lr].counters.p1p1, 1);
  [s, u] = poe(s, 0, 'Urso', 'hand'); s = terras(s, 'Forest', 2);
  s = passaAte(conj(s, u), x => !!x.pending && x.pending.kind === 'may_pay' || !x.stack.length && !(x.queued || []).length);
  assert.equal(s.pending && s.pending.kind, 'may_pay', 'pergunta se move'); s = limpa(act(s, legais(s, 0, a => a.t === 'pay')[0]));
  assert.equal(s.objects[u].counters.p1p1, 1); assert.equal(s.objects[lr].counters.p1p1 || 0, 0);
});

test("M-521 · Eladamri's Call busca uma criatura, mostra e põe na mão", () => {
  let s = mesa(), ec; [s, ec] = poe(s, 0, "Eladamri's Call", 'hand'); [s] = poe(s, 0, 'Forest'); [s] = poe(s, 0, 'Plains');
  s = passaAte(conj(s, ec), x => !!x.pending && x.pending.kind === 'pick');
  assert.ok([...s.pending.from].every(o => s.objects[o].name === 'Urso'), 'só criatura'); const o = s.pending.from[0];
  s = act(s, legais(s, 0, a => a.t === 'pick' && a.oid === o)[0]); if (s.pending && s.pending.kind === 'pick') s = act(s, legais(s, 0, a => a.t === 'pick_done')[0]);
  s = limpa(s); assert.equal(s.objects[o].zone, 'hand');
});

test('M-521 · Mana Tithe anula a mágica alvo a menos que quem a controla pague {1}', () => {
  const roda = (sobra, paga) => {
    let s = mesa(), u, mt; [s, u] = poe(s, 0, 'Urso', 'hand'); [s, mt] = poe(s, 0, 'Mana Tithe', 'hand'); s = terras(s, 'Forest', 2); [s] = poe(s, 0, 'Plains'); if (sobra) [s] = poe(s, 0, 'Swamp');
    s = conj(s, u, x => !x.pay || true); s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === mt && a.targets && a.targets[0] && a.targets[0].oid === u && !(a.pay && a.pay.lands && a.pay.lands.length > 1))[0]);
    s = passaAte(s, x => !!x.pending && x.pending.kind === 'may_pay' || !x.stack.length);
    if (s.pending && s.pending.kind === 'may_pay') { assert.ok(sobra, 'só pergunta quem pode pagar'); s = act(s, legais(s, 0, a => a.t === (paga ? 'pay' : 'decline'))[0]); }
    s = limpa(s); return s.objects[u].zone;
  };
  assert.equal(roda(false), 'graveyard', 'sem mana sobrando: anulada'); assert.equal(roda(true, false), 'graveyard', 'recusou'); assert.equal(roda(true, true), 'battlefield', 'pagou');
});

test('M-521 · Sword of the Animist: +1/+1 e, quando a equipada ataca, pode buscar um terreno básico virado', () => {
  let s = mesa(), sw, u; [s, sw] = poe(s, 0, 'Sword of the Animist'); [s, u] = poe(s, 0, 'Urso'); s = terras(s, 'Forest', 2);
  s = limpa(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === sw)[0])); assert.equal(E.stats(s, s.objects[u]).power, 3);
  const n = s.zones[0].battlefield.length;
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0); s = act(s, { t: 'attack', p: 0, attackers: [u] });
  s = passaAte(s, x => !!x.pending && (x.pending.kind === 'may_pay' || x.pending.kind === 'pick'));
  if (s.pending.kind === 'may_pay') s = passaAte(act(s, legais(s, 0, a => a.t === 'pay')[0]), x => !!x.pending && x.pending.kind === 'pick');
  const o = s.pending.from[0]; assert.ok(/Basic Land/.test(C[s.objects[o].name].type_line), 'só básico');
  s = act(s, legais(s, 0, a => a.t === 'pick' && a.oid === o)[0]); if (s.pending && s.pending.kind === 'pick') s = act(s, legais(s, 0, a => a.t === 'pick_done')[0]);
  s = limpa(s); assert.equal(s.objects[o].zone, 'battlefield'); assert.equal(s.objects[o].tapped, true); assert.equal(s.zones[0].battlefield.length, n + 1);
});

test('M-521 · Light Up the Stage: espetáculo {R} depois que o oponente perdeu vida; exila dois do topo, jogáveis até o fim do seu próximo turno', () => {
  let s = mesa(), l, ch; [s, l] = poe(s, 0, 'Light Up the Stage', 'hand'); [s, ch] = poe(s, 0, 'Lightning Bolt', 'hand'); s = terras(s, 'Mountain', 2);
  assert.equal(legais(s, 0, a => a.t === 'cast' && a.oid === l).length, 0, 'sem perda de vida e só 2 terrenos: não dá');
  s = limpa(conj(s, ch, x => x.targets && x.targets[0] && x.targets[0].player === 1));
  s = J(s); const fl = s.zones[0].library.find(o => s.objects[o].name === 'Forest'); s.zones[0].library = [fl, ...s.zones[0].library.filter(o => o !== fl)];
  const topo = s.zones[0].library.slice(0, 2);
  s = limpa(conj(s, l)); for (const o of topo) assert.equal(s.objects[o].zone, 'exile');
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && x.turn.number > 2 && !x.stack.length && !x.pending);
  assert.ok(legais(s, 0, a => a.t === 'play_land' && a.oid === fl).length > 0, 'no seu próximo turno ainda joga o Forest exilado');
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending); s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  assert.equal(legais(s, 0, a => a.t === 'play_land' && a.oid === fl).length, 0, 'depois do seu próximo turno, não');
});
