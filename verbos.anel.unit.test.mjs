// V-25 · CR 701.54 · o Anel tenta você. Texto oficial em .listas/oficiais-verbos.json (Oracle do Forge, clone de 12/10/2026):
// Claim the Precious — "Destroy target creature. The Ring tempts you." · Birthday Escape — "Draw a card. The Ring tempts you." ·
// Ranger's Firebrand — "deals 2 damage to any target. The Ring tempts you." · Took Reaper — "When Took Reaper dies, the Ring tempts
// you." · Nazgûl — "When Nazgûl enters, the Ring tempts you. Whenever the Ring tempts you, put a +1/+1 counter on each Wraith you
// control." (scripts das permanentes provados aqui)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { E, J, act, poe, legais, mesa, comMana, tudo, criatura, conjura } from './verbos.mjs';
const { scripts: S, table: T } = loadModules();
const URSO = criatura('Urso de Teste 3/3', 3, 3), LOBO = criatura('Lobo de Teste 2/2', 2, 2), RATO = criatura('Rato de Teste 1/1', 1, 1);
const ESPECTRO = criatura('Espectro de Teste 2/2', 2, 2, { subtipo: 'Wraith' });
const fonte = (p = 0) => ({ oid: 'h', name: URSO, controller: p, ability: true, source: null });
const faz = (s, eff, p = 0) => { s = J(s); const ev = []; E.applyEffect(s, fonte(p), eff, null, ev); return [s, ev]; };
const escolhe = (s, oid) => { s = act(s, legais(s, s.pending.p, a => a.t === 'pick' && a.oid === oid)[0]); if (s.pending && s.pending.kind === 'pick') s = act(s, legais(s, s.pending.p, a => a.t === 'pick_done')[0]); return s; };
const tenta = (s, oid, p = 0) => { let [x] = faz(s, { do: 'ring_tempts' }, p); if (x.pending && x.pending.kind === 'pick') x = escolhe(x, oid); return x; };
const portador = (s, p = 0) => { const o = E.portadorDoAnelV(s, p); return o ? o.oid : null; };
const emblemas = (s, p) => s.zones[p].command.filter(oid => s.objects[oid].name === 'The Ring');
const NAZGUL = { name: 'Nazgûl', abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'ring_tempts' }] },
  { kind: 'triggered', when: 'ring-tempts', effects: [{ do: 'counters', amount: 1, cada: { tipos: ['creature'], subtipos: ['Wraith'], de: 'you' } }] }], example: { action: 'etb', target: 'none', expect: { handDelta: 0 } } };
const TOOK = { name: 'Took Reaper', abilities: [{ kind: 'triggered', when: 'dies', effects: [{ do: 'ring_tempts' }] }], example: { action: 'etb', target: 'none', expect: { handDelta: 0 } } };
const comScript = (s, script) => { s = J(s); s.facts[script.name] = { ...s.facts[script.name], script }; return s; };
const resolveTudo = s => tudo(s, x => legais(x, x.pending.p)[0]);

test('CR 701.54a/c · o Anel tenta você: ganha o emblema O Anel na zona de comando antes de escolher; escolhe uma criatura SUA como Portador', () => {
  let s = mesa([URSO, LOBO], [URSO]), u, l, dele; [s, u] = poe(s, 0, URSO); [s, l] = poe(s, 0, LOBO); [s, dele] = poe(s, 1, URSO);
  let [x] = faz(s, { do: 'ring_tempts' });
  assert.equal(emblemas(x, 0).length, 1, '701.54c: o emblema vem antes da escolha'); assert.equal(E.vezesDoAnelV(x, 0), 0, 'ainda não completou');
  assert.equal(x.pending.kind, 'pick'); assert.equal(x.pending.p, 0); assert.deepEqual([...x.pending.from].sort(), [u, l].sort(), 'só criatura que ele controla'); assert.equal(x.pending.min, 1);
  x = escolhe(x, l);
  assert.equal(portador(x), l); assert.equal(E.vezesDoAnelV(x, 0), 1); assert.equal(x.pending, null); assert.equal(x.verbo, undefined); assert.equal(x.escolhaV, undefined);
  assert.equal(E.ehPortadorV(x, x.objects[u]), false); assert.equal(E.portadorDoAnelV(x, 1), null, 'o oponente não foi tentado');
  x = tenta(x, u); assert.equal(emblemas(x, 0).length, 1, 'um emblema só por jogador'); assert.equal(E.vezesDoAnelV(x, 0), 2);
  assert.equal(portador(x), u, 'outra criatura virou o Portador: a anterior deixa de ser'); assert.equal(E.ehPortadorV(x, x.objects[l]), false);
  assert.equal(E.invariants(x).length, 0);
});

