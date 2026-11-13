// M-625 · rotina Motor contínuo · Bloodghast pelo leitor (campanha Modern, ordem gulosa: depois da M-624, a única pendência de 2 listas
// Modern). Regras: 113.6m + 603.6 — "Landfall — Whenever a land you control enters, you may return this card from your graveyard to the
// battlefield": a habilidade funciona com a carta no cemitério do dono (e só lá), dispara pela entrada de um terreno que ele controla, e
// a volta confere a encarnação da carta no cemitério (400.7). 611.3a/611.2b — "This creature has haste as long as an opponent has 10 or
// less life": vale enquanto for verdade, conferido a cada momento. "Can't block" o motor já lia. Texto da API da Scryfall pela coleta de
// 12/11/2026 13h50 UTC (cobertura/modern.json do ramo catalogo), guardado em .listas/oficiais-revisadas.json. Todos os testes de partida
// falham no motor anterior (a carta não era lida e jogava sem script). "Ilha", "Pantano", "Exila" e "Urso" são cartas de teste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';

const M = loadModules(), E = M.engine, S = M.scripts, SF = M.scryfall;
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const BG = 'Bloodghast';
const TEXTO = "This creature can't block.\nThis creature has haste as long as an opponent has 10 or less life.\nLandfall — Whenever a land you control enters, you may return this card from your graveyard to the battlefield.";
const oficial = () => { const o = OF.find(x => x.name === BG); assert.ok(o, `${BG} em .listas/oficiais-revisadas.json`);
  return SF.normalizeCard({ object: 'card', layout: 'normal', ...o, cmc: 2, colors: ['B'] }); };
const J = x => JSON.parse(JSON.stringify(x));
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);

test('M-625 · Bloodghast joga no app: texto da Scryfall de 12/11 guardado, assinatura de APROVADAS igual e cobertura completa', () => {
  const c = oficial(), o = OF.find(x => x.name === BG);
  assert.match(o.fonte, /api\.scryfall\.com/); assert.equal(o.consulta, '2026-11-12'); assert.equal(o.oracle_text, TEXTO);
  assert.ok(S.APROVADAS[BG], 'em APROVADAS'); assert.equal(S.APROVADAS[BG].leva, 'M-625');
  assert.equal(S.APROVADAS[BG].texto, S.assinaturaRevisao(c), 'a assinatura é a do texto revisado');
  assert.equal(S.coverage(c, S.SCRIPTS, BG).level, 'completo'); assert.ok(S.scriptLido(c), 'joga pelo script lido');
  const sc = S.leitura(c).script;
  eq(sc.self, { naoBloqueia: true });
  eq(sc.continuo, [{ afetados: 'self', palavras: ['haste'], se: { oponenteVidaAte: 10 } }], '611.3a: ímpeto enquanto um oponente tiver 10 ou menos');
  eq(sc.abilities, [{ kind: 'triggered', when: 'other-etb', filter: { types: ['land'] }, optional: true, fromGraveyard: true, effects: [{ do: 'reanimate', target: 'self-source' }] }], '113.6m: o gatilho do cemitério devolve a própria carta');
});

test('M-625 · o leitor não estende a volta a outro texto: "a land enters" (de qualquer um), o terreno do oponente e "or more" seguem fora', () => {
  const le = t => M.leitor.ler(SF.normalizeCard({ object: 'card', name: 'Teste', type_line: 'Creature — Spirit', mana_cost: '{B}', cmc: 1, power: '1', toughness: '1', oracle_text: t, keywords: [] }));
  assert.equal(le('Whenever a land enters, you may return this card from your graveyard to the battlefield.').completa, false);
  assert.equal(le('Whenever a creature an opponent controls enters, return this card from your graveyard to the battlefield.').completa, false);
  assert.equal(le('This creature has haste as long as an opponent has 10 or more life.').completa, false, '"or more" não é a mesma condição');
  const r = le('This creature has haste and menace as long as an opponent has 5 or less life.');
  eq(r.script.continuo, [{ afetados: 'self', palavras: ['haste', 'menace'], se: { oponenteVidaAte: 5 } }]);
});

