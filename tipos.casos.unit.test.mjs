// T-39 · CR5 · Casos (Comprehensive Rules 719 e 702.169, com 603.4 e 400.7).
// Texto da regra: .regras/cr-2026-09-25.txt. Carta exemplo com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge, clone
// de 13/10/2026): Case of the Filched Falcon. As cartas "de teste" são scripts sintéticos que isolam a regra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, T, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => x.name === 'Case of the Filched Falcon'))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: ['Investigate'], oracle_text: c.oracle_text, colors: ['U'] };
C.Island = { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = {
  'Volta': { name: 'Volta', effects: [{ do: 'bounce', target: 'permanent' }], ...EX },
  'Caso de Mão Vazia': { name: 'Caso de Mão Vazia', self: { caso: { resolver: { per: 'cards-in-hand', max: 0 }, resolvido: { continuo: [{ afetados: { tipos: ['creature'], de: 'you' }, poder: 1, resistencia: 1 }] } } }, ...EX },
};
carta('Volta', 'Instant'); carta('Caso de Mão Vazia', 'Enchantment — Case');
carta('Amuleto', 'Artifact'); carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' });

const CF = 'Case of the Filched Falcon';
function mesa(seed = 1) {
  const deck = [{ name: CF, qty: 4, zone: 'main' }, { name: 'Caso de Mão Vazia', qty: 2, zone: 'main' }, { name: 'Volta', qty: 3, zone: 'main' }, { name: 'Amuleto', qty: 8, zone: 'main' }, { name: 'Urso', qty: 6, zone: 'main' }, { name: 'Island', qty: 17, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const esvazia = s => { for (let i = 0; i < 30; i++) { s = passaAte(s, x => !x.stack.length || !!x.pending); if (!s.pending) return s; const os = legais(s, s.pending.p); if (!os.length) return s; s = act(s, os[0]); } return s; };
const resolvido = (s, oid) => E.casoResolvidoT(s, s.objects[oid]);
const fimDoTurno = s => esvazia(passaAte(s, x => x.turn.active === 0 && x.turn.step === 'end' && !x.stack.length && !x.pending || x.turn.active === 1));
const caso = (s, n = CF) => { let c; [s, c] = poe(s, 0, n, 'battlefield'); return [s, c]; };
const ativadas = (s, oid) => legais(s, 0, a => a.t === 'activate' && a.oid === oid);

test('CR 719.3a · "To solve": no início do seu passo final, com três ou mais artefatos, o Caso fica resolvido', () => {
  let s = mesa(); let c; [s, c] = caso(s);
  for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Amuleto');
  assert.equal(resolvido(s, c), false, 'ainda não: só no passo final');
  s = fimDoTurno(s);
  assert.equal(resolvido(s, c), true);
});

test('CR 719.3a · sem a condição no passo final, o Caso continua sem resolver (e não resolve no turno do oponente)', () => {
  let s = mesa(); let c; [s, c] = caso(s); [s] = poe(s, 0, 'Amuleto'); [s] = poe(s, 0, 'Amuleto');
  s = fimDoTurno(s);
  assert.equal(resolvido(s, c), false, 'dois artefatos não bastam');
  s = J(s); [s] = poe(s, 0, 'Amuleto');
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'end');
  s = esvazia(s);
  assert.equal(resolvido(s, c), false, 'no passo final do oponente, não');
});

test('CR 603.4 · a condição é conferida de novo na resolução: sem os artefatos quando a habilidade resolve, não resolve', () => {
  let s = mesa(); let c; [s, c] = caso(s); let a; [s, a] = poe(s, 0, 'Amuleto'); [s] = poe(s, 0, 'Amuleto'); [s] = poe(s, 0, 'Amuleto');
  let v; [s, v] = poe(s, 0, 'Volta', 'hand');
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'end' && x.stack.length > 0); s = mana(s); // a reserva esvazia entre as etapas
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === v && x.targets[0].oid === a)[0]);
  s = esvazia(s);
  eq([s.objects[a].zone, resolvido(s, c)], ['hand', false]);
});

test('CR 719.3c / 702.169d · a habilidade "Solved" só existe com o Caso resolvido', () => {
  let s = mesa(); let c; [s, c] = caso(s); for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Amuleto'); s = mana(s);
  eq(ativadas(s, c).length, 0, 'sem resolver, não ativa');
  assert.throws(() => E.apply(s, { t: 'activate', p: 0, oid: c, index: 0, targets: [] }));
  s = fimDoTurno(s); s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending); s = mana(s);
  assert.ok(ativadas(s, c).length > 0, 'resolvido, ativa');
});

test('Case of the Filched Falcon (texto oficial) · ao entrar investiga; resolvido, {2}{U} e sacrificar: o artefato não criatura alvo ganha quatro +1/+1 e vira Pássaro 0/0 voador', () => {
  let s = mesa(); let c; [s, c] = poe(s, 0, CF, 'hand'); s = mana(s);
  s = esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === c)[0]));
  const pistas = Object.values(s.objects).filter(o => o.zone === 'battlefield' && o.token && /Clue/.test(o.name));
  eq(pistas.length, 1, 'investigou');
  let a; [s, a] = poe(s, 0, 'Amuleto'); [s] = poe(s, 0, 'Amuleto');
  s = fimDoTurno(s); assert.ok(resolvido(s, c), 'Pista + 2 Amuletos = 3 artefatos');
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending); s = mana(s);
  const at = ativadas(s, c).find(x => (x.targets || [])[0] && x.targets[0].oid === a);
  assert.ok(at, 'mira o Amuleto');
  s = esvazia(act(s, at));
  const st = E.stats(s, s.objects[a]);
  eq([s.objects[c].zone, E.isCreature(s, s.objects[a]), st.power, st.toughness, E.hasKeyword(s, s.objects[a], 'flying'), E.tiposDe(s, s.objects[a]).includes('artifact')], ['graveyard', true, 4, 4, true, true]);
});

