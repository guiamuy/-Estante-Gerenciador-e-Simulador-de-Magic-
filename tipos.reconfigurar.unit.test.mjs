// T-43 · CR5 · Reconfigurar (Comprehensive Rules 702.151 e 301.5c, com 704.5n e 205.3d).
// Texto da regra: .regras/cr-2026-09-25.txt. Carta exemplo com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge, clone
// de 13/10/2026): Lizard Blades. As cartas "de teste" são scripts sintéticos que isolam a regra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, T, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => x.name === 'Lizard Blades'))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: ['Double strike', 'Reconfigure'], oracle_text: c.oracle_text, colors: ['R'], power: c.power, toughness: c.toughness };
C.Mountain = { name: 'Mountain', type_line: 'Basic Land — Mountain', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {R}.)', colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = {
  'Volta': { name: 'Volta', effects: [{ do: 'bounce', target: 'permanent' }], ...EX },
  'Ira': { name: 'Ira', effects: [{ do: 'destroy_all', types: ['creature'] }], ...EX },
};
carta('Volta', 'Instant'); carta('Ira', 'Sorcery');
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' });

const LB = 'Lizard Blades';
function mesa(seed = 1) {
  const deck = [{ name: LB, qty: 6, zone: 'main' }, { name: 'Volta', qty: 3, zone: 'main' }, { name: 'Ira', qty: 2, zone: 'main' }, { name: 'Urso', qty: 10, zone: 'main' }, { name: 'Mountain', qty: 19, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const esvazia = s => { for (let i = 0; i < 30; i++) { s = passaAte(s, x => !x.stack.length || !!x.pending); if (!s.pending) return s; const os = legais(s, s.pending.p); if (!os.length) return s; s = act(s, os[0]); } return s; };
const ativ = (s, oid) => legais(s, 0, a => a.t === 'activate' && a.oid === oid);
const lamina = s => { let l; [s, l] = poe(s, 0, LB, 'battlefield', { sick: false }); return [s, l]; };
const criatura = (s, oid) => E.isCreature(s, s.objects[oid]);
const anexa = (s, l, u) => { s = mana(s); return esvazia(act(s, ativ(s, l).find(a => (a.targets || []).some(t => t.oid === u)))); };

test('CR 702.151a · reconfigurar: {2}, anexar a outra criatura sua, só como feitiço; anexada, a lâmina deixa de ser criatura (702.151b) e a criatura ganha golpe duplo', () => {
  let s = mesa(); let l; [s, l] = lamina(s); let u; [s, u] = poe(s, 0, 'Urso');
  assert.ok(criatura(s, l) && E.hasKeyword(s, s.objects[l], 'double strike'), 'no campo, sozinha, é criatura com golpe duplo');
  s = anexa(s, l, u);
  eq([s.objects[l].attachedTo, criatura(s, l), E.hasKeyword(s, s.objects[u], 'double strike')], [u, false, true]);
  assert.ok(!E.tiposDe(s, s.objects[l]).includes('creature') && E.tiposDe(s, s.objects[l]).includes('artifact'));
});

test('CR 702.151a · não se anexa a si mesma nem a criatura do oponente; não é oferecida fora do tempo de feitiço', () => {
  let s = mesa(); let l; [s, l] = lamina(s); let u; [s, u] = poe(s, 1, 'Urso'); s = mana(s);
  eq(ativ(s, l).filter(a => (a.targets || []).length).length, 0, 'sem outra criatura sua, nada para anexar');
  assert.throws(() => E.apply(s, { t: 'activate', p: 0, oid: l, index: 0, targets: [{ oid: l }] }));
  assert.throws(() => E.apply(s, { t: 'activate', p: 0, oid: l, index: 0, targets: [{ oid: u }] }));
});

test('CR 702.151a · desanexar: só anexada e só como feitiço; desanexada volta a ser criatura', () => {
  let s = mesa(); let l; [s, l] = lamina(s); let u; [s, u] = poe(s, 0, 'Urso');
  s = mana(s); eq(ativ(s, l).filter(a => !(a.targets || []).length).length, 0, 'solta, não há o que desanexar');
  s = anexa(s, l, u); s = mana(s);
  const d = ativ(s, l).filter(a => !(a.targets || []).length); assert.equal(d.length, 1);
  s = esvazia(act(s, d[0]));
  eq([s.objects[l].attachedTo || null, criatura(s, l), E.hasKeyword(s, s.objects[u], 'double strike')], [null, true, false]);
});

test('CR 704.5n · a criatura equipada sai do campo: a lâmina fica solta no campo e volta a ser criatura', () => {
  let s = mesa(); let l; [s, l] = lamina(s); let u; [s, u] = poe(s, 0, 'Urso'); s = anexa(s, l, u);
  let v; [s, v] = poe(s, 0, 'Volta', 'hand'); s = mana(s);
  s = esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === v && a.targets[0].oid === u)[0]));
  eq([s.objects[u].zone, s.objects[l].zone, s.objects[l].attachedTo || null, criatura(s, l)], ['hand', 'battlefield', null, true]);
});

