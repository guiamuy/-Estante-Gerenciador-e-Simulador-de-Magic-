// T-29 · CR5 · Cartas de virar (Comprehensive Rules 710, com 110.5, 400.7 e 707.2).
// Texto da regra: .regras/cr-2026-09-25.txt. Carta exemplo com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge, consulta
// de 13/10/2026): Orochi Eggwatcher // Shidako, Broodmistress. As cartas "de teste" são scripts sintéticos que isolam a regra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, T, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => x.name === 'Orochi Eggwatcher // Shidako, Broodmistress')) // como a Scryfall entrega: o nome das duas partes, a linha de tipo das duas e o P/R da parte normal
  C[c.name] = { name: c.name, type_line: `${c.type_line} // ${c.verso.type_line}`, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: ['G'], power: c.power, toughness: c.toughness, layout: 'flip' };
C.Forest = { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {G}.)', colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = {
  // Carta de virar de teste: Aprendiz ({1}{W}, 1/1) "{T}: Flip Aprendiz." · Mestra (lendária 4/4): "{T}: You gain 3 life."
  'Aprendiz': { name: 'Aprendiz', self: { virar: true }, abilities: [{ kind: 'activated', cost: { tap: true }, effects: [{ do: 'virar_carta' }] }],
    back: { name: 'Mestra', types: ['creature'], subtypes: ['Human', 'Monk'], legendary: true, power: 4, toughness: 4, abilities: [{ kind: 'activated', cost: { tap: true }, effects: [{ do: 'gain', amount: 3 }] }] }, ...EX },
  'Rebote': { name: 'Rebote', effects: [{ do: 'bounce', target: 'creature' }], ...EX },
  'Espelho': { name: 'Espelho', effects: [{ do: 'ficha_copia', amount: 1, target: 'creature' }], ...EX },
  'Busca Lendária': { name: 'Busca Lendária', effects: [{ do: 'destroy', target: { tipos: ['creature'], lendaria: true } }], ...EX }, // "Destroy target legendary creature."
  'Sopro': { name: 'Sopro', effects: [{ do: 'gain', amount: 1 }], ...EX },
};
carta('Aprendiz // Mestra', 'Creature — Human Monk // Legendary Creature — Human Monk', { mana_cost: '{1}{W}', cmc: 2, colors: ['W'], power: '1', toughness: '1', layout: 'flip' });
carta('Rebote', 'Instant'); carta('Espelho', 'Sorcery'); carta('Busca Lendária', 'Instant'); carta('Sopro', 'Instant');
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' });

const OE = 'Orochi Eggwatcher // Shidako, Broodmistress', AM = 'Aprendiz // Mestra';
const TODAS = [OE, AM, 'Rebote', 'Espelho', 'Busca Lendária', 'Sopro', 'Urso'];
function mesa(seed = 1) {
  const deck = [...TODAS.map(name => ({ name, qty: name === 'Urso' ? 12 : 4, zone: 'main' })), { name: 'Forest', qty: 12, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const esvazia = s => { for (let i = 0; i < 30; i++) { s = passaAte(s, x => !x.stack.length || !!x.pending); if (!s.pending || !['triggers', 'pick_target'].includes(s.pending.kind)) return s; s = act(s, legais(s, s.pending.p)[0]); } return s; };
const pt = (s, oid) => { const st = E.stats(s, s.objects[oid]); return [st.power, st.toughness]; };
const ativa = (s, p, oid, i = 0) => esvazia(act(s, legais(s, p, a => a.t === 'activate' && a.oid === oid && (a.index || 0) === i)[0]));
const fatos = (s, oid) => s.facts[s.objects[oid].name];
const desvira = (s, oid) => { s = J(s); s.objects[oid].tapped = false; s.objects[oid].sick = false; return s; };

test('CR 710.1b / 710.2 · virada, a permanente tem nome, tipo, P/R e texto da parte alternativa; antes, só os da parte normal', () => {
  let s = mesa(); let a; [s, a] = poe(s, 0, AM, 'battlefield', { sick: false });
  eq([s.objects[a].name, pt(s, a), fatos(s, a).legendary], [AM, [1, 1], false], 'antes de virar: Aprendiz 1/1, não lendária');
  s = ativa(s, 0, a);
  eq([s.objects[a].name, pt(s, a), fatos(s, a).legendary, E.abilitiesOf(s, s.objects[a]).filter(x => x.kind === 'activated').length], ['Mestra', [4, 4], true, 1]);
  const v = s.players[0].life; s = ativa(desvira(s, a), 0, a);
  assert.equal(s.players[0].life, v + 3, 'a habilidade da Mestra (e não a do Aprendiz)');
});

test('CR 710.1c · virar não muda cor nem custo de mana (nem o valor de mana)', () => {
  let s = mesa(); let o; [s, o] = poe(s, 0, OE);
  const antes = [E.coresDe(s, s.objects[o]), fatos(s, o).cmc];
  s = J(s); s.objects[o].frontName = s.objects[o].name; s.objects[o].name = 'Shidako, Broodmistress'; // virada por dado: o que se testa são os fatos da parte alternativa
  eq([E.coresDe(s, s.objects[o]), fatos(s, o).cmc, fatos(s, o).legendary, pt(s, o)], [antes[0], antes[1], true, [3, 3]]);
});

test('CR 710.4 · virar é sem volta: virada, "flip" de novo não faz nada', () => {
  let s = mesa(); let a; [s, a] = poe(s, 0, AM, 'battlefield', { sick: false });
  s = ativa(s, 0, a);
  let t = J(s); t.queued.push({ source: a, name: 'Mestra', controller: 0, effects: [{ do: 'virar_carta' }], when: 'teste' });
  t = esvazia(E.apply(t, { t: 'pass', p: 0 }).state);
  eq([t.objects[a].name, t.objects[a].frontName], ['Mestra', AM]);
});

test('CR 400.7 / 110.5 · a carta virada que sai do campo volta a ser só a parte normal; entra de novo sem virar', () => {
  let s = mesa(); let a; [s, a] = poe(s, 0, AM, 'battlefield', { sick: false });
  s = ativa(s, 0, a);
  let r; [s, r] = poe(s, 0, 'Rebote', 'hand'); s = mana(s);
  s = esvazia(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === r && (x.targets || []).some(t => t.oid === a))[0]));
  eq([s.objects[a].zone, s.objects[a].name, s.objects[a].frontName || null], ['hand', AM, null]);
  s = mana(s); s = esvazia(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === a)[0]));
  eq([s.objects[a].zone, s.objects[a].name, pt(s, a)], ['battlefield', AM, [1, 1]]);
});

