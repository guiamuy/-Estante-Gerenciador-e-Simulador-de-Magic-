// T-26 · CR5 · Salas (Comprehensive Rules 709.5, com 116 e 400.7).
// Texto da regra: .regras/cr-2026-09-25.txt. Carta exemplo com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge, consulta
// de 13/10/2026): Glassworks // Shattered Yard. As cartas "de teste" são scripts sintéticos que isolam a regra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, T, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => x.name === 'Glassworks // Shattered Yard'))
  C[c.name] = { name: c.name, type_line: `${c.type_line} // ${c.verso.type_line}`, mana_cost: `${c.mana_cost} // ${c.verso.mana_cost}`, cmc: valorDeMana(c.mana_cost) + valorDeMana(c.verso.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: ['R'], layout: 'split' };
for (const [n, k] of Object.entries({ Mountain: 'R', Plains: 'W' })) C[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SALA_EX = { action: 'cast', target: 'none', expect: { selfLife: 0 } };
const SCRIPTS = {
  // Sala de teste: Saguão ({W}) "When you unlock this door, you gain 2 life." · Cofre ({2}{W}) "When you unlock this door, you gain 5 life."
  'Saguão // Cofre': { name: 'Saguão // Cofre', self: { dividida: true, sala: true, mana: '{W}', types: ['enchantment'] }, abilities: [{ kind: 'triggered', when: 'unlock-door', effects: [{ do: 'gain', amount: 2 }] }],
    back: { name: 'Cofre', types: ['enchantment'], mana: '{2}{W}', abilities: [{ kind: 'triggered', when: 'unlock-door', effects: [{ do: 'gain', amount: 5 }] }] }, example: SALA_EX },
  'Retorno': { name: 'Retorno', effects: [{ do: 'mover', target: { zona: 'graveyard', de: 'you' }, para: 'battlefield' }], ...EX },
  'Rebote': { name: 'Rebote', effects: [{ do: 'bounce', target: 'permanent' }], ...EX },
  'Sopro': { name: 'Sopro', effects: [{ do: 'gain', amount: 1 }], ...EX },
};
carta('Saguão // Cofre', 'Enchantment — Room // Enchantment — Room', { mana_cost: '{W} // {2}{W}', cmc: 4, colors: ['W'], layout: 'split' });
carta('Retorno', 'Sorcery'); carta('Rebote', 'Instant'); carta('Sopro', 'Instant');
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' }); carta('Gigante', 'Creature — Giant', { power: '5', toughness: '5' });

const GW = 'Glassworks // Shattered Yard', SC2 = 'Saguão // Cofre';
const TODAS = [GW, SC2, 'Retorno', 'Rebote', 'Sopro', 'Urso', 'Gigante'];
function mesa(seed = 1) {
  const deck = [...TODAS.map(name => ({ name, qty: 4, zone: 'main' })), { name: 'Mountain', qty: 6, zone: 'main' }, { name: 'Plains', qty: 6, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const pool = (s, p = 0) => Object.values(s.players[p].pool).reduce((a, b) => a + b, 0);
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const esvazia = s => { for (let i = 0; i < 30; i++) { s = passaAte(s, x => !x.stack.length || !!x.pending); if (!s.pending || !['triggers', 'pick_target'].includes(s.pending.kind)) return s; s = act(s, legais(s, s.pending.p)[0]); } return s; };
const portas = (s, oid) => J(E.portasDaSalaT(s, s.objects[oid]));
const destrancas = (s, p, oid) => legais(s, p, a => a.t === 'destrancar' && a.oid === oid);
const quandos = (s, oid) => E.abilitiesOf(s, s.objects[oid]).map(a => a.when || a.kind);
function conjuraPorta(s, p, nome, lado, f = () => true) {
  let oid; [s, oid] = poe(s, p, nome, 'hand'); s = mana(s, p);
  const a = legais(s, p, x => x.t === 'cast' && x.oid === oid && x.face === lado && f(x))[0]; assert.ok(a, `conjurar ${lado} de ${nome}`);
  return [esvazia(act(s, a)), oid];
}

test('CR 709.3 / 709.5 · na mão, cada porta é conjurada pelo custo dela (a Sala inteira não); é encantamento: só no tempo de feitiço', () => {
  let s = mesa(); let g; [s, g] = poe(s, 0, GW, 'hand'); s = mana(s);
  const cs = legais(s, 0, a => a.t === 'cast' && a.oid === g);
  eq([...new Set(cs.map(a => a.face))].sort(), ['direita', 'esquerda'], 'uma oferta por porta, nenhuma sem porta');
  let r; [s, r] = poe(s, 0, 'Sopro', 'hand');
  const t = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === r)[0]);
  assert.equal(legais(t, 0, a => a.t === 'cast' && a.oid === g).length, 0, 'com a pilha ocupada, não');
});

test('CR 709.5d / 709.5h · Glassworks (texto oficial): conjurada a porta esquerda, a Sala entra inteira com ela destrancada e "quando você destranca esta porta" dispara (4 de dano na criatura do oponente)', () => {
  let s = mesa(); let u; [s, u] = poe(s, 1, 'Gigante');
  let g; [s, g] = conjuraPorta(s, 0, GW, 'esquerda');
  eq([s.objects[g].zone, s.objects[g].name, portas(s, g), s.objects[u].damage || 0], ['battlefield', GW, { esquerda: true, direita: false }, 4]);
});

test('CR 709.5 · a porta trancada não tem o texto dela: Shattered Yard trancada não dá dano na etapa final; destrancada, dá 1 em cada oponente', () => {
  let s = mesa(); let g; [s, g] = conjuraPorta(s, 0, GW, 'esquerda');
  assert.ok(!quandos(s, g).includes('end-step'), 'a habilidade da porta direita não existe');
  const v = s.players[1].life;
  let t = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1');
  assert.equal(t.players[1].life, v, 'sem dano com a porta trancada');
  s = mana(s); s = esvazia(act(s, destrancas(s, 0, g)[0]));
  assert.ok(quandos(s, g).includes('end-step'));
  t = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1');
  assert.equal(t.players[1].life, v - 1);
});

test('CR 709.5e / 116.2 · destrancar é ação especial: paga o custo da porta trancada, não usa a pilha, e quem destranca continua com a prioridade', () => {
  let s = mesa(); let g; [s, g] = conjuraPorta(s, 0, GW, 'esquerda'); s = mana(s);
  const of = destrancas(s, 0, g);
  eq(of.map(a => a.porta), ['direita'], 'só a porta trancada');
  const antes = pool(s), r = E.apply(s, of[0]); s = r.state;
  eq([portas(s, g), antes - pool(s), s.stack.length, s.turn.priority], [{ esquerda: true, direita: true }, 5, 0, 0], '{4}{R} pago, nada na pilha');
  assert.equal(destrancas(mana(s), 0, g).length, 0, 'destrancada por inteiro: nada mais a oferecer');
  assert.throws(() => E.apply(mana(s), { t: 'destrancar', p: 0, oid: g, porta: 'direita' }), /trancada|destrancada/);
});

test('CR 709.5e · só no seu turno, na fase principal, com a pilha vazia, pela mana certa e por quem controla', () => {
  let s = mesa(); let g; [s, g] = conjuraPorta(s, 0, GW, 'esquerda');
  const semMana = J(s); for (const c of 'WUBRGC') semMana.players[0].pool[c] = 0; for (const o of semMana.zones[0].battlefield) semMana.objects[o].tapped = true;
  assert.equal(destrancas(semMana, 0, g).length, 0, 'sem mana, não');
  s = mana(s); let r; [s, r] = poe(s, 0, 'Sopro', 'hand');
  const t = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === r)[0]);
  assert.equal(destrancas(t, 0, g).length, 0, 'com a pilha ocupada, não');
  assert.throws(() => E.apply(t, { t: 'destrancar', p: 0, oid: g, porta: 'direita' }));
  assert.throws(() => E.apply(s, { t: 'destrancar', p: 1, oid: g, porta: 'direita' }), 'quem não controla não destranca');
  const u = mana(passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending), 0);
  assert.equal(destrancas(u, 0, g).length, 0, 'no turno do oponente, não');
  const c = passaAte(s, x => x.turn.step === 'combat_begin' || x.turn.step === 'declare_attackers' || x.turn.step === 'combat');
  assert.equal(destrancas(mana(c), 0, g).length, 0, 'no combate, não');
});

