// T-12 · CR5 · Classes (Comprehensive Rules 716.1–716.4).
// Texto da regra: .regras/cr-2026-09-25.txt. Carta exemplo com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge,
// clone de 11/10/2026): Stormchaser's Talent. As cartas "de teste" são scripts sintéticos que isolam a regra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, T, J, act, poe, legais, passaAte, palavrasDoTexto, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const cores = c => [...new Set((c || '').match(/[WUBRG]/g) || [])];
const CARTAS = {};
for (const c of L('oficiais-tipos.json')) CARTAS[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: palavrasDoTexto(c.oracle_text), oracle_text: c.oracle_text, colors: cores(c.mana_cost), ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) };
for (const [n, k] of Object.entries({ Island: 'U', Mountain: 'R', Forest: 'G', Plains: 'W', Swamp: 'B' })) CARTAS[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
const carta = (name, type_line, extra = {}) => { CARTAS[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const ganha = amount => [{ do: 'gain', amount }];
const SCRIPTS = {
  // Classe de teste: nível 1 "ao entrar, ganhe 1"; nível 2 ({1}): "Quando esta Classe virar nível 2, ganhe 5", "suas criaturas recebem +1/+1",
  // "você pode jogar um terreno adicional"; nível 3 ({2}): "{T}: ganhe 2" (ativada que só existe no nível 3) e "Quando virar nível 3, ganhe 7".
  'Escola': { name: 'Escola', abilities: [{ kind: 'triggered', when: 'etb', effects: ganha(1) }],
    self: { classe: [
      { mana: '{1}', abilities: [{ kind: 'triggered', when: 'becomes-level', effects: ganha(5) }], continuo: [{ afetados: { tipos: ['creature'], de: 'you' }, poder: 1, resistencia: 1 }], regraJogador: [{ terrenosExtras: 1 }] },
      { mana: '{2}', abilities: [{ kind: 'activated', cost: { tap: true }, effects: ganha(2) }, { kind: 'triggered', when: 'becomes-level', effects: ganha(7) }] },
    ] }, ...EX },
  'Imitação': { name: 'Imitação', effects: [{ do: 'ficha_copia', amount: 1, target: 'permanent' }], ...EX },
  'Volta': { name: 'Volta', effects: [{ do: 'bounce', target: 'permanent' }], ...EX },
  'Raio': { name: 'Raio', effects: [{ do: 'damage', amount: 2, target: 'any' }], ...EX },
  'Sopro': { name: 'Sopro', effects: [{ do: 'gain', amount: 1 }], ...EX },
};
carta('Escola', 'Enchantment — Class'); carta('Imitação', 'Sorcery'); carta('Volta', 'Instant'); carta('Raio', 'Instant'); carta('Sopro', 'Sorcery');
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' });

const baralho = nomes => { const u = [...new Set(nomes)]; return u.map(name => ({ name, qty: Math.max(4, Math.ceil(40 / u.length)), zone: 'main' })); };
function mesa(a = [], b = a, seed = 1) {
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: CARTAS, scripts: SCRIPTS, players: [{ name: 'A', deck: baralho([...a, 'Plains', 'Island']) }, { name: 'B', deck: baralho([...b, 'Island', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p, n = 9) => { s = J(s); for (const c of 'WUBRG') s.players[p].pool[c] += n; return s; };
const semMana = (s, p) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] = 0; for (const oid of s.zones[p].battlefield) s.objects[oid].tapped = true; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const esvazia = s => { for (let i = 0; i < 20; i++) { s = passaAte(s, x => !x.stack.length || !!x.pending); if (!s.pending || s.pending.kind !== 'triggers') return s; s = act(s, { t: 'order_trigger', p: s.pending.p, index: 0 }); } return s; }; // a ordem dos gatilhos simultâneos (a Lontra com proeza e a Classe) não importa aqui
const vida = (s, p = 0) => s.players[p].life - 20;
const ativadas = (s, p, oid) => legais(s, p, a => a.t === 'activate' && a.oid === oid);
const subir = (s, p, oid) => legais(s, p, a => a.t === 'activate' && a.oid === oid && E.abilitiesOf(s, s.objects[oid]).filter(x => x.kind === 'activated')[a.index || 0].classeNivelT);
const nivel = (s, oid) => E.nivelDaClasseT(s, s.objects[oid]);
const pt = (s, oid) => { const st = E.stats(s, s.objects[oid]); return [st.power, st.toughness]; };
/** Conjura a Classe da mão (com mana) e resolve: entra de verdade, com o gatilho de entrar. */
function conjuraClasse(s, p, nome) {
  let oid; [s, oid] = poe(s, p, nome, 'hand'); s = mana(s, p);
  s = esvazia(act(s, legais(s, p, a => a.t === 'cast' && a.oid === oid)[0]));
  return [s, oid];
}
const sobe = (s, p, oid) => { const a = subir(s, p, oid); assert.equal(a.length, 1, 'uma oferta de subir de nível'); return esvazia(act(mana(s, p), a[0])); };

/* ---------------- 716.2a · a barra de nível ---------------- */
test('CR 716.2a · subir de nível: só a barra seguinte (nível atual + 1), pelo custo dela, e só como feitiço — fora disso não é oferecida e o pedido é recusado', () => {
  let [s, c] = conjuraClasse(mesa(['Escola']), 0, 'Escola');
  eq([nivel(s, c), subir(s, 0, c).length], [1, 1], 'nível 1: oferece o nível 2');
  assert.equal(E.abilitiesOf(s, s.objects[c]).filter(x => x.kind === 'activated').length, 1, 'no nível 1 só a ativada de subir para o 2');
  const t = semMana(s, 0); assert.equal(subir(t, 0, c).length, 0, 'sem {1} não sobe');
  s = sobe(s, 0, c); eq([nivel(s, c), vida(s)], [2, 1 + 5], 'nível 2, e o gatilho "virou nível 2" (ganhe 5) além do de entrar (ganhe 1)');
  const at3 = E.abilitiesOf(s, s.objects[c]).filter(x => x.kind === 'activated');
  eq(at3.map(x => x.label || null), ['Nível 3'], 'no nível 2: a ativada de subir para o 3 (custo {2})');
  s = sobe(s, 0, c); eq([nivel(s, c), vida(s)], [3, 6 + 7], 'nível 3: dispara só o "virou nível 3"');
  assert.equal(subir(s, 0, c).length, 0, 'no nível 3 não há mais barra');
  eq(E.abilitiesOf(s, s.objects[c]).filter(x => x.kind === 'activated').map(x => !!x.classeNivelT), [false], 'a ativada do nível 3 ({T}: ganhe 2) existe');
});

test('CR 716.2a · "só como feitiço": no turno do oponente, com a pilha ocupada ou na etapa de combate a barra não é oferecida', () => {
  let [s, c] = conjuraClasse(mesa(['Escola', 'Raio']), 0, 'Escola'); s = mana(s, 0);
  let r; [s, r] = poe(s, 0, 'Raio', 'hand');
  const comPilha = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === r && (a.targets || [])[0] && a.targets[0].player === 1)[0]);
  assert.equal(subir(comPilha, 0, c).length, 0, 'pilha ocupada');
  const idx = E.abilitiesOf(s, s.objects[c]).filter(x => x.kind === 'activated').findIndex(x => x.classeNivelT);
  assert.throws(() => E.apply(comPilha, { t: 'activate', p: 0, oid: c, index: idx }), /feitiço/);
  const outro = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  assert.equal(subir(mana(outro, 0), 0, c).length, 0, 'turno do oponente');
});

test('CR 716.2a · "When this Class becomes level N" dispara uma vez, só ao virar aquele nível; as habilidades de um nível só existem do nível em diante', () => {
  let [s, c] = conjuraClasse(mesa(['Escola']), 0, 'Escola');
  eq(E.abilitiesOf(s, s.objects[c]).filter(x => x.kind === 'triggered').map(x => x.when), ['etb'], 'nível 1: só o gatilho de entrar');
  s = sobe(s, 0, c); s = sobe(s, 0, c);
  eq(E.abilitiesOf(s, s.objects[c]).filter(x => x.kind === 'triggered').map(x => x.when), ['etb', 'becomes-level', 'becomes-level']);
  assert.equal(vida(s), 1 + 5 + 7, 'cada "virou nível" uma vez');
});

test('CR 716.2a · contínuo e regra de jogador da barra valem a partir do nível dela: suas criaturas +1/+1 e um terreno a mais por turno no nível 2', () => {
  let [s, c] = conjuraClasse(mesa(['Escola', 'Urso']), 0, 'Escola'); let u; [s, u] = poe(s, 0, 'Urso', 'battlefield');
  eq(pt(s, u), [2, 2], 'nível 1');
  let p1; [s, p1] = poe(s, 0, 'Plains', 'hand'); s = J(s); s.players[0].landsPlayed = 1;
  assert.ok(!legais(s, 0, a => a.t === 'play_land' && a.oid === p1).length, 'nível 1: um terreno por turno');
  s = sobe(s, 0, c);
  eq(pt(s, u), [3, 3], 'nível 2: +1/+1');
  assert.ok(legais(s, 0, a => a.t === 'play_land' && a.oid === p1).length, 'nível 2: o segundo terreno do turno');
  let x; [s, x] = poe(s, 1, 'Urso', 'battlefield'); eq(pt(s, x), [2, 2], 'a criatura do oponente não recebe');
});

/* ---------------- 716.2b / 716.2d · o nível é designação ---------------- */
test('CR 716.2b / 716.2d / 400.7 · o nível não é copiável e é do objeto: a cópia de uma Classe nível 3 está no nível 1; a Classe que volta para a mão e entra de novo também', () => {
  let [s, c] = conjuraClasse(mesa(['Escola', 'Imitação', 'Volta']), 0, 'Escola'); s = sobe(s, 0, c); s = sobe(s, 0, c);
  assert.equal(nivel(s, c), 3);
  let im; [s, im] = poe(s, 0, 'Imitação', 'hand'); s = mana(s, 0);
  s = esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === im && (a.targets || [])[0] && a.targets[0].oid === c)[0]));
  const copia = s.zones[0].battlefield.find(o => s.objects[o].token && s.objects[o].name === 'Escola');
  assert.ok(copia, 'a ficha cópia da Escola');
  eq([nivel(s, copia), subir(s, 0, copia).length], [1, 1], 'a cópia começa no nível 1 e oferece o 2');
  let v; [s, v] = poe(s, 0, 'Volta', 'hand'); s = mana(s, 0);
  s = esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === v && (a.targets || [])[0] && a.targets[0].oid === c)[0]));
  assert.equal(s.objects[c].zone, 'hand');
  s = mana(s, 0); s = esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === c)[0]));
  eq([s.objects[c].zone, nivel(s, c)], ['battlefield', 1], 'outro objeto: nível 1');
  assert.equal(E.nivelDaClasseT(s, { oid: 'nenhum' }), 1, '716.2d: sem nível, conta como 1');
});