test('CR 400.7 · a habilidade de virar ativada antes de a carta sair e voltar não vira o objeto novo', () => {
  let s = mesa(); let a; [s, a] = poe(s, 0, AM, 'battlefield', { sick: false });
  let t = J(act(s, legais(s, 0, x => x.t === 'activate' && x.oid === a)[0]));
  E.moveObject(t, a, 'hand'); E.moveObject(t, a, 'battlefield', { controller: 0 });
  t = esvazia(t);
  eq([t.objects[a].zone, t.objects[a].name], ['battlefield', AM]);
});

test('Orochi Eggwatcher (texto oficial) · cria uma Cobra 1/1 verde; com menos de dez criaturas não vira; com dez ou mais (contando a Cobra nova), vira em Shidako, Broodmistress', () => {
  let s = mesa(); let o; [s, o] = poe(s, 0, OE, 'battlefield', { sick: false }); s = mana(s);
  s = ativa(s, 0, o);
  const cobras = s.zones[0].battlefield.filter(x => s.objects[x].token && /Snake/.test(E.linhaDeTipo(s, s.objects[x])));
  eq([cobras.length, E.coresDe(s, s.objects[cobras[0]]), pt(s, cobras[0]), s.objects[o].name], [1, ['G'], [1, 1], OE], 'uma Cobra; 2 criaturas: não vira');
  for (let i = 0; i < 7; i++) [s] = poe(s, 0, 'Urso');
  s = mana(desvira(s, o)); s = ativa(s, 0, o);
  eq([s.objects[o].name, pt(s, o)], ['Shidako, Broodmistress', [3, 3]], '10 criaturas com a Cobra nova: vira');
});

test('Shidako, Broodmistress (texto oficial) · {G}, sacrificar uma criatura (pode ser ela mesma): criatura alvo +3/+3', () => {
  let s = mesa(); let o; [s, o] = poe(s, 0, OE, 'battlefield', { sick: false }); let u; [s, u] = poe(s, 0, 'Urso');
  s = J(s); s.objects[o].frontName = s.objects[o].name; s.objects[o].name = 'Shidako, Broodmistress'; s = mana(s);
  const ofs = legais(s, 0, a => a.t === 'activate' && a.oid === o && (a.targets || []).some(t => t.oid === u));
  assert.ok(ofs.length >= 2, 'sacrificando o Urso ou a própria Shidako');
  const a = ofs.find(x => JSON.stringify(x).includes(`"${o}"`) && !JSON.stringify(x.targets).includes(`"${o}"`)) || ofs[0];
  s = esvazia(act(s, a));
  assert.ok(pt(s, u)[0] === 5 || s.objects[u].zone !== 'battlefield', 'o Urso ganhou +3/+3 (ou foi o sacrificado)');
});

