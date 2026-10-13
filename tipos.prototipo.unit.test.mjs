// T-36 · CR5 · Protótipo (Comprehensive Rules 702.160 e 718, com 400.7 e 105.2).
// Texto da regra: .regras/cr-2026-09-25.txt. Carta exemplo com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge, clone
// de 13/10/2026): Boulderbranch Golem. As cartas "de teste" são scripts sintéticos que isolam a regra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, T, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => x.name === 'Boulderbranch Golem'))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: ['Prototype'], oracle_text: c.oracle_text, colors: [], power: c.power, toughness: c.toughness };
for (const [n, k] of Object.entries({ Forest: 'G', Island: 'U' })) C[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = {
  'Anula Quatro': { name: 'Anula Quatro', effects: [{ do: 'counter', target: { zona: 'stack', tipos: ['creature'], mvMax: 4 } }], ...EX },
  'Mata Verde': { name: 'Mata Verde', effects: [{ do: 'destroy', target: { tipos: ['creature'], cor: 'G' } }], ...EX },
  'Volta': { name: 'Volta', effects: [{ do: 'bounce', target: 'creature' }], ...EX },
  'Reanima': { name: 'Reanima', effects: [{ do: 'mover', target: { zona: 'graveyard', de: 'you', tipos: ['creature'] }, para: 'battlefield' }], ...EX },
};
carta('Anula Quatro', 'Instant'); carta('Mata Verde', 'Instant'); carta('Volta', 'Instant'); carta('Reanima', 'Sorcery');

const BG = 'Boulderbranch Golem';
function mesa(seed = 1) {
  const deck = [{ name: BG, qty: 8, zone: 'main' }, ...Object.keys(SCRIPTS).map(name => ({ name, qty: 3, zone: 'main' })), { name: 'Forest', qty: 10, zone: 'main' }, { name: 'Island', qty: 10, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, cores = { G: 1, C: 3 }) => { s = J(s); for (const [c, n] of Object.entries(cores)) s.players[p].pool[c] += n; return s; };
const pool = (s, p = 0) => Object.values(s.players[p].pool).reduce((a, b) => a + b, 0);
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const esvazia = s => { for (let i = 0; i < 30; i++) { s = passaAte(s, x => !x.stack.length || !!x.pending); if (!s.pending) return s; const os = legais(s, s.pending.p); if (!os.length) return s; s = act(s, os.find(a => a.t === 'pick') || os[0]); } return s; };
const conjuras = (s, p, oid) => legais(s, p, a => a.t === 'cast' && a.oid === oid);
const proto = (s, p, oid) => conjuras(s, p, oid).filter(a => a.prototipo);
const pt = (s, oid) => { const st = E.stats(s, s.objects[oid]); return [st.power, st.toughness]; };

test('CR 718.3 · 702.160a · da mão, conjurar normal ({7}) ou como protótipo ({3}{G}): com quatro manas, só o protótipo é oferecido', () => {
  let s = mesa(); let g; [s, g] = poe(s, 0, BG, 'hand'); s = mana(s);
  eq([proto(s, 0, g).length, conjuras(s, 0, g).filter(a => !a.prototipo).length], [1, 0]);
  s = mana(s, 0, { C: 3 });
  eq([proto(s, 0, g).length, conjuras(s, 0, g).filter(a => !a.prototipo).length], [1, 1], 'com sete, as duas');
});

test('CR 718.3a/b · como protótipo: paga {3}{G}; na pilha e no campo é 3/3, verde, valor de mana 4; a entrada ganha 3 de vida', () => {
  let s = mesa(); let g; [s, g] = poe(s, 0, BG, 'hand'); s = mana(s);
  const antes = pool(s), vida = s.players[0].life;
  s = act(s, proto(s, 0, g)[0]);
  eq([antes - pool(s), s.objects[g].zone], [4, 'stack']);
  eq([J(E.coresDe(s, s.objects[g])), E.manaValueT(s, s.objects[g])], [['G'], 4], 'na pilha: verde, valor 4');
  s = esvazia(s);
  eq([s.objects[g].zone, pt(s, g), J(E.coresDe(s, s.objects[g])), E.manaValueT(s, s.objects[g]), s.players[0].life - vida], ['battlefield', [3, 3], ['G'], 4, 3]);
});

test('CR 718.4 · conjurada normal: 6/5, incolor, valor de mana 7; a entrada ganha 6', () => {
  let s = mesa(); let g; [s, g] = poe(s, 0, BG, 'hand'); s = mana(s, 0, { C: 7 });
  const vida = s.players[0].life;
  s = esvazia(act(s, conjuras(s, 0, g).find(a => !a.prototipo)));
  eq([pt(s, g), J(E.coresDe(s, s.objects[g])), E.manaValueT(s, s.objects[g]), s.players[0].life - vida], [[6, 5], [], 7, 6]);
});

test('CR 718.4 · 400.7 · fora da pilha e do campo a carta volta ao normal: devolvida à mão é 6/5 de valor 7', () => {
  let s = mesa(); let g; [s, g] = poe(s, 0, BG, 'hand'); s = mana(s);
  s = esvazia(act(s, proto(s, 0, g)[0]));
  let v; [s, v] = poe(s, 1, 'Volta', 'hand'); s = mana(s, 1, { U: 1 });
  s = passaAte(s, x => x.turn.priority === 1 || (x.pending && x.pending.p === 1));
  s = esvazia(act(s, legais(s, 1, a => a.t === 'cast' && a.oid === v && a.targets[0].oid === g)[0]));
  eq([s.objects[g].zone, pt(s, g), E.manaValueT(s, s.objects[g]), !!s.objects[g].prototipoT], ['hand', [6, 5], 7, false]);
});

test('CR 718.3b · na pilha, o protótipo é alvo de "anule a mágica de valor de mana 4 ou menos"; a normal (7), não', () => {
  let s = mesa(); let g; [s, g] = poe(s, 0, BG, 'hand'); s = mana(s);
  s = act(s, proto(s, 0, g)[0]);
  let an; [s, an] = poe(s, 1, 'Anula Quatro', 'hand'); s = mana(s, 1, { U: 1 });
  s = act(s, { t: 'pass', p: 0 });
  assert.ok(legais(s, 1, a => a.t === 'cast' && a.oid === an && (a.targets || []).some(t => t.oid === g)).length, 'o protótipo (valor 4) é alvo');
  let s2 = mesa(); let g2; [s2, g2] = poe(s2, 0, BG, 'hand'); s2 = mana(s2, 0, { C: 7 });
  s2 = act(s2, conjuras(s2, 0, g2).find(a => !a.prototipo));
  let an2; [s2, an2] = poe(s2, 1, 'Anula Quatro', 'hand'); s2 = mana(s2, 1, { U: 1 });
  s2 = act(s2, { t: 'pass', p: 0 });
  assert.equal(legais(s2, 1, a => a.t === 'cast' && a.oid === an2 && (a.targets || []).some(t => t.oid === g2)).length, 0, 'a normal (valor 7) não');
});

test('CR 718.3b · no campo, o protótipo é verde: "destrua a criatura verde alvo" alcança só ele', () => {
  let s = mesa(); let g; [s, g] = poe(s, 0, BG, 'hand'); s = mana(s);
  s = esvazia(act(s, proto(s, 0, g)[0]));
  let m; [s, m] = poe(s, 1, 'Mata Verde', 'hand'); s = mana(s, 1, { U: 1 });
  s = passaAte(s, x => x.turn.priority === 1 || (x.pending && x.pending.p === 1));
  assert.ok(legais(s, 1, a => a.t === 'cast' && a.oid === m && a.targets[0].oid === g).length);
});

test('CR 718.3 · pedido direto: protótipo de carta sem protótipo é recusado; protótipo do cemitério (sem permissão) também', () => {
  let s = mesa(); let v; [s, v] = poe(s, 0, 'Volta', 'hand'); s = mana(s);
  assert.throws(() => E.apply(s, { t: 'cast', p: 0, oid: v, prototipo: true, targets: [] }));
  let g; [s, g] = poe(s, 0, BG, 'graveyard');
  assert.throws(() => E.apply(s, { t: 'cast', p: 0, oid: g, prototipo: true }));
});

test('Validador · self.prototipo precisa de custo de mana, poder e resistência', () => {
  const base = { name: 'X', self: { prototipo: { mana: '{1}{G}', power: 2, toughness: 2 } }, ...EX };
  eq(SC.validateScript(base), []);
  assert.ok(SC.validateScript({ ...base, self: { prototipo: { mana: '{1}', power: 2 } } }).some(e => /protótipo/.test(e)));
  assert.ok(SC.validateScript({ ...base, self: { prototipo: { power: 2, toughness: 2 } } }).some(e => /protótipo/.test(e)));
});

test('Registro · o protótipo diz "como protótipo"', () => {
  let s = mesa(); let g; [s, g] = poe(s, 0, BG, 'hand'); s = mana(s);
  const a = proto(s, 0, g)[0], r = E.apply(s, a);
  const linhas = T.describe(s, a, r.events, r.state).join(' | ');
  assert.ok(/conjurou Boulderbranch Golem \(como protótipo\)/.test(linhas), linhas);
});

test('CR 718 · passeio aleatório com o Golem: nada oferecido é recusado e fora da pilha e do campo ele é sempre o normal', () => {
  let protos = 0;
  for (let seed = 1; seed <= 5; seed++) {
    let s = mesa(seed), r = seed * 49979687;
    for (let i = 0; i < 300 && s.status !== 'over'; i++) {
      const p = s.pending ? s.pending.p : s.turn.priority;
      if (i % 6 === 0 && !s.pending) s = mana(s, p, { G: 2, U: 1, C: 3 });
      const acoes = E.legalActions(s, p).filter(a => a.t !== 'concede');
      assert.ok(acoes.length, `semente ${seed}, passo ${i}: sem ação`);
      r = (r * 1103515245 + 12345) & 0x7fffffff;
      const pref = acoes.filter(a => a.t === 'cast');
      const a = pref.length && r % 3 ? pref[r % pref.length] : acoes[r % acoes.length];
      if (a.prototipo) protos++;
      s = E.apply(s, a).state; // oferta = aceito
      for (const o of Object.values(s.objects)) if (o.name === BG && o.zone !== 'stack' && o.zone !== 'battlefield') assert.ok(!o.prototipoT, `semente ${seed}, passo ${i}`);
    }
  }
  assert.ok(protos > 0, 'o protótipo foi jogado no passeio');
});
