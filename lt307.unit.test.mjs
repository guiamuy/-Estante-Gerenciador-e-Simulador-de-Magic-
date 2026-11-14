// M-632 · rotina Motor contínuo · campanha Modern, ordem gulosa (coleta de 13/11/2026 16h40 UTC): Fable of the Mirror-Breaker // Reflection of
// Kiki-Jiki (17 listas Modern, gulosa 2; também Pioneer, Legacy e Vintage). Texto da API da Scryfall da coleta de 13/11 (.listas/oficiais-revisadas.json),
// conferido em scryfall.com no mesmo dia, e rulings de 18/02/2022. Regras novas: 701.9 com "up to N" e "draw that many" (descarta_ate_compra_m:
// escolha de 0 a N cartas da mão, compra quantas descartou); 603.7c "Sacrifice it at the beginning of the next end step" preso a cada ficha
// criada pela cópia (ficha_copia.sacrificaNoFimM; a cópia da ficha não é sacrificada); 707.9b "except it has haste" e 707.8 (a cópia de uma ficha
// copia o que o efeito que a criou definiu, com as habilidades). Tudo falha no motor anterior: a carta não tinha script, nem o efeito, nem o atrasado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';

const M = loadModules(), E = M.engine, S = M.scripts, T = M.table;
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const FA = 'Fable of the Mirror-Breaker', RK = 'Reflection of Kiki-Jiki';
const J = x => JSON.parse(JSON.stringify(x));
const of = OF.find(x => x.name === FA);

test('M-632 · texto da Scryfall de 13/11 guardado; script à mão válido e cobertura completa (pela frente e pelo nome inteiro)', () => {
  assert.ok(of, 'Fable em .listas/oficiais-revisadas.json');
  assert.match(of.fonte, /api\.scryfall\.com/); assert.equal(of.consulta, '2026-11-13'); assert.equal(of.layout, 'transform');
  assert.equal(of.faces[0].oracle_text, '(As this Saga enters and after your draw step, add a lore counter.)\nI — Create a 2/2 red Goblin Shaman creature token with "Whenever this token attacks, create a Treasure token."\nII — You may discard up to two cards. If you do, draw that many cards.\nIII — Exile this Saga, then return it to the battlefield transformed under your control.');
  assert.equal(of.faces[1].oracle_text, "{1}, {T}: Create a token that's a copy of another target nonlegendary creature you control, except it has haste. Sacrifice it at the beginning of the next end step.");
  assert.ok(S.SCRIPTS[FA]); assert.equal(S.validateScript(S.SCRIPTS[FA]).length, 0);
  const carta = { name: FA, type_line: of.type_line, mana_cost: of.mana_cost, cmc: 3, keywords: of.keywords, oracle_text: of.oracle_text, colors: ['R'], layout: 'transform', faces: of.faces };
  assert.equal(S.coverage(carta).level, 'completo');
  assert.equal(S.coverage({ ...carta, name: `${FA} // ${RK}` }).level, 'completo');
});

test('M-632 · validador: descarta_ate_compra_m pede a quantidade', () => {
  const base = { name: 'Teste', example: { target: 'none', expect: { selfLife: 0 } } };
  assert.ok(S.validateScript({ ...base, effects: [{ do: 'descarta_ate_compra_m' }] }).length, 'sem amount');
  assert.equal(S.validateScript({ ...base, effects: [{ do: 'descarta_ate_compra_m', amount: 2 }] }).length, 0);
});

// ── partidas ──
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: [...mana_cost.matchAll(/\{([^}]+)\}/g)].reduce((n, [, x]) => n + (/^\d+$/.test(x) ? +x : 1), 0), keywords: [], oracle_text: '', colors: [], ...extra });
const C = {
  [FA]: { name: FA, type_line: of.type_line, mana_cost: of.mana_cost, cmc: 3, keywords: of.keywords, oracle_text: of.oracle_text, colors: ['R'], layout: 'transform', faces: of.faces },
  Mountain: c0('Mountain', 'Basic Land — Mountain', '', { oracle_text: '({T}: Add {R}.)' }),
  Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2', colors: ['G'] }),
  Rei: c0('Rei', 'Legendary Creature — Human', '{1}{W}', { power: '3', toughness: '3', colors: ['W'] }),
  Arauto: c0('Arauto', 'Creature — Human', '{1}{W}', { power: '1', toughness: '1', colors: ['W'], oracle_text: 'When this creature enters, you gain 2 life.' }),
};
const ex = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCR = { Urso: { name: 'Urso', ...ex }, Rei: { name: 'Rei', ...ex },
  Arauto: { name: 'Arauto', abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'gain', amount: 2 }] }], example: { action: 'etb', target: 'none', expect: { selfLife: 2 } } } };
