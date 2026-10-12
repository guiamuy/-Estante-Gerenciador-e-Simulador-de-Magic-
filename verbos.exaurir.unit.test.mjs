// V-20 · CR 502.3 ("doesn't untap during its controller's next untap step") e CR 701.43 · exaurir. Texto oficial em
// .listas/oficiais-verbos.json (Oracle do Forge, 11/10/2026): Crippling Chill — "Tap target creature. It doesn't untap during its
// controller's next untap step. Draw a card." · Frost Breath — "Tap up to two target creatures. Those creatures don't untap during their
// controller's next untap step." · Hooded Brawler — "You may exert Hooded Brawler as it attacks. When you do, it gets +2/+2 until end of turn."
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { E, J, act, poe, legais, mesa, comMana, tudo, criatura, conjura } from './verbos.mjs';
const { scripts: S, table: T } = loadModules();
const URSO = criatura('Urso de Teste 3/3', 3, 3), LOBO = criatura('Lobo de Teste 2/2', 2, 2);
const BRAWLER = { name: 'Hooded Brawler', self: { exaurirAoAtacar: true }, abilities: [{ kind: 'triggered', when: 'exerted', effects: [{ do: 'continuo', target: 'self-source', poder: 2, resistencia: 2, ate: 'fim-do-turno' }] }],
  example: { action: 'etb', target: 'none', expect: { attached: false } } };
const resolve = s => tudo(s, x => legais(x, x.pending.p)[0]);
const fonte = (p = 0) => ({ oid: 'h', name: URSO, controller: p, ability: true, source: null });
const faz = (s, eff, oid, p = 0) => { s = J(s); const ev = []; E.applyEffect(s, fonte(p), eff, oid == null ? null : { oid }, ev); return [s, ev]; };
/** Anda até o passo de desvirar do jogador `p` ter passado (começo da manutenção dele), respondendo o padrão a tudo. */
const ateOTurnoDe = (s, p) => { const n0 = s.turn.number; for (let i = 0; i < 400 && !(s.turn.active === p && s.turn.number > n0); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority }); assert.ok(s.turn.active === p && s.turn.number > n0, 'chegou ao turno pedido'); return s; };

test('CR 502.3 · "não desvira no próximo passo de desvirar de quem a controla": fica virada nesse passo e desvira no seguinte', () => {
  let s = mesa([URSO], [LOBO]), lobo, urso; [s, lobo] = poe(s, 1, LOBO); [s, urso] = poe(s, 0, URSO);
  [s] = faz(s, { do: 'nao_desvira', vira: true, target: 'creature' }, lobo); s.objects[urso].tapped = true;
  assert.equal(s.objects[lobo].tapped, true); assert.equal(E.estaPresaNoDesvirar(s, s.objects[lobo]), true); assert.equal(E.estaExaurida(s, s.objects[lobo]), false);
  s = ateOTurnoDe(s, 1);
  assert.equal(s.objects[lobo].tapped, true, 'não desvirou no passo dele'); assert.equal(E.estaPresaNoDesvirar(s, s.objects[lobo]), false, 'a marca foi gasta');
  s = ateOTurnoDe(s, 0); assert.equal(s.objects[urso].tapped, false, 'as outras permanentes desviram normalmente');
  s = ateOTurnoDe(s, 1); assert.equal(s.objects[lobo].tapped, false, 'no passo seguinte, desvira'); assert.equal(s.objects[lobo].presaV, undefined);
});

test('CR 502.3 · a marca é da permanente: fora do campo acaba (de volta, é objeto novo); o passo de desvirar do outro jogador não a gasta', () => {
  let s = mesa([URSO], [LOBO]), lobo; [s, lobo] = poe(s, 1, LOBO);
  if (s.turn.active !== 0) s = ateOTurnoDe(s, 0);
  [s] = faz(s, { do: 'nao_desvira', vira: true, target: 'creature' }, lobo);
  let x = ateOTurnoDe(ateOTurnoDe(s, 1), 0); // um passo de desvirar do dono já passou: gasta
  assert.equal(E.estaPresaNoDesvirar(x, x.objects[lobo]), false);
  let y; [y] = faz(s, { do: 'bounce', target: 'creature' }, lobo); y = J(y); E.moveObject(y, lobo, 'battlefield');
  assert.equal(E.estaPresaNoDesvirar(y, y.objects[lobo]), false);
});

test('CR 701.43 · exaurir (a, b, c): não desvira no próximo passo de desvirar de QUEM EXAURIU; pode exaurir desvirada e duas vezes — tudo acaba no mesmo passo; fora do campo não se exaure', () => {
  let s = mesa([URSO, LOBO], []), urso, lobo, ev; [s, urso] = poe(s, 0, URSO); [s, lobo] = poe(s, 0, LOBO, 'graveyard');
  if (s.turn.active !== 0) s = ateOTurnoDe(s, 0);
  [s] = faz(s, { do: 'exert', target: 'creature-you-control' }, urso); [s] = faz(s, { do: 'exert', target: 'creature-you-control' }, urso);
  assert.equal(s.objects[urso].tapped, false, 'exaurir não vira'); assert.equal(E.estaExaurida(s, s.objects[urso]), true); assert.equal(s.objects[urso].presaV.length, 2);
  [s, ev] = faz(s, { do: 'exert', target: 'creature-you-control' }, lobo); assert.ok(ev.some(e => e.failed), 'carta no cemitério não é exaurida'); assert.equal(s.objects[lobo].presaV, undefined);
  s = J(s); s.objects[urso].tapped = true;
  s = ateOTurnoDe(s, 0); assert.equal(s.objects[urso].tapped, true); assert.equal(E.estaExaurida(s, s.objects[urso]), false, 'as duas marcas acabaram no mesmo passo (b)');
  s = ateOTurnoDe(s, 0); assert.equal(s.objects[urso].tapped, false);
});

