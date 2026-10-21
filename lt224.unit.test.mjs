// M-542 · LT204 · revisão por lote CLXXX (texto da Scryfall de 20/10/2026): Quantum Riddler ("Flying / When this creature enters, draw a card.
// / As long as you have one or fewer cards in hand, if you would draw one or more cards, you draw that many cards plus one instead. / Warp
// {1}{U}"). A substituição vale para o evento de compra inteiro (614.11): "compre duas" vira três, não quatro. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, J, act, poe, legais, passaAte, valorDeMana, palavrasDoTexto } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const QR = 'Quantum Riddler';
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: c.keywords || palavrasDoTexto(c.oracle_text), oracle_text: c.oracle_text, colors: ['U'], power: c.power, toughness: c.toughness }; };
const C = { [QR]: of(QR) };
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Island: terra('Island', 'Island', 'U'),
  Pensar: { name: 'Pensar', type_line: 'Sorcery', mana_cost: '{U}', cmc: 1, keywords: [], oracle_text: 'Draw two cards.', colors: ['U'] },
  Draga: { name: 'Draga', type_line: 'Creature — Zombie', mana_cost: '{B}', cmc: 1, keywords: ['Dredge'], oracle_text: 'Dredge 2', power: '1', toughness: '1', colors: ['B'] },
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] } });
const SCRIPTS = { Pensar: { name: 'Pensar', effects: [{ do: 'draw', amount: 2 }], example: { target: 'none', expect: { selfLife: 0 } } } };
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 224, mode: 'full', cards: C, scripts: SCRIPTS, first: 0, players: [{ name: 'A', deck: b([QR, 'Pensar', 'Draga', 'Urso', 'Island']) }, { name: 'B', deck: b([QR, 'Urso', 'Island']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const terras = (s, p, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, p, n); return s; };
const limpa = s => passaAte(s, x => !x.stack.length && !x.pending && !(x.queued || []).length);
// deixa na mão só `fica` cartas (as outras vão para o fundo do grimório) e devolve [estado, oids na mão]
const maoCom = (s, fica) => { s = J(s); const h = s.zones[0].hand; while (h.length > fica.length) { const x = h.find(o => !fica.includes(o)); h.splice(h.indexOf(x), 1); s.zones[0].library.push(x); s.objects[x].zone = 'library'; } return s; };

test('M-542 · Quantum Riddler joga (lido e aprovado)', () => { assert.equal(S.coverage(of(QR)).level, 'completo'); });

test('M-542 · com uma carta ou nenhuma na mão, cada compra traz uma a mais (o evento inteiro: duas viram três)', () => {
  const compra = fica => { let s = mesa(), q, pz; [s, q] = poe(s, 0, QR); [s, pz] = poe(s, 0, 'Pensar', 'hand'); s = terras(s, 0, 'Island', 1);
    const outras = s.zones[0].hand.filter(o => o !== pz).slice(0, fica); s = maoCom(s, [pz, ...outras]);
    const antes = s.zones[0].hand.length - 1; s = limpa(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === pz)[0])); return s.zones[0].hand.length - antes; };
  assert.equal(compra(0), 3, 'mão vazia depois de conjurar: compra três');
  assert.equal(compra(1), 3, 'uma carta na mão: compra três');
  assert.equal(compra(2), 2, 'duas cartas na mão: só as duas');
  let s = mesa(), q; [s, q] = poe(s, 0, QR); s = maoCom(s, []); s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && x.turn.number > 1 && !x.pending);
  assert.equal(s.zones[0].hand.length, 2, 'a compra do passo de compra também (uma vira duas)');
});

test('M-542 · ao entrar, compra (com a substituição se a mão estiver curta); dois Riddlers somam uma cada; o do oponente não conta', () => {
  let s = mesa(), q; [s, q] = poe(s, 0, QR, 'hand'); s = terras(s, 0, 'Island', 5); s = maoCom(s, [q]);
  s = limpa(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === q && a.alt == null)[0])); assert.equal(s.zones[0].hand.length, 2, 'mão vazia: o gatilho compra duas');
  let t = mesa(), pz; [t] = poe(t, 0, QR); [t] = poe(t, 0, QR); [t, pz] = poe(t, 0, 'Pensar', 'hand'); t = terras(t, 0, 'Island', 1); t = maoCom(t, [pz]);
  t = limpa(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === pz)[0])); assert.equal(t.zones[0].hand.length, 4, 'dois Riddlers: duas viram quatro');
  let u = mesa(), p2; [u] = poe(u, 1, QR); [u, p2] = poe(u, 0, 'Pensar', 'hand'); u = terras(u, 0, 'Island', 1); u = maoCom(u, [p2]);
  u = limpa(act(u, legais(u, 0, a => a.t === 'cast' && a.oid === p2)[0])); assert.equal(u.zones[0].hand.length, 2, 'o Riddler do oponente não muda a sua compra');
});

test('M-542 · dobra {1}{U}: oferecida da mão como custo alternativo', () => {
  let s = mesa(), q; [s, q] = poe(s, 0, QR, 'hand'); s = terras(s, 0, 'Island', 2);
  const alt = legais(s, 0, a => a.t === 'cast' && a.oid === q && a.alt != null); assert.ok(alt.length, 'dobra com dois terrenos');
  s = limpa(act(s, alt[0])); assert.equal(s.objects[q].zone, 'battlefield');
});

test('M-542 · achado da revisão: com dragar, a compra a mais entra uma vez só (a continuação da compra não é substituída de novo)', () => {
  for (const escolha of [0, 1]) {
    let s = mesa(); [s] = poe(s, 0, QR); [s] = poe(s, 0, 'Draga', 'graveyard'); s = maoCom(s, []);
    s = passaAte(s, x => (!!x.pending && x.pending.kind === 'choose_mode') || (x.turn.active === 0 && x.turn.number > 1 && x.turn.step === 'main1'));
    for (let i = 0; i < 6 && s.pending && s.pending.kind === 'choose_mode'; i++) { s = act(s, legais(s, 0)[i === 0 ? escolha : 0]); s = passaAte(s, x => (!!x.pending && x.pending.kind === 'choose_mode') || (x.turn.active === 0 && x.turn.number > 1 && x.turn.step === 'main1')); }
    assert.equal(s.zones[0].hand.length, 2, escolha ? 'dragando primeiro: duas cartas' : 'comprando sempre: duas cartas');
  }
});
