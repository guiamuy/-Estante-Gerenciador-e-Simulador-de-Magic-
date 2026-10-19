// M-531 · LT193 · revisão por lote CLXIX (textos da Scryfall de 19/10/2026): o leitor lê a segunda face das cartas de Aventura (715) e de
// preparação (722) — o verso vem das faces da carta, como o app recebe da Scryfall. Brazen Borrower // Petty Theft (Aventura; "can block only
// creatures with flying", 509.1b) e Pompous Battlemage // Improvised Act ("This creature enters prepared", 722.3a). Falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const BB = 'Brazen Borrower // Petty Theft', PB = 'Pompous Battlemage // Improvised Act';
const of = n => { const c = OF.find(x => x.name === n); return { name: n, layout: c.layout, faces: c.faces, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: c.keywords || [], oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], power: c.power, toughness: c.toughness }; };
const C = { 'Brazen Borrower': of(BB), 'Pompous Battlemage': of(PB) };
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Island: terra('Island', 'Island', 'U'), Mountain: terra('Mountain', 'Mountain', 'R'), Forest: terra('Forest', 'Forest', 'G'),
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] },
  Ave: { name: 'Ave', type_line: 'Creature — Bird', mana_cost: '{1}{U}', cmc: 2, keywords: ['Flying'], oracle_text: 'Flying', power: '1', toughness: '1', colors: ['U'] },
  Amuleto: { name: 'Amuleto', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] } });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 213, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Brazen Borrower', 'Pompous Battlemage', 'Urso', 'Island', 'Mountain', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Ave', 'Amuleto', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };
const limpa = s => passaAte(s, x => !x.stack.length && !x.pending && !(x.queued || []).length);

test('M-531 · as duas cartas jogam (lidas e aprovadas), com a segunda face lida das faces da carta', () => {
  for (const n of [BB, PB]) assert.equal(S.coverage(of(n)).level, 'completo', n);
  const s = mesa(), sb = s.facts['Brazen Borrower'].script, sp = s.facts['Pompous Battlemage'].script;
  assert.equal(sb.back.name || sb.back, 'Petty Theft'); assert.equal(sb.omen.mana, '{1}{U}'); assert.ok(sb.self.aventura);
  assert.equal(sp.back.name || sp.back, 'Improvised Act'); assert.equal(s.facts['Improvised Act'].cost.colored.R, 1); assert.equal(s.facts['Improvised Act'].cost.generic || 0, 0); assert.ok(sp.self.preparo && sp.self.entraPreparada);
});

test('M-531 · Petty Theft devolve permanente não terreno de um oponente; o Brazen Borrower vai ao exílio e pode ser conjurado de lá', () => {
  let s = mesa(), bb, am, fo, u; [s, bb] = poe(s, 0, 'Brazen Borrower', 'hand'); s = terras(s, 'Island', 5); [s, am] = poe(s, 1, 'Amuleto'); [s, fo] = poe(s, 1, 'Forest'); [s, u] = poe(s, 0, 'Urso');
  const av = legais(s, 0, x => x.t === 'cast' && x.oid === bb && x.omen);
  assert.ok(av.some(x => x.targets[0].oid === am), 'mira o artefato do oponente');
  assert.ok(!av.some(x => x.targets[0].oid === fo || x.targets[0].oid === u), 'nem terreno nem permanente sua');
  s = limpa(act(s, av.find(x => x.targets[0].oid === am)));
  assert.equal(s.objects[am].zone, 'hand'); assert.equal(s.objects[bb].zone, 'exile');
  const cr = legais(s, 0, x => x.t === 'cast' && x.oid === bb && !x.omen); assert.ok(cr.length, 'do exílio, a criatura');
  s = limpa(act(s, cr[0])); assert.equal(s.objects[bb].zone, 'battlefield');
});

test('M-531 · Brazen Borrower só bloqueia criaturas com voar', () => {
  const tenta = atacante => { let s = mesa(), bb, at; [s, bb] = poe(s, 0, 'Brazen Borrower'); [s, at] = poe(s, 1, atacante);
    s = passaAte(s, x => x.turn.active === 1 && !!x.pending && x.pending.kind === 'attackers' && x.pending.p === 1);
    s = act(s, { t: 'attack', p: 1, attackers: [at] }); s = passaAte(s, x => !!x.pending && x.pending.kind === 'blockers');
    try { E.apply(s, { t: 'block', p: 0, blocks: [[bb, at]] }); return true; } catch { return false; } };
  assert.equal(tenta('Ave'), true); assert.equal(tenta('Urso'), false);
});

test('M-531 · Pompous Battlemage entra preparado: a cópia de Improvised Act fica no exílio e conjurá-la desprepara', () => {
  let s = mesa(), pb; [s, pb] = poe(s, 0, 'Pompous Battlemage', 'hand'); s = terras(s, 'Mountain', 2);
  s = limpa(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === pb)[0]));
  assert.equal(s.objects[pb].zone, 'battlefield'); assert.equal(E.preparadaT(s, s.objects[pb]), true);
  const cp = s.zones[0].exile.map(x => s.objects[x]).find(o => o && o.copiaPreparoT); assert.ok(cp); assert.equal(cp.name, 'Improvised Act');
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === cp.oid)[0]); assert.equal(E.preparadaT(s, s.objects[pb]), false);
});