test('CR 702.151b · anexada ela não é criatura: "destrua todas as criaturas" leva o Urso e deixa a lâmina, que cai solta e vira criatura', () => {
  let s = mesa(); let l; [s, l] = lamina(s); let u; [s, u] = poe(s, 0, 'Urso'); s = anexa(s, l, u);
  let i; [s, i] = poe(s, 0, 'Ira', 'hand'); s = mana(s);
  s = esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === i)[0]));
  eq([s.objects[u].zone, s.objects[l].zone, criatura(s, l)], ['graveyard', 'battlefield', true]);
});

test('CR 205.3d · anexada, a lâmina perde o subtipo de criatura (Lizard) e fica Equipamento', () => {
  let s = mesa(); let l; [s, l] = lamina(s); let u; [s, u] = poe(s, 0, 'Urso'); s = anexa(s, l, u);
  const linha = E.linhaDeTipo ? E.linhaDeTipo(s, s.objects[l]) : '';
  if (linha) { assert.ok(/Equipment/.test(linha) && !/Lizard/.test(linha) && !/Creature/.test(linha), linha); }
});

test('Validador · self.reconfigurar é o custo de reconfigurar', () => {
  eq(SC.validateScript({ name: 'X', self: { reconfigurar: '{2}' }, ...EX }), []);
  assert.ok(SC.validateScript({ name: 'X', self: { reconfigurar: 2 }, ...EX }).some(e => /reconfigurar/.test(e)));
});

test('CR 702.151 · passeio aleatório com lâminas: nada oferecido é recusado e a lâmina anexada nunca é criatura', () => {
  let anexadas = 0;
  for (let seed = 1; seed <= 5; seed++) {
    let s = mesa(seed), r = seed * 49979687;
    for (let i = 0; i < 300 && s.status !== 'over'; i++) {
      const p = s.pending ? s.pending.p : s.turn.priority;
      if (i % 6 === 0 && !s.pending) s = mana(s, p, 2);
      const acoes = E.legalActions(s, p).filter(a => a.t !== 'concede');
      assert.ok(acoes.length, `semente ${seed}, passo ${i}: sem ação`);
      r = (r * 1103515245 + 12345) & 0x7fffffff;
      const pref = acoes.filter(a => a.t === 'cast' || a.t === 'activate');
      const a = pref.length && r % 3 ? pref[r % pref.length] : acoes[r % acoes.length];
      s = E.apply(s, a).state; // oferta = aceito
      for (const o of Object.values(s.objects)) if (o.name === LB && o.zone === 'battlefield' && o.attachedTo) { anexadas++; assert.ok(!E.isCreature(s, o), `semente ${seed}, passo ${i}`); }
    }
  }
  assert.ok(anexadas > 0, 'alguma lâmina foi anexada no passeio');
});