test('CR 701.43 · exaurir (a): se a exaurida está com outro jogador, ela desvira no passo dele — a marca era do passo de quem exauriu', () => {
  let s = mesa([URSO], []), urso; [s, urso] = poe(s, 0, URSO); if (s.turn.active !== 0) s = ateOTurnoDe(s, 0);
  [s] = faz(s, { do: 'exert', target: 'creature-you-control' }, urso); s = J(s);
  s.objects[urso].controller = 1; s.zones[0].battlefield = s.zones[0].battlefield.filter(x => x !== urso); s.zones[1].battlefield.push(urso); s.objects[urso].tapped = true;
  s = ateOTurnoDe(s, 1); assert.equal(s.objects[urso].tapped, false, 'desvira no passo do novo controlador');
});

test('CR 701.43 · "You may exert ~ as it attacks. When you do…" (d): a pergunta vem ao declarar o ataque, antes da prioridade; "sim" exaure e põe o gatilho na pilha; "não" não faz nada', () => {
  assert.equal(S.validateScript(BRAWLER).join(), '');
  const monta = () => { let s = mesa(['Hooded Brawler', URSO], [LOBO]), b; [s, b] = poe(s, 0, 'Hooded Brawler'); s = J(s); s.facts['Hooded Brawler'] = { ...s.facts['Hooded Brawler'], script: { ...BRAWLER, effects: [] } }; s.objects[b].sick = false;
    if (s.turn.active !== 0) s = ateOTurnoDe(s, 0);
    for (let i = 0; i < 30 && !(s.pending && s.pending.kind === 'attackers'); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
    assert.equal(s.pending && s.pending.kind, 'attackers'); return [act(s, legais(s, 0, a => a.t === 'attack' && (a.attackers || a.oids || []).includes(b))[0] || { t: 'attack', p: 0, attackers: [b] }), b]; };
  let [s, b] = monta();
  assert.equal(s.pending && s.pending.kind, 'may_pay', 'a pergunta de exaurir'); assert.equal(s.pending.p, 0); assert.equal(s.stack.length, 0, 'ninguém recebeu prioridade ainda');
  let sim = act(s, legais(s, 0, a => a.t === 'pay')[0]);
  assert.equal(E.estaExaurida(sim, sim.objects[b]), true); assert.equal(sim.pending, null);
  assert.ok(sim.stack.some(oid => sim.objects[oid].ability && sim.objects[oid].source === b), '"when you do" é gatilho na pilha');
  sim = act(act(sim, { t: 'pass', p: sim.turn.priority }), { t: 'pass', p: 1 - 0 });
  assert.deepEqual({ ...E.stats(sim, sim.objects[b]) }, { power: 5, toughness: 4 }, '+2/+2 até o fim do turno');
  const nao = act(s, legais(s, 0, a => a.t === 'decline')[0]);
  assert.equal(E.estaExaurida(nao, nao.objects[b]), false); assert.equal(nao.stack.length, 0); assert.equal(nao.pending, null); assert.ok(nao.objects[b].attacking != null, 'continua atacando');
  // exaurida ao atacar: virada pelo ataque, não desvira no próximo passo de desvirar de quem atacou
  let d = ateOTurnoDe(sim, 0); assert.equal(d.objects[b].tapped, true); d = ateOTurnoDe(d, 0); assert.equal(d.objects[b].tapped, false);
});

test('Crippling Chill e Frost Breath: os scripts, até dois alvos, e as frases em português', () => {
  let s = mesa(['Frost Breath', 'Crippling Chill'], [LOBO, URSO]), fb, lobo, urso; [s, lobo] = poe(s, 1, LOBO); [s, urso] = poe(s, 1, URSO); [s, fb] = poe(s, 0, 'Frost Breath', 'hand');
  const n = legais(comMana(s, 'UUU'), 0, a => a.t === 'cast' && a.oid === fb).map(a => (a.targets || []).length);
  assert.ok(n.includes(0) && n.includes(1) && n.includes(2), 'até dois alvos: ' + [...new Set(n)]);
  s = resolve(conjura(comMana(s, 'UUU'), 0, fb, [lobo, urso]));
  for (const o of [lobo, urso]) { assert.equal(s.objects[o].tapped, true); assert.equal(E.estaPresaNoDesvirar(s, s.objects[o]), true); }
  assert.equal(T.descreveEfeitos(S.SCRIPTS['Crippling Chill'].effects), 'vira uma criatura; ela não desvira no próximo passo de desvirar de quem a controla; compra 1 carta');
  assert.equal(S.descreveGatilho('exerted'), 'quando é exaurida');
});