test('CR 400.7 · a habilidade de subir resolve depois que a Classe saiu e voltou: o objeto novo não sobe e nada dispara', () => {
  let [s, c] = conjuraClasse(mesa(['Escola', 'Volta']), 0, 'Escola');
  s = act(mana(s, 0), subir(s, 0, c)[0]);
  let v; [s, v] = poe(s, 0, 'Volta', 'hand'); s = mana(s, 0);
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === v && (a.targets || [])[0] && a.targets[0].oid === c)[0]);
  s = passaAte(s, x => x.stack.length === 1 || !!x.pending); // a Volta resolve; a habilidade de subir fica
  assert.equal(s.objects[c].zone, 'hand');
  const vidaAntes = vida(s);
  s = esvazia(s);
  eq([nivel(s, c), vida(s) - vidaAntes, !!(s.classes && s.classes[c])], [1, 0, false]);
});

/* ---------------- 716.3 · nível 1 ---------------- */
test('CR 716.3 · a habilidade do topo vale sempre: o "ao entrar" da Classe dispara no nível 1', () => {
  const [s] = conjuraClasse(mesa(['Escola']), 0, 'Escola');
  assert.equal(vida(s), 1);
});

/* ---------------- carta exemplo ---------------- */
test('S8 · Stormchaser’s Talent: ao entrar, uma Lontra 1/1 azul e vermelha com proeza; nível 2 devolve uma instantânea ou feitiço do cemitério à mão; nível 3 cria uma Lontra a cada instantânea ou feitiço que você conjura', () => {
  let s = mesa(["Stormchaser's Talent", 'Raio', 'Sopro', 'Urso']), r, c;
  [s, r] = poe(s, 0, 'Raio', 'graveyard');
  [s, c] = conjuraClasse(s, 0, "Stormchaser's Talent");
  const lontras = st => Object.values(st.objects).filter(o => o.token && o.zone === 'battlefield' && o.name === 'Otter');
  const l = lontras(s); assert.equal(l.length, 1);
  eq([pt(s, l[0].oid), J(E.coresDe(s, l[0])).sort(), E.hasKeyword(s, l[0], 'prowess')], [[1, 1], ['R', 'U'], true]);
  const s2 = act(mana(s, 0), subir(s, 0, c)[0]);
  let t = passaAte(s2, x => !x.stack.length || !!x.pending || x.stack.some(o => x.objects[o].ability && x.objects[o].effects.some(e => e.do === 'to_hand')));
  if (t.pending) t = act(t, legais(t, 0, a => a.t === 'pick_target' && a.oid === r)[0] || assert.fail('o Raio como alvo: ' + JSON.stringify(t.pending)));
  t = esvazia(t);
  eq([nivel(t, c), t.objects[r].zone], [2, 'hand'], 'nível 2: o Raio volta para a mão');
  t = sobe(t, 0, c); assert.equal(nivel(t, c), 3);
  const antes = lontras(t).length; let so; [t, so] = poe(t, 0, 'Sopro', 'hand'); t = mana(t, 0);
  t = esvazia(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === so)[0]));
  assert.equal(lontras(t).length, antes + 1, 'nível 3: o feitiço cria uma Lontra');
  let ur; [t, ur] = poe(t, 0, 'Urso', 'hand'); t = mana(t, 0);
  const n0 = lontras(t).length; t = esvazia(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === ur)[0]));
  assert.equal(lontras(t).length, n0, 'criatura não cria');
  eq([...S.validateScript(S.SCRIPTS["Stormchaser's Talent"])], []);
});