test('CR 701.54a/d · com uma criatura só ela vira o Portador sem pergunta; sem nenhuma, o Anel tenta assim mesmo (a conta sobe)', () => {
  let s = mesa([RATO], []), r; let [x, ev] = faz(s, { do: 'ring_tempts' });
  assert.equal(x.pending, null); assert.equal(E.vezesDoAnelV(x, 0), 1); assert.equal(portador(x), null); assert.equal(ev.find(e => e.do === 'ring_tempts').amount, 1);
  [x, r] = poe(x, 0, RATO); [x] = faz(x, { do: 'ring_tempts' }); assert.equal(x.pending, null, 'uma criatura só: sem pergunta'); assert.equal(portador(x), r); assert.equal(E.vezesDoAnelV(x, 0), 2);
  x = tenta(x, r); assert.equal(portador(x), r, 'a mesma criatura de novo'); assert.equal(E.vezesDoAnelV(x, 0), 3);
});

test('CR 701.54a/e · o Portador deixa de ser ao sair do campo (volta como objeto novo) e quando outro jogador ganha o controle dele — mesmo que o controle volte', () => {
  let s = mesa([URSO], []), u; [s, u] = poe(s, 0, URSO); s = tenta(s, u); assert.equal(portador(s), u);
  let x = J(s); E.moveObject(x, u, 'hand'); E.moveObject(x, u, 'battlefield'); assert.equal(portador(x), null, '400.7: objeto novo');
  const muda = (y, para) => { y = J(y); E.applyEffect(y, fonte(para), { do: 'ganhar_controle', target: 'creature' }, { oid: u }, []); assert.equal(y.objects[u].controller, para); return y; };
  x = muda(s, 1); assert.equal(E.ehPortadorV(x, x.objects[u]), false, 'com o oponente não é o Portador de ninguém'); assert.equal(E.portadorDoAnelV(x, 1), null);
  x = muda(x, 0); assert.equal(portador(x), null, '701.54a: perdeu a designação quando outro jogador ganhou o controle');
});

test('CR 701.54c (1) · o Portador não pode ser bloqueado por criatura com poder maior; as outras atacantes seguem normais', () => {
  let s = mesa([LOBO, LOBO], [URSO, LOBO, RATO]), port, outro, ur, lo, ra;
  [s, port] = poe(s, 0, LOBO); [s, outro] = poe(s, 0, LOBO); [s, ur] = poe(s, 1, URSO); [s, lo] = poe(s, 1, LOBO); [s, ra] = poe(s, 1, RATO);
  assert.equal(E.canBlock(s, ur, port), true, 'antes do Anel o urso bloqueia');
  s = tenta(s, port);
  assert.equal(E.canBlock(s, ur, port), false, 'poder 3 contra o Portador de poder 2'); assert.equal(E.canBlock(s, lo, port), true, 'poder igual bloqueia'); assert.equal(E.canBlock(s, ra, port), true);
  assert.equal(E.canBlock(s, ur, outro), true, 'quem não é o Portador é bloqueado normalmente');
  let x = J(s); x.objects[port].counters.p1p1 = 1; assert.equal(E.canBlock(x, ur, port), true, 'o poder é conferido na hora: 3 contra 3');
});

test('CR 701.54c (1) · o Portador é lendário: conta para "lendária" e deixa de ser alvo de "nonlegendary"', () => {
  let s = mesa([URSO, LOBO], []), u, l; [s, u] = poe(s, 0, URSO); [s, l] = poe(s, 0, LOBO);
  const lendarias = x => [...E.legalTargets(x, 1, { tipos: ['creature'], lendaria: true }, null)].map(t => t.oid);
  const naoLendarias = x => [...E.legalTargets(x, 1, { tipos: ['creature'], lendaria: false }, null)].map(t => t.oid);
  assert.deepEqual(lendarias(s), []);
  s = tenta(s, l);
  assert.deepEqual(lendarias(s), [l]); assert.deepEqual(naoLendarias(s), [u]);
  assert.equal(E.targetAllowed(s, { do: 'destroy', target: 'creature', targetNotLegendary: true }, { oid: l }, { controller: 1 }), false);
  assert.equal(E.targetAllowed(s, { do: 'destroy', target: 'creature', targetNotLegendary: true }, { oid: u }, { controller: 1 }), true);
});

