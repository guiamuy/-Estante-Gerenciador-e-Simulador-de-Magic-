// M-519 · LT181 · revisão por lote CLVII: Auras que concedem habilidade disparada entre aspas (textos da Scryfall de 18/10/2026):
// Infernal Scarring ("gets +2/+0 and has 'When this creature dies, draw a card.'") e Sixth Sense ("has 'Whenever this creature deals combat
// damage to a player, you may draw a card.'"). O gatilho é da criatura e de quem a controla (113.3, 603.3a); o de morrer olha para trás
// (603.10a). Falham no motor anterior (o leitor não lia a habilidade entre aspas).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';
import { loadModules } from './_load.mjs';
const { leitor: L } = loadModules();
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Infernal Scarring', 'Sixth Sense'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))] }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G'), Mountain: terra('Mountain', 'Mountain', 'R'),
  'Lightning Bolt': { name: 'Lightning Bolt', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: 'Lightning Bolt deals 3 damage to any target.', colors: ['R'] },
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] } });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 201, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Lightning Bolt', 'Swamp', 'Forest', 'Mountain', 'Urso']) }, { name: 'B', deck: b(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };
const limpa = s => passaAte(s, x => !x.stack.length && !x.pending && !(x.queued || []).length);
const conj = (s, oid, f = () => true) => { const a = legais(s, 0, x => x.t === 'cast' && x.oid === oid && f(x))[0]; assert.ok(a, 'conjurar ' + s.objects[oid].name); return act(s, a); };
const alvoOid = oid => x => x.targets && x.targets[0] && x.targets[0].oid === oid;

test('M-519 · Infernal Scarring: +2/+0 e, quando a criatura morre, quem a controlava compra', () => {
  let s = mesa(), is, u, lb; [s, is] = poe(s, 0, 'Infernal Scarring', 'hand'); [s, u] = poe(s, 0, 'Urso'); [s, lb] = poe(s, 0, 'Lightning Bolt', 'hand'); s = terras(s, 'Swamp', 2); s = terras(s, 'Mountain', 1);
  s = limpa(conj(s, is, alvoOid(u))); assert.equal(E.stats(s, s.objects[u]).power, 4);
  const mao = s.zones[0].hand.length; s = limpa(conj(s, lb, alvoOid(u)));
  assert.equal(s.objects[u].zone, 'graveyard'); assert.equal(s.zones[0].hand.length, mao - 1 + 1, 'o Bolt saiu e comprou uma');
});

test('M-519 · Infernal Scarring na criatura do oponente: quem compra é o oponente', () => {
  let s = mesa(), is, u, lb; [s, is] = poe(s, 0, 'Infernal Scarring', 'hand'); [s, u] = poe(s, 1, 'Urso'); [s, lb] = poe(s, 0, 'Lightning Bolt', 'hand'); s = terras(s, 'Swamp', 2); s = terras(s, 'Mountain', 1);
  s = limpa(conj(s, is, alvoOid(u))); const m0 = s.zones[0].hand.length, m1 = s.zones[1].hand.length;
  s = limpa(conj(s, lb, alvoOid(u))); assert.equal(s.zones[1].hand.length, m1 + 1); assert.equal(s.zones[0].hand.length, m0 - 1);
});

test('M-519 · Sixth Sense: dano de combate a jogador → "you may draw" (aceitar compra, recusar não)', () => {
  const roda = aceita => {
    let s = mesa(), ss, u; [s, ss] = poe(s, 0, 'Sixth Sense', 'hand'); [s, u] = poe(s, 0, 'Urso'); s = terras(s, 'Forest', 1);
    s = limpa(conj(s, ss, alvoOid(u))); const mao = s.zones[0].hand.length;
    s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0); s = act(s, { t: 'attack', p: 0, attackers: [u] });
    s = passaAte(s, x => !!x.pending && x.pending.kind === 'may_pay' || x.turn.step === 'main2');
    assert.equal(s.pending && s.pending.kind, 'may_pay', 'pergunta');
    s = passaAte(act(s, legais(s, 0, a => a.t === (aceita ? 'pay' : 'decline'))[0]), x => x.turn.step === 'main2' && !x.stack.length && !x.pending);
    return s.zones[0].hand.length - mao;
  };
  assert.equal(roda(true), 1); assert.equal(roda(false), 0);
});

test('M-519 · leitor: habilidade entre aspas que fala da própria criatura ou de outro gatilho fica sem leitura', () => {
  const ler = t => L.ler({ name: 'X', type_line: 'Enchantment — Aura', mana_cost: '{1}{B}', oracle_text: `Enchant creature\n${t}` }).completa;
  assert.equal(ler('Enchanted creature has "Whenever this creature attacks, it gets +1/+1 until end of turn."'), false, '"it" seria ambíguo');
  assert.equal(ler('Enchanted creature has "At the beginning of your upkeep, sacrifice a creature."'), false, 'gatilho de passo fica de fora');
});