/* ---------------- validador, mesa e guarda-corpos ---------------- */
test('CR 716 · validador: barra sem custo, chave desconhecida, barra vazia, "becomes-level" fora da barra e grants numa Classe são recusados; erros dentro da barra dizem o nível', () => {
  const v = sc => S.validateScript({ name: 'X', abilities: [{ kind: 'triggered', when: 'etb', effects: ganha(1) }], ...sc, ...EX }).join(' | ');
  assert.equal(v({ self: SCRIPTS.Escola.self }), '');
  assert.match(v({ self: { classe: [{ abilities: [{ kind: 'triggered', when: 'becomes-level', effects: ganha(1) }] }] } }), /nível 2: falta o custo/);
  assert.match(v({ self: { classe: [{ mana: '{1}', nivel: 2, abilities: [{ kind: 'triggered', when: 'becomes-level', effects: ganha(1) }] }] } }), /chave "nivel"/);
  assert.match(v({ self: { classe: [{ mana: '{1}' }] } }), /não dá nada/);
  assert.match(v({ self: { classe: [{ mana: '{1}', abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'nada_disso' }] }] }] } }), /nível 2: /);
  assert.match(S.validateScript({ name: 'X', abilities: [{ kind: 'triggered', when: 'becomes-level', effects: ganha(1) }], self: { classe: [{ mana: '{1}', abilities: [{ kind: 'triggered', when: 'etb', effects: ganha(1) }] }] }, ...EX }).join(' | '), /fica dentro da barra/);
  assert.match(v({ grantsAll: { keywords: ['flying'] }, self: { classe: [{ mana: '{1}', continuo: [{ afetados: 'self', poder: 1 }] }] } }), /use continuo/);
  assert.match(v({ self: { classe: [] } }), /lista das barras/);
});