test('CR 709.5h · destrancar uma porta dispara o "quando você destranca esta porta" só dela', () => {
  let s = mesa(); const v0 = s.players[0].life;
  let g; [s, g] = conjuraPorta(s, 0, SC2, 'esquerda');
  assert.equal(s.players[0].life, v0 + 2, 'Saguão destrancado ao entrar: +2');
  s = mana(s); s = esvazia(act(s, destrancas(s, 0, g)[0]));
  assert.equal(s.players[0].life, v0 + 7, 'Cofre destrancado: +5, e o Saguão não dispara de novo');
});

test('CR 709.5d · conjurada a porta direita, entra só com ela destrancada', () => {
  let s = mesa(); const v0 = s.players[0].life;
  let g; [s, g] = conjuraPorta(s, 0, SC2, 'direita');
  eq([portas(s, g), s.players[0].life - v0, destrancas(mana(s), 0, g).map(a => a.porta)], [{ esquerda: false, direita: true }, 5, ['esquerda']]);
});

test('CR 709.5d · a Sala posta no campo sem ser conjurada entra com as duas portas trancadas: nenhuma habilidade, nada dispara; as duas podem ser destrancadas', () => {
  let s = mesa(); const v0 = s.players[0].life;
  let g; [s, g] = poe(s, 0, SC2, 'graveyard'); let r; [s, r] = poe(s, 0, 'Retorno', 'hand'); s = mana(s);
  s = esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === r && (a.targets || []).some(t => t.oid === g))[0]));
  eq([s.objects[g].zone, s.objects[g].name, portas(s, g), s.players[0].life - v0, quandos(s, g)], ['battlefield', SC2, { esquerda: false, direita: false }, 0, []]);
  eq(destrancas(mana(s), 0, g).map(a => a.porta).sort(), ['direita', 'esquerda']);
});

