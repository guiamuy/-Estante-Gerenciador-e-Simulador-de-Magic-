// M-552 · a folha de escolha diz o que é: título e dica vindos do motor (tituloM, dicaM) no sacrifício do Witherbloom Charm (M-549) e no descarte do
// Winternight Stories (M-551) — achados das revisões independentes (antes: "Escolha cartas" / "Toque na carta"). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const of = (n, cores) => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: c.keywords || [], oracle_text: c.oracle_text, colors: cores }; };
const WC = 'Witherbloom Charm', WS = 'Winternight Stories';
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
const C = { [WC]: of(WC, ['B', 'G']), [WS]: of(WS, ['U']), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G'), Island: terra('Island', 'Island', 'U'),
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] },
  Pedra: { name: 'Pedra', type_line: 'Artifact', mana_cost: '{2}', cmc: 2, keywords: [], oracle_text: '', colors: [] } };
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 234, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([WC, WS, 'Urso', 'Pedra', 'Swamp', 'Forest', 'Island']) }, { name: 'B', deck: b(['Urso', 'Island']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const ate = s => passaAte(s, x => !!x.pending || (!x.stack.length && !(x.queued || []).length));

test('M-552 · Witherbloom Charm: a folha pergunta se sacrifica e diz a compra', () => {
  let s = mesa(), wc; [s, wc] = poe(s, 0, WC, 'hand'); [s] = poe(s, 0, 'Urso'); [s] = poe(s, 0, 'Swamp'); [s] = poe(s, 0, 'Forest');
  s = ate(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === wc && (a.mode === 0 || (a.modes && a.modes[0] === 0)))[0]));
  assert.equal(s.pending.tituloM, 'Sacrificar uma permanente sua?'); assert.match(s.pending.dicaM, /para comprar 2 cartas, ou confirme sem sacrificar/);
});

test('M-552 · Winternight Stories: a folha diz que é descarte, que uma criatura basta, e o que vale na segunda escolha', () => {
  const prep = () => { let s = mesa(), w, u, pd; [s, w] = poe(s, 0, WS, 'hand'); [s, u] = poe(s, 0, 'Urso', 'hand'); [s, pd] = poe(s, 0, 'Pedra', 'hand'); for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Island');
    return [ate(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === w && !a.alt)[0])), u, pd]; };
  let [s, u] = prep(); assert.equal(s.pending.tituloM, 'Descarte: duas cartas, ou uma de criatura'); assert.match(s.pending.dicaM, /Se for criatura, ela basta/);
  s = ate(act(s, legais(s, 0, a => a.t === 'pick' && a.oid === u)[0])); if (s.pending && Array.from(s.pending.picked).includes(u)) s = ate(act(s, legais(s, 0, a => a.t === 'pick_done')[0]));
  assert.equal(s.pending.tituloM, 'Descarte: pode parar aqui'); assert.match(s.pending.dicaM, /^Urso é criatura: confirme para descartar só ela/);
  let [t, , pd] = prep(); t = ate(act(t, legais(t, 0, a => a.t === 'pick' && a.oid === pd)[0])); if (t.pending && Array.from(t.pending.picked).includes(pd)) t = ate(act(t, legais(t, 0, a => a.t === 'pick_done')[0]));
  assert.equal(t.pending.tituloM, 'Descarte: escolha a segunda carta'); assert.match(t.pending.dicaM, /^Pedra não é criatura: toque na segunda carta/);
});