test('CR 701.54c (2) · com duas tentações ou mais, quando o Portador ataca o emblema dispara: compre uma carta e descarte uma; com uma tentação, não', () => {
  for (const vezes of [1, 2]) {
    let s = mesa([LOBO, URSO, URSO, URSO], [RATO]), port, outro; [s, port] = poe(s, 0, LOBO); [s, outro] = poe(s, 0, URSO); s = J(s); s.objects[port].sick = false; s.objects[outro].sick = false;
    for (let i = 0; i < vezes; i++) s = tenta(s, port);
    for (const quem of [[port], [outro]]) {
      let x = J(s); for (let i = 0; i < 80 && !(x.pending && x.pending.kind === 'attackers' && x.pending.p === 0); i++) x = x.pending ? act(x, legais(x, x.pending.p)[0]) : act(x, { t: 'pass', p: x.turn.priority });
      assert.equal(x.pending.kind, 'attackers');
      const mao = x.zones[0].hand.length;
      x = act(x, { t: 'attack', p: 0, attackers: quem });
      const doAnel = x.stack.map(oid => x.objects[oid]).filter(o => o.name === 'The Ring');
      assert.equal(doAnel.length, vezes >= 2 && quem[0] === port ? 1 : 0, `${vezes} tentação(ões), ${quem[0] === port ? 'o Portador' : 'outra'} atacando`);
      if (doAnel.length) {
        assert.equal(doAnel[0].controller, 0); assert.equal(x.objects[doAnel[0].source].zone, 'command', 'a fonte é o emblema');
        x = act(x, { t: 'pass', p: x.turn.priority }); x = act(x, { t: 'pass', p: x.turn.priority });
        assert.equal(x.pending.kind, 'discard'); assert.equal(x.pending.p, 0); assert.equal(x.zones[0].hand.length, mao + 1, 'comprou antes de descartar');
        x = act(x, legais(x, 0, a => a.t === 'discard')[0]); assert.equal(x.zones[0].hand.length, mao);
      }
      assert.equal(E.invariants(x).length, 0);
    }
  }
});

test('Gatilhos do Anel · "Whenever the Ring tempts you" (Nazgûl: um marcador +1/+1 em cada Espectro seu)', () => {
  for (const sc of [NAZGUL, TOOK]) assert.equal(S.validateScript(sc).join(), '', sc.name);
  let s = mesa(['Nazgûl', ESPECTRO], ['Nazgûl', ESPECTRO]), esp, dele, nz; [s, esp] = poe(s, 0, ESPECTRO); [s, dele] = poe(s, 1, ESPECTRO); s = comScript(s, NAZGUL);
  [s, nz] = poe(s, 0, 'Nazgûl', 'hand'); s = J(s);
  s = act(comMana(s, 'BBB'), legais(comMana(s, 'BBB'), 0, a => a.t === 'cast' && a.oid === nz)[0]);
  s = resolveTudo(s); for (let i = 0; i < 6 && s.stack.length; i++) s = resolveTudo(act(s, { t: 'pass', p: s.turn.priority }));
  assert.equal(E.vezesDoAnelV(s, 0), 1, 'o Nazgûl entrou e o Anel tentou');
  assert.equal(s.objects[esp].counters.p1p1, 1); assert.equal(s.objects[nz].counters.p1p1, 1, 'ele mesmo é Espectro'); assert.equal(s.objects[dele].counters.p1p1 || 0, 0, 'o do oponente não');
});

test('Took Reaper · morre e o Anel tenta quem o controlava (sem criatura: a conta sobe assim mesmo)', () => {
  let s = mesa(['Took Reaper'], []), tr; [s, tr] = poe(s, 0, 'Took Reaper'); s = comScript(s, TOOK);
  const src = { oid: 'h', name: URSO, controller: 1, ability: true, source: null }, ev = []; s = J(s);
  E.applyEffect(s, src, { do: 'destroy', target: 'creature' }, { oid: tr }, ev);
  assert.equal(s.objects[tr].zone, 'graveyard');
  s = act(s, { t: 'pass', p: s.turn.priority }); s = resolveTudo(s); for (let i = 0; i < 6 && s.stack.length; i++) s = resolveTudo(act(s, { t: 'pass', p: s.turn.priority }));
  assert.equal(E.vezesDoAnelV(s, 0), 1); assert.equal(E.vezesDoAnelV(s, 1), 0); assert.equal(emblemas(s, 0).length, 1);
});

