// V-22 · CR 701.68 · afligir, CR 701.70 · recrutar e CR 701.28 · converter. Texto oficial em .listas/oficiais-verbos.json (Oracle do
// Forge, clone de 12/10/2026): Sinister Gnarlbark — "At the beginning of your end step, draw a card and blight 1." · Patient Instructor —
// "Vigilance. When this creature enters, recruit."
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { E, J, act, poe, legais, mesa, comMana, tudo, criatura, CARTAS } from './verbos.mjs';
const { scripts: S, table: T } = loadModules();
const URSO = criatura('Urso de Teste 3/3', 3, 3), LOBO = criatura('Lobo de Teste 2/2', 2, 2);
CARTAS['Floresta de Teste'] = { name: 'Floresta de Teste', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '{T}: Add {G}.', colors: [] };
const fonte = (p = 0) => ({ oid: 'h', name: URSO, controller: p, ability: true, source: null });
const faz = (s, eff, p = 0) => { s = J(s); const ev = []; E.applyEffect(s, fonte(p), eff, null, ev); return [s, ev]; };
const maoSo = (s, p, nomes) => { s = J(s); for (const oid of s.zones[p].hand.slice()) E.moveObject(s, oid, 'library'); const oids = []; for (const n of nomes) { let o; [s, o] = poe(s, p, n, 'hand'); oids.push(o); } return [s, oids]; };
const topo = (s, p, nome) => { let o; [s, o] = poe(s, p, nome, 'library'); s = J(s); const lib = s.zones[p].library; lib.splice(lib.indexOf(o), 1); lib.unshift(o); return [s, o]; };

test('CR 701.68 · afligir (a): quem aflige escolhe uma criatura SUA para receber os N marcadores −1/−1 (não mira; a do oponente não é opção); com uma só, é ela', () => {
  let s = mesa([URSO, LOBO], [URSO]), u, l, dele; [s, u] = poe(s, 0, URSO); [s, l] = poe(s, 0, LOBO); [s, dele] = poe(s, 1, URSO);
  let [x] = faz(s, { do: 'blight', amount: 2 });
  assert.equal(x.pending.kind, 'pick'); assert.equal(x.pending.p, 0); assert.deepEqual([...x.pending.from].sort(), [u, l].sort()); assert.equal(x.pending.min, 1);
  x = act(x, legais(x, 0, a => a.t === 'pick' && a.oid === u)[0]); if (x.pending) x = act(x, legais(x, 0, a => a.t === 'pick_done')[0]);
  assert.equal(x.objects[u].counters.m1m1, 2); assert.deepEqual({ ...E.stats(x, x.objects[u]) }, { power: 1, toughness: 1 }); assert.equal(x.objects[l].counters.m1m1 || 0, 0); assert.equal(x.objects[dele].counters.m1m1 || 0, 0);
  assert.equal(x.pending, null); assert.equal(x.verbo, undefined); assert.equal(x.escolhaV, undefined);
  let [y, ev] = faz(s, { do: 'blight', amount: 1 }, 1); assert.equal(y.pending, null, 'uma criatura só: sem pergunta'); assert.equal(y.objects[dele].counters.m1m1, 1);
});

test('CR 701.68 · afligir (b): sem criatura sua, nada acontece; a afligida que chega a resistência zero morre', () => {
  let s = mesa([LOBO], []), l; let [x, ev] = faz(s, { do: 'blight', amount: 1 }); assert.equal(x.pending, null); assert.equal(ev.find(e => e.do === 'blight').amount, 0);
  [s, l] = poe(s, 0, LOBO); [x] = faz(s, { do: 'blight', amount: 2 }); x = tudo(act(x, { t: 'pass', p: x.turn.priority }));
  assert.equal(x.objects[l].zone, 'graveyard');
});