test('CR 710.2 / 205.4 · "criatura lendária": a carta não virada não é lendária; virada, é (e a regra das lendas vale para duas viradas)', () => {
  let s = mesa(); let a; [s, a] = poe(s, 1, AM, 'battlefield', { sick: false });
  let b; [s, b] = poe(s, 0, 'Busca Lendária', 'hand'); s = mana(s);
  assert.equal(legais(s, 0, x => x.t === 'cast' && x.oid === b && (x.targets || []).some(t => t.oid === a)).length, 0, 'Aprendiz não é alvo');
  s = J(s); s.objects[a].frontName = s.objects[a].name; s.objects[a].name = 'Mestra';
  assert.ok(legais(s, 0, x => x.t === 'cast' && x.oid === b && (x.targets || []).some(t => t.oid === a)).length > 0, 'Mestra é alvo');
  let c; [s, c] = poe(s, 0, AM, 'battlefield', { sick: false }); let d; [s, d] = poe(s, 0, AM, 'battlefield', { sick: false });
  s = ativa(s, 0, c); s = ativa(s, 0, d);
  assert.equal(s.pending && s.pending.kind, 'legend', 'duas Mestras do mesmo controlador: a regra das lendas pergunta');
});

test('CR 707.2 / 110.5 · a cópia de uma carta virada não copia o status: é a parte normal, não virada', () => {
  let s = mesa(); let a; [s, a] = poe(s, 0, AM, 'battlefield', { sick: false });
  s = ativa(s, 0, a);
  let e; [s, e] = poe(s, 0, 'Espelho', 'hand'); s = mana(s);
  s = esvazia(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === e && (x.targets || []).some(t => t.oid === a))[0]));
  const f = s.zones[0].battlefield.find(x => s.objects[x].token && x !== a);
  eq([s.objects[f].name, pt(s, f)], [AM, [1, 1]]);
});

test('Validador · carta de virar: parte alternativa de permanente, sem custo próprio; "virar_carta" só numa carta de virar', () => {
  eq(SC.validateScript(SCRIPTS.Aprendiz), []);
  const v = sc => SC.validateScript({ ...SCRIPTS.Aprendiz, ...sc });
  assert.ok(v({ back: { ...SCRIPTS.Aprendiz.back, mana: '{3}' } }).some(e => /virar/.test(e)), 'custo próprio (710.1c)');
  assert.ok(v({ back: { ...SCRIPTS.Aprendiz.back, types: ['instant'] } }).some(e => /virar/.test(e)), 'parte alternativa que não é permanente');
  assert.ok(v({ back: undefined }).some(e => /virar/.test(e)), 'sem a parte alternativa');
  assert.ok(SC.validateScript({ name: 'X', abilities: [{ kind: 'activated', cost: { tap: true }, effects: [{ do: 'virar_carta' }] }], ...EX }).some(e => /virar/.test(e)), 'virar_carta fora de carta de virar');
  assert.ok(v({ abilities: [{ kind: 'activated', cost: { tap: true }, effects: [{ do: 'virar_carta', se: { minMao: 9 } }] }] }).some(e => /virar/.test(e)), 'condição desconhecida');
});

test('Registro · virar diz no que a carta virou', () => {
  let s = mesa(); let a; [s, a] = poe(s, 0, AM, 'battlefield', { sick: false });
  const r1 = E.apply(s, legais(s, 0, x => x.t === 'activate' && x.oid === a)[0]), r2 = E.apply(r1.state, { t: 'pass', p: 0 }), r3 = E.apply(r2.state, { t: 'pass', p: 1 });
  const linhas = T.describe(r2.state, { t: 'pass', p: 1 }, r3.events, r3.state);
  assert.ok(linhas.some(l => /virou: agora é Mestra/.test(l)), JSON.stringify(linhas));
});

test('CR 710 · passeio aleatório com cartas de virar: nada oferecido é recusado e carta virada nunca desvira no campo', () => {
  let viradas = 0;
  for (let seed = 1; seed <= 10; seed++) {
    let s = mesa(seed);
    for (let i = 0; i < 250 && s.status === 'playing'; i++) {
      const p = s.pending ? s.pending.p : s.turn.priority; if (i % 6 === 0) s = mana(s, p, 2);
      const os = E.legalActions(s, p); if (!os.length) break;
      const pref = os.filter(a => a.t === 'activate' && /Aprendiz/.test((s.objects[a.oid] || {}).name || '')), lista = pref.length && i % 2 === 0 ? pref : os;
      const antes = {}; for (const o of Object.values(s.objects)) if (o.zone === 'battlefield' && o.frontName && E.virarScriptT(s, o)) antes[o.oid] = o.zc || 0;
      s = E.apply(s, lista[(i * 7 + seed) % lista.length]).state;
      for (const [oid, zc] of Object.entries(antes)) { const o = s.objects[oid]; if (o && o.zone === 'battlefield' && (o.zc || 0) === zc) assert.ok(o.frontName, 'desvirou no campo'); }
      viradas += Object.values(s.objects).filter(o => o.zone === 'battlefield' && o.frontName && E.virarScriptT(s, o) && !(o.oid in antes)).length;
    }
  }
  assert.ok(viradas > 3, `o passeio virou cartas (${viradas})`);
});
