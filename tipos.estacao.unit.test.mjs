// T-37 · CR5 · Estação (Comprehensive Rules 702.184 e 721, com 400.7 e 608.2h).
// Texto da regra: .regras/cr-2026-09-25.txt. Carta exemplo com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge, clone
// de 13/10/2026): Pinnacle Kill-Ship. As cartas "de teste" são scripts sintéticos que isolam a regra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, T, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => x.name === 'Pinnacle Kill-Ship'))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: ['Flying', 'Station'], oracle_text: c.oracle_text, colors: [], power: c.power, toughness: c.toughness };
C.Plains = { name: 'Plains', type_line: 'Basic Land — Plains', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {W}.)', colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = {
  'Sopro': { name: 'Sopro', effects: [{ do: 'gain', amount: 1 }], ...EX },
  'Volta': { name: 'Volta', effects: [{ do: 'bounce', target: 'permanent' }], ...EX },
  'Força': { name: 'Força', effects: [{ do: 'pump', power: 3, toughness: 3, target: 'creature' }], ...EX },
};
carta('Sopro', 'Instant'); carta('Volta', 'Instant'); carta('Força', 'Instant');
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' }); carta('Gigante', 'Creature — Giant', { power: '5', toughness: '5' });
carta('Muro', 'Creature — Wall', { power: '0', toughness: '4' });

const KS = 'Pinnacle Kill-Ship';
function mesa(seed = 1) {
  const deck = [{ name: KS, qty: 4, zone: 'main' }, ...['Sopro', 'Volta', 'Força'].map(name => ({ name, qty: 2, zone: 'main' })), ...['Urso', 'Gigante', 'Muro'].map(name => ({ name, qty: 6, zone: 'main' })), { name: 'Plains', qty: 12, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const esvazia = s => { for (let i = 0; i < 30; i++) { s = passaAte(s, x => !x.stack.length || !!x.pending); if (!s.pending) return s; const os = legais(s, s.pending.p); if (!os.length) return s; s = act(s, os[0]); } return s; };
const estacoes = (s, p, oid) => legais(s, p, a => a.t === 'activate' && a.oid === oid && a.pay && a.pay.tapOther);
const carga = (s, oid) => (s.objects[oid].counters || {}).charge || 0;
const nave = s => { let k; [s, k] = poe(s, 0, KS, 'battlefield', { sick: false }); return [s, k]; };
const estaciona = (s, k, quem) => esvazia(act(s, estacoes(s, 0, k).find(a => [].concat(a.pay.tapOther)[0] === quem)));

test('CR 702.184a · estação: vire outra criatura sua desvirada (enjoo não impede) e a nave recebe marcadores de carga iguais ao poder dela', () => {
  let s = mesa(); let k; [s, k] = nave(s); let u; [s, u] = poe(s, 0, 'Urso'); let g; [s, g] = poe(s, 0, 'Gigante');
  eq(estacoes(s, 0, k).map(a => [].concat(a.pay.tapOther)).sort(), [[u], [g]].sort(), 'uma oferta por criatura que pode ser virada');
  s = estaciona(s, k, u);
  eq([carga(s, k), s.objects[u].tapped], [2, true]);
  s = estaciona(s, k, g);
  eq(carga(s, k), 7);
});

test('CR 702.184a · estação só como feitiço: não no turno do oponente nem com a pilha ocupada; criatura virada não serve', () => {
  let s = mesa(); let k; [s, k] = nave(s); let u; [s, u] = poe(s, 0, 'Urso');
  let sp; [s, sp] = poe(s, 0, 'Sopro', 'hand'); s = mana(s);
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === sp)[0]);
  eq(estacoes(s, 0, k).length, 0, 'pilha ocupada');
  s = esvazia(s); s = J(s); s.objects[u].tapped = true;
  eq(estacoes(s, 0, k).length, 0, 'a única criatura está virada');
  assert.throws(() => E.apply(s, { t: 'activate', p: 0, oid: k, index: 0, pay: { tapOther: [u] } }));
});

test('CR 721.2b · abaixo de 7 marcadores a nave não é criatura nem voa; com 7 ou mais é criatura artefato 7/7 com voar', () => {
  let s = mesa(); let k; [s, k] = nave(s); let u; [s, u] = poe(s, 0, 'Urso'); let g; [s, g] = poe(s, 0, 'Gigante');
  const ver = s => { const o = s.objects[k]; return [E.isCreature(s, o), E.hasKeyword(s, o, 'flying')]; };
  eq(ver(s), [false, false], 'sem marcador: só artefato, sem voar (a palavra impressa está dentro da faixa)');
  s = estaciona(s, k, g); eq([carga(s, k), ...ver(s)], [5, false, false]);
  s = estaciona(s, k, u); eq([carga(s, k), ...ver(s)], [7, true, true]);
  const st = E.stats(s, s.objects[k]); eq([st.power, st.toughness], [7, 7]);
  assert.ok(E.tiposDe(s, s.objects[k]).includes('artifact'), 'continua artefato');
});

test('CR 721.4 · a habilidade de estação existe sempre: com 7 ou mais marcadores ela continua oferecida', () => {
  let s = mesa(); let k; [s, k] = nave(s); s = J(s); s.objects[k].counters = { charge: 8 }; let u; [s, u] = poe(s, 0, 'Urso');
  assert.ok(estacoes(s, 0, k).length > 0);
});

test('CR 702.184a / 608.2h · o número de marcadores é o poder da criatura virada quando a estação resolve (Força em resposta: 5); criatura de poder 0 não põe nada', () => {
  let s = mesa(); let k; [s, k] = nave(s); let u; [s, u] = poe(s, 0, 'Urso'); let f; [s, f] = poe(s, 0, 'Força', 'hand'); s = mana(s);
  s = act(s, estacoes(s, 0, k).find(a => [].concat(a.pay.tapOther)[0] === u));
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === f && a.targets[0].oid === u)[0]);
  s = esvazia(s);
  eq(carga(s, k), 5);
  let m; [s, m] = poe(s, 0, 'Muro');
  s = estaciona(s, k, m);
  eq(carga(s, k), 5, 'o Muro (poder 0) não põe marcador');
});