const act = (s, a) => { const r = E.apply(s, a); if (r.error) throw new Error(JSON.stringify(r.error)); return r.state; };
function passaAte(s, fim, max = 400) {
  for (let i = 0; i < max && !fim(s); i++) { const pd = s.pending;
    if (pd && pd.kind === 'discard' && pd.reason !== 'effect') s = act(s, { t: 'discard', p: pd.p, oid: s.zones[pd.p].hand[0] });
    else if (pd && pd.kind === 'attackers') s = act(s, { t: 'attack', p: pd.p, attackers: [] });
    else if (pd && pd.kind === 'blockers') s = act(s, { t: 'block', p: pd.p, blocks: [] });
    else if (pd) return s; else s = act(s, { t: 'pass', p: s.turn.priority }); }
  return s;
}
function poe(s, p, name, zone = 'battlefield') {
  s = J(s);
  const from = ['library', 'hand', 'graveyard'].map(z => s.zones[p][z]).find(z => z.some(o => s.objects[o].name === name));
  if (!from) throw new Error(name + ' ausente');
  const oid = from.find(o => s.objects[o].name === name); from.splice(from.indexOf(oid), 1); s.zones[p][zone].push(oid);
  Object.assign(s.objects[oid], { zone, sick: false, tapped: false, controller: p });
  return [s, oid];
}
const terras = (s, p, n) => { let o; for (let i = 0; i < n; i++) [s, o] = poe(s, p, 'Mountain'); return s; };
const limpaMao = (s, p) => { s = J(s); for (const oid of s.zones[p].hand.slice()) { s.zones[p].hand.splice(s.zones[p].hand.indexOf(oid), 1); s.zones[p].library.unshift(oid); s.objects[oid].zone = 'library'; } return s; };
function mesa(seed = 632) {
  const d = ns => ns.map(name => ({ name, qty: 8, zone: 'main' }));
  const todos = [FA, 'Mountain', 'Urso', 'Rei', 'Arauto'];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCR, first: 0, players: [{ name: 'A', deck: d(todos) }, { name: 'B', deck: d(todos) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  return limpaMao(limpaMao(s, 0), 1);
}
const deA = (s, nome) => s.zones[0].battlefield.filter(o => s.objects[o].name === nome);
const resolveTudo = s => { for (let i = 0; i < 80 && (s.stack.length || (s.queued || []).length) && !s.pending; i++) s = act(s, { t: 'pass', p: s.turn.priority }); return s; };
/** Conjura a Fable (capítulo I resolvido). */
function comFable(s) {
  let fa; [s, fa] = poe(s, 0, FA, 'hand'); s = terras(s, 0, 3);
  const c = E.legalActions(s, 0).find(a => a.t === 'cast' && a.oid === fa); assert.ok(c, 'Fable conjurável');
  s = resolveTudo(act(s, c)); return [s, fa];
}
const escolha = x => !!(x.pending && !['attackers', 'blockers'].includes(x.pending.kind) && !(x.pending.kind === 'discard' && x.pending.reason !== 'effect'));
const proximoMain1 = (s, p) => { const n = s.turn.number; return passaAte(s, x => (x.turn.number > n && x.turn.active === p && x.turn.step === 'main1' && !x.stack.length && !(x.queued || []).length) || escolha(x)); };
/** Responde a escolha do capítulo II sem descartar (quando o teste não é sobre ela) e segue até o main1. */
const semDescarte = (s, p) => { for (let i = 0; i < 4 && s.pending && s.pending.kind === 'pick'; i++) s = passaAte(act(s, { t: 'pick_done', p: s.pending.p }), x => (x.turn.active === p && x.turn.step === 'main1' && !x.stack.length && !(x.queued || []).length) || escolha(x)); return s; };

test('M-632 · capítulo I: ficha Goblin Shaman 2/2 vermelha; ao atacar, cria um Tesouro', () => {
  let s = mesa(), fa; [s, fa] = comFable(s);
  assert.equal(s.objects[fa].counters.lore, 1);
  const gob = deA(s, 'Goblin Shaman'); assert.equal(gob.length, 1, 'uma ficha');
  const g = s.objects[gob[0]]; assert.ok(g.token); assert.deepEqual(J(E.coresDe(s, g)), ['R'], 'vermelha');
  assert.deepEqual(J(E.tiposDe(s, g)), ['creature']); const st = E.stats(s, g); assert.deepEqual([st.power, st.toughness], [2, 2]);
  assert.ok(E.linhaDeTipo(s, g).includes('Goblin Shaman'), 'subtipos Goblin e Shaman');
  s = semDescarte(proximoMain1(s, 0), 0); s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0);
  s = act(s, { t: 'attack', p: 0, attackers: gob }); s = resolveTudo(s);
  assert.equal(deA(s, 'Treasure').length, 1, 'Tesouro ao atacar');
});

test('M-632 · capítulo II: descarta até duas (escolha de 0 a 2) e compra o mesmo tanto; zero não compra', () => {
  let s = mesa(), fa; [s, fa] = comFable(s);
  for (const n of ['Urso', 'Rei', 'Arauto']) [s] = poe(s, 0, n, 'hand');
  s = proximoMain1(s, 0);
  assert.equal(s.objects[fa].counters.lore, 2); assert.equal(s.pending && s.pending.kind, 'pick', 'a escolha do capítulo II');
  assert.equal(s.pending.min, 0); assert.equal(s.pending.max, 2);
  const mao0 = s.zones[0].hand.slice(), cem0 = s.zones[0].graveyard.length;
  // zero: nada muda
  let z = act(s, { t: 'pick_done', p: 0 }); assert.deepEqual(z.zones[0].hand, mao0, 'recusar não descarta nem compra');
  // duas: as duas vão ao cemitério e compra duas
  const [a, b] = mao0.filter(o => ['Urso', 'Rei'].includes(s.objects[o].name));
  s = act(s, { t: 'pick', p: 0, oid: a }); if (s.pending && s.pending.kind === 'pick') s = act(s, { t: 'pick', p: 0, oid: b }); if (s.pending && s.pending.kind === 'pick') s = act(s, { t: 'pick_done', p: 0 });
  assert.equal(s.objects[a].zone, 'graveyard'); assert.equal(s.objects[b].zone, 'graveyard');
  assert.equal(s.zones[0].graveyard.length, cem0 + 2); assert.equal(s.zones[0].hand.length, mao0.length, 'comprou duas');
  // uma só: compra uma
  let u = mesa(633), fu; [u, fu] = comFable(u); [u] = poe(u, 0, 'Urso', 'hand'); [u] = poe(u, 0, 'Rei', 'hand'); u = proximoMain1(u, 0);
  const m1 = u.zones[0].hand.length, so = u.zones[0].hand.find(o => u.objects[o].name === 'Urso');
  u = act(u, { t: 'pick', p: 0, oid: so }); u = act(u, { t: 'pick_done', p: 0 });
  assert.equal(u.objects[so].zone, 'graveyard'); assert.equal(u.zones[0].hand.length, m1, 'descartou uma, comprou uma');
});

/** Leva a Fable ao capítulo III (volta como Reflection of Kiki-Jiki) no terceiro turno de A. */
function comReflexo(s) {
  let fa; [s, fa] = comFable(s); s = limpaMao(s, 0); s = semDescarte(proximoMain1(s, 0), 0);
  s = semDescarte(proximoMain1(s, 0), 0);
  return [s, fa];
}

test('M-632 · capítulo III: exila e volta transformada em Reflection of Kiki-Jiki (encantamento criatura Goblin Shaman 2/2 vermelha), com enjoo', () => {
  let s = mesa(), fa; [s, fa] = comReflexo(s);
  const r = s.objects[fa]; assert.equal(r.name, RK); assert.equal(r.zone, 'battlefield'); assert.equal(r.controller, 0);
  assert.deepEqual(J(E.tiposDe(s, r)).sort(), ['creature', 'enchantment']); const st = E.stats(s, r); assert.deepEqual([st.power, st.toughness], [2, 2]);
  assert.ok(E.linhaDeTipo(s, r).includes('Goblin Shaman'));
  let urso; [s, urso] = poe(s, 0, 'Urso'); s = terras(s, 0, 1);
  assert.ok(!E.legalActions(s, 0).some(a => a.t === 'activate' && a.oid === fa), 'objeto novo (400.7): {T} preso pelo enjoo no turno em que voltou');
});

test('M-632 · Reflection: copia outra criatura não lendária sua, com ímpeto; a ficha é sacrificada no início do próximo passo final', () => {
  let s = mesa(), fa; [s, fa] = comReflexo(s);
  let urso, rei, deles; [s, urso] = poe(s, 0, 'Urso'); [s, rei] = poe(s, 0, 'Rei'); [s, deles] = poe(s, 1, 'Urso');
  s = proximoMain1(s, 1); s = semDescarte(proximoMain1(s, 0), 0); s = terras(s, 0, 2);
  const ofertas = E.legalActions(s, 0).filter(a => a.t === 'activate' && a.oid === fa);
  const alvos = ofertas.flatMap(a => (a.targets || []).map(t => t.oid));
  assert.ok(alvos.includes(urso), 'o Urso dele serve'); assert.ok(!alvos.includes(rei), 'lendária não'); assert.ok(!alvos.includes(fa), 'a si mesma não ("another")');
  assert.ok(!alvos.includes(deles), 'criatura do oponente não'); assert.ok(alvos.includes(deA(s, 'Goblin Shaman')[0]), 'a ficha Goblin serve');
  s = resolveTudo(act(s, ofertas.find(a => a.targets[0].oid === urso)));
  const copia = deA(s, 'Urso').find(o => o !== urso); assert.ok(copia, 'ficha cópia do Urso');
  assert.ok(s.objects[copia].token); assert.ok(E.hasKeyword(s, s.objects[copia], 'haste'), 'except it has haste');
  assert.ok(s.objects[fa].tapped, '{T} pago');
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0);
  s = act(s, { t: 'attack', p: 0, attackers: [copia] }); const v = s.players[1].life;
  s = passaAte(s, x => x.turn.step === 'main2' && !x.stack.length && !x.pending); assert.equal(v - s.players[1].life, 2, 'atacou no turno em que nasceu');
  assert.equal(s.objects[copia].zone, 'battlefield', 'ainda no campo antes do passo final');
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'upkeep');
  assert.ok(!s.objects[copia] || s.objects[copia].zone !== 'battlefield', 'sacrificada no início do passo final');
  assert.equal(s.objects[urso].zone, 'battlefield', 'o original fica');
});