test('Claim the Precious, Birthday Escape e Ranger\'s Firebrand: os scripts, a ordem (o efeito, depois o Anel) e a frase em português', () => {
  let s = mesa([LOBO, 'Claim the Precious', "Ranger's Firebrand"], [URSO]), l, ur, cp, rf; [s, l] = poe(s, 0, LOBO); [s, ur] = poe(s, 1, URSO);
  [s, cp] = poe(s, 0, 'Claim the Precious', 'hand'); [s, rf] = poe(s, 0, "Ranger's Firebrand", 'hand');
  let x = resolveTudo(conjura(comMana(s, 'BBB'), 0, cp, [ur]));
  assert.equal(x.objects[ur].zone, 'graveyard'); assert.equal(portador(x), l); assert.equal(E.vezesDoAnelV(x, 0), 1);
  x = resolveTudo(conjura(comMana(s, 'R'), 0, rf, [{ player: 1 }])); assert.equal(x.players[1].life, s.players[1].life - 2); assert.equal(E.vezesDoAnelV(x, 0), 1);
  assert.equal(S.validateScript({ name: 'X', effects: [{ do: 'ring_tempts' }, { do: 'destroy', target: 'creature' }], example: { target: 'enemy-creature', expect: { gone: true } } }).some(e => /ring_tempts/.test(e)), true, 'nada com alvo depois da escolha');
  assert.equal(T.descreveEfeitos([{ do: 'draw', amount: 1 }, { do: 'ring_tempts' }]).includes('o Anel tenta você'), true);
});

// V-26 · CR 701.54c (3) e (4) e Call of the Ring — "At the beginning of your upkeep, the Ring tempts you. Whenever you choose a creature as
// your Ring-bearer, you may pay 2 life. If you do, draw a card." (Oracle do Forge, clone de 12/10/2026; script provado aqui)
const MURALHA = criatura('Muralha de Teste 1/5', 1, 5), TARTARUGA = criatura('Tartaruga de Teste 1/4', 1, 4);
const CALL = { name: 'Call of the Ring', abilities: [{ kind: 'triggered', when: 'upkeep', effects: [{ do: 'ring_tempts' }] },
  { kind: 'triggered', when: 'ring-bearer-chosen', mayPay: { pagarVida: 2 }, effects: [{ do: 'draw', amount: 1 }] }], example: { action: 'etb', target: 'none', expect: { handDelta: 0 } } };
const ateAtacar = s => { for (let i = 0; i < 80 && !(s.pending && s.pending.kind === 'attackers' && s.pending.p === 0); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority }); assert.equal(s.pending.kind, 'attackers'); return s; };
const ateBloquear = s => { for (let i = 0; i < 40 && !(s.pending && s.pending.kind === 'blockers'); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority }); assert.equal(s.pending.kind, 'blockers'); return s; };
const ateFimDoCombate = s => { for (let i = 0; i < 80 && !(s.turn.step === 'main2' && !s.stack.length && !s.pending && !(s.queued || []).length); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority }); assert.equal(s.turn.step, 'main2'); return s; };
const montaCombate = (vezes, defensores) => {
  let s = mesa([MURALHA, URSO, URSO, URSO, URSO], defensores), port, d = []; [s, port] = poe(s, 0, MURALHA);
  for (const n of defensores) { let o; [s, o] = poe(s, 1, n); d.push(o); }
  s = J(s); s.objects[port].sick = false; for (let i = 0; i < vezes; i++) s = tenta(s, port); return [s, port, d];
};

test('CR 701.54c (3) · com três tentações, cada criatura que bloquear o Portador é sacrificada no fim do combate; com duas, não', () => {
  for (const vezes of [2, 3]) {
    let [s, port, [t1, t2]] = montaCombate(vezes, [TARTARUGA, TARTARUGA]);
    s = act(ateAtacar(s), { t: 'attack', p: 0, attackers: [port] }); s = ateBloquear(s);
    s = act(s, { t: 'block', p: 1, blocks: [[t1, port], [t2, port]] });
    const doAnel = () => s.stack.map(oid => s.objects[oid]).filter(o => o.name === 'The Ring');
    for (let i = 0; i < 6 && s.pending && s.pending.kind === 'triggers'; i++) s = act(s, legais(s, s.pending.p)[0]);
    assert.equal(doAnel().length, vezes >= 3 ? 2 : 0, `${vezes} tentações: um gatilho por bloqueador`);
    s = ateFimDoCombate(s);
    for (const t of [t1, t2]) assert.equal(s.objects[t].zone, vezes >= 3 ? 'graveyard' : 'battlefield');
    assert.equal(s.objects[port].zone, 'battlefield'); assert.equal(E.invariants(s).length, 0);
  }
});

