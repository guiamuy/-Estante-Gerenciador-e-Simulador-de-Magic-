// T-7 · CR5 · cartas de dupla face que transformam (Comprehensive Rules 701.27, 712 e 707.8a).
// Texto da regra: .regras/cr-2026-09-25.txt. Cartas exemplo com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge,
// clone de 11/10/2026): Thraben Gargoyle // Stonewing Antagonizer, Desperate Farmer // Depraved Harvester, Cloistered Youth //
// Unholy Fiend e Heir of Falkenrath // Heir to the Night. As cartas "de teste" são scripts sintéticos que isolam a regra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, T, J, act, poe, legais, passaAte, resolveUm, palavrasDoTexto, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const cores = c => [...new Set((c || '').match(/[WUBRG]/g) || [])];
const CARTAS = {};
for (const c of L('oficiais-tipos.json')) CARTAS[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: palavrasDoTexto(c.oracle_text), oracle_text: c.oracle_text, colors: cores(c.mana_cost), ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) };
for (const [n, k] of Object.entries({ Island: 'U', Mountain: 'R', Forest: 'G', Plains: 'W', Swamp: 'B' })) CARTAS[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
const carta = (name, type_line, extra = {}) => { CARTAS[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } }; // os scripts sintéticos não passam pelo S8; o campo é exigido pelo validador
const ganha = amount => [{ do: 'gain', amount }];
const VIRA = { kind: 'activated', cost: { mana: '{0}' }, effects: [{ do: 'transformar' }] };
const SCRIPTS = {
  // dupla face: Lobo 2/2 (valor de mana 3) ⇄ Fera 4/4 verde com atropelar; cada face tem "{0}: transforme"; a Fera ganha 10 de vida quando a permanente transforma nela, o Lobo 1
  'Lobo': { name: 'Lobo', self: { duplaFace: true }, abilities: [VIRA, { kind: 'triggered', when: 'transforms', effects: ganha(1) }],
    back: { name: 'Fera', types: ['creature'], subtypes: ['Beast'], colors: ['G'], power: 4, toughness: 4, keywords: ['trample'], abilities: [VIRA, { kind: 'triggered', when: 'transforms', effects: ganha(10) }] }, ...EX },
  'Comum': { name: 'Comum', abilities: [VIRA], ...EX },
  'Andarilho': { name: 'Andarilho', self: { aventura: true }, omen: { mana: '{2}' }, back: { name: 'Passeio', types: ['sorcery'], effects: ganha(5) }, abilities: [VIRA], ...EX },
  'Espelho': { name: 'Espelho', entraComoCopia: { de: { tipos: ['creature'] } }, ...EX },
  'Imitação': { name: 'Imitação', effects: [{ do: 'ficha_copia', amount: 1, target: 'permanent' }], ...EX },
  'Mata': { name: 'Mata', effects: [{ do: 'destroy', target: 'creature' }], ...EX },
  'Cresce': { name: 'Cresce', effects: [{ do: 'counters', amount: 2, target: 'creature' }], ...EX },
  'Fere': { name: 'Fere', effects: [{ do: 'damage', amount: 1, target: 'creature' }], ...EX },
};
carta('Lobo', 'Creature — Wolf', { power: '2', toughness: '2', mana_cost: '{2}{G}', cmc: 3, colors: ['G'] });
carta('Comum', 'Creature — Human', { power: '1', toughness: '1' });
carta('Andarilho', 'Creature — Human Scout', { power: '2', toughness: '2' });
carta('Espelho', 'Creature — Shapeshifter', { power: '0', toughness: '0' });
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' });
carta('Imitação', 'Sorcery'); carta('Mata', 'Instant'); carta('Cresce', 'Instant'); carta('Fere', 'Instant');

const baralho = nomes => { const u = [...new Set(nomes)]; return u.map(name => ({ name, qty: Math.max(4, Math.ceil(40 / u.length)), zone: 'main' })); };
function mesa(a = [], b = a, seed = 1) {
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: CARTAS, scripts: SCRIPTS, players: [{ name: 'A', deck: baralho([...a, 'Plains', 'Forest']) }, { name: 'B', deck: baralho([...b, 'Island', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p, n = 9) => { s = J(s); for (const c of 'WUBRG') s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
function campo(s, p, ...nomes) { const oids = []; for (const n of nomes) { let oid; [s, oid] = poe(s, p, n, 'battlefield'); oids.push(oid); } return [s, ...oids]; }
const alvo = oid => a => (a.targets || [])[0] && a.targets[0].oid === oid;
function conjura(s, p, nome, f = () => true) { let oid; [s, oid] = poe(s, p, nome, 'hand'); s = mana(s, p); const a = legais(s, p, x => x.t === 'cast' && x.oid === oid && !x.omen && f(x))[0]; assert.ok(a, `conjurar ${nome}: nenhuma ação legal`); return [act(s, a), oid]; }
const esvazia = s => passaAte(s, x => !x.stack.length || !!x.pending);
const ativa = (s, oid, index = 0, p = 0) => act(s, legais(s, p, a => a.t === 'activate' && a.oid === oid && (a.index || 0) === index)[0] || assert.fail('habilidade não oferecida'));
const vida = (s, p = 0) => s.players[p].life - 20;
const nome = (s, oid) => s.objects[oid].name;
const pt = (s, oid) => { const st = E.stats(s, s.objects[oid]); return [st.power, st.toughness]; };
const tem = (s, oid, k) => E.hasKeyword(s, s.objects[oid], k);

/* ---------------- 701.27a · 712.18 · transformar ---------------- */
test('CR 701.27a · 712.18 · transformar vira a outra face para cima, nos dois sentidos, e a permanente continua o mesmo objeto: marcadores, dano e virada ficam; nome, tipo, cor, P/T e habilidades passam a ser os da face de cima', () => {
  let s, l, x; [s, l] = campo(mesa(['Lobo', 'Cresce', 'Fere']), 0, 'Lobo');
  [s, x] = conjura(s, 0, 'Cresce', alvo(l)); s = esvazia(s); [s, x] = conjura(s, 0, 'Fere', alvo(l)); s = esvazia(s);
  s = J(s); s.objects[l].tapped = true;
  eq([nome(s, l), pt(s, l), E.transformada(s, s.objects[l])], ['Lobo', [4, 4], false]);
  const ts0 = s.objects[l].ts || 0;
  s = esvazia(ativa(s, l));
  eq([nome(s, l), pt(s, l), tem(s, l, 'trample'), E.coresDe(s, s.objects[l]), s.objects[l].zone], ['Fera', [6, 6], true, ['G'], 'battlefield'], 'a Fera 4/4 com os dois marcadores');
  assert.match(E.linhaDeTipo(s, s.objects[l]), /Beast/);
  eq([s.objects[l].counters.p1p1, s.objects[l].damage, s.objects[l].tapped], [2, 1, true], '712.18: marcadores, dano e virada ficam');
  assert.ok((s.objects[l].ts || 0) > ts0, '613.7g: carimbo de tempo novo ao transformar');
  assert.equal(E.transformada(s, s.objects[l]), true, '701.27g: é uma permanente transformada');
  s = esvazia(ativa(s, l));
  eq([nome(s, l), pt(s, l), tem(s, l, 'trample'), E.transformada(s, s.objects[l])], ['Lobo', [4, 4], false, false], 'de volta à frente: não é mais "transformada"');
});

test('CR 701.27e · "quando transforma": o gatilho é da face que ficou para cima (a permanente transformou e tem essa característica logo depois)', () => {
  let s, l; [s, l] = campo(mesa(['Lobo']), 0, 'Lobo');
  s = esvazia(ativa(s, l)); assert.equal(vida(s), 10, 'virou Fera: o gatilho da Fera');
  s = esvazia(ativa(s, l)); assert.equal(vida(s), 11, 'voltou a Lobo: o gatilho do Lobo');
});

/* ---------------- 701.27c–d · 712.9–10 · quem transforma ---------------- */
test('CR 701.27c · 712.9 · só carta ou ficha de dupla face transforma: carta comum com "transforme" não muda; a criatura que entra como cópia de uma dupla face tem a habilidade copiada, mas não transforma', () => {
  let s, c, l, e; [s, c, l] = campo(mesa(['Comum', 'Lobo', 'Espelho']), 0, 'Comum', 'Lobo');
  let t = esvazia(ativa(s, c)); assert.equal(nome(t, c), 'Comum'); assert.equal(E.transformada(t, t.objects[c]), false);
  [s, e] = conjura(s, 0, 'Espelho'); s = esvazia(s);
  if (s.pending && s.pending.kind === 'pick') { s = act(s, { t: 'pick', p: 0, oid: l }); if (s.pending && s.pending.kind === 'pick') s = act(s, { t: 'pick_done', p: 0 }); s = esvazia(s); }
  assert.equal(nome(s, e), 'Lobo', 'o Espelho entrou como cópia do Lobo'); eq(pt(s, e), [2, 2]);
  s = esvazia(ativa(s, e));
  assert.equal(nome(s, e), 'Lobo', 'a cópia não é carta de dupla face: nada acontece (exemplo da 712.9)'); assert.equal(vida(s), 0);
});

test('CR 701.27d · 712.10 · a outra face instantânea ou feitiço: nada acontece (carta de aventura mandada transformar); 712.15a · virada para baixo não transforma', () => {
  let s, a, l; [s, a, l] = campo(mesa(['Andarilho', 'Lobo']), 0, 'Andarilho', 'Lobo');
  let t = esvazia(ativa(s, a)); assert.equal(nome(t, a), 'Andarilho'); assert.equal(t.objects[a].zone, 'battlefield');
  const v = J(s); v.objects[l].faceDown = true;
  assert.equal(E.transformaT(v, v.objects[l], null, []), false, 'virada para baixo: a instrução é ignorada');
  assert.equal(nome(v, l), 'Lobo');
});

/* ---------------- 701.27f · uma vez por habilidade ---------------- */
test('CR 701.27f · a habilidade da própria permanente só a transforma se ela não transformou desde que a habilidade foi para a pilha: duas ativações em resposta transformam uma vez só', () => {
  let s, l; [s, l] = campo(mesa(['Lobo']), 0, 'Lobo');
  s = ativa(ativa(s, l), l); // duas na pilha, as duas postas antes de qualquer transformação
  assert.equal(s.stack.length, 2);
  s = resolveUm(s); assert.equal(nome(s, l), 'Fera', 'a primeira a resolver transforma');
  s = esvazia(s);
  assert.equal(nome(s, l), 'Fera', 'a outra é ignorada: a permanente já transformou desde que ela foi para a pilha');
  assert.equal(vida(s), 10, 'um gatilho de transformação só');
  s = esvazia(ativa(s, l)); assert.equal(nome(s, l), 'Lobo', 'uma ativação nova, posta na pilha depois, transforma de novo');
});

/* ---------------- 712.8 · características ---------------- */
test('CR 712.8a · 712.14 · fora do campo a carta tem só a frente, e de outra zona entra com a frente para cima; 712.8e · com o verso para cima, o valor de mana é o da frente', () => {
  let s, l, x; [s, l] = campo(mesa(['Lobo', 'Mata']), 0, 'Lobo');
  assert.equal(s.facts['Lobo'].cmc, 3);
  s = esvazia(ativa(s, l));
  assert.equal(s.facts[nome(s, l)].cmc, 3, 'a Fera (verso para cima) tem o valor de mana do Lobo');
  [s, x] = conjura(s, 0, 'Mata', alvo(l)); s = esvazia(s);
  eq([s.objects[l].zone, nome(s, l), s.objects[l].frontName], ['graveyard', 'Lobo', undefined], 'no cemitério é o Lobo');
  s = J(s); s.zones[0].graveyard.splice(s.zones[0].graveyard.indexOf(l), 1); s.zones[0].hand.push(l); s.objects[l].zone = 'hand'; s = mana(s, 0);
  s = esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === l)[0]));
  eq([s.objects[l].zone, nome(s, l), E.transformada(s, s.objects[l])], ['battlefield', 'Lobo', false], 'conjurada de novo, entra com a frente');
});

/* ---------------- 707.8a · ficha que copia dupla face ---------------- */
test('CR 707.8a · a ficha que é cópia de uma permanente de dupla face é uma ficha de dupla face, com a mesma face para cima: copiando a frente ela transforma no verso; copiando o verso ela já é "transformada" e volta à frente', () => {
  let s, l, x; [s, l] = campo(mesa(['Lobo', 'Imitação']), 0, 'Lobo');
  [s, x] = conjura(s, 0, 'Imitação', alvo(l)); s = esvazia(s);
  let f = Object.values(s.objects).find(o => o.token && o.zone === 'battlefield').oid;
  eq([nome(s, f), E.transformada(s, s.objects[f])], ['Lobo', false]);
  s = esvazia(ativa(s, f)); eq([nome(s, f), pt(s, f), E.transformada(s, s.objects[f])], ['Fera', [4, 4], true], 'a ficha transformou');
  // agora a cópia do VERSO: o Lobo original transforma e é copiado como Fera
  s = esvazia(ativa(s, l)); assert.equal(nome(s, l), 'Fera');
  const antes = new Set(Object.keys(s.objects));
  [s, x] = conjura(s, 0, 'Imitação', alvo(l)); s = esvazia(s);
  const g = Object.values(s.objects).find(o => o.token && o.zone === 'battlefield' && !antes.has(o.oid)).oid;
  eq([nome(s, g), E.transformada(s, s.objects[g])], ['Fera', true], 'entra com o verso para cima');
  s = esvazia(ativa(s, g)); eq([nome(s, g), pt(s, g), E.transformada(s, s.objects[g])], ['Lobo', [2, 2], false], 'e transforma na frente');
});

/* ---------------- cartas exemplo ---------------- */
test('S8 · Thraben Gargoyle: "{6}: Transform" vira Stonewing Antagonizer 4/2 com voar (sem defensor); Heir of Falkenrath: "Discard a card: Transform", só uma vez por turno', () => {
  let s, g; [s, g] = campo(mesa(['Thraben Gargoyle']), 0, 'Thraben Gargoyle');
  eq([pt(s, g), tem(s, g, 'defender'), tem(s, g, 'flying')], [[2, 2], true, false]);
  s = mana(s, 0); s = esvazia(ativa(s, g));
  eq([nome(s, g), pt(s, g), tem(s, g, 'defender'), tem(s, g, 'flying')], ['Stonewing Antagonizer', [4, 2], false, true]);
  assert.match(E.linhaDeTipo(s, s.objects[g]), /Gargoyle Horror/); assert.ok(E.tiposDe(s, s.objects[g]).includes('artifact'));
  eq(E.coresDe(s, s.objects[g]), [], 'incolor');
  let t, h, c1, c2; [t, h] = campo(mesa(['Heir of Falkenrath', 'Urso']), 0, 'Heir of Falkenrath'); [t, c1] = poe(t, 0, 'Urso', 'hand'); [t, c2] = poe(t, 0, 'Urso', 'hand');
  const mao = t.zones[0].hand.length;
  t = esvazia(ativa(t, h));
  eq([nome(t, h), pt(t, h), tem(t, h, 'flying'), E.coresDe(t, t.objects[h]), t.zones[0].hand.length], ['Heir to the Night', [3, 2], true, ['B'], mao - 1], 'descartou uma carta e transformou');
  assert.equal(legais(t, 0, a => a.t === 'activate' && a.oid === h).length, 0, 'o verso não tem a habilidade');
  for (const n of ['Thraben Gargoyle', 'Heir of Falkenrath', 'Desperate Farmer', 'Cloistered Youth']) { const sc = S.SCRIPTS[n]; assert.ok(sc && sc.example, n); eq([...S.validateScript(sc)], [], n); }
});

test('S8 · Desperate Farmer: quando outra criatura sua morre, transforma em Depraved Harvester 4/3 com vínculo com a vida; Cloistered Youth: na sua manutenção você PODE transformar; Unholy Fiend custa 1 de vida no seu passo final', () => {
  let s, f, u, x; [s, f, u] = campo(mesa(['Desperate Farmer', 'Urso', 'Mata']), 0, 'Desperate Farmer', 'Urso');
  [s, x] = conjura(s, 0, 'Mata', alvo(u)); s = esvazia(s);
  eq([nome(s, f), pt(s, f), tem(s, f, 'lifelink'), E.coresDe(s, s.objects[f])], ['Depraved Harvester', [4, 3], true, ['B']]);
  // a criatura do oponente morrendo não transforma
  let t, f2, deB; [t, f2] = campo(mesa(['Desperate Farmer', 'Urso', 'Mata']), 0, 'Desperate Farmer'); [t, deB] = campo(t, 1, 'Urso');
  [t, x] = conjura(t, 0, 'Mata', alvo(deB)); t = esvazia(t); assert.equal(nome(t, f2), 'Desperate Farmer');
  // Cloistered Youth
  let y, c; [y, c] = campo(mesa(['Cloistered Youth']), 0, 'Cloistered Youth');
  const n0 = y.turn.number;
  y = passaAte(y, z => z.turn.number > n0 && z.turn.active === 0 && (!!z.pending || z.turn.step === 'main1'), 600);
  assert.ok(y.pending && y.pending.kind === 'may_pay', 'a mesa pergunta se transforma: ' + JSON.stringify(y.pending && y.pending.kind));
  const nao = passaAte(act(y, { t: 'decline', p: 0 }), z => z.turn.step === 'main1' && !z.stack.length); assert.equal(nome(nao, c), 'Cloistered Youth', 'recusou: fica como está');
  y = passaAte(act(y, { t: 'pay', p: 0 }), z => z.turn.step === 'main1' && !z.stack.length);
  eq([nome(y, c), pt(y, c), E.coresDe(y, y.objects[c])], ['Unholy Fiend', [3, 3], ['B']]);
  const v0 = y.players[0].life; y = passaAte(y, z => z.turn.active === 1 && z.turn.step === 'upkeep', 600);
  assert.equal(y.players[0].life, v0 - 1, 'no passo final de A, 1 de vida');
});

/* ---------------- validador, estado e guarda-corpos ---------------- */
test('CR 712 · validador: `self.duplaFace` pede face de trás que seja permanente; `transformar` não tem alvo; gatilho `transforms` aceito nas duas faces', () => {
  const v = sc => S.validateScript({ name: 'X', ...sc, ...EX }).join(' | ');
  assert.equal(v(SCRIPTS['Lobo']), '');
  assert.match(v({ self: { duplaFace: true }, abilities: [VIRA] }), /dupla face.*face de trás/);
  assert.match(v({ self: { duplaFace: true }, abilities: [VIRA], back: { name: 'Y', types: ['sorcery'], effects: ganha(1) } }), /dupla face.*permanente/);
  assert.match(v({ self: { duplaFace: 1 }, abilities: [VIRA], back: { name: 'Y', types: ['creature'], power: 1, toughness: 1 } }), /duplaFace só vale como true/);
});

test('CR 712 · partida sem a carta não ganha nada no estado: o verso (Stonewing Antagonizer, Depraved Harvester, Unholy Fiend, Heir to the Night) só vira fato da partida que tem a carta', () => {
  const jogo = nomes => { const cards = Object.fromEntries(['Plains', 'Forest', 'Island', 'Mountain', ...nomes].map(n => [n, CARTAS[n]]));
    return E.createGame({ format: 'livre', seed: 1, mode: 'full', cards, scripts: {}, players: [{ name: 'A', deck: baralho([...nomes, 'Plains', 'Forest']) }, { name: 'B', deck: baralho([...nomes, 'Island', 'Mountain']) }] }); };
  const sem = jogo(['Urso']), com = jogo(['Urso', 'Thraben Gargoyle']);
  for (const n of ['Stonewing Antagonizer', 'Depraved Harvester', 'Unholy Fiend', 'Heir to the Night']) assert.equal(sem.facts[n], undefined, n);
  assert.ok(com.facts['Stonewing Antagonizer']); assert.equal(com.facts['Stonewing Antagonizer'].cmc, 1, 'valor de mana da frente ({1})');
  assert.ok(!Object.values(sem.objects).some(o => o.transformouEm != null || o.duplaFace));
});

test('CR 701.27 · mesa: o registro diz "transformou em", a pilha explicada descreve o efeito em português', () => {
  let s, l; [s, l] = campo(mesa(['Lobo']), 0, 'Lobo');
  const r = E.apply(ativa(s, l), { t: 'pass', p: 0 }); let t = r.state, evs = r.events.slice();
  if (t.stack.length) { const r2 = E.apply(t, { t: 'pass', p: 1 }); t = r2.state; evs = evs.concat(r2.events); }
  assert.ok(evs.some(e => e.kind === 'effect' && e.do === 'transformar' && e.name === 'Lobo' && e.target === 'Fera'), JSON.stringify(evs.filter(e => e.kind === 'effect')));
  assert.match(T.descreveEfeitos([{ do: 'transformar' }]), /transforma/);
  assert.match(T.describe(s, { t: 'pass', p: 0 }, [{ kind: 'effect', do: 'transformar', name: 'Lobo', target: 'Fera' }], s).join(' | '), /Lobo transformou em Fera/);
});

test('CR 701.27 · passeio aleatório com cartas de dupla face nos dois lados: toda ação oferecida é aceita, as invariantes valem, e fora do campo ninguém fica com o verso para cima', () => {
  let viradas = 0;
  for (let seed = 1; seed <= 5; seed++) {
    let s = mesa(['Lobo', 'Thraben Gargoyle', 'Heir of Falkenrath', 'Desperate Farmer', 'Cloistered Youth', 'Urso', 'Mata', 'Imitação'], undefined, seed), r = seed * 15485863;
    [s] = campo(s, 0, 'Lobo', 'Heir of Falkenrath', 'Desperate Farmer', 'Urso'); [s] = campo(s, 1, 'Lobo', 'Thraben Gargoyle', 'Cloistered Youth');
    for (let i = 0; i < 350 && s.status !== 'over'; i++) {
      const p = s.pending ? s.pending.p : s.turn.priority;
      if (i % 7 === 0 && !s.pending) s = mana(s, p, 3);
      const acoes = E.legalActions(s, p).filter(a => a.t !== 'concede');
      assert.ok(acoes.length, `semente ${seed}, passo ${i}: sem ação`);
      r = (r * 1103515245 + 12345) & 0x7fffffff;
      const pref = acoes.filter(a => a.t === 'activate' || a.t === 'cast' || a.t === 'pay');
      const a = pref.length && r % 3 ? pref[r % pref.length] : acoes[r % acoes.length];
      let out; try { out = E.apply(s, a); } catch (e) { assert.fail(`semente ${seed}, passo ${i}: ação oferecida recusada ${JSON.stringify(a)} — ${e.message}`); }
      s = out.state; viradas += out.events.filter(e => e.kind === 'effect' && e.do === 'transformar').length;
      eq(E.invariants(s).filter(x => !/parado em passo sem prioridade/.test(x)), [], `semente ${seed}, passo ${i}, depois de ${a.t}`);
      for (const o of Object.values(s.objects)) if (!o.ability && o.zone !== 'stack' && o.zone !== 'battlefield') assert.ok(!o.frontName, `semente ${seed}, passo ${i}: ${o.name} com o verso para cima em ${o.zone}`);
    }
  }
  assert.ok(viradas > 20, 'transformações no passeio: ' + viradas);
});

/* ================= T-8 · dupla face modal (712.3, 712.8f, 712.11b–c, 712.12, 712.13) ================= */
Object.assign(SCRIPTS, {
  // modal permanente // permanente: Mago 1/1 ({1}) // Torre, artefato ({3}) que ao entrar dá 7 de vida
  'Mago': { name: 'Mago', self: { modal: true }, abilities: [{ kind: 'triggered', when: 'etb', effects: ganha(1) }],
    back: { name: 'Torre', types: ['artifact'], mana: '{3}', abilities: [{ kind: 'triggered', when: 'etb', effects: ganha(7) }] }, ...EX },
  // modal criatura // instantânea: Batedora 2/2 ({1}) // Raio ({R}): 2 de dano a qualquer alvo
  'Batedora': { name: 'Batedora', self: { modal: true }, abilities: [VIRA], back: { name: 'Raio', types: ['instant'], mana: '{R}', effects: [{ do: 'damage', amount: 2, target: 'any' }] }, ...EX },
  'Anula': { name: 'Anula', effects: [{ do: 'counter', target: 'spell' }], ...EX },
});
carta('Mago', 'Creature — Human Wizard', { power: '1', toughness: '1' });
carta('Batedora', 'Creature — Human Scout', { power: '2', toughness: '2' });
carta('Anula', 'Instant');
const naMao = (s, p, nome) => { let oid; [s, oid] = poe(s, p, nome, 'hand'); return [s, oid]; };
const semMana = (s, p) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] = 0; for (const oid of s.zones[p].battlefield) s.objects[oid].tapped = true; return s; };
const doObjeto = (s, p, oid) => legais(s, p, a => a.oid === oid && (a.t === 'cast' || a.t === 'play_land'));
const frente = (s, p, oid) => doObjeto(s, p, oid).filter(a => a.face !== 'verso');
const verso = (s, p, oid) => doObjeto(s, p, oid).filter(a => a.face === 'verso');
const zona = (s, oid) => s.objects[oid].zone;

test('CR 712.11b–c · dupla face modal: da mão o jogador escolhe a face que conjura; só a face escolhida conta — custo, tempo e alvos dela', () => {
  let s, m; [s, m] = naMao(mesa(['Mago']), 0, 'Mago'); s = mana(s, 0);
  eq([frente(s, 0, m).length, verso(s, 0, m).length], [1, 1], 'Mago ou Torre');
  let t = semMana(s, 0); t.players[0].pool.C = 1;
  eq([frente(t, 0, m).length, verso(t, 0, m).length], [1, 0], 'com {1}: só o Mago; a Torre custa {3}');
  // criatura // instantânea: no turno do oponente só a face instantânea, com os alvos dela
  let u, b; [u, b] = naMao(mesa(['Batedora']), 0, 'Batedora');
  u = passaAte(u, x => x.turn.active === 1 && x.turn.step === 'main1' && x.turn.priority === 1); u = act(u, { t: 'pass', p: 1 }); u = mana(u, 0);
  assert.equal(frente(u, 0, b).length, 0, 'a criatura não tem lampejo'); assert.ok(verso(u, 0, b).length >= 2, 'o Raio, com alvos');
  assert.throws(() => act(u, { t: 'cast', p: 0, oid: b }), /fase principal|tempo/);
});

test('CR 712.13 · 712.8f · a face conjurada é a que entra no campo, e a permanente tem só as características dela (valor de mana próprio); 712.8a · fora do campo e da pilha volta a ser a frente', () => {
  let s, m, x; [s, m] = naMao(mesa(['Mago', 'Sopro']), 0, 'Mago'); s = mana(s, 0);
  s = act(s, verso(s, 0, m)[0]);
  eq([zona(s, m), nome(s, m), J(s.facts[nome(s, m)].types), s.facts[nome(s, m)].cmc], ['stack', 'Torre', ['artifact'], 3], '712.8f: na pilha é a Torre, valor de mana 3');
  s = esvazia(s);
  eq([zona(s, m), nome(s, m), E.isCreature(s, s.objects[m]), vida(s)], ['battlefield', 'Torre', false, 7], 'entrou a Torre (gatilho dela), não o Mago');
  assert.equal(E.transformada(s, s.objects[m]), true, '701.27g: dupla face no campo com o verso para cima — a modal também (expectativa da T-8 corrigida na T-9 pela auditoria: o texto não restringe às que transformam)');
  s = J(s); s.zones[0].battlefield.splice(s.zones[0].battlefield.indexOf(m), 1); s.zones[0].hand.push(m); Object.assign(s.objects[m], { zone: 'hand', name: 'Mago' }); delete s.objects[m].frontName;
  let t, n; [t, n] = naMao(mesa(['Mago']), 0, 'Mago'); t = mana(t, 0); t = esvazia(act(t, frente(t, 0, n)[0]));
  eq([nome(t, n), vida(t)], ['Mago', 1], 'conjurada pela frente, entra o Mago');
});

test('CR 712.11b · face de trás que não é permanente: resolve e vai ao cemitério como a carta da frente; anulada, também; 712.9 · a modal não transforma', () => {
  let s, b, x; [s, b] = naMao(mesa(['Batedora', 'Anula']), 0, 'Batedora'); s = mana(s, 0);
  let t = esvazia(act(s, verso(s, 0, b).find(a => a.targets[0].player === 1)));
  eq([t.players[1].life, zona(t, b), nome(t, b), t.objects[b].frontName], [18, 'graveyard', 'Batedora', undefined]);
  let u = act(s, verso(s, 0, b).find(a => a.targets[0].player === 1));
  [u, x] = naMao(u, 1, 'Anula'); u = mana(u, 1); u = act(u, { t: 'pass', p: 0 });
  u = esvazia(act(u, legais(u, 1, a => a.t === 'cast' && a.oid === x && a.targets[0].oid === b)[0]));
  eq([u.players[1].life, zona(u, b), nome(u, b)], [20, 'graveyard', 'Batedora'], 'anulada: cemitério, como a frente');
  // 712.9: a Batedora no campo com "transforme" não vira o Raio nem coisa alguma
  let v, c; [v, c] = campo(mesa(['Batedora']), 0, 'Batedora'); v = esvazia(ativa(v, c)); assert.equal(nome(v, c), 'Batedora');
});

test('CR 712.12 · jogar a dupla face modal como terreno: o jogador escolhe uma face que seja terreno; conta como o terreno do turno; a outra face continua conjurável', () => {
  let s, f; [s, f] = naMao(mesa(['Tangled Florahedron']), 0, 'Tangled Florahedron'); s = mana(s, 0);
  eq([frente(s, 0, f).map(a => a.t), verso(s, 0, f).map(a => a.t)], [['cast'], ['play_land']], 'conjurar a criatura ou jogar o Tangled Vale');
  let t = act(s, verso(s, 0, f)[0]);
  eq([zona(t, f), nome(t, f), J(t.facts[nome(t, f)].types), t.objects[f].tapped, t.players[0].landsPlayed, t.stack.length], ['battlefield', 'Tangled Vale', ['land'], true, 1, 0], 'entra o terreno, virado, sem usar a pilha');
  let f2; [t, f2] = naMao(t, 0, 'Tangled Florahedron'); t = mana(t, 0);
  eq([frente(t, 0, f2).length, verso(t, 0, f2).length], [1, 0], 'já jogou terreno: a outra cópia só pode ser conjurada');
  t = J(t); t.objects[f].tapped = false;
  eq(J(E.productions(t, t.objects[f])), [['G']], 'o Tangled Vale gera {G}');
  // conjurada pela frente é a criatura 1/1 que gera {G}
  let u = esvazia(act(s, frente(s, 0, f)[0]));
  eq([nome(u, f), pt(u, f), J(E.productions(u, u.objects[f]))], ['Tangled Florahedron', [1, 1], [['G']]]);
  // fora do tempo de terreno, nada de jogar o verso
  let w = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1'); w = mana(J(w), 0);
  assert.equal(verso(w, 0, f).length, 0);
  assert.throws(() => act(w, { t: 'play_land', p: 0, oid: f, face: 'verso' }), /fase principal|tempo|prioridade/);
});

test('CR 712.12 · terreno // terreno (Brightclimb Pathway // Grimclimb Pathway): as duas faces são oferecidas e o terreno que entra gera só a cor da face escolhida; face que não é terreno não é jogada como terreno', () => {
  let s, p; [s, p] = naMao(mesa(['Brightclimb Pathway', 'Mago']), 0, 'Brightclimb Pathway');
  eq([frente(s, 0, p).map(a => a.t), verso(s, 0, p).map(a => a.t)], [['play_land'], ['play_land']]);
  const a = act(s, frente(s, 0, p)[0]), b = act(s, verso(s, 0, p)[0]);
  eq([nome(a, p), J(E.productions(a, a.objects[p])), nome(b, p), J(E.productions(b, b.objects[p])), b.objects[p].tapped], ['Brightclimb Pathway', [['W']], 'Grimclimb Pathway', [['B']], false]);
  let m; [s, m] = naMao(s, 0, 'Mago');
  assert.throws(() => act(s, { t: 'play_land', p: 0, oid: m, face: 'verso' }), /não é terreno/);
  assert.throws(() => act(s, { t: 'cast', p: 0, oid: p, face: 'verso' }), /terreno é jogado/);
});

test('S8 · Skyclave Cleric // Skyclave Basilica e Zof Consumption // Zof Bloodbog: a mágica da frente ou o terreno do verso (que entra virado e gera a cor)', () => {
  let s, c; [s, c] = naMao(mesa(['Skyclave Cleric']), 0, 'Skyclave Cleric'); s = mana(s, 0);
  let t = esvazia(act(s, frente(s, 0, c)[0])); eq([nome(t, c), pt(t, c), vida(t)], ['Skyclave Cleric', [1, 3], 2]);
  t = act(s, verso(s, 0, c)[0]); eq([nome(t, c), t.objects[c].tapped, vida(t)], ['Skyclave Basilica', true, 0]);
  t = J(t); t.objects[c].tapped = false; eq(J(E.productions(t, t.objects[c])), [['W']]);
  let u, z; [u, z] = naMao(mesa(['Zof Consumption']), 0, 'Zof Consumption'); u = mana(u, 0);
  let v = esvazia(act(u, frente(u, 0, z)[0])); eq([vida(v, 0), vida(v, 1), zona(v, z), nome(v, z)], [4, -4, 'graveyard', 'Zof Consumption']);
  v = act(u, verso(u, 0, z)[0]); eq([nome(v, z), v.objects[z].tapped], ['Zof Bloodbog', true]);
  v = J(v); v.objects[z].tapped = false; eq(J(E.productions(v, v.objects[z])), [['B']]);
  for (const n of ['Tangled Florahedron', 'Skyclave Cleric', 'Zof Consumption', 'Brightclimb Pathway']) { const sc = S.SCRIPTS[n]; assert.ok(sc && sc.example, n); eq([...S.validateScript(sc)], [], n); }
});

test('CR 712.3 · com os dados da carta como a Scryfall entrega (nome "A // B", duas faces, sem custo no nível de cima): pelo nome da lista ou pelo nome completo, as duas faces jogam', () => {
  const scry = { name: 'Tangled Florahedron // Tangled Vale', layout: 'modal_dfc', mana_cost: '{1}{G}', cmc: 2, type_line: 'Creature — Elemental // Land', oracle_text: '{T}: Add {G}.\n//\nTangled Vale enters tapped.\n{T}: Add {G}.', keywords: [], colors: ['G'], power: '1', toughness: '1', // como o app normaliza o dado da Scryfall (normalizeCard)
    faces: [{ name: 'Tangled Florahedron', mana_cost: '{1}{G}', type_line: 'Creature — Elemental', oracle_text: '{T}: Add {G}.', power: '1', toughness: '1', colors: ['G'] },
      { name: 'Tangled Vale', mana_cost: '', type_line: 'Land', oracle_text: 'Tangled Vale enters tapped.\n{T}: Add {G}.', colors: [] }] };
  for (const chave of ['Tangled Florahedron', 'Tangled Florahedron // Tangled Vale']) {
    const cards = { [chave]: scry }; for (const n of ['Plains', 'Forest', 'Island', 'Mountain']) cards[n] = CARTAS[n];
    let s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards, scripts: {}, players: [{ name: 'A', deck: [{ name: chave, qty: 20, zone: 'main' }, { name: 'Forest', qty: 20, zone: 'main' }] }, { name: 'B', deck: [{ name: 'Island', qty: 40, zone: 'main' }] }] });
    for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
    s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
    let c; [s, c] = poe(s, 0, chave, 'hand'); s = mana(s, 0);
    assert.ok(s.facts[chave].script, chave + ': tem script na partida');
    eq([frente(s, 0, c).map(a => a.t), verso(s, 0, c).map(a => a.t)], [['cast'], ['play_land']], chave);
    eq(s.facts[chave].cost.colored, { G: 1 }, chave + ': custo da frente');
    const t = act(s, verso(s, 0, c)[0]); eq([nome(t, c), t.objects[c].tapped], ['Tangled Vale', true]);
    const u = esvazia(act(s, frente(s, 0, c)[0])); eq([zona(u, c), pt(u, c)], ['battlefield', [1, 1]], chave + ': a criatura');
  }
});