test('CR 608.2h · a criatura virada sai do campo antes de a estação resolver: vale o último poder que ela tinha', () => {
  let s = mesa(); let k; [s, k] = nave(s); let g; [s, g] = poe(s, 0, 'Gigante'); let v; [s, v] = poe(s, 0, 'Volta', 'hand'); s = mana(s);
  s = act(s, estacoes(s, 0, k).find(a => [].concat(a.pay.tapOther)[0] === g));
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === v && a.targets[0].oid === g)[0]);
  s = esvazia(s);
  eq([s.objects[g].zone, carga(s, k)], ['hand', 5]);
});

test('CR 400.7 · a nave que sai e volta é um objeto novo: sem marcadores, não é criatura', () => {
  let s = mesa(); let k; [s, k] = nave(s); s = J(s); s.objects[k].counters = { charge: 7 };
  assert.ok(E.isCreature(s, s.objects[k]));
  let v; [s, v] = poe(s, 0, 'Volta', 'hand'); s = mana(s);
  s = esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === v && a.targets[0].oid === k)[0]));
  eq(s.objects[k].zone, 'hand');
  s = mana(s); s = esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === k)[0]));
  eq([s.objects[k].zone, carga(s, k), E.isCreature(s, s.objects[k])], ['battlefield', 0, false]);
});

test('Pinnacle Kill-Ship (texto oficial) · ao entrar, 10 de dano em até uma criatura alvo (pode não escolher)', () => {
  let s = mesa(); let c; [s, c] = poe(s, 0, KS, 'hand'); let g; [s, g] = poe(s, 1, 'Gigante'); s = mana(s);
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === c)[0]);
  s = passaAte(s, x => !x.stack.length || !!x.pending);
  const os = legais(s, s.pending ? s.pending.p : 0);
  assert.ok(s.pending, 'o gatilho pede o alvo');
  s = act(s, os.find(a => (a.targets || []).some(t => t.oid === g)) || os.find(a => a.index != null && s.pending.options[a.index] && s.pending.options[a.index].oid === g) || os[0]);
  s = esvazia(s);
  eq(s.objects[g].zone, 'graveyard');
});

test('Validador · self.estacao: faixas com N inteiro positivo em ordem; P/T opcional como par de inteiros', () => {
  const base = { name: 'X', self: { estacao: { faixas: [{ n: 4, palavras: ['flying'] }, { n: 8, pt: [5, 5] }] } }, ...EX };
  eq(SC.validateScript(base), []);
  assert.ok(SC.validateScript({ ...base, self: { estacao: { faixas: [] } } }).some(e => /estação/.test(e)));
  assert.ok(SC.validateScript({ ...base, self: { estacao: { faixas: [{ n: 8 }, { n: 4, pt: [1, 1] }] } } }).some(e => /estação/.test(e)), 'fora de ordem');
  assert.ok(SC.validateScript({ ...base, self: { estacao: { faixas: [{ n: 7, pt: [7] }] } } }).some(e => /estação/.test(e)));
});