test('CR 701.70 · recrutar: compra uma, descarta uma à escolha; descartando carta que não é terreno cria um Soldado Humano 1/1 branco; descartando terreno, não', () => {
  for (const [descarta, fichas] of [[URSO, 1], ['Floresta de Teste', 0]]) {
    let s = mesa([URSO, LOBO, 'Floresta de Teste'], []), mao, t; [s, mao] = maoSo(s, 0, [URSO, 'Floresta de Teste']); [s, t] = topo(s, 0, LOBO);
    let [x] = faz(s, { do: 'recruit' });
    assert.equal(x.objects[t].zone, 'hand', 'comprou antes'); assert.equal(x.pending.kind, 'discard'); assert.equal(x.pending.p, 0);
    x = tudo(act(x, legais(x, 0, a => a.t === 'discard' && a.oid === mao[descarta === URSO ? 0 : 1])[0]));
    const soldados = Object.values(x.objects).filter(o => o.token && o.name === 'Human Soldier' && o.zone === 'battlefield');
    assert.equal(soldados.length, fichas, 'descartando ' + descarta); assert.equal(x.zones[0].hand.length, 2); assert.equal(x.verbo, undefined);
    if (fichas) { assert.deepEqual({ ...E.stats(x, soldados[0]) }, { power: 1, toughness: 1 }); assert.deepEqual([...E.colorsOf(x, soldados[0])], ['W']); assert.equal(soldados[0].controller, 0); }
  }
});

test('CR 701.28 · converter segue as regras de transformar: a permanente de duas faces vira para a outra face; a de uma face só não muda', () => {
  const nome = Object.keys(S.SCRIPTS).find(n => S.SCRIPTS[n].back && (S.SCRIPTS[n].back.types || []).includes('creature') && CARTAS[n]);
  assert.ok(nome, 'há uma carta de duas faces com verso de permanente nas listas');
  let s = mesa([nome, URSO], []), dfc, u; [s, dfc] = poe(s, 0, nome); [s, u] = poe(s, 0, URSO); s = J(s);
  const a = J(s), b = J(s), ev = [];
  const hab = oid => ({ oid: 'h', name: s.objects[oid].name, controller: 0, ability: true, source: oid });
  E.applyEffect(a, hab(dfc), { do: 'transform', target: 'self-source' }, null, ev); E.applyEffect(b, hab(dfc), { do: 'convert', target: 'self-source' }, null, ev);
  assert.notEqual(b.objects[dfc].name, s.objects[dfc].name, 'virou para a outra face'); assert.equal(b.objects[dfc].name, a.objects[dfc].name, 'igual a transformar');
  const c = J(s); E.applyEffect(c, hab(u), { do: 'convert', target: 'self-source' }, null, ev); assert.equal(c.objects[u].name, URSO, '701.28c: carta de uma face só, nada acontece');
});

test('Sinister Gnarlbark e Patient Instructor: os scripts valem, o validador recusa forma errada e as frases saem em português', () => {
  assert.equal(S.validateScript({ name: 'Sinister Gnarlbark', abilities: [{ kind: 'triggered', when: 'end-step', effects: [{ do: 'draw', amount: 1 }, { do: 'blight', amount: 1 }] }], example: { action: 'etb', target: 'none', expect: { attached: false } } }).join(), '');
  assert.equal(S.validateScript({ name: 'Patient Instructor', abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'recruit' }] }], example: { action: 'etb', target: 'none', expect: { handDelta: 0 } } }).join(), '');
  assert.match(S.validateScript({ name: 'X', effects: [{ do: 'blight', amount: 0 }], example: { target: 'none', expect: { handDelta: 0 } } }).join(), /blight/);
  assert.equal(T.descreveEfeitos([{ do: 'draw', amount: 1 }, { do: 'blight', amount: 1 }]), 'compra 1 carta; aflige 1 (põe 1 marcador −1/−1 numa criatura sua, à sua escolha)');
  assert.equal(T.descreveEfeitos([{ do: 'recruit' }]), 'recruta (compra uma carta e descarta uma; se a descartada não for terreno, cria um Soldado Humano 1/1 branco)');
});
