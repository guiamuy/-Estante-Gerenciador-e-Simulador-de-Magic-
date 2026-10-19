// M-526 · LT188 · revisão por lote CLXIV: "Whenever you cast your second spell each turn" (Flurry; textos da Scryfall de 19/10/2026) —
// só a segunda mágica que o jogador conjurou neste turno (a ordem marcada na mágica pela M-442). Cori-Steel Cutter ("create a 1/1 white Monk
// creature token with prowess. You may attach this Equipment to it", 301.5), Pyromancer's Assault, Monk of the Open Hand, Jori En e Clarion
// Spirit. Falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const KW = { 'Cori-Steel Cutter': ['Flurry', 'Equip'], 'Monk of the Open Hand': ['Flurry of Blows'] };
const NOMES = ['Cori-Steel Cutter', "Pyromancer's Assault", 'Monk of the Open Hand', 'Jori En, Ruin Diver', 'Clarion Spirit'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: KW[n] || [], oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Mountain: terra('Mountain', 'Mountain', 'R'), Forest: terra('Forest', 'Forest', 'G'),
  'Faithless Looting': { name: 'Faithless Looting', type_line: 'Sorcery', mana_cost: '{R}', cmc: 1, keywords: ['Flashback'], oracle_text: 'Draw two cards, then discard two cards.\nFlashback {2}{R} (You may cast this card from your graveyard for its flashback cost. Then exile it.)', colors: ['R'] },
  'Fiery Temper': { name: 'Fiery Temper', type_line: 'Instant', mana_cost: '{1}{R}{R}', cmc: 3, keywords: ['Madness'], oracle_text: 'Fiery Temper deals 3 damage to any target.\nMadness {R} (If you discard this card, discard it into exile. When you do, cast it for its madness cost or put it into your graveyard.)', colors: ['R'] },
  'Lightning Bolt': { name: 'Lightning Bolt', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: 'Lightning Bolt deals 3 damage to any target.', colors: ['R'] },
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] } });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 208, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Lightning Bolt', 'Faithless Looting', 'Fiery Temper', 'Mountain', 'Forest', 'Urso']) }, { name: 'B', deck: b(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };
const limpa = s => passaAte(s, x => !x.stack.length && !x.pending && !(x.queued || []).length);
// um Raio no oponente; quando o gatilho pede alvo ("any target"), mira o oponente também
const raio = (s, lb0) => { let lb = lb0; if (lb == null) [s, lb] = poe(s, 0, 'Lightning Bolt', 'hand'); s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === lb && a.targets && a.targets[0] && a.targets[0].player === 1)[0]);
  for (let i = 0; i < 12 && (s.stack.length || s.pending || (s.queued || []).length); i++) { s = passaAte(s, x => !x.stack.length && !(x.queued || []).length || !!x.pending); if (s.pending) { const pd = s.pending, i = pd.kind === 'pick_target' ? (pd.options || pd.targets || []).findIndex(o => o && o.player === 1) : -1; const a = i >= 0 ? { t: 'pick_target', p: pd.p, index: i } : pd.kind === 'may_pay' ? null : legais(s, pd.p)[0]; if (!a) break; s = act(s, a); } } // dois gatilhos juntos pedem a ordem: quem controla decide
  return s; };

test("M-526 · Pyromancer's Assault: só a segunda mágica do turno causa 2 de dano", () => {
  let s = mesa(); [s] = poe(s, 0, "Pyromancer's Assault"); s = terras(s, 'Mountain', 3); const v = s.players[1].life;
  s = raio(s); assert.equal(s.players[1].life, v - 3, 'primeira: só o Raio');
  s = raio(s); assert.equal(s.players[1].life, v - 3 - 3 - 2, 'segunda: Raio + 2 do gatilho');
  s = raio(s); assert.equal(s.players[1].life, v - 3 - 3 - 2 - 3, 'terceira: só o Raio');
});

test('M-526 · a contagem é por turno: a mágica do turno anterior não conta', () => {
  let s = mesa(), m; [s, m] = poe(s, 0, 'Monk of the Open Hand'); s = terras(s, 'Mountain', 2);
  s = raio(s); s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && x.turn.number > 2 && !x.stack.length && !x.pending);
  s = J(s); for (const o of s.zones[0].battlefield) s.objects[o].tapped = false;
  s = raio(s); assert.equal((s.objects[m].counters || {}).p1p1 || 0, 0, 'primeira deste turno');
  s = raio(s); assert.equal(s.objects[m].counters.p1p1, 1, 'segunda deste turno');
});

