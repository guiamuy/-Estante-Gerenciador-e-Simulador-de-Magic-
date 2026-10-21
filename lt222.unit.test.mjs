// M-540 · LT202 · revisão por lote CLXXVIII (texto da Scryfall de 20/10/2026): Prismatic Ending ("Converge — Exile target nonland permanent
// if its mana value is less than or equal to the number of colors of mana spent to cast this spell"). Convergir conta as cores de mana gastas
// na conjuração (incolor não é cor, 105.1); a condição é conferida na resolução (608.2b). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const PE = 'Prismatic Ending';
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: ['W'] }; };
const C = { [PE]: of(PE) };
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
const perm = (name, type_line, cost, extra = {}) => ({ name, type_line, mana_cost: cost, cmc: valorDeMana(cost), keywords: [], oracle_text: '', colors: [], ...extra });
Object.assign(C, { Plains: terra('Plains', 'Plains', 'W'), Forest: terra('Forest', 'Forest', 'G'), Island: terra('Island', 'Island', 'U'),
  Urso: perm('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2', colors: ['G'] }), Ogro: perm('Ogro', 'Creature — Ogre', '{2}{G}', { power: '3', toughness: '3', colors: ['G'] }),
  Pedra: perm('Pedra', 'Artifact', '{1}'), Gema: perm('Gema', 'Artifact', '{0}') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 222, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([PE, 'Plains', 'Island']) }, { name: 'B', deck: b(['Urso', 'Ogro', 'Pedra', 'Gema', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const limpa = s => passaAte(s, x => !x.stack.length && !x.pending && !(x.queued || []).length);
// conjura com X e a reserva dada (só ela paga), mirando a permanente `nome` do oponente
const conjura = (nome, x, reserva) => { let s = mesa(), pe, a; [s, pe] = poe(s, 0, PE, 'hand'); [s, a] = poe(s, 1, nome);
  s = J(s); Object.assign(s.players[0].pool, reserva);
  const ofs = legais(s, 0, k => k.t === 'cast' && k.oid === pe && k.x === x && k.targets && k.targets[0].oid === a); if (!ofs.length) return 'sem oferta';
  s = limpa(act(s, ofs[0])); return s.objects[a].zone; };

test('M-540 · Prismatic Ending joga (lida e aprovada)', () => { assert.equal(S.coverage(of(PE)).level, 'completo'); });

test('M-540 · exila a permanente se o valor de mana dela for no máximo o número de cores gastas', () => {
  assert.equal(conjura('Urso', 1, { W: 1, G: 1 }), 'exile', 'duas cores: valor 2 sai');
  assert.equal(conjura('Urso', 1, { W: 2 }), 'battlefield', 'uma cor só: valor 2 fica');
  assert.equal(conjura('Urso', 1, { W: 1, C: 1 }), 'battlefield', 'incolor não é cor');
  assert.equal(conjura('Ogro', 2, { W: 1, G: 1, R: 1 }), 'exile', 'três cores: valor 3 sai');
  assert.equal(conjura('Ogro', 1, { W: 1, G: 1 }), 'battlefield', 'duas cores: valor 3 fica');
  assert.equal(conjura('Pedra', 0, { W: 1 }), 'exile', 'X = 0 com {W}: valor 1 sai');
  assert.equal(conjura('Gema', 0, { W: 1 }), 'exile', 'valor 0 sai');
});

test('M-540 · não mira terreno; mira qualquer permanente não terreno mesmo sem cores bastantes', () => {
  let s = mesa(), pe, f; [s, pe] = poe(s, 0, PE, 'hand'); [s, f] = poe(s, 1, 'Forest'); s = J(s); Object.assign(s.players[0].pool, { W: 1, G: 1 });
  assert.ok(!legais(s, 0, k => k.t === 'cast' && k.oid === pe && k.targets && k.targets.some(t => t && t.oid === f)).length, 'terreno não é alvo');
  let t = mesa(), p2, u; [t, p2] = poe(t, 0, PE, 'hand'); [t, u] = poe(t, 1, 'Urso'); t = J(t); Object.assign(t.players[0].pool, { W: 2 });
  assert.ok(legais(t, 0, k => k.t === 'cast' && k.oid === p2 && k.x === 1 && k.targets && k.targets[0].oid === u).length, 'mira qualquer permanente não terreno, mesmo sem cores bastantes');
  t = limpa(act(t, legais(t, 0, k => k.t === 'cast' && k.oid === p2 && k.x === 1 && k.targets && k.targets[0].oid === u)[0])); assert.equal(t.objects[p2].zone, 'graveyard');
});

test('M-540 · achado da revisão: o pagamento automático escolhe a mana que dá mais cores (601.2h)', () => {
  assert.equal(conjura('Urso', 1, { W: 1, C: 1, G: 1 }), 'exile', 'reserva {W}{C}{G}: paga W+G');
  assert.equal(conjura('Urso', 1, { W: 2, G: 1 }), 'exile', 'reserva {W}{W}{G}: paga W+G');
  let s = mesa(), pe, u; [s, pe] = poe(s, 0, PE, 'hand'); [s, u] = poe(s, 1, 'Urso'); [s] = poe(s, 0, 'Plains'); [s] = poe(s, 0, 'Plains'); [s] = poe(s, 0, 'Island');
  s = limpa(act(s, legais(s, 0, k => k.t === 'cast' && k.oid === pe && k.x === 1 && k.targets && k.targets[0].oid === u)[0]));
  assert.equal(s.objects[u].zone, 'exile', 'Plains, Plains e Island: vira uma Plains e a Island');
  assert.equal(s.zones[0].battlefield.filter(o => s.objects[o].tapped).length, 2, 'só dois terrenos');
});
