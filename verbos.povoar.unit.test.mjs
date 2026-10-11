// V-4 · CR 701.36 · povoar. Texto oficial em .listas/oficiais-verbos.json (Oracle do Forge e mtggoldfish, 11/10/2026):
// Eyes in the Skies — "Create a 1/1 white Bird creature token with flying, then populate."
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { E, J, act, poe, legais, mesa, comMana, tudo, criatura, conjura } from './verbos.mjs';
const { scripts: S, table: T } = loadModules();
const URSO = criatura('Urso de Teste 3/3', 3, 3);
const fichas = (s, p) => Object.values(s.objects).filter(o => o.token && o.controller === p && o.zone === 'battlefield');
const fonte = (s, p = 0) => ({ oid: 'hab', name: 'Teste', controller: p, ability: true, source: null, effects: [], targets: [] });
const SOLDADO = { name: 'Soldier', types: ['creature'], subtypes: ['Soldier'], colors: ['W'], power: 1, toughness: 1 };
const PISTA = { name: 'Clue', types: ['artifact'], subtypes: ['Clue'], colors: [], abilities: [{ kind: 'activated', cost: { mana: '{2}', sacrifice: true }, effects: [{ do: 'draw', amount: 1 }] }] };
/** Cria a ficha pelo efeito `token` do motor e devolve o oid dela. */
const cria = (s, def, p) => { const antes = new Set(Object.keys(s.objects)); E.applyEffect(s, fonte(s, p), { do: 'token', amount: 1, token: def }, null, []); return Object.keys(s.objects).find(k => !antes.has(k)); };
const ateDecisao = s => { for (let i = 0; i < 10 && !s.pending && s.stack.length; i++) s = act(s, { t: 'pass', p: s.turn.priority }); return s; };
function arma(meus = []) { let s = mesa(['Eyes in the Skies', ...meus], [URSO]), m; [s, m] = poe(s, 0, 'Eyes in the Skies', 'hand'); return [comMana(s, 'WWWW'), m]; }

test('CR 701.36 · povoar: com uma só ficha de criatura sua, cria a cópia dela sem perguntar (Eyes in the Skies: o Pássaro e a cópia do Pássaro)', () => {
  const [s, m] = arma();
  const r = tudo(conjura(s, 0, m));
  const fs = fichas(r, 0); assert.equal(fs.length, 2); assert.ok(fs.every(f => f.name === 'Bird'));
  assert.ok(fs.every(f => E.hasKeyword(r, f, 'flying') && E.stats(r, f).power === 1), 'a cópia tem os mesmos valores copiáveis');
  assert.equal(r.pending, null); assert.equal(r.escolhaV, undefined); assert.equal(r.verbo, undefined);
});

test('CR 701.36 · povoar: com mais de uma ficha de criatura, quem controla escolhe qual copiar; ficha que não é criatura e ficha do oponente não entram', () => {
  let [s, m] = arma(); s = J(s);
  const sold = cria(s, SOLDADO, 0), pista = cria(s, PISTA, 0), dele = cria(s, SOLDADO, 1);
  s = ateDecisao(conjura(s, 0, m));
  assert.equal(s.pending.kind, 'pick'); assert.equal(s.pending.min, 1);
  const passaro = fichas(s, 0).find(f => f.name === 'Bird').oid;
  assert.deepEqual([...s.pending.from].sort(), [sold, passaro].sort(), 'só as suas fichas de criatura');
  assert.ok(!s.pending.from.includes(pista) && !s.pending.from.includes(dele));
  s = tudo(act(s, { t: 'pick', p: 0, oid: sold }));
  assert.equal(fichas(s, 0).filter(f => f.name === 'Soldier').length, 2, 'copiou o Soldado'); assert.equal(fichas(s, 0).filter(f => f.name === 'Bird').length, 1);
  assert.equal(fichas(s, 1).length, 1, 'o oponente não ganha nada');
});

test('CR 701.36 · povoar (b): sem ficha de criatura sua, nada é criado; a cópia não leva marcadores (707.2)', () => {
  let s = mesa([URSO], [URSO]); s = J(s);
  const ev = []; E.applyEffect(s, fonte(s), { do: 'populate' }, null, ev);
  assert.equal(fichas(s, 0).length, 0); assert.equal(s.pending, null); assert.ok(ev.some(e => e.do === 'populate' && e.amount === 0));
  const sold = cria(s, SOLDADO, 0); s.objects[sold].counters.p1p1 = 2;
  E.applyEffect(s, fonte(s), { do: 'populate' }, null, []);
  const nova = fichas(s, 0).find(f => f.oid !== sold);
  assert.ok(nova && nova.name === 'Soldier'); assert.equal(nova.counters.p1p1 || 0, 0, 'marcadores não são copiáveis'); assert.equal(E.stats(s, nova).power, 1);
});

test('CR 701.36 · povoar: o script, o validador e a frase em português', () => {
  const erros = effects => S.validateScript({ name: 'X', effects, example: { target: 'none', expect: { tokens: 1 } } }).join(' | ');
  assert.equal(erros([{ do: 'populate' }]), ''); assert.match(erros([{ do: 'populate' }, { do: 'destroy', target: 'creature' }]), /efeito com alvo depois de uma escolha/);
  assert.equal(T.descreveEfeitos(S.SCRIPTS['Eyes in the Skies'].effects), 'cria 1 ficha de Bird 1/1; povoa (cria uma ficha que é cópia de uma ficha de criatura sua)');
});