test('M-526 · Cori-Steel Cutter: na segunda mágica cria um Monge 1/1 branco com proeza e pode se anexar a ele', () => {
  const roda = aceita => {
    let s = mesa(), cc; [s, cc] = poe(s, 0, 'Cori-Steel Cutter'); s = terras(s, 'Mountain', 2);
    s = raio(s); let lb; [s, lb] = poe(s, 0, 'Lightning Bolt', 'hand');
    s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === lb && a.targets && a.targets[0] && a.targets[0].player === 1)[0]);
    s = passaAte(s, x => !!x.pending && x.pending.kind === 'may_pay');
    const monge = s.zones[0].battlefield.find(o => s.objects[o].name === 'Monk'); assert.ok(monge, 'o Monge nasceu'); assert.ok(E.hasKeyword(s, s.objects[monge], 'prowess'));
    s = limpa(act(s, legais(s, 0, a => a.t === (aceita ? 'pay' : 'decline'))[0]));
    return [s, monge, cc];
  };
  let [s, mo, cc] = roda(true); assert.equal(s.objects[cc].attachedTo, mo); assert.ok(E.hasKeyword(s, s.objects[mo], 'trample')); assert.ok(E.hasKeyword(s, s.objects[mo], 'haste'));
  assert.equal(E.stats(s, s.objects[mo]).power, 2, '1 + 1 do Equipamento (a proeza do Raio já passou pela pilha antes do Monge nascer)');
  [s, mo, cc] = roda(false); assert.ok(!s.objects[cc].attachedTo, 'recusou: fica solta');
});

test('M-526 · Jori En compra e Clarion Spirit cria um Espírito 1/1 voador na segunda mágica', () => {
  let s = mesa(); [s] = poe(s, 0, 'Jori En, Ruin Diver'); [s] = poe(s, 0, 'Clarion Spirit'); s = terras(s, 'Mountain', 2);
  s = raio(s); let lb; [s, lb] = poe(s, 0, 'Lightning Bolt', 'hand'); const mao = s.zones[0].hand.length; s = raio(s, lb);
  assert.equal(s.zones[0].hand.length, mao - 1 + 1, 'o Raio saiu e Jori comprou'); const es = s.zones[0].battlefield.filter(o => s.objects[o].name === 'Spirit');
  assert.equal(es.length, 1); assert.ok(E.hasKeyword(s, s.objects[es[0]], 'flying'));
});

test('M-526 · a mágica conjurada pela insanidade conta como a segunda do turno (achado da revisão)', () => {
  let s = mesa(), m, fl, ft; [s, m] = poe(s, 0, 'Monk of the Open Hand'); s = terras(s, 'Mountain', 2); [s, fl] = poe(s, 0, 'Faithless Looting', 'hand'); [s, ft] = poe(s, 0, 'Fiery Temper', 'hand');
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === fl && !a.flashback)[0]);
  for (let i = 0; i < 30 && (s.stack.length || s.pending || (s.queued || []).length); i++) {
    s = passaAte(s, x => !x.stack.length && !(x.queued || []).length || !!x.pending); if (!s.pending) break; const pd = s.pending;
    const a = pd.kind === 'discard' ? (legais(s, pd.p, x => x.oid === ft)[0] || legais(s, pd.p)[0]) : pd.kind === 'pick' ? (legais(s, pd.p, x => x.t === 'pick' && x.oid === ft)[0] || legais(s, pd.p, x => x.t === 'pick')[0] || legais(s, pd.p)[0])
      : legais(s, pd.p, x => x.t === 'cast_madness' && x.targets && x.targets[0] && x.targets[0].player === 1)[0] || legais(s, pd.p, x => (x.t === 'cast_madness' || x.t === 'madness') && !x.decline)[0] || legais(s, pd.p, x => x.t === 'pay')[0] || legais(s, pd.p)[0];
    s = act(s, a); }
  assert.notEqual(s.objects[ft].zone, 'hand', 'o Fiery Temper foi descartado');
  assert.equal((s.objects[m].counters || {}).p1p1, 1, 'a insanidade foi a segunda mágica: o Monge ganhou o marcador');
});

test('M-526 · Cori-Steel Cutter que saiu e voltou antes da resolução é outro objeto (400.7): nada a anexar', () => {
  let s = mesa(), cc; [s, cc] = poe(s, 0, 'Cori-Steel Cutter'); s = terras(s, 'Mountain', 2);
  s = raio(s); let lb; [s, lb] = poe(s, 0, 'Lightning Bolt', 'hand');
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === lb && a.targets && a.targets[0] && a.targets[0].player === 1)[0]);
  assert.ok(s.stack.length >= 2 || (s.queued || []).length, 'o gatilho está esperando');
  s = J(s); E.moveObject(s, cc, 'hand'); E.moveObject(s, cc, 'battlefield');
  s = passaAte(s, x => !x.stack.length && !(x.queued || []).length || !!x.pending);
  assert.ok(!(s.pending && s.pending.kind === 'may_pay'), 'não pergunta'); s = limpa(s); assert.ok(!s.objects[cc].attachedTo);
});