test('CR 719.3b · 400.7 · resolvido até sair do campo: o Caso que volta é um objeto novo, sem resolver', () => {
  let s = mesa(); let c; [s, c] = caso(s); for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Amuleto');
  s = fimDoTurno(s); assert.ok(resolvido(s, c));
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  let v; [s, v] = poe(s, 0, 'Volta', 'hand'); s = mana(s);
  s = esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === v && a.targets[0].oid === c)[0]));
  s = mana(s); s = esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === c)[0]));
  eq([s.objects[c].zone, resolvido(s, c)], ['battlefield', false]);
});

test('CR 702.169b · habilidade estática "Solved": vale só com o Caso resolvido (condição por contagem: mão vazia)', () => {
  let s = mesa(); let c; [s, c] = caso(s, 'Caso de Mão Vazia'); let u; [s, u] = poe(s, 0, 'Urso');
  s = J(s); for (const oid of s.zones[0].hand.slice()) { s.zones[0].hand.splice(s.zones[0].hand.indexOf(oid), 1); s.zones[0].library.push(oid); s.objects[oid].zone = 'library'; }
  const pt = s => { const st = E.stats(s, s.objects[u]); return [st.power, st.toughness]; };
  eq(pt(s), [2, 2]);
  s = fimDoTurno(s);
  eq([resolvido(s, c), pt(s)], [true, [3, 3]]);
});

test('Validador · self.caso: condição por contagem (per, min ou max) ou por "controla" (seletor, min ou max); "resolvido" dá alguma coisa', () => {
  const base = { name: 'X', self: { caso: { resolver: { controla: { tipos: ['artifact'] }, min: 3 }, resolvido: { abilities: [{ kind: 'activated', cost: { mana: '{1}' }, effects: [{ do: 'draw', amount: 1 }] }] } } }, ...EX };
  eq(SC.validateScript(base), []);
  assert.ok(SC.validateScript({ ...base, self: { caso: { resolver: { per: 'contagem-inventada', min: 1 }, resolvido: base.self.caso.resolvido } } }).some(e => /caso/.test(e)));
  assert.ok(SC.validateScript({ ...base, self: { caso: { resolver: { controla: { tipos: ['artifact'] } }, resolvido: base.self.caso.resolvido } } }).some(e => /caso/.test(e)), 'sem min nem max');
  assert.ok(SC.validateScript({ ...base, self: { caso: { resolver: base.self.caso.resolver, resolvido: {} } } }).some(e => /caso/.test(e)), 'resolvido vazio');
});

test('Registro · o Caso resolvido aparece no registro', () => {
  let s = mesa(); let c; [s, c] = caso(s); for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Amuleto');
  let x = passaAte(s, y => y.turn.active === 0 && y.turn.step === 'end' && y.stack.length > 0); const linhas = [];
  for (let i = 0; i < 6 && x.stack.length; i++) { const b = { t: 'pass', p: x.turn.priority }, rr = E.apply(x, b); linhas.push(...T.describe(x, b, rr.events, rr.state)); x = rr.state; }
  assert.ok(linhas.some(l => /Case of the Filched Falcon foi resolvido/.test(l)), linhas.join(' | '));
});

test('CR 719 · passeio aleatório com Casos: nada oferecido é recusado e um Caso chega a ser resolvido', () => {
  let resolvidos = 0;
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
      const res = E.apply(s, a); // oferta = aceito
      resolvidos += res.events.filter(e => e.do === 'caso_resolvido' && !e.failed).length;
      s = res.state;
    }
  }
  assert.ok(resolvidos > 0, 'algum Caso foi resolvido no passeio');
});

/* ---------------- T-41 · correção da auditoria independente ---------------- */
test('CR 603.3a / 603.4 · o "você" da condição é quem controla a habilidade: o oponente toma o Caso com o gatilho na pilha e ele resolve pelos artefatos de quem disparou', () => {
  SCRIPTS['Rouba'] = { name: 'Rouba', effects: [{ do: 'ganhar_controle', target: 'permanent' }], ...EX }; carta('Rouba', 'Instant');
  const deck = [{ name: CF, qty: 4, zone: 'main' }, { name: 'Rouba', qty: 3, zone: 'main' }, { name: 'Amuleto', qty: 8, zone: 'main' }, { name: 'Island', qty: 25, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  let c; [s, c] = poe(s, 0, CF, 'battlefield'); for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Amuleto');
  let r; [s, r] = poe(s, 1, 'Rouba', 'hand');
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'end' && x.stack.length > 0);
  s = act(s, { t: 'pass', p: 0 }); s = mana(s, 1);
  s = act(s, legais(s, 1, a => a.t === 'cast' && a.oid === r && a.targets[0].oid === c)[0]);
  s = esvazia(s);
  eq([s.objects[c].controller, resolvido(s, c)], [1, true]);
  delete SCRIPTS['Rouba'];
});
