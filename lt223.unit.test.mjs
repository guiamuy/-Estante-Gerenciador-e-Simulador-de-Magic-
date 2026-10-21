// M-541 · LT203 · revisão por lote CLXXIX (texto da Scryfall de 20/10/2026): Questing Druid // Seek the Beast ("Whenever you cast a spell
// that's white, blue, black, or red, put a +1/+1 counter on this creature." / "Exile the top two cards of your library. Until your next end
// step, you may play those cards."). "Until your next end step" acaba quando o seu próximo passo final começa (514; se o efeito nasce no seu
// passo final, vale até o do seu próximo turno). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const QD = 'Questing Druid // Seek the Beast';
const of = n => { const c = OF.find(x => x.name === n); return { name: n, layout: c.layout, faces: c.faces, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: ['G'], power: c.power, toughness: c.toughness }; };
const C = { 'Questing Druid': of(QD) };
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
const inst = (name, cost, cor) => ({ name, type_line: 'Instant', mana_cost: cost, cmc: valorDeMana(cost), keywords: [], oracle_text: '', colors: cor ? [cor] : [] });
Object.assign(C, { Mountain: terra('Mountain', 'Mountain', 'R'), Forest: terra('Forest', 'Forest', 'G'),
  Faisca: inst('Faisca', '{R}', 'R'), Broto: inst('Broto', '{G}', 'G'), Nada: inst('Nada', '{1}', null) });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 223, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Questing Druid', 'Faisca', 'Broto', 'Nada', 'Mountain', 'Forest']) }, { name: 'B', deck: b(['Faisca', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const terras = (s, p, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, p, n); return s; };
const limpa = s => passaAte(s, x => !x.stack.length && !x.pending && !(x.queued || []).length);
const marcadores = (s, o) => (s.objects[o].counters || {}).p1p1 || 0;

test('M-541 · Questing Druid joga (lida e aprovada)', () => { assert.equal(S.coverage(of(QD)).level, 'completo'); });

test('M-541 · ganha um marcador +1/+1 quando você conjura mágica branca, azul, preta ou vermelha (verde, incolor e a do oponente não)', () => {
  const com = (nome, quem = 0) => { let s = mesa(), d, m; [s, d] = poe(s, 0, 'Questing Druid'); if (quem === 1) s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
    [s, m] = poe(s, quem, nome, 'hand'); s = terras(s, quem, nome === 'Broto' ? 'Forest' : 'Mountain', 1);
    s = limpa(act(s, legais(s, quem, a => a.t === 'cast' && a.oid === m)[0])); return marcadores(s, d); };
  assert.equal(com('Faisca'), 1, 'vermelha'); assert.equal(com('Broto'), 0, 'verde'); assert.equal(com('Nada'), 0, 'incolor'); assert.equal(com('Faisca', 1), 0, 'do oponente');
});

test('M-541 · Seek the Beast: as duas exiladas podem ser jogadas até o seu próximo passo final começar', () => {
  let s = mesa(), q; [s, q] = poe(s, 0, 'Questing Druid', 'hand'); s = terras(s, 0, 'Mountain', 2);
  const topo = s.zones[0].library.slice(0, 2);
  s = limpa(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === q && a.omen)[0]));
  assert.deepEqual(topo.map(o => [s.objects[o].zone, s.objects[o].playableFromExile]), [['exile', 0], ['exile', 0]], 'exiladas e jogáveis');
  assert.equal(s.objects[q].zone, 'exile', 'a carta vai ao exílio como Aventura');
  s = passaAte(s, x => x.turn.step === 'main2' && x.turn.active === 0); assert.ok(topo.every(o => s.objects[o].playableFromExile === 0), 'na segunda fase principal ainda dá');
  s = passaAte(s, x => x.turn.step === 'end' && x.turn.active === 0); assert.ok(topo.every(o => s.objects[o].playableFromExile == null), 'no passo final, acabou');
  // conjurada no turno do oponente: vale durante o seu próximo turno, até o passo final dele
  let t = mesa(), q2; [t, q2] = poe(t, 0, 'Questing Druid', 'hand'); t = terras(t, 0, 'Mountain', 2);
  t = passaAte(t, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending); t = act(t, { t: 'pass', p: 1 });
  const topo2 = t.zones[0].library.slice(0, 2); t = limpa(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === q2 && a.omen)[0]));
  t = passaAte(t, x => x.turn.active === 0 && x.turn.step === 'main2'); assert.ok(topo2.every(o => t.objects[o].playableFromExile === 0), 'no seu turno seguinte ainda dá');
  t = passaAte(t, x => x.turn.active === 0 && x.turn.step === 'end'); assert.ok(topo2.every(o => t.objects[o].playableFromExile == null), 'até o seu passo final');
});