test('CR 400.7 / 709.5c · as designações são da permanente: a Sala que sai e volta é objeto novo, com as portas trancadas', () => {
  let s = mesa(); let g; [s, g] = conjuraPorta(s, 0, SC2, 'esquerda');
  let r; [s, r] = poe(s, 0, 'Rebote', 'hand'); s = mana(s);
  s = esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === r && (a.targets || []).some(t => t.oid === g))[0]));
  eq([s.objects[g].zone, s.objects[g].name], ['hand', SC2], 'na mão, a carta inteira');
  s = J(s); s.zones[0].hand.splice(s.zones[0].hand.indexOf(g), 1); s.zones[0].graveyard.push(g); s.objects[g].zone = 'graveyard';
  let t; [s, t] = poe(s, 0, 'Retorno', 'hand'); s = mana(s);
  s = esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === t && (a.targets || []).some(x => x.oid === g))[0]));
  eq(portas(s, g), { esquerda: false, direita: false });
});

test('Validador · Sala: as duas portas encantamento com custo; "unlock-door" só numa porta de Sala; contínuo e concessão ainda não', () => {
  eq(SC.validateScript(SCRIPTS[SC2]), [], 'a Sala de teste é válida');
  const v = sc => SC.validateScript({ ...SCRIPTS[SC2], ...sc });
  assert.ok(v({ self: { dividida: true, sala: true, mana: '{W}', types: ['instant'] } }).some(e => /sala|dividida/.test(e)), 'porta que não é encantamento');
  assert.ok(v({ back: { ...SCRIPTS[SC2].back, mana: undefined } }).some(e => /sala|dividida/.test(e)), 'porta direita sem custo');
  assert.ok(v({ continuo: [{ afetados: 'self', palavras: ['flying'] }] }).some(e => /sala/.test(e)), 'contínuo numa Sala');
  assert.ok(v({ back: { ...SCRIPTS[SC2].back, abilities: [{ kind: 'triggered', when: 'unlock-door', effects: [{ do: 'nada' }] }] } }).some(e => /sala/.test(e)), 'erro na porta direita aparece');
  assert.ok(SC.validateScript({ name: 'X', abilities: [{ kind: 'triggered', when: 'unlock-door', effects: [{ do: 'gain', amount: 1 }] }], ...EX }).some(e => /unlock-door|sala/.test(e)), '"unlock-door" fora de Sala');
});

test('CR 709.5 · passeio aleatório com Salas: nada oferecido é recusado e as portas só destrancam (nunca trancam)', () => {
  let destrancou = 0, portasConjuradas = 0;
  for (let seed = 1; seed <= 12; seed++) {
    let s = mesa(seed);
    for (let i = 0; i < 260 && s.status === 'playing'; i++) {
      const p = s.pending ? s.pending.p : s.turn.priority; if (i % 6 === 0) s = mana(s, p, 2); // mana de sobra de vez em quando, para as portas caras aparecerem
      const os = E.legalActions(s, p);
      if (!os.length) break;
      const pref = os.filter(a => a.t === 'destrancar' || (a.t === 'cast' && a.face)), lista = pref.length && i % 2 === 0 ? pref : os;
      const a = lista[(i * 7 + seed) % lista.length];
      const antes = {}; for (const o of Object.values(s.objects)) { const pt = E.portasDaSalaT(s, o); if (pt) antes[o.oid] = { pt, zc: o.zc || 0 }; }
      s = E.apply(s, a).state;
      if (a.t === 'destrancar') destrancou++; if (a.t === 'cast' && a.face) portasConjuradas++;
      for (const [oid, x] of Object.entries(antes)) { const o = s.objects[oid], d = o && (o.zc || 0) === x.zc && E.portasDaSalaT(s, o); if (d) assert.ok(!(x.pt.esquerda && !d.esquerda) && !(x.pt.direita && !d.direita), 'porta trancou sozinha'); }
    }
  }
  assert.ok(destrancou > 5 && portasConjuradas > 5, `o passeio passou pelas Salas (${destrancou} destrancadas, ${portasConjuradas} portas conjuradas)`);
});

test('Registro · destrancar diz qual porta e de qual Sala', () => {
  let s = mesa(); let g; [s, g] = conjuraPorta(s, 0, GW, 'esquerda'); s = mana(s);
  const a = destrancas(s, 0, g)[0], r = E.apply(s, a);
  const linhas = T.describe(s, a, r.events, r.state);
  assert.ok(linhas.some(l => /destrancou Shattered Yard \(Glassworks \/\/ Shattered Yard\)/.test(l)), JSON.stringify(linhas));
});