test('CR 716 · mesa e registro: o botão diz "Subir para o nível 2 · {1}" e a ativada de um nível diz o custo dela; a pilha explica e o registro diz que a Classe subiu', () => {
  let [s, c] = conjuraClasse(mesa(['Escola']), 0, 'Escola'); s = mana(s, 0);
  const custo = ab => [ab.cost.mana, ab.cost.tap ? '{T}' : null].filter(Boolean).join(', ');
  let legal = legais(s, 0, a => a.t === 'activate' && a.oid === c).map(action => ({ label: 'Ativar', action }));
  E.rotulosDaClasseT(s, c, legal, custo); eq(legal.map(b => b.label), ['Subir para o nível 2 · {1}']);
  const a = subir(s, 0, c)[0]; let t = act(s, a);
  assert.match(T.descreveEfeitos(t.objects[t.stack.at(-1)].effects), /a Classe sobe para o nível 2/);
  let linhas = [];
  for (let i = 0; i < 6 && !linhas.some(l => /subiu/.test(l)); i++) { const pa = { t: 'pass', p: t.turn.priority }, r = E.apply(t, pa); linhas = T.describe(t, pa, r.events, r.state).map(String); t = r.state; }
  assert.ok(linhas.some(l => /Escola subiu para o nível 2/.test(l)), JSON.stringify(linhas));
  t = sobe(esvazia(t), 0, c);
  legal = legais(t, 0, a => a.t === 'activate' && a.oid === c).map(action => ({ label: 'Ativar', action }));
  E.rotulosDaClasseT(t, c, legal, custo); eq(legal.map(b => b.label), ['Ativar ({T})'], 'nível 3: a ativada do nível, sem barra para subir');
});