// ── partidas pelo caminho do app (Bloodghast sem script à mão: joga pelo script lido) ──
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: [...mana_cost.matchAll(/\{([^}]+)\}/g)].length, keywords: [], oracle_text: '', colors: [], ...extra });
const C = {
  [BG]: oficial(),
  Pantano: c0('Pantano', 'Basic Land — Swamp', '', { oracle_text: '({T}: Add {B}.)' }),
  Ilha: c0('Ilha', 'Basic Land — Island', '', { oracle_text: '({T}: Add {U}.)' }),
  Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2', colors: ['G'] }),
  Exila: c0('Exila', 'Instant', '{B}'),
};
const SCRIPTS = { Exila: { name: 'Exila', effects: [{ do: 'mover', target: { zona: 'graveyard' }, para: 'exile' }], example: { target: 'none', expect: { selfLife: 0 } } } };
const act = (s, a) => { const r = E.apply(s, a); if (r.error) throw new Error(JSON.stringify(r.error)); return r.state; };
const legais = (s, p, f = () => true) => E.legalActions(s, p).filter(f);
function passaAte(s, fim, max = 400) {
  for (let i = 0; i < max && !fim(s); i++) { const pd = s.pending;
    if (pd && pd.kind === 'discard' && pd.reason !== 'effect') s = act(s, { t: 'discard', p: pd.p, oid: s.zones[pd.p].hand[0] });
    else if (pd && pd.kind === 'attackers') s = act(s, { t: 'attack', p: pd.p, attackers: [] });
    else if (pd && pd.kind === 'blockers') s = act(s, { t: 'block', p: pd.p, blocks: [] });
    else if (pd) return s; else s = act(s, { t: 'pass', p: s.turn.priority }); }
  return s;
}
function poe(s, p, name, zone = 'battlefield') {
  s = J(s); const oid = s.zones[p].library.find(o => s.objects[o].name === name); assert.ok(oid, `${name} no grimório de ${p}`);
  s.zones[p].library = s.zones[p].library.filter(o => o !== oid); s.zones[p][zone].push(oid);
  Object.assign(s.objects[oid], { zone, controller: p, tapped: false });
  if (zone === 'battlefield') s.objects[oid].sick = false;
  return [s, oid];
}
function mesa(seed = 3) {
  const deck = [{ name: BG, qty: 4, zone: 'main' }, { name: 'Urso', qty: 4, zone: 'main' }, { name: 'Exila', qty: 4, zone: 'main' }, { name: 'Ilha', qty: 4, zone: 'main' }, { name: 'Pantano', qty: 24, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
/** Joga o terreno da mão de quem tem a vez e para no "you may" do gatilho (ou com a pilha vazia). */
const terreno = (s, p = 0, nome = 'Pantano') => { let t; [s, t] = poe(s, p, nome, 'hand'); s = act(s, { t: 'play_land', p, oid: t }); return [passaAte(s, x => !!x.pending || !x.stack.length), t]; };
const decide = (s, sim) => passaAte(act(s, { t: sim ? 'pay' : 'decline', p: s.pending.p }), x => !x.stack.length || !!x.pending);

test('CR 113.6m / 603.6 · Bloodghast no cemitério: você joga um terreno — pode devolvê-lo ao campo, sob seu controle', () => {
  let s = mesa(); let b; [s, b] = poe(s, 0, BG, 'graveyard');
  [s] = terreno(s);
  assert.equal(s.pending && s.pending.kind, 'may_pay', 'o "you may" pergunta'); assert.equal(s.pending.p, 0);
  s = decide(s, true);
  eq([s.objects[b].zone, s.objects[b].controller, s.stack.length], ['battlefield', 0, 0]);
});

test('CR 603.5 · Bloodghast: recusar deixa a carta no cemitério', () => {
  let s = mesa(); let b; [s, b] = poe(s, 0, BG, 'graveyard');
  [s] = terreno(s); s = decide(s, false);
  eq(s.objects[b].zone, 'graveyard');
});

test('CR 603.2 · Bloodghast: dois no cemitério, um terreno — os dois disparam e voltam', () => {
  let s = mesa(); let b1, b2; [s, b1] = poe(s, 0, BG, 'graveyard'); [s, b2] = poe(s, 0, BG, 'graveyard');
  [s] = terreno(s);
  assert.equal(s.pending && s.pending.kind, 'triggers', '603.3b: os dois gatilhos juntos, você escolhe a ordem'); s = act(s, legais(s, 0)[0]);
  s = passaAte(s, x => !!x.pending || !x.stack.length);
  s = decide(s, true); assert.equal(s.pending && s.pending.kind, 'may_pay', 'o segundo pergunta'); s = decide(s, true);
  eq([s.objects[b1].zone, s.objects[b2].zone], ['battlefield', 'battlefield']);
});

test('CR 603.2 · Bloodghast: "a land you control" — o terreno do oponente não dispara o seu; o dele dispara só o do cemitério dele', () => {
  let s = mesa(); let b0, b1; [s, b0] = poe(s, 0, BG, 'graveyard'); [s, b1] = poe(s, 1, BG, 'graveyard');
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  [s] = terreno(s, 1);
  assert.equal(s.pending && s.pending.p, 1, 'só o dono do terreno é perguntado'); s = decide(s, true);
  eq([s.objects[b0].zone, s.objects[b1].zone, s.objects[b1].controller, !!s.pending], ['graveyard', 'battlefield', 1, false]);
});

test('CR 113.6m · Bloodghast na mão ou no campo não dispara pela entrada de um terreno (só do cemitério)', () => {
  let s = mesa(); let m, c; [s, m] = poe(s, 0, BG, 'hand'); [s, c] = poe(s, 0, BG);
  [s] = terreno(s);
  eq([!!s.pending, s.stack.length, s.objects[m].zone, s.objects[c].zone], [false, 0, 'hand', 'battlefield']);
});

test('CR 400.7 · Bloodghast exilado do cemitério com o gatilho na pilha: nada volta', () => {
  let s = mesa(); let b; [s, b] = poe(s, 0, BG, 'graveyard');
  let t; [s, t] = poe(s, 0, 'Pantano', 'hand'); s = act(s, { t: 'play_land', p: 0, oid: t });
  assert.ok(s.stack.some(i => s.objects[i].ability && s.objects[i].source === b), 'o gatilho na pilha');
  let e; [s, e] = poe(s, 0, 'Exila', 'hand'); s = J(s); s.players[0].pool.B += 1;
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === e && (x.targets || []).some(y => y.oid === b))[0]);
  s = passaAte(s, x => !!x.pending || !x.stack.length);
  if (s.pending && s.pending.kind === 'may_pay') s = decide(s, true);
  eq([s.objects[b].zone, s.stack.length], ['exile', 0]);
});

test('CR 611.3a · Bloodghast tem ímpeto só enquanto um oponente tiver 10 ou menos de vida (conferido a cada momento)', () => {
  let s = mesa(); let b; [s, b] = poe(s, 0, BG); s = J(s); s.objects[b].sick = true;
  assert.equal(E.hasKeyword(s, s.objects[b], 'haste'), false, 'oponente com 20');
  s.players[1].life = 11; assert.equal(E.hasKeyword(s, s.objects[b], 'haste'), false, 'oponente com 11');
  s.players[1].life = 10; assert.equal(E.hasKeyword(s, s.objects[b], 'haste'), true, 'oponente com 10');
  s.players[0].life = 3; s.players[1].life = 12; assert.equal(E.hasKeyword(s, s.objects[b], 'haste'), false, 'a sua vida não conta: "an opponent"');
});

test('CR 302.6 + 611.3a · Bloodghast que voltou neste turno ataca se o oponente tem 10 ou menos; com 11 não ataca', () => {
  for (const [vida, ataca] of [[10, true], [11, false]]) {
    let s = mesa(); let b; [s, b] = poe(s, 0, BG, 'graveyard'); s = J(s); s.players[1].life = vida;
    [s] = terreno(s); s = decide(s, true); eq(s.objects[b].zone, 'battlefield');
    s = passaAte(s, x => !!x.pending && x.pending.kind === 'attackers' || x.turn.step === 'end', 60);
    const r = s.pending && s.pending.kind === 'attackers' ? E.apply(s, { t: 'attack', p: 0, attackers: [b] }) : { error: 'sem combate' };
    assert.equal(!r.error, ataca, `oponente com ${vida}: ${JSON.stringify(r.error)}`);
  }
});

test('CR 509.1a · Bloodghast não bloqueia: o Urso atacante passa e causa o dano', () => {
  let s = mesa(); let b; [s, b] = poe(s, 1, BG); let u; [s, u] = poe(s, 0, 'Urso');
  s = passaAte(s, x => !!x.pending && x.pending.kind === 'attackers', 60);
  s = act(s, { t: 'attack', p: 0, attackers: [u] });
  s = passaAte(s, x => (!!x.pending && x.pending.kind === 'blockers') || x.turn.step === 'main2', 60);
  if (s.pending && s.pending.kind === 'blockers') {
    assert.ok(E.apply(s, { t: 'block', p: 1, blocks: [{ blocker: b, attacker: u }] }).error, 'o bloqueio é recusado');
    s = passaAte(s, x => x.turn.step === 'main2', 60);
  }
  eq([s.players[1].life, s.objects[b].zone], [18, 'battlefield']);
});