test('M-632 · Reflection copia a ficha Goblin Shaman com a habilidade dela; a cópia que entra dispara o "ao entrar" do original', () => {
  let s = mesa(), fa; [s, fa] = comReflexo(s);
  let arauto; [s, arauto] = poe(s, 0, 'Arauto');
  s = proximoMain1(s, 1); s = semDescarte(proximoMain1(s, 0), 0); s = terras(s, 0, 2);
  const gob = deA(s, 'Goblin Shaman')[0];
  s = resolveTudo(act(s, E.legalActions(s, 0).find(a => a.t === 'activate' && a.oid === fa && a.targets[0].oid === gob)));
  const copia = deA(s, 'Goblin Shaman').find(o => o !== gob); assert.ok(copia);
  const st = E.stats(s, s.objects[copia]); assert.deepEqual([st.power, st.toughness], [2, 2]);
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0);
  const tes = deA(s, 'Treasure').length; s = resolveTudo(act(s, { t: 'attack', p: 0, attackers: [copia] }));
  assert.equal(deA(s, 'Treasure').length, tes + 1, 'a cópia da ficha tem "Whenever this token attacks, create a Treasure token."');
  // ruling: os gatilhos de "ao entrar" do original disparam para a cópia
  let t = mesa(634), fb; [t, fb] = comReflexo(t); let ar; [t, ar] = poe(t, 0, 'Arauto');
  t = proximoMain1(t, 1); t = proximoMain1(t, 0); t = terras(t, 0, 2); const vida = t.players[0].life;
  t = resolveTudo(act(t, E.legalActions(t, 0).find(a => a.t === 'activate' && a.oid === fb && a.targets[0].oid === ar)));
  assert.equal(t.players[0].life, vida + 2, 'a cópia do Arauto ganhou 2 ao entrar');
});

