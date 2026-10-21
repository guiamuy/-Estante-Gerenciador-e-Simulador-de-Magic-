// M-537 · LT199 · revisão por lote CLXXV (textos da Scryfall de 20/10/2026): Fatal Push ("Destroy target creature if it has mana value 2 or
// less. Revolt — … 4 or less instead if a permanent left the battlefield under your control this turn", 608.2b) e Eddymurk Crab ("This
// creature enters tapped if it's not your turn. When this creature enters, tap up to two target creatures."). Falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, J, act, poe, legais, passaAte, valorDeMana, palavrasDoTexto } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Fatal Push', 'Eddymurk Crab'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: c.keywords || palavrasDoTexto(c.oracle_text), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
const cr = (name, cost, p, t) => ({ name, type_line: 'Creature — Test', mana_cost: cost, cmc: valorDeMana(cost), keywords: [], oracle_text: '', power: String(p), toughness: String(t), colors: [...new Set((cost.match(/[WUBRG]/g) || []))] });
Object.assign(C, { Swamp: terra('Swamp', 'Swamp', 'B'), Island: terra('Island', 'Island', 'U'), Forest: terra('Forest', 'Forest', 'G'),
  Urso: cr('Urso', '{1}{G}', 2, 2), Ogro: cr('Ogro', '{2}{G}{G}', 4, 4), Gigante: cr('Gigante', '{4}{G}', 5, 5),
  Feitico: { name: 'Feitico', type_line: 'Sorcery', mana_cost: '{3}', cmc: 3, keywords: [], oracle_text: '', colors: [] } });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 219, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Urso', 'Feitico', 'Swamp', 'Island']) }, { name: 'B', deck: b(['Urso', 'Ogro', 'Gigante', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const terras = (s, p, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, p, n); return s; };
const limpa = s => passaAte(s, x => !x.stack.length && !x.pending && !(x.queued || []).length);

test('M-537 · as duas jogam (lidas e aprovadas)', () => { for (const n of NOMES) assert.equal(S.coverage(of(n)).level, 'completo', n); });

test('M-537 · Fatal Push destrói criatura de valor de mana 2 ou menos; com revolta, 4 ou menos', () => {
  const empurra = (alvoNome, revolta) => { let s = mesa(), fp, a; [s, fp] = poe(s, 0, 'Fatal Push', 'hand'); s = terras(s, 0, 'Swamp', 1); [s, a] = poe(s, 1, alvoNome);
    if (revolta) { let u; [s, u] = poe(s, 0, 'Urso'); s = J(s); E.moveObject(s, u, 'graveyard'); }
    const of = legais(s, 0, x => x.t === 'cast' && x.oid === fp && x.targets && x.targets[0].oid === a); assert.ok(of.length, 'mira qualquer criatura');
    s = limpa(act(s, of[0])); return s.objects[a].zone; };
  assert.equal(empurra('Urso', false), 'graveyard'); assert.equal(empurra('Ogro', false), 'battlefield', 'valor 4 sem revolta: fica');
  assert.equal(empurra('Ogro', true), 'graveyard', 'com revolta: valor 4 morre'); assert.equal(empurra('Gigante', true), 'battlefield', 'valor 5: fica');
});

test('M-537 · Eddymurk Crab entra desvirado no seu turno e virado no do oponente; vira até duas criaturas; custa menos por instantânea e feitiço no cemitério', () => {
  let s = mesa(), ec, u, o; [s, ec] = poe(s, 0, 'Eddymurk Crab', 'hand'); [s] = poe(s, 0, 'Feitico', 'graveyard'); [s] = poe(s, 0, 'Feitico', 'graveyard'); s = terras(s, 0, 'Island', 5);
  [s, u] = poe(s, 1, 'Urso'); [s, o] = poe(s, 1, 'Ogro');
  { let r = mesa(), e0; [r, e0] = poe(r, 0, 'Eddymurk Crab', 'hand'); [r] = poe(r, 0, 'Feitico', 'graveyard'); r = terras(r, 0, 'Island', 5); assert.equal(legais(r, 0, x => x.t === 'cast' && x.oid === e0).length, 0, 'um feitiço só: {4}{U}{U} não cabe em 5'); }
  const of = legais(s, 0, x => x.t === 'cast' && x.oid === ec); assert.ok(of.length, '{3}{U}{U} com dois feitiços no cemitério');
  s = act(s, of[0]); s = passaAte(s, x => !x.stack.length && !(x.queued || []).length || !!x.pending);
  if (s.pending && s.pending.kind === 'pick_target') { s = act(s, { t: 'pick_target', p: 0, index: s.pending.options.findIndex(x => x && x.oid === u) }); if (s.pending && s.pending.kind === 'pick_target') s = act(s, { t: 'pick_target', p: 0, index: s.pending.options.findIndex(x => x && x.oid === o) }); }
  s = limpa(s); assert.equal(s.objects[ec].tapped, false, 'no seu turno: desvirado'); assert.equal(s.objects[u].tapped, true); assert.equal(s.objects[o].tapped, true);
  let t = mesa(), e2; [t, e2] = poe(t, 0, 'Eddymurk Crab', 'hand'); t = terras(t, 0, 'Island', 7);
  t = passaAte(t, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending); t = J(t); for (const x of t.zones[0].battlefield) t.objects[x].tapped = false;
  t = act(t, { t: 'pass', p: 1 }); const fl = legais(t, 0, x => x.t === 'cast' && x.oid === e2)[0]; assert.ok(fl, 'flash no turno do oponente');
  t = act(t, fl); t = passaAte(t, x => x.objects[e2].zone === 'battlefield' || !!x.pending); assert.equal(t.objects[e2].tapped, true, 'fora do seu turno: virado');
});