test('CR 701.54c (3) · o bloqueador que sai do campo antes do fim do combate não é achado (603.7c); quem bloqueia outra atacante não é sacrificado', () => {
  let [s, port, [t1, t2]] = montaCombate(3, [TARTARUGA, TARTARUGA]); let outro; [s, outro] = poe(s, 0, URSO); s = J(s); s.objects[outro].sick = false;
  s = act(ateAtacar(s), { t: 'attack', p: 0, attackers: [port, outro] }); s = ateBloquear(s);
  s = act(s, { t: 'block', p: 1, blocks: [[t1, port], [t2, outro]] });
  for (let i = 0; i < 6 && s.pending && s.pending.kind === 'triggers'; i++) s = act(s, legais(s, s.pending.p)[0]);
  assert.equal(s.stack.map(oid => s.objects[oid]).filter(o => o.name === 'The Ring').length, 1, 'só o bloqueador do Portador');
  s = tudo(s); // o gatilho resolve: o atrasado está criado
  s = J(s); E.moveObject(s, t1, 'hand'); E.moveObject(s, t1, 'battlefield');
  s = ateFimDoCombate(s);
  assert.equal(s.objects[t1].zone, 'battlefield', 'voltou como objeto novo: não é mais "aquela criatura"');
  assert.equal(s.objects[t2].zone, 'battlefield', 'quem bloqueou a outra atacante não é sacrificado pelo Anel');
});

test('CR 701.54c (4) · com quatro tentações, o Portador que causa dano de combate a um jogador faz cada oponente perder 3 de vida; com três, não', () => {
  for (const vezes of [3, 4]) {
    let [s, port] = montaCombate(vezes, []); const vida = s.players[1].life;
    s = act(ateAtacar(s), { t: 'attack', p: 0, attackers: [port] }); s = ateFimDoCombate(s);
    assert.equal(s.players[1].life, vida - 1 - (vezes >= 4 ? 3 : 0), `${vezes} tentações`); assert.equal(s.players[0].life, 20, 'quem tem o Anel não perde vida');
  }
});

test('Call of the Ring · na manutenção o Anel tenta você; ao escolher o Portador você pode pagar 2 de vida para comprar uma carta — e com 1 de vida não pode', () => {
  assert.equal(S.validateScript(CALL).join(), '', 'o custo opcional "pagar N de vida" é aceito');
  assert.match(S.validateScript({ ...CALL, abilities: [{ ...CALL.abilities[1], mayPay: { pagarVida: 0 } }] }).join(), /custo opcional/);
  for (const [vida, paga] of [[20, true], [20, false], [1, true]]) {
    let s = mesa([URSO, 'Call of the Ring'], []), u, c; [s, u] = poe(s, 0, URSO); [s, c] = poe(s, 0, 'Call of the Ring'); s = comScript(s, CALL); s.players[0].life = vida;
    let [x] = faz(s, { do: 'ring_tempts' }); x = act(x, { t: 'pass', p: x.turn.priority });
    const mao = x.zones[0].hand.length;
    for (let i = 0; i < 10 && (x.stack.length || x.pending); i++) {
      if (x.pending && x.pending.kind === 'may_pay') { const pagar = legais(x, 0, a => a.t === 'pay'); if (vida < 2) assert.equal(pagar.length, 0); x = act(x, paga && pagar.length ? pagar[0] : { t: 'decline', p: 0 }); }
      else x = x.pending ? act(x, legais(x, x.pending.p)[0]) : act(x, { t: 'pass', p: x.turn.priority });
    }
    const pagou = paga && vida >= 2;
    assert.equal(x.players[0].life, vida - (pagou ? 2 : 0)); assert.equal(x.zones[0].hand.length, mao + (pagou ? 1 : 0));
  }
  let s = mesa([URSO, 'Call of the Ring'], []), c; [s, c] = poe(s, 0, 'Call of the Ring'); s = comScript(s, CALL);
  for (let i = 0; i < 300 && !(s.turn.active === 0 && s.turn.number > 1 && s.turn.step === 'draw'); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(E.vezesDoAnelV(s, 0), 1, 'a manutenção do próximo turno tentou');
});
