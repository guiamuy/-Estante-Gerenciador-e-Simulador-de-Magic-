// M-375 · LT43 · Vines of Vastwood: "Target creature can't be the target of spells or abilities your opponents control this turn. If this spell was
// kicked, that creature gets +4/+4 until end of turn." (Oracle do Forge, consulta de 12/10/2026; .listas/oficiais-revisadas.json). Revisão por
// lote XXXIV; joga pelo caminho de produção (APROVADAS). Os testes falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';
import { valorDeMana, palavrasDoTexto, T } from './listas.mjs';
const v = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas.find(x => x.name === 'Vines of Vastwood');
const cores = c => [...new Set((c || '').match(/[WUBRG]/g) || [])];
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: valorDeMana(mana_cost), keywords: [], oracle_text: '', colors: cores(mana_cost), ...extra });
const CARDS = { ...CARTAS, 'Vines of Vastwood': { name: v.name, type_line: v.type_line, mana_cost: v.mana_cost, cmc: 1, keywords: palavrasDoTexto(v.oracle_text), oracle_text: v.oracle_text, colors: ['G'] },
  Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2' }), Orc: c0('Orc', 'Creature — Orc', '{1}{B}', { power: '2', toughness: '2' }), Matar: c0('Matar', 'Instant', '{B}'), Crescer: c0('Crescer', 'Instant', '{G}') };
const EX = { example: { target: 'none', expect: { selfLife: 20 } } };
const SCRIPTS = { Matar: { name: 'Matar', effects: [{ do: 'destroy', target: 'creature' }], ...EX }, Crescer: { name: 'Crescer', effects: [{ do: 'pump', power: 3, toughness: 3, target: 'creature' }], ...EX } };
function mesa() {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 6, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 4, mode: 'full', cards: CARDS, scripts: SCRIPTS, first: 0,
    players: [{ name: 'A', deck: baralho(['Vines of Vastwood', 'Urso', 'Crescer', 'Forest']) }, { name: 'B', deck: baralho(['Matar', 'Orc', 'Swamp']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return s;
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);
const alvosDe = (s, p, oid) => legais(s, p, a => a.oid === oid).flatMap(a => (a.targets || []).map(t => t.oid));

test('LT43 · em resposta à remoção do oponente, Vines protege a criatura (a remoção perde o alvo, 608.2b); com reforço, +4/+4; no turno seguinte o oponente mira de novo', () => {
  for (const reforco of [false, true]) {
    let s = passaAte(mesa(), x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending), vv, u, m;
    [s, vv] = poe(s, 0, 'Vines of Vastwood', 'hand'); [s, u] = poe(s, 0, 'Urso'); [s] = poe(s, 0, 'Forest'); [s] = poe(s, 0, 'Forest'); [s, m] = poe(s, 1, 'Matar', 'hand'); [s] = poe(s, 1, 'Swamp');
    s = act(act(s, legais(s, 1, a => a.t === 'cast' && a.oid === m && (a.targets || []).some(t => t.oid === u))[0]), { t: 'pass', p: 1 });
    const c = legais(s, 0, a => a.t === 'cast' && a.oid === vv && (a.targets || [])[0] && a.targets[0].oid === u && !!a.kick === reforco)[0]; assert.ok(c, 'oferece ' + (reforco ? 'com' : 'sem') + ' reforço');
    s = resolve(act(s, c));
    assert.equal(s.objects[u].zone, 'battlefield'); assert.equal(s.objects[m].zone, 'graveyard');
    assert.equal(E.stats(s, s.objects[u]).power, reforco ? 6 : 2);
    let m2; [s, m2] = poe(s, 1, 'Matar', 'hand'); [s] = poe(s, 1, 'Swamp');
    assert.ok(!alvosDe(s, 1, m2).includes(u), 'o oponente não mira mais neste turno');
    s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1');
    assert.equal(E.stats(s, s.objects[u]).power, 2, 'o +4/+4 acabou');
    s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
    assert.ok(alvosDe(s, 1, m2).includes(u), 'no turno seguinte, mira de novo');
  }
});

test('LT43 · "your opponents" são os de quem conjurou: Vines na criatura do oponente impede o DONO de mirá-la, e quem conjurou continua mirando', () => {
  let s = passaAte(mesa(), x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending), vv, o, cr, m;
  [s, vv] = poe(s, 0, 'Vines of Vastwood', 'hand'); [s, cr] = poe(s, 0, 'Crescer', 'hand'); [s, o] = poe(s, 1, 'Orc'); [s] = poe(s, 0, 'Forest'); [s] = poe(s, 0, 'Forest'); [s, m] = poe(s, 1, 'Matar', 'hand'); [s] = poe(s, 1, 'Swamp'); let u; [s, u] = poe(s, 0, 'Urso');
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === vv && (a.targets || [])[0] && a.targets[0].oid === o && !a.kick)[0]));
  assert.ok(alvosDe(s, 0, cr).includes(o), 'quem conjurou mira');
  s = act(s, { t: 'pass', p: 0 }); assert.equal(s.turn.priority, 1);
  assert.ok(legais(s, 1).some(a => a.oid === m && (a.targets || []).some(t => t.oid === u)), 'B tem prioridade e mira o Urso (a oferta existe)');
  assert.ok(!legais(s, 1).some(a => a.oid === m && (a.targets || []).some(t => t.oid === o)), 'o dono (oponente de quem conjurou) não mira a própria criatura');
});

test('LT43 · pilha explicada: o +4/+4 da Vines diz "se tiver sido reforçada" (achado da revisão: valia para todo efeito condicionado ao reforço)', () => {
  const f = T.descreveEfeitos([{ do: 'sem_alvo_de_oponentes', target: 'creature' }, { do: 'pump', power: 4, toughness: 4, target: 'first-target', onlyIf: 'kicked' }]);
  assert.match(f, /não pode ser alvo de mágicas nem de habilidades dos oponentes de quem a conjurou neste turno/);
  assert.match(f, /\+4\/\+4[^;]*\(se tiver sido reforçada\)/);
});