test('M-632 · ativada no turno do oponente, a ficha é sacrificada no passo final desse turno; a pilha explica o efeito', () => {
  let s = mesa(), fa; [s, fa] = comReflexo(s);
  let urso; [s, urso] = poe(s, 0, 'Urso'); s = terras(s, 0, 1);
  // no turno seguinte do oponente ainda há enjoo (302.6: não a controla desde o começo do seu turno mais recente); no outro, não
  s = proximoMain1(s, 1); for (let i = 0; i < 6 && s.turn.priority !== 0; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.ok(!E.legalActions(s, 0).some(a => a.t === 'activate' && a.oid === fa), 'enjoo no turno seguinte do oponente');
  s = semDescarte(proximoMain1(s, 0), 0); s = proximoMain1(s, 1);
  // passa a prioridade até A recebê-la no turno de B
  for (let i = 0; i < 6 && s.turn.priority !== 0; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const at = E.legalActions(s, 0).find(a => a.t === 'activate' && a.oid === fa && a.targets && a.targets[0].oid === urso);
  assert.ok(at, 'ativável em velocidade de instantânea, no turno do oponente');
  s = resolveTudo(act(s, at)); const copia = deA(s, 'Urso').find(o => o !== urso); assert.ok(copia);
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'upkeep');
  assert.ok(!s.objects[copia] || s.objects[copia].zone !== 'battlefield', 'sacrificada no passo final do turno de B');
  assert.match(T.descreveEfeitos(S.SCRIPTS[FA].back.abilities[0].effects), /cópia .*ímpeto.*sacrifica a ficha no início do próximo passo final/);
  assert.match(T.descreveEfeitos(S.SCRIPTS[FA].abilities[1].effects), /pode descartar até 2 cartas e comprar o mesmo tanto/);
});
