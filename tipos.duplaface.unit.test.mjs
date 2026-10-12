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