test('Registro · a estação diz quantos marcadores de carga a nave recebeu', () => {
  let s = mesa(); let k; [s, k] = nave(s); [s] = poe(s, 0, 'Urso');
  let x = act(s, estacoes(s, 0, k)[0]); const linhas = [];
  for (let i = 0; i < 6 && x.stack.length; i++) { const b = { t: 'pass', p: x.turn.priority }, rr = E.apply(x, b); linhas.push(...T.describe(x, b, rr.events, rr.state)); x = rr.state; }
  assert.ok(linhas.some(l => /Pinnacle Kill-Ship recebeu 2 marcadores de carga \(estação\)/.test(l)), linhas.join(' | '));
});

test('CR 702.184 · passeio aleatório com a nave: nada oferecido é recusado e a estação acontece', () => {
  let feitas = 0;
  for (let seed = 1; seed <= 5; seed++) {
    let s = mesa(seed), r = seed * 49979687;
    for (let i = 0; i < 300 && s.status !== 'over'; i++) {
      const p = s.pending ? s.pending.p : s.turn.priority;
      if (i % 6 === 0 && !s.pending) s = mana(s, p, 2);
      const acoes = E.legalActions(s, p).filter(a => a.t !== 'concede');
      assert.ok(acoes.length, `semente ${seed}, passo ${i}: sem ação`);
      r = (r * 1103515245 + 12345) & 0x7fffffff;
      const pref = acoes.filter(a => a.t === 'cast' || (a.t === 'activate' && a.pay && a.pay.tapOther));
      const a = pref.length && r % 3 ? pref[r % pref.length] : acoes[r % acoes.length];
      if (a.t === 'activate' && a.pay && a.pay.tapOther) feitas++;
      s = E.apply(s, a).state; // oferta = aceito
    }
  }
  assert.ok(feitas > 0, 'a estação foi ativada no passeio');
});

/* ---------------- T-38 · correção da auditoria independente ---------------- */
test('CR 608.2h · a criatura recebe +3/+3 em resposta e depois sai do campo: vale o último poder que ela teve (5), não o da ativação (2)', () => {
  let s = mesa(); let k; [s, k] = nave(s); let u; [s, u] = poe(s, 0, 'Urso');
  let f; [s, f] = poe(s, 0, 'Força', 'hand'); let v; [s, v] = poe(s, 0, 'Volta', 'hand'); s = mana(s);
  s = act(s, estacoes(s, 0, k).find(a => [].concat(a.pay.tapOther)[0] === u));
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === f && a.targets[0].oid === u)[0]);
  s = passaAte(s, x => x.stack.length === 1 && x.turn.priority === 0);
  eq(E.stats(s, s.objects[u]).power, 5);
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === v && a.targets[0].oid === u)[0]);
  s = esvazia(s);
  eq([s.objects[u].zone, carga(s, k)], ['hand', 5]);
});

test('CR 721.2c · fora do campo a carta de estação não tem poder nem resistência', () => {
  let s = mesa(); let k; [s, k] = poe(s, 0, KS, 'hand');
  const st = E.stats(s, s.objects[k]);
  eq([st.power || 0, st.toughness || 0], [0, 0]);
});