test('CR 716 · partida sem Classe não ganha nada no estado; passeio aleatório com Classes: nada oferecido é recusado e o nível nunca passa de 3 nem pula', () => {
  const jogo = nomes => { const cards = Object.fromEntries(['Plains', 'Island', 'Mountain', ...nomes].map(n => [n, CARTAS[n]]));
    return E.createGame({ format: 'livre', seed: 1, mode: 'full', cards, scripts: {}, players: [{ name: 'A', deck: baralho([...nomes, 'Plains', 'Island']) }, { name: 'B', deck: baralho([...nomes, 'Island', 'Mountain']) }] }); };
  assert.equal(jogo(['Urso']).classes, undefined);
  let subidas = 0;
  for (let seed = 1; seed <= 4; seed++) {
    let s = mesa(['Escola', "Stormchaser's Talent", 'Raio', 'Sopro', 'Urso', 'Imitação'], undefined, seed), r = seed * 7919;
    for (let i = 0; i < 300 && s.status !== 'over'; i++) {
      const p = s.pending ? s.pending.p : s.turn.priority;
      if (i % 6 === 0 && !s.pending) s = mana(s, p, 2);
      const acoes = E.legalActions(s, p).filter(a => a.t !== 'concede');
      assert.ok(acoes.length, `semente ${seed}, passo ${i}: sem ação`);
      r = (r * 1103515245 + 12345) & 0x7fffffff;
      const pref = acoes.filter(a => a.t === 'cast' || (a.t === 'activate' && E.abilitiesOf(s, s.objects[a.oid]).filter(x => x.kind === 'activated')[a.index || 0].classeNivelT));
      const a = pref.length && r % 3 ? pref[r % pref.length] : acoes[r % acoes.length];
      const antes = s.classes ? J(s.classes) : {};
      let out; try { out = E.apply(s, a); } catch (e) { assert.fail(`semente ${seed}, passo ${i}: ação oferecida recusada ${JSON.stringify(a)} — ${e.message}`); }
      s = out.state;
      for (const [oid, reg] of Object.entries(s.classes || {})) { assert.ok(reg.n >= 2 && reg.n <= 3, `nível ${reg.n}`); if (!antes[oid] || antes[oid].n !== reg.n) { subidas++; assert.equal(reg.n, antes[oid] && antes[oid].z === reg.z ? antes[oid].n + 1 : 2, 'sobe um nível por vez'); } }
      eq(E.invariants(s).filter(x => !/parado em passo sem prioridade/.test(x)), [], `semente ${seed}, passo ${i}, depois de ${a.t}`);
    }
  }
  assert.ok(subidas > 5, 'subidas de nível no passeio: ' + subidas);
});