test('CR 712.12 · com rede: terreno // terreno com as duas faces no dado (texto junto "{T}: Add {W}. // {T}: Add {B}.") — a frente gera só {W} e o verso só {B}', () => {
  const scry = { name: 'Brightclimb Pathway // Grimclimb Pathway', layout: 'modal_dfc', mana_cost: '', cmc: 0, type_line: 'Land // Land', oracle_text: '{T}: Add {W}.\n//\n{T}: Add {B}.', keywords: [], colors: [],
    faces: [{ name: 'Brightclimb Pathway', mana_cost: '', type_line: 'Land', oracle_text: '{T}: Add {W}.', colors: [] }, { name: 'Grimclimb Pathway', mana_cost: '', type_line: 'Land', oracle_text: '{T}: Add {B}.', colors: [] }] };
  const chave = 'Brightclimb Pathway // Grimclimb Pathway', cards = { [chave]: scry }; for (const n of ['Plains', 'Forest', 'Island', 'Mountain']) cards[n] = CARTAS[n];
  let s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards, scripts: {}, players: [{ name: 'A', deck: [{ name: chave, qty: 20, zone: 'main' }, { name: 'Forest', qty: 20, zone: 'main' }] }, { name: 'B', deck: [{ name: 'Island', qty: 40, zone: 'main' }] }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  let c; [s, c] = poe(s, 0, chave, 'hand');
  const a = act(s, frente(s, 0, c)[0]), b = act(s, verso(s, 0, c)[0]);
  eq([J(E.productions(a, a.objects[c])), nome(b, c), J(E.productions(b, b.objects[c]))], [[['W']], 'Grimclimb Pathway', [['B']]]);
});

test('CR 712.3 · validador da modal e mesa: `self.modal` pede face de trás; face de trás que não é terreno pede custo (`back.mana`); a folha diz o nome da face ("Jogar Tangled Vale", "Conjurar Torre · {3}") e o registro também', () => {
  const v = sc => S.validateScript({ name: 'X', ...sc, ...EX }).join(' | ');
  assert.equal(v(SCRIPTS['Mago']), ''); assert.equal(v(SCRIPTS['Batedora']), '');
  assert.match(v({ self: { modal: true }, abilities: [VIRA] }), /modal.*face de trás/);
  assert.match(v({ self: { modal: true }, abilities: [VIRA], back: { name: 'Y', types: ['artifact'] } }), /modal.*custo/);
  assert.match(v({ self: { modal: true, duplaFace: true }, abilities: [VIRA], back: { name: 'Y', types: ['land'] } }), /não as duas/);
  let s, f, m; [s, f] = naMao(mesa(['Tangled Florahedron', 'Mago']), 0, 'Tangled Florahedron'); [s, m] = naMao(s, 0, 'Mago'); s = mana(s, 0);
  eq(E.faceDeTras(s, f), { nome: 'Tangled Vale', terreno: true, mana: null }); eq(E.faceDeTras(s, m), { nome: 'Torre', terreno: false, mana: '{3}' });
  const a1 = verso(s, 0, f)[0], a2 = verso(s, 0, m)[0];
  assert.match(T.describe(s, a1, [], act(s, a1)).join(' | '), /A jogou Tangled Vale \(a outra face de Tangled Florahedron\)/);
  assert.match(T.describe(s, a2, [], act(s, a2)).join(' | '), /A conjurou Torre \(a outra face de Mago\)/);
  const src = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  assert.match(src, /`Jogar \$\{fv\.nome\}`/); assert.match(src, /`Conjurar \$\{fv\.nome\}/);
});

test('CR 712.3 · partida sem a carta modal não ganha nada no estado, e o passeio aleatório com modais nos dois lados não recusa ação oferecida nem deixa o verso para cima fora do campo e da pilha', () => {
  const jogo = nomes => { const cards = Object.fromEntries(['Plains', 'Forest', 'Island', 'Mountain', ...nomes].map(n => [n, CARTAS[n]]));
    return E.createGame({ format: 'livre', seed: 1, mode: 'full', cards, scripts: {}, players: [{ name: 'A', deck: baralho([...nomes, 'Plains', 'Forest']) }, { name: 'B', deck: baralho([...nomes, 'Island', 'Mountain']) }] }); };
  const sem = jogo(['Urso']);
  for (const n of ['Tangled Vale', 'Skyclave Basilica', 'Zof Bloodbog', 'Grimclimb Pathway']) assert.equal(sem.facts[n], undefined, n);
  let pelaFace = 0;
  for (let seed = 1; seed <= 5; seed++) {
    let s = mesa(['Tangled Florahedron', 'Skyclave Cleric', 'Zof Consumption', 'Brightclimb Pathway', 'Mago', 'Batedora', 'Urso'], undefined, seed), r = seed * 32452843;
    for (let i = 0; i < 350 && s.status !== 'over'; i++) {
      const p = s.pending ? s.pending.p : s.turn.priority;
      if (i % 9 === 0 && !s.pending) s = mana(s, p, 2);
      const acoes = E.legalActions(s, p).filter(a => a.t !== 'concede');
      assert.ok(acoes.length, `semente ${seed}, passo ${i}: sem ação`);
      r = (r * 1103515245 + 12345) & 0x7fffffff;
      const pref = acoes.filter(a => a.face === 'verso' || a.t === 'cast' || a.t === 'play_land');
      const a = pref.length && r % 3 ? pref[r % pref.length] : acoes[r % acoes.length];
      if (a.face === 'verso') pelaFace++;
      let out; try { out = E.apply(s, a); } catch (e) { assert.fail(`semente ${seed}, passo ${i}: ação oferecida recusada ${JSON.stringify(a)} — ${e.message}`); }
      s = out.state;
      eq(E.invariants(s).filter(x => !/parado em passo sem prioridade/.test(x)), [], `semente ${seed}, passo ${i}, depois de ${a.t}`);
      for (const o of Object.values(s.objects)) if (!o.ability && o.zone !== 'stack' && o.zone !== 'battlefield') assert.ok(!o.frontName, `semente ${seed}, passo ${i}: ${o.name} com o verso para cima em ${o.zone}`);
    }
  }
  assert.ok(pelaFace > 15, 'jogadas pela face de trás no passeio: ' + pelaFace);
});

/* ---------------- T-9 · correções da auditoria independente (161 sondas, fuzz de 120 partidas, 130.152 pedidos diretos; cada divergência nasceu aqui como teste que falhava) ---------------- */
Object.assign(SCRIPTS, {
  // dupla face com lampejo e "{0}: transforme": dá para devolvê-la e conjurá-la de novo com a habilidade na pilha
  'Lobo Ligeiro': { name: 'Lobo Ligeiro', self: { duplaFace: true }, abilities: [VIRA], back: { name: 'Fera Ligeira', types: ['creature'], power: 5, toughness: 5 }, ...EX },
  'Imitação Veloz': { name: 'Imitação Veloz', effects: [{ do: 'ficha_copia', amount: 1, target: 'permanent', palavras: ['haste'] }], ...EX },
  'Modal Vira': { name: 'Modal Vira', self: { modal: true }, abilities: [VIRA], back: { name: 'Torre Vira', types: ['artifact'], mana: '{2}', abilities: [VIRA] }, ...EX },
  'Exila Topo': { name: 'Exila Topo', effects: [{ do: 'exile_top_playable', amount: 1 }], ...EX },
  'Sopro2': { name: 'Sopro2', effects: [{ do: 'bounce', target: 'permanent' }], ...EX },
});
carta('Lobo Ligeiro', 'Creature — Wolf', { power: '2', toughness: '2', keywords: ['Flash'], oracle_text: 'Flash' });
carta('Imitação Veloz', 'Sorcery'); carta('Modal Vira', 'Creature — Golem', { power: '1', toughness: '1' }); carta('Exila Topo', 'Sorcery'); carta('Sopro2', 'Instant');

test('CR 400.7 · a habilidade da permanente que saiu do campo e voltou não transforma o objeto novo (D1)', () => {
  let s, l, x; [s, l] = campo(mesa(['Lobo Ligeiro', 'Sopro2']), 0, 'Lobo Ligeiro');
  s = ativa(s, l); // "{0}: transforme" na pilha
  [s, x] = conjura(s, 0, 'Sopro2', alvo(l)); s = resolveUm(s);
  assert.equal(s.objects[l].zone, 'hand');
  s = mana(s, 0); s = resolveUm(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === l)[0])); // conjurada de novo, com lampejo
  assert.equal(s.objects[l].zone, 'battlefield');
  s = esvazia(s);
  assert.equal(nome(s, l), 'Lobo Ligeiro', 'a habilidade era do objeto antigo: o novo não transforma');
});

test('CR 707.8a · 707.9 · a ficha que copia uma dupla face "com ímpeto" (exceção da cópia) também transforma e volta (D3)', () => {
  let s, l, x; [s, l] = campo(mesa(['Lobo', 'Imitação Veloz']), 0, 'Lobo');
  [s, x] = conjura(s, 0, 'Imitação Veloz', alvo(l)); s = esvazia(s);
  const f = Object.values(s.objects).find(o => o.token && o.zone === 'battlefield').oid;
  eq([nome(s, f), tem(s, f, 'haste')], ['Lobo', true]);
  s = esvazia(ativa(s, f)); eq([nome(s, f), pt(s, f), tem(s, f, 'trample'), tem(s, f, 'haste'), E.transformada(s, s.objects[f])], ['Fera', [4, 4], true, true, true], 'virou a Fera, ainda com o ímpeto da exceção');
  s = esvazia(ativa(s, f)); eq([nome(s, f), pt(s, f), E.transformada(s, s.objects[f])], ['Lobo', [2, 2], false]);
});

test('CR 712.3 · 701.27a · 701.27g · a dupla face modal com "transforme" transforma para a outra face e, com o verso para cima, é uma permanente transformada (D5)', () => {
  let s, m; [s, m] = campo(mesa(['Modal Vira']), 0, 'Modal Vira');
  s = esvazia(ativa(s, m)); eq([nome(s, m), E.transformada(s, s.objects[m]), E.isCreature(s, s.objects[m])], ['Torre Vira', true, false]);
  s = esvazia(ativa(s, m)); eq([nome(s, m), E.transformada(s, s.objects[m])], ['Modal Vira', false]);
  // a carta de uma face modal com a face de trás que é mágica não transforma (701.27d): a Batedora segue Batedora
  let t, b; [t, b] = campo(mesa(['Batedora']), 0, 'Batedora'); t = esvazia(ativa(t, b)); assert.equal(nome(t, b), 'Batedora');
});

test('CR 712.11b · 712.12 · carta modal jogável do exílio ("exile the top card; you may play it"): as duas faces são oferecidas lá também (D6)', () => {
  for (const [alvoN, t0, verso0] of [['Zof Consumption', 'play_land', 'Zof Bloodbog'], ['Mago', 'cast', 'Torre'], ['Brightclimb Pathway', 'play_land', 'Grimclimb Pathway']]) {
    let s, ex; [s, ex] = poe(mesa(['Exila Topo', 'Zof Consumption', 'Mago', 'Brightclimb Pathway']), 0, 'Exila Topo', 'hand'); s = J(s);
    const lib = s.zones[0].library, z = lib.find(o => s.objects[o].name === alvoN); lib.splice(lib.indexOf(z), 1); lib.unshift(z);
    s = mana(s, 0); s = esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === ex)[0]));
    eq([s.objects[z].zone, s.objects[z].playableFromExile], ['exile', 0], alvoN + ' no exílio, jogável');
    s = mana(s, 0);
    const v = verso(s, 0, z); assert.ok(v.length >= 1 && v.every(a => a.t === t0), alvoN + ': a face de trás é oferecida do exílio: ' + JSON.stringify(v));
    const r = esvazia(act(s, v[0])); eq([r.objects[z].zone, nome(r, z)], ['battlefield', verso0], alvoN);
  }
});

test('CR 107.3 · pedido da face de trás com X numa face sem X é recusado (D10)', () => {
  let s, m; [s, m] = naMao(mesa(['Mago']), 0, 'Mago'); s = mana(s, 0);
  assert.throws(() => act(s, { t: 'cast', p: 0, oid: m, face: 'verso', x: 3 }), /X/);
});

/* ================= T-11 · conjurar sem pagar com a dupla face modal (era limite declarado na T-9, D7) ================= */
Object.assign(SCRIPTS, { 'Covil': { name: 'Covil', effects: [{ do: 'draw_free_cast', amount: 1 }], ...EX } }); // "compre uma carta; você pode conjurá-la sem pagar"
carta('Covil', 'Sorcery');

test('CR 712.11b · conjurar sem pagar: a decisão oferece também a face de trás da modal (com os alvos dela), e o pedido do verso é o oferecido; terreno do verso não é conjurado', () => {
  let s = mesa(['Covil', 'Batedora', 'Urso']), cv; [s, cv] = naMao(s, 0, 'Covil'); s = J(s);
  const L = s.zones[0].library, b = L.find(x => s.objects[x].name === 'Batedora'); L.splice(L.indexOf(b), 1); L.unshift(b);
  let u; [s, u] = campo(s, 1, 'Urso');
  s = mana(s, 0); s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === cv)[0]); s = passaAte(s, x => !!x.pending);
  assert.equal(s.pending && s.pending.kind, 'free_cast');
  const of = legais(s, 0, a => a.t === 'cast_free' && a.oid === b);
  assert.ok(of.some(a => a.face == null), 'a frente (Batedora)');
  const raios = of.filter(a => a.face === 'verso');
  assert.ok(raios.some(alvo(u)) && raios.some(a => a.targets[0].player === 1), 'o Raio do verso, com os alvos dele: ' + JSON.stringify(raios));
  const t = act(s, raios.find(alvo(u)));
  eq([zona(t, b), nome(t, b)], ['stack', 'Raio']);
  assert.equal(zona(esvazia(t), u), 'graveyard', 'o Raio sem pagar mata o Urso');
  let s2 = mesa(['Covil', 'Tangled Florahedron']), c2; [s2, c2] = naMao(s2, 0, 'Covil'); s2 = J(s2);
  const L2 = s2.zones[0].library, f = L2.find(x => s2.objects[x].name === 'Tangled Florahedron'); L2.splice(L2.indexOf(f), 1); L2.unshift(f);
  s2 = mana(s2, 0); s2 = act(s2, legais(s2, 0, a => a.t === 'cast' && a.oid === c2)[0]); s2 = passaAte(s2, x => !!x.pending);
  assert.ok(!legais(s2, 0, a => a.t === 'cast_free' && a.oid === f).some(a => a.face === 'verso'), 'Tangled Vale é terreno: não se conjura');
});