/* ---------------- T-54 · 702.184c · estacionar por outra característica ---------------- */
test('CR 702.184c · "each creature you control with toughness greater than its power stations permanents using its toughness": o Muro 0/4 põe 4; o Urso 2/2 segue pelo poder; a do oponente não vale', () => {
  const sc = { ...SCRIPTS, 'Guardiã': { name: 'Guardiã', self: { estacionaPelaResistencia: true }, ...EX } };
  C['Guardiã'] = { name: 'Guardiã', type_line: 'Artifact Creature — Robot Soldier', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], power: '3', toughness: '4' };
  const deck = [{ name: KS, qty: 4, zone: 'main' }, { name: 'Guardiã', qty: 4, zone: 'main' }, ...['Urso', 'Muro'].map(name => ({ name, qty: 8, zone: 'main' })), { name: 'Plains', qty: 16, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed: 5, mode: 'full', cards: C, scripts: sc, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  let k, m, u; [s, k] = nave(s); [s, m] = poe(s, 0, 'Muro'); [s, u] = poe(s, 0, 'Urso');
  let g; [s, g] = poe(s, 1, 'Guardiã', 'battlefield');
  let t = estaciona(s, k, m); eq(carga(t, k), 0, 'a Guardiã do oponente não vale: o Muro tem poder 0');
  [s] = poe(s, 0, 'Guardiã', 'battlefield');
  t = estaciona(s, k, m); eq(carga(t, k), 4, 'com a Guardiã: a resistência do Muro');
  t = estaciona(s, k, u); eq(carga(t, k), 2, 'o Urso (resistência igual ao poder) segue pelo poder');
  const legal = estacoes(s, 0, k).map(action => ({ label: 'Ativar', action }));
  E.rotulosDaClasseT(s, k, legal, () => '');
  assert.ok(legal.some(b => /Estação: virar Muro \(\+4 de carga\)/.test(b.label)), JSON.stringify(legal.map(b => b.label)));
});

/* ---------------- T-55 · correções da auditoria independente ---------------- */
const comGuardia = (seed = 5) => {
  const sc = { ...SCRIPTS, 'Guardiã': { name: 'Guardiã', self: { estacionaPelaResistencia: true }, ...EX } };
  C['Guardiã'] = { name: 'Guardiã', type_line: 'Artifact Creature — Robot Soldier', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], power: '3', toughness: '4' };
  C['Muro Leve'] = { name: 'Muro Leve', type_line: 'Creature — Wall', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], power: '1', toughness: '3' };
  const deck = [{ name: KS, qty: 4, zone: 'main' }, { name: 'Guardiã', qty: 4, zone: 'main' }, ...['Urso', 'Muro Leve', 'Volta', 'Força'].map(name => ({ name, qty: 6, zone: 'main' })), { name: 'Plains', qty: 14, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: sc, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
};
test('CR 702.184c / 608.2h · a criatura roubada que sai em resposta: vale a Guardiã de quem a controlava, não a do dono (D4)', () => {
  let s = comGuardia(); let k, m; [s, k] = nave(s); [s, m] = poe(s, 1, 'Muro Leve', 'battlefield');
  s = J(s); Object.assign(s.objects[m], { controller: 0, controladorBase: 1, controles: [{ por: 0, ate: 'sempre', by: 0, ts: 1, turno: s.turn.number }] }); // A controla o Muro de B (efeito de controle; a carta segue na zona do dono)
  [s] = poe(s, 0, 'Guardiã', 'battlefield');
  let t = act(s, estacoes(s, 0, k).find(a => [].concat(a.pay.tapOther)[0] === m));
  let v; [t, v] = poe(t, 0, 'Volta', 'hand'); t = mana(t);
  t = act(t, legais(t, 0, a => a.t === 'cast' && a.oid === v && a.targets[0].oid === m)[0]); // devolve o Muro em resposta
  t = esvazia(t);
  eq(carga(t, k), 3, 'a Guardiã de A (quem controlava): a resistência 3');
});
test('CR 608.2h · a criatura que sai e volta antes da resolução: vale a última informação de quando saiu, não a foto da ativação (D5)', () => {
  let s = comGuardia(7); let k, m; [s, k] = nave(s); [s, m] = poe(s, 0, 'Muro Leve');
  let t = act(s, estacoes(s, 0, k).find(a => [].concat(a.pay.tapOther)[0] === m));
  let f; [t, f] = poe(t, 0, 'Força', 'hand'); t = mana(t);
  t = act(t, legais(t, 0, a => a.t === 'cast' && a.oid === f && a.targets[0].oid === m)[0]); t = act(t, { t: 'pass', p: 0 }); t = act(t, { t: 'pass', p: 1 }); // Muro 4/6
  let v; [t, v] = poe(t, 0, 'Volta', 'hand'); t = mana(t);
  t = act(t, legais(t, 0, a => a.t === 'cast' && a.oid === v && a.targets[0].oid === m)[0]); t = act(t, { t: 'pass', p: 0 }); t = act(t, { t: 'pass', p: 1 }); // volta para a mão (sai: última informação 4/6)
  t = J(t); const mm = t.objects[m]; t.zones[0].hand = t.zones[0].hand.filter(z => z !== m); mm.zone = 'battlefield'; mm.zc = (mm.zc || 0) + 1; t.zones[0].battlefield.push(m); // volta ao campo (objeto novo)
  t = esvazia(t);
  eq(carga(t, k), 4, 'o poder 4 de quando saiu (sem Guardiã: resistência 6 só valeria com ela)');
});
